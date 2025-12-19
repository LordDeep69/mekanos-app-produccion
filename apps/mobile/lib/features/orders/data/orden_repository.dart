// Repositorio de Órdenes - Patrón Repository
//
// FILOSOFÍA: Este repositorio lee EXCLUSIVAMENTE de la base de datos local (drift).
// La UI NO debe saber que existe una API. Solo conoce este repositorio.
// El SyncService es el único puente entre API y BD local.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';
import '../domain/orden_detalle_full.dart';

/// Provider para el repositorio de órdenes
final ordenRepositoryProvider = Provider<OrdenRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return OrdenRepository(db);
});

/// Repositorio que abstrae el acceso a órdenes desde la BD local
class OrdenRepository {
  final AppDatabase _db;

  OrdenRepository(this._db);

  /// Observar todas las órdenes pendientes (no finalizadas)
  /// Retorna un Stream que emite cada vez que cambian los datos
  Stream<List<Ordene>> watchOrdenesPendientes() {
    return _db.watchOrdenesPendientes();
  }

  /// Observar todas las órdenes (sin filtro)
  Stream<List<Ordene>> watchAllOrdenes() {
    return _db.watchAllOrdenes();
  }

  /// Obtener una orden específica por ID local
  Future<Ordene?> getOrdenById(int idLocal) async {
    return _db.getOrdenById(idLocal);
  }

  /// Obtener órdenes por estado
  Stream<List<Ordene>> watchOrdenesPorEstado(int idEstado) {
    return _db.watchOrdenesPorEstado(idEstado);
  }

  /// Contar órdenes pendientes de sincronizar (dirty)
  Future<int> countPendingSync() {
    return _db.countPendingSync();
  }

  /// Obtener estadísticas de órdenes por estado
  Future<Map<String, int>> getEstadisticasOrdenes() async {
    final ordenes = await _db.getAllOrdenes();
    final estados = await _db.getAllEstadosOrden();

    final Map<String, int> stats = {};
    for (final estado in estados) {
      final count = ordenes.where((o) => o.idEstado == estado.id).length;
      stats[estado.nombre] = count;
    }
    return stats;
  }

  /// Obtener detalles de una orden (cliente, equipo, estado, tipo)
  Future<OrdenConDetalles> getOrdenConDetalles(Ordene orden) async {
    final cliente = await _db.getClienteById(orden.idCliente);
    final equipo = await _db.getEquipoById(orden.idEquipo);
    final estado = await _db.getEstadoOrdenById(orden.idEstado);
    final tipoServicio = await _db.getTipoServicioById(orden.idTipoServicio);

    return OrdenConDetalles(
      orden: orden,
      cliente: cliente,
      equipo: equipo,
      estado: estado,
      tipoServicio: tipoServicio,
    );
  }

  // ============================================================================
  // RUTA 5: DETALLE COMPLETO CON ACTIVIDADES
  // ============================================================================

  /// Obtener detalle COMPLETO de una orden incluyendo actividades del catálogo
  ///
  /// Este método:
  /// 1. Obtiene la orden por ID local
  /// 2. Carga Cliente, Equipo, TipoServicio, Estado en una transacción eficiente
  /// 3. Consulta las ActividadesCatalogo filtradas por idTipoServicio
  ///
  /// CRÍTICO: Las actividades son las del CATÁLOGO (lo que se debe hacer),
  /// no las ejecutadas (lo que ya se hizo). Las ejecutadas se cargarán aparte.
  ///
  /// PRIORIDAD:
  /// 1. Si existe plan de actividades asignado por admin → usar plan
  /// 2. Si no → usar catálogo por tipo de servicio (comportamiento original)
  Future<OrdenDetalleFull?> getDetalleCompleto(int idOrdenLocal) async {
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null) return null;

    final cliente = await _db.getClienteById(orden.idCliente);
    if (cliente == null) return null;

    final equipo = await _db.getEquipoById(orden.idEquipo);
    if (equipo == null) return null;

    final tipoServicio = await _db.getTipoServicioById(orden.idTipoServicio);
    if (tipoServicio == null) return null;

    final estado = await _db.getEstadoOrdenById(orden.idEstado);
    if (estado == null) return null;

    // ✅ PRIORIDAD: Verificar si existe plan de actividades para esta orden
    List<ActividadesCatalogoData> actividades = [];

    final planActividades = await _db.getPlanActividadesByOrden(idOrdenLocal);
    if (planActividades.isNotEmpty) {
      // ✅ USAR PLAN DE ACTIVIDADES ASIGNADO POR ADMIN
      for (final planItem in planActividades) {
        final actCatalogo = await (_db.select(_db.actividadesCatalogo)
              ..where((a) => a.id.equals(planItem.idActividadCatalogo)))
            .getSingleOrNull();
        if (actCatalogo != null) {
          actividades.add(actCatalogo);
        }
      }
    }

    // Si no hay plan o el plan está vacío, usar catálogo por tipo de servicio
    if (actividades.isEmpty) {
      actividades = await _db.getActividadesByTipoServicio(
        orden.idTipoServicio,
      );
    }

    return OrdenDetalleFull(
      orden: orden,
      cliente: cliente,
      equipo: equipo,
      tipoServicio: tipoServicio,
      estadoOrden: estado,
      actividadesCatalogo: actividades,
    );
  }
}

/// Clase que representa una orden con todos sus detalles relacionados
class OrdenConDetalles {
  final Ordene orden;
  final Cliente? cliente;
  final Equipo? equipo;
  final EstadosOrdenData? estado;
  final TiposServicioData? tipoServicio;

  OrdenConDetalles({
    required this.orden,
    this.cliente,
    this.equipo,
    this.estado,
    this.tipoServicio,
  });

  /// Nombre del cliente o valor por defecto
  String get nombreCliente => cliente?.nombre ?? 'Sin cliente';

  /// Nombre del equipo o valor por defecto
  String get nombreEquipo => equipo?.nombre ?? 'Sin equipo';

  /// Código del equipo
  String get codigoEquipo => equipo?.codigo ?? '';

  /// Nombre del estado o valor por defecto
  String get nombreEstado => estado?.nombre ?? 'Sin estado';

  /// Código del estado
  String get codigoEstado => estado?.codigo ?? '';

  /// Nombre del tipo de servicio
  String get nombreTipoServicio => tipoServicio?.nombre ?? 'Sin tipo';

  /// Color del estado para UI
  String get colorEstado {
    switch (estado?.codigo) {
      case 'PENDIENTE':
        return 'orange';
      case 'PROGRAMADA':
        return 'blue';
      case 'EN_PROCESO':
        return 'yellow';
      case 'COMPLETADA':
        return 'green';
      case 'CERRADA':
        return 'grey';
      default:
        return 'grey';
    }
  }

  /// Prioridad formateada
  String get prioridadFormateada => orden.prioridad;

  /// Fecha programada formateada
  String get fechaProgramadaFormateada {
    if (orden.fechaProgramada == null) return 'Sin fecha';
    final fecha = orden.fechaProgramada!;
    return '${fecha.day.toString().padLeft(2, '0')}/'
        '${fecha.month.toString().padLeft(2, '0')}/'
        '${fecha.year}';
  }
}
