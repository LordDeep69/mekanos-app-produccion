/// Provider de autenticación con Riverpod
///
/// Maneja el estado global de autenticación de la app
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_models.dart';
import 'auth_service.dart';

/// Provider del estado de autenticación
/// Nota: secureStorageProvider está en secure_storage.dart
/// Nota: authServiceProvider está en auth_service.dart
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});

/// Notifier que maneja el estado de autenticación
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthNotifier(this._authService) : super(const AuthState()) {
    // Verificar token guardado al iniciar
    checkAuthStatus();
  }

  /// Verifica si hay un token guardado válido
  Future<void> checkAuthStatus() async {
    state = state.copyWith(status: AuthStatus.loading);

    try {
      final user = await _authService.checkAuthStatus();

      if (user != null) {
        state = state.copyWith(status: AuthStatus.authenticated, user: user);
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  /// Realiza login
  Future<bool> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);

    try {
      final response = await _authService.login(email, password);

      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
      );

      return true;
    } on AuthException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Error inesperado: $e',
      );
      return false;
    }
  }

  /// Cierra sesión
  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Limpia el mensaje de error
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}
