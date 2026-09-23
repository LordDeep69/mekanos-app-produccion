import 'dart:typed_data';
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

  Uint8List? _firmaBytes;
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
      _firmaBytes = null;
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
      Uint8List pngBytes;
      if (_firmaBytes != null) {
        pngBytes = _firmaBytes!;
      } else {
        // Obtener imagen del canvas
        final ui.Image image = await _signaturePadKey.currentState!.toImage();
        final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

        if (byteData == null) {
          _mostrarError('Error al procesar la firma');
          setState(() => _guardando = false);
          return;
        }
        pngBytes = byteData.buffer.asUint8List();
      }

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
        // ✅ FIX 29-ENE-2026: Reducir duración de 4s (default) a 1s
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Firma ${widget.tipoFirma.toLowerCase()} guardada'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 1),
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
                          color: Colors.white.withValues(alpha: 0.8),
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
                            color: colorPrimario.withValues(alpha: 0.1),
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
                              const Spacer(),
                              // ✅ BOTÓN EXPANDIR (Pantalla Completa)
                              InkWell(
                                onTap: _abrirFirmaFullscreen,
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: colorPrimario,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.open_in_full,
                                        size: 14,
                                        color: Colors.white,
                                      ),
                                      SizedBox(width: 4),
                                      Text(
                                        'EXPANDIR',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          height: 200,
                          child: _firmaBytes != null
                              ? Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    Container(
                                      color: Colors.white,
                                      width: double.infinity,
                                      height: double.infinity,
                                      padding: const EdgeInsets.all(8),
                                      child: Image.memory(
                                        _firmaBytes!,
                                        fit: BoxFit.contain,
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 8,
                                      right: 8,
                                      child: OutlinedButton.icon(
                                        onPressed: _abrirFirmaFullscreen,
                                        style: OutlinedButton.styleFrom(
                                          backgroundColor: Colors.white
                                              .withValues(alpha: 0.9),
                                          foregroundColor: colorPrimario,
                                        ),
                                        icon: const Icon(Icons.edit, size: 14),
                                        label: const Text(
                                          'Volver a firmar',
                                          style: TextStyle(fontSize: 11),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : SfSignaturePad(
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

  Future<void> _abrirFirmaFullscreen() async {
    final colorPrimario = widget.tipoFirma == 'CLIENTE'
        ? Colors.purple.shade700
        : Colors.blue.shade700;

    final bytes = await Navigator.push<Uint8List>(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => FirmaFullscreenScreen(
          titulo:
              'Firma ${widget.tipoFirma == "CLIENTE" ? "del Cliente" : "del Técnico"} - Pantalla Completa',
          colorPrimario: colorPrimario,
        ),
      ),
    );

    if (bytes != null) {
      setState(() {
        _firmaBytes = bytes;
        _firmaDibujada = true;
      });
    }
  }
}

/// Pantalla completa para capturar firma con canvas maximizado
class FirmaFullscreenScreen extends StatefulWidget {
  final String titulo;
  final Color colorPrimario;

  const FirmaFullscreenScreen({
    super.key,
    required this.titulo,
    required this.colorPrimario,
  });

  @override
  State<FirmaFullscreenScreen> createState() => _FirmaFullscreenScreenState();
}

class _FirmaFullscreenScreenState extends State<FirmaFullscreenScreen> {
  final GlobalKey<SfSignaturePadState> _padKey = GlobalKey();
  bool _tieneTrazo = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        backgroundColor: widget.colorPrimario,
        foregroundColor: Colors.white,
        title: Text(
          widget.titulo,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              _padKey.currentState?.clear();
              setState(() => _tieneTrazo = false);
            },
            icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
            label: const Text('Limpiar', style: TextStyle(color: Colors.white)),
          ),
          const SizedBox(width: 4),
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ElevatedButton.icon(
              onPressed: _tieneTrazo
                  ? () async {
                      try {
                        final ui.Image img =
                            await _padKey.currentState!.toImage();
                        final byteData =
                            await img.toByteData(format: ui.ImageByteFormat.png);
                        if (!mounted) return;
                        if (byteData != null) {
                          Navigator.pop(context, byteData.buffer.asUint8List());
                        }
                      } catch (e) {
                        debugPrint('Error capturando firma expandida: $e');
                      }
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: widget.colorPrimario,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              icon: const Icon(Icons.check, size: 18),
              label: const Text(
                'Listo',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: widget.colorPrimario.withValues(alpha: 0.08),
              child: Row(
                children: [
                  Icon(Icons.touch_app, color: widget.colorPrimario, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Use toda el área de la pantalla para realizar una firma clara.',
                      style: TextStyle(
                        color: widget.colorPrimario,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(
                    color: widget.colorPrimario.withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SfSignaturePad(
                    key: _padKey,
                    backgroundColor: Colors.white,
                    strokeColor: Colors.black,
                    minimumStrokeWidth: 2.0,
                    maximumStrokeWidth: 5.0,
                    onDrawStart: () {
                      if (!_tieneTrazo) {
                        setState(() => _tieneTrazo = true);
                      }
                      return false;
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

