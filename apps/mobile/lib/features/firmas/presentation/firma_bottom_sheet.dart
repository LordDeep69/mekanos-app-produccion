import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/user_friendly_error.dart';
import '../data/firma_service.dart';
import 'signature_canvas.dart';

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
  final SignatureCanvasController _canvasController = SignatureCanvasController();
  final TextEditingController _nombreController = TextEditingController();
  final TextEditingController _cargoController = TextEditingController();

  Uint8List? _firmaBytes;
  bool _firmaDibujada = false;
  bool _guardando = false;

  @override
  void initState() {
    super.initState();
    _canvasController.addListener(_onCanvasChange);
  }

  void _onCanvasChange() {
    final tiene = _firmaBytes != null || _canvasController.isNotEmpty;
    if (_firmaDibujada != tiene) {
      setState(() => _firmaDibujada = tiene);
    }
  }

  @override
  void dispose() {
    _canvasController.removeListener(_onCanvasChange);
    _canvasController.dispose();
    _nombreController.dispose();
    _cargoController.dispose();
    super.dispose();
  }

  void _limpiarCanvas() {
    _canvasController.clear();
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
      Uint8List? pngBytes = _firmaBytes;
      pngBytes ??= await _canvasController.toPngBytes(pixelRatio: 2.5);

      if (pngBytes == null) {
        _mostrarError('Error al procesar la firma. Por favor intente nuevamente.');
        setState(() => _guardando = false);
        return;
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
      _mostrarError(e, contexto: 'guardar la firma');
    } finally {
      if (mounted) {
        setState(() => _guardando = false);
      }
    }
  }

  void _mostrarError(Object error, {String? contexto}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          traducirError(error, contexto: contexto).mensaje,
        ),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final esTecnico = widget.tipoFirma == 'TECNICO';
    final colorPrimario = esTecnico ? Colors.blue : Colors.purple;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
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

                  // Canvas de firma con soporte Deshacer / Avanzar
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: colorPrimario, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        SignatureToolbar(
                          controller: _canvasController,
                          colorPrimario: colorPrimario,
                          onExpandir: _abrirFirmaFullscreen,
                          showExpand: true,
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
                              : SignatureCanvasWidget(
                                  controller: _canvasController,
                                ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Indicación sobre las flechas de deshacer y avanzar
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 14, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Firme por tramos. Use las flechas ↩ y ↪ en la barra superior del recuadro para retroceder o avanzar trazos.',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

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
                  const SizedBox(height: 20),

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
  final SignatureCanvasController _canvasController = SignatureCanvasController();

  @override
  void initState() {
    super.initState();
    _canvasController.strokeWidth = 3.5;
  }

  @override
  void dispose() {
    _canvasController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _canvasController,
      builder: (context, _) {
        final tieneTrazo = _canvasController.isNotEmpty;

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
              // Flecha Deshacer (retroceder)
              IconButton(
                tooltip: 'Deshacer trazo',
                icon: const Icon(Icons.undo, color: Colors.white),
                onPressed: _canvasController.canUndo ? _canvasController.undo : null,
              ),

              // Flecha Avanzar (rehacer)
              IconButton(
                tooltip: 'Avanzar trazo',
                icon: const Icon(Icons.redo, color: Colors.white),
                onPressed: _canvasController.canRedo ? _canvasController.redo : null,
              ),

              // Limpiar
              IconButton(
                tooltip: 'Limpiar todo',
                icon: const Icon(Icons.delete_sweep, color: Colors.white),
                onPressed: _canvasController.isNotEmpty ? _canvasController.clear : null,
              ),

              const SizedBox(width: 4),

              // Botón Listo
              Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: ElevatedButton.icon(
                  onPressed: tieneTrazo
                      ? () async {
                          try {
                            final nav = Navigator.of(context);
                            final bytes = await _canvasController.toPngBytes(pixelRatio: 2.5);
                            if (!mounted) return;
                            if (bytes != null) {
                              nav.pop(bytes);
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
                          'Dibuje por tramos. Use las flechas de la barra superior para retroceder o avanzar en los trazos de su firma.',
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
                      child: SignatureCanvasWidget(
                        controller: _canvasController,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
