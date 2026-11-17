import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/auth/data/auth_provider.dart';
import 'account_scope.dart';

/// Provider aislado por cuenta para las preferencias de almacenamiento.
final storagePreferencesProvider = Provider<StoragePreferences>((ref) {
  final userId = ref.watch(activeUserIdProvider);
  return StoragePreferences(userId: userId);
});

/// Provider asíncrono para inicializar las preferencias
final storagePreferencesAsyncProvider =
    FutureProvider.autoDispose<StoragePreferencesData>((ref) async {
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
  final int? userId;

  StoragePreferences({this.userId});

  String get _keyValorRetencion =>
      AccountScope.prefsKey(userId, 'storage_valor_retencion');
  String get _keyUnidadRetencion =>
      AccountScope.prefsKey(userId, 'storage_unidad_retencion');
  String get _keyLimpiezaAutomatica =>
      AccountScope.prefsKey(userId, 'storage_limpieza_automatica');

  // Valores por defecto: 7 días
  static const int defaultValorRetencion = 7;
  static const UnidadRetencion defaultUnidadRetencion = UnidadRetencion.dias;
  static const bool defaultLimpiezaAutomatica = true;

  /// Carga preferencias aisladas para la cuenta actual (sin fugas de otras cuentas).
  Future<StoragePreferencesData> cargarPreferencias() async {
    final prefs = await SharedPreferences.getInstance();

    final int? valor = prefs.getInt(_keyValorRetencion);
    final String? unidad = prefs.getString(_keyUnidadRetencion);

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
