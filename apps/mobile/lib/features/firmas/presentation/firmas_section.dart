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

  Future<void> _abrirCaptura(String tipoFirma) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          FirmaBottomSheet(idOrden: widget.idOrden, tipoFirma: tipoFirma),
    );

    if (result == true) {
      await _cargarFirmas();
      widget.onFirmaGuardada?.call();
    }
  }

  /// ✅ Rehacer firma existente con confirmación
  Future<void> _rehacerFirma(String tipoFirma, Firma firma) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Rehacer firma?'),
        content: Text(
          'La firma actual de ${firma.nombreFirmante ?? tipoFirma} será reemplazada.',
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
      // Eliminar firma anterior
      final service = ref.read(firmaServiceProvider);
      await service.eliminarFirma(firma.idLocal);

      // Abrir captura de nueva firma
      await _abrirCaptura(tipoFirma);
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
          ? () => _rehacerFirma(tipoFirma, firma)
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
                color: tieneFirma ? Colors.white : colorBase.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: tieneFirma
                      ? Colors.green.shade200
                      : colorBase.withOpacity(0.3),
                ),
              ),
              child: tieneFirma && firma.rutaLocal.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(7),
                      child: Image.file(
                        File(firma.rutaLocal),
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Icon(
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
                  Text(
                    'Rehacer',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.orange.shade700,
                      fontWeight: FontWeight.w500,
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
