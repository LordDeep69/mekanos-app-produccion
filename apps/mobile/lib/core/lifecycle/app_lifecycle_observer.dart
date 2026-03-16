import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/storage_preferences.dart';
import 'data_lifecycle_manager.dart';

/// Provider para el observador de ciclo de vida de la app
final appLifecycleObserverProvider = Provider<AppLifecycleObserver>((ref) {
  final lifecycleManager = ref.watch(dataLifecycleManagerProvider);
  return AppLifecycleObserver(lifecycleManager, ref);
});

/// ============================================================================
/// OBSERVADOR DE CICLO DE VIDA DE LA APP
/// ============================================================================
///
/// Integra la limpieza automática de datos con los eventos del sistema:
/// - Al resumir la app (después de estar en background)
/// - Al iniciar sesión
/// - Al cerrar sesión
/// - Después de sync exitoso
///
/// TRIGGERS AUTOMÁTICOS:
/// ┌─────────────────────────────────────────────────────────────────────────┐
/// │ EVENTO                    │ ACCIÓN                                     │
/// ├─────────────────────────────────────────────────────────────────────────┤
/// │ App resumed               │ Limpieza ligera (solo archivos viejos)     │
/// │ Post-sync exitoso         │ Limpieza de archivos ya sincronizados      │
/// │ Login                     │ Ninguna (datos frescos del servidor)       │
/// │ Logout                    │ Limpieza total opcional                    │
/// │ Manual (configuración)    │ Limpieza completa con confirmación         │
/// └─────────────────────────────────────────────────────────────────────────┘
///
/// FRECUENCIA DE LIMPIEZA:
/// - Máximo 1 limpieza cada 6 horas (para no afectar batería)
/// - Solo si hay datos candidatos a purga

class AppLifecycleObserver with WidgetsBindingObserver {
  final DataLifecycleManager _lifecycleManager;
  final Ref _ref;

  /// Timestamp de última limpieza
  DateTime? _ultimaLimpieza;

  /// Intervalo mínimo entre limpiezas automáticas
  static const Duration intervaloMinimoLimpieza = Duration(hours: 6);

  /// Flag para evitar limpiezas concurrentes
  bool _limpiezaEnProgreso = false;

  AppLifecycleObserver(this._lifecycleManager, this._ref);

  /// Inicializa el observador (llamar en main.dart)
  void initialize() {
    WidgetsBinding.instance.addObserver(this);
    debugPrint('🔄 [LIFECYCLE] Observador de ciclo de vida inicializado');
  }

  /// Libera recursos
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
  }

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
        break;
    }
  }

  /// Callback cuando la app vuelve a primer plano
  Future<void> _onAppResumed() async {
    debugPrint('📱 [LIFECYCLE] App resumed');

    // Verificar si debemos ejecutar limpieza
    if (await _debeLimpiar()) {
      await ejecutarLimpiezaAutomatica();
    }
  }

  /// Callback cuando la app va a background
  void _onAppPaused() {
    debugPrint('📱 [LIFECYCLE] App paused');
  }

  /// Verifica si es momento de ejecutar limpieza
  /// ✅ FIX 14-FEB-2026: También verificar preferencia de limpieza automática
  Future<bool> _debeLimpiar() async {
    if (_limpiezaEnProgreso) return false;

    // Verificar si la limpieza automática está activada en preferencias
    try {
      final prefs = _ref.read(storagePreferencesProvider);
      final prefsData = await prefs.cargarPreferencias();
      if (!prefsData.limpiezaAutomaticaActiva) {
        debugPrint(
          '🔄 [LIFECYCLE] Limpieza automática desactivada por usuario',
        );
        return false;
      }
    } catch (_) {
      // Si falla la lectura de preferencias, no bloquear la limpieza
    }

    if (_ultimaLimpieza == null) return true;

    final tiempoDesdeUltimaLimpieza = DateTime.now().difference(
      _ultimaLimpieza!,
    );
    return tiempoDesdeUltimaLimpieza >= intervaloMinimoLimpieza;
  }

  /// Ejecuta limpieza automática (llamada por eventos del sistema)
  Future<PurgeResult?> ejecutarLimpiezaAutomatica() async {
    if (_limpiezaEnProgreso) {
      debugPrint('⏳ [LIFECYCLE] Limpieza ya en progreso, saltando');
      return null;
    }

    _limpiezaEnProgreso = true;
    debugPrint('🧹 [LIFECYCLE] Ejecutando limpieza automática...');

    try {
      final resultado = await _lifecycleManager.ejecutarLimpiezaInteligente();
      _ultimaLimpieza = DateTime.now();

      if (resultado.tuvoCambios) {
        debugPrint(
          '✅ [LIFECYCLE] Limpieza automática completada: ${resultado.totalPurgado} items',
        );
      } else {
        debugPrint('✅ [LIFECYCLE] Limpieza automática: sin cambios necesarios');
      }

      return resultado;
    } catch (e) {
      debugPrint('❌ [LIFECYCLE] Error en limpieza automática: $e');
      return null;
    } finally {
      _limpiezaEnProgreso = false;
    }
  }

  /// Llamar después de sync exitoso para limpiar archivos y órdenes completadas
  /// ✅ FIX 26-FEB-2026: También purgar órdenes completadas con retención 0
  /// (inmediata) para que el técnico no acumule órdenes viejas.
  Future<void> onPostSyncExitoso() async {
    debugPrint('🔄 [LIFECYCLE] Post-sync: verificando datos para limpiar...');

    try {
      // 1. Limpiar archivos de evidencias/firmas ya sincronizadas
      final evidenciasLimpiadas = await _lifecycleManager
          .purgarEvidenciasSincronizadas();
      final firmasLimpiadas = await _lifecycleManager
          .purgarFirmasSincronizadas();

      if (evidenciasLimpiadas > 0 || firmasLimpiadas > 0) {
        debugPrint(
          '🧹 [LIFECYCLE] Post-sync archivos: $evidenciasLimpiadas evidencias, $firmasLimpiadas firmas liberadas',
        );
      }

      // 2. ✅ FIX 26-FEB-2026: Purgar órdenes según política de retención configurada.
      // Ya NO se purgan inmediatamente (override=0). Cada orden tiene su propio
      // tiempo basado en lastSyncedAt vs duración de retención configurada.
      final ordenesPurgadas = await _lifecycleManager.purgarOrdenesAntiguas();
      if (ordenesPurgadas > 0) {
        debugPrint(
          '🧹 [LIFECYCLE] Post-sync órdenes: $ordenesPurgadas órdenes completadas purgadas',
        );
      }
    } catch (e) {
      debugPrint('⚠️ [LIFECYCLE] Error en limpieza post-sync: $e');
    }
  }

  /// Llamar al cerrar sesión (limpieza opcional)
  Future<void> onLogout({bool limpiezaTotal = false}) async {
    debugPrint('👋 [LIFECYCLE] Logout - limpiezaTotal: $limpiezaTotal');

    if (limpiezaTotal) {
      // Aquí se podría llamar a _db.clearAllData() si el usuario lo solicita
      debugPrint(
        '🗑️ [LIFECYCLE] Limpieza total solicitada (implementar según política)',
      );
    }

    // Resetear timestamp para que la próxima sesión ejecute limpieza
    _ultimaLimpieza = null;
  }

  /// Obtiene estadísticas actuales de almacenamiento
  Future<StorageStats> getStorageStats() async {
    return await _lifecycleManager.getStorageStats();
  }

  /// Ejecuta limpieza manual completa (desde configuración)
  Future<PurgeResult> ejecutarLimpiezaManual() async {
    debugPrint('🧹 [LIFECYCLE] Ejecutando limpieza manual...');

    _limpiezaEnProgreso = true;
    try {
      final resultado = await _lifecycleManager.ejecutarLimpiezaInteligente();
      _ultimaLimpieza = DateTime.now();
      return resultado;
    } finally {
      _limpiezaEnProgreso = false;
    }
  }
}

/// ============================================================================
/// WIDGET WRAPPER PARA INICIALIZAR OBSERVADOR
/// ============================================================================

/// Widget que inicializa el observador de ciclo de vida.
/// Usar como wrapper del MaterialApp o en el árbol superior de widgets.
class LifecycleObserverWrapper extends ConsumerStatefulWidget {
  final Widget child;

  const LifecycleObserverWrapper({super.key, required this.child});

  @override
  ConsumerState<LifecycleObserverWrapper> createState() =>
      _LifecycleObserverWrapperState();
}

class _LifecycleObserverWrapperState
    extends ConsumerState<LifecycleObserverWrapper> {
  @override
  void initState() {
    super.initState();
    // Inicializar observador después del primer frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(appLifecycleObserverProvider).initialize();
    });
  }

  @override
  void dispose() {
    ref.read(appLifecycleObserverProvider).dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
