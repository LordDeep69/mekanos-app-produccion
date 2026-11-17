/// Codec compartido para lectura controlada, compresión JPEG en Isolate
/// y construcción de referencias ligeras sin almacenar blobs Base64 en SQLite.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

class MediaPayloadCodec {
  MediaPayloadCodec._();

  static const int maxUploadDimension = 1600;
  static const int jpegUploadQuality = 75;
  static const int compressThresholdBytes = 300 * 1024;
  static const int maxConvertidosEnParalelo = 3;

  static Uint8List? _comprimirImagenIsolate(Uint8List bytes) {
    try {
      final original = img.decodeImage(bytes);
      if (original == null) return null;

      var imagen = original;
      final ladoMayor = math.max(original.width, original.height);
      if (ladoMayor > maxUploadDimension) {
        final escala = maxUploadDimension / ladoMayor;
        imagen = img.copyResize(
          original,
          width: (original.width * escala).round(),
          height: (original.height * escala).round(),
          interpolation: img.Interpolation.linear,
        );
      }

      return Uint8List.fromList(
        img.encodeJpg(imagen, quality: jpegUploadQuality),
      );
    } catch (_) {
      return null;
    }
  }

  /// Lee un archivo local desde disco, comprime JPEG si supera el umbral
  /// y devuelve su Base64 listo para transmisión HTTP.
  static Future<String?> encodeFileToBase64(String rutaLocal) async {
    try {
      if (rutaLocal.trim().isEmpty) return null;
      final file = File(rutaLocal);
      if (!await file.exists()) return null;

      var bytes = await file.readAsBytes();
      if (bytes.isEmpty) return null;

      final esPng = rutaLocal.toLowerCase().endsWith('.png');
      if (!esPng && bytes.length > compressThresholdBytes) {
        final comprimido = await compute(_comprimirImagenIsolate, bytes);
        if (comprimido != null && comprimido.isNotEmpty) {
          bytes = comprimido;
        }
      }

      return base64Encode(bytes);
    } catch (e) {
      debugPrint('⚠️ [MEDIA-CODEC] Error codificando $rutaLocal: $e');
      return null;
    }
  }

  /// Convierte un lote de rutas locales a Base64 con concurrencia acotada.
  static Future<List<String?>> encodeBatch(List<String> rutas) async {
    if (rutas.isEmpty) return const [];
    final resultados = List<String?>.filled(rutas.length, null);
    var siguiente = 0;

    Future<void> worker() async {
      while (true) {
        final indice = siguiente++;
        if (indice >= rutas.length) return;
        resultados[indice] = await encodeFileToBase64(rutas[indice]);
      }
    }

    final workers = math.min(maxConvertidosEnParalelo, rutas.length);
    await Future.wait(List.generate(workers, (_) => worker()));
    return resultados;
  }

  /// Construye un payload liviano para encolar en SQLite sin blobs Base64 pesados.
  /// Conserva referencias por archivo (`evidenciasRefs`, `firmasRefs`) y `_ownerUserId`.
  static Map<String, dynamic> buildLightweightQueuePayload({
    required Map<String, dynamic> basePayload,
    required List<Map<String, dynamic>> evidenciasRefs,
    required Map<String, dynamic>? firmasRefs,
    int? ownerUserId,
  }) {
    final clean = Map<String, dynamic>.from(basePayload);
    clean.remove('evidencias');
    clean.remove('firmas');
    clean['evidenciasRefs'] = evidenciasRefs;
    if (firmasRefs != null) {
      clean['firmasRefs'] = firmasRefs;
    }
    if (ownerUserId != null) {
      clean['_ownerUserId'] = ownerUserId;
    }
    return clean;
  }

  /// Valida sin I/O de disco que una entrada encolada pertenezca a la cuenta activa.
  static void assertOwnership(
    Map<String, dynamic> storedPayload, {
    required int? expectedOwnerUserId,
  }) {
    final owner = storedPayload['_ownerUserId'];
    if (owner is int &&
        expectedOwnerUserId != null &&
        owner != expectedOwnerUserId) {
      throw StateError(
        'ORDEN_PROPIETARIO_DISTINTO: La orden pertenece al usuario $owner, no a $expectedOwnerUserId.',
      );
    }
  }

  /// Verifica propiedad del payload offline e hidrata evidencias/firmas desde disco
  /// justo en el momento de enviar al servidor, eliminando metadatos internos `_`.
  static Future<Map<String, dynamic>> hydratePayloadForUpload(
    Map<String, dynamic> storedPayload, {
    int? expectedOwnerUserId,
  }) async {
    assertOwnership(storedPayload, expectedOwnerUserId: expectedOwnerUserId);

    final outgoing = Map<String, dynamic>.from(storedPayload);
    outgoing.remove('_ownerUserId');

    final rawEvRefs = outgoing.remove('evidenciasRefs');
    if (outgoing['evidencias'] == null && rawEvRefs is List) {
      final refs = rawEvRefs
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      final rutas = refs.map((r) => (r['rutaLocal'] ?? '').toString()).toList();
      final b64List = await encodeBatch(rutas);
      final evidencias = <Map<String, dynamic>>[];
      for (var i = 0; i < refs.length; i++) {
        final b64 = b64List[i];
        if (b64 != null && b64.isNotEmpty) {
          evidencias.add({
            'tipo': refs[i]['tipo'] ?? 'GENERAL',
            'base64': b64,
            if (refs[i]['descripcion'] != null)
              'descripcion': refs[i]['descripcion'],
            if (refs[i]['idOrdenEquipo'] != null)
              'idOrdenEquipo': refs[i]['idOrdenEquipo'],
          });
        }
      }
      outgoing['evidencias'] = evidencias;
    }

    final rawFirmasRefs = outgoing.remove('firmasRefs');
    if (outgoing['firmas'] == null && rawFirmasRefs is Map) {
      final firmasRefs = Map<String, dynamic>.from(rawFirmasRefs);
      final firmasOut = <String, dynamic>{};

      Future<void> hydrateFirma(String slot) async {
        final rawSlot = firmasRefs[slot];
        if (rawSlot is! Map) return;
        final m = Map<String, dynamic>.from(rawSlot);
        final ruta = (m['rutaLocal'] ?? '').toString();
        final b64 = await encodeFileToBase64(ruta);
        if (b64 != null && b64.isNotEmpty) {
          firmasOut[slot] = {
            'tipo': m['tipo'] ?? slot.toUpperCase(),
            'base64': b64,
            'idPersona': m['idPersona'] ?? 0,
            'nombreFirmante': m['nombreFirmante'] ?? '',
            'cargoFirmante': m['cargoFirmante'] ?? '',
          };
        }
      }

      await Future.wait([hydrateFirma('tecnico'), hydrateFirma('cliente')]);
      if (firmasOut.isNotEmpty) {
        outgoing['firmas'] = firmasOut;
      }
    }

    return outgoing;
  }
}
