import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Widget interactivo y ergonómico para gestión de Pendientes Técnicos por Orden
/// Diseñado para máxima comodidad táctil en campo y trazabilidad multi-equipo
class PendientesOrdenWidget extends ConsumerStatefulWidget {
  final int idOrdenLocal;
  final int? idOrdenBackend;
  final int? idCliente;
  final int? idEquipo;
  final int? idOrdenEquipo;
  final List<OrdenesEquipo>? equipos;
  final VoidCallback? onPendientesChanged;
  final Function(String resumenTexto)? onResumenActualizado;

  const PendientesOrdenWidget({
    super.key,
    required this.idOrdenLocal,
    this.idOrdenBackend,
    this.idCliente,
    this.idEquipo,
    this.idOrdenEquipo,
    this.equipos,
    this.onPendientesChanged,
    this.onResumenActualizado,
  });

  @override
  ConsumerState<PendientesOrdenWidget> createState() =>
      _PendientesOrdenWidgetState();
}

class _PendientesOrdenWidgetState
    extends ConsumerState<PendientesOrdenWidget> {
  List<OrdenesPendiente> _pendientes = [];
  List<PendientesCatalogoData> _catalogo = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
    _refrescarCatalogoRemoto();
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);
    try {
      final db = ref.read(databaseProvider);
      final pends = await db.getPendientesByOrden(widget.idOrdenLocal);
      final cats = await db.getPendientesCatalogo();

      if (mounted) {
        setState(() {
          _pendientes = pends;
          _catalogo = cats;
          _isLoading = false;
        });
        _notificarResumen();
      }
    } catch (e) {
      debugPrint('❌ Error cargando pendientes: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Sincroniza en segundo plano el catálogo de pendientes desde el servidor
  Future<void> _refrescarCatalogoRemoto() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final db = ref.read(databaseProvider);
      final response = await apiClient.dio.get('/ordenes/catalogo-pendientes');
      if (response.statusCode == 200 && response.data is List) {
        final List list = response.data as List;
        for (final item in list) {
          if (item is! Map) continue;
          final rawId = item['id'] ?? item['idPendienteCatalogo'] ?? item['id_pendiente_catalogo'];
          final id = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0;
          if (id == 0) continue;

          final rawTipo = item['idTipoEquipo'] ?? item['id_tipo_equipo'];
          final idTipo = rawTipo is int ? rawTipo : int.tryParse(rawTipo?.toString() ?? '');

          final rawOrden = item['ordenVisual'] ?? item['orden_visual'];
          final ordenVisual = rawOrden is int ? rawOrden : int.tryParse(rawOrden?.toString() ?? '') ?? 0;

          final rawActivo = item['activo'];
          final activo = rawActivo is bool ? rawActivo : (rawActivo?.toString().toLowerCase() != 'false');

          await db.upsertPendienteCatalogo(
            PendientesCatalogoCompanion(
              id: Value(id),
              codigo: Value(item['codigo'] as String?),
              descripcion: Value(item['descripcion'] as String? ?? ''),
              categoria: Value(item['categoria'] as String? ?? 'GENERAL'),
              idTipoEquipo: Value(idTipo),
              activo: Value(activo),
              ordenVisual: Value(ordenVisual),
              lastSyncedAt: Value(DateTime.now()),
            ),
          );
        }

        final updatedCats = await db.getPendientesCatalogo();
        if (mounted) {
          setState(() {
            _catalogo = updatedCats;
          });
        }
      }
    } catch (e) {
      debugPrint('ℹ️ [PENDIENTES] Catálogo remoto no disponible (modo offline): $e');
    }
  }

  void _notificarResumen() {
    if (widget.onResumenActualizado != null) {
      if (_pendientes.isEmpty) {
        widget.onResumenActualizado!('PENDIENTES: Sin pendientes');
      } else {
        final resumen = _pendientes.map((p) => p.descripcion).join('; ');
        widget.onResumenActualizado!('PENDIENTES: $resumen');
      }
    }
  }

  Color _getColorPrioridad(String prioridad) {
    switch (prioridad.toUpperCase()) {
      case 'URGENTE':
      case 'EMERGENCIA':
        return Colors.red.shade700;
      case 'ALTA':
        return Colors.orange.shade800;
      case 'NORMAL':
      default:
        return Colors.amber.shade800;
    }
  }

  String _resolverNombreEquipo(int? idOrdenEquipo) {
    if (widget.equipos != null && idOrdenEquipo != null) {
      final eq = widget.equipos!
          .where((e) => e.idOrdenEquipo == idOrdenEquipo)
          .firstOrNull;
      if (eq != null) {
        final nombre = (eq.nombreSistema != null && eq.nombreSistema!.isNotEmpty)
            ? eq.nombreSistema!
            : (eq.nombreEquipo ?? 'Equipo ${eq.ordenSecuencia}');
        return '#${eq.ordenSecuencia} · $nombre';
      }
    }
    return idOrdenEquipo == null ? '🌐 General de la Orden' : 'Equipo Principal';
  }

  Future<void> _eliminarPendiente(OrdenesPendiente p) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('¿Eliminar Pendiente?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text('Se desvinculará "${p.descripcion}" de esta orden de servicio.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final db = ref.read(databaseProvider);
    await db.deleteOrdenPendiente(p.idLocal);
    await _cargarDatos();
    widget.onPendientesChanged?.call();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Pendiente eliminado'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _abrirModalDedicado() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ModalGestionPendientes(
        widget: widget,
        catalogo: _catalogo,
        pendientesActuales: _pendientes,
        onCambio: () async {
          await _cargarDatos();
          widget.onPendientesChanged?.call();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    final totalActivos = _pendientes.length;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: totalActivos > 0 ? Colors.amber.shade300 : Colors.grey.shade300,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: totalActivos > 0
                ? Colors.amber.shade100.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Ejecutivo
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: totalActivos > 0 ? Colors.amber.shade50 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: totalActivos > 0 ? Colors.amber.shade400 : Colors.grey.shade300,
                  ),
                ),
                child: Icon(
                  Icons.assignment_late_outlined,
                  color: totalActivos > 0 ? Colors.amber.shade900 : Colors.grey.shade700,
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PENDIENTES TÉCNICOS POR ORDEN',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        letterSpacing: 0.3,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      'Hallazgos y repuestos para cotizar o dar seguimiento',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: totalActivos == 0 ? Colors.green.shade50 : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: totalActivos == 0 ? Colors.green.shade300 : Colors.amber.shade400,
                  ),
                ),
                child: Text(
                  totalActivos == 0 ? '0' : '$totalActivos',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: totalActivos == 0 ? Colors.green.shade800 : Colors.amber.shade900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Botón Prominente Ergonómico para Abrir Modal Dedicado
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              icon: const Icon(Icons.add_task_rounded, size: 20),
              label: Text(
                totalActivos == 0
                    ? '+ Registrar Hallazgo / Pendiente'
                    : 'Gestionar Pendientes ($totalActivos)',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: totalActivos > 0 ? Colors.amber.shade800 : Colors.blueGrey.shade800,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 1,
              ),
              onPressed: _abrirModalDedicado,
            ),
          ),
          const SizedBox(height: 12),

          // Lista de Pendientes Registrados
          if (_pendientes.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.green.shade50.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.green.shade700, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Sin pendientes registrados. La orden se completará al 100% al día.',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.green.shade900,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _pendientes.length,
              separatorBuilder: (_, _) => const SizedBox(height: 6),
              itemBuilder: (context, index) {
                final p = _pendientes[index];
                final colorPrio = _getColorPrioridad(p.prioridad);
                final nombreEq = _resolverNombreEquipo(p.idOrdenEquipo);

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 4,
                        height: 34,
                        decoration: BoxDecoration(
                          color: colorPrio,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.descripcion,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: colorPrio.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    p.prioridad,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: colorPrio,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    nombreEq,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.blue.shade800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (p.observaciones != null && p.observaciones!.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text(
                                p.observaciones!,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontStyle: FontStyle.italic,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                        onPressed: () => _eliminarPendiente(p),
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Eliminar pendiente',
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

/// Modal Dedicado de Pantalla Completa (90%) para máxima comodidad táctil en campo
class _ModalGestionPendientes extends ConsumerStatefulWidget {
  final PendientesOrdenWidget widget;
  final List<PendientesCatalogoData> catalogo;
  final List<OrdenesPendiente> pendientesActuales;
  final VoidCallback onCambio;

  const _ModalGestionPendientes({
    required this.widget,
    required this.catalogo,
    required this.pendientesActuales,
    required this.onCambio,
  });

  @override
  ConsumerState<_ModalGestionPendientes> createState() =>
      _ModalGestionPendientesState();
}

class _ModalGestionPendientesState
    extends ConsumerState<_ModalGestionPendientes> {
  late int? _idOrdenEquipoSeleccionado;
  late int? _idEquipoSeleccionado;
  late List<PendientesCatalogoData> _catalogoItems;
  bool _isRefreshingCatalogo = false;

  String _filtroCategoria = 'TODAS';
  String _busqueda = '';
  final TextEditingController _searchController = TextEditingController();

  // Estado para el formulario personalizado
  final TextEditingController _descCustomController = TextEditingController();
  final TextEditingController _obsCustomController = TextEditingController();
  String _prioridadCustom = 'NORMAL';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _catalogoItems = List.from(widget.catalogo);
    _idOrdenEquipoSeleccionado = widget.widget.idOrdenEquipo;
    _idEquipoSeleccionado = widget.widget.idEquipo;

    // Inicializar con el primer equipo si es multi-equipo
    if (_idOrdenEquipoSeleccionado == null &&
        widget.widget.equipos != null &&
        widget.widget.equipos!.isNotEmpty) {
      final primerEq = widget.widget.equipos!.first;
      _idOrdenEquipoSeleccionado = primerEq.idOrdenEquipo;
      _idEquipoSeleccionado = primerEq.idEquipo;
    }
  }

  Future<void> _actualizarCatalogoManual() async {
    setState(() => _isRefreshingCatalogo = true);
    try {
      final apiClient = ref.read(apiClientProvider);
      final db = ref.read(databaseProvider);
      final response = await apiClient.dio.get('/ordenes/catalogo-pendientes');
      if (response.statusCode == 200 && response.data is List) {
        final List list = response.data as List;
        for (final item in list) {
          if (item is! Map) continue;
          final rawId = item['id'] ?? item['idPendienteCatalogo'] ?? item['id_pendiente_catalogo'];
          final id = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0;
          if (id == 0) continue;

          final rawTipo = item['idTipoEquipo'] ?? item['id_tipo_equipo'];
          final idTipo = rawTipo is int ? rawTipo : int.tryParse(rawTipo?.toString() ?? '');

          final rawOrden = item['ordenVisual'] ?? item['orden_visual'];
          final ordenVisual = rawOrden is int ? rawOrden : int.tryParse(rawOrden?.toString() ?? '') ?? 0;

          final rawActivo = item['activo'];
          final activo = rawActivo is bool ? rawActivo : (rawActivo?.toString().toLowerCase() != 'false');

          await db.upsertPendienteCatalogo(
            PendientesCatalogoCompanion(
              id: Value(id),
              codigo: Value(item['codigo'] as String?),
              descripcion: Value(item['descripcion'] as String? ?? ''),
              categoria: Value(item['categoria'] as String? ?? 'GENERAL'),
              idTipoEquipo: Value(idTipo),
              activo: Value(activo),
              ordenVisual: Value(ordenVisual),
              lastSyncedAt: Value(DateTime.now()),
            ),
          );
        }

        final updated = await db.getPendientesCatalogo();
        if (mounted) {
          setState(() {
            _catalogoItems = updated;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✓ Catálogo actualizado (${updated.length} sugerencias)'),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 1),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Modo offline: se mantiene el catálogo local actual'),
            duration: Duration(seconds: 1),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isRefreshingCatalogo = false);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _descCustomController.dispose();
    _obsCustomController.dispose();
    super.dispose();
  }

  void _seleccionarEquipo(OrdenesEquipo eq) {
    setState(() {
      _idOrdenEquipoSeleccionado = eq.idOrdenEquipo;
      _idEquipoSeleccionado = eq.idEquipo;
    });
  }

  List<String> _obtenerCategoriasDisponibles() {
    final setCat = <String>{'TODAS'};
    for (final item in _catalogoItems) {
      if (item.categoria != null && item.categoria!.isNotEmpty) {
        setCat.add(item.categoria!.trim().toUpperCase());
      }
    }
    return setCat.toList();
  }

  Future<void> _agregarPendienteDesdeCatalogo(
    PendientesCatalogoData cat,
    String prioridad,
  ) async {
    final db = ref.read(databaseProvider);
    final nuevo = OrdenesPendientesCompanion(
      idOrden: Value(widget.widget.idOrdenLocal),
      idOrdenBackend: Value(widget.widget.idOrdenBackend),
      idCliente: Value(widget.widget.idCliente),
      idEquipo: Value(_idEquipoSeleccionado ?? widget.widget.idEquipo),
      idOrdenEquipo: Value(_idOrdenEquipoSeleccionado),
      idPendienteCatalogo: Value(cat.id),
      descripcion: Value(cat.descripcion),
      origen: const Value('CATALOGO'),
      prioridad: Value(prioridad),
      estado: const Value('PENDIENTE'),
      fechaCreacion: Value(DateTime.now()),
      isDirty: const Value(true),
    );

    await db.insertOrdenPendiente(nuevo);
    widget.onCambio();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Agregado: ${cat.descripcion}'),
          backgroundColor: Colors.amber.shade900,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _guardarPendientePersonalizado() async {
    final desc = _descCustomController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor ingrese la descripción del pendiente'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final db = ref.read(databaseProvider);
      final obs = _obsCustomController.text.trim();
      final nuevo = OrdenesPendientesCompanion(
        idOrden: Value(widget.widget.idOrdenLocal),
        idOrdenBackend: Value(widget.widget.idOrdenBackend),
        idCliente: Value(widget.widget.idCliente),
        idEquipo: Value(_idEquipoSeleccionado ?? widget.widget.idEquipo),
        idOrdenEquipo: Value(_idOrdenEquipoSeleccionado),
        descripcion: Value(desc),
        origen: const Value('PERSONALIZADO'),
        prioridad: Value(_prioridadCustom),
        estado: const Value('PENDIENTE'),
        observaciones: Value(obs.isNotEmpty ? obs : null),
        fechaCreacion: Value(DateTime.now()),
        isDirty: const Value(true),
      );

      await db.insertOrdenPendiente(nuevo);
      _descCustomController.clear();
      _obsCustomController.clear();
      widget.onCambio();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('✓ Hallazgo personalizado registrado'),
            backgroundColor: Colors.amber.shade900,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categorias = _obtenerCategoriasDisponibles();
    final itemsFiltrados = _catalogoItems.where((item) {
      final matchCat =
          _filtroCategoria == 'TODAS' || item.categoria == _filtroCategoria;
      final matchSearch = _busqueda.isEmpty ||
          item.descripcion.toLowerCase().contains(_busqueda.toLowerCase()) ||
          (item.codigo?.toLowerCase().contains(_busqueda.toLowerCase()) ?? false);
      return matchCat && matchSearch;
    }).toList();

    final isMultiEquipo = widget.widget.equipos != null &&
        widget.widget.equipos!.length > 1;

    return DefaultTabController(
      length: 2,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.90,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Handle bar
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Header del Modal
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.assignment_late_rounded,
                            color: Colors.amber.shade900, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Gestión de Pendientes',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          Text(
                            'Orden #${widget.widget.idOrdenBackend ?? widget.widget.idOrdenLocal}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: _isRefreshingCatalogo
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.sync, color: Colors.blue, size: 22),
                        tooltip: 'Actualizar catálogo desde servidor',
                        onPressed: _isRefreshingCatalogo ? null : _actualizarCatalogoManual,
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 24),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Selector Multi-Equipo Prominente (si la orden tiene múltiples máquinas)
            if (isMultiEquipo)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.precision_manufacturing_outlined,
                            size: 16, color: Colors.blue.shade800),
                        const SizedBox(width: 6),
                        Text(
                          '¿A QUÉ EQUIPO ASIGNAR EL HALLAZGO?',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.4,
                            color: Colors.blue.shade900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: const Text('🌐 General de la Orden'),
                              selected: _idOrdenEquipoSeleccionado == null,
                              onSelected: (_) {
                                setState(() {
                                  _idOrdenEquipoSeleccionado = null;
                                  _idEquipoSeleccionado = widget.widget.idEquipo;
                                });
                              },
                              selectedColor: Colors.amber.shade800,
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                fontSize: 11,
                                fontWeight: _idOrdenEquipoSeleccionado == null
                                    ? FontWeight.bold
                                    : FontWeight.w600,
                                color: _idOrdenEquipoSeleccionado == null
                                    ? Colors.white
                                    : Colors.amber.shade900,
                              ),
                              side: BorderSide(
                                color: _idOrdenEquipoSeleccionado == null
                                    ? Colors.amber.shade800
                                    : Colors.amber.shade300,
                              ),
                              showCheckmark: _idOrdenEquipoSeleccionado == null,
                              checkmarkColor: Colors.white,
                            ),
                          ),
                          ...widget.widget.equipos!.map((eq) {
                            final isSelected =
                                _idOrdenEquipoSeleccionado == eq.idOrdenEquipo;
                            final label = (eq.nombreSistema != null &&
                                    eq.nombreSistema!.isNotEmpty)
                                ? eq.nombreSistema!
                                : (eq.nombreEquipo ?? 'Equipo ${eq.ordenSecuencia}');

                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text('#${eq.ordenSecuencia} · $label'),
                                selected: isSelected,
                                onSelected: (_) => _seleccionarEquipo(eq),
                                selectedColor: Colors.blue.shade700,
                                backgroundColor: Colors.white,
                                labelStyle: TextStyle(
                                  fontSize: 11,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.w600,
                                  color: isSelected
                                      ? Colors.white
                                      : Colors.blue.shade900,
                                ),
                                side: BorderSide(
                                  color: isSelected
                                      ? Colors.blue.shade700
                                      : Colors.blue.shade200,
                                ),
                                showCheckmark: isSelected,
                                checkmarkColor: Colors.white,
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            // TabBar para alternar entre Catálogo y Hallazgo Personalizado
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                labelColor: Colors.amber.shade900,
                unselectedLabelColor: Colors.grey.shade600,
                labelStyle:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                tabs: [
                  Tab(
                    icon: const Icon(Icons.auto_stories_rounded, size: 18),
                    text: 'Catálogo Sugerido (${_catalogoItems.length})',
                  ),
                  const Tab(
                    icon: Icon(Icons.edit_note_rounded, size: 18),
                    text: 'Hallazgo Personalizado',
                  ),
                ],
              ),
            ),

            // TabBarView
            Expanded(
              child: TabBarView(
                children: [
                  // TAB 1: Catálogo Sugerido
                  _buildTabCatalogo(itemsFiltrados, categorias),

                  // TAB 2: Hallazgo Personalizado
                  _buildTabPersonalizado(),
                ],
              ),
            ),

            // Barra Inferior de Cierre Rápido
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Registrados en orden: ${widget.pendientesActuales.length}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.grey.shade900,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Listo / Finalizar',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabCatalogo(
      List<PendientesCatalogoData> itemsFiltrados, List<String> categorias) {
    return Column(
      children: [
        // Buscador
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
          child: TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _busqueda = val.trim()),
            decoration: InputDecoration(
              hintText: 'Buscar por palabra clave o código (batería, filtro, fuga)...',
              hintStyle: TextStyle(fontSize: 12, color: Colors.grey.shade400),
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _busqueda.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _busqueda = '');
                      },
                    )
                  : null,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
        ),

        // Filtros de Categoría Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: categorias.map((cat) {
              final isSelected = _filtroCategoria == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: FilterChip(
                  label: Text(cat),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _filtroCategoria = cat),
                  backgroundColor: Colors.grey.shade100,
                  selectedColor: Colors.amber.shade200,
                  checkmarkColor: Colors.amber.shade900,
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                    color:
                        isSelected ? Colors.amber.shade900 : Colors.grey.shade800,
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                ),
              );
            }).toList(),
          ),
        ),

        const Divider(height: 12),

        // Lista de Plantillas con botón de adición rápida
        Expanded(
          child: itemsFiltrados.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off_rounded,
                          size: 40, color: Colors.grey.shade400),
                      const SizedBox(height: 8),
                      Text(
                        'No se encontraron coincidencias en el catálogo',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Puede usar la pestaña "Hallazgo Personalizado" para crearlo.',
                        style: TextStyle(
                            color: Colors.grey.shade400, fontSize: 11),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  itemCount: itemsFiltrados.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = itemsFiltrados[index];
                    return _CardItemCatalogo(
                      item: item,
                      onAgregar: (prio) =>
                          _agregarPendienteDesdeCatalogo(item, prio),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildTabPersonalizado() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Descripción del Hallazgo / Pendiente *',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.black87),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _descCustomController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText:
                  'Ej: Se evidencia fisura en codo de descarga, requiere cambio de empaque y reapriete...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            'Nivel de Prioridad',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.black87),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildPrioridadChip('NORMAL', 'Normal'),
              const SizedBox(width: 8),
              _buildPrioridadChip('ALTA', 'Alta'),
              const SizedBox(width: 8),
              _buildPrioridadChip('URGENTE', 'Urgente'),
            ],
          ),
          const SizedBox(height: 16),

          const Text(
            'Observaciones Técnicas / Referencia (Opcional)',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.black87),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _obsCustomController,
            maxLines: 2,
            decoration: InputDecoration(
              hintText:
                  'Indicar modelo, medidas, marca o detalles para cotización...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.check_circle_outline, size: 20),
              label: Text(
                _isSaving ? 'Guardando...' : 'Guardar Hallazgo Personalizado',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.amber.shade800,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _isSaving ? null : _guardarPendientePersonalizado,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrioridadChip(String valor, String label) {
    final isSelected = _prioridadCustom == valor;
    Color chipColor;
    if (valor == 'URGENTE') {
      chipColor = Colors.red.shade700;
    } else if (valor == 'ALTA') {
      chipColor = Colors.orange.shade800;
    } else {
      chipColor = Colors.amber.shade800;
    }

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _prioridadCustom = valor),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? chipColor : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? chipColor : Colors.grey.shade300,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? Colors.white : Colors.black87,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tarjeta táctil interactiva para cada ítem del catálogo con selector rápido de prioridad
class _CardItemCatalogo extends StatefulWidget {
  final PendientesCatalogoData item;
  final Function(String prioridad) onAgregar;

  const _CardItemCatalogo({
    required this.item,
    required this.onAgregar,
  });

  @override
  State<_CardItemCatalogo> createState() => _CardItemCatalogoState();
}

class _CardItemCatalogoState extends State<_CardItemCatalogo> {
  String _prioridad = 'NORMAL';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Text(
                  widget.item.categoria ?? 'GENERAL',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: Colors.amber.shade900,
                  ),
                ),
              ),
              if (widget.item.codigo != null) ...[
                const SizedBox(width: 6),
                Text(
                  widget.item.codigo!,
                  style: TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(
            widget.item.descripcion,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              // Selector compacto de prioridad
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: ['NORMAL', 'ALTA', 'URGENTE'].map((prio) {
                    final isSel = _prioridad == prio;
                    return InkWell(
                      onTap: () => setState(() => _prioridad = prio),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: isSel ? Colors.amber.shade700 : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          prio == 'NORMAL'
                              ? 'Norm'
                              : prio == 'ALTA'
                                  ? 'Alta'
                                  : 'Urg',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight:
                                isSel ? FontWeight.bold : FontWeight.w500,
                            color: isSel ? Colors.white : Colors.grey.shade700,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const Spacer(),
              // Botón rápido de agregar
              FilledButton.tonalIcon(
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Agregar',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.amber.shade100,
                  foregroundColor: Colors.amber.shade900,
                  visualDensity: VisualDensity.compact,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => widget.onAgregar(_prioridad),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
