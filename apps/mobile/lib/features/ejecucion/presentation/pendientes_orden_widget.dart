import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Widget interactivo para gestión inteligente de Pendientes Técnicos por Orden
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

  Future<void> _agregarPendienteCatalogo(PendientesCatalogoData cat) async {
    final db = ref.read(databaseProvider);
    final nuevo = OrdenesPendientesCompanion(
      idOrden: Value(widget.idOrdenLocal),
      idOrdenBackend: Value(widget.idOrdenBackend),
      idCliente: Value(widget.idCliente),
      idEquipo: Value(widget.idEquipo),
      idOrdenEquipo: Value(widget.idOrdenEquipo),
      idPendienteCatalogo: Value(cat.id),
      descripcion: Value(cat.descripcion),
      origen: const Value('CATALOGO'),
      prioridad: const Value('NORMAL'),
      estado: const Value('PENDIENTE'),
      fechaCreacion: Value(DateTime.now()),
      isDirty: const Value(true),
    );

    await db.insertOrdenPendiente(nuevo);
    await _cargarDatos();
    widget.onPendientesChanged?.call();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Pendiente añadido: ${cat.descripcion}'),
          backgroundColor: Colors.amber.shade800,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _eliminarPendiente(OrdenesPendiente p) async {
    final db = ref.read(databaseProvider);
    await db.deleteOrdenPendiente(p.idLocal);
    await _cargarDatos();
    widget.onPendientesChanged?.call();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pendiente eliminado'),
          duration: Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _abrirDialogoNuevoPendiente() async {
    final descController = TextEditingController();
    final obsController = TextEditingController();
    String prioridadSeleccionada = 'NORMAL';
    int? idOrdenEquipoSeleccionado = widget.idOrdenEquipo;

    final resultado = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Icon(Icons.add_circle, color: Colors.amber.shade700),
                const SizedBox(width: 8),
                const Text('Nuevo Pendiente', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Descripción del pendiente *',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: descController,
                    maxLines: 2,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Ej: Cambiar empaque de culata, fuga de aceite...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Prioridad',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: prioridadSeleccionada,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                    items: const [
                      DropdownMenuItem(value: 'NORMAL', child: Text('Normal (Recomendado)')),
                      DropdownMenuItem(value: 'ALTA', child: Text('Alta')),
                      DropdownMenuItem(value: 'URGENTE', child: Text('Urgente')),
                      DropdownMenuItem(value: 'EMERGENCIA', child: Text('Emergencia')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => prioridadSeleccionada = val);
                    },
                  ),
                  if (widget.equipos != null && widget.equipos!.length > 1) ...[
                    const SizedBox(height: 14),
                    const Text(
                      'Equipo asignado',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      value: idOrdenEquipoSeleccionado,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                      ),
                      hint: const Text('Seleccionar equipo...'),
                      items: widget.equipos!.map((eq) {
                        final nombreEq = (eq.nombreSistema != null && eq.nombreSistema!.isNotEmpty)
                            ? eq.nombreSistema!
                            : 'Equipo ${eq.ordenSecuencia}';
                        return DropdownMenuItem<int>(
                          value: eq.idOrdenEquipo,
                          child: Text(
                            nombreEq,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setDialogState(() => idOrdenEquipoSeleccionado = val);
                      },
                    ),
                  ],
                  const SizedBox(height: 14),
                  const Text(
                    'Observaciones técnicas (opcional)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: obsController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'Detalles adicionales...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.amber.shade800,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  if (descController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Por favor ingrese una descripción'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }
                  Navigator.pop(ctx, true);
                },
                child: const Text('Adicionar'),
              ),
            ],
          );
        },
      ),
    );

    if (resultado == true && descController.text.trim().isNotEmpty) {
      final db = ref.read(databaseProvider);
      final nuevo = OrdenesPendientesCompanion(
        idOrden: Value(widget.idOrdenLocal),
        idOrdenBackend: Value(widget.idOrdenBackend),
        idCliente: Value(widget.idCliente),
        idEquipo: Value(widget.idEquipo),
        idOrdenEquipo: Value(idOrdenEquipoSeleccionado),
        descripcion: Value(descController.text.trim()),
        origen: const Value('MANUAL'),
        prioridad: Value(prioridadSeleccionada),
        estado: const Value('PENDIENTE'),
        observaciones: Value(obsController.text.trim().isNotEmpty ? obsController.text.trim() : null),
        fechaCreacion: Value(DateTime.now()),
        isDirty: const Value(true),
      );

      await db.insertOrdenPendiente(nuevo);
      await _cargarDatos();
      widget.onPendientesChanged?.call();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Pendiente personalizado registrado'),
            backgroundColor: Colors.amber.shade800,
          ),
        );
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

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.amber.shade300, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.amber.shade100.withOpacity(0.4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.amber.shade400),
                ),
                child: Icon(Icons.assignment_late_outlined, color: Colors.amber.shade900, size: 22),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TRABAJOS / REPUESTOS PENDIENTES',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        letterSpacing: 0.3,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      'Registre requerimientos para cotizar o agendar post-servicio',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _pendientes.isEmpty ? Colors.green.shade50 : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _pendientes.isEmpty ? Colors.green.shade300 : Colors.amber.shade400,
                  ),
                ),
                child: Text(
                  _pendientes.isEmpty ? '0' : '${_pendientes.length}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: _pendientes.isEmpty ? Colors.green.shade800 : Colors.amber.shade900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Search / Autocomplete Bar + Botón (+)
          Row(
            children: [
              Expanded(
                child: Autocomplete<PendientesCatalogoData>(
                  displayStringForOption: (item) => item.descripcion,
                  optionsBuilder: (TextEditingValue textEditingValue) {
                    if (textEditingValue.text.isEmpty) {
                      return _catalogo.take(8);
                    }
                    final query = textEditingValue.text.toLowerCase();
                    return _catalogo.where(
                      (item) => item.descripcion.toLowerCase().contains(query),
                    );
                  },
                  onSelected: (PendientesCatalogoData seleccion) {
                    _agregarPendienteCatalogo(seleccion);
                  },
                  fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                    return TextField(
                      controller: controller,
                      focusNode: focusNode,
                      decoration: InputDecoration(
                        hintText: 'Buscar sugerencia en catálogo...',
                        hintStyle: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        prefixIcon: Icon(Icons.search, size: 18, color: Colors.amber.shade800),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.amber.shade700, width: 1.5),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              // Botón (+) para personalizado
              Material(
                color: Colors.amber.shade700,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  onTap: _abrirDialogoNuevoPendiente,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.all(11),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, color: Colors.white, size: 20),
                        SizedBox(width: 4),
                        Text(
                          'Nuevo',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Lista de Pendientes Registrados
          if (_pendientes.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.green.shade50.withOpacity(0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.green.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Sin pendientes registrados. La orden se completará al 100% al día.',
                      style: TextStyle(
                        fontSize: 12,
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
              separatorBuilder: (context, index) => const SizedBox(height: 6),
              itemBuilder: (context, index) {
                final p = _pendientes[index];
                final colorPrio = _getColorPrioridad(p.prioridad);

                // Resolver nombre equipo si multi-equipo
                String? nombreEquipo;
                if (widget.equipos != null && p.idOrdenEquipo != null) {
                  final eq = widget.equipos!.where((e) => e.idOrdenEquipo == p.idOrdenEquipo).firstOrNull;
                  if (eq != null) {
                    nombreEquipo = (eq.nombreSistema != null && eq.nombreSistema!.isNotEmpty)
                        ? eq.nombreSistema!
                        : 'Equipo ${eq.ordenSecuencia}';
                  }
                }

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
                        height: 32,
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
                                    color: colorPrio.withOpacity(0.12),
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
                                    color: Colors.grey.shade200,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    p.origen == 'CATALOGO' ? 'Catálogo' : 'Personalizado',
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ),
                                if (nombreEquipo != null) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      nombreEquipo,
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.blue.shade800,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (p.observaciones != null && p.observaciones!.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text(
                                p.observaciones!,
                                style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey.shade600),
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
