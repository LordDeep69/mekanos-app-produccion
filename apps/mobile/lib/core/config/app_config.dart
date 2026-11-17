/// Configuración parametrizable en tiempo de compilación (--dart-define).
///
/// Permite construir la app móvil para cualquier organización White-Label
/// sin editar código fuente:
/// ```bash
/// flutter build apk --release \
///   --dart-define=APP_NAME="Puertas Automáticas" \
///   --dart-define=API_BASE_URL=https://api.puertas.example.com/api \
///   --dart-define=SUPABASE_URL=... \
///   --dart-define=SUPABASE_ANON_KEY=...
/// ```
library;

class AppConfig {
  AppConfig._();

  /// Nombre visible de la app si aún no se ha sincronizado branding del servidor.
  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'EAM Técnicos',
  );

  /// URL base por defecto del backend NestJS (`/api`).
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.mekanosapp.dpdns.org/api',
  );

  /// Puerto estándar del backend NestJS en red local.
  static const int localApiPort = int.fromEnvironment(
    'LOCAL_API_PORT',
    defaultValue: 3000,
  );

  /// Configuración opcional de Supabase Realtime por tenant.
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  /// Control de acceso al selector QA de servidores desde Login:
  /// Deshabilitado en builds `--release` salvo que se compile con
  /// `--dart-define=ENABLE_QA_SERVER_SWITCHER=true` y un SHA-256 explícito.
  static const bool enableQaServerSwitcher = bool.fromEnvironment(
    'ENABLE_QA_SERVER_SWITCHER',
    defaultValue: !bool.fromEnvironment('dart.vm.product'),
  );

  /// Hash SHA-256 de la contraseña QA (vía --dart-define=QA_PASS_SHA256=...).
  static const String qaPassSha256 = String.fromEnvironment(
    'QA_PASS_SHA256',
    defaultValue: String.fromEnvironment('MEKANOS_QA_PASS_SHA256'),
  );

  static bool get hasSupabaseConfig =>
      supabaseUrl.trim().isNotEmpty && supabaseAnonKey.trim().isNotEmpty;
}
