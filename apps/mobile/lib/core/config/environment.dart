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

  /// ✅ Backend en producción (Cloudflare Tunnel)
  static const String _productionApiUrl =
      'https://api.mekanosapp.dpdns.org/api';

  /// ✅ IP del servidor en red local (tu PC) - Solo para desarrollo
  static const String _localNetworkIp = '192.168.1.76';
  static const int _backendPort = 3000;

  /// 🔧 CONFIGURACIÓN: Cambiar a true para usar backend local en desarrollo
  /// false = usar Render (recomendado para pruebas de integración)
  /// true = usar localhost (solo si tienes el backend corriendo localmente)
  static const bool _useLocalBackendInDebug = false;

  /// URL base del backend según el entorno de ejecución
  static String get apiBaseUrl {
    // 🚀 PRODUCCIÓN: Siempre usar Render en RELEASE mode
    if (kReleaseMode) {
      return _productionApiUrl;
    }

    // 🔧 DESARROLLO: Usar Render por defecto, o localhost si está configurado
    if (!_useLocalBackendInDebug) {
      return _productionApiUrl;
    }

    // Usar localhost/emulador según plataforma
    if (kIsWeb) {
      return 'http://localhost:$_backendPort/api';
    }

    if (Platform.isAndroid) {
      // Emulador Android usa 10.0.2.2
      return 'http://10.0.2.2:$_backendPort/api';
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
