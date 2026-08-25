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

/// Resultado del intento de refresh en el interceptor
/// - [ok]: refresh exitoso
/// - [rejected]: el backend rechazó el refresh (401/400/403) → sesión inválida
/// - [unavailable]: sin red o servidor no disponible (5xx/429/502/530/1033) →
///   conservar la sesión local, NO hacer logout
enum _RefreshOutcome { ok, rejected, unavailable }

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
  Completer<_RefreshOutcome>? _refreshCompleter;

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

            final outcome = await _tryRefreshToken();

            if (outcome == _RefreshOutcome.ok) {
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
            } else if (outcome == _RefreshOutcome.rejected) {
              // El backend rechazó el refresh explícitamente (401/400/403):
              // la sesión ya no es válida → sí emitir logout
              debugPrint(
                '🔐 [API] Refresh rechazado - sesión inválida, cerrando sesión',
              );
              _emitAuthExpired();
              return handler.next(error);
            } else {
              // Servidor caído o sin red (5xx/429/502/530/1033/timeout):
              // NO invalidar la sesión local, solo dejar pasar el error
              debugPrint(
                '📡 [API] Servidor no disponible - conservando sesión local',
              );
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
  ///
  /// Clasificación del resultado:
  /// - 200/201 → [ok]
  /// - 401/400/403 → [rejected] (el backend rechazó explícitamente la sesión)
  /// - 5xx/429/otros errores HTTP o sin conexión → [unavailable]
  Future<_RefreshOutcome> _tryRefreshToken() async {
    // Evitar múltiples refresh simultáneos
    if (_isRefreshing) {
      debugPrint('🔐 [API] Refresh ya en progreso - esperando...');
      return await _refreshCompleter?.future ?? _RefreshOutcome.unavailable;
    }

    _isRefreshing = true;
    _refreshCompleter = Completer<_RefreshOutcome>();

    try {
      final refreshToken = await _storage.getRefreshToken();

      if (refreshToken == null) {
        debugPrint('🔐 [API] No hay refresh token disponible');
        _refreshCompleter!.complete(_RefreshOutcome.unavailable);
        return _RefreshOutcome.unavailable;
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

      final statusCode = response.statusCode ?? 0;

      if (statusCode == 200 || statusCode == 201) {
        final data = response.data as Map<String, dynamic>;
        final newAccessToken = data['access_token'] as String;
        final newRefreshToken = data['refresh_token'] as String;

        await _storage.saveAccessToken(newAccessToken);
        await _storage.saveRefreshToken(newRefreshToken);

        debugPrint('✅ [API] Tokens renovados exitosamente');
        _refreshCompleter!.complete(_RefreshOutcome.ok);
        return _RefreshOutcome.ok;
      }

      if (statusCode == 401 || statusCode == 400 || statusCode == 403) {
        debugPrint('⛔ [API] Refresh rechazado (HTTP $statusCode)');
        _refreshCompleter!.complete(_RefreshOutcome.rejected);
        return _RefreshOutcome.rejected;
      }

      debugPrint('📡 [API] Servidor no disponible (HTTP $statusCode)');
      _refreshCompleter!.complete(_RefreshOutcome.unavailable);
      return _RefreshOutcome.unavailable;

    } catch (e) {
      debugPrint('📡 [API] Error de red en refresh - conservando sesión: $e');
      _refreshCompleter!.complete(_RefreshOutcome.unavailable);
      return _RefreshOutcome.unavailable;
    } finally {
      _isRefreshing = false;
    }
  }
  
  /// Emite evento de autenticación expirada
  void _emitAuthExpired() {
    _ref.read(authExpiredEventProvider.notifier).state = DateTime.now();
  }
}
