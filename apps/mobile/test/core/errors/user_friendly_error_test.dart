import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/core/errors/user_friendly_error.dart';

RequestOptions _opciones(String path) => RequestOptions(path: path);

DioException _dioError({
  required DioExceptionType tipo,
  int? status,
  dynamic data,
}) {
  return DioException(
    requestOptions: _opciones('/ordenes/1'),
    type: tipo,
    message: 'DioException: detalle técnico que no debe verse',
    response: status == null
        ? null
        : Response<dynamic>(
            requestOptions: _opciones('/ordenes/1'),
            statusCode: status,
            data: data,
          ),
  );
}

void main() {
  group('traducirError', () {
    test('timeout de conexión se explica en español y es reintentable', () {
      final traducido = traducirError(
        _dioError(tipo: DioExceptionType.receiveTimeout),
      );

      expect(traducido.titulo, 'Conexión lenta');
      expect(traducido.mensaje, contains('señal'));
      expect(traducido.reintentable, isTrue);
      expect(traducido.mensaje, isNot(contains('DioException')));
      expect(traducido.mensaje, isNot(contains('detalle técnico')));
    });

    test('error de conexión no expone detalles de red', () {
      final traducido = traducirError(
        _dioError(tipo: DioExceptionType.connectionError),
      );

      expect(traducido.titulo, 'Sin conexión');
      expect(traducido.mensaje, contains('Wi-Fi'));
      expect(traducido.mensaje, isNot(contains('Socket')));
    });

    test('502 con HTML de Cloudflare no muestra HTML', () {
      final traducido = traducirError(
        _dioError(
          tipo: DioExceptionType.badResponse,
          status: 502,
          data: '<!DOCTYPE html><html><body>Bad Gateway</body></html>',
        ),
      );

      expect(traducido.titulo, 'Servidor no disponible');
      expect(traducido.mensaje, isNot(contains('<')));
      expect(traducido.mensaje, isNot(contains('html')));
      expect(traducido.mensaje, contains('Tus datos siguen guardados'));
    });

    test('504 se presenta como demora del servidor, no como éxito', () {
      final traducido = traducirError(
        _dioError(tipo: DioExceptionType.badResponse, status: 504),
      );

      expect(traducido.titulo, 'Servidor no disponible');
      expect(traducido.mensaje, contains('tardó demasiado'));
    });

    test('mensaje de negocio del backend se conserva', () {
      final traducido = traducirError(
        _dioError(
          tipo: DioExceptionType.badResponse,
          status: 409,
          data: {
            'message': 'La orden ya fue finalizada por otro técnico.',
          },
        ),
      );

      expect(traducido.titulo, 'Conflicto');
      expect(
        traducido.mensaje,
        'La orden ya fue finalizada por otro técnico.',
      );
      expect(traducido.reintentable, isFalse);
    });

    test('403 sin mensaje pide autorización y no es reintentable', () {
      final traducido = traducirError(
        _dioError(tipo: DioExceptionType.badResponse, status: 403),
      );

      expect(traducido.titulo, 'Sin permiso');
      expect(traducido.mensaje, contains('administrador'));
      expect(traducido.reintentable, isFalse);
    });

    test('401 pide iniciar sesión otra vez', () {
      final traducido = traducirError(
        _dioError(tipo: DioExceptionType.badResponse, status: 401),
      );

      expect(traducido.titulo, 'Sesión expirada');
      expect(traducido.mensaje, contains('Inicia sesión'));
    });

    test('TIMEOUT_SSE aclara que la orden pudo procesarse', () {
      final traducido = traducirError('TIMEOUT_SSE');

      expect(traducido.titulo, 'El servidor no respondió');
      expect(traducido.mensaje, contains('verificará automáticamente'));
    });

    test('stack trace de Dart nunca llega al usuario', () {
      final error = StateError(
        'Bad state: null\n#0      Foo.bar (package:app/foo.dart:10:2)\n'
        '#1      main (package:app/main.dart:3:1)',
      );

      final traducido = traducirError(error, contexto: 'guardar la firma');

      expect(traducido.mensaje, isNot(contains('#')));
      expect(traducido.mensaje, isNot(contains('Bad state')));
      expect(traducido.mensaje, contains('guardar la firma'));
    });

    test('mensaje sencillo y humano se conserva', () {
      final traducido = traducirError('Por favor, dibuje su firma');

      expect(traducido.mensaje, 'Por favor, dibuje su firma');
    });

    test('SocketException pura se traduce sin texto técnico', () {
      final traducido = traducirError(
        const SocketException('Connection refused'),
      );

      expect(traducido.titulo, 'Sin conexión');
      expect(traducido.mensaje, isNot(contains('Connection refused')));
    });

    test('respuesta con JSON crudo no se muestra como mensaje', () {
      final traducido = traducirError(
        _dioError(
          tipo: DioExceptionType.badResponse,
          status: 500,
          data: '{"statusCode":500,"message":"Internal server error"}',
        ),
      );

      expect(traducido.mensaje, isNot(contains('statusCode')));
      expect(traducido.mensaje, contains('problema temporal'));
    });
  });

  group('mensajeAmigable', () {
    test('usa contexto en el fallback para errores desconocidos', () {
      final mensaje = mensajeAmigable(
        _ErrorDesconocido(),
        contexto: 'leer la respuesta del servidor',
      );

      expect(mensaje, contains('leer la respuesta del servidor'));
      expect(mensaje, isNot(contains('boom interno')));
    });

    test('FormatException tiene mensaje propio, sin exponer el detalle', () {
      final mensaje = mensajeAmigable(
        const FormatException('Unexpected character'),
      );

      expect(mensaje, contains('no se pudo interpretar'));
      expect(mensaje, isNot(contains('Unexpected character')));
    });

    test('codifica correctamente acentos y saltos de línea', () {
      final mensaje = mensajeAmigable('El servidor no autorizó la edición.');

      expect(mensaje, contains('autorizó'));
      expect(mensaje, isNot(contains('\n')));
      expect(utf8.encode(mensaje).isNotEmpty, isTrue);
    });
  });
}

/// Excepción ad-hoc: debe caer al fallback genérico del traductor.
class _ErrorDesconocido implements Exception {
  @override
  String toString() => '_ErrorDesconocido: boom interno';
}
