// ============================================================================
// LECTOR ROBUSTO DE EVENTOS SSE (Server-Sent Events)
// ============================================================================
//
// ✅ 24-OCT-2026: Reemplaza el parseo por-chunk que tenía la app.
//
// Por qué: el parser anterior hacía `utf8.decode(chunk).split('\n')` por cada
// chunk. Eso falla cuando:
//   1. Un carácter multibyte (tildes/emojis del mensaje del backend) queda
//      partido entre dos chunks → FormatException → se abortaba TODO el
//      stream y se reenviaba la orden (riesgo de duplicado).
//   2. Un evento JSON llega partido entre chunks → el parseo falla en
//      silencio y el progreso en pantalla se congela ("Validando..." forever).
//
// Este lector:
//   - Decodifica UTF-8 de forma incremental (tolerante a cortes).
//   - Acumula líneas según el estándar SSE (varias líneas `data:` forman un
//     evento; la línea vacía lo despacha).
//   - Ignora comentarios (líneas que empiezan con ':'), usados como heartbeat.
//   - Detecta STALL: si no llega ningún byte en `stallTimeout`, aborta
//     (evita diálogos colgados indefinidamente).
//   - Detecta LÍMITE total (`limiteTotal`) como red de seguridad.

import 'dart:async';
import 'dart:convert';

/// Resultado de leer un stream SSE hasta su fin (o aborto).
class SseReadResult {
  /// Payload del evento final `{step: 'result', data: {...}}` si llegó.
  final Map<String, dynamic>? resultadoFinal;

  /// Último error reportado por el backend (`status: 'error'`).
  final String? ultimoError;

  /// true si se abortó por no recibir bytes en `stallTimeout`.
  final bool abortadoPorStall;

  /// true si se abortó por exceder `limiteTotal`.
  final bool abortadoPorLimite;

  /// true si el stream terminó con error (red cortada, etc.).
  final bool errorDeStream;

  /// Texto técnico del error de stream (solo para logs).
  final String? errorTexto;

  /// Cantidad de eventos JSON recibidos y despachados.
  final int eventosRecibidos;

  const SseReadResult({
    this.resultadoFinal,
    this.ultimoError,
    this.abortadoPorStall = false,
    this.abortadoPorLimite = false,
    this.errorDeStream = false,
    this.errorTexto,
    this.eventosRecibidos = 0,
  });

  /// El stream terminó de forma anormal (stall, límite o error de red).
  bool get terminoAnormal =>
      abortadoPorStall || abortadoPorLimite || errorDeStream;
}

/// Lee un stream SSE y despacha cada evento a [onEvento].
///
/// No lanza excepciones: todos los fallos se reportan en [SseReadResult].
Future<SseReadResult> leerEventosSse(
  Stream<List<int>> stream, {
  required void Function(Map<String, dynamic> evento) onEvento,
  Duration stallTimeout = const Duration(seconds: 45),
  Duration limiteTotal = const Duration(minutes: 8),
}) {
  final completer = Completer<SseReadResult>();

  Map<String, dynamic>? resultadoFinal;
  String? ultimoError;
  int eventos = 0;
  var stall = false;
  var limite = false;
  var errorStream = false;
  String? errorTexto;

  Timer? stallTimer;
  StreamSubscription<String>? sub;
  final deadline = DateTime.now().add(limiteTotal);

  SseReadResult buildResult() => SseReadResult(
        resultadoFinal: resultadoFinal,
        ultimoError: ultimoError,
        abortadoPorStall: stall,
        abortadoPorLimite: limite,
        errorDeStream: errorStream,
        errorTexto: errorTexto,
        eventosRecibidos: eventos,
      );

  void terminar() {
    stallTimer?.cancel();
    if (!completer.isCompleted) completer.complete(buildResult());
  }

  void rearmarStall() {
    stallTimer?.cancel();
    stallTimer = Timer(stallTimeout, () {
      debugSse('⏱️ [SSE] STALL: sin datos en ${stallTimeout.inSeconds}s');
      stall = true;
      sub?.cancel();
      terminar();
    });
  }

  // Líneas `data:` acumuladas del evento en curso.
  final dataLines = <String>[];

  void despacharEvento() {
    if (dataLines.isEmpty) return;
    final jsonStr = dataLines.join('\n').trim();
    dataLines.clear();
    if (jsonStr.isEmpty) return;
    try {
      final evento = json.decode(jsonStr) as Map<String, dynamic>;
      eventos++;
      onEvento(evento);
      if (evento['step'] == 'result' && evento['data'] != null) {
        resultadoFinal = (evento['data'] as Map).cast<String, dynamic>();
      }
      if (evento['status'] == 'error') {
        final msg = evento['message'];
        if (msg is String && msg.isNotEmpty) ultimoError = msg;
      }
    } catch (_) {
      // Línea no-JSON (p. ej. texto del proxy): se ignora sin romper el stream.
    }
  }

  sub = stream
      .transform(const Utf8Decoder(allowMalformed: true))
      .transform(const LineSplitter())
      .listen(
    (line) {
      rearmarStall();

      final l = line.trimRight();
      if (l.isEmpty) {
        // Línea vacía = fin del evento en curso.
        despacharEvento();
        return;
      }
      if (l.startsWith(':')) {
        // Comentario/heartbeat del servidor: solo actividad.
        return;
      }
      if (l.startsWith('data:')) {
        dataLines.add(l.substring(5).trim());
        return;
      }
      // `event:`, `id:`, `retry:` y demás campos no usados: ignorar.

      if (DateTime.now().isAfter(deadline)) {
        debugSse('⏱️ [SSE] Límite total superado (${limiteTotal.inMinutes} min)');
        limite = true;
        sub?.cancel();
        terminar();
      }
    },
    onError: (Object e) {
      debugSse('❌ [SSE] Error de stream: $e');
      errorStream = true;
      errorTexto = e.toString();
      sub?.cancel();
      terminar();
    },
    onDone: terminar,
    cancelOnError: true,
  );

  rearmarStall();
  return completer.future;
}

/// Log controlado (solo debug) para no ensuciar release.
void debugSse(String mensaje) {
  assert(() {
    // ignore: avoid_print
    print(mensaje);
    return true;
  }());
}
