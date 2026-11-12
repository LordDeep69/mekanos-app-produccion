import 'dart:convert';

import 'package:flutter/foundation.dart';

/// Rangos y unidad resueltos para un parámetro de medición de un equipo específico.
class RangosParametroResueltos {
  final double? minNormal;
  final double? maxNormal;
  final double? minCritico;
  final double? maxCritico;
  final double? valorIdeal;
  final String? unidadMedida;
  final bool esPersonalizado;

  const RangosParametroResueltos({
    this.minNormal,
    this.maxNormal,
    this.minCritico,
    this.maxCritico,
    this.valorIdeal,
    this.unidadMedida,
    this.esPersonalizado = false,
  });
}

/// Motor puro Zero-Trust para resolver overrides de parámetros en `equipos.config_parametros`.
///
/// Prioridad de resolución (idéntica al backend NestJS):
/// 1. `por_parametro[idParametro.toString()]` o `por_parametro[codigoParametro]` (key o campo interno)
/// 2. `parametros_adicionales[]` por `id_parametro_medicion` o `codigo_parametro`
/// 3. `rangos[codigoParametro]` directo (case-insensitive)
/// 4. Fallback retrocompatible legacy: `rangos[claveLegacy]` + `unidades[magnitudLegacy]`
class ParametroOverrideResolver {
  static const Map<String, String> _legacyCodigoARangoKey = {
    // Generadores
    'GEN_RPM': 'velocidad_motor',
    'GEN_PRESION_ACEITE': 'presion_aceite',
    'GEN_TEMP_REFRIGERANTE': 'temperatura_refrigerante',
    'GEN_VOLTAJE_BATERIA': 'carga_bateria',
    'GEN_HOROMETRO': 'horas_trabajo',
    'GEN_VOLTAJE_SALIDA': 'voltaje_generador',
    'GEN_FRECUENCIA': 'frecuencia_generador',
    'GEN_AMPERAJE': 'corriente_generador',
    'GEN_VOLTAJE': 'voltaje_generador',
    'GEN_CORRIENTE': 'corriente_generador',
    // Bombas
    'BOM_VIBRACION': 'vibracion',
    'BOM_PRESION_DESCARGA': 'presion_descarga',
    'BOM_PRESION_SUCCION': 'presion_succion',
    'BOM_VOLTAJE': 'voltaje_motor',
    'BOM_AMPERAJE': 'corriente_motor',
    'BOM_TEMPERATURA': 'temperatura_motor',
    'BOM_CAUDAL': 'caudal',
    'BOM_RPM': 'velocidad_bomba',
  };

  static const Map<String, String> _legacyCodigoAMagnitud = {
    'GEN_TEMP_REFRIGERANTE': 'temperatura',
    'GEN_PRESION_ACEITE': 'presion',
    'GEN_VOLTAJE_SALIDA': 'voltaje',
    'GEN_VOLTAJE_BATERIA': 'voltaje',
    'GEN_VOLTAJE': 'voltaje',
    'GEN_FRECUENCIA': 'frecuencia',
    'GEN_AMPERAJE': 'corriente',
    'GEN_CORRIENTE': 'corriente',
    'BOM_PRESION_DESCARGA': 'presion',
    'BOM_PRESION_SUCCION': 'presion',
    'BOM_VOLTAJE': 'voltaje',
    'BOM_AMPERAJE': 'corriente',
    'BOM_TEMPERATURA': 'temperatura',
  };

  static double? toFiniteDouble(dynamic raw) {
    if (raw == null) return null;
    if (raw is num) {
      final d = raw.toDouble();
      return d.isFinite ? d : null;
    }
    if (raw is String) {
      final trimmed = raw.trim().replaceAll(',', '.');
      if (trimmed.isEmpty) return null;
      final parsed = double.tryParse(trimmed);
      return parsed != null && parsed.isFinite ? parsed : null;
    }
    return null;
  }

  static int? _toInt(dynamic raw) {
    if (raw == null) return null;
    if (raw is int) return raw;
    if (raw is num) return raw.toInt();
    if (raw is String) return int.tryParse(raw.trim());
    return null;
  }

  static String? _toNonEmptyString(dynamic raw) {
    if (raw is! String) return null;
    final trimmed = raw.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  static Map<String, dynamic>? _decodeConfig(String? configParametrosJson) {
    if (configParametrosJson == null || configParametrosJson.trim().isEmpty) {
      return null;
    }
    try {
      final decoded = jsonDecode(configParametrosJson);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
      return null;
    } catch (e) {
      debugPrint('⚠️ [CONFIG] Error parseando configParametros: $e');
      return null;
    }
  }

  static Map<String, dynamic>? _asStringMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static Map<String, dynamic>? _buscarOverrideEnMapa(
    Map<String, dynamic> config, {
    required String codigoParametro,
    int? idParametro,
  }) {
    final codigoUpper = codigoParametro.trim().toUpperCase();

    // 1. por_parametro (Prioridad: idParametro exacto > codigo exacto > campo interno)
    final porParametro = _asStringMap(config['por_parametro']);
    if (porParametro != null && porParametro.isNotEmpty) {
      if (idParametro != null) {
        final byId = _asStringMap(porParametro[idParametro.toString()]);
        if (byId != null) return byId;
      }

      if (codigoUpper.isNotEmpty) {
        final byCodeExact =
            _asStringMap(porParametro[codigoParametro.trim()]) ??
            _asStringMap(porParametro[codigoUpper]);
        if (byCodeExact != null) return byCodeExact;
      }

      for (final entry in porParametro.entries) {
        final entryMap = _asStringMap(entry.value);
        if (entryMap == null) continue;
        if (codigoUpper.isNotEmpty &&
            entry.key.trim().toUpperCase() == codigoUpper) {
          return entryMap;
        }
        if (idParametro != null &&
            _toInt(entryMap['id_parametro_medicion']) == idParametro) {
          return entryMap;
        }
        final innerCode = _toNonEmptyString(entryMap['codigo_parametro']);
        if (codigoUpper.isNotEmpty &&
            innerCode != null &&
            innerCode.toUpperCase() == codigoUpper) {
          return entryMap;
        }
      }
    }

    // 2. parametros_adicionales[]
    final adicionales = config['parametros_adicionales'];
    if (adicionales is List) {
      for (final item in adicionales) {
        final itemMap = _asStringMap(item);
        if (itemMap == null) continue;
        if (idParametro != null &&
            _toInt(itemMap['id_parametro_medicion']) == idParametro) {
          return itemMap;
        }
        final innerCode = _toNonEmptyString(itemMap['codigo_parametro']);
        if (codigoUpper.isNotEmpty &&
            innerCode != null &&
            innerCode.toUpperCase() == codigoUpper) {
          return itemMap;
        }
      }
    }

    // 3. rangos[] directo o legacy
    final rangos = _asStringMap(config['rangos']);
    if (rangos != null && codigoUpper.isNotEmpty) {
      final directo =
          _asStringMap(rangos[codigoParametro.trim()]) ??
          _asStringMap(rangos[codigoUpper]);
      if (directo != null) return directo;

      for (final entry in rangos.entries) {
        if (entry.key.trim().toUpperCase() == codigoUpper) {
          final found = _asStringMap(entry.value);
          if (found != null) return found;
        }
      }

      final legacyKey = _legacyCodigoARangoKey[codigoUpper];
      if (legacyKey != null) {
        final legacyMap = _asStringMap(rangos[legacyKey]);
        if (legacyMap != null) return legacyMap;
      }
    }

    return null;
  }

  /// Resuelve rangos y metadata override para un parámetro del equipo.
  /// Retorna null si no existe override configurado para el parámetro.
  static RangosParametroResueltos? resolverOverride({
    required String? configParametrosJson,
    required String codigoParametro,
    int? idParametro,
  }) {
    final config = _decodeConfig(configParametrosJson);
    if (config == null) return null;

    final match = _buscarOverrideEnMapa(
      config,
      codigoParametro: codigoParametro,
      idParametro: idParametro,
    );

    final minNormal = match != null ? toFiniteDouble(match['min_normal']) : null;
    final maxNormal = match != null ? toFiniteDouble(match['max_normal']) : null;
    final minCritico = match != null ? toFiniteDouble(match['min_critico']) : null;
    final maxCritico = match != null ? toFiniteDouble(match['max_critico']) : null;
    final valorIdeal = match != null ? toFiniteDouble(match['valor_ideal']) : null;
    final unidad =
        (match != null ? _toNonEmptyString(match['unidad_medida']) : null) ??
        _resolverUnidadLegacy(config, codigoParametro);

    final tieneAlgunValor =
        minNormal != null ||
        maxNormal != null ||
        minCritico != null ||
        maxCritico != null ||
        valorIdeal != null ||
        unidad != null;

    if (!tieneAlgunValor) return null;

    return RangosParametroResueltos(
      minNormal: minNormal,
      maxNormal: maxNormal,
      minCritico: minCritico,
      maxCritico: maxCritico,
      valorIdeal: valorIdeal,
      unidadMedida: unidad,
      esPersonalizado: true,
    );
  }

  static String? _resolverUnidadLegacy(
    Map<String, dynamic> config,
    String codigoParametro,
  ) {
    final unidades = _asStringMap(config['unidades']);
    if (unidades == null || unidades.isEmpty) return null;

    final codigoUpper = codigoParametro.trim().toUpperCase();
    final magnitudExacta = _legacyCodigoAMagnitud[codigoUpper];
    if (magnitudExacta != null) {
      return _toNonEmptyString(unidades[magnitudExacta]);
    }

    // Fallback seguro solo para magnitudes térmicas/eléctricas/presión sin colisionar velocidad m/s vs RPM
    if (codigoUpper.contains('TEMP')) {
      return _toNonEmptyString(unidades['temperatura']);
    }
    if (codigoUpper.contains('PRES')) {
      return _toNonEmptyString(unidades['presion']);
    }
    if (codigoUpper.contains('VOLT') || codigoUpper.contains('TENSION')) {
      return _toNonEmptyString(unidades['voltaje']);
    }
    if (codigoUpper.contains('FREC')) {
      return _toNonEmptyString(unidades['frecuencia']);
    }
    if (codigoUpper.contains('AMPER') || codigoUpper.contains('CORR')) {
      return _toNonEmptyString(unidades['corriente']);
    }
    if (codigoUpper.contains('RPM')) {
      return _toNonEmptyString(unidades['velocidad']);
    }
    return null;
  }

  /// Resuelve la unidad personalizada del equipo para un parámetro o null para usar catálogo.
  static String? resolverUnidadPersonalizada({
    required String? configParametrosJson,
    required String codigoParametro,
    int? idParametro,
  }) {
    final config = _decodeConfig(configParametrosJson);
    if (config == null) return null;

    final match = _buscarOverrideEnMapa(
      config,
      codigoParametro: codigoParametro,
      idParametro: idParametro,
    );
    final unitOverride =
        match != null ? _toNonEmptyString(match['unidad_medida']) : null;
    if (unitOverride != null) return unitOverride;

    return _resolverUnidadLegacy(config, codigoParametro);
  }
}
