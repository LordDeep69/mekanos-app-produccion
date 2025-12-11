/// Configuración de Supabase para la app móvil
///
/// Credenciales para conectar a Supabase Realtime
/// RUTA 14 - Notificaciones
library;

import 'package:supabase_flutter/supabase_flutter.dart';

/// Configuración de Supabase
class SupabaseConfig {
  // URL del proyecto Supabase
  static const String supabaseUrl = 'https://nemrrkaobdlwehfnetxs.supabase.co';

  // Anon Key (público, solo para operaciones autenticadas)
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbXJya2FvYmRsd2VoZm5ldHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk0MzYsImV4cCI6MjA3NzI0NTQzNn0.7fXM9v1m31j5ZnOlSS-IyGWkvCPIrXsSIs9eWn2_xiE';

  /// Inicializa Supabase
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      // Configuración para Realtime
      realtimeClientOptions: const RealtimeClientOptions(eventsPerSecond: 10),
    );
  }

  /// Cliente de Supabase (singleton)
  static SupabaseClient get client => Supabase.instance.client;
}
