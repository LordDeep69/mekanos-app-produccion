import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';
import '../errors/user_friendly_error.dart';
import 'connectivity_service.dart';
import 'sync_progress.dart';
import 'sse/sse_event_reader.dart';

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
        } else if (response.statusCode == 401 || response.statusCode == 403) {
          // ✅ 19-OCT-2026: rechazo definitivo de sesión/permiso.
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          fallidas++;
          errores.add(
            'Orden ${orden.idOrdenBackend}: '
            '${response.statusCode == 403 ? 'edición no autorizada' : 'sesión expirada'}',
          );
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
        // ✅ 19-OCT-2026: 401/403 son definitivos. No reintentar ni inferir
        // éxito: se descarta la entrada y se reporta el motivo.
        if (statusCode == 401 || statusCode == 403) {
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
          fallidas++;
          errores.add(
            'Orden ${orden.idOrdenBackend}: '
            '${statusCode == 403 ? 'edición no autorizada' : 'sesión expirada'}',
          );
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
            errores.add(
              'Orden ${orden.idOrdenBackend}: el servidor rechazó los datos.',
            );
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

        // Después de la verificación, si aún no está completada, marcar error.
        debugPrint('❌ [SYNC] Marcando como ERROR para reintento posterior');
        final errorMsg = mensajeAmigable(
          e,
          contexto: 'finalizar la orden',
        );
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
        fallidas++;
        errores.add('Orden ${orden.idOrdenBackend}: $errorMsg');
      } catch (e) {
        // Error inesperado
        final mensaje = mensajeAmigable(
          e,
          contexto: 'sincronizar la orden ${orden.idOrdenBackend}',
        );
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, mensaje);
        fallidas++;
        errores.add(mensaje);
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

  /// Verifica si una orden ya fue completada en el backend.
  ///
  /// ✅ 26-OCT-2026 (Fase A): usa `/sync/permiso-edicion/:id`, que responde en
  /// ~1 s con 140 bytes (1 query) en lugar de descargar la orden completa
  /// (~3,6 s y N+1 de Prisma). Se consulta después de un corte de SSE para
  /// decidir si hay que reenviar.
  ///
  /// Retorna {completada: bool, pdfUrl: String?, datosOrden: Map?}.
  Future<Map<String, dynamic>> _verificarOrdenYaCompletada(
    int idOrdenBackend,
  ) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/sync/permiso-edicion/$idOrdenBackend',
        options: Options(
          sendTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 20),
        ),
      );

      final data = response.data;
      if (response.statusCode == 200 && data != null) {
        final estadoCodigo = data['estadoCodigo']?.toString();
        final esEstadoFinal = data['esEstadoFinal'] == true;
        final completada =
            esEstadoFinal || estadoCodigo == 'COMPLETADA';

        debugPrint(
          '🔍 [VERIFICAR] Orden $idOrdenBackend: estado=$estadoCodigo, '
          'final=$esEstadoFinal → completada=$completada',
        );

        return {
          'completada': completada,
          'pdfUrl': null, // SOLO_DATOS: el PDF se genera en Admin Portal
          'datosOrden': data,
        };
      }

      return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
    } on DioException catch (e) {
      final status = e.response?.statusCode;

      if (status == 404) {
        // Distinguir "orden eliminada" de "endpoint no existe en este backend".
        final cuerpo = e.response?.data?.toString() ?? '';
        if (cuerpo.contains('Cannot GET') ||
            cuerpo.contains('permiso-edicion')) {
          debugPrint(
            '⚠️ [VERIFICAR] Endpoint liviano no disponible; usando orden completa',
          );
          return _verificarDesdeOrdenCompleta(idOrdenBackend);
        }
        debugPrint('🗑️ [VERIFICAR] Orden $idOrdenBackend no existe (404)');
        return {
          'completada': false,
          'eliminada': true,
          'pdfUrl': null,
          'datosOrden': null,
        };
      }

      if (status == 401) {
        return {
          'completada': false,
          'sesionExpirada': true,
          'pdfUrl': null,
          'datosOrden': null,
        };
      }

      // 403 = la orden ya no está asignada a este técnico; 405/501 = endpoint
      // no implementado. El resto es transitorio: no concluir nada.
      if (status == 403) {
        return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
      }
      if (status == 405 || status == 501) {
        return _verificarDesdeOrdenCompleta(idOrdenBackend);
      }

      debugPrint('❌ [VERIFICAR] Error liviano verificando: $e');
      return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
    } catch (e) {
      debugPrint('❌ [VERIFICAR] Error verificando: $e');
      return {'completada': false, 'pdfUrl': null, 'datosOrden': null};
    }
  }

  /// Fallback de compatibilidad: descarga la orden completa.
  /// Solo se usa si el backend no tiene el endpoint liviano.
  Future<Map<String, dynamic>> _verificarDesdeOrdenCompleta(
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
  /// ✅ FIX 24-OCT-2026: emitir siempre un evento final de progreso. Antes,
  /// los retornos tempranos (sin conexión / orden inexistente) dejaban el
  /// diálogo de la UI en "cargando" para siempre.
  Future<bool> reintentarOrden(int idOrdenLocal) async {
    try {
      final online = await _connectivity.checkConnection();
      if (!online) {
        _progressNotifier.error(
          'Sin conexión a internet. Intenta de nuevo cuando tengas señal.',
        );
        return false;
      }

      final orden = await (_db.select(
        _db.ordenesPendientesSync,
      )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).getSingleOrNull();

      if (orden == null) {
        _progressNotifier.error(
          'La orden ya no está pendiente de sincronización.',
        );
        return false;
      }

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
    } catch (e) {
      debugPrint('❌ [SYNC-INDIVIDUAL] Error en reintentarOrden: $e');
      _progressNotifier.error(
        mensajeAmigable(e, contexto: 'iniciar la sincronización'),
      );
      return false;
    }
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
        // ✅ 19-OCT-2026: permiso revocado o sesión expirada. No reintentar
        // ni inferir éxito por el estado previo de la orden.
        if (sseResult.error == 'EDICION_NO_AUTORIZADA' ||
            sseResult.error == 'SESION_EXPIRADA') {
          await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);

          final errorMsg = sseResult.error == 'EDICION_NO_AUTORIZADA'
              ? 'El administrador no autorizó (o revocó) la edición de esta orden.'
              : 'Tu sesión expiró. Inicia sesión nuevamente.';
          _progressNotifier.error(errorMsg);
          return false;
        }

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

      // ✅ 19-OCT-2026: rechazo definitivo de sesión/permiso. No reintentar.
      if (statusCode == 401 || statusCode == 403) {
        await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
        final errorMsg = statusCode == 403
            ? 'El administrador no autorizó (o revocó) la edición de esta orden.'
            : 'Tu sesión expiró. Inicia sesión nuevamente.';
        _progressNotifier.error(errorMsg);
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
        final errorMsg = mensajeAmigable(
          e,
          contexto: 'finalizar la orden',
        );
        await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
        _progressNotifier.error(errorMsg);
        return false;
      }

      // Verificar si el backend procesó durante timeout
      // ✅ 24-OCT-2026: en SOLO_DATOS no hay PDF/email, así que verificar de
      // inmediato y luego con esperas cortas (~10s total, antes 30s).
      final verificacionTimeout = await _verificarConEspera(
        orden.idOrdenBackend,
      );
      if (verificacionTimeout['completada'] == true) {
        await _db.eliminarOrdenPendienteSync(orden.idOrdenLocal);
        await _marcarOrdenSincronizada(orden.idOrdenLocal, {
          'pdfUrl': verificacionTimeout['pdfUrl'],
        });
        _progressNotifier.completar();
        return true;
      }

      // Marcar como error para reintento (mensaje ya traducido).
      final errorMsg = mensajeAmigable(
        e,
        contexto: 'finalizar la orden',
      );
      await _db.marcarOrdenErrorSync(orden.idOrdenLocal, errorMsg);
      _progressNotifier.error(errorMsg);
      return false;
    } catch (e) {
      debugPrint('❌ [SYNC-INDIVIDUAL] Error inesperado: $e');
      final errorMsg = mensajeAmigable(
        e,
        contexto: 'finalizar la orden',
      );
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
          error: 'El servidor respondió con un estado inesperado.',
        );
      }

      debugPrint('📡 [SSE-OFFLINE] Conexión SSE establecida');

      final stream = response.data?.stream;
      if (stream == null) {
        debugPrint('❌ [SSE-OFFLINE] Stream es null');
        return _SSEResult(
          success: false,
          error: 'No se recibió respuesta del servidor.',
        );
      }

      debugPrint(
        '📡 [SSE-OFFLINE] Stream obtenido, comenzando a leer eventos...',
      );

      // ✅ 26-OCT-2026: lector SSE robusto compartido. Antes este camino
      // conservaba el parser por-chunk (duplicado y frágil): una tilde partida
      // entre chunks rompía el stream y se perdía el progreso.
      final lectura = await leerEventosSse(
        stream,
        onEvento: _progressNotifier.procesarEventoBackend,
        stallTimeout: const Duration(seconds: 90),
        limiteTotal: const Duration(minutes: 5),
      );

      debugPrint(
        '📡 [SSE-OFFLINE] Fin de stream: eventos=${lectura.eventosRecibidos}, '
        'stall=${lectura.abortadoPorStall}, limite=${lectura.abortadoPorLimite}, '
        'streamError=${lectura.errorDeStream}',
      );

      if (lectura.ultimoError != null) {
        return _SSEResult(
          success: false,
          error: mensajeAmigable(lectura.ultimoError, contexto: 'finalizar la orden'),
        );
      }

      if (lectura.resultadoFinal != null) {
        return _SSEResult(
          success: lectura.resultadoFinal!['success'] as bool? ?? true,
          datos: (lectura.resultadoFinal!['datos'] as Map?)
              ?.cast<String, dynamic>(),
        );
      }

      // ✅ 26-OCT-2026 ZERO TRUST: si el stream terminó sin `result`, NO se
      // asume éxito. Se verifica si el backend alcanzó a completar la orden
      // antes de decidir. Antes se devolvía success:true a ciegas.
      final verificacion = await _verificarConEspera(idOrdenBackend);
      if (verificacion['completada'] == true) {
        debugPrint('✅ [SSE-OFFLINE] Backend SÍ completó la orden');
        return _SSEResult(
          success: true,
          datos: verificacion['pdfUrl'] != null
              ? {
                  'documento': {'url': verificacion['pdfUrl']},
                }
              : null,
        );
      }

      return _SSEResult(
        success: false,
        error: (lectura.abortadoPorStall || lectura.abortadoPorLimite)
            ? 'TIMEOUT_SSE'
            : 'CONEXION_PERDIDA_SSE',
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      debugPrint('❌ [SSE-OFFLINE] DioException: status=$status, ${e.message}');

      // ✅ 19-OCT-2026: 401/403 son definitivos (sesión/permiso). No reintentar.
      if (status == 401) {
        return _SSEResult(success: false, error: 'SESION_EXPIRADA');
      }
      if (status == 403) {
        return _SSEResult(success: false, error: 'EDICION_NO_AUTORIZADA');
      }

      // ✅ 26-OCT-2026: solo se usa el endpoint tradicional si el SSE no
      // existe en el servidor (404/405/501). Un timeout o un 5xx NO se
      // reintenta a ciegas: el backend pudo haber completado la orden.
      final sseNoDisponible =
          status == 404 || status == 405 || status == 501;
      if (sseNoDisponible) {
        debugPrint('📡 [SSE-OFFLINE] SSE no disponible, usando endpoint clásico');
        return _fallbackEnvioTradicional(idOrdenBackend, payload);
      }

      // Rechazo definitivo del payload: reintentar no ayuda.
      if (status == 400 || status == 409 || status == 422) {
        return _SSEResult(
          success: false,
          error: mensajeAmigable(e, contexto: 'finalizar la orden'),
        );
      }

      // Timeout / corte de red / 5xx: verificar idempotencia antes de concluir.
      final verificacion = await _verificarConEspera(idOrdenBackend);
      if (verificacion['completada'] == true) {
        debugPrint('✅ [SSE-OFFLINE] Backend completó la orden pese al corte');
        return _SSEResult(
          success: true,
          datos: verificacion['pdfUrl'] != null
              ? {
                  'documento': {'url': verificacion['pdfUrl']},
                }
              : null,
        );
      }

      final esTimeout =
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout;

      return _SSEResult(
        success: false,
        error: esTimeout ? 'TIMEOUT_SSE' : 'CONEXION_PERDIDA_SSE',
      );
    } catch (e) {
      debugPrint('❌ [SSE-OFFLINE] Error inesperado: $e');
      return _SSEResult(
        success: false,
        error: mensajeAmigable(e, contexto: 'finalizar la orden'),
      );
    }
  }

  /// Verifica si la orden quedó completada, con esperas cortas para cubrir el
  /// caso en que el backend seguía procesando cuando se cortó la conexión.
  Future<Map<String, dynamic>> _verificarConEspera(
    int idOrdenBackend, {
    int intentos = 3,
  }) async {
    for (var intento = 1; intento <= intentos; intento++) {
      if (intento > 1) {
        await Future.delayed(Duration(seconds: intento * 2));
      }
      final resultado = await _verificarOrdenYaCompletada(idOrdenBackend);
      if (resultado['completada'] == true) return resultado;
    }
    return {
      'completada': false,
      'pdfUrl': null,
      'datosOrden': null,
    };
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
        // Feedback local honesto: el endpoint clásico no emite pasos.
        // SOLO_DATOS no genera PDF ni email, así que no se simulan.
        _progressNotifier.completarPaso(SyncStep.validando);
        _progressNotifier.avanzar(SyncStep.evidencias);
        _progressNotifier.completarPaso(SyncStep.evidencias);
        _progressNotifier.avanzar(SyncStep.firmas);
        _progressNotifier.completarPaso(SyncStep.firmas);
        _progressNotifier.avanzar(SyncStep.actualizando_estado);
        _progressNotifier.completarPaso(SyncStep.actualizando_estado);

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
        error: 'El servidor no pudo confirmar la orden. Intenta de nuevo.',
      );
    } on DioException catch (e) {
      return _SSEResult(
        success: false,
        error: mensajeAmigable(e, contexto: 'finalizar la orden'),
      );
    } catch (e) {
      return _SSEResult(
        success: false,
        error: mensajeAmigable(e, contexto: 'finalizar la orden'),
      );
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
