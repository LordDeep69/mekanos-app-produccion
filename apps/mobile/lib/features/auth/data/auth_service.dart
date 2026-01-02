/// Servicio de autenticación
///
/// Maneja la comunicación con el backend para:
/// - Login (POST /api/auth/login)
/// - Verificación de token
/// - Logout
library;

import 'dart:convert' show base64Url;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import 'auth_models.dart';

/// Provider para el servicio de autenticación
final authServiceProvider = Provider<AuthService>((ref) {
  final storage = ref.watch(secureStorageProvider);
  final apiClient = ref.watch(apiClientProvider);
  return AuthService(storage, apiClient.dio);
});

class AuthService {
  final SecureStorageService _storage;
  final Dio _dio;

  AuthService(this._storage, this._dio);

  /// Realiza login contra el backend
  ///
  /// Retorna [AuthResponse] si es exitoso, lanza excepción si falla
  Future<AuthResponse> login(String email, String password) async {
    try {
      debugPrint('🔐 Intentando login para: $email');

      final response = await _dio.post(
        '/auth/login',
        data: LoginRequest(email: email, password: password).toJson(),
      );

      debugPrint('📥 Respuesta recibida: ${response.statusCode}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data as Map<String, dynamic>;

        // El backend devuelve tokens directamente
        final accessToken = data['access_token'] as String;
        final refreshToken = data['refresh_token'] as String;

        // Guardar tokens
        await _storage.saveAccessToken(accessToken);
        await _storage.saveRefreshToken(refreshToken);

        // ✅ FIX: Usar datos del response body (contiene idEmpleado)
        // El JWT no contiene idEmpleado, solo el response body lo tiene
        UserInfo userInfo;
        if (data['user'] != null) {
          // Usar datos completos del backend
          userInfo = UserInfo.fromJson(data['user'] as Map<String, dynamic>);
          debugPrint('👷 idEmpleado del backend: ${userInfo.idEmpleado}');
        } else {
          // Fallback: decodificar del JWT (sin idEmpleado)
          userInfo = _decodeJwtPayload(accessToken);
        }

        await _storage.saveUserId(userInfo.id);
        await _storage.saveUserEmail(userInfo.email);
        // ✅ NUEVO: Guardar nombre del usuario (de tabla persona)
        if (userInfo.nombre != null) {
          await _storage.saveUserName(userInfo.nombre!);
        }
        // ✅ Guardar idEmpleado para recuperarlo después
        if (userInfo.idEmpleado != null) {
          await _storage.saveIdEmpleado(userInfo.idEmpleado!);
        }

        debugPrint(
          '✅ Login exitoso - ID: ${userInfo.id}, idEmpleado: ${userInfo.idEmpleado}, syncId: ${userInfo.syncId}',
        );

        return AuthResponse(
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: userInfo,
        );
      }

      throw AuthException('Login fallido: ${response.statusCode}');
    } on DioException catch (e) {
      debugPrint('❌ Error de red en login: ${e.message}');

      if (e.response?.statusCode == 401) {
        throw AuthException('Credenciales incorrectas');
      }

      throw AuthException('Error de conexión: ${e.message}');
    } catch (e) {
      debugPrint('❌ Error inesperado en login: $e');
      rethrow;
    }
  }

  /// Decodifica el payload del JWT para extraer info del usuario
  UserInfo _decodeJwtPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        throw AuthException('Token JWT inválido');
      }

      // Decodificar payload (segunda parte)
      String payload = parts[1];
      // Agregar padding si es necesario
      switch (payload.length % 4) {
        case 1:
          payload += '===';
          break;
        case 2:
          payload += '==';
          break;
        case 3:
          payload += '=';
          break;
      }

      final decoded = Uri.decodeFull(
        String.fromCharCodes(base64Url.decode(payload)),
      );

      final Map<String, dynamic> json = {};
      // Parse manual simple del JSON
      final regex = RegExp(r'"(\w+)":([^,}]+)');
      for (final match in regex.allMatches(decoded)) {
        final key = match.group(1)!;
        var value = match.group(2)!.trim();
        // Quitar comillas de strings
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        json[key] = value;
      }

      return UserInfo(
        id: int.parse(json['sub'].toString()),
        email: json['email'] as String,
        rol: json['rol'] as String,
        personaId: json['personaId'] != null
            ? int.parse(json['personaId'].toString())
            : null,
      );
    } catch (e) {
      debugPrint('⚠️ Error decodificando JWT: $e');
      throw AuthException('Error procesando token');
    }
  }

  /// Verifica si hay un token guardado y es válido
  Future<UserInfo?> checkAuthStatus() async {
    try {
      final token = await _storage.getAccessToken();
      if (token == null) return null;

      // Intentar decodificar el token para ver si sigue siendo válido
      final userInfo = _decodeJwtPayload(token);

      // ✅ FIX: Recuperar idEmpleado y nombre del storage (no están en JWT)
      final idEmpleado = await _storage.getIdEmpleado();
      final userName = await _storage.getUserName();

      if (idEmpleado != null || userName != null) {
        debugPrint(
          '👷 Datos recuperados del storage - idEmpleado: $idEmpleado, nombre: $userName',
        );
        return UserInfo(
          id: userInfo.id,
          email: userInfo.email,
          nombre: userName ?? userInfo.nombre,
          rol: userInfo.rol,
          personaId: userInfo.personaId,
          idEmpleado: idEmpleado,
        );
      }

      return userInfo;
    } catch (e) {
      debugPrint('⚠️ Token inválido o expirado');
      await logout();
      return null;
    }
  }

  /// Cierra sesión limpiando todos los datos guardados
  Future<void> logout() async {
    debugPrint('🚪 Cerrando sesión...');
    await _storage.clearAll();
  }
}

/// Excepción específica de autenticación
class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  @override
  String toString() => message;
}
