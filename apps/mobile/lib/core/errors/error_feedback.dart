// ============================================================================
// PRESENTACIÓN CONSISTENTE DE ERRORES
// ============================================================================
//
// ✅ 26-OCT-2026 (Fase A): un único punto para mostrar errores al técnico.
//
// Reglas:
//   - Nunca se muestra el texto crudo de una excepción.
//   - El mensaje es corto, en español y con una acción implícita.
//   - Si la operación es reintentable, el SnackBar ofrece "Reintentar".
//
// Uso:
//   mostrarErrorSnackBar(context, e, contexto: 'guardar la firma');
//   await mostrarErrorDialog(context, e, contexto: 'finalizar la orden',
//       onReintentar: _finalizar);

import 'package:flutter/material.dart';

import 'user_friendly_error.dart';

/// Muestra un error como SnackBar. Si [onReintentar] no es null y el error es
/// reintentable, agrega la acción "Reintentar".
void mostrarErrorSnackBar(
  BuildContext context,
  Object? error, {
  String? contexto,
  VoidCallback? onReintentar,
  Duration duration = const Duration(seconds: 6),
}) {
  if (!context.mounted) return;

  final traducido = traducirError(error, contexto: contexto);
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) {
    debugPrint('⚠️ [ERROR-UX] Sin ScaffoldMessenger: ${traducido.mensaje}');
    return;
  }

  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.white, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              traducido.mensaje,
              style: const TextStyle(fontSize: 13, height: 1.3),
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xFFB3261E),
      duration: duration,
      behavior: SnackBarBehavior.floating,
      action: (onReintentar != null && traducido.reintentable)
          ? SnackBarAction(
              label: 'Reintentar',
              textColor: Colors.white,
              onPressed: onReintentar,
            )
          : null,
    ),
  );
}

/// Muestra un error como diálogo bloqueante y claro.
Future<void> mostrarErrorDialog(
  BuildContext context,
  Object? error, {
  String? contexto,
  String? titulo,
  VoidCallback? onReintentar,
}) async {
  if (!context.mounted) return;

  final traducido = traducirError(error, contexto: contexto);

  await showDialog<void>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => AlertDialog(
      icon: const Icon(Icons.error_outline, color: Color(0xFFB3261E), size: 32),
      title: Text(titulo ?? traducido.titulo),
      content: Text(traducido.mensaje, style: const TextStyle(height: 1.35)),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('CERRAR'),
        ),
        if (onReintentar != null && traducido.reintentable)
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              onReintentar();
            },
            child: const Text('REINTENTAR'),
          ),
      ],
    ),
  );
}
