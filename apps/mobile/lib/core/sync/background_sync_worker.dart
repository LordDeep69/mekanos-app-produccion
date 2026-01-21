import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'connectivity_service.dart';
import 'offline_sync_service.dart';
import 'sync_notification_service.dart';

/// Callback para notificar resultados de sincronización
typedef SyncResultCallback = void Function(OfflineSyncResult result);

/// Worker de sincronización en segundo plano
///
/// Características:
/// - Monitorea conectividad y sincroniza automáticamente cuando hay red
/// - Timer periódico configurable (default 30s)
/// - Solo se ejecuta si hay órdenes pendientes
/// - Notifica a la UI cuando hay cambios
class BackgroundSyncWorker {
  final OfflineSyncService _syncService;
  final ConnectivityService _connectivity;

  Timer? _timer;
  StreamSubscription? _connectivitySubscription;
  bool _isRunning = false;
  bool _isSyncing = false;

  // Intervalo de verificación (en segundos)
  final int intervalSeconds;

  // Callbacks para notificar cambios
  final List<SyncResultCallback> _listeners = [];

  BackgroundSyncWorker(
    this._syncService,
    this._connectivity, {
    this.intervalSeconds = 30,
  });

  /// Inicia el worker de sincronización en segundo plano
  void start() {
    if (_isRunning) return;
    _isRunning = true;

    // Escuchar cambios de conectividad
    _connectivitySubscription = _connectivity.statusStream.listen((status) {
      if (status == ConnectivityStatus.online) {
        // Conexión restaurada - intentar sync inmediatamente
        _trySync();
      }
    });

    // Timer periódico
    _timer = Timer.periodic(
      Duration(seconds: intervalSeconds),
      (_) => _trySync(),
    );

    // Intentar sync inicial si hay conexión
    if (_connectivity.isOnline) {
      _trySync();
    }
  }

  /// Detiene el worker
  void stop() {
    _isRunning = false;
    _timer?.cancel();
    _timer = null;
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  /// Agrega un listener para resultados de sincronización
  void addListener(SyncResultCallback callback) {
    _listeners.add(callback);
  }

  /// Remueve un listener
  void removeListener(SyncResultCallback callback) {
    _listeners.remove(callback);
  }

  /// Fuerza una sincronización inmediata (para uso manual)
  Future<OfflineSyncResult> syncNow() async {
    // Usar mismo mecanismo de protección contra duplicados
    if (_isSyncing) {
      return OfflineSyncResult(
        success: false,
        mensaje: 'Ya hay una sincronización en progreso',
      );
    }
    _isSyncing = true;

    try {
      return await _performSync();
    } finally {
      _isSyncing = false;
    }
  }

  /// Intenta sincronizar si es posible (llamado por timer y listener)
  Future<void> _trySync() async {
    // CRITICAL: Establecer flag ANTES de cualquier operación async
    // para evitar race conditions cuando múltiples triggers llegan simultáneamente
    if (_isSyncing) {
      debugPrint('🔒 [WORKER] _trySync() BLOQUEADO - ya hay sync en progreso');
      return; // Ya hay una sync en progreso
    }
    _isSyncing = true; // Marcar INMEDIATAMENTE antes de verificar conexión
    debugPrint('🚀 [WORKER] _trySync() INICIADO');

    try {
      if (!_connectivity.isOnline) {
        debugPrint('🚀 [WORKER] Sin conexión - abortando');
        return; // Sin conexión
      }
      await _performSync();
    } finally {
      _isSyncing = false;
      debugPrint('🚀 [WORKER] _trySync() FINALIZADO');
    }
  }

  /// Ejecuta la sincronización (interno - asume que _isSyncing ya está en true)
  Future<OfflineSyncResult> _performSync() async {
    final result = await _syncService.procesarCola();

    // Notificar a listeners si hubo cambios
    if (result.ordenesSync > 0 || result.ordenesFallidas > 0) {
      _notifyListeners(result);
    }

    return result;
  }

  /// Notifica a todos los listeners
  void _notifyListeners(OfflineSyncResult result) {
    for (final listener in _listeners) {
      try {
        listener(result);
      } catch (_) {
        // Error silencioso en listener
      }
    }
  }

  /// ¿Está corriendo el worker?
  bool get isRunning => _isRunning;

  /// ¿Hay una sincronización en progreso?
  bool get isSyncing => _isSyncing;

  /// Limpia recursos
  void dispose() {
    stop();
    _listeners.clear();
  }
}

// =============================================================================
// PROVIDERS
// =============================================================================

/// Provider del worker de sincronización en segundo plano
final backgroundSyncWorkerProvider = Provider<BackgroundSyncWorker>((ref) {
  final syncService = ref.watch(offlineSyncServiceProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final notificationService = ref.watch(syncNotificationServiceProvider);

  final worker = BackgroundSyncWorker(syncService, connectivity);

  // ✅ ENTERPRISE: Escuchar resultados para emitir notificaciones UI
  worker.addListener((result) {
    if (result.ordenesSync > 0) {
      // Notificar cada orden sincronizada
      for (var i = 0; i < result.ordenesSync; i++) {
        notificationService.notifyOrderSynced('#${i + 1}');
      }
    }
    if (result.ordenesFallidas > 0) {
      notificationService.notifyOrderFailed(
        '${result.ordenesFallidas} orden(es)',
        error: result.errores.isNotEmpty ? result.errores.first : null,
      );
    }
  });

  // ✅ ENTERPRISE: Escuchar cambios de conectividad para notificar
  connectivity.statusStream.listen((status) {
    if (status == ConnectivityStatus.online) {
      notificationService.notifyConnectionRestored();
    } else if (status == ConnectivityStatus.offline) {
      notificationService.notifyConnectionLost();
    }
  });

  // ❌ SYNC MANUAL: NO auto-iniciar - el técnico decide cuándo subir
  // El worker existe pero NO sincroniza automáticamente
  // El técnico debe ir a "Órdenes por Subir" y presionar SUBIR manualmente
  // Esto garantiza que el técnico vea el feedback de cada orden subida
  // worker.start(); // <-- COMENTADO: Sync automático deshabilitado

  // Cleanup al disponer
  ref.onDispose(() => worker.dispose());

  return worker;
});

/// Provider de estado: ¿hay sincronización en progreso?
final isSyncingProvider = StateProvider<bool>((ref) => false);

/// Notifier para manejar eventos de sincronización
class SyncNotifier extends StateNotifier<OfflineSyncResult?> {
  final BackgroundSyncWorker _worker;

  SyncNotifier(this._worker) : super(null) {
    _worker.addListener(_onSyncResult);
  }

  void _onSyncResult(OfflineSyncResult result) {
    state = result;
  }

  /// Fuerza una sincronización manual
  Future<OfflineSyncResult> syncManual() async {
    return await _worker.syncNow();
  }

  /// Limpia el último resultado
  void clearResult() {
    state = null;
  }

  @override
  void dispose() {
    _worker.removeListener(_onSyncResult);
    super.dispose();
  }
}

/// Provider del notifier de sincronización
final syncNotifierProvider =
    StateNotifierProvider<SyncNotifier, OfflineSyncResult?>((ref) {
      final worker = ref.watch(backgroundSyncWorkerProvider);
      return SyncNotifier(worker);
    });
