/// Pantalla de Notificaciones
///
/// Lista de notificaciones del técnico con acciones
/// RUTA 14 - Notificaciones
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/database/database_service.dart';
import '../../orders/presentation/orden_detalle_screen.dart';
import '../data/notificaciones_provider.dart';
import '../data/notificaciones_service.dart';

class NotificacionesScreen extends ConsumerStatefulWidget {
  const NotificacionesScreen({super.key});

  @override
  ConsumerState<NotificacionesScreen> createState() =>
      _NotificacionesScreenState();
}

class _NotificacionesScreenState extends ConsumerState<NotificacionesScreen> {
  bool _cargando = false;
  List<NotificacionModel> _notificaciones = [];

  @override
  void initState() {
    super.initState();
    _cargarNotificaciones();
  }

  Future<void> _cargarNotificaciones() async {
    setState(() => _cargando = true);

    try {
      final service = ref.read(notificacionesServiceProvider);
      final notificaciones = await service.listar();

      if (mounted) {
        setState(() {
          _notificaciones = notificaciones;
          _cargando = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _cargando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error cargando notificaciones: $e')),
        );
      }
    }
  }

  Future<void> _marcarTodasLeidas() async {
    final service = ref.read(notificacionesServiceProvider);
    final success = await service.marcarTodasLeidas();

    if (success) {
      _cargarNotificaciones();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Todas marcadas como leídas')),
        );
      }
    }
  }

  Future<void> _marcarLeida(NotificacionModel notificacion) async {
    // Marcar como leída si no lo está
    if (!notificacion.leida) {
      final service = ref.read(notificacionesServiceProvider);
      await service.marcarLeida(notificacion.id);
      _cargarNotificaciones();
    }
  }

  /// Navega a la entidad relacionada con la notificación
  Future<void> _navegarAEntidad(NotificacionModel notificacion) async {
    // Primero marcar como leída
    _marcarLeida(notificacion);

    // Navegar según el tipo de entidad
    if (notificacion.tipoEntidadRelacionada == 'ORDEN_SERVICIO' &&
        notificacion.idEntidadRelacionada != null) {
      // Buscar la orden por ID del backend
      final db = ref.read(databaseProvider);
      final orden = await db.getOrdenByBackendId(
        notificacion.idEntidadRelacionada!,
      );

      if (orden != null) {
        // Navegar con el ID local
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => OrdenDetalleScreen(idOrdenLocal: orden.idLocal),
            ),
          );
        }
      } else {
        // La orden no está sincronizada localmente
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Orden no encontrada. Sincroniza primero.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } else {
      // Mostrar snackbar si no hay entidad navegable
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sin detalle disponible')));
    }
  }

  Future<void> _eliminar(NotificacionModel notificacion) async {
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar notificación'),
        content: const Text('¿Deseas eliminar esta notificación?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmado == true) {
      final service = ref.read(notificacionesServiceProvider);
      final success = await service.eliminar(notificacion.id);

      if (success) {
        _cargarNotificaciones();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Notificación eliminada')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final noLeidas = _notificaciones.where((n) => !n.leida).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (noLeidas > 0)
            TextButton.icon(
              onPressed: _marcarTodasLeidas,
              icon: const Icon(Icons.done_all, color: Colors.white),
              label: const Text(
                'Marcar todas',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _notificaciones.isEmpty
          ? _buildEmpty()
          : RefreshIndicator(
              onRefresh: _cargarNotificaciones,
              child: ListView.builder(
                itemCount: _notificaciones.length,
                itemBuilder: (context, index) {
                  final notificacion = _notificaciones[index];
                  return _NotificacionCard(
                    notificacion: notificacion,
                    onTap: () => _navegarAEntidad(notificacion),
                    onDelete: () => _eliminar(notificacion),
                  );
                },
              ),
            ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_off_outlined,
            size: 80,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'No tienes notificaciones',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _cargarNotificaciones,
            icon: const Icon(Icons.refresh),
            label: const Text('Actualizar'),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de notificación individual
class _NotificacionCard extends StatelessWidget {
  final NotificacionModel notificacion;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _NotificacionCard({
    required this.notificacion,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final colorPrioridad = Color(notificacion.colorPrioridad);
    final fechaFormateada = _formatearFecha(notificacion.fechaCreacion);

    return Dismissible(
      key: Key('notif_${notificacion.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        color: Colors.red,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => onDelete(),
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        elevation: notificacion.leida ? 0 : 2,
        color: notificacion.leida ? Colors.grey.shade50 : Colors.white,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border(left: BorderSide(color: colorPrioridad, width: 4)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icono
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: colorPrioridad.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      notificacion.icono,
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Contenido
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Título
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notificacion.titulo,
                              style: TextStyle(
                                fontWeight: notificacion.leida
                                    ? FontWeight.normal
                                    : FontWeight.bold,
                                fontSize: 15,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (!notificacion.leida)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: colorPrioridad,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      // Mensaje
                      Text(
                        notificacion.mensaje,
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 13,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      // Fecha y prioridad
                      Row(
                        children: [
                          Icon(
                            Icons.access_time,
                            size: 14,
                            color: Colors.grey.shade500,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            fechaFormateada,
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                          const Spacer(),
                          if (notificacion.prioridad == 'URGENTE')
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'URGENTE',
                                style: TextStyle(
                                  color: Colors.red.shade700,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatearFecha(DateTime fecha) {
    final ahora = DateTime.now();
    final diferencia = ahora.difference(fecha);

    if (diferencia.inMinutes < 60) {
      return 'Hace ${diferencia.inMinutes} min';
    } else if (diferencia.inHours < 24) {
      return 'Hace ${diferencia.inHours} horas';
    } else if (diferencia.inDays < 7) {
      return 'Hace ${diferencia.inDays} días';
    } else {
      return DateFormat('dd/MM/yyyy HH:mm').format(fecha);
    }
  }
}
