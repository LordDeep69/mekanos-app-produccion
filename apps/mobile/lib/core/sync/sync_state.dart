import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'smart_sync_service.dart';
import 'sync_service.dart';

/// Estados posibles de sincronización
enum SyncStatus {
  idle, // Sin actividad
  syncing, // Sincronizando
  success, // Última sync exitosa
  error, // Última sync con error
}

/// Estado completo de sincronización
class SyncState {
  final SyncStatus status;
  final DateTime? lastSyncAt;
  final DateTime? nextSyncAt;
  final String? errorMessage;
  final int newOrdersCount;
  final double progress; // 0.0 - 1.0
  final String? currentStep;

  const SyncState({
    this.status = SyncStatus.idle,
    this.lastSyncAt,
    this.nextSyncAt,
    this.errorMessage,
    this.newOrdersCount = 0,
    this.progress = 0.0,
    this.currentStep,
  });

  SyncState copyWith({
    SyncStatus? status,
    DateTime? lastSyncAt,
    DateTime? nextSyncAt,
    String? errorMessage,
    int? newOrdersCount,
    double? progress,
    String? currentStep,
  }) {
    return SyncState(
      status: status ?? this.status,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      nextSyncAt: nextSyncAt ?? this.nextSyncAt,
      errorMessage: errorMessage,
      newOrdersCount: newOrdersCount ?? this.newOrdersCount,
      progress: progress ?? this.progress,
      currentStep: currentStep,
    );
  }

  /// Texto amigable del estado actual
  String get statusText {
    switch (status) {
      case SyncStatus.idle:
        return lastSyncAt != null ? 'Sincronizado' : 'Sin sincronizar';
      case SyncStatus.syncing:
        return currentStep ?? 'Sincronizando...';
      case SyncStatus.success:
        return 'Sincronización exitosa';
      case SyncStatus.error:
        return 'Error de sincronización';
    }
  }

  /// Texto de tiempo transcurrido desde última sync
  String get lastSyncText {
    if (lastSyncAt == null) return 'Nunca';

    final diff = DateTime.now().difference(lastSyncAt!);
    if (diff.inMinutes < 1) return 'Hace un momento';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} h';
    return 'Hace ${diff.inDays} días';
  }

  /// Indica si se está sincronizando
  bool get isSyncing => status == SyncStatus.syncing;
}

/// Notifier para manejar el estado de sincronización
class SyncStateNotifier extends StateNotifier<SyncState> {
  final SyncService _syncService;
  final SmartSyncService _smartSyncService;
  Timer? _autoSyncTimer;

  // Intervalo de sincronización automática (5 minutos)
  static const _autoSyncInterval = Duration(minutes: 5);

  // Key para guardar última sync en SharedPreferences
  static const _lastSyncKey = 'last_sync_at';
  static const _initialSyncDoneKey = 'initial_sync_done';

  SyncStateNotifier(this._syncService, this._smartSyncService)
    : super(const SyncState()) {
    _loadLastSync();
  }

  /// Cargar última sincronización desde SharedPreferences
  Future<void> _loadLastSync() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSyncMillis = prefs.getInt(_lastSyncKey);
      if (lastSyncMillis != null) {
        state = state.copyWith(
          lastSyncAt: DateTime.fromMillisecondsSinceEpoch(lastSyncMillis),
        );
      }
    } catch (e) {
      debugPrint('Error cargando última sync: $e');
    }
  }

  /// Guardar última sincronización en SharedPreferences
  Future<void> _saveLastSync(DateTime syncTime) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_lastSyncKey, syncTime.millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('Error guardando última sync: $e');
    }
  }

  /// Iniciar sincronización automática
  void startAutoSync(int tecnicoId) {
    stopAutoSync();

    // Sincronizar inmediatamente al iniciar
    syncNow(tecnicoId);

    // Configurar timer para sync periódica
    _autoSyncTimer = Timer.periodic(_autoSyncInterval, (_) {
      if (!state.isSyncing) {
        syncNow(tecnicoId, silent: true);
      }
    });

    state = state.copyWith(nextSyncAt: DateTime.now().add(_autoSyncInterval));
  }

  /// Detener sincronización automática
  void stopAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = null;
  }

  /// Verificar si ya se hizo sync inicial
  Future<bool> _isInitialSyncDone() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_initialSyncDoneKey) ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Marcar sync inicial como completado
  Future<void> _markInitialSyncDone() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_initialSyncDoneKey, true);
    } catch (e) {
      debugPrint('Error marcando initial sync: $e');
    }
  }

  /// Ejecutar sincronización manual
  ///
  /// [forceFull] - Forzar sync completo ignorando última sincronización
  Future<SyncResult> syncNow(
    int tecnicoId, {
    bool silent = false,
    bool forceFull = false,
  }) async {
    if (state.isSyncing) {
      return SyncResult(
        success: false,
        message: 'Ya hay una sincronización en progreso',
      );
    }

    // Determinar si usar sync inicial completo o sync inteligente
    final initialSyncDone = await _isInitialSyncDone();
    final useSmartSync = !forceFull && initialSyncDone;

    state = state.copyWith(
      status: SyncStatus.syncing,
      progress: 0.0,
      currentStep: 'Conectando con servidor...',
      errorMessage: null,
    );

    try {
      if (useSmartSync) {
        // =====================================================================
        // SMART SYNC: Comparación inteligente (reemplaza delta sync)
        // =====================================================================
        debugPrint('🧠 [SYNC] Usando SMART SYNC (comparación inteligente)');

        state = state.copyWith(
          progress: 0.2,
          currentStep: 'Comparando con servidor...',
        );

        final smartResult = await _smartSyncService.sincronizarInteligente(
          tecnicoId,
          limit: 500,
        );

        try {
          state = state.copyWith(
            progress: 0.85,
            currentStep: 'Actualizando catálogos...',
          );

          await _syncService.downloadData(
            tecnicoId,
            since: DateTime.now().toUtc(),
            fullCatalogs: true,
          );
        } catch (e) {
          debugPrint(
            '⚠️ [SYNC] Error refrescando catálogos post smart sync: $e',
          );
        }

        if (smartResult.success || smartResult.descargadas > 0) {
          final syncTime =
              DateTime.tryParse(smartResult.serverTimestamp) ??
              DateTime.now().toUtc();
          await _saveLastSync(syncTime);

          state = state.copyWith(
            status: SyncStatus.success,
            lastSyncAt: syncTime,
            nextSyncAt: DateTime.now().add(_autoSyncInterval),
            progress: 1.0,
            currentStep: null,
            newOrdersCount: smartResult.descargadas,
          );

          debugPrint(
            '✅ [SMART SYNC] Completada: ${smartResult.descargadas} descargadas, '
            '${smartResult.omitidas} sin cambios',
          );

          return SyncResult(
            success: true,
            message: 'Smart sync completado',
            ordenesDescargadas: smartResult.descargadas,
            serverTimestamp: syncTime,
          );
        } else {
          state = state.copyWith(
            status: SyncStatus.error,
            errorMessage: smartResult.mensajesError.join(', '),
            progress: 0.0,
            currentStep: null,
          );

          return SyncResult(
            success: false,
            message: 'Error en smart sync',
            error: smartResult.mensajesError.join(', '),
          );
        }
      } else {
        // =====================================================================
        // SYNC COMPLETO INICIAL: Primera vez o forzado
        // =====================================================================
        debugPrint('🔄 [SYNC] Usando SYNC COMPLETO (primera vez o forzado)');

        state = state.copyWith(
          progress: 0.2,
          currentStep: 'Descargando datos completos...',
        );

        final result = await _syncService.downloadData(
          tecnicoId,
          since: null, // Siempre completo
          fullCatalogs: true,
        );

        if (result.success) {
          final syncTime = result.serverTimestamp ?? DateTime.now().toUtc();
          await _saveLastSync(syncTime);
          await _markInitialSyncDone(); // Marcar que ya se hizo sync inicial

          state = state.copyWith(
            status: SyncStatus.success,
            lastSyncAt: syncTime,
            nextSyncAt: DateTime.now().add(_autoSyncInterval),
            progress: 1.0,
            currentStep: null,
            newOrdersCount: result.ordenesDescargadas,
          );

          debugPrint(
            '✅ [SYNC] Completada: ${result.ordenesDescargadas} órdenes',
          );
        } else {
          state = state.copyWith(
            status: SyncStatus.error,
            errorMessage: result.error ?? result.message,
            progress: 0.0,
            currentStep: null,
          );

          debugPrint('❌ [SYNC] Error: ${result.error}');
        }

        return result;
      }
    } catch (e) {
      state = state.copyWith(
        status: SyncStatus.error,
        errorMessage: e.toString(),
        progress: 0.0,
        currentStep: null,
      );

      debugPrint('❌ [SYNC] Excepción: $e');

      return SyncResult(
        success: false,
        message: 'Error de sincronización',
        error: e.toString(),
      );
    }
  }

  /// Resetear contador de nuevas órdenes (después de verlas)
  void clearNewOrdersCount() {
    state = state.copyWith(newOrdersCount: 0);
  }

  @override
  void dispose() {
    stopAutoSync();
    super.dispose();
  }
}

/// Provider del estado de sincronización
final syncStateProvider = StateNotifierProvider<SyncStateNotifier, SyncState>((
  ref,
) {
  final syncService = ref.watch(syncServiceProvider);
  final smartSyncService = ref.watch(smartSyncServiceProvider);
  return SyncStateNotifier(syncService, smartSyncService);
});

/// Provider para verificar si hay sync en progreso
final isSyncingProvider = Provider<bool>((ref) {
  return ref.watch(syncStateProvider).isSyncing;
});

/// Provider para obtener texto de última sync
final lastSyncTextProvider = Provider<String>((ref) {
  return ref.watch(syncStateProvider).lastSyncText;
});
