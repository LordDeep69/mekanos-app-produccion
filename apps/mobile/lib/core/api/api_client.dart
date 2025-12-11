/// Cliente HTTP centralizado usando Dio
///
/// Este cliente:
/// - Configura la URL base automáticamente según entorno
/// - Añade headers de autenticación cuando hay token
/// - Loguea requests/responses en modo debug
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/environment.dart';
import '../storage/secure_storage.dart';

/// Provider para el ApiClient
final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storage);
});

class ApiClient {
  final SecureStorageService _storage;
  late final Dio dio;

  ApiClient(this._storage) {
    dio = _createDio();
  }

  Dio _createDio() {
    final dioInstance = Dio(
      BaseOptions(
        baseUrl: Environment.apiBaseUrl,
        connectTimeout: Duration(seconds: Environment.requestTimeout),
        receiveTimeout: Duration(seconds: Environment.requestTimeout),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Interceptor para agregar token JWT si existe
    dioInstance.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getAccessToken();
          debugPrint(
            '🔑 Token disponible: ${token != null ? 'SÍ (${token.substring(0, 20)}...)' : 'NO'}',
          );
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          if (Environment.isDebug) {
            debugPrint('🌐 REQUEST: ${options.method} ${options.uri}');
            debugPrint(
              '🔐 Auth header: ${options.headers['Authorization'] != null ? 'SÍ' : 'NO'}',
            );
            if (options.data != null) {
              debugPrint('📦 DATA: ${options.data}');
            }
          }

          return handler.next(options);
        },
        onResponse: (response, handler) {
          if (Environment.isDebug) {
            debugPrint(
              '✅ RESPONSE [${response.statusCode}]: ${response.requestOptions.uri}',
            );
          }
          return handler.next(response);
        },
        onError: (error, handler) {
          if (Environment.isDebug) {
            debugPrint(
              '❌ ERROR [${error.response?.statusCode}]: ${error.message}',
            );
            debugPrint('📍 URL: ${error.requestOptions.uri}');
          }
          return handler.next(error);
        },
      ),
    );

    return dioInstance;
  }
}
