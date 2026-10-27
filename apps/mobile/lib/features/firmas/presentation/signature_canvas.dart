import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Trazo individual de la firma
class SignatureStroke {
  final List<Offset> points;
  final Color color;
  final double strokeWidth;

  SignatureStroke({
    required this.points,
    this.color = Colors.black,
    this.strokeWidth = 3.0,
  });
}

/// Controlador para manejar trazos, deshacer (undo), rehacer (redo) y exportar a PNG
class SignatureCanvasController extends ChangeNotifier {
  final List<SignatureStroke> _strokes = [];
  final List<SignatureStroke> _undoneStrokes = [];

  Color strokeColor = Colors.black;
  double strokeWidth = 3.0;

  SignatureStroke? _currentStroke;
  Size _lastCanvasSize = const Size(600, 300);

  bool get canUndo => _strokes.isNotEmpty;
  bool get canRedo => _undoneStrokes.isNotEmpty;
  bool get isEmpty => _strokes.isEmpty && _currentStroke == null;
  bool get isNotEmpty => !isEmpty;
  int get strokeCount => _strokes.length + (_currentStroke != null ? 1 : 0);

  List<SignatureStroke> get strokes => List.unmodifiable(_strokes);
  SignatureStroke? get currentStroke => _currentStroke;

  void updateCanvasSize(Size size) {
    if (size.width > 0 && size.height > 0) {
      _lastCanvasSize = size;
    }
  }

  void onPanStart(Offset point) {
    _currentStroke = SignatureStroke(
      points: [point],
      color: strokeColor,
      strokeWidth: strokeWidth,
    );
    // Un nuevo trazo invalida el historial de rehacer
    _undoneStrokes.clear();
    notifyListeners();
  }

  void onPanUpdate(Offset point) {
    if (_currentStroke != null) {
      _currentStroke!.points.add(point);
      notifyListeners();
    }
  }

  void onPanEnd() {
    if (_currentStroke != null && _currentStroke!.points.isNotEmpty) {
      _strokes.add(_currentStroke!);
      _currentStroke = null;
      notifyListeners();
    }
  }

  /// Deshace el último trazo realizado
  void undo() {
    if (_strokes.isNotEmpty) {
      _undoneStrokes.add(_strokes.removeLast());
      notifyListeners();
    }
  }

  /// Rehace (avanza) el último trazo deshecho
  void redo() {
    if (_undoneStrokes.isNotEmpty) {
      _strokes.add(_undoneStrokes.removeLast());
      notifyListeners();
    }
  }

  /// Borra todos los trazos y limpia el historial
  void clear() {
    _strokes.clear();
    _undoneStrokes.clear();
    _currentStroke = null;
    notifyListeners();
  }

  /// Exporta el dibujo a imagen PNG en bytes de alta resolución
  Future<Uint8List?> toPngBytes({
    double pixelRatio = 2.0,
    Color backgroundColor = Colors.white,
  }) async {
    if (isEmpty) return null;

    final width = (_lastCanvasSize.width * pixelRatio).toInt().clamp(200, 4000);
    final height = (_lastCanvasSize.height * pixelRatio).toInt().clamp(100, 3000);

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(
      recorder,
      Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
    );

    // Fondo blanco sólido para que la firma sea legible en PDF y pantallas
    final bgPaint = Paint()..color = backgroundColor;
    canvas.drawRect(
      Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      bgPaint,
    );

    // Escalar al ratio deseado
    canvas.scale(pixelRatio, pixelRatio);

    for (final stroke in _strokes) {
      _paintStroke(canvas, stroke);
    }
    if (_currentStroke != null) {
      _paintStroke(canvas, _currentStroke!);
    }

    final picture = recorder.endRecording();
    final image = await picture.toImage(width, height);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData?.buffer.asUint8List();
  }

  static void _paintStroke(Canvas canvas, SignatureStroke stroke) {
    if (stroke.points.isEmpty) return;

    if (stroke.points.length == 1) {
      final dotPaint = Paint()
        ..color = stroke.color
        ..style = PaintingStyle.fill
        ..isAntiAlias = true;
      canvas.drawCircle(stroke.points[0], stroke.strokeWidth / 2, dotPaint);
      return;
    }

    final paint = Paint()
      ..color = stroke.color
      ..strokeWidth = stroke.strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true;

    final path = Path();
    path.moveTo(stroke.points[0].dx, stroke.points[0].dy);

    for (int i = 1; i < stroke.points.length; i++) {
      final p0 = stroke.points[i - 1];
      final p1 = stroke.points[i];
      final mid = Offset((p0.dx + p1.dx) / 2, (p0.dy + p1.dy) / 2);
      path.quadraticBezierTo(p0.dx, p0.dy, mid.dx, mid.dy);
    }
    path.lineTo(stroke.points.last.dx, stroke.points.last.dy);

    canvas.drawPath(path, paint);
  }
}

/// Widget del lienzo interactivo de firma
class SignatureCanvasWidget extends StatelessWidget {
  final SignatureCanvasController controller;
  final Color backgroundColor;

  const SignatureCanvasWidget({
    super.key,
    required this.controller,
    this.backgroundColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        controller.updateCanvasSize(size);

        return ClipRect(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onPanStart: (details) => controller.onPanStart(details.localPosition),
            onPanUpdate: (details) => controller.onPanUpdate(details.localPosition),
            onPanEnd: (_) => controller.onPanEnd(),
            child: AnimatedBuilder(
              animation: controller,
              builder: (context, child) {
                return CustomPaint(
                  size: size,
                  painter: _SignaturePainter(
                    strokes: controller.strokes,
                    currentStroke: controller.currentStroke,
                    backgroundColor: backgroundColor,
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<SignatureStroke> strokes;
  final SignatureStroke? currentStroke;
  final Color backgroundColor;

  _SignaturePainter({
    required this.strokes,
    required this.currentStroke,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = backgroundColor,
    );

    // Línea guía tenue en la parte inferior para orientar la firma
    final guidePaint = Paint()
      ..color = Colors.grey.shade300
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;
    final guideY = size.height * 0.82;
    canvas.drawLine(
      Offset(24, guideY),
      Offset(size.width - 24, guideY),
      guidePaint,
    );

    for (final stroke in strokes) {
      SignatureCanvasController._paintStroke(canvas, stroke);
    }
    if (currentStroke != null) {
      SignatureCanvasController._paintStroke(canvas, currentStroke!);
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}

/// Barra de controles de firma (Deshacer, Avanzar, Limpiar)
class SignatureToolbar extends StatelessWidget {
  final SignatureCanvasController controller;
  final Color colorPrimario;
  final VoidCallback? onExpandir;
  final bool showExpand;

  const SignatureToolbar({
    super.key,
    required this.controller,
    required this.colorPrimario,
    this.onExpandir,
    this.showExpand = true,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: colorPrimario.withValues(alpha: 0.08),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
          ),
          child: Row(
            children: [
              Icon(Icons.draw, color: colorPrimario, size: 16),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  'Firma digital',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: colorPrimario,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 4),

              // Flecha Deshacer (retroceder en los trazos)
              IconButton(
                tooltip: 'Deshacer trazo',
                icon: const Icon(Icons.undo),
                iconSize: 18,
                color: controller.canUndo ? colorPrimario : Colors.grey.shade400,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.all(2),
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                onPressed: controller.canUndo ? controller.undo : null,
              ),

              // Flecha Avanzar / Rehacer (avanzar en los trazos)
              IconButton(
                tooltip: 'Avanzar trazo',
                icon: const Icon(Icons.redo),
                iconSize: 18,
                color: controller.canRedo ? colorPrimario : Colors.grey.shade400,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.all(2),
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                onPressed: controller.canRedo ? controller.redo : null,
              ),

              // Limpiar
              IconButton(
                tooltip: 'Limpiar',
                icon: const Icon(Icons.refresh),
                iconSize: 18,
                color: controller.isNotEmpty ? Colors.red.shade600 : Colors.grey.shade400,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.all(2),
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                onPressed: controller.isNotEmpty ? controller.clear : null,
              ),

              if (showExpand && onExpandir != null) ...[
                const SizedBox(width: 4),
                Tooltip(
                  message: 'Pantalla completa',
                  child: InkWell(
                    onTap: onExpandir,
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: BoxDecoration(
                        color: colorPrimario,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.open_in_full, size: 12, color: Colors.white),
                          SizedBox(width: 3),
                          Text(
                            'EXPANDIR',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

