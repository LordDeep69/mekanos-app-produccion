// ============================================================================
// TRADUCTOR DE ERRORES PARA EL USUARIO
// ============================================================================
//
// ✅ 24-OCT-2026: El técnico nunca debe ver stack traces, "DioException",
// "FormatException" ni HTML crudo. Este módulo convierte cualquier error
// (Dio, sockets, timeouts, SSE, backend) en un mensaje corto, en español y
// con una acción clara. El detalle técnico queda disponible para logs.
//
// ✅ 26-OCT-2026 (Fase A):
//   - Distingue errores reintentables de los definitivos.
//   - Traduce 502/503/504/520-530 (Cloudflare) que antes llegaban como HTML.
//   - Detecta cuerpos HTML y JSON técnico aunque el backend no los envuelva.
//   - Conserva los mensajes de negocio del backend (400/403/409) porque son
//     útiles para el técnico; descarta los que parecen de máquina.

import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Resultado de traducir un error a lenguaje de usuario.
class UserFriendlyError {
  /// Título corto para diálogos.
  final String titulo;

  /// Mensaje principal: qué pasó y qué puede hacer el usuario.
  final String mensaje;

  /// Detalle técnico opcional (para logs o "ver detalles"). Sin stack traces.
  final String? detalle;

  /// true si tiene sentido que el usuario reintente la operación.
  final bool reintentable;

  const UserFriendlyError({
    required this.titulo,
    required this.mensaje,
    this.detalle,
    this.reintentable = true,
  });

  @override
  String toString() => mensaje;
}

/// Extrae el mensaje legible que el backend envió (si lo envió).
/// NestJS puede responder `message` como String o como `List<String>`.
String? _mensajeDelBackend(dynamic data) {
  if (data is String) {
    final limpio = _limpiar(data);
    if (limpio.isEmpty || _pareceTecnico(limpio) || _esHtml(limpio)) {
      return null;
    }
    return limpio;
  }
  if (data is! Map) return null;

  final msg =
      data['message'] ?? data['error'] ?? data['mensaje'] ?? data['detail'];
  if (msg is String) {
    final limpio = _limpiar(msg);
    return limpio.isEmpty ? null : limpio;
  }
  if (msg is List && msg.isNotEmpty) {
    final unidos = msg
        .whereType<String>()
        .map(_limpiar)
        .where((m) => m.isNotEmpty)
        .join('. ');
    if (unidos.isNotEmpty) return unidos;
  }
  return null;
}

/// Limpia texto técnico: prefijos de excepciones, saltos múltiples, HTML.
String _limpiar(String texto) {
  var t = texto.trim();

  // Quitar prefijos técnicos comunes.
  final prefijos = <RegExp>[
    RegExp(
      r'^\s*(DioException|Exception|FormatException|TimeoutException|SocketException|HandshakeException|ClientException|StateError|RangeError|ArgumentError)\s*[:\-]?\s*',
      caseSensitive: false,
    ),
    RegExp(r'^\s*Error\s*:\s*', caseSensitive: false),
    RegExp(r'^\s*Bad state\s*:\s*', caseSensitive: false),
    RegExp(r'^\s*fatal error\s*[:\-]?\s*', caseSensitive: false),
    RegExp(r'^\s*Http failure response for [^:]+:\s*', caseSensitive: false),
  ];
  for (final p in prefijos) {
    t = t.replaceFirst(p, '');
  }

  // Quitar etiquetas HTML y colapsar espacios/saltos.
  t = t.replaceAll(RegExp(r'<[^>]*>'), ' ');
  t = t.replaceAll(RegExp(r'\s+'), ' ').trim();

  // Limitar longitud razonable para UI.
  if (t.length > 280) t = '${t.substring(0, 280)}…';
  return t;
}

bool _esHtml(String texto) {
  final t = texto.toLowerCase();
  return t.contains('<!doctype') ||
      t.contains('<html') ||
      t.contains('<head') ||
      t.contains('<body');
}

bool _pareceTecnico(String t) {
  final patrones = <RegExp>[
    RegExp(
      r'DioException|SocketException|HandshakeException|TimeoutException|ClientException',
      caseSensitive: false,
    ),
    RegExp(r'at\s+[\w$.<>]+\s*\(.*:\d+:\d+\)'), // stack frames JS/TS
    RegExp(r'#\d+\s+[\w$.<>]+\s*\(.*\.dart:\d+:\d+\)'), // stack frames Dart
    RegExp(r'package:[\w_]+/[\w/.]+\.dart:\d+'), // rutas de código Dart
    RegExp(r'^\s*[\{\[].*[\}\]]\s*$', dotAll: true), // JSON crudo
    RegExp(r'<!DOCTYPE|<html', caseSensitive: false),
    RegExp(
      r'SQLSTATE|prisma|PrismaClient|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND|EAI_AGAIN',
      caseSensitive: false,
    ),
    RegExp(
      r'Cannot\s+(GET|POST|PUT|PATCH|DELETE)|Unauthorized|Forbidden|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout',
      caseSensitive: false,
    ),
    RegExp(r'\b(TypeError|ReferenceError)\b'),
    // `toString()` de cualquier excepción Dart: "NombreDeClase: detalle".
    RegExp(r'^\s*_?[A-Z][A-Za-z0-9_$]*\s*:\s'),
  ];
  return patrones.any((p) => p.hasMatch(t));
}

String _tituloParaStatus(int? status) {
  switch (status) {
    case 400:
      return 'Datos incompletos';
    case 401:
      return 'Sesión expirada';
    case 403:
      return 'Sin permiso';
    case 404:
      return 'No encontrado';
    case 408:
      return 'Conexión lenta';
    case 409:
      return 'Conflicto';
    case 422:
      return 'Datos inválidos';
    case 429:
      return 'Demasiadas solicitudes';
    case 502:
    case 503:
    case 504:
      return 'Servidor no disponible';
    default:
      return (status != null && status >= 500)
          ? 'Error del servidor'
          : 'No se pudo completar';
  }
}

bool _esGateway(int? status) =>
    status == 502 ||
    status == 503 ||
    status == 504 ||
    (status != null && status >= 520 && status <= 530);

/// true para errores que no mejoran reintentando el mismo payload.
bool _esDefinitivo(int? status) =>
    status == 400 ||
    status == 401 ||
    status == 403 ||
    status == 404 ||
    status == 409 ||
    status == 422;

/// Traduce cualquier error a un mensaje amigable para el técnico.
UserFriendlyError traducirError(Object? error, {String? contexto}) {
  if (error is UserFriendlyError) return error;

  // ------------------------------------------------------------------
  // Dio (la mayoría de los errores de red/HTTP)
  // ------------------------------------------------------------------
  if (error is DioException) {
    final status = error.response?.statusCode;
    final cuerpo = error.response?.data;
    final msgBackend = _mensajeDelBackend(cuerpo);
    final cuerpoEsHtml =
        (cuerpo is String && _esHtml(cuerpo)) ||
        (cuerpo is List<int> && _esHtml(String.fromCharCodes(cuerpo.take(512))));

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return UserFriendlyError(
          titulo: 'Conexión lenta',
          mensaje:
              'El servidor tardó demasiado en responder. '
              'Verifica tu señal de internet e intenta de nuevo.',
          detalle: error.message,
        );

      case DioExceptionType.connectionError:
        return UserFriendlyError(
          titulo: 'Sin conexión',
          mensaje:
              'No pudimos conectarnos con el servidor. '
              'Revisa tu Wi-Fi o datos móviles e intenta de nuevo.',
          detalle: error.message,
        );

      case DioExceptionType.badCertificate:
        return UserFriendlyError(
          titulo: 'Conexión no segura',
          mensaje:
              'El servidor no pudo verificarse de forma segura. '
              'Intenta más tarde o cambia de red (Wi-Fi/datos).',
          detalle: error.message,
        );

      case DioExceptionType.cancel:
        return const UserFriendlyError(
          titulo: 'Cancelado',
          mensaje: 'La operación fue cancelada.',
          detalle: 'cancel',
        );

      case DioExceptionType.badResponse:
        // Cloudflare/Nginx pueden devolver HTML en lugar del JSON del API.
        if (cuerpoEsHtml || _esGateway(status)) {
          final esTimeout = status == 504 || status == 524;
          return UserFriendlyError(
            titulo: 'Servidor no disponible',
            mensaje: esTimeout
                ? 'El servidor tardó demasiado en completar la operación. '
                      'Tus datos siguen guardados; intenta de nuevo en unos minutos.'
                : 'El servidor está reiniciándose o sin respuesta. '
                      'Tus datos siguen guardados; intenta de nuevo en unos minutos.',
            detalle: 'HTTP ${status ?? 'sin código'}',
          );
        }

        if (status == 401) {
          return const UserFriendlyError(
            titulo: 'Sesión expirada',
            mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.',
            detalle: 'HTTP 401',
          );
        }

        if (status == 429) {
          return const UserFriendlyError(
            titulo: 'Demasiadas solicitudes',
            mensaje:
                'Hay demasiadas solicitudes en curso. '
                'Espera unos segundos e intenta de nuevo.',
            detalle: 'HTTP 429',
          );
        }

        // Los mensajes de negocio del backend (400/403/409/422) son útiles.
        if (msgBackend != null && !_pareceTecnico(msgBackend)) {
          return UserFriendlyError(
            titulo: _tituloParaStatus(status),
            mensaje: msgBackend,
            detalle: 'HTTP ${status ?? 'sin código'}',
            reintentable: !_esDefinitivo(status),
          );
        }

        if (status == 403) {
          return const UserFriendlyError(
            titulo: 'Sin permiso',
            mensaje:
                'No tienes permiso para esta acción. '
                'Solicita autorización al administrador.',
            detalle: 'HTTP 403',
            reintentable: false,
          );
        }

        if (status == 404) {
          return const UserFriendlyError(
            titulo: 'No encontrado',
            mensaje:
                'La información ya no está disponible en el servidor. '
                'Actualiza la lista e intenta de nuevo.',
            detalle: 'HTTP 404',
            reintentable: false,
          );
        }

        return UserFriendlyError(
          titulo: _tituloParaStatus(status),
          mensaje: (status != null && status >= 500)
              ? 'El servidor tuvo un problema temporal. '
                    'Tus datos siguen guardados; intenta de nuevo en unos minutos.'
              : 'No se pudo completar la operación. Intenta de nuevo.',
          detalle: 'HTTP ${status ?? 'sin código'}',
        );

      case DioExceptionType.unknown:
        final interno = error.error;
        if (interno is SocketException || interno is HttpException) {
          return UserFriendlyError(
            titulo: 'Sin conexión',
            mensaje:
                'No pudimos conectarnos con el servidor. '
                'Revisa tu Wi-Fi o datos móviles e intenta de nuevo.',
            detalle: interno.toString(),
          );
        }
        return UserFriendlyError(
          titulo: 'Error de red',
          mensaje:
              'Hubo un problema de comunicación con el servidor. '
              'Intenta de nuevo.',
          detalle: error.message,
        );
    }
  }

  // ------------------------------------------------------------------
  // Timeouts y sockets puros (sin Dio)
  // ------------------------------------------------------------------
  if (error is TimeoutException) {
    return const UserFriendlyError(
      titulo: 'Conexión lenta',
      mensaje:
          'El servidor tardó demasiado en responder. '
          'Verifica tu señal e intenta de nuevo.',
      detalle: 'timeout',
    );
  }
  if (error is SocketException || error is HttpException) {
    return const UserFriendlyError(
      titulo: 'Sin conexión',
      mensaje:
          'No pudimos conectarnos con el servidor. '
          'Revisa tu Wi-Fi o datos móviles.',
      detalle: 'socket',
    );
  }
  if (error is HandshakeException) {
    return const UserFriendlyError(
      titulo: 'Conexión no segura',
      mensaje:
          'El servidor no pudo verificarse de forma segura. '
          'Intenta más tarde o cambia de red.',
      detalle: 'handshake',
    );
  }
  if (error is FormatException) {
    return UserFriendlyError(
      titulo: 'Datos inválidos',
      mensaje:
          'La respuesta del servidor no se pudo interpretar. '
          'Intenta de nuevo; si persiste, reporta el caso.',
      detalle: _limpiar(error.message),
    );
  }

  // ------------------------------------------------------------------
  // Códigos de error internos de la app (sync)
  // ------------------------------------------------------------------
  final texto = error?.toString() ?? '';

  if (texto.contains('SESION_EXPIRADA')) {
    return const UserFriendlyError(
      titulo: 'Sesión expirada',
      mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.',
      detalle: 'SESION_EXPIRADA',
      reintentable: false,
    );
  }
  if (texto.contains('EDICION_NO_AUTORIZADA')) {
    return const UserFriendlyError(
      titulo: 'Edición no autorizada',
      mensaje:
          'El administrador no autorizó (o revocó) la edición de esta orden. '
          'Tus cambios siguen guardados en el dispositivo.',
      detalle: 'EDICION_NO_AUTORIZADA',
      reintentable: false,
    );
  }
  if (texto.contains('NO_CONNECTION')) {
    return const UserFriendlyError(
      titulo: 'Sin conexión',
      mensaje: 'No hay conexión a internet. Intenta cuando tengas señal.',
      detalle: 'NO_CONNECTION',
    );
  }
  if (texto.contains('TIMEOUT_SSE')) {
    return const UserFriendlyError(
      titulo: 'El servidor no respondió',
      mensaje:
          'La sincronización se detuvo porque el servidor dejó de responder. '
          'La orden puede haberse procesado: vuelve a subirla y la app lo '
          'verificará automáticamente antes de reenviar.',
      detalle: 'TIMEOUT_SSE',
    );
  }
  if (texto.contains('CONEXION_PERDIDA_SSE')) {
    return const UserFriendlyError(
      titulo: 'Conexión interrumpida',
      mensaje:
          'Se perdió la conexión mientras el servidor procesaba la orden. '
          'Vuelve a intentarlo: primero verificaremos si ya quedó guardada.',
      detalle: 'CONEXION_PERDIDA_SSE',
    );
  }

  // ------------------------------------------------------------------
  // Fallback: texto ya legible vs. texto técnico
  // ------------------------------------------------------------------
  final limpio = _limpiar(texto);
  if (limpio.isNotEmpty && !_pareceTecnico(limpio) && limpio.length < 220) {
    // Mensajes de negocio del backend o de la app: conservarlos.
    return UserFriendlyError(titulo: 'Atención', mensaje: limpio);
  }

  debugPrint('⚠️ [ERROR-UX] Error sin traducción específica: $texto');
  return UserFriendlyError(
    titulo: 'Algo salió mal',
    mensaje: contexto != null
        ? 'Ocurrió un problema inesperado al $contexto. Intenta de nuevo.'
        : 'Ocurrió un problema inesperado. Intenta de nuevo.',
    detalle: limpio.isEmpty ? null : limpio,
  );
}

/// Atajo para obtener solo el mensaje amigable.
String mensajeAmigable(Object? error, {String? contexto}) =>
    traducirError(error, contexto: contexto).mensaje;

/// Atajo para obtener el título amigable.
String tituloAmigable(Object? error, {String? contexto}) =>
    traducirError(error, contexto: contexto).titulo;
