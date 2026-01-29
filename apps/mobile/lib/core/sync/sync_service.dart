import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';
import 'sync_retry_strategy.dart';

/// Provider para el servicio de sincronización
final syncServiceProvider = Provider<SyncService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final db = ref.watch(databaseProvider);
  return SyncService(apiClient, db);
});

/// Resultado de sincronización
class SyncResult {
  final bool success;
  final String message;
  final int ordenesDescargadas;
  final int clientesGuardados;
  final int equiposGuardados;
  final int actividadesCatalogoGuardadas;
  final int parametrosGuardados;
  final int estadosGuardados;
  final int tiposServicioGuardados;
  final String? error;
  // ✅ FIX: Timestamp del SERVIDOR para delta sync (evita problemas de hora local)
  final DateTime? serverTimestamp;

  SyncResult({
    required this.success,
    required this.message,
    this.ordenesDescargadas = 0,
    this.clientesGuardados = 0,
    this.equiposGuardados = 0,
    this.actividadesCatalogoGuardadas = 0,
    this.parametrosGuardados = 0,
    this.estadosGuardados = 0,
    this.tiposServicioGuardados = 0,
    this.error,
    this.serverTimestamp,
  });

  @override
  String toString() {
    return '''
SyncResult:
  success: $success
  message: $message
  ordenes: $ordenesDescargadas
  clientes: $clientesGuardados
  equipos: $equiposGuardados
  actividades: $actividadesCatalogoGuardadas
  parametros: $parametrosGuardados
  estados: $estadosGuardados
  tiposServicio: $tiposServicioGuardados
  serverTimestamp: $serverTimestamp
  ${error != null ? 'error: $error' : ''}
''';
  }
}

/// Servicio de sincronización con el backend
class SyncService {
  final ApiClient _apiClient;
  final AppDatabase _db;

  SyncService(this._apiClient, this._db);

  /// Descargar datos del servidor para un técnico
  ///
  /// [tecnicoId] - ID del técnico
  /// [since] - Fecha para sync delta (solo cambios desde esta fecha)
  /// [fullCatalogs] - Forzar descarga de catálogos completos
  Future<SyncResult> downloadData(
    int tecnicoId, {
    DateTime? since,
    bool fullCatalogs = false,
  }) async {
    try {
      // Construir query params para sync delta
      final queryParams = <String, dynamic>{};
      if (since != null) {
        queryParams['since'] = since.toUtc().toIso8601String();
        debugPrint(
          '🔄 [SYNC DELTA] Sincronizando cambios desde ${since.toIso8601String()}',
        );
      }
      if (fullCatalogs) {
        queryParams['fullCatalogs'] = 'true';
      }

      // 1. Llamar al endpoint de sincronización
      // ✅ ROBUSTO: Usando estrategia de reintentos inteligentes
      // - Backoff exponencial con jitter
      // - Timeout adaptativo que crece con cada intento
      // - Clasificación inteligente de errores recuperables
      debugPrint('🔄 [SYNC] Iniciando descarga con reintentos inteligentes...');

      final response = await _apiClient.dio.getWithRetry<Map<String, dynamic>>(
        '/sync/download/$tecnicoId',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
        retryConfig: RetryConfig.forLargeSync,
        onRetry: (attempt, delay, error) {
          debugPrint(
            '🔄 [SYNC] Reintentando ($attempt/${RetryConfig.forLargeSync.maxAttempts}) '
            'después de ${delay.inSeconds}s - Motivo: ${error.message}',
          );
        },
      );

      if (response.statusCode != 200) {
        return SyncResult(
          success: false,
          message: 'Error del servidor: ${response.statusCode}',
          error: response.data?.toString(),
        );
      }

      final data = response.data as Map<String, dynamic>;

      // ✅ FIX CRÍTICO: Extraer timestamp del SERVIDOR (no usar hora local)
      // Esto evita problemas cuando dispositivos tienen hora desincronizada
      DateTime? serverTimestamp;
      if (data['serverTimestamp'] != null) {
        try {
          serverTimestamp = DateTime.parse(data['serverTimestamp'] as String);
          debugPrint(
            '🕐 [SYNC] Timestamp del servidor: ${serverTimestamp.toIso8601String()}',
          );
        } catch (e) {
          debugPrint('⚠️ [SYNC] Error parseando serverTimestamp: $e');
        }
      }

      // 2. Procesar estados de orden
      int estadosGuardados = 0;
      if (data['estadosOrden'] != null) {
        estadosGuardados = await _processEstadosOrden(
          data['estadosOrden'] as List,
        );
      }

      // 3. Procesar tipos de servicio (CRÍTICO: ANTES de actividades para FK)
      int tiposServicioGuardados = 0;
      if (data['tiposServicio'] != null) {
        tiposServicioGuardados = await _processTiposServicio(
          data['tiposServicio'] as List,
        );
      }

      // 4. Procesar parámetros de medición
      int parametrosGuardados = 0;
      if (data['parametrosMedicion'] != null) {
        parametrosGuardados = await _processParametros(
          data['parametrosMedicion'] as List,
        );
      }

      // 5. Procesar catálogo de actividades
      int actividadesGuardadas = 0;
      if (data['actividadesCatalogo'] != null) {
        actividadesGuardadas = await _processActividadesCatalogo(
          data['actividadesCatalogo'] as List,
        );
      }

      // 6. Procesar órdenes (esto extrae clientes y equipos automáticamente)
      int ordenesDescargadas = 0;
      int clientesGuardados = 0;
      int equiposGuardados = 0;

      if (data['ordenes'] != null) {
        final ordenesResult = await _processOrdenes(data['ordenes'] as List);
        ordenesDescargadas = ordenesResult['ordenes'] ?? 0;
        clientesGuardados = ordenesResult['clientes'] ?? 0;
        equiposGuardados = ordenesResult['equipos'] ?? 0;
      }

      // 7. Actualizar estado de sincronización
      await _db.updateSyncStatus(
        'download',
        ultimaSync: DateTime.now(),
        pendientesBajar: 0,
      );

      return SyncResult(
        success: true,
        message: 'Sincronización completada',
        ordenesDescargadas: ordenesDescargadas,
        clientesGuardados: clientesGuardados,
        equiposGuardados: equiposGuardados,
        actividadesCatalogoGuardadas: actividadesGuardadas,
        parametrosGuardados: parametrosGuardados,
        estadosGuardados: estadosGuardados,
        tiposServicioGuardados: tiposServicioGuardados,
        // ✅ FIX: Pasar timestamp del servidor para delta sync confiable
        serverTimestamp: serverTimestamp,
      );
    } catch (e) {
      await _db.updateSyncStatus('download', ultimoError: e.toString());

      return SyncResult(
        success: false,
        message: 'Error de sincronización',
        error: e.toString(),
      );
    }
  }

  /// Procesar estados de orden
  /// ✅ FIX RENDIMIENTO: Usar transacción batch
  Future<int> _processEstadosOrden(List estados) async {
    if (estados.isEmpty) return 0;

    await _db.transaction(() async {
      for (final estado in estados) {
        await _db.upsertEstadoOrden(
          EstadosOrdenCompanion(
            id: Value(estado['id'] as int),
            codigo: Value(estado['codigo'] as String),
            nombre: Value(estado['nombre'] as String),
            esEstadoFinal: Value(estado['esEstadoFinal'] as bool? ?? false),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
      }
    });

    return estados.length;
  }

  /// Procesar tipos de servicio (CRÍTICO: debe ejecutarse ANTES de actividades)
  /// ✅ FIX RENDIMIENTO: Usar transacción batch
  Future<int> _processTiposServicio(List tiposServicio) async {
    if (tiposServicio.isEmpty) return 0;

    await _db.transaction(() async {
      for (final tipo in tiposServicio) {
        await _db.upsertTipoServicio(
          TiposServicioCompanion(
            id: Value(tipo['id'] as int),
            codigo: Value(tipo['codigo'] as String? ?? ''),
            nombre: Value(tipo['nombre'] as String? ?? ''),
            descripcion: Value(tipo['descripcion'] as String?),
            activo: const Value(true),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
      }
    });

    return tiposServicio.length;
  }

  /// Procesar parámetros de medición
  /// ✅ FIX RENDIMIENTO: Usar transacción batch
  /// ✅ FIX 26-ENE-2026: También actualizar rangos en mediciones existentes
  Future<int> _processParametros(List parametros) async {
    if (parametros.isEmpty) return 0;

    int count = 0;
    int medicionesActualizadas = 0;

    await _db.transaction(() async {
      for (final param in parametros) {
        final id = param['idParametroMedicion'] ?? param['id'];
        if (id == null) continue; // Skip si no tiene ID

        final minNormal = (param['valorMinimoNormal'] as num?)?.toDouble();
        final maxNormal = (param['valorMaximoNormal'] as num?)?.toDouble();
        final minCritico = (param['valorMinimoCritico'] as num?)?.toDouble();
        final maxCritico = (param['valorMaximoCritico'] as num?)?.toDouble();

        await _db.upsertParametroCatalogo(
          ParametrosCatalogoCompanion(
            id: Value(id as int),
            codigo: Value(
              param['codigoParametro'] as String? ??
                  param['codigo'] as String? ??
                  '',
            ),
            nombre: Value(
              param['nombreParametro'] as String? ??
                  param['nombre'] as String? ??
                  '',
            ),
            unidad: Value(
              param['unidadMedida'] as String? ?? param['unidad'] as String?,
            ),
            valorMinimoNormal: Value(minNormal),
            valorMaximoNormal: Value(maxNormal),
            valorMinimoAdvertencia: Value(
              (param['valorMinimoAdvertencia'] as num?)?.toDouble(),
            ),
            valorMaximoAdvertencia: Value(
              (param['valorMaximoAdvertencia'] as num?)?.toDouble(),
            ),
            valorMinimoCritico: Value(minCritico),
            valorMaximoCritico: Value(maxCritico),
            tipoEquipoAplica: Value(param['tipoEquipoAplica'] as String?),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );

        // ✅ FIX 26-ENE-2026: Actualizar rangos en mediciones existentes
        // Esto permite que cambios en el portal se reflejen en órdenes ya iniciadas
        final updated = await _db.actualizarRangosMedicionesDeParametro(
          idParametro: id,
          minNormal: minNormal,
          maxNormal: maxNormal,
          minCritico: minCritico,
          maxCritico: maxCritico,
        );
        medicionesActualizadas += updated;

        count++;
      }
    });

    if (medicionesActualizadas > 0) {
      debugPrint(
        '🔄 [SYNC] Rangos actualizados en $medicionesActualizadas mediciones existentes',
      );
    }

    return count;
  }

  /// Procesar catálogo de actividades
  Future<int> _processActividadesCatalogo(List actividades) async {
    if (actividades.isEmpty) return 0;

    // ✅ FIX RENDIMIENTO: Usar transacción batch para 95+ actividades
    int count = 0;
    await _db.transaction(() async {
      for (final act in actividades) {
        await _db.upsertActividadCatalogo(
          ActividadesCatalogoCompanion(
            id: Value(act['idActividadCatalogo'] as int),
            codigo: Value(act['codigoActividad'] as String? ?? ''),
            descripcion: Value(act['descripcionActividad'] as String? ?? ''),
            tipoActividad: Value(
              act['tipoActividad'] as String? ?? 'INSPECCION',
            ),
            ordenEjecucion: Value(act['ordenEjecucion'] as int? ?? 0),
            esObligatoria: Value(act['esObligatoria'] as bool? ?? true),
            tiempoEstimadoMinutos: Value(act['tiempoEstimadoMinutos'] as int?),
            instrucciones: Value(act['instrucciones'] as String?),
            precauciones: Value(act['precauciones'] as String?),
            idParametroMedicion: Value(act['idParametroMedicion'] as int?),
            sistema: Value(act['sistema'] as String?),
            idTipoServicio: Value(act['idTipoServicio'] as int?),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
        count++;
      }
    });

    return count;
  }

  /// Procesar órdenes (extrayendo clientes y equipos)
  /// ✅ FIX RENDIMIENTO: Pre-cargar órdenes existentes + transacciones batch
  Future<Map<String, int>> _processOrdenes(List ordenes) async {
    if (ordenes.isEmpty) return {'ordenes': 0, 'clientes': 0, 'equipos': 0};

    int ordenesCount = 0;
    final Set<int> clientesIds = {};
    final Set<int> equiposIds = {};
    final Set<int> tiposServicioIds = {};

    // ✅ FIX: Pre-cargar TODAS las órdenes existentes en UNA query
    final ordenesExistentes = await _db.getAllOrdenes();
    final ordenesExistentesMap = <int, Ordene>{};
    for (final o in ordenesExistentes) {
      if (o.idBackend != null) {
        ordenesExistentesMap[o.idBackend!] = o;
      }
    }

    // FASE 1: Recolectar clientes, equipos y tipos únicos
    final clientesData = <int, Map<String, dynamic>>{};
    final equiposData = <int, Map<String, dynamic>>{};
    final tiposData = <int, Map<String, dynamic>>{};

    for (final orden in ordenes) {
      final idCliente = orden['idCliente'] as int?;
      final idEquipo = orden['idEquipo'] as int?;
      final idTipoServicio = orden['idTipoServicio'] as int?;

      if (idCliente != null && !clientesIds.contains(idCliente)) {
        clientesData[idCliente] = orden;
        clientesIds.add(idCliente);
      }
      if (idEquipo != null && !equiposIds.contains(idEquipo)) {
        equiposData[idEquipo] = orden;
        equiposIds.add(idEquipo);
      }
      if (idTipoServicio != null &&
          !tiposServicioIds.contains(idTipoServicio)) {
        tiposData[idTipoServicio] = orden;
        tiposServicioIds.add(idTipoServicio);
      }
    }

    // FASE 2: Insertar clientes, equipos y tipos en transacción batch
    await _db.transaction(() async {
      for (final entry in clientesData.entries) {
        await _db.upsertCliente(
          ClientesCompanion(
            id: Value(entry.key),
            nombre: Value(
              entry.value['nombreComercial'] as String? ??
                  entry.value['nombreCompleto'] as String? ??
                  entry.value['razonSocial'] as String? ??
                  entry.value['nombreCliente'] as String? ??
                  'Sin nombre',
            ),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
      }
      for (final entry in equiposData.entries) {
        // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Descargar config personalizada
        final configParam = entry.value['configParametros'];
        String? configJson;
        if (configParam != null &&
            configParam is Map &&
            configParam.isNotEmpty) {
          configJson = jsonEncode(configParam);
          debugPrint(
            '🔍 [SYNC] Equipo ${entry.key} tiene configParametros: ${configJson.substring(0, configJson.length > 80 ? 80 : configJson.length)}...',
          );
        } else {
          debugPrint('⚠️ [SYNC] Equipo ${entry.key} SIN configParametros');
        }

        await _db.upsertEquipo(
          EquiposCompanion(
            id: Value(entry.key),
            codigo: Value(entry.value['codigoEquipo'] as String? ?? ''),
            nombre: Value(entry.value['nombreEquipo'] as String? ?? ''),
            ubicacion: Value(entry.value['ubicacionEquipo'] as String?),
            idCliente: Value(entry.value['idCliente'] as int),
            // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Config personalizada
            configParametros: Value(configJson),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
      }
      for (final entry in tiposData.entries) {
        await _db.upsertTipoServicio(
          TiposServicioCompanion(
            id: Value(entry.key),
            codigo: Value(entry.value['codigoTipoServicio'] as String? ?? ''),
            nombre: Value(entry.value['nombreTipoServicio'] as String? ?? ''),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
      }
    });

    // FASE 3: Pre-cargar estados para mapeo por código
    final estadosMap = <String, int>{};
    final estadosLocales = await _db.getAllEstadosOrden();
    for (final estado in estadosLocales) {
      estadosMap[estado.codigo] = estado.id;
    }

    // FASE 4: Procesar órdenes en transacción batch
    await _db.transaction(() async {
      for (final orden in ordenes) {
        try {
          final idOrden = orden['idOrdenServicio'];
          final idCliente = orden['idCliente'];
          final idEquipo = orden['idEquipo'];
          final idTipoServicio = orden['idTipoServicio'];
          final codigoEstado = orden['codigoEstado'] as String?;

          // ✅ FIX CRÍTICO: Mapear estado por CÓDIGO, no por ID del backend
          final idEstadoLocal = estadosMap[codigoEstado];

          if (idOrden == null ||
              idCliente == null ||
              idEquipo == null ||
              idTipoServicio == null ||
              idEstadoLocal == null) {
            continue;
          }

          // Debug mínimo para evitar saturación de logs

          final ordenCompanion = OrdenesCompanion(
            idBackend: Value(idOrden as int),
            numeroOrden: Value(orden['numeroOrden'] as String),
            version: Value(orden['version'] as int? ?? 0),
            idEstado: Value(idEstadoLocal), // ✅ FIX: Usar ID LOCAL del estado
            idCliente: Value(idCliente as int),
            idEquipo: Value(idEquipo as int),
            idTipoServicio: Value(idTipoServicio as int),
            prioridad: Value(orden['prioridad'] as String? ?? 'MEDIA'),
            fechaProgramada: Value(_parseDateTime(orden['fechaProgramada'])),
            descripcionInicial: Value(orden['descripcionInicial'] as String?),
            trabajoRealizado: Value(orden['trabajoRealizado'] as String?),
            observacionesTecnico: Value(
              orden['observacionesTecnico'] as String?,
            ),
            // ✅ FIX: Sincronizar URL del PDF para que esté disponible en otros dispositivos
            urlPdf: Value(orden['urlPdf'] as String?),
            // ✅ FIX: Sincronizar horarios reales del servicio
            fechaInicio: Value(_parseDateTime(orden['fechaInicioReal'])),
            fechaFin: Value(_parseDateTime(orden['fechaFinReal'])),
            // ✅ FIX: Sincronizar estadísticas para órdenes históricas
            totalActividades: Value(orden['totalActividades'] as int? ?? 0),
            totalMediciones: Value(orden['totalMediciones'] as int? ?? 0),
            totalEvidencias: Value(orden['totalEvidencias'] as int? ?? 0),
            totalFirmas: Value(orden['totalFirmas'] as int? ?? 0),
            // ✅ FIX: Desglose de actividades por estado (B/M/C/NA)
            actividadesBuenas: Value(orden['actividadesBuenas'] as int? ?? 0),
            actividadesMalas: Value(orden['actividadesMalas'] as int? ?? 0),
            actividadesCorregidas: Value(
              orden['actividadesCorregidas'] as int? ?? 0,
            ),
            actividadesNA: Value(orden['actividadesNA'] as int? ?? 0),
            // ✅ FIX: Desglose de mediciones por estado (Normal/Advertencia/Crítico)
            medicionesNormales: Value(orden['medicionesNormales'] as int? ?? 0),
            medicionesAdvertencia: Value(
              orden['medicionesAdvertencia'] as int? ?? 0,
            ),
            medicionesCriticas: Value(orden['medicionesCriticas'] as int? ?? 0),
            // ✅ FIX: Horas como TEXTO PLANO (HH:mm) - sin zona horaria
            horaEntradaTexto: Value(orden['horaEntrada'] as String?),
            horaSalidaTexto: Value(orden['horaSalida'] as String?),
            isDirty: const Value(false),
            lastSyncedAt: Value(DateTime.now()),
          );

          // ✅ FIX: Usar mapa pre-cargado en vez de query individual
          final existingOrden = ordenesExistentesMap[idOrden];

          if (existingOrden != null) {
            final serverVersion = orden['version'] as int? ?? 0;
            final codigoEstadoServer =
                (orden['codigoEstado'] as String?)?.toUpperCase() ?? '';
            final estadosFinalizados = [
              'COMPLETADA',
              'CERRADA',
              'CANCELADA',
              'FINALIZADA',
            ];

            // ✅ FIX CRÍTICO: SIEMPRE actualizar si:
            // 1. La versión del servidor es mayor, O
            // 2. El estado del servidor es FINALIZADO (COMPLETADA, etc.) y el local NO lo es
            final estadoLocalFinalizado = estadosFinalizados.any((e) {
              final estadoLocal = estadosMap.entries
                  .firstWhere(
                    (entry) => entry.value == existingOrden.idEstado,
                    orElse: () => MapEntry('', -1),
                  )
                  .key;
              return estadoLocal.toUpperCase() == e;
            });

            final debeActualizar =
                serverVersion > existingOrden.version ||
                (estadosFinalizados.contains(codigoEstadoServer) &&
                    !estadoLocalFinalizado);

            if (debeActualizar) {
              // ✅ v3.3 FIX: Protección de estado local "isDirty"
              // Si la orden está dirty localmente (ej: EN_PROCESO),
              // NO sobrescribir el estado y mantener el flag dirty
              // A menos que el servidor traiga un estado FINALIZADO.
              if (existingOrden.isDirty &&
                  !estadosFinalizados.contains(codigoEstadoServer)) {
                debugPrint(
                  '🛡️ [SYNC] Protegiendo orden dirty ${existingOrden.numeroOrden} - Preservando estado local',
                );

                final ordenProtegida = ordenCompanion.copyWith(
                  idEstado: Value(existingOrden.idEstado),
                  isDirty: const Value(true),
                  // Preservar también fechas de inicio/fin locales
                  fechaInicio: existingOrden.fechaInicio != null
                      ? Value(existingOrden.fechaInicio)
                      : ordenCompanion.fechaInicio,
                );
                await _db.updateOrden(ordenProtegida, existingOrden.idLocal);
              } else {
                await _db.updateOrden(ordenCompanion, existingOrden.idLocal);
              }
            }

            // ✅ NUEVO: Guardar plan de actividades si existe
            final planData = orden['actividadesPlan'] as List?;
            debugPrint(
              '🎯 [SYNC] Orden ${orden['numeroOrden']} - Plan data: ${planData?.length ?? 0} items',
            );
            await _guardarPlanActividades(existingOrden.idLocal, planData);

            // ✅ NUEVO: Guardar equipos de la orden (multi-equipos)
            final equiposData = orden['ordenesEquipos'] as List?;
            debugPrint(
              '🔧 [SYNC] Orden ${orden['numeroOrden']} (ID $idOrden) - ordenesEquipos recibido del backend: ${equiposData?.length ?? 0}',
            );
            await _guardarOrdenesEquipos(idOrden, equiposData);
          } else {
            final idLocalNueva = await _db.insertOrdenFromSync(ordenCompanion);

            // ✅ NUEVO: Guardar plan de actividades si existe
            final planDataNueva = orden['actividadesPlan'] as List?;
            debugPrint(
              '🎯 [SYNC] Orden NUEVA ${orden['numeroOrden']} - Plan data: ${planDataNueva?.length ?? 0} items',
            );
            await _guardarPlanActividades(idLocalNueva, planDataNueva);

            // ✅ NUEVO: Guardar equipos de la orden (multi-equipos)
            final equiposDataNueva = orden['ordenesEquipos'] as List?;
            debugPrint(
              '🔧 [SYNC] Orden NUEVA ${orden['numeroOrden']} (ID $idOrden) - ordenesEquipos recibido del backend: ${equiposDataNueva?.length ?? 0}',
            );
            await _guardarOrdenesEquipos(idOrden, equiposDataNueva);
          }
          ordenesCount++;
        } catch (e, stackTrace) {
          // ⚠️ Log de error para diagnóstico (no silencioso)
          debugPrint(
            '❌ [SYNC] Error procesando orden ${orden['numeroOrden']}: $e',
          );
          debugPrint(
            '   Stack: ${stackTrace.toString().split('\n').take(3).join('\n')}',
          );
        }
      }
    });

    return {
      'ordenes': ordenesCount,
      'clientes': clientesIds.length,
      'equipos': equiposIds.length,
    };
  }

  /// ✅ NUEVO: Guardar plan de actividades de una orden
  /// Si la orden tiene un plan asignado por admin, se guarda localmente
  /// para usar en vez del catálogo por tipo de servicio
  Future<void> _guardarPlanActividades(int idOrdenLocal, List? planData) async {
    // Si no hay plan, limpiar cualquier plan anterior y salir
    if (planData == null || planData.isEmpty) {
      await _db.clearPlanActividades(idOrdenLocal);
      return;
    }

    // Limpiar plan anterior
    await _db.clearPlanActividades(idOrdenLocal);

    // Insertar nuevo plan
    for (final item in planData) {
      final idActividadCatalogo = item['idActividadCatalogo'] as int?;
      if (idActividadCatalogo == null) continue;

      await _db.insertActividadPlan(
        ActividadesPlanCompanion(
          idOrden: Value(idOrdenLocal),
          idActividadCatalogo: Value(idActividadCatalogo),
          ordenSecuencia: Value(item['ordenSecuencia'] as int? ?? 1),
          origen: Value(item['origen'] as String? ?? 'ADMIN'),
          esObligatoria: Value(item['esObligatoria'] as bool? ?? true),
          lastSyncedAt: Value(DateTime.now()),
        ),
      );
    }

    debugPrint(
      '🎯 [SYNC] Guardado plan de actividades: ${planData.length} items para orden $idOrdenLocal',
    );
  }

  /// ✅ NUEVO: Guardar equipos de una orden (multi-equipos)
  /// Si la orden tiene múltiples equipos, se guardan localmente
  /// para mostrar en UI y asociar actividades/mediciones/evidencias
  Future<void> _guardarOrdenesEquipos(
    int idOrdenServicio,
    List? equiposData,
  ) async {
    // Debug detallado: Ver exactamente qué llega del backend
    debugPrint(
      '🔍 [SYNC-MULTIEQUIPO] _guardarOrdenesEquipos(idOrdenServicio=$idOrdenServicio)',
    );
    debugPrint('   📦 equiposData: ${equiposData?.length ?? "null"} items');
    if (equiposData != null && equiposData.isNotEmpty) {
      for (int i = 0; i < equiposData.length; i++) {
        final item = equiposData[i];
        debugPrint(
          '   [$i] idOrdenEquipo=${item['idOrdenEquipo']}, idEquipo=${item['idEquipo']}, codigo=${item['codigoEquipo']}',
        );
      }
    }

    // Si no hay equipos, limpiar cualquier dato anterior y salir
    if (equiposData == null || equiposData.isEmpty) {
      await _db.clearEquiposDeOrden(idOrdenServicio);
      return;
    }

    // Limpiar equipos anteriores de esta orden
    await _db.clearEquiposDeOrden(idOrdenServicio);

    // Insertar nuevos equipos
    for (final item in equiposData) {
      final idOrdenEquipo = item['idOrdenEquipo'] as int?;
      final idEquipo = item['idEquipo'] as int?;
      if (idOrdenEquipo == null || idEquipo == null) continue;

      await _db.upsertOrdenEquipo(
        OrdenesEquiposCompanion(
          idOrdenEquipo: Value(idOrdenEquipo),
          idOrdenServicio: Value(idOrdenServicio),
          idEquipo: Value(idEquipo),
          ordenSecuencia: Value(item['ordenSecuencia'] as int? ?? 1),
          nombreSistema: Value(item['nombreSistema'] as String?),
          codigoEquipo: Value(item['codigoEquipo'] as String?),
          nombreEquipo: Value(item['nombreEquipo'] as String?),
          estado: Value(item['estado'] as String? ?? 'PENDIENTE'),
          fechaInicio: Value(_parseDateTime(item['fechaInicio'])),
          fechaFin: Value(_parseDateTime(item['fechaFin'])),
          lastSyncedAt: Value(DateTime.now()),
        ),
      );
    }

    debugPrint(
      '🔧 [SYNC] Guardados ${equiposData.length} equipos para orden $idOrdenServicio (multi-equipos)',
    );
  }

  /// Parsear fecha desde string
  DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) {
      try {
        return DateTime.parse(value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Obtener resumen del estado de la BD local
  /// ✅ FIX RENDIMIENTO: Ejecutar queries en PARALELO
  Future<Map<String, int>> getLocalStats() async {
    // Ejecutar todas las queries en paralelo para no bloquear UI
    final results = await Future.wait([
      _db.getAllOrdenes(),
      _db.getAllClientes(),
      _db.getAllEstadosOrden(),
      _db.getAllParametros(),
      _db.getAllTiposServicio(),
    ]);

    return {
      'ordenes': (results[0] as List).length,
      'clientes': (results[1] as List).length,
      'estados': (results[2] as List).length,
      'parametros': (results[3] as List).length,
      'tiposServicio': (results[4] as List).length,
    };
  }

  /// Verificar si hay datos pendientes de subir
  Future<int> getPendingUploadCount() async {
    return await _db.countPendingSync();
  }
}
