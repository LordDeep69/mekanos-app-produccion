/// Configuración de entorno para la app Mekanos
///
/// IMPORTANTE: Esta clase detecta automáticamente el entorno
/// - Emulador Android: 10.0.2.2 (localhost del host)
/// - Dispositivo físico: IP de red local del servidor
/// - Web: localhost directo
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

class Environment {
  Environment._();

  /// ✅ IP del servidor en red local (tu PC)
  /// IMPORTANTE: Cambiar esta IP si cambia tu red
  static const String _localNetworkIp = '192.168.1.76';

  /// Puerto del backend
  static const int _backendPort = 3000;

  /// URL base del backend según el entorno de ejecución
  static String get apiBaseUrl {
    if (kIsWeb) {
      // Web siempre usa localhost
      return 'http://localhost:$_backendPort/api';
    }

    if (Platform.isAndroid) {
      // En RELEASE (APK física) → usar IP de red local
      // En DEBUG (emulador) → usar 10.0.2.2
      if (kReleaseMode) {
        return 'http://$_localNetworkIp:$_backendPort/api';
      } else {
        return 'http://10.0.2.2:$_backendPort/api';
      }
    }

    // iOS Simulator y otros usan localhost
    return 'http://localhost:$_backendPort/api';
  }

  /// Timeout para requests HTTP (en segundos)
  /// ✅ FIX: Aumentado a 320s porque /finalizar-completo tarda ~25s
  static const int requestTimeout = 320;

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
