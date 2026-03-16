import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';
import 'connectivity_service.dart';
import 'sync_progress.dart';

/// Resultado del intento de sincronización offline
class OfflineSyncResult {
  final bool success;
  final String mensaje;
  final int ordenesSync;
  final int ordenesFallidas;
  final List<String> errores;

  OfflineSyncResult({
    required this.success,
    required this.mensaje,
    this.ordenesSync = 0,
    this.ordenesFallidas = 0,
    this.errores = const [],
  });
}

/// Servicio de Sincronización Offline
///
/// Responsabilidades:
/// 1. Guardar órdenes en cola cuando no hay conexión
/// 2. Procesar la cola cuando hay conexión
/// 3. Manejar reintentos con backoff exponencial
/// 4. Notificar cambios a la UI
class OfflineSyncService {
  final AppDatabase _db;
  final Dio _apiClient;
  final ConnectivityService _connectivity;
  final SyncProgressNotifier _progressNotifier;

  // Máximo de reintentos antes de abandonar
  static const int maxIntentos = 5;

  OfflineSyncService(
    this._db,
    this._apiClient,
    this._connectivity,
    this._progressNotifier,
  );

  /// Guarda una orden en la cola de sincronización pendiente
  ///
  /// [idOrdenLocal] - ID local de la orden
  /// [idOrdenBackend] - ID en el backend
  /// [payload] - Mapa con todos los datos para el request
  Future<bool> guardarEnCola({
    required int idOrdenLocal,
    required int idOrdenBackend,
    required Map<String, dynamic> payload,
  }) async {
    debugPrint(
      '📥 [COLA] guardarEnCola() idLocal=$idOrdenLocal, idBackend=$idOrdenBackend',
    );
    try {
      // Verificar si ya existe en cola
      final existe = await _db.existeOrdenEnColaPendiente(idOrdenLocal);
      debugPrint('📥 [COLA] ¿Ya existe en cola? $existe');
      if (existe) {
        // Actualizar payload existente
        debugPrint('📥 [COLA] Actualizando entrada existente');
        await (_db.update(
          _db.ordenesPendientesSync,
        )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).write(
          OrdenesPendientesSyncCompanion(
            payloadJson: Value(jsonEncode(payload)),
            estadoSync: const Value('PENDIENTE'),
            intentos: const Value(0),
            ultimoError: const Value(null),
          ),
        );
      } else {
        // Insertar nuevo
        debugPrint('📥 [COLA] Insertando nueva entrada');
        await _db.insertOrdenPendienteSync(
          idOrdenLocal: idOrdenLocal,
          idOrdenBackend: idOrdenBackend,
          payloadJson: jsonEncode(payload),
        );
      }
      debugPrint('📥 [COLA] Guardado exitoso');
      return true;
    } catch (e) {
      debugPrint('📥 [COLA] ERROR: $e');
      return false;
    }
  }

  /// Procesa todas las órdenes pendientes en la cola
  ///
  /// Retorna resultado con estadísticas de sincronización
  Future<OfflineSyncResult> procesarCola() async {
    debugPrint('🔄 [SYNC] procesarCola() INICIADO');

    // Verificar conexión primero
    final online = await _connectivity.checkConnection();
    if (!online) {
      debugPrint('🔄 [SYNC] Sin conexión - abortando');
      return OfflineSyncResult(
        success: false,
        mensaje: 'Sin conexión a Internet',
      );
    }

    // Obtener Y marcar órdenes pendientes atómicamente
    // Esto previene race conditions donde múltiples procesos obtienen la misma orden
    final pendientes = await _db.getYMarcarOrdenesPendientesSync();
    debugPrint('🔄 [SYNC] Órdenes obtenidas: ${pendientes.length}');
    for (final p in pendientes) {
      debugPrint(
        '🔄 [SYNC]   - idLocal=${p.idOrdenLocal}, idBackend=${p.idOrdenBackend}, estado=${p.estadoSync}',
      );
    }
    if (pendientes.isEmpty) {
      return OfflineSyncResult(
        success: true,
        mensaje: 'No hay órdenes pendientes',
      );
    }

    int sincronizadas = 0;
    int fallidas = 0;
    final errores = <String>[];

    for (final orden in pendientes) {
      // Ya marcada como EN_PROCESO por getYMarcarOrdenesPendientesSync()
      try {
        // PASO 0: VERIFICAR SI LA ORDEN YA FUE COMPLETADA EN EL BACKEND
        // Esto previene duplicación cuando el request anterior llegó pero la respuesta se perdió
        final verificacionInicial = await _verificarOrdenYaCompletada(
          orden.idOrdenBackend,
        );
        if (verificacionInicial['completada'] == true) {
          // La orden ya fue procesada - eliminar de cola sin reenviar
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          await _marcarOrdenSincronizada(orden.idOrdenLocal, {
            'pdfUrl': verificacionInicial['pdfUrl'],
          });
          sincronizadas++;
          continue; // Saltar al siguiente
        }

        // ✅ FIX 26-FEB-2026: Si el servidor dice 404, la orden fue eliminada
        if (verificacionInicial['eliminada'] == true) {
          debugPrint(
            '🗑️ [SYNC] Orden ${orden.idOrdenBackend} eliminada del servidor (404). '
            'Eliminando de cola.',
          );
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          fallidas++;
          errores.add('Orden ${orden.idOrdenBackend}: Eliminada del servidor');
          continue;
        }

        // Decodificar payload
        final payload = jsonDecode(orden.payloadJson) as Map<String, dynamic>;

        // CRÍTICO: Asegurar que la orden esté en EN_PROCESO en el backend
        // Si esto falla, NO continuar con finalizar-completo
        try {
          final iniciarResponse = await _apiClient.put(
            '/ordenes/${orden.idOrdenBackend}/iniciar',
          );
          // Si no es 200/201, verificar si ya está en proceso o completada
          if (iniciarResponse.statusCode != 200 &&
              iniciarResponse.statusCode != 201) {
            // Verificar estado actual
            final verificacionEstado = await _verificarOrdenYaCompletada(
              orden.idOrdenBackend,
            );
            if (verificacionEstado['completada'] == true) {
              await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
              await _marcarOrdenSincronizada(orden.idOrdenLocal, {
                'pdfUrl': verificacionEstado['pdfUrl'],
              });
              sincronizadas++;
              continue;
            }
          }
        } on DioException catch (iniciarError) {
          // Si /iniciar falla con 400/409, la orden puede ya estar en proceso o completada
          final statusCode = iniciarError.response?.statusCode;
          // ✅ FIX 26-FEB-2026: Detectar 404 en /iniciar
          if (statusCode == 404) {
            debugPrint(
              '🗑️ [SYNC] Orden ${orden.idOrdenBackend} no existe (404 en /iniciar). '
              'Eliminando de cola.',
            );
            await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
            fallidas++;
            errores.add(
              'Orden ${orden.idOrdenBackend}: Eliminada del servidor',
            );
            continue;
          }
          if (statusCode == 400 || statusCode == 409) {
            // Verificar si ya está completada
            final verificacionIniciar = await _verificarOrdenYaCompletada(
              orden.idOrdenBackend,
            );
            if (verificacionIniciar['completada'] == true) {
              await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
              await _marcarOrdenSincronizada(orden.idOrdenLocal, {
                'pdfUrl': verificacionIniciar['pdfUrl'],
              });
              sincronizadas++;
              continue;
            }
            // Si no está completada, puede estar en proceso - continuar
          } else {
            // Otro error de red - marcar para reintento
            await _db.marcarOrdenErrorSync(
              orden.idOrdenLocal,
              'Error iniciando orden: ${iniciarError.message}',
            );
            fallidas++;
            errores.add('Orden ${orden.idOrdenBackend}: Error al iniciar');
            continue;
          }
        }

        // Enviar al backend
        final response = await _apiClient.post(
          '/ordenes/${orden.idOrdenBackend}/finalizar-completo',
          data: payload,
          options: Options(
            sendTimeout: const Duration(minutes: 5),
            receiveTimeout: const Duration(minutes: 5),
          ),
        );

        if (response.statusCode == 200) {
          // Éxito - eliminar de cola y actualizar orden local
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);

          // CRÍTICO: El backend YA procesó la orden
          // Si falla el guardado local, NO es crítico - la orden está en el servidor
          try {
            await _marcarOrdenSincronizada(orden.idOrdenLocal, response.data);
          } catch (localError) {
            debugPrint(
              '⚠️ Error guardando estado local (no crítico): $localError',
            );
          }
          sincronizadas++;
        } else if (response.statusCode == 400 || response.statusCode == 409) {
          // Error 400/409 = Orden ya completada o conflicto
          // Verificar si realmente ya está completada en backend
          final verificacion = await _verificarOrdenYaCompletada(
            orden.idOrdenBackend,
          );
          if (verificacion['completada'] == true) {
            // Sí estaba completada - eliminar de cola sin reintentar
            await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
            await _marcarOrdenSincronizada(orden.idOrdenLocal, {
              'pdfUrl': verificacion['pdfUrl'],
            });
            sincronizadas++;
          } else {
            // Error 400 pero no está completada - error real, eliminar de cola
            await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
            fallidas++;
            errores.add(
              'Orden ${orden.idOrdenBackend}: Error ${response.statusCode}',
            );
          }
        } else {
          // Otro error del servidor - marcar para posible reintento
          await _db.marcarOrdenErrorSync(
            orden.idOrdenLocal,
            'Error ${response.statusCode}: ${response.data}',
          );
          fallidas++;
          errores.add(
            'Orden ${orden.idOrdenBackend}: Error ${response.statusCode}',
          );
        }
      } on DioException catch (e) {
        // CRÍTICO: Verificar si el error es 400/409 (orden ya completada)
        final statusCode = e.response?.statusCode;
        // ✅ FIX 26-FEB-2026: Detectar 404 en respuesta del servidor
        if (statusCode == 404) {
          debugPrint(
            '🗑️ [SYNC] Orden ${orden.idOrdenBackend} no existe (404 DioException). '
            'Eliminando de cola.',
          );
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          fallidas++;
          errores.add('Orden ${orden.idOrdenBackend}: Eliminada del servidor');
          continue;
        }
        if (statusCode == 400 || statusCode == 409) {
          // Error 400/409 = probablemente orden ya completada
          final verificacion = await _verificarOrdenYaCompletada(
            orden.idOrdenBackend,
          );
          if (verificacion['completada'] == true) {
            await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
            await _marcarOrdenSincronizada(orden.idOrdenLocal, {
              'pdfUrl': verificacion['pdfUrl'],
            });
            sincronizadas++;
            continue;
          } else {
            // Error 400 pero no está completada - eliminar de cola (error permanente)
            await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
            fallidas++;
            errores.add('Orden ${orden.idOrdenBackend}: Error $statusCode');
            continue;
          }
        }

        // CRÍTICO: El backend puede estar procesando aún (toma ~25s)
        // Esperar y verificar múltiples veces antes de marcar como ERROR
        debugPrint('⚠️ [SYNC] DioException DETALLADO:');
        debugPrint('⚠️ [SYNC]   type=${e.type}');
        debugPrint('⚠️ [SYNC]   statusCode=${e.response?.statusCode}');
        debugPrint('⚠️ [SYNC]   message=${e.message}');
        debugPrint('⚠️ [SYNC]   error=${e.error}');
        debugPrint(
          '⚠️ [SYNC]   stackTrace=${e.stackTrace.toString().split('\n').take(3).join(' | ')}',
        );

        Map<String, dynamic>? verificacionFinal;
        for (int intento = 1; intento <= 3; intento++) {
          debugPrint(
            '🔍 [SYNC] Verificación idempotencia intento $intento/3...',
          );

          // Esperar antes de verificar (el backend puede estar procesando)
          await Future.delayed(Duration(seconds: intento * 5)); // 5s, 10s, 15s

          verificacionFinal = await _verificarOrdenYaCompletada(
            orden.idOrdenBackend,
          );
          debugPrint(
            '🔍 [SYNC] ¿Ya completada? ${verificacionFinal['completada']}',
          );

          if (verificacionFinal['completada'] == true) break;
        }

        if (verificacionFinal != null &&
            verificacionFinal['completada'] == true) {
          // El backend YA procesó la orden - eliminar de cola
          debugPrint('✅ [SYNC] Backend ya procesó - eliminando de cola');
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          try {
            await _marcarOrdenSincronizada(orden.idOrdenLocal, {
              'pdfUrl': verificacionFinal['pdfUrl'],
            });
          } catch (_) {}
          sincronizadas++;
          continue;
        }

        // Después de 30s de espera, si aún no está completada, marcar como error
        debugPrint('❌ [SYNC] Marcando como ERROR para reintento posterior');
        final errorMsg =
            e.response?.data?.toString() ?? e.message ?? 'Error de conexión';
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
        fallidas++;
        errores.add('Orden ${orden.idOrdenBackend}: $errorMsg');
      } catch (e) {
        // Error inesperado
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, e.toString());
        fallidas++;
        errores.add('Orden ${orden.idOrdenBackend}: $e');
      }
    }

    return OfflineSyncResult(
      success: fallidas == 0,
      mensaje: sincronizadas > 0
          ? '$sincronizadas orden(es) sincronizada(s)'
          : 'No se pudo sincronizar ninguna orden',
      ordenesSync: sincronizadas,
      ordenesFallidas: fallidas,
      errores: errores,
    );
  }

  /// Verifica si una orden ya fue completada en el backend
  /// Retorna un Map con {completada: bool, pdfUrl: String?, datosOrden: Map?}
  Future<Map<String, dynamic>> _verificarOrdenYaCompletada(
    int idOrdenBackend,
  ) async {
    try {
      final response = await _apiClient.get(
        '/ordenes/$idOrdenBackend',
        options: Options(
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ),
      );

      if (response.statusCode == 200 && response.data is Map) {
        final data = response.data;

        // LOGGING COMPLETO - Ver TODOS los campos del backend
        debugPrint('🔍 [VERIFICAR] TODOS los campos de orden $idOrdenBackend:');
        debugPrint('🔍 [VERIFICAR] Keys: ${data.keys.toList()}');

        // El backend puede envolver los datos en diferentes estructuras
        final datos = data['datos'] ?? data['orden'] ?? data['data'] ?? data;
        debugPrint(
          '🔍 [VERIFICAR] datos.keys: ${datos is Map ? datos.keys.toList() : 'NO ES MAP'}',
        );

        // Buscar estado en múltiples ubicaciones posibles
        final estadoObj =
            datos['estado'] ?? datos['estadoActual'] ?? data['estado'];
        final idEstadoActual =
            datos['id_estado_actual'] ??
            datos['idEstadoActual'] ??
            data['id_estado_actual'];

        debugPrint('🔍 [VERIFICAR]   estadoObj: $estadoObj');
        debugPrint('🔍 [VERIFICAR]   idEstadoActual: $idEstadoActual');

        // Extraer código del estado si es un objeto
        String? estadoCodigo;
        bool esEstadoFinal = false;

        if (estadoObj is Map) {
          // Backend usa codigo_estado, no codigo
          estadoCodigo =
              estadoObj['codigo_estado']?.toString() ??
              estadoObj['codigo']?.toString();
          esEstadoFinal =
              estadoObj['es_estado_final'] == true ||
              estadoObj['esEstadoFinal'] == true;
        } else if (estadoObj is String) {
          estadoCodigo = estadoObj;
        }

        debugPrint(
          '🔍 [VERIFICAR]   estadoCodigo=$estadoCodigo, esEstadoFinal=$esEstadoFinal, idEstado=$idEstadoActual',
        );

        // Extraer URL del PDF si está disponible
        String? pdfUrl;
        if (datos is Map) {
          // Buscar en documentos_generados o en campos directos
          final documentos =
              datos['documentos_generados'] ?? datos['documentos'];
          if (documentos is List && documentos.isNotEmpty) {
            pdfUrl =
                documentos.last['ruta_archivo']?.toString() ??
                documentos.last['url']?.toString();
          }
          // También buscar en campos directos
          pdfUrl ??=
              datos['url_pdf']?.toString() ?? datos['pdfUrl']?.toString();
        }
        debugPrint('🔍 [VERIFICAR]   pdfUrl: $pdfUrl');

        // Verificar si está completada
        if (estadoCodigo == 'COMPLETADA' ||
            estadoCodigo == 'FINALIZADA' ||
            estadoCodigo == 'FINALIZADO' ||
            esEstadoFinal ||
            idEstadoActual == 4 ||
            idEstadoActual == '4') {
          debugPrint('✅ [VERIFICAR] Orden YA completada');
          return {'completada': true, 'pdfUrl': pdfUrl, 'datosOrden': datos};
        }
      }
      debugPrint('❌ [VERIFICAR] Orden NO completada aún');
      return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
    } on DioException catch (e) {
      // ✅ FIX 26-FEB-2026: Detectar 404 como "orden eliminada del servidor"
      if (e.response?.statusCode == 404) {
        debugPrint(
          '🗑️ [VERIFICAR] Orden $idOrdenBackend NO EXISTE en servidor (404)',
        );
        return {
          'completada': false,
          'eliminada': true,
          'pdfUrl': null,
          'datosOrden': null,
        };
      }
      debugPrint('❌ [VERIFICAR] DioException verificando: $e');
      return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
    } catch (e) {
      debugPrint('❌ [VERIFICAR] Error verificando: $e');
      return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
    }
  }

  /// Reintenta sincronizar una orden específica
  ///
  /// ✅ FIX 18-DIC-2025: Mantener estado EN_PROCESO durante toda la operación
  /// para que la UI muestre el spinner y el técnico vea que está subiendo
  Future<bool> reintentarOrden(int idOrdenLocal) async {
    final online = await _connectivity.checkConnection();
    if (!online) return false;

    final orden = await (_db.select(
      _db.ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).getSingleOrNull();

    if (orden == null) return false;

    // ✅ Marcar como EN_PROCESO inmediatamente (NO PENDIENTE)
    // Esto mantiene la orden visible en la UI con estado "Subiendo..."
    await (_db.update(
      _db.ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).write(
      const OrdenesPendientesSyncCompanion(
        estadoSync: Value('EN_PROCESO'),
        ultimoError: Value(null),
      ),
    );

    // Procesar SOLO esta orden (no toda la cola)
    return await _procesarOrdenIndividual(orden);
  }

  /// Procesa una orden individual sin pasar por procesarCola()
  /// Mantiene el control del estado durante toda la operación
  /// ✅ ACTUALIZADO: Emite progreso para feedback visual en UI
  Future<bool> _procesarOrdenIndividual(OrdenesPendientesSyncData orden) async {
    try {
      debugPrint(
        '🔄 [SYNC-INDIVIDUAL] Procesando orden ${orden.idOrdenBackend}',
      );

      // ✅ PROGRESO: Iniciando
      _progressNotifier.iniciar(orden.idOrdenBackend);
      _progressNotifier.avanzar(SyncStep.preparando);

      // PASO 0: VERIFICAR SI LA ORDEN YA FUE COMPLETADA EN EL BACKEND
      final verificacionInicial = await _verificarOrdenYaCompletada(
        orden.idOrdenBackend,
      );
      if (verificacionInicial['completada'] == true) {
        debugPrint('✅ [SYNC-INDIVIDUAL] Orden ya completada en backend');
        await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
        await _marcarOrdenSincronizada(orden.idOrdenLocal, {
          'pdfUrl': verificacionInicial['pdfUrl'],
        });
        _progressNotifier.completar();
        return true;
      }

      // ✅ FIX 26-FEB-2026: Si el servidor dice 404, la orden fue eliminada
      // Limpiar la cola y NO reintentar. El smart sync purgará la orden local.
      if (verificacionInicial['eliminada'] == true) {
        debugPrint(
          '🗑️ [SYNC-INDIVIDUAL] Orden ${orden.idOrdenBackend} eliminada del servidor. '
          'Eliminando de cola de retry.',
        );
        await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
        _progressNotifier.error('La orden fue eliminada del servidor');
        return false;
      }

      // Decodificar payload
      final payload = jsonDecode(orden.payloadJson) as Map<String, dynamic>;

      // ✅ 20-DIC-2025: NO marcar pasos locales como completados
      // El SSE del servidor marcará los pasos como completados cuando realmente se procesen
      _progressNotifier.avanzar(
        SyncStep.preparando,
        mensaje: 'Conectando con servidor...',
      );

      // ✅ PROGRESO: Enviando al servidor
      _progressNotifier.avanzar(
        SyncStep.validando,
        mensaje: 'Enviando al servidor...',
      );

      // CRÍTICO: Asegurar que la orden esté en EN_PROCESO en el backend
      try {
        await _apiClient.put('/ordenes/${orden.idOrdenBackend}/iniciar');
      } on DioException catch (iniciarError) {
        final statusCode = iniciarError.response?.statusCode;
        // ✅ FIX 26-FEB-2026: Detectar 404 al intentar iniciar la orden
        if (statusCode == 404) {
          debugPrint(
            '🗑️ [SYNC-INDIVIDUAL] Orden ${orden.idOrdenBackend} no existe en servidor (404 en /iniciar). '
            'Eliminando de cola de retry.',
          );
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          _progressNotifier.error('La orden fue eliminada del servidor');
          return false;
        }
        if (statusCode == 400 || statusCode == 409) {
          // Verificar si ya está completada
          final verificacion = await _verificarOrdenYaCompletada(
            orden.idOrdenBackend,
          );
          if (verificacion['completada'] == true) {
            await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
            await _marcarOrdenSincronizada(orden.idOrdenLocal, {
              'pdfUrl': verificacion['pdfUrl'],
            });
            _progressNotifier.completar();
            return true;
          }
        } else {
          rethrow;
        }
      }

      // Enviar al backend con SSE para progreso en tiempo real
      debugPrint(
        '📤 [SYNC-INDIVIDUAL] Enviando a finalizar-completo-stream (SSE)...',
      );
      final sseResult = await _enviarConProgresoSSE(
        idOrdenBackend: orden.idOrdenBackend,
        payload: payload,
      );

      if (sseResult.success) {
        debugPrint('✅ [SYNC-INDIVIDUAL] Éxito SSE - eliminando de cola');

        await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
        try {
          await _marcarOrdenSincronizada(orden.idOrdenLocal, sseResult.datos);
        } catch (localError) {
          debugPrint(
            '⚠️ Error guardando estado local (no crítico): $localError',
          );
        }

        _progressNotifier.completar();
        return true;
      } else {
        // Error del SSE - verificar si la orden ya se completó en el backend
        final verificacion = await _verificarOrdenYaCompletada(
          orden.idOrdenBackend,
        );
        if (verificacion['completada'] == true) {
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          await _marcarOrdenSincronizada(orden.idOrdenLocal, {
            'pdfUrl': verificacion['pdfUrl'],
          });
          _progressNotifier.completar();
          return true;
        }
        // ✅ FIX 26-FEB-2026: Si la verificación detectó 404, limpiar cola
        if (verificacion['eliminada'] == true) {
          debugPrint(
            '🗑️ [SYNC-INDIVIDUAL] Orden ${orden.idOrdenBackend} eliminada (SSE error + 404 verify)',
          );
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          _progressNotifier.error('La orden fue eliminada del servidor');
          return false;
        }
        // Error real - marcar como error
        final errorMsg = sseResult.error ?? 'Error desconocido';
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
        _progressNotifier.error(errorMsg);
        return false;
      }
    } on DioException catch (e) {
      debugPrint('❌ [SYNC-INDIVIDUAL] DioException: ${e.type} - ${e.message}');

      final statusCode = e.response?.statusCode;
      // ✅ FIX 26-FEB-2026: Detectar 404 directamente en DioException
      if (statusCode == 404) {
        debugPrint(
          '🗑️ [SYNC-INDIVIDUAL] Orden ${orden.idOrdenBackend} no existe (404 DioException). '
          'Eliminando de cola.',
        );
        await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
        _progressNotifier.error('La orden fue eliminada del servidor');
        return false;
      }
      if (statusCode == 400 || statusCode == 409) {
        final verificacion = await _verificarOrdenYaCompletada(
          orden.idOrdenBackend,
        );
        if (verificacion['completada'] == true) {
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          await _marcarOrdenSincronizada(orden.idOrdenLocal, {
            'pdfUrl': verificacion['pdfUrl'],
          });
          _progressNotifier.completar();
          return true;
        }
        final errorMsg = 'Error $statusCode';
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
        _progressNotifier.error(errorMsg);
        return false;
      }

      // Verificar si el backend procesó durante timeout
      for (int intento = 1; intento <= 3; intento++) {
        debugPrint('🔍 [SYNC-INDIVIDUAL] Verificación intento $intento/3...');
        await Future.delayed(Duration(seconds: intento * 5));
        final verificacion = await _verificarOrdenYaCompletada(
          orden.idOrdenBackend,
        );
        if (verificacion['completada'] == true) {
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          await _marcarOrdenSincronizada(orden.idOrdenLocal, {
            'pdfUrl': verificacion['pdfUrl'],
          });
          _progressNotifier.completar();
          return true;
        }
      }

      // Marcar como error para reintento
      final errorMsg =
          e.response?.data?.toString() ?? e.message ?? 'Error de conexión';
      await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
      _progressNotifier.error(errorMsg);
      return false;
    } catch (e) {
      debugPrint('❌ [SYNC-INDIVIDUAL] Error inesperado: $e');
      final errorMsg = e.toString();
      await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
      _progressNotifier.error(errorMsg);
      return false;
    }
  }

  /// ✅ 20-DIC-2025: Envía la orden usando SSE para progreso en tiempo real
  ///
  /// Este método usa el endpoint /finalizar-completo-stream que retorna
  /// Server-Sent Events (SSE) con el progreso de cada paso del backend.
  Future<_SSEResult> _enviarConProgresoSSE({
    required int idOrdenBackend,
    required Map<String, dynamic> payload,
  }) async {
    debugPrint(
      '📡 [SSE-OFFLINE] Iniciando envío con streaming para orden $idOrdenBackend',
    );

    try {
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

      debugPrint('📡 [SSE-OFFLINE] Response status: ${response.statusCode}');

      // Aceptar 200 y 201
      final statusOk = response.statusCode == 200 || response.statusCode == 201;
      if (!statusOk) {
        debugPrint('❌ [SSE-OFFLINE] Status no válido: ${response.statusCode}');
        return _SSEResult(
          success: false,
          error: 'Error del servidor: ${response.statusCode}',
        );
      }

      debugPrint('📡 [SSE-OFFLINE] Conexión SSE establecida');

      final stream = response.data?.stream;
      if (stream == null) {
        debugPrint('❌ [SSE-OFFLINE] Stream es null');
        return _SSEResult(
          success: false,
          error: 'No se recibió stream del servidor',
        );
      }

      debugPrint(
        '📡 [SSE-OFFLINE] Stream obtenido, comenzando a leer eventos...',
      );

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
                '📡 [SSE-OFFLINE] Evento: ${evento['step']} - ${evento['status']}',
              );

              // Procesar el evento en el notifier
              _progressNotifier.procesarEventoBackend(evento);

              // Si es el resultado final, guardarlo
              if (evento['step'] == 'result' && evento['data'] != null) {
                resultadoFinal = evento['data'] as Map<String, dynamic>;
              }

              // Si es error, guardarlo
              if (evento['status'] == 'error') {
                ultimoError = evento['message'] as String?;
              }
            } catch (e) {
              debugPrint('⚠️ [SSE-OFFLINE] Error parseando evento: $e');
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
      debugPrint('❌ [SSE-OFFLINE] DioException: ${e.message}');

      // Si falla el SSE, hacer fallback al endpoint tradicional
      debugPrint('📡 [SSE-OFFLINE] Fallback a endpoint tradicional...');
      return _fallbackEnvioTradicional(idOrdenBackend, payload);
    } catch (e) {
      debugPrint('❌ [SSE-OFFLINE] Error inesperado: $e');
      return _SSEResult(success: false, error: e.toString());
    }
  }

  /// Fallback al endpoint tradicional si SSE falla
  Future<_SSEResult> _fallbackEnvioTradicional(
    int idOrdenBackend,
    Map<String, dynamic> payload,
  ) async {
    try {
      // Marcar pasos manualmente para feedback local
      _progressNotifier.avanzar(
        SyncStep.validando,
        mensaje: 'Enviando al servidor...',
      );

      final response = await _apiClient.post(
        '/ordenes/$idOrdenBackend/finalizar-completo',
        data: payload,
        options: Options(
          sendTimeout: const Duration(minutes: 5),
          receiveTimeout: const Duration(minutes: 5),
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Simular pasos completados para feedback
        _progressNotifier.completarPaso(SyncStep.validando);
        _progressNotifier.avanzar(SyncStep.evidencias);
        _progressNotifier.completarPaso(SyncStep.evidencias);
        _progressNotifier.avanzar(SyncStep.firmas);
        _progressNotifier.completarPaso(SyncStep.firmas);
        _progressNotifier.avanzar(SyncStep.generando_pdf);
        _progressNotifier.completarPaso(SyncStep.generando_pdf);
        _progressNotifier.avanzar(SyncStep.enviando_email);
        _progressNotifier.completarPaso(SyncStep.enviando_email);

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
      rethrow;
    }
  }

  /// Cancela una orden de la cola de sincronización
  /// PRECAUCIÓN: La orden quedará sin sincronizar
  Future<void> cancelarOrdenPendiente(int idOrdenLocal) async {
    await _db.eliminarOrdenPendienteSync(idOrdenLocal);
  }

  /// Obtiene información de una orden pendiente
  Future<OrdenesPendientesSyncData?> getOrdenPendiente(int idOrdenLocal) async {
    return await (_db.select(
      _db.ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).getSingleOrNull();
  }

  /// Marca una orden como sincronizada en BD local
  /// TRANSACCIÓN ATÓMICA: Todo o nada para garantizar integridad
  Future<void> _marcarOrdenSincronizada(
    int idOrdenLocal,
    dynamic responseData,
  ) async {
    // Extraer URL del PDF de la respuesta
    String? pdfUrl;
    if (responseData is Map) {
      // Primero buscar en el campo directo pdfUrl (del verificador)
      pdfUrl = responseData['pdfUrl']?.toString();
      // Luego buscar en la estructura de respuesta del backend
      pdfUrl ??= responseData['datos']?['documento']?['url'];
      pdfUrl ??= responseData['datos']?['documento']?['ruta_archivo'];
      pdfUrl ??= responseData['pdf_url'];
      pdfUrl ??= responseData['data']?['pdfUrl'];
      pdfUrl ??= responseData['data']?['documento']?['url'];
      pdfUrl ??= responseData['data']?['documento']?['ruta_archivo'];
    }
    debugPrint('📄 [SYNC] URL PDF extraída: $pdfUrl');

    // TRANSACCIÓN ATÓMICA: Actualizar orden + evidencias + firmas
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
          urlPdf: pdfUrl != null ? Value(pdfUrl) : const Value.absent(),
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
}

/// Resultado interno del envío con SSE
class _SSEResult {
  final bool success;
  final Map<String, dynamic>? datos;
  final String? error;

  _SSEResult({required this.success, this.datos, this.error});
}

// =============================================================================
// PROVIDERS
// =============================================================================

/// Provider del servicio de sincronización offline
final offlineSyncServiceProvider = Provider<OfflineSyncService>((ref) {
  final db = ref.watch(databaseProvider);
  final apiClient = ref.watch(apiClientProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final progressNotifier = ref.watch(syncProgressProvider.notifier);
  return OfflineSyncService(db, apiClient.dio, connectivity, progressNotifier);
});

/// Provider del conteo de órdenes pendientes (reactivo para badge)
final pendingSyncCountProvider = StreamProvider<int>((ref) {
  final db = ref.watch(databaseProvider);
  return db.watchCountOrdenesPendientesSync();
});

/// Provider de la lista de órdenes pendientes (reactivo para actualización en tiempo real)
/// ✅ SYNC MANUAL: Usa StreamProvider para actualizarse automáticamente cuando cambia la BD
final pendingSyncListProvider = StreamProvider<List<OrdenesPendientesSyncData>>(
  (ref) {
    final db = ref.watch(databaseProvider);
    return db.watchOrdenesPendientesSync();
  },
);
