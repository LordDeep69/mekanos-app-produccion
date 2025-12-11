/// Modelos de datos para autenticación
///
/// Estos modelos mapean directamente con las respuestas del backend
library;

/// Request para login
class LoginRequest {
  final String email;
  final String password;

  LoginRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}

/// Respuesta del endpoint POST /api/auth/login
class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final UserInfo user;

  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      user: UserInfo.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

/// Información del usuario autenticado
class UserInfo {
  final int id;
  final String email;
  final String? nombre;
  final String rol;
  final int? personaId;
  final int? idEmpleado; // ID del empleado para sincronización

  UserInfo({
    required this.id,
    required this.email,
    this.nombre,
    required this.rol,
    this.personaId,
    this.idEmpleado,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: json['id'] as int,
      email: json['email'] as String,
      nombre: json['nombre'] as String?,
      rol: json['rol'] as String,
      personaId: json['personaId'] as int?,
      idEmpleado: json['idEmpleado'] as int?,
    );
  }

  /// Obtiene el ID para sincronización (preferir idEmpleado, fallback a id)
  int get syncId => idEmpleado ?? id;
}

/// Estado de autenticación para la app
enum AuthStatus {
  initial, // Estado inicial, verificando token guardado
  authenticated, // Usuario autenticado
  unauthenticated, // Sin autenticar
  loading, // Procesando login/logout
  error, // Error de autenticación
}

/// Estado completo de autenticación
class AuthState {
  final AuthStatus status;
  final UserInfo? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserInfo? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }

  // Estados helpers
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get hasError => status == AuthStatus.error;
}
