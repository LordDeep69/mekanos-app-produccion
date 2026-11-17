import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/database/app_database.dart';
import '../../data/ejecucion_service.dart';

/// Widget de entrada de medición con semáforo según rangos del snapshot y persistencia en foco/envío.
class MedicionInputCard extends ConsumerStatefulWidget {
  final Medicione medicion;
  final void Function(int idLocal, double? valor) onValorGuardado;
  final int conteoFotos;
  final VoidCallback? onCapturaEvidencia;

  const MedicionInputCard({
    super.key,
    required this.medicion,
    required this.onValorGuardado,
    this.conteoFotos = 0,
    this.onCapturaEvidencia,
  });

  @override
  ConsumerState<MedicionInputCard> createState() => _MedicionInputCardState();
}

class _MedicionInputCardState extends ConsumerState<MedicionInputCard> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  String _estadoActual = 'PENDIENTE';
  bool _guardando = false;
  bool _tieneCambiosPendientes = false;
  String _valorOriginal = '';

  @override
  void initState() {
    super.initState();
    final valorInicial = widget.medicion.valor;
    _valorOriginal = valorInicial != null ? valorInicial.toString() : '';
    _controller = TextEditingController(text: _valorOriginal);
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);

    if (valorInicial != null) {
      _estadoActual = _calcularEstado(valorInicial);
    }
  }

  @override
  void dispose() {
    if (_tieneCambiosPendientes && _controller.text.trim() != _valorOriginal) {
      final texto = _controller.text.trim();
      final valor = double.tryParse(texto);
      if (valor != null) {
        final service = ref.read(ejecucionServiceProvider);
        service
            .actualizarMedicion(
              idMedicion: widget.medicion.idLocal,
              valor: valor,
              estadoValor: _calcularEstado(valor),
            )
            .then((_) {
              widget.onValorGuardado(widget.medicion.idLocal, valor);
            });
      }
    }
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      if (_controller.text.trim().isNotEmpty) {
        _guardarValor();
      } else if (widget.medicion.valor != null) {
        _limpiarValor();
      }
    }
  }

  Future<void> _limpiarValor() async {
    setState(() => _guardando = true);

    final service = ref.read(ejecucionServiceProvider);
    final exito = await service.limpiarMedicion(
      idMedicion: widget.medicion.idLocal,
    );

    if (exito) {
      setState(() {
        _estadoActual = 'PENDIENTE';
        _guardando = false;
      });
      widget.onValorGuardado(widget.medicion.idLocal, null);
    } else {
      setState(() => _guardando = false);
    }
  }

  String _calcularEstado(double valor) {
    final minNormal = widget.medicion.rangoMinimoNormal;
    final maxNormal = widget.medicion.rangoMaximoNormal;
    final minCritico = widget.medicion.rangoMinimoCritico;
    final maxCritico = widget.medicion.rangoMaximoCritico;

    if (minCritico != null && valor < minCritico) return 'CRITICO';
    if (maxCritico != null && valor > maxCritico) return 'CRITICO';
    if (minNormal != null && valor < minNormal) return 'ADVERTENCIA';
    if (maxNormal != null && valor > maxNormal) return 'ADVERTENCIA';
    return 'NORMAL';
  }

  Color _getColorForEstado(String estado) {
    switch (estado) {
      case 'NORMAL':
        return Colors.green;
      case 'ADVERTENCIA':
        return Colors.orange;
      case 'CRITICO':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getIconForEstado(String estado) {
    switch (estado) {
      case 'NORMAL':
        return Icons.check_circle;
      case 'ADVERTENCIA':
        return Icons.warning;
      case 'CRITICO':
        return Icons.error;
      default:
        return Icons.pending;
    }
  }

  Future<void> _guardarValor() async {
    final texto = _controller.text.trim();
    if (texto.isEmpty) return;

    final valor = double.tryParse(texto);
    if (valor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ingrese un número válido'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (!mounted) return;
    setState(() => _guardando = true);

    final nuevoEstado = _calcularEstado(valor);
    final service = ref.read(ejecucionServiceProvider);

    final exito = await service.actualizarMedicion(
      idMedicion: widget.medicion.idLocal,
      valor: valor,
      estadoValor: nuevoEstado,
    );

    if (!mounted) return;

    if (exito) {
      _tieneCambiosPendientes = false;
      _valorOriginal = valor.toString();
      setState(() {
        _estadoActual = nuevoEstado;
        _guardando = false;
      });
      widget.onValorGuardado(widget.medicion.idLocal, valor);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Medición guardada: $valor ${widget.medicion.unidadMedida}',
            ),
            backgroundColor: _getColorForEstado(nuevoEstado),
            duration: const Duration(milliseconds: 800),
          ),
        );
      }
    } else {
      setState(() => _guardando = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al guardar medición'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColorForEstado(_estadoActual);
    final icon = _getIconForEstado(_estadoActual);
    final unidad = widget.medicion.unidadMedida;
    final nombre = widget.medicion.nombreParametro;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _estadoActual != 'PENDIENTE'
              ? color.withValues(alpha: 0.5)
              : Colors.transparent,
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    nombre,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                if (widget.onCapturaEvidencia != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: widget.onCapturaEvidencia,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        width: 42,
                        height: 36,
                        decoration: BoxDecoration(
                          color: widget.conteoFotos > 0
                              ? Colors.blue.shade50
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: widget.conteoFotos > 0
                                ? Colors.blue
                                : Colors.grey.shade300,
                            width: widget.conteoFotos > 0 ? 2 : 1,
                          ),
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: Icon(
                                widget.conteoFotos > 0
                                    ? Icons.photo_library
                                    : Icons.camera_alt_outlined,
                                color: widget.conteoFotos > 0
                                    ? Colors.blue
                                    : Colors.grey.shade400,
                                size: 18,
                              ),
                            ),
                            if (widget.conteoFotos > 0)
                              Positioned(
                                top: 2,
                                right: 2,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                    vertical: 1,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.blue,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '${widget.conteoFotos}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 16, color: color),
                      const SizedBox(width: 4),
                      Text(
                        _estadoActual,
                        style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (widget.medicion.rangoMinimoNormal != null ||
                widget.medicion.rangoMaximoNormal != null)
              Container(
                padding: const EdgeInsets.all(8),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 14,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Rango normal: ${widget.medicion.rangoMinimoNormal ?? "∞"} - ${widget.medicion.rangoMaximoNormal ?? "∞"} $unidad',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            TextField(
              controller: _controller,
              focusNode: _focusNode,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: 'Valor medido',
                hintText: 'Ingrese el valor',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: color),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: color, width: 2),
                ),
                prefixIcon: Icon(Icons.speed, color: color),
                suffixText: unidad,
                suffixStyle: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              onChanged: (text) {
                _tieneCambiosPendientes = text.trim() != _valorOriginal;
                final valor = double.tryParse(text);
                if (valor != null) {
                  setState(() {
                    _estadoActual = _calcularEstado(valor);
                  });
                }
              },
              onEditingComplete: () {
                _guardarValor();
                _focusNode.unfocus();
              },
              onSubmitted: (_) => _guardarValor(),
            ),
            if (_guardando)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: LinearProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}
