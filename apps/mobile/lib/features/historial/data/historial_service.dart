import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Provider para el servicio de historial
final historialServiceProvider = Provider<HistorialService>((ref) {
  final db = ref.watch(databaseProvider);
  final apiClient = ref.watch(apiClientProvider);
  return HistorialService(db, apiClient);
});

/// Servicio para gestionar el historial de órdenes finalizadas
///
/// Proporciona:
/// - Consulta de órdenes completadas/finalizadas
/// - Filtros por fecha, cliente, número de orden
/// - Estadísticas de resumen
class HistorialService {
  final AppDatabase _db;
  final ApiClient _apiClient;

  HistorialService(this._db, this._apiClient);

  /// Obtiene todas las órdenes finalizadas
  ///
  /// Filtros opcionales:
  /// - [busqueda]: Texto para buscar en número de orden o cliente
  /// - [fechaDesde]: Fecha inicial del rango
  /// - [fechaHasta]: Fecha final del rango
  /// - [idCliente]: Filtrar por cliente específico
  Future<List<OrdenHistorialDto>> getOrdenesFinalizadas({
    String? busqueda,
    DateTime? fechaDesde,
    DateTime? fechaHasta,
    DateTime? fechaEspecifica, // RUTA 12: Filtro de fecha específica
    int? idCliente,
    int? idTipoServicio, // RUTA 12: Filtro por tipo de servicio
    int limite = 50,
  }) async {
    // Obtener el ID del estado COMPLETADA o FINALIZADO
    final estadoFinalizado =
        await (_db.select(_db.estadosOrden)
              ..where((e) => e.codigo.isIn(['COMPLETADA', 'FINALIZADO'])))
            .getSingleOrNull();

    if (estadoFinalizado == null) {
      return [];
    }

    // Query base de órdenes finalizadas
    final query = _db.select(_db.ordenes).join([
      innerJoin(_db.clientes, _db.clientes.id.equalsExp(_db.ordenes.idCliente)),
      innerJoin(_db.equipos, _db.equipos.id.equalsExp(_db.ordenes.idEquipo)),
      innerJoin(
        _db.tiposServicio,
        _db.tiposServicio.id.equalsExp(_db.ordenes.idTipoServicio),
      ),
    ]);

    // Filtrar por estado finalizado
    query.where(_db.ordenes.idEstado.equals(estadoFinalizado.id));

    // Filtrar por búsqueda (número de orden o nombre de cliente)
    if (busqueda != null && busqueda.isNotEmpty) {
      final busquedaLower = '%${busqueda.toLowerCase()}%';
      query.where(
        _db.ordenes.numeroOrden.lower().like(busquedaLower) |
            _db.clientes.nombre.lower().like(busquedaLower),
      );
    }

    // Filtrar por rango de fechas
    if (fechaDesde != null) {
      query.where(_db.ordenes.fechaFin.isBiggerOrEqualValue(fechaDesde));
    }
    if (fechaHasta != null) {
      // Agregar 1 día para incluir todo el día final
      final fechaHastaFin = fechaHasta.add(const Duration(days: 1));
      query.where(_db.ordenes.fechaFin.isSmallerThanValue(fechaHastaFin));
    }

    // Filtrar por cliente específico
    if (idCliente != null) {
      query.where(_db.ordenes.idCliente.equals(idCliente));
    }

    // RUTA 12: Filtrar por tipo de servicio
    if (idTipoServicio != null) {
      query.where(_db.ordenes.idTipoServicio.equals(idTipoServicio));
    }

    // RUTA 12: Filtrar por fecha específica (un día concreto)
    if (fechaEspecifica != null) {
      final inicioDia = DateTime(
        fechaEspecifica.year,
        fechaEspecifica.month,
        fechaEspecifica.day,
      );
      final finDia = inicioDia.add(const Duration(days: 1));
      query.where(_db.ordenes.fechaFin.isBiggerOrEqualValue(inicioDia));
      query.where(_db.ordenes.fechaFin.isSmallerThanValue(finDia));
    }

    // Ordenar por fecha de finalización (más recientes primero)
    query.orderBy([OrderingTerm.desc(_db.ordenes.fechaFin)]);

    // Limitar resultados
    query.limit(limite);

    // Ejecutar query y mapear resultados
    final rows = await query.get();

    return rows.map((row) {
      final orden = row.readTable(_db.ordenes);
      final cliente = row.readTable(_db.clientes);
      final equipo = row.readTable(_db.equipos);
      final tipoServicio = row.readTable(_db.tiposServicio);

      return OrdenHistorialDto(
        idLocal: orden.idLocal,
        idBackend: orden.idBackend,
        numeroOrden: orden.numeroOrden,
        nombreCliente: cliente.nombre,
        direccionCliente: cliente.direccion,
        nombreEquipo: equipo.nombre,
        marcaEquipo: equipo.marca,
        tipoServicio: tipoServicio.nombre,
        codigoTipoServicio: tipoServicio.codigo,
        fechaInicio: orden.fechaInicio,
        fechaFin: orden.fechaFin,
        trabajoRealizado: orden.trabajoRealizado,
        observaciones: orden.observacionesTecnico,
        prioridad: orden.prioridad,
        urlPdf: orden.urlPdf,
      );
    }).toList();
  }

  /// Obtiene el detalle completo de una orden finalizada
  Future<OrdenHistorialDetalleDto?> getDetalleOrden(int idOrdenLocal) async {
    // Obtener orden con relaciones
    final ordenQuery = _db.select(_db.ordenes).join([
      innerJoin(_db.clientes, _db.clientes.id.equalsExp(_db.ordenes.idCliente)),
      innerJoin(_db.equipos, _db.equipos.id.equalsExp(_db.ordenes.idEquipo)),
      innerJoin(
        _db.tiposServicio,
        _db.tiposServicio.id.equalsExp(_db.ordenes.idTipoServicio),
      ),
      innerJoin(
        _db.estadosOrden,
        _db.estadosOrden.id.equalsExp(_db.ordenes.idEstado),
      ),
    ]);
    ordenQuery.where(_db.ordenes.idLocal.equals(idOrdenLocal));

    final row = await ordenQuery.getSingleOrNull();
    if (row == null) return null;

    final orden = row.readTable(_db.ordenes);
    final cliente = row.readTable(_db.clientes);
    final equipo = row.readTable(_db.equipos);
    final tipoServicio = row.readTable(_db.tiposServicio);
    final estado = row.readTable(_db.estadosOrden);

    // =========================================================================
    // ESTADÍSTICAS: Estrategia híbrida (local vs sincronizado)
    // =========================================================================
    // Si hay datos locales (dispositivo que ejecutó) → usar datos detallados
    // Si NO hay datos locales (sincronizado) → usar totales de la orden
    // =========================================================================

    // Obtener estadísticas de actividades LOCALES
    final actividades = await (_db.select(
      _db.actividadesEjecutadas,
    )..where((a) => a.idOrden.equals(idOrdenLocal))).get();

    int buenos = 0, malos = 0, corregidos = 0, noAplica = 0;
    for (final act in actividades) {
      switch (act.simbologia) {
        case 'B':
          buenos++;
          break;
        case 'M':
          malos++;
          break;
        case 'C':
          corregidos++;
          break;
        case 'NA':
          noAplica++;
          break;
      }
    }

    // Obtener mediciones LOCALES
    final mediciones = await (_db.select(
      _db.mediciones,
    )..where((m) => m.idOrden.equals(idOrdenLocal))).get();

    int medicionesNormales = 0,
        medicionesAdvertencia = 0,
        medicionesCriticas = 0;
    for (final med in mediciones) {
      switch (med.estadoValor) {
        case 'NORMAL':
          medicionesNormales++;
          break;
        case 'ADVERTENCIA':
          medicionesAdvertencia++;
          break;
        case 'CRITICO':
          medicionesCriticas++;
          break;
      }
    }

    // Contar evidencias LOCALES
    final evidenciasLocales =
        await (_db.select(_db.evidencias)
              ..where((e) => e.idOrden.equals(idOrdenLocal)))
            .get()
            .then((list) => list.length);

    // Contar firmas LOCALES
    final firmasLocales =
        await (_db.select(_db.firmas)
              ..where((f) => f.idOrden.equals(idOrdenLocal)))
            .get()
            .then((list) => list.length);

    // ✅ FIX: Obtener catálogo de actividades para fallback
    final actividadesCatalogo = await _db.getActividadesByTipoServicio(
      orden.idTipoServicio,
    );
    final totalCatalogo = actividadesCatalogo.length;
    final medicionesCatalogo = actividadesCatalogo
        .where((a) => a.tipoActividad == 'MEDICION')
        .length;

    // ✅ FIX: Usar datos sincronizados si no hay datos locales (con fallback a catálogo)
    int totalActividadesFinal;
    if (actividades.isNotEmpty) {
      totalActividadesFinal = actividades.length;
    } else if (orden.totalActividades > 0) {
      totalActividadesFinal = orden.totalActividades;
    } else {
      // Fallback: desglose sincronizado o catálogo
      final desglose =
          orden.actividadesBuenas +
          orden.actividadesMalas +
          orden.actividadesCorregidas +
          orden.actividadesNA;
      totalActividadesFinal = desglose > 0 ? desglose : totalCatalogo;
    }

    int totalMedicionesFinal;
    if (mediciones.isNotEmpty) {
      totalMedicionesFinal = mediciones.length;
    } else if (orden.totalMediciones > 0) {
      totalMedicionesFinal = orden.totalMediciones;
    } else {
      // Fallback: desglose sincronizado o catálogo
      final desglose =
          orden.medicionesNormales +
          orden.medicionesAdvertencia +
          orden.medicionesCriticas;
      totalMedicionesFinal = desglose > 0 ? desglose : medicionesCatalogo;
    }

    final evidenciasCount = evidenciasLocales > 0
        ? evidenciasLocales
        : orden.totalEvidencias;
    final firmasCount = firmasLocales > 0 ? firmasLocales : orden.totalFirmas;

    // ✅ FIX: Usar desglose sincronizado si conteo local es 0
    // El conteo local puede ser 0 aunque haya actividades (simbologia null)
    final conteoLocalTotal = buenos + malos + corregidos + noAplica;
    final conteoSincronizado =
        orden.actividadesBuenas +
        orden.actividadesMalas +
        orden.actividadesCorregidas +
        orden.actividadesNA;

    int buenosFinal, malosFinal, corregidosFinal, noAplicaFinal;
    if (conteoLocalTotal > 0) {
      // Usar datos locales si tienen valores válidos
      buenosFinal = buenos;
      malosFinal = malos;
      corregidosFinal = corregidos;
      noAplicaFinal = noAplica;
    } else if (conteoSincronizado > 0) {
      // Usar desglose sincronizado si local es 0
      buenosFinal = orden.actividadesBuenas;
      malosFinal = orden.actividadesMalas;
      corregidosFinal = orden.actividadesCorregidas;
      noAplicaFinal = orden.actividadesNA;
    } else {
      // Fallback final: si está COMPLETADA, asumir todas buenas
      buenosFinal = totalActividadesFinal;
      malosFinal = 0;
      corregidosFinal = 0;
      noAplicaFinal = 0;
    }

    // Calcular duración del servicio
    Duration? duracion;
    if (orden.fechaInicio != null && orden.fechaFin != null) {
      duracion = orden.fechaFin!.difference(orden.fechaInicio!);
    }

    // ✅ NUEVO: Determinar si las estadísticas son reales (no fallback del catálogo)
    // Son reales si: hay actividades locales ejecutadas O hay datos sincronizados del servidor
    final tieneActividadesLocales = actividades.isNotEmpty;
    final tieneDatosSincronizados =
        orden.totalActividades > 0 || conteoSincronizado > 0;
    final estadisticasSincronizadas =
        tieneActividadesLocales || tieneDatosSincronizados;

    return OrdenHistorialDetalleDto(
      idLocal: orden.idLocal,
      idBackend: orden.idBackend,
      numeroOrden: orden.numeroOrden,
      estado: estado.nombre,
      // Cliente
      nombreCliente: cliente.nombre,
      direccionCliente: cliente.direccion,
      telefonoCliente: cliente.telefono,
      emailCliente: cliente.email,
      // Equipo
      nombreEquipo: equipo.nombre,
      marcaEquipo: equipo.marca,
      modeloEquipo: equipo.modelo,
      serieEquipo: equipo.serie,
      ubicacionEquipo: equipo.ubicacion,
      // Servicio
      tipoServicio: tipoServicio.nombre,
      codigoTipoServicio: tipoServicio.codigo,
      // Fechas
      fechaProgramada: orden.fechaProgramada,
      fechaInicio: orden.fechaInicio,
      fechaFin: orden.fechaFin,
      duracionServicio: duracion,
      // Trabajo
      descripcionInicial: orden.descripcionInicial,
      trabajoRealizado: orden.trabajoRealizado,
      observaciones: orden.observacionesTecnico,
      // Estadísticas de actividades (híbrido: local o sincronizado)
      totalActividades: totalActividadesFinal,
      actividadesBuenas: buenosFinal,
      actividadesMalas: malosFinal,
      actividadesCorregidas: corregidosFinal,
      actividadesNA: noAplicaFinal,
      // Estadísticas de mediciones (híbrido: local o sincronizado)
      totalMediciones: totalMedicionesFinal,
      // ✅ FIX: Usar desglose sincronizado si no hay datos locales de mediciones
      medicionesNormales: mediciones.isNotEmpty
          ? medicionesNormales
          : orden.medicionesNormales,
      medicionesAdvertencia: mediciones.isNotEmpty
          ? medicionesAdvertencia
          : orden.medicionesAdvertencia,
      medicionesCriticas: mediciones.isNotEmpty
          ? medicionesCriticas
          : orden.medicionesCriticas,
      // Evidencias y firmas (híbrido: local o sincronizado)
      totalEvidencias: evidenciasCount,
      totalFirmas: firmasCount,
      // URL del PDF
      urlPdf: orden.urlPdf,
      // ✅ FIX: Horas como TEXTO PLANO - sin zona horaria
      horaEntradaTexto: orden.horaEntradaTexto,
      horaSalidaTexto: orden.horaSalidaTexto,
      // ✅ NUEVO: Flag para saber si las estadísticas son reales o fallback
      estadisticasSincronizadas: estadisticasSincronizadas,
    );
  }

  /// Obtiene estadísticas generales del historial
  Future<EstadisticasHistorialDto> getEstadisticas({
    DateTime? fechaDesde,
    DateTime? fechaHasta,
  }) async {
    // Obtener estado finalizado
    final estadoFinalizado =
        await (_db.select(_db.estadosOrden)
              ..where((e) => e.codigo.isIn(['COMPLETADA', 'FINALIZADO'])))
            .getSingleOrNull();

    if (estadoFinalizado == null) {
      return EstadisticasHistorialDto.empty();
    }

    // Query base
    var query = _db.select(_db.ordenes)
      ..where((o) => o.idEstado.equals(estadoFinalizado.id));

    if (fechaDesde != null) {
      query = query..where((o) => o.fechaFin.isBiggerOrEqualValue(fechaDesde));
    }
    if (fechaHasta != null) {
      final fechaHastaFin = fechaHasta.add(const Duration(days: 1));
      query = query..where((o) => o.fechaFin.isSmallerThanValue(fechaHastaFin));
    }

    final ordenes = await query.get();

    // Calcular estadísticas
    Duration totalDuracion = Duration.zero;
    int ordenesConDuracion = 0;

    for (final orden in ordenes) {
      if (orden.fechaInicio != null && orden.fechaFin != null) {
        totalDuracion += orden.fechaFin!.difference(orden.fechaInicio!);
        ordenesConDuracion++;
      }
    }

    final promedioDuracion = ordenesConDuracion > 0
        ? Duration(
            milliseconds: totalDuracion.inMilliseconds ~/ ordenesConDuracion,
          )
        : Duration.zero;

    return EstadisticasHistorialDto(
      totalOrdenes: ordenes.length,
      ordenesEsteMes: ordenes.where((o) {
        if (o.fechaFin == null) return false;
        final ahora = DateTime.now();
        return o.fechaFin!.month == ahora.month &&
            o.fechaFin!.year == ahora.year;
      }).length,
      promedioDuracion: promedioDuracion,
    );
  }

  /// Obtiene lista de clientes para filtro
  Future<List<ClienteFiltroDto>> getClientesParaFiltro() async {
    // Obtener clientes que tienen órdenes finalizadas
    final estadoFinalizado =
        await (_db.select(_db.estadosOrden)
              ..where((e) => e.codigo.isIn(['COMPLETADA', 'FINALIZADO'])))
            .getSingleOrNull();

    if (estadoFinalizado == null) return [];

    // Query simple: obtener todas las órdenes finalizadas con sus clientes
    final query = _db.select(_db.ordenes).join([
      innerJoin(_db.clientes, _db.clientes.id.equalsExp(_db.ordenes.idCliente)),
    ]);
    query.where(_db.ordenes.idEstado.equals(estadoFinalizado.id));

    final rows = await query.get();

    // Eliminar duplicados usando Map (clave = id cliente)
    final clientesMap = <int, ClienteFiltroDto>{};
    for (final row in rows) {
      final cliente = row.readTable(_db.clientes);
      clientesMap[cliente.id] = ClienteFiltroDto(
        id: cliente.id,
        nombre: cliente.nombre,
      );
    }

    return clientesMap.values.toList()
      ..sort((a, b) => a.nombre.compareTo(b.nombre));
  }

  /// RUTA 12: Obtiene tipos de servicio para filtro
  Future<List<TipoServicioFiltroDto>> getTiposServicioParaFiltro() async {
    // Obtener estado finalizado
    final estadoFinalizado =
        await (_db.select(_db.estadosOrden)
              ..where((e) => e.codigo.isIn(['COMPLETADA', 'FINALIZADO'])))
            .getSingleOrNull();

    if (estadoFinalizado == null) return [];

    // Query: obtener órdenes finalizadas con sus tipos de servicio
    final query = _db.select(_db.ordenes).join([
      innerJoin(
        _db.tiposServicio,
        _db.tiposServicio.id.equalsExp(_db.ordenes.idTipoServicio),
      ),
    ]);
    query.where(_db.ordenes.idEstado.equals(estadoFinalizado.id));

    final rows = await query.get();

    // Eliminar duplicados usando Map
    final tiposMap = <int, TipoServicioFiltroDto>{};
    for (final row in rows) {
      final tipo = row.readTable(_db.tiposServicio);
      tiposMap[tipo.id] = TipoServicioFiltroDto(
        id: tipo.id,
        codigo: tipo.codigo,
        nombre: tipo.nombre,
      );
    }

    return tiposMap.values.toList()
      ..sort((a, b) => a.codigo.compareTo(b.codigo));
  }

  /// Consulta la URL del PDF desde el backend y la guarda localmente
  ///
  /// ✅ FIX 29-ENE-2026: Usar ApiClient autenticado y endpoint específico
  /// Útil cuando la orden fue sincronizada pero la URL del PDF no se guardó
  /// correctamente en la base de datos local.
  Future<String?> consultarYGuardarUrlPdf(int idOrdenLocal) async {
    try {
      // Obtener el idBackend de la orden
      final orden = await (_db.select(
        _db.ordenes,
      )..where((o) => o.idLocal.equals(idOrdenLocal))).getSingleOrNull();

      if (orden == null || orden.idBackend == null) {
        debugPrint('⚠️ [PDF] Orden no encontrada o sin idBackend');
        return null;
      }

      debugPrint(
        '🔍 [PDF] Consultando PDF para orden backend: ${orden.idBackend}',
      );

      // ✅ FIX 29-ENE-2026: Usar ApiClient que ya tiene el token JWT configurado
      // Este endpoint busca directamente en documentos_generados por tipo_documento=PDF
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/ordenes/${orden.idBackend}/pdf-url',
      );

      if (response.statusCode == 200 && response.data?['success'] == true) {
        final data = response.data!['data'];
        String? urlPdf;

        // El endpoint devuelve directamente { success, data: { url, ... } }
        urlPdf = data['url'];

        if (urlPdf != null && urlPdf.isNotEmpty) {
          debugPrint('✅ [PDF] URL encontrada: $urlPdf');

          // Guardar la URL en la base de datos local
          await (_db.update(_db.ordenes)
                ..where((o) => o.idLocal.equals(idOrdenLocal)))
              .write(OrdenesCompanion(urlPdf: Value(urlPdf)));

          debugPrint('✅ [PDF] URL guardada exitosamente en BD local');
          return urlPdf;
        } else {
          debugPrint('⚠️ [PDF] El endpoint no devolvió URL');
        }
      } else {
        debugPrint('❌ [PDF] Respuesta inválida: ${response.statusCode}');
      }

      return null;
    } catch (e) {
      debugPrint('❌ [PDF] Error consultando URL PDF: $e');
      return null;
    }
  }

  /// Repara órdenes antiguas que tienen estado COMPLETADA pero sin fechaFin
  /// Esto ocurrió porque el código anterior no guardaba fechaFin al finalizar
  Future<int> repararOrdenesAntiguasSinFecha() async {
    final estadoCompletada =
        await (_db.select(_db.estadosOrden)
              ..where((e) => e.codigo.isIn(['COMPLETADA', 'FINALIZADO'])))
            .getSingleOrNull();

    if (estadoCompletada == null) return 0;

    // Buscar órdenes completadas sin fechaFin
    final ordenesParaReparar =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.equals(estadoCompletada.id))
              ..where((o) => o.fechaFin.isNull()))
            .get();

    if (ordenesParaReparar.isEmpty) return 0;

    // Para cada orden, usar la fecha de actualización
    for (final orden in ordenesParaReparar) {
      await (_db.update(_db.ordenes)
            ..where((o) => o.idLocal.equals(orden.idLocal)))
          .write(OrdenesCompanion(fechaFin: Value(orden.updatedAt)));
    }

    return ordenesParaReparar.length;
  }
}

// ============================================================================
// DTOs
// ============================================================================

/// DTO para lista de órdenes en historial
class OrdenHistorialDto {
  final int idLocal;
  final int? idBackend;
  final String numeroOrden;
  final String nombreCliente;
  final String? direccionCliente;
  final String nombreEquipo;
  final String? marcaEquipo;
  final String tipoServicio;
  final String codigoTipoServicio;
  final DateTime? fechaInicio;
  final DateTime? fechaFin;
  final String? trabajoRealizado;
  final String? observaciones;
  final String prioridad;
  final String? urlPdf;

  OrdenHistorialDto({
    required this.idLocal,
    this.idBackend,
    required this.numeroOrden,
    required this.nombreCliente,
    this.direccionCliente,
    required this.nombreEquipo,
    this.marcaEquipo,
    required this.tipoServicio,
    required this.codigoTipoServicio,
    this.fechaInicio,
    this.fechaFin,
    this.trabajoRealizado,
    this.observaciones,
    required this.prioridad,
    this.urlPdf,
  });

  /// Calcula la duración del servicio
  Duration? get duracion {
    if (fechaInicio != null && fechaFin != null) {
      return fechaFin!.difference(fechaInicio!);
    }
    return null;
  }

  /// Formatea la duración como string legible
  String get duracionFormateada {
    final d = duracion;
    if (d == null) return 'N/A';

    if (d.inDays > 0) {
      return '${d.inDays}d ${d.inHours % 24}h';
    } else if (d.inHours > 0) {
      return '${d.inHours}h ${d.inMinutes % 60}m';
    } else {
      return '${d.inMinutes}m';
    }
  }
}

/// DTO para detalle completo de orden
class OrdenHistorialDetalleDto {
  // Identificadores
  final int idLocal;
  final int? idBackend;
  final String numeroOrden;
  final String estado;

  // Cliente
  final String nombreCliente;
  final String? direccionCliente;
  final String? telefonoCliente;
  final String? emailCliente;

  // Equipo
  final String nombreEquipo;
  final String? marcaEquipo;
  final String? modeloEquipo;
  final String? serieEquipo;
  final String? ubicacionEquipo;

  // Servicio
  final String tipoServicio;
  final String codigoTipoServicio;

  // Fechas
  final DateTime? fechaProgramada;
  final DateTime? fechaInicio;
  final DateTime? fechaFin;
  final Duration? duracionServicio;

  // Trabajo
  final String? descripcionInicial;
  final String? trabajoRealizado;
  final String? observaciones;

  // Estadísticas actividades
  final int totalActividades;
  final int actividadesBuenas;
  final int actividadesMalas;
  final int actividadesCorregidas;
  final int actividadesNA;

  // Estadísticas mediciones
  final int totalMediciones;
  final int medicionesNormales;
  final int medicionesAdvertencia;
  final int medicionesCriticas;

  // Evidencias y firmas
  final int totalEvidencias;
  final int totalFirmas;

  // URL del PDF
  final String? urlPdf;

  // ✅ FIX: Horas como TEXTO PLANO (HH:mm) - sin zona horaria
  final String? horaEntradaTexto;
  final String? horaSalidaTexto;

  // ✅ NUEVO: Flag para saber si las estadísticas vienen del servidor o son fallback
  final bool estadisticasSincronizadas;

  OrdenHistorialDetalleDto({
    required this.idLocal,
    this.idBackend,
    required this.numeroOrden,
    required this.estado,
    required this.nombreCliente,
    this.direccionCliente,
    this.telefonoCliente,
    this.emailCliente,
    required this.nombreEquipo,
    this.marcaEquipo,
    this.modeloEquipo,
    this.serieEquipo,
    this.ubicacionEquipo,
    required this.tipoServicio,
    required this.codigoTipoServicio,
    this.fechaProgramada,
    this.fechaInicio,
    this.fechaFin,
    this.duracionServicio,
    this.descripcionInicial,
    this.trabajoRealizado,
    this.observaciones,
    required this.totalActividades,
    required this.actividadesBuenas,
    required this.actividadesMalas,
    required this.actividadesCorregidas,
    required this.actividadesNA,
    required this.totalMediciones,
    required this.medicionesNormales,
    required this.medicionesAdvertencia,
    required this.medicionesCriticas,
    required this.totalEvidencias,
    required this.totalFirmas,
    this.urlPdf,
    this.horaEntradaTexto,
    this.horaSalidaTexto,
    this.estadisticasSincronizadas = false,
  });

  /// Porcentaje de actividades buenas
  double get porcentajeBuenas =>
      totalActividades > 0 ? (actividadesBuenas / totalActividades) * 100 : 0;

  /// Formatea duración como texto legible
  String get duracionFormateada {
    final d = duracionServicio;
    if (d == null) return 'No disponible';

    if (d.inDays > 0) {
      return '${d.inDays} días, ${d.inHours % 24} horas';
    } else if (d.inHours > 0) {
      return '${d.inHours} horas, ${d.inMinutes % 60} minutos';
    } else {
      return '${d.inMinutes} minutos';
    }
  }

  /// Indica si hay alertas (malos o críticos)
  bool get tieneAlertas => actividadesMalas > 0 || medicionesCriticas > 0;
}

/// DTO para estadísticas generales
class EstadisticasHistorialDto {
  final int totalOrdenes;
  final int ordenesEsteMes;
  final Duration promedioDuracion;

  EstadisticasHistorialDto({
    required this.totalOrdenes,
    required this.ordenesEsteMes,
    required this.promedioDuracion,
  });

  factory EstadisticasHistorialDto.empty() => EstadisticasHistorialDto(
    totalOrdenes: 0,
    ordenesEsteMes: 0,
    promedioDuracion: Duration.zero,
  );

  String get promedioDuracionFormateado {
    final d = promedioDuracion;
    if (d.inHours > 0) {
      return '${d.inHours}h ${d.inMinutes % 60}m';
    } else {
      return '${d.inMinutes}m';
    }
  }
}

/// DTO para filtro de clientes
class ClienteFiltroDto {
  final int id;
  final String nombre;

  ClienteFiltroDto({required this.id, required this.nombre});
}

/// RUTA 12: DTO para filtro de tipos de servicio
class TipoServicioFiltroDto {
  final int id;
  final String codigo;
  final String nombre;

  TipoServicioFiltroDto({
    required this.id,
    required this.codigo,
    required this.nombre,
  });
}
