/// Badge de Notificaciones para AppBar
///
/// Widget que muestra icono de campana con badge de no leídas
/// RUTA 14 - Notificaciones
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/notificaciones_provider.dart';
import 'notificaciones_screen.dart';

/// Widget de badge de notificaciones para usar en AppBar
class NotificacionesBadge extends ConsumerStatefulWidget {
  /// Color del icono
  final Color? iconColor;

  const NotificacionesBadge({super.key, this.iconColor});

  @override
  ConsumerState<NotificacionesBadge> createState() =>
      _NotificacionesBadgeState();
}

class _NotificacionesBadgeState extends ConsumerState<NotificacionesBadge> {
  @override
  void initState() {
    super.initState();
    // ✅ FIX: Diferir carga para no bloquear UI y manejar errores de red
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _cargarConteoSeguro();
    });
  }

  /// ✅ FIX: Carga segura que no bloquea UI en caso de error de red
  Future<void> _cargarConteoSeguro() async {
    if (!mounted) return;

    try {
      final service = ref.read(notificacionesServiceProvider);
      // Usar timeout corto para no bloquear si no hay red
      await service.obtenerConteoNoLeidas().timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          debugPrint('⏱️ Timeout obteniendo notificaciones - ignorando');
          return 0;
        },
      );
    } catch (e) {
      // ✅ NO propagar errores de red - simplemente ignorar
      debugPrint('⚠️ Error cargando notificaciones (ignorado): $e');
    }
  }

  void _abrirNotificaciones() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const NotificacionesScreen()));
  }

  @override
  Widget build(BuildContext context) {
    // Escuchar cambios en el conteo
    final conteoAsync = ref.watch(notificacionesConteoProvider);

    return IconButton(
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(
            Icons.notifications_outlined,
            color: widget.iconColor ?? Colors.white,
          ),
          // Badge de conteo
          conteoAsync.when(
            data: (conteo) {
              if (conteo <= 0) return const SizedBox.shrink();

              return Positioned(
                right: -6,
                top: -4,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  child: Text(
                    conteo > 99 ? '99+' : conteo.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      tooltip: 'Notificaciones',
      onPressed: _abrirNotificaciones,
    );
  }
}

/// Widget simplificado para cuando no se usa Riverpod directamente
class NotificacionesBadgeSimple extends StatefulWidget {
  final int conteo;
  final VoidCallback onTap;
  final Color? iconColor;

  const NotificacionesBadgeSimple({
    super.key,
    required this.conteo,
    required this.onTap,
    this.iconColor,
  });

  @override
  State<NotificacionesBadgeSimple> createState() =>
      _NotificacionesBadgeSimpleState();
}

class _NotificacionesBadgeSimpleState extends State<NotificacionesBadgeSimple> {
  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(
            Icons.notifications_outlined,
            color: widget.iconColor ?? Colors.white,
          ),
          if (widget.conteo > 0)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                child: Text(
                  widget.conteo > 99 ? '99+' : widget.conteo.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
      tooltip: 'Notificaciones',
      onPressed: widget.onTap,
    );
  }
}
