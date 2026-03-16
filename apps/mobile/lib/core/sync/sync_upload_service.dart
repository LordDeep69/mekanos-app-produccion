import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';
import 'connectivity_service.dart';
import 'offline_sync_service.dart';
import 'sync_notification_service.dart';
import 'sync_progress.dart';

/// ✅ FIX 03-FEB-2026: Helper para combinar valor principal + observación técnico
/// Mantiene compatibilidad con backend que espera formato: "VALOR|||ObsTecnico"
String _combinarObservacionesParaBackend(
  String? valorPrincipal,
  String? obsTecnico,
) {
  final vp = valorPrincipal?.trim() ?? '';
  final ot = obsTecnico?.trim() ?? '';
  if (vp.isEmpty && ot.isEmpty) return '';
  if (ot.isEmpty) return vp;
  if (vp.isEmpty) return ot;
  return '$vp|||$ot';
}

/// Provider para el servicio de sync upload
final syncUploadServiceProvider = Provider<SyncUploadService>((ref) {
  final db = ref.watch(databaseProvider);
  final apiClient = ref.watch(apiClientProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final offlineSync = ref.watch(offlineSyncServiceProvider);
  final notificationService = ref.watch(syncNotificationServiceProvider);
  final progressNotifier = ref.watch(syncProgressProvider.notifier);
  return SyncUploadService(
    db,
    apiClient.dio,
    connectivity,
    offlineSync,
    notificationService,
    progressNotifier,
  );
});

/// Resultado de la sincronización de subida
class SyncUploadResult {
  final bool success;
  final String mensaje;
  final Map<String, dynamic>? datos;
  final String? error;

  /// true si la orden se guardó para sync posterior (modo offline)
  final bool guardadoOffline;

  SyncUploadResult({
    required this.success,
    required this.mensaje,
    this.datos,
    this.error,
    this.guardadoOffline = false,
  });
}

/// Servicio de Sincronización de Subida - RUTA 9
///
/// Orquesta el envío de una orden completada al backend:
/// 1. Recopila datos de BD local (actividades, mediciones, evidencias, firmas)
/// 2. Convierte imágenes a Base64
/// 3. Construye payload según FinalizarOrdenDto
/// 4. Si hay conexión: Envía al endpoint POST /api/ordenes/{id}/finalizar-completo
/// 5. Si NO hay conexión: Guarda en cola offline para sync posterior
/// 6. Actualiza estado local tras éxito
/// ✅ ENTERPRISE: Notifica UI de eventos de sincronización
/// ✅ 19-DIC-2025: Emite progreso en tiempo real para feedback visual
class SyncUploadService {
  final AppDatabase _db;
  final Dio _apiClient;
  final ConnectivityService _connectivity;
  final OfflineSyncService _offlineSync;
  final SyncNotificationService _notificationService;
  final SyncProgressNotifier _progressNotifier;

  SyncUploadService(
    this._db,
    this._apiClient,
    this._connectivity,
    this._offlineSync,
    this._notificationService,
    this._progressNotifier,
  );

  /// Finaliza y sincroniza una orden completa al backend
  ///
  /// [idOrdenLocal] - ID de la orden en BD local
  /// [idOrdenBackend] - ID de la orden en el backend
  /// [observaciones] - Observaciones generales del servicio
  /// [horaEntrada] - Hora de entrada al sitio (formato HH:mm)
  /// [horaSalida] - Hora de salida del sitio (formato HH:mm)
  /// [usuarioId] - ID del usuario/técnico que finaliza
  /// [emailAdicional] - Email opcional para enviar copia
  /// [razonFalla] - Opcional: Razón de la falla (solo para correctivos)
  /// [modo] - DEPRECADO: Siempre SOLO_DATOS. PDF y email se generan desde Admin Portal.
  Future<SyncUploadResult> finalizarOrden({
    required int idOrdenLocal,
    required int idOrdenBackend,
    required String observaciones,
    required String horaEntrada,
    required String horaSalida,
    required int usuarioId,
    String? emailAdicional,
    String? razonFalla,
    String modo = 'SOLO_DATOS',
  }) async {
    try {
      // ✅ 19-DIC-2025: Iniciar progreso
      _progressNotifier.iniciar(idOrdenBackend);
      _progressNotifier.avanzar(SyncStep.preparando);

      // ✅ MULTI-EQUIPOS: Detectar si es orden multi-equipo
      final equipos = await _db.getEquiposByOrdenServicio(idOrdenBackend);
      final esMultiEquipo = equipos.length > 1;

      debugPrint(
        '🔧 [SYNC] Orden $idOrdenBackend - Multi-equipo: $esMultiEquipo (${equipos.length} equipos)',
      );

      // 1. Recopilar actividades ejecutadas (SOLO CHECKLIST, NO MEDICIONES)
      // ✅ FIX 15-DIC-2025: EXCLUIR actividades con idParametroMedicion
      // Estas son tipo MEDICION y aparecen en la sección MEDICIONES del PDF
      // Si las incluimos aquí, aparecen DUPLICADAS (checklist vacío + mediciones)
      final actividades = await _db.getActividadesByOrden(idOrdenLocal);

      // ✅ MULTI-EQUIPOS: Agrupar actividades por idOrdenEquipo
      List<Map<String, dynamic>> actividadesPayload;
      List<Map<String, dynamic>>? actividadesPorEquipoPayload;

      if (esMultiEquipo) {
        // Agrupar actividades por equipo
        final Map<int, List<Map<String, dynamic>>> actividadesAgrupadas = {};

        for (final a in actividades.where(
          (a) => a.idParametroMedicion == null,
        )) {
          final idEquipo = a.idOrdenEquipo ?? 0;
          actividadesAgrupadas.putIfAbsent(idEquipo, () => []);
          actividadesAgrupadas[idEquipo]!.add({
            'sistema': a.sistema ?? 'Sin sistema',
            'descripcion': a.descripcion,
            'resultado': a.simbologia ?? 'N/A',
            // ✅ FIX 03-FEB-2026: Combinar valor principal + observación técnico
            'observaciones': _combinarObservacionesParaBackend(
              a.observacion,
              a.observacionTecnico,
            ),
          });
        }

        // Construir estructura actividadesPorEquipo
        actividadesPorEquipoPayload = [];
        for (final equipo in equipos) {
          final actividadesEquipo =
              actividadesAgrupadas[equipo.idOrdenEquipo] ?? [];
          actividadesPorEquipoPayload.add({
            'idOrdenEquipo': equipo.idOrdenEquipo,
            'nombreEquipo':
                equipo.nombreSistema ??
                equipo.nombreEquipo ??
                'Equipo ${equipo.ordenSecuencia}',
            'codigoEquipo': equipo.codigoEquipo,
            'actividades': actividadesEquipo,
          });
          debugPrint(
            '   📋 Equipo ${equipo.nombreSistema}: ${actividadesEquipo.length} actividades',
          );
        }

        // También mantener actividades flat para backward compatibility
        actividadesPayload = actividades
            .where((a) => a.idParametroMedicion == null)
            .map(
              (a) => <String, dynamic>{
                'sistema': a.sistema ?? 'Sin sistema',
                'descripcion': a.descripcion,
                'resultado': a.simbologia ?? 'N/A',
                // ✅ FIX 03-FEB-2026: Combinar valor principal + observación técnico
                'observaciones': _combinarObservacionesParaBackend(
                  a.observacion,
                  a.observacionTecnico,
                ),
                'idOrdenEquipo': a.idOrdenEquipo,
              },
            )
            .toList();
      } else {
        // Orden simple: sin agrupación
        actividadesPayload = actividades
            .where((a) => a.idParametroMedicion == null)
            .map(
              (a) => <String, dynamic>{
                'sistema': a.sistema ?? 'Sin sistema',
                'descripcion': a.descripcion,
                'resultado': a.simbologia ?? 'N/A',
                // ✅ FIX 03-FEB-2026: Combinar valor principal + observación técnico
                'observaciones': _combinarObservacionesParaBackend(
                  a.observacion,
                  a.observacionTecnico,
                ),
              },
            )
            .toList();
      }

      // 2. Recopilar mediciones
      final mediciones = await _db.getMedicionesByOrden(idOrdenLocal);

      // ✅ MULTI-EQUIPOS: Agrupar mediciones por idOrdenEquipo
      List<Map<String, dynamic>> medicionesPayload;
      List<Map<String, dynamic>>? medicionesPorEquipoPayload;

      if (esMultiEquipo) {
        final Map<int, List<Map<String, dynamic>>> medicionesAgrupadas = {};

        for (final m in mediciones.where((m) => m.valor != null)) {
          final idEquipo = m.idOrdenEquipo ?? 0;
          medicionesAgrupadas.putIfAbsent(idEquipo, () => []);
          medicionesAgrupadas[idEquipo]!.add({
            'parametro': m.nombreParametro,
            'valor': m.valor!,
            'unidad': m.unidadMedida,
            'nivelAlerta': _mapEstadoToNivelAlerta(m.estadoValor),
          });
        }

        medicionesPorEquipoPayload = [];
        for (final equipo in equipos) {
          final medicionesEquipo =
              medicionesAgrupadas[equipo.idOrdenEquipo] ?? [];
          medicionesPorEquipoPayload.add({
            'idOrdenEquipo': equipo.idOrdenEquipo,
            'nombreEquipo':
                equipo.nombreSistema ??
                equipo.nombreEquipo ??
                'Equipo ${equipo.ordenSecuencia}',
            'mediciones': medicionesEquipo,
          });
          debugPrint(
            '   📏 Equipo ${equipo.nombreSistema}: ${medicionesEquipo.length} mediciones',
          );
        }

        // También mantener mediciones flat
        medicionesPayload = mediciones
            .where((m) => m.valor != null)
            .map(
              (m) => <String, dynamic>{
                'parametro': m.nombreParametro,
                'valor': m.valor!,
                'unidad': m.unidadMedida,
                'nivelAlerta': _mapEstadoToNivelAlerta(m.estadoValor),
                'idOrdenEquipo': m.idOrdenEquipo,
              },
            )
            .toList();
      } else {
        medicionesPayload = mediciones
            .where((m) => m.valor != null)
            .map(
              (m) => <String, dynamic>{
                'parametro': m.nombreParametro,
                'valor': m.valor!,
                'unidad': m.unidadMedida,
                'nivelAlerta': _mapEstadoToNivelAlerta(m.estadoValor),
              },
            )
            .toList();
      }

      // ✅ 20-DIC-2025: NO marcar pasos locales como completados
      // El SSE del servidor marcará los pasos como completados cuando realmente se procesen
      _progressNotifier.avanzar(
        SyncStep.preparando,
        mensaje: 'Cargando evidencias...',
      );

      // 3. Recopilar evidencias y convertir a Base64
      // ✅ OPTIMIZACIÓN 06-ENE-2026: Conversión PARALELA con Future.wait()
      final evidencias = await (_db.select(
        _db.evidencias,
      )..where((e) => e.idOrden.equals(idOrdenLocal))).get();

      final startEvidencias = DateTime.now();
      debugPrint(
        '⚡ [PERF] Convirtiendo ${evidencias.length} evidencias a Base64 EN PARALELO...',
      );

      // Convertir TODAS las imágenes en paralelo
      final base64Futures = evidencias.map(
        (ev) => _imageToBase64(ev.rutaLocal),
      );
      final base64Results = await Future.wait(base64Futures);

      final evidenciasPayload = <Map<String, dynamic>>[];
      for (int i = 0; i < evidencias.length; i++) {
        final ev = evidencias[i];
        final base64 = base64Results[i];
        // ✅ FIX: Validar que base64 no esté vacío (archivo corrupto/0 KB)
        if (base64 != null && base64.isNotEmpty) {
          // ✅ FIX 07-FEB-2026: Clasificar fotos generales vs actividad
          // Fotos de la galería general (FOTOS GENERALES) tienen idActividadEjecutada=null
          // Fotos de actividades tienen idActividadEjecutada=<ID>
          // El backend y portal admin distinguen por tipo_evidencia='GENERAL'
          String tipoEvidencia = ev.tipoEvidencia.toUpperCase();
          String? descripcion = ev.descripcion;
          if (ev.idActividadEjecutada == null) {
            // Foto general: guardar sub-tipo original como prefijo en descripción
            // Formato: "ANTES: descripción del usuario" o "DURANTE: Foto general del servicio"
            // Esto permite ordenar/agrupar generales por sub-tipo en el portal admin
            final subTipo = tipoEvidencia; // ANTES, DURANTE, DESPUES, etc.
            tipoEvidencia = 'GENERAL';
            if (descripcion != null && descripcion.isNotEmpty) {
              descripcion = '$subTipo: $descripcion';
            } else {
              descripcion = '$subTipo: Foto general del servicio';
            }
          }
          evidenciasPayload.add({
            'tipo': tipoEvidencia,
            'base64': base64,
            'descripcion': descripcion,
            // ✅ FIX 16-DIC-2025: Incluir idOrdenEquipo para multi-equipos
            if (ev.idOrdenEquipo != null) 'idOrdenEquipo': ev.idOrdenEquipo,
          });
        }
      }

      final evidenciasMs = DateTime.now()
          .difference(startEvidencias)
          .inMilliseconds;
      debugPrint(
        '⚡ [PERF] ${evidenciasPayload.length} evidencias convertidas en ${evidenciasMs}ms',
      );

      // ✅ 20-DIC-2025: Solo actualizar mensaje de progreso
      _progressNotifier.avanzar(
        SyncStep.preparando,
        mensaje: 'Cargando firmas...',
      );

      // 4. Recopilar firmas y convertir a Base64
      // ✅ OPTIMIZACIÓN 06-ENE-2026: Conversión PARALELA de firmas
      final firmas = await _db.getFirmasByOrden(idOrdenLocal);
      Map<String, dynamic>? firmasPayload;

      final firmaTecnico = firmas
          .where((f) => f.tipoFirma == 'TECNICO')
          .firstOrNull;
      final firmaCliente = firmas
          .where((f) => f.tipoFirma == 'CLIENTE')
          .firstOrNull;

      if (firmaTecnico != null) {
        final startFirmas = DateTime.now();
        debugPrint('⚡ [PERF] Convirtiendo firmas a Base64 EN PARALELO...');

        // Convertir AMBAS firmas en paralelo (si existen)
        final firmaFutures = <Future<String?>>[
          _imageToBase64(firmaTecnico.rutaLocal),
          if (firmaCliente != null) _imageToBase64(firmaCliente.rutaLocal),
        ];
        final firmaResults = await Future.wait(firmaFutures);

        final base64Tecnico = firmaResults[0];
        final base64Cliente = firmaResults.length > 1 ? firmaResults[1] : null;

        final firmasMs = DateTime.now().difference(startFirmas).inMilliseconds;
        debugPrint('⚡ [PERF] Firmas convertidas en ${firmasMs}ms');

        if (base64Tecnico != null) {
          firmasPayload = {
            'tecnico': {
              'tipo': 'TECNICO',
              'base64': base64Tecnico,
              'idPersona': usuarioId, // Usar ID del técnico
              // ✅ FIX 02-FEB-2026: Incluir nombre y cargo del firmante
              'nombreFirmante': firmaTecnico.nombreFirmante ?? '',
              'cargoFirmante':
                  firmaTecnico.cargoFirmante ?? 'Técnico de Servicio',
            },
          };

          if (firmaCliente != null && base64Cliente != null) {
            firmasPayload['cliente'] = {
              'tipo': 'CLIENTE',
              'base64': base64Cliente,
              'idPersona': 0, // Cliente sin ID específico
              // ✅ FIX 02-FEB-2026: Incluir nombre y cargo del cliente
              'nombreFirmante': firmaCliente.nombreFirmante ?? '',
              'cargoFirmante': firmaCliente.cargoFirmante ?? '',
            };
          }
        }
      }

      // 5. Validar requisitos mínimos
      if (firmasPayload == null) {
        _progressNotifier.error('Falta la firma del técnico');
        return SyncUploadResult(
          success: false,
          mensaje: 'Falta la firma del técnico',
          error: 'MISSING_TECNICO_SIGNATURE',
        );
      }

      if (evidenciasPayload.isEmpty) {
        _progressNotifier.error(
          'Debe incluir al menos una evidencia fotográfica',
        );
        return SyncUploadResult(
          success: false,
          mensaje: 'Debe incluir al menos una evidencia fotográfica',
          error: 'MISSING_EVIDENCIAS',
        );
      }

      // ✅ 20-DIC-2025: Ya no marcamos completado aquí, el SSE lo hará

      // 6. Construir payload completo
      // ✅ MULTI-EQUIPOS: Incluir estructura agrupada por equipo
      final payload = {
        'idOrden': idOrdenBackend,
        'evidencias': evidenciasPayload,
        'firmas': firmasPayload,
        'actividades': actividadesPayload,
        'mediciones': medicionesPayload,
        'observaciones': observaciones,
        'horaEntrada': horaEntrada,
        'horaSalida': horaSalida,
        'usuarioId': usuarioId,
        if (emailAdicional != null && emailAdicional.isNotEmpty)
          'emailAdicional': emailAdicional,
        // ✅ NUEVO: Razón de falla para correctivos (opcional)
        if (razonFalla != null && razonFalla.isNotEmpty)
          'razonFalla': razonFalla,
        // ✅ MULTI-EQUIPOS: Estructura agrupada por equipo
        if (esMultiEquipo && actividadesPorEquipoPayload != null)
          'actividadesPorEquipo': actividadesPorEquipoPayload,
        if (esMultiEquipo && medicionesPorEquipoPayload != null)
          'medicionesPorEquipo': medicionesPorEquipoPayload,
        'esMultiEquipo': esMultiEquipo,
        // ✅ FIX 19-FEB-2026: SIEMPRE SOLO_DATOS - PDF y email desde Admin Portal
        'modo': 'SOLO_DATOS',
      };

      debugPrint(
        '📦 [SYNC] Payload construido - esMultiEquipo: $esMultiEquipo',
      );
      if (esMultiEquipo) {
        debugPrint(
          '   📋 actividadesPorEquipo: ${actividadesPorEquipoPayload?.length ?? 0} equipos',
        );
        debugPrint(
          '   📏 medicionesPorEquipo: ${medicionesPorEquipoPayload?.length ?? 0} equipos',
        );
      }

      // 7. VERIFICAR CONECTIVIDAD PRIMERO (para decidir qué estado usar)
      final isOnline = await _connectivity.checkConnection();

      if (!isOnline) {
        // ✅ FIX 26-FEB-2026: Sin conexión → NO guardar offline, NO cambiar estado.
        // La orden permanece en su estado actual (EN_PROCESO). Todos los datos
        // (actividades, mediciones, fotos, firmas) ya están en la BD local.
        // El técnico simplemente reintenta cuando tenga conexión.
        _progressNotifier.error('Sin conexión a internet');
        return SyncUploadResult(
          success: false,
          mensaje:
              'No hay conexión a internet.\n\n'
              'Tus datos están guardados localmente de forma segura. '
              'Intenta finalizar de nuevo cuando tengas conexión.',
          error: 'NO_CONNECTION',
          guardadoOffline: false,
        );
      }

      // 8. CON CONEXIÓN - Guardar estado COMPLETADA y sync normal
      await _guardarEstadoLocalCompletada(
        idOrdenLocal,
        observaciones,
        horaEntrada,
        horaSalida,
        razonFalla: razonFalla,
      );

      // ✅ 19-DIC-2025: Progreso - Enviando al servidor
      _progressNotifier.avanzar(
        SyncStep.validando,
        mensaje: 'Conectando con servidor...',
      );

      // 9. CON CONEXIÓN - Intentar sync con streaming de progreso
      try {
        // Asegurar que la orden esté en EN_PROCESO en el backend
        try {
          await _apiClient.put('/ordenes/$idOrdenBackend/iniciar');
        } on DioException {
          // Ignorar - puede ya estar en proceso
        }

        // ✅ 19-DIC-2025: Usar endpoint con SSE para progreso en tiempo real
        final response = await _enviarConProgresoSSE(
          idOrdenBackend: idOrdenBackend,
          payload: payload,
        );

        if (response.success) {
          _progressNotifier.completar();

          // ✅ 03-ENE-2026: DEBUG - Ver exactamente qué datos llegan
          debugPrint('📊 [SYNC RESULT] response.datos = ${response.datos}');
          debugPrint(
            '📊 [SYNC RESULT] response.datos.keys = ${response.datos?.keys}',
          );

          // Extraer URL del PDF de la respuesta
          String? pdfUrl;
          if (response.datos != null) {
            debugPrint(
              '📊 [SYNC RESULT] documento = ${response.datos!['documento']}',
            );
            debugPrint(
              '📊 [SYNC RESULT] evidencias = ${response.datos!['evidencias']}',
            );
            debugPrint(
              '📊 [SYNC RESULT] firmas = ${response.datos!['firmas']}',
            );
            debugPrint('📊 [SYNC RESULT] email = ${response.datos!['email']}');

            pdfUrl = response.datos!['documento']?['url'];
            pdfUrl ??= response.datos!['pdfUrl'];
            debugPrint('📊 [SYNC RESULT] pdfUrl extraído = $pdfUrl');
          }

          // CRÍTICO: El backend YA procesó la orden exitosamente
          try {
            await _marcarOrdenSincronizada(idOrdenLocal, urlPdf: pdfUrl);
            debugPrint(
              '✅ [SYNC] Orden marcada como sincronizada con urlPdf=$pdfUrl',
            );
          } catch (localError) {
            debugPrint(
              '⚠️ Error guardando estado local (no crítico): $localError',
            );
          }

          return SyncUploadResult(
            success: true,
            mensaje: 'Orden finalizada y sincronizada correctamente',
            datos: response.datos,
          );
        } else {
          // ✅ FIX 26-FEB-2026: Detectar si el error es "orden no encontrada" (404)
          // Si el servidor dice que la orden no existe, NO guardar en cola de retry
          // ya que reintentar sería inútil y bloquearía la limpieza de la orden local
          final errorMsg = (response.error ?? '').toLowerCase();
          final esOrdenNoEncontrada =
              errorMsg.contains('no encontrada') ||
              errorMsg.contains('not found') ||
              errorMsg.contains('404');

          if (esOrdenNoEncontrada) {
            debugPrint(
              '🗑️ [SYNC] Orden $idOrdenBackend no existe en servidor (eliminada). '
              'NO se guardará en cola de retry.',
            );
            _progressNotifier.error(
              'La orden fue eliminada del servidor. Se limpiará en la próxima sincronización.',
            );
            return SyncUploadResult(
              success: false,
              mensaje:
                  'La orden ya no existe en el servidor. Fue eliminada desde el portal administrativo.',
              error: 'ORDEN_ELIMINADA_SERVIDOR',
              guardadoOffline: false,
            );
          }

          // Error genuino del servidor - guardar en cola para retry silencioso
          _progressNotifier.error(response.error ?? 'Error del servidor');
          await _offlineSync.guardarEnCola(
            idOrdenLocal: idOrdenLocal,
            idOrdenBackend: idOrdenBackend,
            payload: payload,
          );
          return SyncUploadResult(
            success: false,
            mensaje:
                'Error del servidor: ${response.error ?? 'desconocido'}.\n\n'
                'Se reintentará automáticamente en segundo plano.',
            error: response.error,
            guardadoOffline: false,
          );
        }
      } on DioException catch (e) {
        debugPrint(
          '⚠️ [SYNC] DioException: type=${e.type}, status=${e.response?.statusCode}, msg=${e.message}',
        );

        // CRÍTICO: El backend puede estar procesando aún (toma ~25s)
        // Esperar y verificar múltiples veces antes de decidir si guardar en cola
        Map<String, dynamic>? verificacionFinal;
        bool yaCompletada = false;
        for (int intento = 1; intento <= 3; intento++) {
          debugPrint(
            '🔍 [SYNC] Verificación idempotencia intento $intento/3...',
          );

          // Esperar antes de verificar (el backend puede estar procesando)
          await Future.delayed(Duration(seconds: intento * 5)); // 5s, 10s, 15s

          verificacionFinal = await _verificarOrdenYaCompletadaEnBackend(
            idOrdenBackend,
          );
          yaCompletada = verificacionFinal['completada'] == true;
          debugPrint('🔍 [SYNC] ¿Ya completada? $yaCompletada');

          if (yaCompletada) break;
        }

        if (yaCompletada) {
          // El backend YA procesó la orden - NO guardar en cola
          debugPrint('✅ [SYNC] Backend ya procesó - NO guardar en cola');
          try {
            await _marcarOrdenSincronizada(
              idOrdenLocal,
              urlPdf: verificacionFinal?['pdfUrl'] as String?,
            );
          } catch (_) {}
          return SyncUploadResult(
            success: true,
            mensaje: 'Orden sincronizada correctamente',
          );
        }

        // Si realmente no se completó después de 30s de espera, guardar en cola
        debugPrint('📥 [SYNC] Guardando en cola para retry posterior');
        await _offlineSync.guardarEnCola(
          idOrdenLocal: idOrdenLocal,
          idOrdenBackend: idOrdenBackend,
          payload: payload,
        );
        return SyncUploadResult(
          success: false,
          mensaje:
              'Error de conexión durante la sincronización.\n\n'
              'Se reintentará automáticamente en segundo plano.',
          error: e.message,
          guardadoOffline: false,
        );
      }
    } catch (e) {
      // ✅ FIX 09-FEB-2026: Intentar guardar en cola como último recurso
      // Si el payload ya se construyó, no perder el trabajo del técnico
      debugPrint('❌ [SYNC] Error inesperado: $e - intentando guardar en cola');
      try {
        await _offlineSync.guardarEnCola(
          idOrdenLocal: idOrdenLocal,
          idOrdenBackend: idOrdenBackend,
          payload: {
            'idOrden': idOrdenBackend,
            'observaciones': observaciones,
            'horaEntrada': horaEntrada,
            'horaSalida': horaSalida,
            'usuarioId': usuarioId,
            if (razonFalla != null) 'razonFalla': razonFalla,
            'modo': 'SOLO_DATOS',
          },
        );
        return SyncUploadResult(
          success: false,
          mensaje:
              'Error inesperado durante la sincronización.\n\n'
              'Se reintentará automáticamente en segundo plano.',
          error: e.toString(),
          guardadoOffline: false,
        );
      } catch (_) {
        return SyncUploadResult(
          success: false,
          mensaje: 'Error inesperado: $e',
          error: e.toString(),
        );
      }
    }
  }

  /// Guarda el estado local de la orden como COMPLETADA (antes de intentar sync)
  /// Garantiza integridad: aunque falle el sync, el trabajo no se pierde
  Future<void> _guardarEstadoLocalCompletada(
    int idOrdenLocal,
    String observaciones,
    String horaEntrada,
    String horaSalida, {
    String? razonFalla,
  }) async {
    // Obtener el ID del estado COMPLETADA
    final estadoCompletada = await (_db.select(
      _db.estadosOrden,
    )..where((e) => e.codigo.equals('COMPLETADA'))).getSingleOrNull();

    await (_db.update(
      _db.ordenes,
    )..where((o) => o.idLocal.equals(idOrdenLocal))).write(
      OrdenesCompanion(
        idEstado: estadoCompletada != null
            ? Value(estadoCompletada.id)
            : const Value.absent(),
        observacionesTecnico: Value(observaciones),
        horaEntradaTexto: Value(horaEntrada),
        horaSalidaTexto: Value(horaSalida),
        razonFalla: razonFalla != null && razonFalla.isNotEmpty
            ? Value(razonFalla)
            : const Value.absent(),
        fechaFin: Value(DateTime.now()),
        isDirty: const Value(true), // Marcado para sync
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// Convierte una imagen local a Base64
  /// Incluye logging detallado para debugging de evidencias faltantes
  Future<String?> _imageToBase64(String rutaLocal) async {
    try {
      final file = File(rutaLocal);
      if (await file.exists()) {
        final bytes = await file.readAsBytes();
        return base64Encode(bytes);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Mapea el estado de medición al nivel de alerta del backend
  String _mapEstadoToNivelAlerta(String? estado) {
    switch (estado?.toUpperCase()) {
      case 'NORMAL':
        return 'OK';
      case 'ADVERTENCIA':
        return 'WARNING';
      case 'CRITICO':
        return 'CRITICAL';
      default:
        return 'OK';
    }
  }

  /// Marca una orden como sincronizada en BD local
  /// TRANSACCIÓN ATÓMICA: Garantiza integridad de datos
  Future<void> _marcarOrdenSincronizada(
    int idOrdenLocal, {
    String? urlPdf,
  }) async {
    await _db.transaction(() async {
      // Obtener el ID del estado COMPLETADA
      final estadoCompletada = await (_db.select(
        _db.estadosOrden,
      )..where((e) => e.codigo.equals('COMPLETADA'))).getSingleOrNull();

      // 1. Actualizar estado de la orden
      // ✅ FIX 14-FEB-2026: También setear lastSyncedAt para que purga automática funcione
      final ahora = DateTime.now();
      await (_db.update(
        _db.ordenes,
      )..where((o) => o.idLocal.equals(idOrdenLocal))).write(
        OrdenesCompanion(
          isDirty: const Value(false),
          fechaFin: Value(ahora),
          lastSyncedAt: Value(ahora),
          idEstado: estadoCompletada != null
              ? Value(estadoCompletada.id)
              : const Value.absent(),
          urlPdf: urlPdf != null ? Value(urlPdf) : const Value.absent(),
        ),
      );

      // 2. Marcar evidencias como subidas
      // ✅ FIX 14-FEB-2026: Setear lastSyncedAt para purga automática de archivos
      await (_db.update(
        _db.evidencias,
      )..where((e) => e.idOrden.equals(idOrdenLocal))).write(
        EvidenciasCompanion(
          subida: const Value(true),
          isDirty: const Value(false),
          lastSyncedAt: Value(ahora),
        ),
      );

      // 3. Marcar firmas como subidas
      // ✅ FIX 14-FEB-2026: Setear lastSyncedAt para purga automática de archivos
      await (_db.update(
        _db.firmas,
      )..where((f) => f.idOrden.equals(idOrdenLocal))).write(
        FirmasCompanion(
          subida: const Value(true),
          isDirty: const Value(false),
          lastSyncedAt: Value(ahora),
        ),
      );
    });
  }

  /// CRÍTICO: Verifica si una orden ya fue completada en el backend
  /// Esto previene duplicación cuando el request llegó pero la respuesta se perdió
  Future<Map<String, dynamic>> _verificarOrdenYaCompletadaEnBackend(
    int idOrdenBackend,
  ) async {
    try {
      final response = await _apiClient.get(
        '/ordenes/$idOrdenBackend',
        options: Options(
          sendTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      if (response.statusCode == 200 && response.data is Map) {
        final data = response.data as Map<String, dynamic>;

        // El backend puede envolver los datos en diferentes estructuras
        final datos = data['datos'] ?? data['orden'] ?? data['data'] ?? data;

        // Buscar estado en múltiples ubicaciones posibles
        final estadoObj =
            datos['estado'] ?? datos['estadoActual'] ?? data['estado'];
        final idEstadoActual =
            datos['id_estado_actual'] ??
            datos['idEstadoActual'] ??
            data['id_estado_actual'];

        String? estadoCodigo;
        bool esEstadoFinal = false;
        if (estadoObj is Map) {
          estadoCodigo =
              estadoObj['codigo_estado']?.toString() ??
              estadoObj['codigo']?.toString();
          esEstadoFinal =
              estadoObj['es_estado_final'] == true ||
              estadoObj['esEstadoFinal'] == true;
        } else if (estadoObj is String) {
          estadoCodigo = estadoObj;
        }

        // Extraer URL del PDF si está disponible
        String? pdfUrl;
        if (datos is Map) {
          final documentos =
              datos['documentos_generados'] ?? datos['documentos'];
          if (documentos is List && documentos.isNotEmpty) {
            final ultimoDoc = documentos.last;
            if (ultimoDoc is Map) {
              pdfUrl =
                  ultimoDoc['ruta_archivo']?.toString() ??
                  ultimoDoc['url']?.toString();
            }
          }
          pdfUrl ??=
              datos['url_pdf']?.toString() ?? datos['pdfUrl']?.toString();
        }

        if (estadoCodigo == 'COMPLETADA' ||
            estadoCodigo == 'FINALIZADA' ||
            estadoCodigo == 'FINALIZADO' ||
            esEstadoFinal ||
            idEstadoActual == 4 ||
            idEstadoActual == '4') {
          return {'completada': true, 'pdfUrl': pdfUrl};
        }
      }

      return {'completada': false, 'pdfUrl': null};
    } catch (_) {
      // Si falla la verificación, asumir que NO está completada
      // Es mejor duplicar que perder una orden
      return {'completada': false, 'pdfUrl': null};
    }
  }

  /// Verifica si una orden está lista para sincronizar
  Future<Map<String, dynamic>> verificarRequisitos(int idOrdenLocal) async {
    final actividades = await _db.getActividadesByOrden(idOrdenLocal);
    final mediciones = await _db.getMedicionesByOrden(idOrdenLocal);
    final evidencias = await (_db.select(
      _db.evidencias,
    )..where((e) => e.idOrden.equals(idOrdenLocal))).get();
    final firmas = await _db.getFirmasByOrden(idOrdenLocal);

    final actividadesCompletadas = actividades
        .where((a) => a.simbologia != null && a.simbologia!.isNotEmpty)
        .length;
    final medicionesCompletadas = mediciones
        .where((m) => m.valor != null)
        .length;
    final tieneFirmaTecnico = firmas.any((f) => f.tipoFirma == 'TECNICO');
    final tieneFirmaCliente = firmas.any((f) => f.tipoFirma == 'CLIENTE');

    final checklistCompleto = actividadesCompletadas == actividades.length;
    final medicionesCompletas = medicionesCompletadas == mediciones.length;
    final firmasCompletas = tieneFirmaTecnico && tieneFirmaCliente;
    final tieneEvidencias = evidencias.isNotEmpty;

    return {
      'listo':
          checklistCompleto &&
          medicionesCompletas &&
          firmasCompletas &&
          tieneEvidencias,
      'checklist': {
        'completado': checklistCompleto,
        'total': actividades.length,
        'completadas': actividadesCompletadas,
      },
      'mediciones': {
        'completado': medicionesCompletas,
        'total': mediciones.length,
        'completadas': medicionesCompletadas,
      },
      'firmas': {'tecnico': tieneFirmaTecnico, 'cliente': tieneFirmaCliente},
      'evidencias': {
        'cantidad': evidencias.length,
        'tieneMinimo': tieneEvidencias,
      },
    };
  }

  /// ✅ 19-DIC-2025: Envía la orden usando SSE para progreso en tiempo real
  ///
  /// Este método usa el endpoint /finalizar-completo-stream que retorna
  /// Server-Sent Events (SSE) con el progreso de cada paso del backend.
  ///
  /// Los eventos se procesan en tiempo real y se emiten al SyncProgressNotifier
  /// para que la UI se actualice.
  Future<_SSEResult> _enviarConProgresoSSE({
    required int idOrdenBackend,
    required Map<String, dynamic> payload,
  }) async {
    debugPrint(
      '📡 [SSE] Iniciando envío con streaming para orden $idOrdenBackend',
    );

    try {
      // Usar responseType: stream para leer SSE
      final response = await _apiClient.post<ResponseBody>(
        '/ordenes/$idOrdenBackend/finalizar-completo-stream',
        data: payload,
        options: Options(
          responseType: ResponseType.stream,
          sendTimeout: const Duration(minutes: 5),
          receiveTimeout: const Duration(minutes: 5),
          headers: {'Accept': 'text/event-stream', 'Cache-Control': 'no-cache'},
        ),
      );

      debugPrint('📡 [SSE] Response status: ${response.statusCode}');
      debugPrint('📡 [SSE] Response headers: ${response.headers}');

      // ✅ FIX 20-DIC-2025: Aceptar 200 y 201 (NestJS @Post retorna 201 por defecto)
      final statusOk = response.statusCode == 200 || response.statusCode == 201;
      if (!statusOk) {
        debugPrint('❌ [SSE] Status no válido: ${response.statusCode}');
        return _SSEResult(
          success: false,
          error: 'Error del servidor: ${response.statusCode}',
        );
      }

      debugPrint(
        '📡 [SSE] Conexión SSE establecida (status: ${response.statusCode})',
      );

      final stream = response.data?.stream;
      if (stream == null) {
        debugPrint('❌ [SSE] Stream es null');
        return _SSEResult(
          success: false,
          error: 'No se recibió stream del servidor',
        );
      }

      debugPrint('📡 [SSE] Stream obtenido, comenzando a leer eventos...');

      // Variables para acumular el resultado final
      Map<String, dynamic>? resultadoFinal;
      String? ultimoError;

      // Leer el stream línea por línea
      await for (final chunk in stream) {
        final lines = utf8.decode(chunk).split('\n');

        for (final line in lines) {
          if (line.startsWith('data: ')) {
            final jsonStr = line.substring(6).trim();
            if (jsonStr.isEmpty) continue;

            try {
              final evento = json.decode(jsonStr) as Map<String, dynamic>;
              debugPrint(
                '📡 [SSE] Evento recibido: ${evento['step']} - ${evento['status']}',
              );

              // Procesar el evento en el notifier
              _progressNotifier.procesarEventoBackend(evento);

              // Si es el resultado final, guardarlo
              if (evento['step'] == 'result' && evento['data'] != null) {
                resultadoFinal = evento['data'] as Map<String, dynamic>;
                debugPrint(
                  '📡 [SSE] ✅ Resultado final recibido: ${resultadoFinal.keys}',
                );
                if (resultadoFinal['datos'] != null) {
                  final datos = resultadoFinal['datos'] as Map<String, dynamic>;
                  debugPrint('📡 [SSE] Datos internos: ${datos.keys}');
                  debugPrint(
                    '📡 [SSE] Evidencias: ${datos['evidencias']?.length ?? 0}',
                  );
                  debugPrint(
                    '📡 [SSE] Firmas: ${datos['firmas']?.length ?? 0}',
                  );
                }
              }

              // Si es error, guardarlo
              if (evento['status'] == 'error') {
                ultimoError = evento['message'] as String?;
              }
            } catch (e) {
              debugPrint('⚠️ [SSE] Error parseando evento: $e');
            }
          }
        }
      }

      // Verificar resultado
      if (ultimoError != null) {
        return _SSEResult(success: false, error: ultimoError);
      }

      if (resultadoFinal != null) {
        return _SSEResult(
          success: resultadoFinal['success'] as bool? ?? true,
          datos: resultadoFinal['datos'] as Map<String, dynamic>?,
        );
      }

      // Si no hubo resultado explícito pero no hubo error, asumir éxito
      return _SSEResult(success: true);
    } on DioException catch (e) {
      debugPrint('❌ [SSE] DioException: ${e.message}');

      // Si falla el SSE, hacer fallback al endpoint tradicional
      debugPrint('📡 [SSE] Fallback a endpoint tradicional...');
      return _fallbackEnvioTradicional(idOrdenBackend, payload);
    } catch (e) {
      debugPrint('❌ [SSE] Error inesperado: $e');
      return _SSEResult(success: false, error: e.toString());
    }
  }

  /// Fallback al endpoint tradicional si SSE falla
  Future<_SSEResult> _fallbackEnvioTradicional(
    int idOrdenBackend,
    Map<String, dynamic> payload,
  ) async {
    try {
      final response = await _apiClient.post(
        '/ordenes/$idOrdenBackend/finalizar-completo',
        data: payload,
        options: Options(
          sendTimeout: const Duration(minutes: 5),
          receiveTimeout: const Duration(minutes: 5),
        ),
      );

      if (response.statusCode == 200) {
        Map<String, dynamic>? datos;
        if (response.data is Map) {
          datos = response.data as Map<String, dynamic>;
        }
        return _SSEResult(
          success: true,
          datos: datos?['datos'] as Map<String, dynamic>?,
        );
      }

      return _SSEResult(
        success: false,
        error: 'Error del servidor: ${response.statusCode}',
      );
    } on DioException {
      // Re-lanzar para que el caller maneje el error
      rethrow;
    }
  }
}

/// Resultado interno del envío con SSE
class _SSEResult {
  final bool success;
  final Map<String, dynamic>? datos;
  final String? error;

  _SSEResult({required this.success, this.datos, this.error});
}
