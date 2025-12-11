import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncfusion_flutter_signaturepad/signaturepad.dart';

import '../data/firma_service.dart';

/// BottomSheet para capturar firma digital
///
/// Uso:
/// ```dart
/// await showModalBottomSheet(
///   context: context,
///   isScrollControlled: true,
///   builder: (context) => FirmaBottomSheet(
///     idOrden: ordenId,
///     tipoFirma: 'TECNICO', // o 'CLIENTE'
///   ),
/// );
/// ```
class FirmaBottomSheet extends ConsumerStatefulWidget {
  final int idOrden;
  final String tipoFirma; // TECNICO o CLIENTE

  const FirmaBottomSheet({
    super.key,
    required this.idOrden,
    required this.tipoFirma,
  });

  @override
  ConsumerState<FirmaBottomSheet> createState() => _FirmaBottomSheetState();
}

class _FirmaBottomSheetState extends ConsumerState<FirmaBottomSheet> {
  final GlobalKey<SfSignaturePadState> _signaturePadKey = GlobalKey();
  final TextEditingController _nombreController = TextEditingController();
  final TextEditingController _cargoController = TextEditingController();

  bool _firmaDibujada = false;
  bool _guardando = false;

  @override
  void dispose() {
    _nombreController.dispose();
    _cargoController.dispose();
    super.dispose();
  }

  void _limpiarCanvas() {
    _signaturePadKey.currentState?.clear();
    setState(() {
      _firmaDibujada = false;
    });
  }

  Future<void> _guardarFirma() async {
    // Validaciones
    if (_nombreController.text.trim().isEmpty) {
      _mostrarError('El nombre es obligatorio');
      return;
    }

    if (widget.tipoFirma == 'CLIENTE' && _cargoController.text.trim().isEmpty) {
      _mostrarError('El cargo es obligatorio para el cliente');
      return;
    }

    if (!_firmaDibujada) {
      _mostrarError('Por favor, dibuje su firma');
      return;
    }

    setState(() => _guardando = true);

    try {
      // Obtener imagen del canvas
      final ui.Image image = await _signaturePadKey.currentState!.toImage();
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

      if (byteData == null) {
        _mostrarError('Error al procesar la firma');
        setState(() => _guardando = false);
        return;
      }

      final pngBytes = byteData.buffer.asUint8List();

      // Guardar firma
      final service = ref.read(firmaServiceProvider);
      final idFirma = await service.guardarFirma(
        idOrden: widget.idOrden,
        tipoFirma: widget.tipoFirma,
        pngBytes: pngBytes,
        nombreFirmante: _nombreController.text.trim(),
        cargoFirmante: _cargoController.text.trim().isNotEmpty
            ? _cargoController.text.trim()
            : null,
      );

      if (idFirma != null && mounted) {
        Navigator.of(context).pop(true); // Retornar true indica éxito
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Firma ${widget.tipoFirma.toLowerCase()} guardada'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        _mostrarError('Error al guardar la firma');
      }
    } catch (e) {
      _mostrarError('Error: $e');
    } finally {
      if (mounted) {
        setState(() => _guardando = false);
      }
    }
  }

  void _mostrarError(String mensaje) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(mensaje), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    final esTecnico = widget.tipoFirma == 'TECNICO';
    final colorPrimario = esTecnico ? Colors.blue : Colors.purple;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorPrimario,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  esTecnico ? Icons.engineering : Icons.person,
                  color: Colors.white,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Firma ${esTecnico ? "Técnico" : "Cliente"}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Orden #${widget.idOrden}',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
          ),

          // Contenido
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Campo Nombre
                  TextField(
                    controller: _nombreController,
                    decoration: InputDecoration(
                      labelText: 'Nombre Completo *',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                    textCapitalization: TextCapitalization.words,
                  ),
                  const SizedBox(height: 16),

                  // Campo Cargo (solo para cliente)
                  if (!esTecnico)
                    Column(
                      children: [
                        TextField(
                          controller: _cargoController,
                          decoration: InputDecoration(
                            labelText: 'Cargo *',
                            prefixIcon: const Icon(Icons.work_outline),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                          ),
                          textCapitalization: TextCapitalization.words,
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),

                  // Canvas de firma
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: colorPrimario, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: colorPrimario.withOpacity(0.1),
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(10),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.draw, color: colorPrimario, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Dibuje su firma aquí',
                                style: TextStyle(
                                  color: colorPrimario,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          height: 200,
                          child: SfSignaturePad(
                            key: _signaturePadKey,
                            backgroundColor: Colors.white,
                            strokeColor: Colors.black,
                            minimumStrokeWidth: 1.5,
                            maximumStrokeWidth: 4.0,
                            onDrawStart: () {
                              setState(() {
                                _firmaDibujada = true;
                              });
                              return false;
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Indicador de firma dibujada
                  if (_firmaDibujada)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.check_circle,
                            color: Colors.green.shade700,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Firma capturada',
                            style: TextStyle(
                              color: Colors.green.shade700,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Botones de acción
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _limpiarCanvas,
                          icon: const Icon(Icons.refresh),
                          label: const Text('LIMPIAR'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: _guardando ? null : _guardarFirma,
                          icon: _guardando
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.save),
                          label: Text(
                            _guardando ? 'GUARDANDO...' : 'GUARDAR FIRMA',
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorPrimario,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
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
    );
  }
}
