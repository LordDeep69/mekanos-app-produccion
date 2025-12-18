/// Estrategia de Reintentos Inteligentes para Sincronización
///
/// Esta clase implementa una estrategia robusta de reintentos que:
/// - Usa backoff exponencial con jitter para evitar thundering herd
/// - Clasifica errores en recuperables vs no recuperables
/// - Adapta timeouts según condiciones de red
/// - Mantiene estado de intentos para decisiones inteligentes
///
/// Diseñado para técnicos en campo con conexiones intermitentes/lentas.
library;

import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Tipos de error clasificados para decisiones de reintento
enum SyncErrorType {
  /// Error de red (sin conexión, timeout) - REINTENTABLE
  network,

  /// Error de servidor (5xx) - REINTENTABLE con delay
  serverError,

  /// Error de autenticación (401, 403) - NO REINTENTABLE
  authentication,

  /// Error de cliente (4xx excepto auth) - NO REINTENTABLE
  clientError,

  /// Error desconocido - REINTENTABLE con precaución
  unknown,
}

/// Resultado de clasificación de error
class ErrorClassification {
  final SyncErrorType type;
  final bool isRetryable;
  final String message;
  final int? statusCode;

  const ErrorClassification({
    required this.type,
    required this.isRetryable,
    required this.message,
    this.statusCode,
  });

  @override
  String toString() =>
      'ErrorClassification(type: $type, retryable: $isRetryable, msg: $message)';
}

/// Configuración de la estrategia de reintentos
class RetryConfig {
  /// Número máximo de intentos (incluyendo el inicial)
  final int maxAttempts;

  /// Delay base inicial en milisegundos
  final int baseDelayMs;

  /// Factor multiplicador para backoff exponencial
  final double backoffMultiplier;

  /// Delay máximo en milisegundos (cap)
  final int maxDelayMs;

  /// Jitter máximo como porcentaje (0.0 - 1.0)
  final double jitterFactor;

  /// Timeout base para requests en segundos
  final int baseTimeoutSeconds;

  /// Factor de incremento de timeout por intento
  final double timeoutIncreaseFactor;

  /// Timeout máximo en segundos
  final int maxTimeoutSeconds;

  const RetryConfig({
    this.maxAttempts = 5,
    this.baseDelayMs = 2000,
    this.backoffMultiplier = 2.0,
    this.maxDelayMs = 60000,
    this.jitterFactor = 0.3,
    this.baseTimeoutSeconds = 30,
    this.timeoutIncreaseFactor = 1.5,
    this.maxTimeoutSeconds = 180,
  });

  /// Configuración optimizada para sync de datos grandes
  static const RetryConfig forLargeSync = RetryConfig(
    maxAttempts: 5,
    baseDelayMs: 3000,
    backoffMultiplier: 1.8,
    maxDelayMs: 45000,
    jitterFactor: 0.25,
    baseTimeoutSeconds: 60,
    timeoutIncreaseFactor: 1.5,
    maxTimeoutSeconds: 300, // 5 minutos máximo
  );

  /// Configuración para operaciones rápidas
  static const RetryConfig forQuickOps = RetryConfig(
    maxAttempts: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2.0,
    maxDelayMs: 10000,
    jitterFactor: 0.2,
    baseTimeoutSeconds: 15,
    timeoutIncreaseFactor: 1.3,
    maxTimeoutSeconds: 45,
  );
}

/// Estrategia de reintentos inteligentes
class SyncRetryStrategy {
  final RetryConfig config;
  final Random _random = Random();

  SyncRetryStrategy({this.config = RetryConfig.forLargeSync});

  /// Clasifica un error para determinar si es reintentable
  ErrorClassification classifyError(dynamic error) {
    if (error is DioException) {
      return _classifyDioError(error);
    } else if (error is SocketException) {
      return const ErrorClassification(
        type: SyncErrorType.network,
        isRetryable: true,
        message: 'Error de conexión de red',
      );
    } else if (error is TimeoutException) {
      return const ErrorClassification(
        type: SyncErrorType.network,
        isRetryable: true,
        message: 'Timeout de conexión',
      );
    } else if (error is HttpException) {
      return ErrorClassification(
        type: SyncErrorType.network,
        isRetryable: true,
        message: 'Error HTTP: ${error.message}',
      );
    }

    return ErrorClassification(
      type: SyncErrorType.unknown,
      isRetryable: true,
      message: error.toString(),
    );
  }

  ErrorClassification _classifyDioError(DioException error) {
    final statusCode = error.response?.statusCode;

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ErrorClassification(
          type: SyncErrorType.network,
          isRetryable: true,
          message: 'Timeout: ${error.type.name}',
          statusCode: statusCode,
        );

      case DioExceptionType.connectionError:
        return ErrorClassification(
          type: SyncErrorType.network,
          isRetryable: true,
          message: 'Error de conexión: ${error.message}',
          statusCode: statusCode,
        );

      case DioExceptionType.badResponse:
        if (statusCode == null) {
          return ErrorClassification(
            type: SyncErrorType.unknown,
            isRetryable: true,
            message: 'Respuesta sin código de estado',
          );
        }

        // 401, 403 - Autenticación
        if (statusCode == 401 || statusCode == 403) {
          return ErrorClassification(
            type: SyncErrorType.authentication,
            isRetryable: false,
            message: 'Error de autenticación',
            statusCode: statusCode,
          );
        }

        // 5xx - Error de servidor
        if (statusCode >= 500) {
          return ErrorClassification(
            type: SyncErrorType.serverError,
            isRetryable: true,
            message: 'Error del servidor ($statusCode)',
            statusCode: statusCode,
          );
        }

        // 4xx (excepto auth) - Error de cliente
        if (statusCode >= 400) {
          return ErrorClassification(
            type: SyncErrorType.clientError,
            isRetryable: false,
            message: 'Error de cliente ($statusCode)',
            statusCode: statusCode,
          );
        }

        return ErrorClassification(
          type: SyncErrorType.unknown,
          isRetryable: true,
          message: 'Código inesperado: $statusCode',
          statusCode: statusCode,
        );

      case DioExceptionType.cancel:
        return const ErrorClassification(
          type: SyncErrorType.clientError,
          isRetryable: false,
          message: 'Request cancelado',
        );

      case DioExceptionType.unknown:
        // Analizar el error interno
        final innerError = error.error;
        if (innerError is SocketException ||
            innerError is HttpException ||
            (error.message?.contains('connection abort') ?? false) ||
            (error.message?.contains('Connection reset') ?? false)) {
          return ErrorClassification(
            type: SyncErrorType.network,
            isRetryable: true,
            message: 'Conexión interrumpida: ${innerError ?? error.message}',
          );
        }
        return ErrorClassification(
          type: SyncErrorType.unknown,
          isRetryable: true,
          message: 'Error desconocido: ${error.message}',
        );

      default:
        return ErrorClassification(
          type: SyncErrorType.unknown,
          isRetryable: true,
          message: 'Error no clasificado: ${error.type}',
        );
    }
  }

  /// Calcula el delay para el próximo reintento con backoff exponencial + jitter
  Duration calculateDelay(int attemptNumber) {
    // Backoff exponencial: baseDelay * (multiplier ^ attemptNumber)
    final exponentialDelay =
        config.baseDelayMs * pow(config.backoffMultiplier, attemptNumber);

    // Aplicar cap
    final cappedDelay = min(exponentialDelay, config.maxDelayMs.toDouble());

    // Agregar jitter para evitar thundering herd
    final jitter = cappedDelay * config.jitterFactor * (_random.nextDouble());
    final finalDelay = cappedDelay + jitter;

    return Duration(milliseconds: finalDelay.toInt());
  }

  /// Calcula el timeout adaptativo para un intento específico
  Duration calculateTimeout(int attemptNumber) {
    final adaptiveTimeout =
        config.baseTimeoutSeconds *
        pow(config.timeoutIncreaseFactor, attemptNumber);
    final cappedTimeout = min(
      adaptiveTimeout,
      config.maxTimeoutSeconds.toDouble(),
    );

    return Duration(seconds: cappedTimeout.toInt());
  }

  /// Ejecuta una operación con reintentos inteligentes
  ///
  /// [operation] - Función que ejecuta la operación (recibe timeout como parámetro)
  /// [onRetry] - Callback opcional llamado antes de cada reintento
  /// [shouldAbort] - Función opcional para abortar reintentos externamente
  Future<T> executeWithRetry<T>({
    required Future<T> Function(Duration timeout) operation,
    void Function(int attempt, Duration delay, ErrorClassification error)?
    onRetry,
    bool Function()? shouldAbort,
  }) async {
    int attempt = 0;
    ErrorClassification? lastError;

    while (attempt < config.maxAttempts) {
      // Verificar si debemos abortar
      if (shouldAbort?.call() ?? false) {
        throw Exception('Operación abortada externamente');
      }

      final timeout = calculateTimeout(attempt);

      try {
        debugPrint(
          '🔄 [RETRY] Intento ${attempt + 1}/${config.maxAttempts} '
          '(timeout: ${timeout.inSeconds}s)',
        );

        final result = await operation(timeout);

        if (attempt > 0) {
          debugPrint('✅ [RETRY] Éxito después de ${attempt + 1} intentos');
        }

        return result;
      } catch (e) {
        lastError = classifyError(e);

        debugPrint(
          '⚠️ [RETRY] Error en intento ${attempt + 1}: ${lastError.message}',
        );

        // Si no es reintentable, fallar inmediatamente
        if (!lastError.isRetryable) {
          debugPrint('❌ [RETRY] Error no reintentable, abortando');
          rethrow;
        }

        // Si es el último intento, fallar
        if (attempt >= config.maxAttempts - 1) {
          debugPrint(
            '❌ [RETRY] Máximo de intentos alcanzado (${config.maxAttempts})',
          );
          rethrow;
        }

        // Calcular delay y esperar
        final delay = calculateDelay(attempt);
        debugPrint(
          '⏳ [RETRY] Esperando ${delay.inMilliseconds}ms antes de reintentar',
        );

        onRetry?.call(attempt + 1, delay, lastError);

        await Future.delayed(delay);
        attempt++;
      }
    }

    // Nunca debería llegar aquí, pero por seguridad
    throw lastError ?? Exception('Error desconocido en reintentos');
  }
}

/// Extensión para Dio que agrega capacidad de reintento
extension DioRetryExtension on Dio {
  /// Ejecuta un GET con reintentos inteligentes
  Future<Response<T>> getWithRetry<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    RetryConfig retryConfig = RetryConfig.forLargeSync,
    void Function(int attempt, Duration delay, ErrorClassification error)?
    onRetry,
  }) async {
    final strategy = SyncRetryStrategy(config: retryConfig);

    return strategy.executeWithRetry<Response<T>>(
      operation: (timeout) => get<T>(
        path,
        queryParameters: queryParameters,
        options: (options ?? Options()).copyWith(
          receiveTimeout: timeout,
          sendTimeout: Duration(seconds: 30),
        ),
      ),
      onRetry: onRetry,
    );
  }

  /// Ejecuta un POST con reintentos inteligentes
  Future<Response<T>> postWithRetry<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    RetryConfig retryConfig = RetryConfig.forLargeSync,
    void Function(int attempt, Duration delay, ErrorClassification error)?
    onRetry,
  }) async {
    final strategy = SyncRetryStrategy(config: retryConfig);

    return strategy.executeWithRetry<Response<T>>(
      operation: (timeout) => post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: (options ?? Options()).copyWith(
          receiveTimeout: timeout,
          sendTimeout: timeout,
        ),
      ),
      onRetry: onRetry,
    );
  }
}
