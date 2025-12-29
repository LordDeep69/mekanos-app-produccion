import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';
import '../../ejecucion/data/ejecucion_service.dart';
import '../../ejecucion/presentation/ejecucion_screen.dart';
import '../../ejecucion/presentation/resumen_finalizacion_screen.dart';
import '../data/orden_repository.dart';
import '../domain/orden_detalle_full.dart';
import 'home_production_screen.dart';
import 'widgets/equipos_orden_widget.dart';

/// Pantalla de Detalle de Orden - RUTA 5
/// Muestra información de la orden y actividades agrupadas por sistema
class OrdenDetalleScreen extends ConsumerStatefulWidget {
  final int idOrdenLocal;

  const OrdenDetalleScreen({super.key, required this.idOrdenLocal});

  @override
  ConsumerState<OrdenDetalleScreen> createState() => _OrdenDetalleScreenState();
}

class _OrdenDetalleScreenState extends ConsumerState<OrdenDetalleScreen> {
  OrdenDetalleFull? _detalle;
  ResumenEjecucion? _resumen; // ✅ ESTADÍSTICAS REALES
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetalleOrden();
  }

  Future<void> _loadDetalleOrden() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(ordenRepositoryProvider);
      final detalle = await repository.getDetalleCompleto(widget.idOrdenLocal);

      if (detalle == null) {
        setState(() {
          _error = 'No se pudo cargar el detalle de la orden';
          _isLoading = false;
        });
      } else {
        // ✅ Cargar resumen de progreso real
        final ejecService = ref.read(ejecucionServiceProvider);
        final resumen = await ejecService.getResumenEjecucion(
          widget.idOrdenLocal,
        );

        // ✅ MULTI-EQUIPOS: Invalidar provider de equipos para refrescar estados
        if (detalle.idBackend != null) {
          ref.invalidate(equiposOrdenProvider(detalle.idBackend!));
        }

        setState(() {
          _detalle = detalle;
          _resumen = resumen;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
        _isLoading = false;
      });
    }
  }

  /// Agrupa las actividades por sistema
  Map<String, List<dynamic>> _agruparPorSistema() {
    if (_detalle == null) return {};

    final Map<String, List<dynamic>> grupos = {};
    for (final act in _detalle!.actividadesCatalogo) {
      final sistema = act.sistema ?? 'GENERAL';
      if (!grupos.containsKey(sistema)) {
        grupos[sistema] = [];
      }
      grupos[sistema]!.add(act);
    }
    return grupos;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_detalle?.numeroOrden ?? 'Cargando...'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: _buildBody(),
      // ✅ FIX: Ocultar botón para órdenes finalizadas (COMPLETADA, CERRADA, CANCELADA)
      bottomNavigationBar: _detalle != null && !_detalle!.estaFinalizada
          ? _buildBottomBar()
          : null,
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Cargando detalle de orden...'),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade400),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadDetalleOrden,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    final grupos = _agruparPorSistema();

    return CustomScrollView(
      slivers: [
        // Header con información de la orden
        SliverToBoxAdapter(child: _buildOrderHeader()),

        // ✅ NUEVO: Widget de equipos (solo se muestra si hay múltiples equipos)
        if (_detalle?.idBackend != null)
          SliverToBoxAdapter(
            child: EquiposOrdenWidget(
              idOrdenServicio: _detalle!.idBackend!,
              onEquipoSelected: (equipo) {
                // TODO: Navegar a ejecución con equipo específico
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Equipo seleccionado: ${equipo.nombreSistema ?? equipo.nombreEquipo}',
                    ),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
            ),
          ),

        // Estadísticas
        SliverToBoxAdapter(child: _buildStatsCard()),

        // Título de sección
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'ACTIVIDADES POR SISTEMA',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),

        // Lista de actividades agrupadas por sistema
        ..._buildSistemaSections(grupos),

        // Espacio al final para el botón
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  Widget _buildOrderHeader() {
    if (_detalle == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade600, Colors.blue.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.shade200,
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Número de orden y estado
          Row(
            children: [
              // Número de orden con Flexible para manejar textos largos
              Expanded(
                child: Text(
                  _detalle!.numeroOrden,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
              const SizedBox(width: 8),
              // Badge de estado
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _getEstadoColor(_detalle!.codigoEstado),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  _detalle!.codigoEstado,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Colors.white24),
          const SizedBox(height: 8),

          // Cliente
          _buildInfoRow(Icons.business, 'Cliente', _detalle!.nombreCliente),
          const SizedBox(height: 8),

          // Equipo
          _buildInfoRow(
            Icons.precision_manufacturing,
            'Equipo',
            _detalle!.equipoDisplay,
          ),
          const SizedBox(height: 8),

          // Tipo de Servicio
          _buildInfoRow(Icons.build, 'Servicio', _detalle!.nombreTipoServicio),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(color: Colors.white60, fontSize: 12),
              ),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsCard() {
    if (_detalle == null) return const SizedBox.shrink();

    final grupos = _agruparPorSistema();

    // ✅ FIX SIMPLIFICADO: Si está COMPLETADA, SIEMPRE usar estadísticas sincronizadas
    // No importa si hay datos locales o no - las estadísticas del servidor son la fuente de verdad
    final esOrdenHistorica = _detalle!.estaFinalizada;

    // ✅ MULTI-EQUIPOS FIX: Determinar si la orden ha iniciado ejecución
    // Una orden ha iniciado si tiene actividades ejecutadas (totalItems > 0)
    final haIniciadoEjecucion = (_resumen?.totalItems ?? 0) > 0;

    // ✅ FIX MEJORADO: Usar totalItems correcto según el estado
    // - Orden histórica: usar datos sincronizados del servidor
    // - Orden en proceso: usar ResumenEjecucion que suma actividades de TODOS los equipos
    // - Orden no iniciada: usar actividades del catálogo (referencia)
    int totalItems;
    int completados;
    int pendientes;

    if (esOrdenHistorica) {
      // Orden finalizada: usar datos del servidor
      totalItems = _detalle!.totalActividadesSincronizadas;
      completados = totalItems;
      pendientes = 0;
    } else if (haIniciadoEjecucion) {
      // Orden en proceso: usar ResumenEjecucion que ya suma todos los equipos
      totalItems = _resumen!.totalItems;
      completados = _resumen!.totalCompletados;
      pendientes = (totalItems - completados).clamp(0, totalItems);
    } else {
      // Orden no iniciada: usar catálogo como referencia
      totalItems = _detalle!.cantidadActividades;
      completados = 0;
      pendientes = totalItems;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: esOrdenHistorica ? Colors.green.shade50 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        border: esOrdenHistorica
            ? Border.all(color: Colors.green.shade200, width: 1)
            : null,
      ),
      child: Column(
        children: [
          // ✅ FIX: Indicador de orden histórica
          if (esOrdenHistorica)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history, size: 16, color: Colors.green.shade700),
                  const SizedBox(width: 4),
                  Text(
                    'Orden Completada - Datos del Historial',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.green.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem(
                Icons.checklist,
                '$totalItems',
                'Actividades',
                Colors.blue,
              ),
              _buildStatItem(
                esOrdenHistorica ? Icons.speed : Icons.category,
                esOrdenHistorica
                    ? '${_detalle!.totalMedicionesSincronizadas}'
                    : '${grupos.length}',
                esOrdenHistorica ? 'Mediciones' : 'Sistemas',
                Colors.orange,
              ),
              _buildStatItem(
                esOrdenHistorica ? Icons.photo_camera : Icons.check_circle,
                esOrdenHistorica
                    ? '${_detalle!.totalEvidenciasSincronizadas}'
                    : '$completados',
                esOrdenHistorica ? 'Fotos' : 'Completadas',
                Colors.green,
              ),
              _buildStatItem(
                esOrdenHistorica ? Icons.draw : Icons.pending_actions,
                esOrdenHistorica
                    ? '${_detalle!.totalFirmasSincronizadas}'
                    : '$pendientes',
                esOrdenHistorica ? 'Firmas' : 'Pendientes',
                esOrdenHistorica
                    ? Colors.purple
                    : (pendientes == 0 ? Colors.green : Colors.orange),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
      ],
    );
  }

  /// Genera los slivers para cada sistema de forma simple
  List<Widget> _buildSistemaSections(Map<String, List<dynamic>> grupos) {
    final List<Widget> slivers = [];

    for (final entry in grupos.entries) {
      final sistema = entry.key;
      final actividades = entry.value;

      // Header del sistema
      slivers.add(
        SliverToBoxAdapter(
          child: Container(
            color: Colors.grey.shade200,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(
                  _getSistemaIcon(sistema),
                  color: Colors.grey.shade700,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    sistema.toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                      fontSize: 13,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade500,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${actividades.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      // Lista de actividades del sistema
      slivers.add(
        SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            final act = actividades[index];
            return _buildActividadTile(act, index == actividades.length - 1);
          }, childCount: actividades.length),
        ),
      );
    }

    return slivers;
  }

  IconData _getSistemaIcon(String sistema) {
    final sistemaLower = sistema.toLowerCase();
    if (sistemaLower.contains('enfriamiento')) return Icons.ac_unit;
    if (sistemaLower.contains('combustible')) return Icons.local_gas_station;
    if (sistemaLower.contains('lubricacion') ||
        sistemaLower.contains('lubricación')) {
      return Icons.oil_barrel;
    }
    if (sistemaLower.contains('electrico') ||
        sistemaLower.contains('eléctrico')) {
      return Icons.electrical_services;
    }
    if (sistemaLower.contains('control')) return Icons.settings_remote;
    if (sistemaLower.contains('escape')) return Icons.air;
    if (sistemaLower.contains('aspiracion') ||
        sistemaLower.contains('aspiración')) {
      return Icons.filter_alt;
    }
    return Icons.build;
  }

  Widget _buildActividadTile(dynamic actividad, bool isLast) {
    return Container(
      margin: EdgeInsets.fromLTRB(16, 0, 16, isLast ? 16 : 0),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          left: BorderSide(
            color: _getTipoActividadColor(actividad.tipoActividad),
            width: 4,
          ),
          bottom: isLast
              ? BorderSide.none
              : BorderSide(color: Colors.grey.shade200),
        ),
      ),
      child: ListTile(
        leading: Icon(
          Icons.check_box_outline_blank,
          color: Colors.grey.shade400,
          size: 28,
        ),
        title: Text(
          actividad.descripcion,
          style: const TextStyle(fontSize: 14),
        ),
        subtitle: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _getTipoActividadColor(
                  actividad.tipoActividad,
                ).withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                actividad.tipoActividad,
                style: TextStyle(
                  fontSize: 10,
                  color: _getTipoActividadColor(actividad.tipoActividad),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            if (actividad.esObligatoria) ...[
              const SizedBox(width: 8),
              const Icon(Icons.star, size: 12, color: Colors.amber),
            ],
          ],
        ),
        trailing: actividad.tipoActividad == 'MEDICION'
            ? Icon(Icons.speed, color: Colors.purple.shade400)
            : null,
        dense: true,
      ),
    );
  }

  Widget _buildBottomBar() {
    // ✅ FIX: No mostrar para órdenes finalizadas
    if (_detalle?.estaFinalizada ?? false) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 🧪 BOTÓN TEST TEMPORAL - LOG TEST DE ESCRITURA
            ElevatedButton.icon(
              onPressed: () => _testIniciarEjecucion(),
              icon: const Icon(Icons.science),
              label: const Text(
                '🧪 TEST INICIAR (LOG)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Botón principal
            ElevatedButton.icon(
              onPressed: () => _iniciarYNavegar(),
              icon: const Icon(Icons.play_arrow),
              label: const Text(
                'INICIAR EJECUCIÓN',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Iniciar ejecución de la orden
  Future<void> _testIniciarEjecucion() async {
    final service = ref.read(ejecucionServiceProvider);
    final resultado = await service.iniciarEjecucion(widget.idOrdenLocal);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resultado.exito
                ? '✅ ${resultado.actividadesInstanciadas} actividades instanciadas'
                : '❌ ${resultado.error}',
          ),
          backgroundColor: resultado.exito ? Colors.green : Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );

      if (resultado.exito && !resultado.yaExistia) {
        _loadDetalleOrden();
      }
    }
  }

  /// Inicia la ejecución y navega a la pantalla de ejecución
  /// ✅ FIX 15-DIC-2025: Detecta multi-equipos y muestra selector
  Future<void> _iniciarYNavegar() async {
    final service = ref.read(ejecucionServiceProvider);
    final db = ref.read(databaseProvider);

    // Verificar si es orden multi-equipo
    final idBackend = _detalle?.idBackend;
    debugPrint(
      '🔍 [MULTI-EQ] idBackend: $idBackend, numeroOrden: ${_detalle?.numeroOrden}',
    );

    if (idBackend != null) {
      final equipos = await db.getEquiposByOrdenServicio(idBackend);
      debugPrint('🔍 [MULTI-EQ] Equipos encontrados: ${equipos.length}');
      for (final eq in equipos) {
        debugPrint(
          '   ↳ Equipo ${eq.ordenSecuencia}: ${eq.nombreSistema ?? eq.nombreEquipo} (idOrdenEquipo: ${eq.idOrdenEquipo})',
        );
      }

      if (equipos.length > 1) {
        // ✅ MULTI-EQUIPO: Mostrar selector de equipos
        final equipoSeleccionado = await _mostrarSelectorEquipos(equipos);

        if (equipoSeleccionado == null) {
          // Usuario canceló
          return;
        }

        // Navegar con equipo específico
        await _navegarAEjecucion(service, equipoSeleccionado);
        return;
      }
    }

    // ORDEN SIMPLE: Iniciar y navegar directamente
    final resultado = await service.iniciarEjecucion(widget.idOrdenLocal);

    if (!resultado.exito) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ ${resultado.error}'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Navegar a la pantalla de ejecución y recargar al volver
    if (mounted) {
      // ✅ v3.3 FIX: Invalidar quickStatsProvider para actualizar Home/Dashboard
      ref.invalidate(quickStatsProvider);

      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              EjecucionScreen(idOrdenLocal: widget.idOrdenLocal),
        ),
      );
      // ✅ Recargar estadísticas al volver
      ref.invalidate(quickStatsProvider);
      _loadDetalleOrden();
    }
  }

  /// Muestra diálogo para seleccionar equipo en orden multi-equipo
  /// ✅ MULTI-EQUIPOS: Incluye opción "Resumen/Finalizar" para completar la orden
  Future<OrdenesEquipo?> _mostrarSelectorEquipos(
    List<OrdenesEquipo> equipos,
  ) async {
    // Resultado especial: null con retorno de función = cancelado
    // Para "Resumen/Finalizar" devolvemos un equipo especial con idOrdenEquipo = -1
    final resultado = await showModalBottomSheet<dynamic>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.85,
        minChildSize: 0.4,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Título
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    Icons.devices_other,
                    color: Colors.blue.shade700,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Orden Multi-Equipo',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Instrucciones
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Esta orden tiene ${equipos.length} equipos. Selecciona qué deseas hacer:',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ),

            // ✅ CARD RESUMEN/FINALIZAR
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Card(
                elevation: 4,
                color: Colors.green.shade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.green.shade300, width: 2),
                ),
                child: InkWell(
                  onTap: () => Navigator.pop(context, 'RESUMEN'),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green.shade100,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.summarize,
                            color: Colors.green.shade700,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '📋 RESUMEN Y FINALIZAR',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: Colors.green.shade800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Ver progreso de todos los equipos, capturar firmas y finalizar el servicio',
                                style: TextStyle(
                                  color: Colors.green.shade700,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios,
                          color: Colors.green.shade700,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Separador
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'O ejecutar un equipo',
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                ],
              ),
            ),

            // Lista de equipos
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: equipos.length,
                itemBuilder: (context, index) {
                  final equipo = equipos[index];
                  final estadoColor = _getEstadoEquipoColor(equipo.estado);

                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.blue.shade100,
                        child: Text(
                          '${equipo.ordenSecuencia}',
                          style: TextStyle(
                            color: Colors.blue.shade700,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      title: Text(
                        equipo.nombreSistema ??
                            equipo.nombreEquipo ??
                            'Equipo ${equipo.ordenSecuencia}',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        equipo.codigoEquipo ?? '',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: estadoColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          equipo.estado,
                          style: TextStyle(
                            color: estadoColor,
                            fontWeight: FontWeight.w500,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      onTap: () => Navigator.pop(context, equipo),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );

    // Si seleccionó "RESUMEN", navegar a ResumenFinalizacionScreen
    if (resultado == 'RESUMEN') {
      if (mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ResumenFinalizacionScreen(
              idOrdenLocal: widget.idOrdenLocal,
              idBackend: _detalle?.idBackend,
              numeroOrden: _detalle?.numeroOrden,
            ),
          ),
        );
        _loadDetalleOrden(); // Recargar al volver
      }
      return null; // No navegar a ejecución
    }

    // Retornar el equipo seleccionado (o null si canceló)
    return resultado as OrdenesEquipo?;
  }

  /// Navega a la ejecución con un equipo específico
  /// ✅ MULTI-EQUIPOS: Pasa idOrdenEquipo para clonar actividades por equipo
  Future<void> _navegarAEjecucion(
    EjecucionService service,
    OrdenesEquipo equipo,
  ) async {
    // ✅ MULTI-EQUIPOS: Pasar idOrdenEquipo al iniciar ejecución
    final resultado = await service.iniciarEjecucion(
      widget.idOrdenLocal,
      idOrdenEquipo: equipo.idOrdenEquipo,
    );

    if (!resultado.exito) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ ${resultado.error}'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    if (mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => EjecucionScreen(
            idOrdenLocal: widget.idOrdenLocal,
            idOrdenEquipo: equipo.idOrdenEquipo, // ✅ Pasar ID del equipo
          ),
        ),
      );
      _loadDetalleOrden();
    }
  }

  /// Color según estado del equipo
  Color _getEstadoEquipoColor(String estado) {
    switch (estado.toUpperCase()) {
      case 'COMPLETADO':
      case 'FINALIZADO':
        return Colors.green;
      case 'EN_PROCESO':
      case 'EN PROCESO':
        return Colors.orange;
      case 'PENDIENTE':
      default:
        return Colors.grey;
    }
  }

  Color _getEstadoColor(String estado) {
    switch (estado.toUpperCase()) {
      case 'ASIGNADA':
        return Colors.blue;
      case 'EN_PROCESO':
        return Colors.orange;
      case 'COMPLETADA':
        return Colors.green;
      case 'CANCELADA':
        return Colors.red;
      case 'POR_SUBIR':
        // ✅ SYNC MANUAL: Estado especial para órdenes offline pendientes de subir
        return Colors.deepOrange;
      default:
        return Colors.grey;
    }
  }

  Color _getTipoActividadColor(String tipo) {
    switch (tipo.toUpperCase()) {
      case 'INSPECCION':
        return Colors.blue;
      case 'MEDICION':
        return Colors.purple;
      case 'LIMPIEZA':
        return Colors.teal;
      case 'AJUSTE':
        return Colors.orange;
      case 'CAMBIO':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
