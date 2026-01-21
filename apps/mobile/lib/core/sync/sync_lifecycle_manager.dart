import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'connectivity_service.dart';
import 'offline_sync_service.dart';
import 'sync_state.dart';

/// Manager del ciclo de vida de sincronización
///
/// Responsabilidades:
/// - Sincronizar al iniciar la app
/// - Sincronizar al volver de background
/// - Sincronizar periódicamente (timer)
/// - Sincronizar cuando se recupera conectividad
/// - Detener sync cuando la app va a background
class SyncLifecycleManager with WidgetsBindingObserver {
  final Ref _ref;
  final int _tecnicoId;

  Timer? _periodicSyncTimer;
  StreamSubscription? _connectivitySubscription;
  bool _isInitialized = false;
  DateTime? _lastBackgroundTime;

  // Configuración
  static const _periodicSyncInterval = Duration(minutes: 5);
  static const _minBackgroundDuration = Duration(seconds: 30);

  SyncLifecycleManager(this._ref, this._tecnicoId);

  /// Inicializar el manager de ciclo de vida
  void initialize() {
    if (_isInitialized) return;
    _isInitialized = true;

    debugPrint(
      '🔄 [SYNC LIFECYCLE] Inicializando manager para técnico $_tecnicoId',
    );

    // Registrar observer de lifecycle
    WidgetsBinding.instance.addObserver(this);

    // Sincronización inicial
    _performInitialSync();

    // Configurar timer periódico
    _startPeriodicSync();

    // Escuchar cambios de conectividad
    _setupConnectivityListener();
  }

  /// Realizar sincronización inicial
  Future<void> _performInitialSync() async {
    debugPrint('🔄 [SYNC LIFECYCLE] Ejecutando sync inicial');

    // Esperar un momento para que la UI se estabilice
    await Future.delayed(const Duration(milliseconds: 500));

    // Verificar conectividad antes de sincronizar
    final connectivity = _ref.read(connectivityServiceProvider);
    final isOnline = await connectivity.checkConnection();

    if (isOnline) {
      // ❌ SYNC MANUAL: NO procesar cola pendiente automáticamente
      // El técnico debe ir a "Órdenes por Subir" y presionar SUBIR manualmente
      // await _procesarColaPendiente(); // <-- DESHABILITADO

      // Primera sync siempre es completa (forceFull: true)
      final syncState = _ref.read(syncStateProvider);
      final isFirstSync = syncState.lastSyncAt == null;

      await _ref
          .read(syncStateProvider.notifier)
          .syncNow(_tecnicoId, forceFull: isFirstSync);
    } else {
      debugPrint('🔄 [SYNC LIFECYCLE] Sin conexión - sync inicial pospuesta');
    }
  }

  /// Iniciar sincronización periódica
  void _startPeriodicSync() {
    _periodicSyncTimer?.cancel();

    _periodicSyncTimer = Timer.periodic(_periodicSyncInterval, (_) {
      _performPeriodicSync();
    });

    debugPrint(
      '🔄 [SYNC LIFECYCLE] Timer periódico configurado: cada ${_periodicSyncInterval.inMinutes} min',
    );
  }

  /// Ejecutar sincronización periódica
  Future<void> _performPeriodicSync() async {
    final syncState = _ref.read(syncStateProvider);

    // No sincronizar si ya hay una en progreso
    if (syncState.isSyncing) {
      debugPrint(
        '🔄 [SYNC LIFECYCLE] Sync periódica omitida - ya hay sync en progreso',
      );
      return;
    }

    // Verificar conectividad
    final connectivity = _ref.read(connectivityServiceProvider);
    final isOnline = await connectivity.checkConnection();

    if (!isOnline) {
      debugPrint('🔄 [SYNC LIFECYCLE] Sync periódica omitida - sin conexión');
      return;
    }

    debugPrint('🔄 [SYNC LIFECYCLE] Ejecutando sync periódica (delta)');
    await _ref
        .read(syncStateProvider.notifier)
        .syncNow(
          _tecnicoId,
          silent: true, // No mostrar notificaciones
        );
  }

  /// Configurar listener de conectividad
  void _setupConnectivityListener() {
    final connectivity = _ref.read(connectivityServiceProvider);

    _connectivitySubscription = connectivity.statusStream.listen((status) {
      if (status == ConnectivityStatus.online) {
        _onConnectivityRestored();
      }
    });
  }

  /// Callback cuando se restaura la conectividad
  Future<void> _onConnectivityRestored() async {
    debugPrint('🔄 [SYNC LIFECYCLE] Conectividad restaurada');

    // ❌ SYNC MANUAL: Ya NO se procesan órdenes pendientes automáticamente
    // El técnico debe ir a "Órdenes por Subir" y presionar SUBIR manualmente
    // await _procesarColaPendiente(); // <-- DESHABILITADO

    final syncState = _ref.read(syncStateProvider);

    // Si no hay sync en progreso y la última sync fue hace más de 1 minuto
    if (!syncState.isSyncing) {
      final lastSync = syncState.lastSyncAt;
      final shouldSync =
          lastSync == null ||
          DateTime.now().difference(lastSync).inMinutes >= 1;

      if (shouldSync) {
        debugPrint(
          '🔄 [SYNC LIFECYCLE] Descargando órdenes nuevas (sin auto-upload)',
        );
        await _ref
            .read(syncStateProvider.notifier)
            .syncNow(_tecnicoId, silent: true);
      }
    }
  }

  /// ✅ FIX: Procesar cola de órdenes pendientes (completadas offline)
  Future<void> _procesarColaPendiente() async {
    try {
      final offlineSync = _ref.read(offlineSyncServiceProvider);
      final result = await offlineSync.procesarCola();

      if (result.ordenesSync > 0) {
        debugPrint(
          '📤 [SYNC LIFECYCLE] ${result.ordenesSync} orden(es) subida(s) desde cola offline',
        );
      }
      if (result.ordenesFallidas > 0) {
        debugPrint(
          '⚠️ [SYNC LIFECYCLE] ${result.ordenesFallidas} orden(es) fallida(s): ${result.errores.join(", ")}',
        );
      }
    } catch (e) {
      debugPrint('❌ [SYNC LIFECYCLE] Error procesando cola: $e');
    }
  }

  /// Callback del ciclo de vida de la app
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        _onAppResumed();
        break;
      case AppLifecycleState.paused:
        _onAppPaused();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        // No hacer nada en estos estados
        break;
    }
  }

  /// Callback cuando la app vuelve a primer plano
  Future<void> _onAppResumed() async {
    debugPrint('🔄 [SYNC LIFECYCLE] App resumed');

    // Reiniciar timer periódico
    _startPeriodicSync();

    // Si estuvo en background suficiente tiempo, sincronizar
    if (_lastBackgroundTime != null) {
      final backgroundDuration = DateTime.now().difference(
        _lastBackgroundTime!,
      );

      if (backgroundDuration >= _minBackgroundDuration) {
        debugPrint(
          '🔄 [SYNC LIFECYCLE] App estuvo en background ${backgroundDuration.inSeconds}s - descargando',
        );

        // Verificar conectividad antes
        final connectivity = _ref.read(connectivityServiceProvider);
        final isOnline = await connectivity.checkConnection();

        if (isOnline) {
          // ❌ SYNC MANUAL: NO procesar cola pendiente automáticamente
          // await _procesarColaPendiente(); // <-- DESHABILITADO

          await _ref
              .read(syncStateProvider.notifier)
              .syncNow(_tecnicoId, silent: true);
        }
      }
    }

    _lastBackgroundTime = null;
  }

  /// Callback cuando la app va a background
  void _onAppPaused() {
    debugPrint('🔄 [SYNC LIFECYCLE] App paused');
    _lastBackgroundTime = DateTime.now();

    // Pausar timer periódico para ahorrar batería
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = null;
  }

  /// Forzar sincronización completa (ignora delta)
  Future<void> forceFullSync() async {
    debugPrint('🔄 [SYNC LIFECYCLE] Forzando sync completa');
    await _ref
        .read(syncStateProvider.notifier)
        .syncNow(_tecnicoId, forceFull: true);
  }

  /// Liberar recursos
  void dispose() {
    debugPrint('🔄 [SYNC LIFECYCLE] Disposing manager');

    WidgetsBinding.instance.removeObserver(this);
    _periodicSyncTimer?.cancel();
    _connectivitySubscription?.cancel();
    _isInitialized = false;
  }
}

/// Provider para el SyncLifecycleManager
///
/// Uso:
/// ```dart
/// // En el widget principal después de login:
/// final manager = ref.watch(syncLifecycleManagerProvider(tecnicoId));
/// manager.initialize();
/// ```
final syncLifecycleManagerProvider = Provider.family<SyncLifecycleManager, int>(
  (ref, tecnicoId) {
    final manager = SyncLifecycleManager(ref, tecnicoId);

    ref.onDispose(() {
      manager.dispose();
    });

    return manager;
  },
);
