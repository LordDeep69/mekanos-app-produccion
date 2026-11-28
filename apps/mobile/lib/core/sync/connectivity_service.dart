import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Estado de conectividad de la aplicación
enum ConnectivityStatus { online, offline, unknown }

/// Servicio de monitoreo de conectividad
/// Proporciona:
/// - Estado actual de conexión
/// - Stream reactivo de cambios
/// - Verificación bajo demanda
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();

  // Stream controller para broadcast de cambios
  final _statusController = StreamController<ConnectivityStatus>.broadcast();

  // Estado actual cacheado
  ConnectivityStatus _currentStatus = ConnectivityStatus.unknown;

  // Subscription al stream de connectivity_plus
  StreamSubscription<ConnectivityResult>? _subscription;

  ConnectivityService() {
    _init();
  }

  /// Inicializa el monitoreo de conectividad
  void _init() {
    _checkConnectivity();
    _subscription = _connectivity.onConnectivityChanged.listen(_updateStatus);
  }

  /// Verifica conectividad actual y actualiza estado
  Future<void> _checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);
  }

  /// Actualiza el estado interno basado en el resultado
  void _updateStatus(ConnectivityResult result) {
    ConnectivityStatus newStatus;

    if (result == ConnectivityResult.none) {
      newStatus = ConnectivityStatus.offline;
    } else {
      newStatus = ConnectivityStatus.online;
    }

    if (newStatus != _currentStatus) {
      _currentStatus = newStatus;
      _statusController.add(newStatus);
    }
  }

  /// Estado actual de conectividad
  ConnectivityStatus get currentStatus => _currentStatus;

  /// ¿Está online ahora mismo?
  bool get isOnline => _currentStatus == ConnectivityStatus.online;

  /// ¿Está offline ahora mismo?
  bool get isOffline => _currentStatus == ConnectivityStatus.offline;

  /// Stream de cambios de conectividad
  Stream<ConnectivityStatus> get statusStream => _statusController.stream;

  /// Fuerza una verificación de conectividad
  /// Útil para verificar antes de operaciones críticas
  Future<bool> checkConnection() async {
    await _checkConnectivity();
    return isOnline;
  }

  /// Verifica conectividad REAL extremo a extremo contra el backend (`HEAD /health`),
  /// evitando falsos positivos de Wi-Fi cautivo o señal fantasma antes de solicitar
  /// firmas Just-In-Time de Cloudinary o enviar lotes delta.
  Future<bool> hasRealServerReachability(
    Dio dio, {
    Duration timeout = const Duration(seconds: 3),
  }) async {
    final hasInterface = await checkConnection();
    if (!hasInterface) return false;

    try {
      final res = await dio.head(
        '/health',
        options: Options(
          sendTimeout: timeout,
          receiveTimeout: timeout,
          validateStatus: (code) => code != null && code < 500,
        ),
      );
      if (res.statusCode == 200 || res.statusCode == 204) return true;
      // Fallback GET si un proxy corporativo bloquea HEAD
      if (res.statusCode == 405) {
        final getRes = await dio.get(
          '/health',
          options: Options(sendTimeout: timeout, receiveTimeout: timeout),
        );
        return getRes.statusCode == 200;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Limpia recursos
  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }
}

// =============================================================================
// PROVIDERS
// =============================================================================

/// Provider del servicio de conectividad (singleton)
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider del estado actual de conectividad (reactivo)
final connectivityStatusProvider = StreamProvider<ConnectivityStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  // Emitir estado actual inmediatamente, luego escuchar cambios
  return Stream.value(service.currentStatus).concatWith([service.statusStream]);
});

/// Provider simple de ¿está online? (reactivo)
final isOnlineProvider = Provider<bool>((ref) {
  final status = ref.watch(connectivityStatusProvider);
  return status.when(
    data: (s) => s == ConnectivityStatus.online,
    loading: () => true, // Asumir online mientras carga
    error: (_, _) => false,
  );
});

// Extensión helper para Stream
extension StreamConcatExtension<T> on Stream<T> {
  Stream<T> concatWith(Iterable<Stream<T>> others) async* {
    yield* this;
    for (final stream in others) {
      yield* stream;
    }
  }
}
