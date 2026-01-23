import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider para las preferencias de almacenamiento
final storagePreferencesProvider = Provider<StoragePreferences>((ref) {
  return StoragePreferences();
});

/// Provider asíncrono para inicializar las preferencias
final storagePreferencesAsyncProvider = FutureProvider<StoragePreferencesData>((
  ref,
) async {
  final prefs = ref.watch(storagePreferencesProvider);
  return await prefs.cargarPreferencias();
});

/// ============================================================================
/// SERVICIO DE PREFERENCIAS DE ALMACENAMIENTO
/// ============================================================================
///
/// Gestiona la configuración persistente del ciclo de vida de datos.
/// Usa SharedPreferences para guardar los valores configurados por el usuario.

class StoragePreferences {
  static const String _keyDiasRetencionCompletadas =
      'storage_dias_retencion_completadas';
  static const String _keyDiasRetencionArchivos =
      'storage_dias_retencion_archivos';
  static const String _keyMaxOrdenesHistorial = 'storage_max_ordenes_historial';
  static const String _keyLimpiezaAutomatica = 'storage_limpieza_automatica';

  // Valores por defecto
  static const int defaultDiasRetencionCompletadas = 1;
  static const int defaultDiasRetencionArchivos = 1;
  static const int defaultMaxOrdenesHistorial = 15;
  static const bool defaultLimpiezaAutomatica = true;

  /// Carga todas las preferencias
  Future<StoragePreferencesData> cargarPreferencias() async {
    final prefs = await SharedPreferences.getInstance();

    return StoragePreferencesData(
      diasRetencionCompletadas:
          prefs.getInt(_keyDiasRetencionCompletadas) ??
          defaultDiasRetencionCompletadas,
      diasRetencionArchivos:
          prefs.getInt(_keyDiasRetencionArchivos) ??
          defaultDiasRetencionArchivos,
      maxOrdenesHistorial:
          prefs.getInt(_keyMaxOrdenesHistorial) ?? defaultMaxOrdenesHistorial,
      limpiezaAutomaticaActiva:
          prefs.getBool(_keyLimpiezaAutomatica) ?? defaultLimpiezaAutomatica,
    );
  }

  /// Guarda días de retención de órdenes completadas
  Future<void> setDiasRetencionCompletadas(int dias) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyDiasRetencionCompletadas, dias);
  }

  /// Guarda días de retención de archivos post-sync
  Future<void> setDiasRetencionArchivos(int dias) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyDiasRetencionArchivos, dias);
  }

  /// Guarda máximo de órdenes en historial
  Future<void> setMaxOrdenesHistorial(int max) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyMaxOrdenesHistorial, max);
  }

  /// Guarda estado de limpieza automática
  Future<void> setLimpiezaAutomatica(bool activa) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLimpiezaAutomatica, activa);
  }

  /// Restaura valores por defecto
  Future<void> restaurarDefaults() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _keyDiasRetencionCompletadas,
      defaultDiasRetencionCompletadas,
    );
    await prefs.setInt(_keyDiasRetencionArchivos, defaultDiasRetencionArchivos);
    await prefs.setInt(_keyMaxOrdenesHistorial, defaultMaxOrdenesHistorial);
    await prefs.setBool(_keyLimpiezaAutomatica, defaultLimpiezaAutomatica);
  }
}

/// DTO con todas las preferencias de almacenamiento
class StoragePreferencesData {
  final int diasRetencionCompletadas;
  final int diasRetencionArchivos;
  final int maxOrdenesHistorial;
  final bool limpiezaAutomaticaActiva;

  StoragePreferencesData({
    required this.diasRetencionCompletadas,
    required this.diasRetencionArchivos,
    required this.maxOrdenesHistorial,
    required this.limpiezaAutomaticaActiva,
  });

  StoragePreferencesData copyWith({
    int? diasRetencionCompletadas,
    int? diasRetencionArchivos,
    int? maxOrdenesHistorial,
    bool? limpiezaAutomaticaActiva,
  }) {
    return StoragePreferencesData(
      diasRetencionCompletadas:
          diasRetencionCompletadas ?? this.diasRetencionCompletadas,
      diasRetencionArchivos:
          diasRetencionArchivos ?? this.diasRetencionArchivos,
      maxOrdenesHistorial: maxOrdenesHistorial ?? this.maxOrdenesHistorial,
      limpiezaAutomaticaActiva:
          limpiezaAutomaticaActiva ?? this.limpiezaAutomaticaActiva,
    );
  }
}
