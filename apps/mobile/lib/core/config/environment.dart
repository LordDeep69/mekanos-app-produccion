/// Configuración de entorno para la app Mekanos
///
/// Soporta:
/// - Producción vía Cloudflare Tunnel (https://api.mekanosapp.dpdns.org/api)
/// - Red Local Wi-Fi para pruebas (http://192.168.1.7:3000/api)
/// - Emulador Android: 10.0.2.2
/// - Auto-failover inteligente cuando el túnel de Cloudflare esté deshabilitado (Error 1033 / 502 / Offline)
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;

class Environment {
  Environment._();

  /// 🌐 Backend en producción (Cloudflare Tunnel)
  static const String _productionApiUrl =
      'https://api.mekanosapp.dpdns.org/api';

  /// 🏠 IP de red local del servidor (PC anfitrión en la red Wi-Fi local)
  static const String _localNetworkIp = '192.168.1.7';

  /// 🔌 Puerto del backend NestJS API (Donde residen los endpoints /api/auth/login, /api/sync, etc.)
  static const int localPort = 3000;

  /// 🔌 Puerto alternativo directo
  static const int directApiPort = 3000;

  /// 🔧 CAMBIO PROVISIONAL PARA PRUEBAS EN LOCAL:
  /// - true: Conecta inmediatamente al servidor local (192.168.1.7:3000)
  ///         tanto en Debug como en Release (APK de pruebas).
  /// - false: Usa el túnel de producción por defecto, con conmutación automática si está caído.
  /// 👉 Para restablecer cuando termine la prueba, cambiar a: false.
  static const bool useLocalServerProvisional = false;

  /// URL activa en tiempo de ejecución (permite failover dinámico)
  static String? _dynamicApiUrl;

  /// URL base del backend actualmente activa
  static String get apiBaseUrl {
    if (_dynamicApiUrl != null) {
      return _dynamicApiUrl!;
    }
    return _defaultApiUrl;
  }

  /// Establece dinámicamente la URL base (usado por el failover automático)
  static void setActiveApiUrl(String url) {
    debugPrint('🔄 [Environment] Conmutando URL base activa a: $url');
    _dynamicApiUrl = url;
  }

  /// Restablece la URL a la configuración predeterminada
  static void resetActiveApiUrl() {
    debugPrint('🔄 [Environment] Restableciendo URL base a la predeterminada');
    _dynamicApiUrl = null;
  }

  /// URL local según la plataforma (puerto 3001)
  static String get localApiUrl {
    if (kIsWeb) {
      return 'http://localhost:$localPort/api';
    }
    if (Platform.isAndroid) {
      return 'http://$_localNetworkIp:$localPort/api';
    }
    return 'http://localhost:$localPort/api';
  }

  /// URL de respaldo local directa a NestJS (puerto 3000)
  static String get localDirectApiUrl {
    if (kIsWeb) {
      return 'http://localhost:$directApiPort/api';
    }
    if (Platform.isAndroid) {
      return 'http://$_localNetworkIp:$directApiPort/api';
    }
    return 'http://localhost:$directApiPort/api';
  }

  /// URL de producción
  static String get productionApiUrl => _productionApiUrl;

  /// URL predeterminada al arrancar
  static String get _defaultApiUrl {
    // Si está habilitado el modo provisional para pruebas locales:
    if (useLocalServerProvisional) {
      return localApiUrl;
    }

    // Modo producción estándar:
    return _productionApiUrl;
  }

  /// Timeout para requests HTTP (en segundos)
  /// Aumentado a 320s porque /finalizar-completo tarda ~25s
  static const int requestTimeout = 320;

  /// Timeout corto para verificaciones de salud / failover (en segundos)
  static const int healthCheckTimeout = 4;

  /// Si estamos en modo debug
  static bool get isDebug {
    bool debug = false;
    assert(() {
      debug = true;
      return true;
    }());
    return debug;
  }
}
