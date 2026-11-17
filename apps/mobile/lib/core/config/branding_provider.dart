/// Configuración White-Label de la organización hidratada desde `/api/configuracion/publica`.
///
/// Funciona 100% offline-first: cachea el payload JSON en `SharedPreferences`
/// ligado al origen del servidor activo para reflejar logo, nombre comercial,
/// colores y formato regional sin conexión.
library;

import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../storage/account_scope.dart';
import 'app_config.dart';
import 'environment.dart';

class OrgBrandingConfig {
  final String nombreComercial;
  final String? eslogan;
  final String? logoPrincipalUrl;
  final String? logoClaroUrl;
  final String? isotipoUrl;
  final Color colorPrimario;
  final Color colorSecundario;
  final Color colorAcento;
  final String locale;
  final String codigoMoneda;
  final String simboloMoneda;
  final int decimalesMoneda;
  final String zonaHoraria;

  const OrgBrandingConfig({
    required this.nombreComercial,
    this.eslogan,
    this.logoPrincipalUrl,
    this.logoClaroUrl,
    this.isotipoUrl,
    required this.colorPrimario,
    required this.colorSecundario,
    required this.colorAcento,
    required this.locale,
    required this.codigoMoneda,
    required this.simboloMoneda,
    required this.decimalesMoneda,
    required this.zonaHoraria,
  });

  factory OrgBrandingConfig.defaults() {
    return const OrgBrandingConfig(
      nombreComercial: AppConfig.appName,
      eslogan: 'Gestión Técnica de Mantenimiento y Activos',
      colorPrimario: Color(0xFF1E40AF),
      colorSecundario: Color(0xFF0F172A),
      colorAcento: Color(0xFF0EA5E9),
      locale: 'es-CO',
      codigoMoneda: 'USD',
      simboloMoneda: '\$',
      decimalesMoneda: 2,
      zonaHoraria: 'America/Bogota',
    );
  }

  factory OrgBrandingConfig.fromJson(Map<String, dynamic> json) {
    final base = OrgBrandingConfig.defaults();
    final nombre = (json['nombre_comercial']?.toString() ?? '').trim();
    return OrgBrandingConfig(
      nombreComercial: nombre.isNotEmpty ? nombre : base.nombreComercial,
      eslogan: _nonEmpty(json['eslogan']) ?? base.eslogan,
      logoPrincipalUrl: _nonEmpty(json['logo_principal_url']),
      logoClaroUrl: _nonEmpty(json['logo_claro_url']),
      isotipoUrl: _nonEmpty(json['isotipo_url']),
      colorPrimario: parseHexColor(json['color_primario']?.toString(), base.colorPrimario),
      colorSecundario: parseHexColor(json['color_secundario']?.toString(), base.colorSecundario),
      colorAcento: parseHexColor(json['color_acento']?.toString(), base.colorAcento),
      locale: _nonEmpty(json['locale']) ?? base.locale,
      codigoMoneda: _nonEmpty(json['codigo_moneda']) ?? base.codigoMoneda,
      simboloMoneda: _nonEmpty(json['simbolo_moneda']) ?? base.simboloMoneda,
      decimalesMoneda: (json['decimales_moneda'] is num)
          ? (json['decimales_moneda'] as num).toInt()
          : base.decimalesMoneda,
      zonaHoraria: _nonEmpty(json['zona_horaria']) ?? base.zonaHoraria,
    );
  }

  Map<String, dynamic> toJson() => {
    'nombre_comercial': nombreComercial,
    'eslogan': eslogan,
    'logo_principal_url': logoPrincipalUrl,
    'logo_claro_url': logoClaroUrl,
    'isotipo_url': isotipoUrl,
    'color_primario': colorToHex(colorPrimario),
    'color_secundario': colorToHex(colorSecundario),
    'color_acento': colorToHex(colorAcento),
    'locale': locale,
    'codigo_moneda': codigoMoneda,
    'simbolo_moneda': simboloMoneda,
    'decimales_moneda': decimalesMoneda,
    'zona_horaria': zonaHoraria,
  };

  Locale get materialLocale {
    final parts = locale.split(RegExp(r'[-_]'));
    if (parts.length >= 2 && parts[1].isNotEmpty) {
      return Locale(parts[0].toLowerCase(), parts[1].toUpperCase());
    }
    return Locale(parts.first.toLowerCase());
  }

  static String? _nonEmpty(Object? val) {
    final s = val?.toString().trim();
    return (s != null && s.isNotEmpty) ? s : null;
  }

  static Color parseHexColor(String? raw, Color fallback) {
    if (raw == null || raw.trim().isEmpty) return fallback;
    var clean = raw.trim().replaceAll('#', '');
    if (clean.length == 6) clean = 'FF$clean';
    if (clean.length != 8) return fallback;
    final parsed = int.tryParse(clean, radix: 16);
    return parsed != null ? Color(parsed) : fallback;
  }

  static String colorToHex(Color c) {
    final argb = c.toARGB32().toRadixString(16).padLeft(8, '0');
    return '#${argb.substring(2).toUpperCase()}';
  }
}

final brandingProvider =
    StateNotifierProvider<BrandingNotifier, OrgBrandingConfig>((ref) {
      return BrandingNotifier();
    });

class BrandingNotifier extends StateNotifier<OrgBrandingConfig> {
  BrandingNotifier({Dio? dio})
    : _dio = dio,
      super(OrgBrandingConfig.defaults()) {
    Environment.stateListenable.addListener(_onEnvironmentChanged);
    hydrate();
  }

  final Dio? _dio;
  bool _disposed = false;

  void _onEnvironmentChanged() {
    state = OrgBrandingConfig.defaults();
    hydrate();
  }

  /// Hidrata primero desde caché local offline y luego refresca de `/configuracion/publica`.
  Future<void> hydrate() async {
    final baseUrl = Environment.apiBaseUrl;
    final cacheKey = AccountScope.brandingCacheKey(baseUrl);

    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedRaw = prefs.getString(cacheKey);
      if (!_disposed && cachedRaw != null && cachedRaw.trim().isNotEmpty) {
        final decoded = jsonDecode(cachedRaw);
        if (decoded is Map<String, dynamic>) {
          state = OrgBrandingConfig.fromJson(decoded);
        } else if (decoded is Map) {
          state = OrgBrandingConfig.fromJson(Map<String, dynamic>.from(decoded));
        }
      }
    } catch (_) {}

    await refresh(baseUrl: baseUrl, cacheKey: cacheKey);
  }

  Future<void> refresh({String? baseUrl, String? cacheKey}) async {
    final targetBase = baseUrl ?? Environment.apiBaseUrl;
    final key = cacheKey ?? AccountScope.brandingCacheKey(targetBase);

    final client =
        _dio ??
        Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 5),
          ),
        );
    final ownsClient = _dio == null;

    try {
      final res = await client.get('$targetBase/configuracion/publica');
      if (!_disposed && res.statusCode == 200 && res.data is Map) {
        final map = Map<String, dynamic>.from(res.data as Map);
        final nextConfig = OrgBrandingConfig.fromJson(map);
        state = nextConfig;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(key, jsonEncode(nextConfig.toJson()));
      }
    } catch (_) {
      // Offline-first: mantiene defaults o última caché válida sin lanzar error
    } finally {
      if (ownsClient) {
        client.close(force: true);
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    Environment.stateListenable.removeListener(_onEnvironmentChanged);
    super.dispose();
  }
}
