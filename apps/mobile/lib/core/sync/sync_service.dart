import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';

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
  Future<SyncResult> downloadData(int tecnicoId) async {
    try {
      // 1. Llamar al endpoint de sincronización
      // ✅ FIX: Timeout extendido para sync (puede haber muchas órdenes)
      final response = await _apiClient.dio.get(
        '/sync/download/$tecnicoId',
        options: Options(
          receiveTimeout: const Duration(minutes: 2),
          sendTimeout: const Duration(seconds: 30),
        ),
      );

      if (response.statusCode != 200) {
        return SyncResult(
          success: false,
          message: 'Error del servidor: ${response.statusCode}',
          error: response.data?.toString(),
        );
      }

      final data = response.data as Map<String, dynamic>;

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
  Future<int> _processParametros(List parametros) async {
    if (parametros.isEmpty) return 0;

    int count = 0;
    await _db.transaction(() async {
      for (final param in parametros) {
        final id = param['idParametroMedicion'] ?? param['id'];
        if (id == null) continue; // Skip si no tiene ID

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
            valorMinimoNormal: Value(
              (param['valorMinimoNormal'] as num?)?.toDouble(),
            ),
            valorMaximoNormal: Value(
              (param['valorMaximoNormal'] as num?)?.toDouble(),
            ),
            valorMinimoAdvertencia: Value(
              (param['valorMinimoAdvertencia'] as num?)?.toDouble(),
            ),
            valorMaximoAdvertencia: Value(
              (param['valorMaximoAdvertencia'] as num?)?.toDouble(),
            ),
            valorMinimoCritico: Value(
              (param['valorMinimoCritico'] as num?)?.toDouble(),
            ),
            valorMaximoCritico: Value(
              (param['valorMaximoCritico'] as num?)?.toDouble(),
            ),
            tipoEquipoAplica: Value(param['tipoEquipoAplica'] as String?),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
        count++;
      }
    });

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
              entry.value['nombreCliente'] as String? ?? 'Sin nombre',
            ),
            lastSyncedAt: Value(DateTime.now()),
          ),
        );
      }
      for (final entry in equiposData.entries) {
        await _db.upsertEquipo(
          EquiposCompanion(
            id: Value(entry.key),
            codigo: Value(entry.value['codigoEquipo'] as String? ?? ''),
            nombre: Value(entry.value['nombreEquipo'] as String? ?? ''),
            ubicacion: Value(entry.value['ubicacionEquipo'] as String?),
            idCliente: Value(entry.value['idCliente'] as int),
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
            if (serverVersion > existingOrden.version) {
              await _db.updateOrden(ordenCompanion, existingOrden.idLocal);
            }
          } else {
            await _db.insertOrdenFromSync(ordenCompanion);
          }
          ordenesCount++;
        } catch (e) {
          // Error silencioso - continuar con siguiente orden
        }
      }
    });

    return {
      'ordenes': ordenesCount,
      'clientes': clientesIds.length,
      'equipos': equiposIds.length,
    };
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
