/// App Mobile Mekanos - Punto de entrada
///
/// Estructura:
/// - ProviderScope (Riverpod) envuelve toda la app
/// - AuthWrapper decide qué pantalla mostrar según estado de auth
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/config/supabase_config.dart';
import 'features/auth/data/auth_models.dart';
import 'features/auth/data/auth_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/orders/presentation/home_screen.dart';

void main() async {
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
  };

  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    await initializeDateFormatting('es_CO', null);

    // Inicializar Supabase en background
    SupabaseConfig.initialize().catchError((_) {});

    runApp(const ProviderScope(child: MekanosApp()));
  }, (_, __) {});
}

class MekanosApp extends StatelessWidget {
  const MekanosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mekanos Técnicos',
      debugShowCheckedModeBanner: false,
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
        // Usuario autenticado → Home
        return const HomeScreen();

      case AuthStatus.unauthenticated:
      case AuthStatus.error:
        // Sin autenticar o error → Login
        return const LoginScreen();
    }
  }
}
