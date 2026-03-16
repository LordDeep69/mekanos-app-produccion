// ============================================================================
// SMART SYNC SERVICE - Sincronización Inteligente por Comparación
// ============================================================================
//
// REEMPLAZA delta sync basado en timestamps (falló) por comparación directa.
//
// ALGORITMO:
// 1. Obtener resúmenes de órdenes de Supabase (últimas 500)
// 2. Obtener resúmenes de órdenes locales (Drift)
// 3. Comparar y detectar diferencias por ESTADO
// 4. Descargar órdenes que difieren o son nuevas
// 5. Actualizar BD local transaccionalmente
// ============================================================================

import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';

// ============================================================================
// MODELOS
// ============================================================================

/// Resumen compacto de una orden para comparación
class OrdenResumen {
  final int id;
  final String numeroOrden;
  final int estadoId;
  final String estadoCodigo;
  final String fechaModificacion;
  final String? urlPdf;
  final String? nombreCliente;

  final int? idCliente;
  final int? idEquipo;
  final int? idTipoServicio;

  OrdenResumen({
    required this.id,
    required this.numeroOrden,
    required this.estadoId,
    required this.estadoCodigo,
    required this.fechaModificacion,
    this.urlPdf,
    this.nombreCliente,
    this.idCliente,
    this.idEquipo,
    this.idTipoServicio,
  });

  factory OrdenResumen.fromJson(Map<String, dynamic> json) {
    return OrdenResumen(
      id: json['id'] as int,
      numeroOrden: json['numeroOrden'] as String,
      estadoId: json['estadoId'] as int,
      estadoCodigo: json['estadoCodigo'] as String,
      fechaModificacion: json['fechaModificacion'] as String,
      urlPdf: json['urlPdf'] as String?,
      nombreCliente: json['nombreCliente'] as String?,
      idCliente: json['id_cliente'] as int?,
      idEquipo: json['id_equipo'] as int?,
      idTipoServicio: json['id_tipo_servicio'] as int?,
    );
  }
}

/// Resultado de la sincronización inteligente
class SmartSyncResult {
  final bool success;
  final int totalComparadas;
  final int descargadas;
  final int omitidas;
  final int errores;
  final List<String> ordenesDescargadas;
  final List<String> mensajesError;
  final String serverTimestamp;

  SmartSyncResult({
    required this.success,
    required this.totalComparadas,
    required this.descargadas,
    required this.omitidas,
    required this.errores,
    required this.ordenesDescargadas,
    required this.mensajesError,
    required this.serverTimestamp,
  });

  @override
  String toString() {
    return 'SmartSyncResult(success: $success, comparadas: $totalComparadas, '
        'descargadas: $descargadas, omitidas: $omitidas, errores: $errores)';
  }
}

// ============================================================================
// SERVICIO
// ============================================================================

class SmartSyncService {
  final ApiClient _apiClient;
  final AppDatabase _db;

  SmartSyncService(this._apiClient, this._db);

  /// Ejecuta la sincronización inteligente completa
  Future<SmartSyncResult> sincronizarInteligente(
    int tecnicoId, {
    int limit = 500,
  }) async {
    debugPrint(
      '🧠 [SMART SYNC] Iniciando para técnico $tecnicoId (limit: $limit)',
    );

    final ordenesDescargadas = <String>[];
    final mensajesError = <String>[];
    int descargadas = 0;
    int omitidas = 0;
    int errores = 0;
    String serverTimestamp = DateTime.now().toUtc().toIso8601String();

    try {
      // =====================================================================
      // PASO 1: Obtener resúmenes del servidor
      // =====================================================================
      debugPrint(
        '🧠 [SMART SYNC] Paso 1: Obteniendo resúmenes del servidor...',
      );

      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/sync/compare/$tecnicoId',
        queryParameters: {'limit': limit},
      );

      if (response.data == null) {
        throw Exception('Respuesta vacía del servidor');
      }

      final data = response.data!;
      serverTimestamp = data['serverTimestamp'] as String? ?? serverTimestamp;
      final ordenesServidor = (data['ordenes'] as List<dynamic>)
          .map((e) => OrdenResumen.fromJson(e as Map<String, dynamic>))
          .toList();

      debugPrint(
        '🧠 [SMART SYNC] Recibidos ${ordenesServidor.length} resúmenes del servidor',
      );

      // =====================================================================
      // PASO 2: Obtener mapa de órdenes locales (idBackend -> idEstado)
      // =====================================================================
      debugPrint('🧠 [SMART SYNC] Paso 2: Obteniendo órdenes locales...');

      final ordenesLocales = await _db.getAllOrdenes();
      final mapaLocal = <int, Ordene>{};
      for (final orden in ordenesLocales) {
        if (orden.idBackend != null && orden.idBackend! > 0) {
          mapaLocal[orden.idBackend!] = orden;
        }
      }
      debugPrint(
        '🧠 [SMART SYNC] Encontradas ${mapaLocal.length} órdenes locales con idBackend',
      );

      // =====================================================================
      // PASO 3: Obtener mapa de estados (código -> id local)
      // =====================================================================
      final estadosLocales = await _db.getAllEstadosOrden();
      final estadosMap = <String, int>{};
      for (final estado in estadosLocales) {
        estadosMap[estado.codigo] = estado.id;
      }

      // =====================================================================
      // PASO 4: Comparar y clasificar
      // =====================================================================
      debugPrint('🧠 [SMART SYNC] Paso 3: Comparando órdenes...');

      final aDescargar = <OrdenResumen>[];

      for (final ordenServidor in ordenesServidor) {
        final ordenLocal = mapaLocal[ordenServidor.id];

        if (ordenLocal == null) {
          // Orden existe en servidor pero NO en local → DESCARGAR
          debugPrint(
            '   📥 ${ordenServidor.numeroOrden}: Nueva (no existe localmente)',
          );
          aDescargar.add(ordenServidor);
        } else {
          // Comparar estados usando el código
          final idEstadoLocalEsperado = estadosMap[ordenServidor.estadoCodigo];

          if (idEstadoLocalEsperado != null &&
              ordenLocal.idEstado != idEstadoLocalEsperado) {
            // Estado diferente → DESCARGAR
            debugPrint(
              '   📥 ${ordenServidor.numeroOrden}: Estado diferente '
              '(local=${ordenLocal.idEstado}, servidor=$idEstadoLocalEsperado [${ordenServidor.estadoCodigo}])',
            );
            aDescargar.add(ordenServidor);
          } else if (ordenServidor.urlPdf != null &&
              ordenLocal.urlPdf == null) {
            // Servidor tiene PDF pero local no → DESCARGAR
            debugPrint(
              '   📥 ${ordenServidor.numeroOrden}: PDF disponible en servidor',
            );
            aDescargar.add(ordenServidor);
          } else {
            // Sin cambios en la orden, pero igual actualizamos el nombre del cliente por si cambió la prioridad/dato
            if (ordenServidor.idCliente != null &&
                ordenServidor.nombreCliente != null) {
              await _db.upsertCliente(
                ClientesCompanion(
                  id: Value(ordenServidor.idCliente!),
                  nombre: Value(ordenServidor.nombreCliente!),
                  lastSyncedAt: Value(DateTime.now()),
                ),
              );
            }
            omitidas++;
          }
        }
      }

      // =====================================================================
      // PASO 4B: DETECTAR ÓRDENES ELIMINADAS DEL SERVIDOR (HARD DELETE)
      // ✅ FIX 26-FEB-2026 v2: Algoritmo robusto de detección de eliminación.
      //
      // El servidor SOLO envía órdenes activas (es_estado_final=false).
      // Órdenes locales en estado FINAL no aparecen → eso es NORMAL.
      //
      // Para TODAS las demás órdenes locales (activas) que no aparecen
      // en el servidor, verificamos directamente con GET /ordenes/:id.
      // Si el servidor responde 404, la orden fue eliminada → purgar.
      // Si responde 200, fue reasignada a otro técnico → no purgar.
      //
      // CRÍTICO: No usar isDirty ni enCola como guardas pre-verificación.
      // El servidor es la fuente de verdad. Si dice 404, se purga todo
      // incluyendo la cola de sync pendiente.
      // =====================================================================
      final idsServidor = ordenesServidor.map((o) => o.id).toSet();
      int ordenesEliminadasCount = 0;

      // ✅ FIX 26-FEB-2026: Usar esEstadoFinal del servidor (autoritativo)
      // en vez de set hardcodeado que incluía APROBADA erróneamente.
      // APROBADA = "aprobada para ejecución" (estado activo, NO final).
      final estadosLocales2 = await _db.getAllEstadosOrden();
      final estadosFinalesIds = estadosLocales2
          .where((e) => e.esEstadoFinal)
          .map((e) => e.id)
          .toSet();
      debugPrint(
        '🔍 [SMART SYNC PASO 4B] Estados finales (server-authoritative): '
        '${estadosFinalesIds.toList()} '
        '(${estadosLocales2.where((e) => e.esEstadoFinal).map((e) => e.codigo).join(', ')})',
      );

      // Construir mapa inverso de estadoId -> código para diagnóstico
      final estadoIdACodigo = <int, String>{};
      for (final e in estadosLocales2) {
        estadoIdACodigo[e.id] = e.codigo;
      }

      // Recopilar órdenes candidatas a verificación
      final candidatasVerificacion = <Ordene>[];
      for (final entry in mapaLocal.entries) {
        if (!idsServidor.contains(entry.key)) {
          final orden = entry.value;
          final codigoEstado = estadoIdACodigo[orden.idEstado] ?? '???';

          // Órdenes en estado final no aparecen en compare → es normal
          if (estadosFinalesIds.contains(orden.idEstado)) {
            debugPrint(
              '   ℹ️ ${orden.numeroOrden} (idBackend=${orden.idBackend}) '
              'en estado FINAL ($codigoEstado) → no verificar',
            );
            continue;
          }

          // TODAS las demás órdenes activas que no están en el servidor
          // deben ser verificadas, sin importar isDirty o enCola
          final enCola = await _db.existeOrdenEnColaPendiente(orden.idLocal);
          debugPrint(
            '   🔍 ${orden.numeroOrden} (idBackend=${orden.idBackend}) '
            'no en compare, estado=$codigoEstado, isDirty=${orden.isDirty}, enCola=$enCola → verificando servidor...',
          );
          candidatasVerificacion.add(orden);
        }
      }

      if (candidatasVerificacion.isNotEmpty) {
        debugPrint(
          '🗑️ [SMART SYNC] ${candidatasVerificacion.length} órdenes activas no en servidor, verificando existencia...',
        );

        for (final orden in candidatasVerificacion) {
          try {
            final existeEnServidor = await _verificarOrdenExisteEnServidor(
              orden.idBackend!,
            );
            if (!existeEnServidor) {
              // Servidor confirmó 404 → orden eliminada, purgar todo
              // Primero limpiar cola de sync pendiente (si existe)
              await (_db.delete(
                _db.ordenesPendientesSync,
              )..where((o) => o.idOrdenLocal.equals(orden.idLocal))).go();

              await _purgarOrdenLocalCompleta(orden.idLocal, orden.idBackend);
              ordenesEliminadasCount++;
              debugPrint(
                '   🗑️ ${orden.numeroOrden} (idBackend=${orden.idBackend}) '
                'purgada localmente (isDirty=${orden.isDirty})',
              );
            } else {
              debugPrint(
                '   ⚠️ ${orden.numeroOrden} existe en servidor pero no en compare '
                '(posible reasignación a otro técnico)',
              );
            }
          } catch (e) {
            debugPrint('   ❌ Error verificando ${orden.numeroOrden}: $e');
          }
        }
      }

      debugPrint(
        '🧠 [SMART SYNC] Resultado: ${aDescargar.length} a descargar, $omitidas sin cambios, $ordenesEliminadasCount eliminadas del servidor',
      );

      // =====================================================================
      // PASO 5: SYNC LIGERO - Actualizar estado desde resumen (SIN HTTP extra)
      // =====================================================================
      if (aDescargar.isNotEmpty) {
        debugPrint(
          '🧠 [SMART SYNC] Paso 4: Actualizando ${aDescargar.length} órdenes desde resumen (SYNC LIGERO)...',
        );

        for (final ordenResumen in aDescargar) {
          try {
            final ordenLocal = mapaLocal[ordenResumen.id];
            final idEstadoLocal = estadosMap[ordenResumen.estadoCodigo];

            if (ordenLocal != null && idEstadoLocal != null) {
              // ORDEN EXISTENTE: Solo actualizar estado y PDF (sin HTTP)
              // ✅ LOGGING: Verificar si urlPdf viene del servidor
              debugPrint(
                '   📄 ${ordenResumen.numeroOrden} urlPdf del servidor: ${ordenResumen.urlPdf ?? "NULL"}',
              );
              await _db.updateOrdenEstadoYPdf(
                ordenLocal.idLocal,
                idEstadoLocal,
                ordenResumen.urlPdf,
              );

              // ✅ 03-ENE-2026: Asegurar que el nombre del cliente se actualice con la prioridad correcta
              if (ordenResumen.idCliente != null &&
                  ordenResumen.nombreCliente != null) {
                await _db.upsertCliente(
                  ClientesCompanion(
                    id: Value(ordenResumen.idCliente!),
                    nombre: Value(ordenResumen.nombreCliente!),
                    lastSyncedAt: Value(DateTime.now()),
                  ),
                );
              }

              ordenesDescargadas.add(ordenResumen.numeroOrden);
              descargadas++;
              debugPrint(
                '   ✅ ${ordenResumen.numeroOrden} estado actualizado (LIGERO) - PDF: ${ordenResumen.urlPdf != null ? "SÍ" : "NO"}',
              );
            } else if (ordenLocal == null && idEstadoLocal != null) {
              // ORDEN NUEVA: Descargar orden completa para asegurar dependencias (FKs)
              debugPrint(
                '   📥 ${ordenResumen.numeroOrden}: Descargando orden completa para evitar fallas de FK',
              );
              final fullData = await _descargarOrdenCompleta(ordenResumen.id);
              if (fullData != null) {
                await _guardarOrdenEnLocal(fullData, estadosMap, mapaLocal);
                ordenesDescargadas.add(ordenResumen.numeroOrden);
                descargadas++;
                debugPrint(
                  '   ✅ ${ordenResumen.numeroOrden} creada (COMPLETA)',
                );
              } else {
                // Fallback a creación básica si falla la descarga completa
                await _crearOrdenDesdeResumen(ordenResumen, idEstadoLocal);
                ordenesDescargadas.add(ordenResumen.numeroOrden);
                descargadas++;
                debugPrint(
                  '   ⚠️ ${ordenResumen.numeroOrden} creada (BÁSICA - Falló descarga completa)',
                );
              }
            } else {
              errores++;
              mensajesError.add(
                '${ordenResumen.numeroOrden}: Estado no encontrado',
              );
            }
          } catch (e) {
            errores++;
            mensajesError.add('${ordenResumen.numeroOrden}: $e');
            debugPrint('   ❌ ${ordenResumen.numeroOrden}: $e');
          }
        }
      }

      debugPrint(
        '🧠 [SMART SYNC] ✅ Completado: $descargadas descargadas, $omitidas omitidas, $errores errores',
      );

      // ❌ FIX 06-ENE-2026: DESHABILITADO - Causaba ciclo infinito
      // La limpieza post-sync purgaba órdenes recién descargadas (con fechaFin antigua)
      // y luego el próximo sync las volvía a descargar → ciclo infinito
      // La limpieza ahora solo se ejecuta:
      // - Al abrir la app (onAppResume)
      // - Manualmente desde Configuración → Almacenamiento
      //
      // if (descargadas > 0 || errores == 0) {
      //   try {
      //     debugPrint('🧹 [SMART SYNC] Ejecutando limpieza post-sync...');
      //     // El DataLifecycleManager se eliminó de este servicio para evitar el ciclo infinito
      //     // y cumplir con el Principio de Responsabilidad Única.
      //   } catch (e) { ... }
      // }

      return SmartSyncResult(
        success: errores == 0,
        totalComparadas: ordenesServidor.length,
        descargadas: descargadas,
        omitidas: omitidas,
        errores: errores,
        ordenesDescargadas: ordenesDescargadas,
        mensajesError: mensajesError,
        serverTimestamp: serverTimestamp,
      );
    } catch (e, stack) {
      debugPrint('🧠 [SMART SYNC] ❌ Error fatal: $e');
      debugPrint('Stack: $stack');

      return SmartSyncResult(
        success: false,
        totalComparadas: 0,
        descargadas: 0,
        omitidas: 0,
        errores: 1,
        ordenesDescargadas: [],
        mensajesError: ['Error fatal: $e'],
        serverTimestamp: serverTimestamp,
      );
    }
  }

  /// Descarga una orden completa del servidor
  Future<Map<String, dynamic>?> _descargarOrdenCompleta(int ordenId) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/sync/orden/$ordenId',
      );
      return response.data;
    } catch (e) {
      debugPrint('Error descargando orden $ordenId: $e');
      return null;
    }
  }

  /// Guarda una orden en la BD local
  Future<void> _guardarOrdenEnLocal(
    Map<String, dynamic> ordenData,
    Map<String, int> estadosMap,
    Map<int, Ordene> ordenesExistentes,
  ) async {
    final idBackend = ordenData['idOrdenServicio'] as int;
    final codigoEstado = ordenData['codigoEstado'] as String?;
    final idEstadoLocal = estadosMap[codigoEstado];

    if (idEstadoLocal == null) {
      debugPrint('⚠️ Estado $codigoEstado no encontrado en catálogo local');
      return;
    }

    // Verificar dependencias (cliente, equipo, tipoServicio)
    final idCliente = ordenData['idCliente'] as int?;
    final idEquipo = ordenData['idEquipo'] as int?;
    final idTipoServicio = ordenData['idTipoServicio'] as int?;

    if (idCliente == null || idEquipo == null || idTipoServicio == null) {
      debugPrint('⚠️ Orden $idBackend tiene dependencias nulas');
      return;
    }

    // Upsert cliente
    await _db.upsertCliente(
      ClientesCompanion(
        id: Value(idCliente),
        nombre: Value(ordenData['nombreCliente'] as String? ?? 'Sin nombre'),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );

    // Upsert equipo - FIX 06-ENE-2026: Incluir configParametros
    final configParam = ordenData['configParametros'];
    String? configJson;
    if (configParam != null && configParam is Map && configParam.isNotEmpty) {
      configJson = jsonEncode(configParam);
      final preview = configJson.length > 60
          ? configJson.substring(0, 60)
          : configJson;
      debugPrint(
        '\ud83d\udd0d [SMART SYNC] Equipo $idEquipo tiene configParametros: $preview...',
      );
    }

    await _db.upsertEquipo(
      EquiposCompanion(
        id: Value(idEquipo),
        codigo: Value(ordenData['codigoEquipo'] as String? ?? ''),
        nombre: Value(ordenData['nombreEquipo'] as String? ?? ''),
        serie: Value(ordenData['serieEquipo'] as String?),
        ubicacion: Value(ordenData['ubicacionEquipo'] as String?),
        idCliente: Value(idCliente),
        configParametros: Value(configJson),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );

    // Upsert tipoServicio
    await _db.upsertTipoServicio(
      TiposServicioCompanion(
        id: Value(idTipoServicio),
        codigo: Value(ordenData['codigoTipoServicio'] as String? ?? ''),
        nombre: Value(ordenData['nombreTipoServicio'] as String? ?? ''),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );

    // Preparar companion de orden con TODOS los campos incluyendo estadísticas
    final ordenCompanion = OrdenesCompanion(
      idBackend: Value(idBackend),
      numeroOrden: Value(ordenData['numeroOrden'] as String),
      version: Value(ordenData['version'] as int? ?? 0),
      idEstado: Value(idEstadoLocal),
      idCliente: Value(idCliente),
      idEquipo: Value(idEquipo),
      idTipoServicio: Value(idTipoServicio),
      prioridad: Value(ordenData['prioridad'] as String? ?? 'MEDIA'),
      fechaProgramada: Value(_parseDateTime(ordenData['fechaProgramada'])),
      descripcionInicial: Value(ordenData['descripcionInicial'] as String?),
      trabajoRealizado: Value(ordenData['trabajoRealizado'] as String?),
      observacionesTecnico: Value(ordenData['observacionesTecnico'] as String?),
      urlPdf: Value(ordenData['urlPdf'] as String?),
      fechaInicio: Value(_parseDateTime(ordenData['fechaInicioReal'])),
      fechaFin: Value(_parseDateTime(ordenData['fechaFinReal'])),
      horaEntradaTexto: Value(ordenData['horaEntrada'] as String?),
      horaSalidaTexto: Value(ordenData['horaSalida'] as String?),
      // ✅ ESTADÍSTICAS COMPLETAS
      totalActividades: Value(ordenData['totalActividades'] as int? ?? 0),
      totalMediciones: Value(ordenData['totalMediciones'] as int? ?? 0),
      totalEvidencias: Value(ordenData['totalEvidencias'] as int? ?? 0),
      totalFirmas: Value(ordenData['totalFirmas'] as int? ?? 0),
      actividadesBuenas: Value(ordenData['actividadesBuenas'] as int? ?? 0),
      actividadesMalas: Value(ordenData['actividadesMalas'] as int? ?? 0),
      actividadesCorregidas: Value(
        ordenData['actividadesCorregidas'] as int? ?? 0,
      ),
      actividadesNA: Value(ordenData['actividadesNA'] as int? ?? 0),
      medicionesNormales: Value(ordenData['medicionesNormales'] as int? ?? 0),
      medicionesAdvertencia: Value(
        ordenData['medicionesAdvertencia'] as int? ?? 0,
      ),
      medicionesCriticas: Value(ordenData['medicionesCriticas'] as int? ?? 0),
      lastSyncedAt: Value(DateTime.now()),
      isDirty: const Value(false),
    );

    // Verificar si ya existe
    final existente = ordenesExistentes[idBackend];

    if (existente != null) {
      // Actualizar existente
      await _db.updateOrden(ordenCompanion, existente.idLocal);
    } else {
      // Insertar nueva
      await _db.insertOrdenFromSync(ordenCompanion);
    }

    // ✅ FIX 28-ENE-2026: Guardar equipos de la orden (multi-equipos)
    // CRÍTICO: Este paso faltaba, causando que órdenes multiequipo
    // no se renderizaran correctamente cuando se sincronizaban via Smart Sync
    final equiposData = ordenData['ordenesEquipos'] as List?;
    debugPrint(
      '🔧 [SMART SYNC] Orden ${ordenData['numeroOrden']} (ID $idBackend) - ordenesEquipos: ${equiposData?.length ?? 0}',
    );
    await _guardarOrdenesEquipos(idBackend, equiposData);
  }

  /// Parsea DateTime de string ISO o null
  DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  /// ✅ FIX 28-ENE-2026: Guardar equipos de una orden (multi-equipos)
  /// Copiado de sync_service.dart para mantener paridad
  Future<void> _guardarOrdenesEquipos(
    int idOrdenServicio,
    List? equiposData,
  ) async {
    // Debug detallado
    debugPrint(
      '🔍 [SMART SYNC-MULTIEQUIPO] _guardarOrdenesEquipos(idOrdenServicio=$idOrdenServicio)',
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
      '🔧 [SMART SYNC] Guardados ${equiposData.length} equipos para orden $idOrdenServicio (multi-equipos)',
    );
  }

  /// ✅ FIX 26-FEB-2026: Verifica si una orden aún existe en el servidor
  /// Retorna false si el servidor responde 404 (orden eliminada)
  Future<bool> _verificarOrdenExisteEnServidor(int idBackend) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/ordenes/$idBackend',
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return false; // Orden no existe en servidor
      }
      // Otro error de red → asumir que existe (no purgar por error de red)
      debugPrint(
        '⚠️ [SMART SYNC] Error verificando orden $idBackend: ${e.message}',
      );
      return true;
    } catch (e) {
      debugPrint(
        '⚠️ [SMART SYNC] Error inesperado verificando orden $idBackend: $e',
      );
      return true;
    }
  }

  /// ✅ FIX 26-FEB-2026: Purga completa de una orden local y todos sus datos
  /// Usado cuando se detecta que la orden fue eliminada del servidor (hard delete desde admin)
  Future<void> _purgarOrdenLocalCompleta(
    int idOrdenLocal,
    int? idBackend,
  ) async {
    debugPrint(
      '🗑️ [SMART SYNC] Purgando orden local $idOrdenLocal (backend=$idBackend)',
    );

    await _db.transaction(() async {
      // 1. Eliminar archivos de evidencias
      final evidencias = await _db.getEvidenciasByOrden(idOrdenLocal);
      for (final ev in evidencias) {
        try {
          final archivo = File(ev.rutaLocal);
          if (await archivo.exists()) {
            await archivo.delete();
          }
        } catch (_) {}
      }

      // 2. Eliminar archivos de firmas
      final firmas = await _db.getFirmasByOrden(idOrdenLocal);
      for (final firma in firmas) {
        try {
          final archivo = File(firma.rutaLocal);
          if (await archivo.exists()) {
            await archivo.delete();
          }
        } catch (_) {}
      }

      // 3. Eliminar registros de BD (en orden por FK)
      await (_db.delete(
        _db.evidencias,
      )..where((e) => e.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.firmas,
      )..where((f) => f.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.mediciones,
      )..where((m) => m.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.actividadesEjecutadas,
      )..where((a) => a.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.actividadesPlan,
      )..where((p) => p.idOrden.equals(idOrdenLocal))).go();

      // Limpiar ordenesEquipos (vinculados por idOrdenServicio = idBackend)
      if (idBackend != null) {
        await (_db.delete(
          _db.ordenesEquipos,
        )..where((oe) => oe.idOrdenServicio.equals(idBackend))).go();
      }

      // Limpiar cola de sync pendiente
      await (_db.delete(
        _db.ordenesPendientesSync,
      )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).go();

      // Finalmente eliminar la orden
      await (_db.delete(
        _db.ordenes,
      )..where((o) => o.idLocal.equals(idOrdenLocal))).go();
    });

    debugPrint(
      '✅ [SMART SYNC] Orden local $idOrdenLocal purgada completamente',
    );
  }

  /// Crea una orden básica desde el resumen (para órdenes nuevas)
  /// Las estadísticas se cargarán on-demand cuando se abra el historial
  Future<void> _crearOrdenDesdeResumen(
    OrdenResumen resumen,
    int idEstadoLocal,
  ) async {
    // Crear orden con datos mínimos desde resumen
    // Cliente, equipo y tipoServicio usan los IDs reales del servidor para evitar error de FK
    final ordenCompanion = OrdenesCompanion(
      idBackend: Value(resumen.id),
      numeroOrden: Value(resumen.numeroOrden),
      version: const Value(0),
      idEstado: Value(idEstadoLocal),
      idCliente: Value(resumen.idCliente ?? 1),
      idEquipo: Value(resumen.idEquipo ?? 1),
      idTipoServicio: Value(resumen.idTipoServicio ?? 1),
      prioridad: const Value('MEDIA'),
      urlPdf: Value(resumen.urlPdf),
      lastSyncedAt: Value(DateTime.now()),
      isDirty: const Value(false),
    );

    await _db.insertOrdenFromSync(ordenCompanion);
  }

  /// Carga estadísticas de una orden desde el backend (on-demand)
  /// Llamar cuando el usuario abre el historial de una orden
  Future<bool> cargarEstadisticasOrden(int idBackend) async {
    try {
      debugPrint(
        '🔄 [ON-DEMAND] Cargando estadísticas para orden $idBackend...',
      );

      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/sync/orden/$idBackend',
      );

      if (response.data == null) {
        debugPrint('❌ [ON-DEMAND] Respuesta vacía');
        return false;
      }

      final data = response.data!;

      // ✅ LOGGING DETALLADO para depuración
      debugPrint('📊 [ON-DEMAND] Datos recibidos para orden $idBackend:');
      debugPrint(
        '📊 [ON-DEMAND]   totalActividades: ${data['totalActividades']}',
      );
      debugPrint(
        '📊 [ON-DEMAND]   totalEvidencias: ${data['totalEvidencias']}',
      );
      debugPrint('📊 [ON-DEMAND]   totalFirmas: ${data['totalFirmas']}');
      debugPrint('📊 [ON-DEMAND]   urlPdf: ${data['urlPdf']}');

      // Obtener orden local
      final ordenLocal = await _db.getOrdenByBackendId(idBackend);
      if (ordenLocal == null) {
        debugPrint('❌ [ON-DEMAND] Orden no encontrada localmente');
        return false;
      }

      // ✅ EXTRAER URL DEL PDF - intentar múltiples fuentes
      String? urlPdf = data['urlPdf'] as String?;

      // Si urlPdf viene vacío, intentar obtenerlo del resumen del sync
      if (urlPdf == null || urlPdf.isEmpty) {
        debugPrint('⚠️ [ON-DEMAND] urlPdf vacío, buscando en otras fuentes...');
        // Intentar obtener del campo documento si existe
        final documento = data['documento'];
        if (documento != null && documento is Map) {
          urlPdf =
              documento['url'] as String? ??
              documento['ruta_archivo'] as String?;
          debugPrint('📊 [ON-DEMAND]   urlPdf desde documento: $urlPdf');
        }
      }

      // Actualizar con estadísticas completas
      await _db.updateOrdenEstadisticas(
        ordenLocal.idLocal,
        totalActividades: data['totalActividades'] as int? ?? 0,
        totalMediciones: data['totalMediciones'] as int? ?? 0,
        totalEvidencias: data['totalEvidencias'] as int? ?? 0,
        totalFirmas: data['totalFirmas'] as int? ?? 0,
        actividadesBuenas: data['actividadesBuenas'] as int? ?? 0,
        actividadesMalas: data['actividadesMalas'] as int? ?? 0,
        actividadesCorregidas: data['actividadesCorregidas'] as int? ?? 0,
        actividadesNA: data['actividadesNA'] as int? ?? 0,
        medicionesNormales: data['medicionesNormales'] as int? ?? 0,
        medicionesAdvertencia: data['medicionesAdvertencia'] as int? ?? 0,
        medicionesCriticas: data['medicionesCriticas'] as int? ?? 0,
        urlPdf: urlPdf,
        trabajoRealizado: data['trabajoRealizado'] as String?,
        observacionesTecnico: data['observacionesTecnico'] as String?,
        horaEntrada: data['horaEntrada'] as String?,
        horaSalida: data['horaSalida'] as String?,
      );

      debugPrint(
        '✅ [ON-DEMAND] Estadísticas cargadas para orden $idBackend (urlPdf: ${urlPdf != null ? "SÍ" : "NO"})',
      );
      return true;
    } catch (e) {
      debugPrint('❌ [ON-DEMAND] Error: $e');
      return false;
    }
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

final smartSyncServiceProvider = Provider<SmartSyncService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final db = ref.watch(databaseProvider);
  return SmartSyncService(apiClient, db);
});
