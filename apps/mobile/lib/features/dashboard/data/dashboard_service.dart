import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Provider para el servicio de dashboard
final dashboardServiceProvider = Provider<DashboardService>((ref) {
  final db = ref.watch(databaseProvider);
  return DashboardService(db);
});

/// Servicio para calcular métricas del dashboard del técnico
///
/// Arquitectura de rendimiento:
/// - 100% datos locales (sin llamadas backend)
/// - Queries optimizados con índices
/// - Cache en memoria para evitar recálculos
class DashboardService {
  final AppDatabase _db;

  // Cache simple en memoria
  DashboardMetricsDto? _cachedMetrics;
  DateTime? _cacheTimestamp;
  static const _cacheDuration = Duration(minutes: 5);

  DashboardService(this._db);

  /// Obtiene todas las métricas del dashboard
  /// Usa cache si está disponible y no ha expirado
  Future<DashboardMetricsDto> getMetrics({bool forceRefresh = false}) async {
    // Verificar cache
    if (!forceRefresh && _cachedMetrics != null && _cacheTimestamp != null) {
      if (DateTime.now().difference(_cacheTimestamp!) < _cacheDuration) {
        return _cachedMetrics!;
      }
    }

    final now = DateTime.now();
    final inicioHoy = DateTime(now.year, now.month, now.day);
    final inicioSemana = inicioHoy.subtract(Duration(days: now.weekday - 1));
    final inicioSemanaAnterior = inicioSemana.subtract(const Duration(days: 7));
    final inicioMes = DateTime(now.year, now.month, 1);

    // Obtener IDs de estados
    final estadoCompletada = await _getEstadoId(['COMPLETADA', 'FINALIZADO']);
    // v3.3 FIX: "Pendientes" = todos los estados activos del técnico
    // Incluye: ASIGNADA, APROBADA (pre-ejecución), EN_PROCESO, PROGRAMADA, EN_ESPERA_REPUESTO
    final estadosActivos = await _getEstadoIds([
      'ASIGNADA',
      'APROBADA',
      'EN_PROCESO',
      'PROGRAMADA',
      'EN_ESPERA_REPUESTO',
    ]);

    // Ejecutar queries en paralelo para mejor rendimiento
    final results = await Future.wait([
      _contarOrdenesCompletadas(inicioHoy, estadoCompletada), // 0: hoy
      _contarOrdenesCompletadas(inicioSemana, estadoCompletada), // 1: semana
      _contarOrdenesCompletadas(inicioMes, estadoCompletada), // 2: mes
      _contarOrdenesPendientes(
        estadosActivos,
      ), // 3: pendientes (todos los estados activos)
      _contarOrdenesUrgentes(estadosActivos), // 4: urgentes (activos + URGENTE)
      _calcularTiempoPromedio(estadoCompletada), // 5: tiempo promedio
      _calcularPorcentajeChecklistOK(), // 6: % checklist OK
      _contarTotalOrdenes(estadoCompletada), // 7: total completadas
      _getDistribucionPorTipoServicio(estadoCompletada), // 8: por tipo
      _contarOrdenesEnRango(
        inicioSemanaAnterior,
        inicioSemana,
        estadoCompletada,
      ), // 9: semana anterior
      _calcularRacha(estadoCompletada), // 10: racha
    ]);

    final metrics = DashboardMetricsDto(
      ordenesHoy: results[0] as int,
      ordenesSemana: results[1] as int,
      ordenesMes: results[2] as int,
      ordenesSemanaAnterior: results[9] as int,
      ordenesPendientes: results[3] as int,
      ordenesUrgentes: results[4] as int,
      tiempoPromedioMinutos: results[5] as int,
      porcentajeChecklistOK: results[6] as double,
      totalOrdenesCompletadas: results[7] as int,
      distribucionPorTipo: results[8] as List<TipoServicioMetricDto>,
      rachaActual: results[10] as int,
      ultimaActualizacion: now,
    );

    // Actualizar cache
    _cachedMetrics = metrics;
    _cacheTimestamp = now;

    return metrics;
  }

  /// Obtiene ID de estado por códigos (toma el primero si hay múltiples)
  Future<int?> _getEstadoId(List<String> codigos) async {
    final estados = await (_db.select(
      _db.estadosOrden,
    )..where((e) => e.codigo.isIn(codigos))).get();
    return estados.isNotEmpty ? estados.first.id : null;
  }

  /// v3: Obtiene TODOS los IDs de estados que coincidan con los códigos
  Future<List<int>> _getEstadoIds(List<String> codigos) async {
    final estados = await (_db.select(
      _db.estadosOrden,
    )..where((e) => e.codigo.isIn(codigos))).get();
    return estados.map((e) => e.id).toList();
  }

  /// Cuenta órdenes completadas desde una fecha
  Future<int> _contarOrdenesCompletadas(DateTime desde, int? estadoId) async {
    if (estadoId == null) return 0;

    final count =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.equals(estadoId))
              ..where((o) => o.fechaFin.isBiggerOrEqualValue(desde)))
            .get();
    return count.length;
  }

  /// v2: Cuenta órdenes en un rango de fechas (para comparativa semana anterior)
  Future<int> _contarOrdenesEnRango(
    DateTime desde,
    DateTime hasta,
    int? estadoId,
  ) async {
    if (estadoId == null) return 0;

    final count =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.equals(estadoId))
              ..where((o) => o.fechaFin.isBiggerOrEqualValue(desde))
              ..where((o) => o.fechaFin.isSmallerThanValue(hasta)))
            .get();
    return count.length;
  }

  /// v3: Cuenta órdenes pendientes (múltiples estados)
  Future<int> _contarOrdenesPendientes(List<int> estadoIds) async {
    if (estadoIds.isEmpty) return 0;

    final count = await (_db.select(
      _db.ordenes,
    )..where((o) => o.idEstado.isIn(estadoIds))).get();
    return count.length;
  }

  /// v3.2: Cuenta órdenes urgentes ACTIVAS (excluye completadas/cerradas/canceladas)
  Future<int> _contarOrdenesUrgentes(List<int> estadoIds) async {
    // Obtener IDs de estados finalizados para excluirlos
    final estadosFinalizados =
        await (_db.select(_db.estadosOrden)..where(
              (e) => e.codigo.isIn(['COMPLETADA', 'CERRADA', 'CANCELADA']),
            ))
            .get();
    final idsFinalizados = estadosFinalizados.map((e) => e.id).toList();

    // Contar URGENTES que NO estén finalizadas
    final count =
        await (_db.select(_db.ordenes)
              ..where((o) => o.prioridad.equals('URGENTE'))
              ..where((o) => o.idEstado.isNotIn(idsFinalizados)))
            .get();
    return count.length;
  }

  /// Calcula tiempo promedio de servicio en minutos
  Future<int> _calcularTiempoPromedio(int? estadoId) async {
    if (estadoId == null) return 0;

    final ordenes =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.equals(estadoId))
              ..where((o) => o.fechaInicio.isNotNull())
              ..where((o) => o.fechaFin.isNotNull()))
            .get();

    if (ordenes.isEmpty) return 0;

    int totalMinutos = 0;
    int ordenesConDuracion = 0;

    for (final orden in ordenes) {
      if (orden.fechaInicio != null && orden.fechaFin != null) {
        final duracion = orden.fechaFin!.difference(orden.fechaInicio!);
        totalMinutos += duracion.inMinutes;
        ordenesConDuracion++;
      }
    }

    return ordenesConDuracion > 0 ? totalMinutos ~/ ordenesConDuracion : 0;
  }

  /// Calcula porcentaje de checklist con estado "B" (Bueno)
  Future<double> _calcularPorcentajeChecklistOK() async {
    final actividades = await _db.select(_db.actividadesEjecutadas).get();

    if (actividades.isEmpty) return 100.0;

    final completadas = actividades.where((a) => a.simbologia != null).length;
    final buenas = actividades.where((a) => a.simbologia == 'B').length;

    return completadas > 0 ? (buenas / completadas) * 100 : 100.0;
  }

  /// Cuenta total de órdenes completadas
  Future<int> _contarTotalOrdenes(int? estadoId) async {
    if (estadoId == null) return 0;

    final count = await (_db.select(
      _db.ordenes,
    )..where((o) => o.idEstado.equals(estadoId))).get();
    return count.length;
  }

  /// Obtiene distribución de órdenes completadas por tipo de servicio
  Future<List<TipoServicioMetricDto>> _getDistribucionPorTipoServicio(
    int? estadoId,
  ) async {
    if (estadoId == null) return [];

    final query = _db.select(_db.ordenes).join([
      innerJoin(
        _db.tiposServicio,
        _db.tiposServicio.id.equalsExp(_db.ordenes.idTipoServicio),
      ),
    ]);
    query.where(_db.ordenes.idEstado.equals(estadoId));

    final rows = await query.get();

    // Agrupar por tipo de servicio
    final Map<String, int> conteo = {};
    for (final row in rows) {
      final tipo = row.readTable(_db.tiposServicio);
      conteo[tipo.codigo] = (conteo[tipo.codigo] ?? 0) + 1;
    }

    // Convertir a lista ordenada
    final lista =
        conteo.entries
            .map((e) => TipoServicioMetricDto(codigo: e.key, cantidad: e.value))
            .toList()
          ..sort((a, b) => b.cantidad.compareTo(a.cantidad));

    return lista.take(5).toList(); // Top 5
  }

  /// v2: Calcula racha de días consecutivos con órdenes completadas
  Future<int> _calcularRacha(int? estadoId) async {
    if (estadoId == null) return 0;

    final ordenes =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.equals(estadoId))
              ..where((o) => o.fechaFin.isNotNull())
              ..orderBy([(o) => OrderingTerm.desc(o.fechaFin)]))
            .get();

    if (ordenes.isEmpty) return 0;

    int racha = 0;
    DateTime? fechaAnterior;
    final hoy = DateTime.now();
    final inicioHoy = DateTime(hoy.year, hoy.month, hoy.day);

    for (final orden in ordenes) {
      if (orden.fechaFin == null) continue;

      final fechaOrden = DateTime(
        orden.fechaFin!.year,
        orden.fechaFin!.month,
        orden.fechaFin!.day,
      );

      if (fechaAnterior == null) {
        // Primera orden
        if (fechaOrden.isAtSameMomentAs(inicioHoy) ||
            fechaOrden.isAtSameMomentAs(
              inicioHoy.subtract(const Duration(days: 1)),
            )) {
          racha = 1;
          fechaAnterior = fechaOrden;
        } else {
          break; // No hay racha activa
        }
      } else {
        final diferencia = fechaAnterior.difference(fechaOrden).inDays;
        if (diferencia == 1) {
          racha++;
          fechaAnterior = fechaOrden;
        } else if (diferencia == 0) {
          // Mismo día, continuar
          continue;
        } else {
          break; // Racha rota
        }
      }
    }

    return racha;
  }

  /// Invalida el cache manualmente
  void invalidateCache() {
    _cachedMetrics = null;
    _cacheTimestamp = null;
  }
}

// ============================================================================
// DTOs
// ============================================================================

/// DTO con todas las métricas del dashboard
class DashboardMetricsDto {
  final int ordenesHoy;
  final int ordenesSemana;
  final int ordenesMes;
  final int ordenesSemanaAnterior; // v2: Comparativa
  final int ordenesPendientes;
  final int ordenesUrgentes;
  final int tiempoPromedioMinutos;
  final double porcentajeChecklistOK;
  final int totalOrdenesCompletadas;
  final List<TipoServicioMetricDto> distribucionPorTipo;
  final int rachaActual; // v2: Días consecutivos con órdenes completadas
  final DateTime ultimaActualizacion;

  DashboardMetricsDto({
    required this.ordenesHoy,
    required this.ordenesSemana,
    required this.ordenesMes,
    required this.ordenesSemanaAnterior,
    required this.ordenesPendientes,
    required this.ordenesUrgentes,
    required this.tiempoPromedioMinutos,
    required this.porcentajeChecklistOK,
    required this.totalOrdenesCompletadas,
    required this.distribucionPorTipo,
    required this.rachaActual,
    required this.ultimaActualizacion,
  });

  /// Formatea tiempo promedio como string legible
  String get tiempoPromedioFormateado {
    if (tiempoPromedioMinutos < 60) {
      return '$tiempoPromedioMinutos min';
    }
    final horas = tiempoPromedioMinutos ~/ 60;
    final minutos = tiempoPromedioMinutos % 60;
    return '${horas}h ${minutos}m';
  }

  /// Indica si hay órdenes urgentes pendientes
  bool get tieneUrgentes => ordenesUrgentes > 0;

  /// v2: Diferencia vs semana anterior (positivo = mejora)
  int get diferenciaSemana => ordenesSemana - ordenesSemanaAnterior;

  /// v2: Tendencia vs semana anterior
  String get tendenciaSemana {
    if (diferenciaSemana > 0) return '↑ +$diferenciaSemana';
    if (diferenciaSemana < 0) return '↓ $diferenciaSemana';
    return '→ igual';
  }

  /// v2: Indica si mejoró vs semana anterior
  bool get mejoroVsSemanaAnterior => diferenciaSemana > 0;

  /// v2: Indica si tiene racha activa
  bool get tieneRacha => rachaActual > 1;
}

/// DTO para métricas por tipo de servicio
class TipoServicioMetricDto {
  final String codigo;
  final int cantidad;

  TipoServicioMetricDto({required this.codigo, required this.cantidad});
}
