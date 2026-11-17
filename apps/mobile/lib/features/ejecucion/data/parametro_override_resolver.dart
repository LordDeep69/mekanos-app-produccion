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
/// Prioridad de resolución (agnóstica a verticales, idéntica al backend NestJS):
/// 1. `por_parametro[idParametro.toString()]` o `por_parametro[codigoParametro]` (key o campo interno)
/// 2. `parametros_adicionales[]` por `id_parametro_medicion` o `codigo_parametro`
/// 3. `rangos[codigoParametro]` directo (case-insensitive)
class ParametroOverrideResolver {

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
    if (match == null) return null;

    final minNormal = toFiniteDouble(match['min_normal']);
    final maxNormal = toFiniteDouble(match['max_normal']);
    final minCritico = toFiniteDouble(match['min_critico']);
    final maxCritico = toFiniteDouble(match['max_critico']);
    final valorIdeal = toFiniteDouble(match['valor_ideal']);
    final unidad = _toNonEmptyString(match['unidad_medida']);

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
    return match != null ? _toNonEmptyString(match['unidad_medida']) : null;
  }
}
