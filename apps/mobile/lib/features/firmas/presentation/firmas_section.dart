import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../data/firma_service.dart';
import 'firma_bottom_sheet.dart';

/// Sección de Firmas Digitales para el Tab Resumen
///
/// Muestra dos tarjetas grandes: TÉCNICO y CLIENTE
/// Con estado visual: "Pendiente" (Gris/Rojo) vs "Firmado" (Verde)
class FirmasSection extends ConsumerStatefulWidget {
  final int idOrden;
  final VoidCallback? onFirmaGuardada;

  const FirmasSection({super.key, required this.idOrden, this.onFirmaGuardada});

  @override
  ConsumerState<FirmasSection> createState() => _FirmasSectionState();
}

class _FirmasSectionState extends ConsumerState<FirmasSection> {
  Firma? _firmaTecnico;
  Firma? _firmaCliente;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargarFirmas();
  }

  Future<void> _cargarFirmas() async {
    final service = ref.read(firmaServiceProvider);

    final tecnico = await service.getFirmaByTipo(widget.idOrden, 'TECNICO');
    final cliente = await service.getFirmaByTipo(widget.idOrden, 'CLIENTE');

    if (mounted) {
      setState(() {
        _firmaTecnico = tecnico;
        _firmaCliente = cliente;
        _isLoading = false;
      });
    }
  }

  Future<bool> _abrirCaptura(
    String tipoFirma, {
    String? nombreInicial,
    String? cargoInicial,
  }) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => FirmaBottomSheet(
        idOrden: widget.idOrden,
        tipoFirma: tipoFirma,
        nombreInicial: nombreInicial,
        cargoInicial: cargoInicial,
      ),
    );

    if (result == true) {
      await _cargarFirmas();
      widget.onFirmaGuardada?.call();
      return true;
    }
    return false;
  }

  Future<void> _mostrarMenuFirma(String tipoFirma, Firma firma) async {
    final esTecnico = tipoFirma == 'TECNICO';
    final colorRol = esTecnico ? Colors.blue.shade700 : Colors.purple.shade700;
    final tituloRol = esTecnico ? 'Firma Técnico' : 'Firma Cliente';

    final accion = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: firma.rutaLocal.isNotEmpty
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(7),
                            child: Image.file(
                              File(firma.rutaLocal),
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) =>
                                  Icon(Icons.draw, color: colorRol),
                            ),
                          )
                        : Icon(Icons.draw, color: colorRol),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tituloRol,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: colorRol,
                          ),
                        ),
                        Text(
                          firma.nombreFirmante ?? 'Sin nombre',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (firma.cargoFirmante != null &&
                            firma.cargoFirmante!.trim().isNotEmpty)
                          Text(
                            firma.cargoFirmante!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                leading: CircleAvatar(
                  backgroundColor: Colors.blue.shade50,
                  child: Icon(
                    Icons.visibility_outlined,
                    color: Colors.blue.shade700,
                  ),
                ),
                title: const Text(
                  'Visualizar firma',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text('Ampliar trazo y ver datos registrados'),
                onTap: () => Navigator.pop(ctx, 'ver'),
              ),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                leading: CircleAvatar(
                  backgroundColor: Colors.teal.shade50,
                  child: Icon(
                    Icons.edit_outlined,
                    color: Colors.teal.shade700,
                  ),
                ),
                title: const Text(
                  'Editar',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text(
                  'Modificar nombre o cargo conservando la firma actual',
                ),
                onTap: () => Navigator.pop(ctx, 'editar'),
              ),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                leading: CircleAvatar(
                  backgroundColor: Colors.orange.shade50,
                  child: Icon(
                    Icons.refresh_rounded,
                    color: Colors.orange.shade700,
                  ),
                ),
                title: Text(
                  'Rehacer',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade900,
                  ),
                ),
                subtitle: const Text(
                  'Dibujar nuevamente (conserva la previa hasta guardar)',
                ),
                onTap: () => Navigator.pop(ctx, 'rehacer'),
              ),
            ],
          ),
        ),
      ),
    );

    if (!mounted || accion == null) return;
    if (accion == 'ver') {
      await _visualizarFirma(tipoFirma, firma);
    } else if (accion == 'editar') {
      await _editarDatosFirma(tipoFirma, firma);
    } else if (accion == 'rehacer') {
      await _rehacerFirma(tipoFirma, firma);
    }
  }

  Future<void> _visualizarFirma(String tipoFirma, Firma firma) async {
    final esTecnico = tipoFirma == 'TECNICO';
    final colorRol = esTecnico ? Colors.blue.shade700 : Colors.purple.shade700;
    final tituloRol = esTecnico ? 'Firma Técnico' : 'Firma Cliente';

    final siguienteAccion = await showDialog<String>(
      context: context,
      builder: (ctx) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              color: colorRol,
              child: Row(
                children: [
                  Icon(
                    esTecnico ? Icons.engineering : Icons.person,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      tituloRol,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close, color: Colors.white),
                    tooltip: 'Cerrar',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    height: 220,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300, width: 1.5),
                    ),
                    child: firma.rutaLocal.isNotEmpty
                        ? InteractiveViewer(
                            minScale: 1.0,
                            maxScale: 4.0,
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Image.file(
                                  File(firma.rutaLocal),
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, _, _) => const Center(
                                    child: Text('No se pudo cargar la imagen'),
                                  ),
                                ),
                              ),
                            ),
                          )
                        : const Center(child: Text('Sin imagen de firma')),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Firmante: ',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                firma.nombreFirmante ?? 'Sin nombre',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (firma.cargoFirmante != null &&
                            firma.cargoFirmante!.trim().isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(
                                'Cargo: ',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  firma.cargoFirmante!,
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              'Registrada: ',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              _formatearFecha(firma.fechaFirma),
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade700,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.pop(ctx, 'editar'),
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          label: const Text('Editar'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.pop(ctx, 'rehacer'),
                          icon: Icon(
                            Icons.refresh_rounded,
                            size: 18,
                            color: Colors.orange.shade700,
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.orange.shade800,
                            side: BorderSide(color: Colors.orange.shade300),
                          ),
                          label: const Text('Rehacer'),
                        ),
                      ),
                    ],
                  ),
                ],
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (!mounted || siguienteAccion == null) return;
    if (siguienteAccion == 'editar') {
      await _editarDatosFirma(tipoFirma, firma);
    } else if (siguienteAccion == 'rehacer') {
      await _rehacerFirma(tipoFirma, firma);
    }
  }

  Future<void> _editarDatosFirma(String tipoFirma, Firma firma) async {
    final resultado = await showDialog<_DatosFirmanteResult>(
      context: context,
      builder: (ctx) => _EditarDatosFirmaDialog(
        tipoFirma: tipoFirma,
        nombreInicial: firma.nombreFirmante ?? '',
        cargoInicial: firma.cargoFirmante ?? '',
      ),
    );

    if (!mounted || resultado == null) return;
    final service = ref.read(firmaServiceProvider);
    final ok = await service.actualizarDatosFirma(
      idFirma: firma.idLocal,
      nombreFirmante: resultado.nombre,
      cargoFirmante: resultado.cargo,
    );

    if (!mounted) return;
    if (ok) {
      await _cargarFirmas();
      widget.onFirmaGuardada?.call();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Datos del firmante actualizados'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudieron actualizar los datos de la firma'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// ✅ Rehacer firma existente de forma atómica:
  /// NO elimina la firma previa hasta que el usuario guarde efectivamente la nueva.
  /// Si cierra o desliza hacia abajo sin guardar, la firma previa permanece intacta.
  Future<void> _rehacerFirma(String tipoFirma, Firma firma) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Rehacer firma?'),
        content: Text(
          'La firma actual de ${firma.nombreFirmante ?? tipoFirma} será reemplazada únicamente cuando guarde la nueva firma.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Rehacer'),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      final guardada = await _abrirCaptura(
        tipoFirma,
        nombreInicial: firma.nombreFirmante,
        cargoInicial: firma.cargoFirmante,
      );
      if (guardada) {
        final service = ref.read(firmaServiceProvider);
        await service.eliminarFirma(firma.idLocal);
        await _cargarFirmas();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(Icons.draw, color: Colors.purple.shade700, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Firmas Digitales',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
                const Spacer(),
                _buildStatusBadge(),
              ],
            ),
            const SizedBox(height: 16),

            // Tarjeta Técnico
            _buildFirmaCard(
              tipoFirma: 'TECNICO',
              firma: _firmaTecnico,
              icono: Icons.engineering,
              colorBase: Colors.blue,
              titulo: 'Firma Técnico',
            ),
            const SizedBox(height: 12),

            // Tarjeta Cliente
            _buildFirmaCard(
              tipoFirma: 'CLIENTE',
              firma: _firmaCliente,
              icono: Icons.person,
              colorBase: Colors.purple,
              titulo: 'Firma Cliente',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    final completado = _firmaTecnico != null && _firmaCliente != null;
    final parcial = _firmaTecnico != null || _firmaCliente != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: completado
            ? Colors.green.shade100
            : (parcial ? Colors.orange.shade100 : Colors.red.shade100),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            completado
                ? Icons.check_circle
                : (parcial ? Icons.pending : Icons.warning),
            size: 16,
            color: completado
                ? Colors.green.shade700
                : (parcial ? Colors.orange.shade700 : Colors.red.shade700),
          ),
          const SizedBox(width: 4),
          Text(
            completado ? 'Completo' : (parcial ? '1/2' : 'Pendiente'),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: completado
                  ? Colors.green.shade700
                  : (parcial ? Colors.orange.shade700 : Colors.red.shade700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFirmaCard({
    required String tipoFirma,
    required Firma? firma,
    required IconData icono,
    required Color colorBase,
    required String titulo,
  }) {
    final tieneFirma = firma != null;

    return InkWell(
      onTap: tieneFirma
          ? () => _mostrarMenuFirma(tipoFirma, firma)
          : () => _abrirCaptura(tipoFirma),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: tieneFirma ? Colors.green.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: tieneFirma ? Colors.green.shade300 : Colors.grey.shade300,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            // Ícono o Miniatura
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: tieneFirma ? Colors.white : colorBase.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: tieneFirma
                      ? Colors.green.shade200
                      : colorBase.withValues(alpha: 0.3),
                ),
              ),
              child: tieneFirma && firma.rutaLocal.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(7),
                      child: Image.file(
                        File(firma.rutaLocal),
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => Icon(
                          Icons.draw,
                          color: Colors.green.shade700,
                          size: 28,
                        ),
                      ),
                    )
                  : Icon(icono, color: colorBase, size: 28),
            ),
            const SizedBox(width: 16),

            // Información
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titulo,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (tieneFirma) ...[
                    Text(
                      firma.nombreFirmante ?? 'Sin nombre',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 14,
                      ),
                    ),
                    if (firma.cargoFirmante != null)
                      Text(
                        firma.cargoFirmante!,
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 12,
                        ),
                      ),
                    Text(
                      _formatearFecha(firma.fechaFirma),
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 11,
                      ),
                    ),
                  ] else
                    Text(
                      'Toque para firmar',
                      style: TextStyle(
                        color: colorBase,
                        fontStyle: FontStyle.italic,
                        fontSize: 13,
                      ),
                    ),
                ],
              ),
            ),

            // Estado / Acción
            Column(
              children: [
                Icon(
                  tieneFirma ? Icons.check_circle : Icons.arrow_forward_ios,
                  color: tieneFirma
                      ? Colors.green.shade600
                      : Colors.grey.shade400,
                  size: tieneFirma ? 28 : 20,
                ),
                if (tieneFirma) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: Text(
                      'Ver · Editar',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.green.shade800,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatearFecha(DateTime fecha) {
    final now = DateTime.now();
    final hoy = DateTime(now.year, now.month, now.day);
    final fechaDia = DateTime(fecha.year, fecha.month, fecha.day);

    if (fechaDia == hoy) {
      return 'Hoy ${fecha.hour.toString().padLeft(2, '0')}:${fecha.minute.toString().padLeft(2, '0')}';
    }
    return '${fecha.day}/${fecha.month}/${fecha.year} ${fecha.hour.toString().padLeft(2, '0')}:${fecha.minute.toString().padLeft(2, '0')}';
  }
}

class _DatosFirmanteResult {
  final String nombre;
  final String? cargo;

  const _DatosFirmanteResult({required this.nombre, this.cargo});
}

class _EditarDatosFirmaDialog extends StatefulWidget {
  final String tipoFirma;
  final String nombreInicial;
  final String cargoInicial;

  const _EditarDatosFirmaDialog({
    required this.tipoFirma,
    required this.nombreInicial,
    required this.cargoInicial,
  });

  @override
  State<_EditarDatosFirmaDialog> createState() => _EditarDatosFirmaDialogState();
}

class _EditarDatosFirmaDialogState extends State<_EditarDatosFirmaDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nombreCtrl;
  late final TextEditingController _cargoCtrl;

  @override
  void initState() {
    super.initState();
    _nombreCtrl = TextEditingController(text: widget.nombreInicial);
    _cargoCtrl = TextEditingController(text: widget.cargoInicial);
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _cargoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final esCliente = widget.tipoFirma == 'CLIENTE';

    return AlertDialog(
      title: Text('Editar datos (${esCliente ? "Cliente" : "Técnico"})'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nombreCtrl,
              decoration: const InputDecoration(
                labelText: 'Nombre del firmante *',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (val) =>
                  (val == null || val.trim().isEmpty)
                      ? 'El nombre es obligatorio'
                      : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cargoCtrl,
              decoration: InputDecoration(
                labelText: esCliente ? 'Cargo *' : 'Cargo (opcional)',
                border: const OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
              validator: esCliente
                  ? (val) =>
                        (val == null || val.trim().isEmpty)
                            ? 'El cargo es obligatorio para el cliente'
                            : null
                  : null,
            ),
          ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () {
            if (_formKey.currentState?.validate() != true) return;
            Navigator.pop(
              context,
              _DatosFirmanteResult(
                nombre: _nombreCtrl.text.trim(),
                cargo: _cargoCtrl.text.trim().isNotEmpty
                    ? _cargoCtrl.text.trim()
                    : null,
              ),
            );
          },
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}
