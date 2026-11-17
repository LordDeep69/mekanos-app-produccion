/// Configuración de Supabase para Realtime por tenant.
///
/// Lee credenciales exclusivamente de `--dart-define=SUPABASE_URL` y
/// `--dart-define=SUPABASE_ANON_KEY`. Si no están configuradas, Realtime se
/// omite sin afectar la operación offline-first ni las APIs REST.
library;

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';

class SupabaseConfig {
  static bool _initialized = false;

  static String get supabaseUrl => AppConfig.supabaseUrl;
  static String get supabaseAnonKey => AppConfig.supabaseAnonKey;

  static bool get isConfigured => AppConfig.hasSupabaseConfig;

  /// Inicializa Supabase solo si hay credenciales configuradas en compilación.
  static Future<void> initialize() async {
    if (_initialized || !isConfigured) {
      if (!isConfigured) {
        debugPrint('ℹ️ [Supabase] Realtime deshabilitado (sin SUPABASE_URL configurado)');
      }
      return;
    }

    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      realtimeClientOptions: const RealtimeClientOptions(eventsPerSecond: 10),
    );
    _initialized = true;
  }

  /// Retorna el cliente si Supabase fue inicializado, o `null` en caso contrario.
  static SupabaseClient? get clientOrNull {
    if (!_initialized) return null;
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }
}
