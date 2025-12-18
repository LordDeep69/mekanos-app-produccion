import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Tipos de eventos de sincronización
enum SyncEventType {
  /// Sincronización iniciada
  started,
  
  /// Orden sincronizada exitosamente
  orderSynced,
  
  /// Error al sincronizar orden
  orderFailed,
  
  /// Orden guardada offline (se subirá después)
  orderQueuedOffline,
  
  /// Sesión expirada - requiere re-login
  sessionExpired,
  
  /// Conexión restaurada
  connectionRestored,
  
  /// Sin conexión
  connectionLost,
}

/// Evento de sincronización con datos asociados
class SyncEvent {
  final SyncEventType type;
  final String? orderId;
  final String? message;
  final DateTime timestamp;
  
  SyncEvent({
    required this.type,
    this.orderId,
    this.message,
  }) : timestamp = DateTime.now();
  
  /// Mensaje por defecto según tipo
  String get displayMessage {
    if (message != null) return message!;
    
    switch (type) {
      case SyncEventType.started:
        return orderId != null 
            ? 'Sincronizando orden $orderId...'
            : 'Sincronizando...';
      case SyncEventType.orderSynced:
        return orderId != null 
            ? '✅ Orden $orderId sincronizada'
            : '✅ Sincronización completada';
      case SyncEventType.orderFailed:
        return orderId != null 
            ? '❌ Error sincronizando orden $orderId'
            : '❌ Error de sincronización';
      case SyncEventType.orderQueuedOffline:
        return orderId != null 
            ? '📥 Orden $orderId guardada offline - Ve a "Órdenes por Subir"'
            : '📥 Guardado offline - Ve a "Órdenes por Subir" para sincronizar';
      case SyncEventType.sessionExpired:
        return '🔐 Sesión expirada - Por favor inicie sesión';
      case SyncEventType.connectionRestored:
        return '📶 Conexión restaurada';
      case SyncEventType.connectionLost:
        return '📵 Sin conexión';
    }
  }
  
  /// Color según tipo de evento
  Color get color {
    switch (type) {
      case SyncEventType.started:
        return Colors.blue;
      case SyncEventType.orderSynced:
        return Colors.green;
      case SyncEventType.orderFailed:
        return Colors.red;
      case SyncEventType.orderQueuedOffline:
        return Colors.orange;
      case SyncEventType.sessionExpired:
        return Colors.red;
      case SyncEventType.connectionRestored:
        return Colors.green;
      case SyncEventType.connectionLost:
        return Colors.grey;
    }
  }
  
  /// Icono según tipo de evento
  IconData get icon {
    switch (type) {
      case SyncEventType.started:
        return Icons.sync;
      case SyncEventType.orderSynced:
        return Icons.cloud_done;
      case SyncEventType.orderFailed:
        return Icons.cloud_off;
      case SyncEventType.orderQueuedOffline:
        return Icons.cloud_upload;
      case SyncEventType.sessionExpired:
        return Icons.lock;
      case SyncEventType.connectionRestored:
        return Icons.wifi;
      case SyncEventType.connectionLost:
        return Icons.wifi_off;
    }
  }
  
  /// Duración del SnackBar según tipo
  Duration get snackBarDuration {
    switch (type) {
      case SyncEventType.started:
        return const Duration(seconds: 2);
      case SyncEventType.orderSynced:
        return const Duration(seconds: 3);
      case SyncEventType.orderFailed:
        return const Duration(seconds: 5);
      case SyncEventType.orderQueuedOffline:
        return const Duration(seconds: 4);
      case SyncEventType.sessionExpired:
        return const Duration(seconds: 6);
      case SyncEventType.connectionRestored:
        return const Duration(seconds: 2);
      case SyncEventType.connectionLost:
        return const Duration(seconds: 3);
    }
  }
}

/// Servicio Enterprise de Notificaciones de Sincronización
/// 
/// Características:
/// - Stream de eventos para UI reactiva
/// - SnackBar automático configurable
/// - Cola de eventos para evitar sobrecarga
/// - Deduplicación de eventos repetidos
class SyncNotificationService {
  // Stream controller para broadcast de eventos
  final _eventController = StreamController<SyncEvent>.broadcast();
  
  // Último evento para deduplicación
  SyncEvent? _lastEvent;
  
  // GlobalKey para acceder al ScaffoldMessenger
  GlobalKey<ScaffoldMessengerState>? _scaffoldKey;
  
  // ¿Mostrar SnackBars automáticamente?
  bool autoShowSnackBars = true;
  
  /// Stream de eventos de sincronización
  Stream<SyncEvent> get events => _eventController.stream;
  
  /// Último evento emitido
  SyncEvent? get lastEvent => _lastEvent;
  
  /// Configura el ScaffoldMessenger para SnackBars
  void setScaffoldKey(GlobalKey<ScaffoldMessengerState> key) {
    _scaffoldKey = key;
  }
  
  /// Emite un evento de sincronización
  void emit(SyncEvent event) {
    // Deduplicar eventos idénticos en menos de 1 segundo
    if (_lastEvent != null &&
        _lastEvent!.type == event.type &&
        _lastEvent!.orderId == event.orderId &&
        DateTime.now().difference(_lastEvent!.timestamp).inSeconds < 1) {
      return; // Ignorar duplicado
    }
    
    _lastEvent = event;
    _eventController.add(event);
    
    // Mostrar SnackBar automáticamente si está habilitado
    if (autoShowSnackBars) {
      _showSnackBar(event);
    }
  }
  
  // ============ MÉTODOS DE CONVENIENCIA ============
  
  /// Notifica que una sincronización comenzó
  void notifySyncStarted({String? orderId}) {
    emit(SyncEvent(type: SyncEventType.started, orderId: orderId));
  }
  
  /// Notifica que una orden se sincronizó exitosamente
  void notifyOrderSynced(String orderId) {
    emit(SyncEvent(type: SyncEventType.orderSynced, orderId: orderId));
  }
  
  /// Notifica error al sincronizar una orden
  void notifyOrderFailed(String orderId, {String? error}) {
    emit(SyncEvent(
      type: SyncEventType.orderFailed, 
      orderId: orderId,
      message: error != null ? '❌ Orden $orderId: $error' : null,
    ));
  }
  
  /// Notifica que una orden se guardó para sync posterior
  void notifyOrderQueuedOffline(String orderId) {
    emit(SyncEvent(type: SyncEventType.orderQueuedOffline, orderId: orderId));
  }
  
  /// Notifica que la sesión expiró
  void notifySessionExpired() {
    emit(SyncEvent(type: SyncEventType.sessionExpired));
  }
  
  /// Notifica que la conexión se restauró
  void notifyConnectionRestored() {
    emit(SyncEvent(type: SyncEventType.connectionRestored));
  }
  
  /// Notifica que se perdió la conexión
  void notifyConnectionLost() {
    emit(SyncEvent(type: SyncEventType.connectionLost));
  }
  
  // ============ UI FEEDBACK ============
  
  /// Muestra un SnackBar para el evento
  void _showSnackBar(SyncEvent event) {
    final messenger = _scaffoldKey?.currentState;
    if (messenger == null) return;
    
    // Limpiar SnackBars anteriores para evitar acumulación
    messenger.hideCurrentSnackBar();
    
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(event.icon, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                event.displayMessage,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
        backgroundColor: event.color,
        duration: event.snackBarDuration,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: event.type == SyncEventType.sessionExpired
            ? SnackBarAction(
                label: 'IR A LOGIN',
                textColor: Colors.white,
                onPressed: () {
                  // El listener del authExpiredEventProvider maneja esto
                },
              )
            : null,
      ),
    );
  }
  
  /// Muestra SnackBar personalizado
  void showCustomSnackBar({
    required String message,
    required Color color,
    IconData icon = Icons.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final messenger = _scaffoldKey?.currentState;
    if (messenger == null) return;
    
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: color,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
  
  /// Limpia recursos
  void dispose() {
    _eventController.close();
  }
}

// =============================================================================
// PROVIDERS
// =============================================================================

/// Provider singleton del servicio de notificaciones
final syncNotificationServiceProvider = Provider<SyncNotificationService>((ref) {
  final service = SyncNotificationService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider del último evento de sync (reactivo)
final lastSyncEventProvider = StreamProvider<SyncEvent>((ref) {
  final service = ref.watch(syncNotificationServiceProvider);
  return service.events;
});
