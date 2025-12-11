// OrdenDetalleFull - Clase compuesta para RUTA 5
//
// Esta NO es una tabla drift. Es un objeto de dominio que agrupa:
// - Orden base
// - Cliente asociado
// - Equipo asociado
// - Tipo de Servicio
// - Actividades del catálogo para ese tipo de servicio
//
// PROPÓSITO: Proporcionar todos los datos necesarios para la pantalla de detalle
// en una sola consulta eficiente, sin necesidad de múltiples llamadas.

import '../../../core/database/app_database.dart';

/// Modelo de dominio que agrupa una orden con todos sus datos relacionados
class OrdenDetalleFull {
  /// La orden base
  final Ordene orden;

  /// El cliente asociado a la orden
  final Cliente cliente;

  /// El equipo asociado a la orden
  final Equipo equipo;

  /// El tipo de servicio de la orden
  final TiposServicioData tipoServicio;

  /// El estado actual de la orden
  final EstadosOrdenData estadoOrden;

  /// Lista de actividades del catálogo para este tipo de servicio
  /// Ordenadas por `ordenEjecucion` para mostrar el checklist en secuencia
  final List<ActividadesCatalogoData> actividadesCatalogo;

  const OrdenDetalleFull({
    required this.orden,
    required this.cliente,
    required this.equipo,
    required this.tipoServicio,
    required this.estadoOrden,
    required this.actividadesCatalogo,
  });

  // ============================================================================
  // GETTERS DE CONVENIENCIA
  // ============================================================================

  /// Número de orden formateado
  String get numeroOrden => orden.numeroOrden;

  /// Nombre del cliente
  String get nombreCliente => cliente.nombre;

  /// Código y nombre del equipo
  String get equipoDisplay => '${equipo.codigo} - ${equipo.nombre}';

  /// Ubicación del equipo (si existe)
  String? get ubicacionEquipo => equipo.ubicacion;

  /// Nombre del tipo de servicio
  String get nombreTipoServicio => tipoServicio.nombre;

  /// Código del estado actual
  String get codigoEstado => estadoOrden.codigo;

  /// Nombre del estado actual
  String get nombreEstado => estadoOrden.nombre;

  /// Cantidad de actividades a realizar
  /// ✅ FIX: Usa valor sincronizado si local está vacío (órdenes históricas)
  int get cantidadActividades {
    if (actividadesCatalogo.isNotEmpty) {
      return actividadesCatalogo.length;
    }
    // Para órdenes históricas, usar valor sincronizado
    return orden.totalActividades;
  }

  /// ✅ FIX: Estadísticas sincronizadas para órdenes históricas
  int get totalActividadesSincronizadas => orden.totalActividades;
  int get totalMedicionesSincronizadas => orden.totalMediciones;
  int get totalEvidenciasSincronizadas => orden.totalEvidencias;
  int get totalFirmasSincronizadas => orden.totalFirmas;

  /// ✅ FIX: Hora de inicio y fin sincronizadas
  DateTime? get fechaInicioReal => orden.fechaInicio;
  DateTime? get fechaFinReal => orden.fechaFin;

  /// Duración del servicio en minutos (calculada si hay fechas)
  int? get duracionMinutos {
    if (fechaInicioReal != null && fechaFinReal != null) {
      return fechaFinReal!.difference(fechaInicioReal!).inMinutes;
    }
    return null;
  }

  /// URL del PDF generado (si está completada)
  String? get urlPdf => orden.urlPdf;

  /// Prioridad de la orden
  String get prioridad => orden.prioridad;

  /// Fecha programada formateada
  String get fechaProgramadaDisplay {
    if (orden.fechaProgramada == null) return 'Sin fecha programada';
    final f = orden.fechaProgramada!;
    return '${f.day.toString().padLeft(2, '0')}/'
        '${f.month.toString().padLeft(2, '0')}/'
        '${f.year}';
  }

  /// Descripción inicial (si existe)
  String? get descripcionInicial => orden.descripcionInicial;

  /// ¿La orden está en un estado que permite comenzar ejecución?
  bool get puedeIniciarEjecucion {
    // Solo puede iniciar si está en PROGRAMADA o ASIGNADA
    final estadosPermitidos = ['PROGRAMADA', 'ASIGNADA', 'PENDIENTE'];
    return estadosPermitidos.contains(estadoOrden.codigo);
  }

  /// ¿La orden está en proceso?
  bool get estaEnProceso => estadoOrden.codigo == 'EN_PROCESO';

  /// ¿La orden está completada o cerrada?
  bool get estaFinalizada => estadoOrden.esEstadoFinal;

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /// Actividades agrupadas por sistema
  Map<String, List<ActividadesCatalogoData>> get actividadesPorSistema {
    final map = <String, List<ActividadesCatalogoData>>{};
    for (final act in actividadesCatalogo) {
      final sistema = act.sistema ?? 'GENERAL';
      map.putIfAbsent(sistema, () => []).add(act);
    }
    return map;
  }

  /// Actividades filtradas por tipo
  List<ActividadesCatalogoData> actividadesDetipoActividad(String tipo) {
    return actividadesCatalogo.where((a) => a.tipoActividad == tipo).toList();
  }

  /// Cantidad de actividades de medición
  int get cantidadMediciones =>
      actividadesCatalogo.where((a) => a.tipoActividad == 'MEDICION').length;

  @override
  String toString() {
    return 'OrdenDetalleFull('
        'orden: ${orden.numeroOrden}, '
        'cliente: ${cliente.nombre}, '
        'equipo: ${equipo.codigo}, '
        'tipoServicio: ${tipoServicio.codigo}, '
        'estado: ${estadoOrden.codigo}, '
        'actividades: ${actividadesCatalogo.length}'
        ')';
  }
}
