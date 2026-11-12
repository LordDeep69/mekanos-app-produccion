/// Configuración de entorno para la app Mekanos
///
/// Política Zero-Trust de Entornos:
/// - Todo arranque en frío inicia SIEMPRE en Producción
///   (`https://api.mekanosapp.dpdns.org/api`) para evitar errores operativos en campo.
/// - El conmutador a API Local o URL Directa vive en memoria de sesión únicamente,
///   activado explícitamente desde el gesto protegido por contraseña en Login.
library;

import 'package:flutter/foundation.dart' show ValueListenable, ValueNotifier, debugPrint;

/// Modos de destino API disponibles en tiempo de ejecución.
enum ApiEnvironmentMode {
  production,
  local,
  custom,
}

/// Estado inmutable del entorno activo en la sesión actual.
class EnvironmentState {
  final ApiEnvironmentMode mode;
  final String baseUrl;
  final String? serverHostname;
  final String? serverEnvironment;
  final String? serverCommit;
  final String? originLabel;

  const EnvironmentState({
    required this.mode,
    required this.baseUrl,
    this.serverHostname,
    this.serverEnvironment,
    this.serverCommit,
    this.originLabel,
  });

  bool get isProduction => mode == ApiEnvironmentMode.production;
}

class Environment {
  Environment._();

  /// 🌐 Backend en producción (Cloudflare Tunnel) — permanente por defecto al iniciar
  static const String _productionApiUrl =
      'https://api.mekanosapp.dpdns.org/api';

  /// 🔌 Puerto estándar del backend NestJS local
  static const int localPort = 3000;

  /// Timeout para requests HTTP (en segundos)
  /// Aumentado a 320s porque /finalizar-completo tarda ~25s
  static const int requestTimeout = 320;

  /// Timeout corto para verificaciones de salud / descubrimiento (en segundos)
  static const int healthCheckTimeout = 4;

  static const EnvironmentState _defaultState = EnvironmentState(
    mode: ApiEnvironmentMode.production,
    baseUrl: _productionApiUrl,
    originLabel: 'Producción (Estándar)',
  );

  static final ValueNotifier<EnvironmentState> _stateNotifier =
      ValueNotifier<EnvironmentState>(_defaultState);

  /// Observable reactivo para UI (Login / Banners QA)
  static ValueListenable<EnvironmentState> get stateListenable => _stateNotifier;

  /// Snapshot actual del entorno
  static EnvironmentState get currentState => _stateNotifier.value;

  /// Modo activo en la sesión actual
  static ApiEnvironmentMode get activeMode => _stateNotifier.value.mode;

  /// Indica si la app está apuntando al servidor de producción
  static bool get isProductionActive => _stateNotifier.value.isProduction;

  /// URL base del backend actualmente activa
  static String get apiBaseUrl => _stateNotifier.value.baseUrl;

  /// URL fija de producción
  static String get productionApiUrl => _productionApiUrl;

  /// Si estamos compilados en modo debug
  static bool get isDebug {
    bool debug = false;
    assert(() {
      debug = true;
      return true;
    }());
    return debug;
  }

  /// Restablece de inmediato al servidor permanente de producción
  static void useProduction() {
    debugPrint('🌐 [Environment] Entorno establecido a Producción: $_productionApiUrl');
    _stateNotifier.value = _defaultState;
  }

  /// Activa una URL local verificada (solo en memoria de esta sesión)
  static void setLocalApiUrl(
    String url, {
    String? hostname,
    String? serverEnvironment,
    String? commit,
    String? originLabel,
  }) {
    final normalized = normalizeApiBaseUrl(url) ?? url;
    debugPrint(
      '🛠️ [Environment] Entorno LOCAL activo: $normalized (${hostname ?? 'sin hostname'})',
    );
    _stateNotifier.value = EnvironmentState(
      mode: ApiEnvironmentMode.local,
      baseUrl: normalized,
      serverHostname: hostname,
      serverEnvironment: serverEnvironment,
      serverCommit: commit,
      originLabel: originLabel ?? 'Red Local',
    );
  }

  /// Activa una URL directa ingresada manualmente (solo en memoria de esta sesión)
  static void setCustomApiUrl(
    String rawUrl, {
    String? hostname,
    String? serverEnvironment,
    String? commit,
  }) {
    final normalized = normalizeApiBaseUrl(rawUrl);
    if (normalized == null) {
      throw ArgumentError('URL de API inválida: $rawUrl');
    }
    debugPrint('🔗 [Environment] Entorno DIRECTO activo: $normalized');
    _stateNotifier.value = EnvironmentState(
      mode: ApiEnvironmentMode.custom,
      baseUrl: normalized,
      serverHostname: hostname,
      serverEnvironment: serverEnvironment,
      serverCommit: commit,
      originLabel: 'URL Directa',
    );
  }

  /// Actualiza URL activa preservando modo local/custom cuando ocurre redescubrimiento
  static void setActiveApiUrl(String url) {
    final normalized = normalizeApiBaseUrl(url) ?? url;
    if (normalized == _productionApiUrl) {
      useProduction();
      return;
    }
    final current = _stateNotifier.value;
    _stateNotifier.value = EnvironmentState(
      mode: current.mode == ApiEnvironmentMode.production
          ? ApiEnvironmentMode.local
          : current.mode,
      baseUrl: normalized,
      serverHostname: current.serverHostname,
      serverEnvironment: current.serverEnvironment,
      serverCommit: current.serverCommit,
      originLabel: current.originLabel,
    );
  }

  /// Normaliza una URL de API hacia `<esquema>://<host>[:puerto][/ruta]/api`.
  /// Devuelve `null` si el texto no representa una URL HTTP/HTTPS válida.
  static String? normalizeApiBaseUrl(String raw) {
    var trimmed = raw.trim();
    if (trimmed.isEmpty || RegExp(r'\s').hasMatch(trimmed)) return null;

    if (!trimmed.contains('://')) {
      trimmed = 'http://$trimmed';
    }

    final parsed = Uri.tryParse(trimmed);
    if (parsed == null ||
        !(parsed.scheme == 'http' || parsed.scheme == 'https') ||
        parsed.host.trim().isEmpty) {
      return null;
    }

    var path = parsed.path;
    while (path.endsWith('/') && path.isNotEmpty) {
      path = path.substring(0, path.length - 1);
    }

    if (path.endsWith('/api/health')) {
      path = path.substring(0, path.length - '/health'.length);
    } else if (path.isEmpty) {
      path = '/api';
    } else if (!path.endsWith('/api')) {
      path = '$path/api';
    }

    final cleanUri = parsed.replace(
      path: path,
      query: null,
      fragment: null,
    );
    var result = cleanUri.toString();
    // Uri.replace(query: null) puede dejar '?' vacío si el input traía '?'; eliminar.
    if (result.endsWith('?')) {
      result = result.substring(0, result.length - 1);
    }
    return result;
  }
}
