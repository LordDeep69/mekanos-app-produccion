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
/// UNIDAD DE TIEMPO PARA POLÍTICA DE RETENCIÓN
/// ============================================================================
enum UnidadRetencion {
  minutos,
  horas,
  dias;

  String get etiqueta {
    switch (this) {
      case UnidadRetencion.minutos:
        return 'Minutos';
      case UnidadRetencion.horas:
        return 'Horas';
      case UnidadRetencion.dias:
        return 'Días';
    }
  }

  String get etiquetaCorta {
    switch (this) {
      case UnidadRetencion.minutos:
        return 'min';
      case UnidadRetencion.horas:
        return 'hrs';
      case UnidadRetencion.dias:
        return 'días';
    }
  }

  /// Convierte valor + unidad a Duration
  Duration toDuration(int valor) {
    switch (this) {
      case UnidadRetencion.minutos:
        return Duration(minutes: valor);
      case UnidadRetencion.horas:
        return Duration(hours: valor);
      case UnidadRetencion.dias:
        return Duration(days: valor);
    }
  }

  static UnidadRetencion fromString(String? s) {
    switch (s) {
      case 'MINUTOS':
        return UnidadRetencion.minutos;
      case 'HORAS':
        return UnidadRetencion.horas;
      case 'DIAS':
        return UnidadRetencion.dias;
      default:
        return UnidadRetencion.dias;
    }
  }

  String toStorageString() {
    switch (this) {
      case UnidadRetencion.minutos:
        return 'MINUTOS';
      case UnidadRetencion.horas:
        return 'HORAS';
      case UnidadRetencion.dias:
        return 'DIAS';
    }
  }
}

/// ============================================================================
/// SERVICIO DE PREFERENCIAS DE ALMACENAMIENTO
/// ============================================================================
///
/// Gestiona la política de retención unificada:
/// - Valor de retención (número)
/// - Unidad de retención (minutos, horas, días)
/// - Limpieza automática (on/off)
///
/// Una vez que una orden completada se sube exitosamente al servidor,
/// se retiene localmente por el tiempo configurado y luego se purga
/// automáticamente (datos, fotos, firmas, TODO).

class StoragePreferences {
  // ✅ FIX 26-FEB-2026: Política unificada valor + unidad
  static const String _keyValorRetencion = 'storage_valor_retencion';
  static const String _keyUnidadRetencion = 'storage_unidad_retencion';
  static const String _keyLimpiezaAutomatica = 'storage_limpieza_automatica';

  // Legacy key (para migración automática desde versión anterior)
  static const String _keyDiasRetencionCompletadas =
      'storage_dias_retencion_completadas';

  // Valores por defecto: 7 días
  static const int defaultValorRetencion = 7;
  static const UnidadRetencion defaultUnidadRetencion = UnidadRetencion.dias;
  static const bool defaultLimpiezaAutomatica = true;

  /// Carga todas las preferencias (con migración automática de legacy)
  Future<StoragePreferencesData> cargarPreferencias() async {
    final prefs = await SharedPreferences.getInstance();

    // Intentar cargar nuevas keys
    int? valor = prefs.getInt(_keyValorRetencion);
    String? unidad = prefs.getString(_keyUnidadRetencion);

    // Migración: si no existen nuevas keys pero sí las legacy, migrar
    if (valor == null && unidad == null) {
      final diasLegacy = prefs.getInt(_keyDiasRetencionCompletadas);
      if (diasLegacy != null) {
        valor = diasLegacy;
        unidad = 'DIAS';
        // Guardar migración
        await prefs.setInt(_keyValorRetencion, valor);
        await prefs.setString(_keyUnidadRetencion, unidad);
      }
    }

    return StoragePreferencesData(
      valorRetencion: valor ?? defaultValorRetencion,
      unidadRetencion: UnidadRetencion.fromString(
        unidad ?? defaultUnidadRetencion.toStorageString(),
      ),
      limpiezaAutomaticaActiva:
          prefs.getBool(_keyLimpiezaAutomatica) ?? defaultLimpiezaAutomatica,
    );
  }

  /// Guarda valor de retención
  Future<void> setValorRetencion(int valor) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyValorRetencion, valor);
  }

  /// Guarda unidad de retención
  Future<void> setUnidadRetencion(UnidadRetencion unidad) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUnidadRetencion, unidad.toStorageString());
  }

  /// Guarda estado de limpieza automática
  Future<void> setLimpiezaAutomatica(bool activa) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLimpiezaAutomatica, activa);
  }

  /// Restaura valores por defecto
  Future<void> restaurarDefaults() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyValorRetencion, defaultValorRetencion);
    await prefs.setString(
      _keyUnidadRetencion,
      defaultUnidadRetencion.toStorageString(),
    );
    await prefs.setBool(_keyLimpiezaAutomatica, defaultLimpiezaAutomatica);
  }
}

/// DTO con todas las preferencias de almacenamiento
class StoragePreferencesData {
  final int valorRetencion;
  final UnidadRetencion unidadRetencion;
  final bool limpiezaAutomaticaActiva;

  StoragePreferencesData({
    required this.valorRetencion,
    required this.unidadRetencion,
    required this.limpiezaAutomaticaActiva,
  });

  /// Convierte la configuración a Duration
  Duration get duracionRetencion => unidadRetencion.toDuration(valorRetencion);

  /// Texto legible de la política
  String get descripcionRetencion =>
      '$valorRetencion ${unidadRetencion.etiquetaCorta}';

  StoragePreferencesData copyWith({
    int? valorRetencion,
    UnidadRetencion? unidadRetencion,
    bool? limpiezaAutomaticaActiva,
  }) {
    return StoragePreferencesData(
      valorRetencion: valorRetencion ?? this.valorRetencion,
      unidadRetencion: unidadRetencion ?? this.unidadRetencion,
      limpiezaAutomaticaActiva:
          limpiezaAutomaticaActiva ?? this.limpiezaAutomaticaActiva,
    );
  }
}
