/// Servicio de almacenamiento seguro para tokens JWT
///
/// Usa flutter_secure_storage para guardar datos sensibles
/// de forma encriptada en el dispositivo.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Provider para el servicio de almacenamiento seguro
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

class SecureStorageService {
  final FlutterSecureStorage _storage;

  // Keys para almacenamiento
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _userEmailKey = 'user_email';
  static const String _idEmpleadoKey = 'id_empleado'; // ✅ NUEVO

  SecureStorageService()
    : _storage = const FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
      );

  // ============ ACCESS TOKEN ============

  Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _accessTokenKey, value: token);
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  Future<void> deleteAccessToken() async {
    await _storage.delete(key: _accessTokenKey);
  }

  // ============ REFRESH TOKEN ============

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  // ============ USER DATA ============

  Future<void> saveUserId(int userId) async {
    await _storage.write(key: _userIdKey, value: userId.toString());
  }

  Future<int?> getUserId() async {
    final value = await _storage.read(key: _userIdKey);
    return value != null ? int.tryParse(value) : null;
  }

  Future<void> saveUserEmail(String email) async {
    await _storage.write(key: _userEmailKey, value: email);
  }

  Future<String?> getUserEmail() async {
    return await _storage.read(key: _userEmailKey);
  }

  // ============ ID EMPLEADO (para sync) ============

  /// ✅ NUEVO: Guardar idEmpleado para sincronización
  Future<void> saveIdEmpleado(int idEmpleado) async {
    await _storage.write(key: _idEmpleadoKey, value: idEmpleado.toString());
  }

  Future<int?> getIdEmpleado() async {
    final value = await _storage.read(key: _idEmpleadoKey);
    return value != null ? int.tryParse(value) : null;
  }

  // ============ CLEAR ALL ============

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // ============ CHECK AUTH ============

  Future<bool> hasValidToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
