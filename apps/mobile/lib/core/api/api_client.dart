/// Cliente HTTP Enterprise usando Dio
///
/// Este cliente:
/// - Configura la URL base automáticamente según entorno
/// - Añade headers de autenticación cuando hay token
/// - ✅ ENTERPRISE: Auto-refresh de token cuando expira (401)
/// - ✅ ENTERPRISE: Emite evento cuando sesión expira completamente
/// - Loguea requests/responses en modo debug
library;

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/environment.dart';
import '../storage/secure_storage.dart';

/// Evento de autenticación expirada
/// Los listeners pueden redirigir al login
final authExpiredEventProvider = StateProvider<DateTime?>((ref) => null);

/// Provider para el ApiClient
final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storage, ref);
});

class ApiClient {
  final SecureStorageService _storage;
  final Ref _ref;
  late final Dio dio;
  
  // Lock para evitar múltiples refresh simultáneos
  bool _isRefreshing = false;
  Completer<bool>? _refreshCompleter;

  ApiClient(this._storage, this._ref) {
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
          if (Environment.isDebug) {
            debugPrint(
              '🔑 Token disponible: ${token != null ? 'SÍ (${token.substring(0, 20)}...)' : 'NO'}',
            );
          }
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          if (Environment.isDebug) {
            debugPrint('🌐 REQUEST: ${options.method} ${options.uri}');
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
        onError: (error, handler) async {
          // ✅ ENTERPRISE: Manejar 401 Unauthorized con auto-refresh
          if (error.response?.statusCode == 401) {
            debugPrint('🔐 [API] Token expirado - intentando refresh...');
            
            final refreshed = await _tryRefreshToken();
            
            if (refreshed) {
              // Reintentar request original con nuevo token
              debugPrint('🔐 [API] Token renovado - reintentando request...');
              try {
                final newToken = await _storage.getAccessToken();
                final retryOptions = error.requestOptions;
                retryOptions.headers['Authorization'] = 'Bearer $newToken';
                
                final response = await dio.fetch(retryOptions);
                return handler.resolve(response);
              } catch (retryError) {
                debugPrint('❌ [API] Error en retry: $retryError');
                return handler.next(error);
              }
            } else {
              // Refresh falló - sesión expirada completamente
              debugPrint('🔐 [API] Refresh falló - emitiendo evento de sesión expirada');
              _emitAuthExpired();
              return handler.next(error);
            }
          }
          
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
  
  /// Intenta refrescar el access token usando el refresh token
  Future<bool> _tryRefreshToken() async {
    // Evitar múltiples refresh simultáneos
    if (_isRefreshing) {
      debugPrint('🔐 [API] Refresh ya en progreso - esperando...');
      return await _refreshCompleter?.future ?? false;
    }
    
    _isRefreshing = true;
    _refreshCompleter = Completer<bool>();
    
    try {
      final refreshToken = await _storage.getRefreshToken();
      
      if (refreshToken == null) {
        debugPrint('🔐 [API] No hay refresh token disponible');
        _refreshCompleter!.complete(false);
        return false;
      }
      
      debugPrint('🔐 [API] Enviando refresh token...');
      
      // Crear Dio temporal sin interceptors para evitar loop infinito
      final tempDio = Dio(BaseOptions(
        baseUrl: Environment.apiBaseUrl,
        headers: {'Content-Type': 'application/json'},
      ));
      
      final response = await tempDio.post(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data as Map<String, dynamic>;
        final newAccessToken = data['access_token'] as String;
        final newRefreshToken = data['refresh_token'] as String;
        
        await _storage.saveAccessToken(newAccessToken);
        await _storage.saveRefreshToken(newRefreshToken);
        
        debugPrint('✅ [API] Tokens renovados exitosamente');
        _refreshCompleter!.complete(true);
        return true;
      }
      
      debugPrint('❌ [API] Refresh falló con status: ${response.statusCode}');
      _refreshCompleter!.complete(false);
      return false;
      
    } catch (e) {
      debugPrint('❌ [API] Error en refresh: $e');
      _refreshCompleter!.complete(false);
      return false;
    } finally {
      _isRefreshing = false;
    }
  }
  
  /// Emite evento de autenticación expirada
  void _emitAuthExpired() {
    _ref.read(authExpiredEventProvider.notifier).state = DateTime.now();
  }
}
