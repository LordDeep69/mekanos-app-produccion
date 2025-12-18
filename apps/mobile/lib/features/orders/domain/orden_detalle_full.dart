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

  /// ID del backend (para buscar equipos multi-equipo)
  int? get idBackend => orden.idBackend;

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
  int get cantidadActividades {
    if (actividadesCatalogo.isNotEmpty) {
      return actividadesCatalogo.length;
    }
    // Para órdenes históricas, usar valor sincronizado
    return orden.totalActividades;
  }
  
  /// Cantidad de mediciones (actividades tipo MEDICION)
  int get cantidadMediciones {
    return actividadesCatalogo.where((a) => a.tipoActividad == 'MEDICION').length;
  }

  /// ✅ FIX: Estadísticas sincronizadas para órdenes históricas
  /// Usa el desglose B+M+C+NA como fallback si totalActividades es 0
  int get totalActividadesSincronizadas {
    if (orden.totalActividades > 0) return orden.totalActividades;
    // Fallback: sumar el desglose de actividades
    final desglose =
        orden.actividadesBuenas +
        orden.actividadesMalas +
        orden.actividadesCorregidas +
        orden.actividadesNA;
    return desglose > 0 ? desglose : actividadesCatalogo.length;
  }

  int get totalMedicionesSincronizadas {
    if (orden.totalMediciones > 0) return orden.totalMediciones;
    // Fallback 1: sumar el desglose de mediciones
    final desglose =
        orden.medicionesNormales +
        orden.medicionesAdvertencia +
        orden.medicionesCriticas;
    if (desglose > 0) return desglose;
    // Fallback 2: contar actividades tipo MEDICION del catálogo
    return actividadesCatalogo
        .where((a) => a.tipoActividad == 'MEDICION')
        .length;
  }

  int get totalEvidenciasSincronizadas => orden.totalEvidencias;
  int get totalFirmasSincronizadas => orden.totalFirmas;

  /// ✅ FIX: Desglose de actividades sincronizadas
  int get actividadesBuenasSincronizadas => orden.actividadesBuenas;
  int get actividadesMalasSincronizadas => orden.actividadesMalas;
  int get actividadesCorregidasSincronizadas => orden.actividadesCorregidas;
  int get actividadesNASincronizadas => orden.actividadesNA;

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
  /// ✅ FIX: Verificar por código de estado directamente, no solo por flag esEstadoFinal
  /// ⚠️ IMPORTANTE: POR_SUBIR NO es estado final - permite entrar a vista de ejecución
  bool get estaFinalizada {
    // POR_SUBIR es estado LOCAL que permite al técnico subir manualmente
    // NO debe considerarse como finalizada para permitir acceso a la vista
    if (estadoOrden.codigo.toUpperCase() == 'POR_SUBIR') {
      return false;
    }
    
    final estadosFinalizados = [
      'COMPLETADA',
      'CERRADA',
      'CANCELADA',
      'FINALIZADA',
    ];
    return estadoOrden.esEstadoFinal ||
        estadosFinalizados.contains(estadoOrden.codigo.toUpperCase());
  }

  /// ¿La orden está pendiente de subir al servidor?
  /// Estado LOCAL: completada offline pero no sincronizada
  bool get estaPorSubir => estadoOrden.codigo.toUpperCase() == 'POR_SUBIR';

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
