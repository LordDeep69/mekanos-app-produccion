/// App Mobile Mekanos - Punto de entrada
///
/// Estructura:
/// - ProviderScope (Riverpod) envuelve toda la app
/// - AuthWrapper decide qué pantalla mostrar según estado de auth
/// - ✅ ENTERPRISE: SyncNotificationService para feedback de sincronización
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/api/api_client.dart';
import 'core/config/supabase_config.dart';
import 'core/errors/user_friendly_error.dart';
import 'core/sync/sync_notification_service.dart';
import 'features/auth/data/auth_models.dart';
import 'features/auth/data/auth_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/orders/presentation/home_production_screen.dart';

/// GlobalKey para ScaffoldMessenger (notificaciones globales)
final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

void main() {
  // ✅ FIX: Todo debe estar en la MISMA zona para evitar "Zone mismatch"
  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await initializeDateFormatting('es_CO', null);

      // Inicializar Supabase en background
      SupabaseConfig.initialize().catchError((_) {});

      // Manejo de errores global
      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details);
        if (kDebugMode) {
          debugPrint('🔴 Flutter Error: ${details.exception}');
          debugPrint('📍 Stack: ${details.stack}');
        }
      };

      // ✅ 26-OCT-2026: un widget que falla NUNCA muestra el stack trace al
      // técnico. En release se ve un mensaje claro y accionable.
      ErrorWidget.builder = (details) {
        debugPrint('🔴 [UI] Widget con error: ${details.exception}');
        return Directionality(
          textDirection: TextDirection.ltr,
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 48,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(height: 12),
                const Text(
                  'No se pudo mostrar esta sección.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Vuelve a abrir la pantalla. Si persiste, cierra y abre la app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
        );
      };

      runApp(const ProviderScope(child: MekanosApp()));
    },
    (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('🔴 Uncaught Error: $error');
        debugPrint('📍 Stack: $stackTrace');
      }
      // ✅ 26-OCT-2026: los errores asíncronos no controlados se avisan de
      // forma breve y en español, sin exponer el detalle técnico.
      try {
        scaffoldMessengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(
              mensajeAmigable(error, contexto: 'completar la operación'),
            ),
            backgroundColor: const Color(0xFFB3261E),
            duration: const Duration(seconds: 5),
          ),
        );
      } catch (_) {
        // La app puede estar cerrándose: no hay nada más que hacer.
      }
    },
  );
}

class MekanosApp extends ConsumerStatefulWidget {
  const MekanosApp({super.key});

  @override
  ConsumerState<MekanosApp> createState() => _MekanosAppState();
}

class _MekanosAppState extends ConsumerState<MekanosApp> {
  @override
  void initState() {
    super.initState();
    // ✅ ENTERPRISE: Configurar SyncNotificationService después del primer frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final notificationService = ref.read(syncNotificationServiceProvider);
      notificationService.setScaffoldKey(scaffoldMessengerKey);
    });
  }

  @override
  Widget build(BuildContext context) {
    // ✅ ENTERPRISE: Escuchar evento de sesión expirada
    ref.listen<DateTime?>(authExpiredEventProvider, (previous, next) {
      if (next != null && previous != next) {
        // Sesión expirada - mostrar notificación y hacer logout
        final notificationService = ref.read(syncNotificationServiceProvider);
        notificationService.notifySessionExpired();

        // Hacer logout después de mostrar notificación
        Future.delayed(const Duration(seconds: 2), () {
          ref.read(authStateProvider.notifier).logout();
        });
      }
    });

    return MaterialApp(
      title: 'Mekanos Técnicos',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey:
          scaffoldMessengerKey, // ✅ ENTERPRISE: Key global para SnackBars
      // Localizaciones para DatePicker y otros widgets Material
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('es', 'CO'), // Español Colombia
        Locale('es', ''), // Español genérico
        Locale('en', ''), // Inglés fallback
      ],
      locale: const Locale('es', 'CO'),
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(centerTitle: true, elevation: 2),
      ),
      home: const AuthWrapper(),
    );
  }
}

/// Widget que decide qué pantalla mostrar según el estado de autenticación
class AuthWrapper extends ConsumerWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    // Mostrar pantalla según estado
    switch (authState.status) {
      case AuthStatus.initial:
      case AuthStatus.loading:
        // Splash/Loading mientras verifica token
        return const Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Verificando sesión...'),
              ],
            ),
          ),
        );

      case AuthStatus.authenticated:
        // Usuario autenticado → Home de Producción
        return const HomeProductionScreen();

      case AuthStatus.unauthenticated:
      case AuthStatus.error:
        // Sin autenticar o error → Login
        return const LoginScreen();
    }
  }
}
