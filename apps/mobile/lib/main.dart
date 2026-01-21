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

      runApp(const ProviderScope(child: MekanosApp()));
    },
    (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('🔴 Uncaught Error: $error');
        debugPrint('📍 Stack: $stackTrace');
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
