/// Configuración de entorno para la app Mekanos
///
/// IMPORTANTE: Esta clase detecta automáticamente el entorno
/// - Emulador Android: 10.0.2.2 (localhost del host)
/// - Dispositivo físico o web: localhost directo
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

class Environment {
  Environment._();

  /// URL base del backend según el entorno de ejecución
  static String get apiBaseUrl {
    if (kIsWeb) {
      // Web siempre usa localhost
      return 'http://localhost:3000/api';
    }

    if (Platform.isAndroid) {
      // Emulador Android necesita 10.0.2.2 para alcanzar localhost del host
      return 'http://10.0.2.2:3000/api';
    }

    // iOS Simulator y otros usan localhost
    return 'http://localhost:3000/api';
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
