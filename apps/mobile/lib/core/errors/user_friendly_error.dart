// ============================================================================
// TRADUCTOR DE ERRORES PARA EL USUARIO
// ============================================================================
//
// ✅ 24-OCT-2026: El técnico nunca debe ver stack traces, "DioException",
// "FormatException" ni HTML crudo. Este módulo convierte cualquier error
// (Dio, sockets, timeouts, SSE, backend) en un mensaje corto, en español y
// con una acción clara. El detalle técnico queda disponible para logs.

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

  /// Detalle técnico opcional (para "Ver detalles" o logs). Sin stack traces.
  final String? detalle;

  const UserFriendlyError({
    required this.titulo,
    required this.mensaje,
    this.detalle,
  });

  @override
  String toString() => mensaje;
}

/// Extrae el mensaje legible que el backend envió (si lo envió).
/// NestJS puede responder `message` como String o como List<String>.
String? _mensajeDelBackend(dynamic data) {
  if (data is! Map) return null;
  final msg = data['message'] ?? data['error'] ?? data['mensaje'];
  if (msg is String && msg.trim().isNotEmpty) {
    return _limpiar(msg);
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
    RegExp(r'^\s*(DioException|Exception|FormatException|TimeoutException|SocketException|HandshakeException|ClientException|StateError|RangeError|ArgumentError)\s*[:\-]?\s*', caseSensitive: false),
    RegExp(r'^\s*Error\s*:\s*', caseSensitive: false),
    RegExp(r'^\s*fatal error\s*[:\-]?\s*', caseSensitive: false),
  ];
  for (final p in prefijos) {
    t = t.replaceFirst(p, '');
  }
  // Colapsar saltos de línea y espacios.
  t = t.replaceAll(RegExp(r'<[^>]*>'), ''); // etiquetas HTML sueltas
  t = t.replaceAll(RegExp(r'\s+'), ' ').trim();
  // Limitar longitud razonable para UI.
  if (t.length > 300) t = '${t.substring(0, 300)}…';
  return t;
}

bool _pareceTecnico(String t) {
  final patrones = <RegExp>[
    RegExp(r'DioException|SocketException|HandshakeException|TimeoutException', caseSensitive: false),
    RegExp(r'at\s+[\w$.]+\s*\(.*:\d+:\d+\)'), // stack frames
    RegExp(r'^\s*\{.*\}\s*$', dotAll: true), // JSON crudo
    RegExp(r'<!DOCTYPE|<html', caseSensitive: false),
    RegExp(r'SQLSTATE|prisma|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH', caseSensitive: false),
  ];
  return patrones.any((p) => p.hasMatch(t));
}

/// Traduce cualquier error a un mensaje amigable para el técnico.
UserFriendlyError traducirError(Object? error, {String? contexto}) {
  // ------------------------------------------------------------------
  // Dio (la mayoría de los errores de red/HTTP)
  // ------------------------------------------------------------------
  if (error is DioException) {
    final msgBackend = _mensajeDelBackend(error.response?.data);
    final status = error.response?.statusCode;

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
        return UserFriendlyError(
          titulo: 'Cancelado',
          mensaje: 'La operación fue cancelada.',
          detalle: error.message,
        );
      case DioExceptionType.badResponse:
        // Mensajes del backend (4xx) suelen ser útiles: conservarlos.
        if (msgBackend != null && !_pareceTecnico(msgBackend)) {
          return UserFriendlyError(
            titulo: switch (status) {
              400 => 'Datos incompletos',
              401 => 'Sesión expirada',
              403 => 'Sin permiso',
              404 => 'No encontrado',
              409 => 'Conflicto',
              429 => 'Demasiadas solicitudes',
              _ => 'No se pudo completar',
            },
            mensaje: switch (status) {
              401 => 'Tu sesión expiró. Inicia sesión nuevamente.',
              403 => 'No tienes permiso para esta acción. '
                  'Solicita autorización al administrador.',
              404 => 'La información ya no está disponible en el servidor.',
              429 => 'Hay demasiadas solicitudes en curso. '
                  'Espera unos segundos e intenta de nuevo.',
              _ => msgBackend,
            },
            detalle: msgBackend != msgBackend ? msgBackend : null,
          );
        }
        return UserFriendlyError(
          titulo: switch (status) {
            401 => 'Sesión expirada',
            403 => 'Sin permiso',
            404 => 'No encontrado',
            _ => 'Error del servidor',
          },
          mensaje: switch (status) {
            401 => 'Tu sesión expiró. Inicia sesión nuevamente.',
            403 => 'No tienes permiso para esta acción. '
                'Solicita autorización al administrador.',
            404 => 'La información ya no está disponible en el servidor.',
            >= 500 => 'El servidor tuvo un problema temporal. '
                'Intenta de nuevo en unos minutos.',
            _ => 'No se pudo completar la operación (error $status). '
                'Intenta de nuevo.',
          },
          detalle: 'HTTP $status',
        );
      default:
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
    );
  }
  if (error is SocketException || error is HttpException) {
    return const UserFriendlyError(
      titulo: 'Sin conexión',
      mensaje:
          'No pudimos conectarnos con el servidor. '
          'Revisa tu Wi-Fi o datos móviles.',
      // ignore: unnecessary_string_interpolations
      detalle: null,
    );
  }
  if (error is HandshakeException) {
    return const UserFriendlyError(
      titulo: 'Conexión no segura',
      mensaje:
          'El servidor no pudo verificarse de forma segura. '
          'Intenta más tarde o cambia de red.',
    );
  }
  if (error is FormatException) {
    return const UserFriendlyError(
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
    );
  }
  if (texto.contains('EDICION_NO_AUTORIZADA')) {
    return const UserFriendlyError(
      titulo: 'Edición no autorizada',
      mensaje:
          'El administrador no autorizó (o revocó) la edición de esta orden. '
          'Tus cambios siguen guardados en el dispositivo.',
    );
  }
  if (texto.contains('NO_CONNECTION')) {
    return const UserFriendlyError(
      titulo: 'Sin conexión',
      mensaje: 'No hay conexión a internet. Intenta cuando tengas señal.',
    );
  }
  if (texto.contains('TIMEOUT_SSE')) {
    return const UserFriendlyError(
      titulo: 'El servidor no respondió',
      mensaje:
          'La sincronización se detuvo porque el servidor dejó de responder. '
          'La orden puede haberse procesado: intenta subirla otra vez y la app '
          'lo verificará automáticamente.',
    );
  }

  // ------------------------------------------------------------------
  // Fallback: texto ya legible vs. texto técnico
  // ------------------------------------------------------------------
  final limpio = _limpiar(texto);
  if (limpio.isNotEmpty && !_pareceTecnico(limpio) && limpio.length < 200) {
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
