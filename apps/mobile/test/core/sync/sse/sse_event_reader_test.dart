import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/core/sync/sse/sse_event_reader.dart';

void main() {
  group('leerEventosSse', () {
    test('parsea un evento SSE completo', () async {
      final eventos = <Map<String, dynamic>>[];
      final payload =
          'data: {"step":"validando","status":"in_progress",'
          '"message":"Validando datos"}\n\n';

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable([utf8.encode(payload)]),
        onEvento: eventos.add,
      );

      expect(eventos.length, 1);
      expect(eventos.first['step'], 'validando');
      expect(eventos.first['status'], 'in_progress');
      expect(resultado.eventosRecibidos, 1);
      expect(resultado.terminoAnormal, isFalse);
    });

    test('une caracteres multibyte cortados entre chunks (tildes/emojis)',
        () async {
      final eventos = <Map<String, dynamic>>[];
      // "Validación é ✅" contiene bytes multibyte; se corta cada 5 bytes
      // para forzar caracteres partidos entre chunks.
      final payload =
          'data: {"step":"validando","status":"completed",'
          '"message":"Validación é ✅"}\n\n';
      final bytes = utf8.encode(payload);

      final chunks = <List<int>>[];
      for (var i = 0; i < bytes.length; i += 5) {
        final fin = (i + 5 < bytes.length) ? i + 5 : bytes.length;
        chunks.add(bytes.sublist(i, fin));
      }

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable(chunks),
        onEvento: eventos.add,
      );

      expect(eventos.length, 1);
      expect(eventos.first['message'], 'Validación é ✅');
      expect(resultado.eventosRecibidos, 1);
      expect(resultado.terminoAnormal, isFalse);
    });

    test('despacha el último evento aunque el stream cierre sin línea vacía',
        () async {
      final eventos = <Map<String, dynamic>>[];
      final payload =
          'data: {"step":"result","status":"completed",'
          '"data":{"success":true}}\n';

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable([utf8.encode(payload)]),
        onEvento: eventos.add,
      );

      expect(eventos.length, 1);
      expect(resultado.resultadoFinal, isNotNull);
      expect(resultado.resultadoFinal!['success'], isTrue);
    });

    test('captura el mensaje del último error del backend', () async {
      final eventos = <Map<String, dynamic>>[];
      final payload =
          'data: {"step":"evidencias","status":"error",'
          '"message":"Falló subir evidencias"}\n\n';

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable([utf8.encode(payload)]),
        onEvento: eventos.add,
      );

      expect(resultado.ultimoError, 'Falló subir evidencias');
    });

    test('ignora comentarios (heartbeat) y campos no usados', () async {
      final eventos = <Map<String, dynamic>>[];
      final payload =
          ': heartbeat\n'
          'event: progress\n'
          'id: 1\n'
          'retry: 3000\n'
          '\n'
          'data: {"step":"firmas","status":"in_progress"}\n\n';

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable([utf8.encode(payload)]),
        onEvento: eventos.add,
      );

      expect(eventos.length, 1);
      expect(eventos.first['step'], 'firmas');
      expect(resultado.eventosRecibidos, 1);
    });

    test('une varias líneas data: del mismo evento', () async {
      final eventos = <Map<String, dynamic>>[];
      // El estándar SSE permite múltiples `data:` que se unen con \n.
      // El backend no lo usa, pero el lector no debe romperse.
      final payload =
          'data: {"step":"a"}\n'
          'data: {"step":"b"}\n\n';

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable([utf8.encode(payload)]),
        onEvento: eventos.add,
      );

      // El JSON unido no es válido → se ignora en silencio, sin tirar.
      expect(eventos.length, 0);
      expect(resultado.terminoAnormal, isFalse);
    });

    test('una excepción en onEvento no tumba el stream', () async {
      var llamadas = 0;
      final payload =
          'data: {"step":"a","status":"in_progress"}\n\n'
          'data: {"step":"b","status":"in_progress"}\n\n';

      final resultado = await leerEventosSse(
        Stream<List<int>>.fromIterable([utf8.encode(payload)]),
        onEvento: (_) {
          llamadas++;
          throw StateError('bug de UI');
        },
      );

      expect(llamadas, 2);
      expect(resultado.eventosRecibidos, 2);
      expect(resultado.terminoAnormal, isFalse);
    });

    test('aborta por STALL si no llegan bytes', () async {
      final controller = StreamController<List<int>>();
      final eventos = <Map<String, dynamic>>[];

      final future = leerEventosSse(
        controller.stream,
        onEvento: eventos.add,
        stallTimeout: const Duration(milliseconds: 150),
        limiteTotal: const Duration(seconds: 5),
      );

      final resultado = await future;

      expect(resultado.abortadoPorStall, isTrue);
      expect(resultado.abortadoPorLimite, isFalse);
      expect(resultado.terminoAnormal, isTrue);
      expect(eventos, isEmpty);

      await controller.close();
    });

    test('aborta por LÍMITE total aunque sigan llegando datos', () async {
      final controller = StreamController<List<int>>();
      final eventos = <Map<String, dynamic>>[];

      final future = leerEventosSse(
        controller.stream,
        onEvento: eventos.add,
        stallTimeout: const Duration(seconds: 5),
        limiteTotal: const Duration(milliseconds: 300),
      );

      // Comentarios cada 50 ms: hay bytes (no hay stall), pero el proceso
      // total supera el límite de 300 ms.
      final timer = Timer.periodic(const Duration(milliseconds: 50), (t) {
        controller.add(utf8.encode(': keep-alive\n\n'));
      });

      final resultado = await future;

      timer.cancel();
      expect(resultado.abortadoPorLimite, isTrue);
      expect(resultado.abortadoPorStall, isFalse);
      expect(eventos, isEmpty);

      await controller.close();
    });

    test('reporta error de stream sin lanzar excepción', () async {
      final controller = StreamController<List<int>>();
      final eventos = <Map<String, dynamic>>[];

      final future = leerEventosSse(
        controller.stream,
        onEvento: eventos.add,
      );

      controller.addError(const SocketExceptionMock('conexión cortada'));
      final resultado = await future;

      expect(resultado.errorDeStream, isTrue);
      expect(resultado.terminoAnormal, isTrue);

      await controller.close();
    });
  });
}

/// Excepción mínima para simular un corte de red sin depender de dart:io.
class SocketExceptionMock implements Exception {
  final String mensaje;
  const SocketExceptionMock(this.mensaje);

  @override
  String toString() => 'SocketExceptionMock: $mensaje';
}
