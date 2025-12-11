import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Provider para el servicio de PDF
final pdfServiceProvider = Provider<PdfService>((ref) {
  return PdfService();
});

/// Servicio para gestionar PDFs de órdenes finalizadas
///
/// Funcionalidades:
/// - Descargar PDF desde URL (R2/Cloudflare)
/// - Guardar en caché local
/// - Abrir con visor nativo
/// - Compartir PDF
class PdfService {
  /// Directorio de caché para PDFs
  Future<Directory> get _cacheDir async {
    final appDir = await getApplicationDocumentsDirectory();
    final pdfDir = Directory('${appDir.path}/pdfs');
    if (!await pdfDir.exists()) {
      await pdfDir.create(recursive: true);
    }
    return pdfDir;
  }

  /// Genera nombre de archivo local para un PDF
  String _getLocalFileName(String numeroOrden) {
    // Sanitizar número de orden para nombre de archivo válido
    final sanitized = numeroOrden
        .replaceAll(RegExp(r'[^\w\-]'), '_')
        .replaceAll('__', '_');
    return 'orden_$sanitized.pdf';
  }

  /// Obtiene la ruta local del PDF (si existe en caché)
  Future<String?> getLocalPdfPath(String numeroOrden) async {
    final dir = await _cacheDir;
    final fileName = _getLocalFileName(numeroOrden);
    final file = File('${dir.path}/$fileName');

    if (await file.exists()) {
      return file.path;
    }
    return null;
  }

  /// Descarga un PDF desde URL y lo guarda en caché
  ///
  /// Retorna la ruta local del archivo descargado
  Future<PdfDownloadResult> downloadPdf({
    required String url,
    required String numeroOrden,
    void Function(int received, int total)? onProgress,
  }) async {
    try {
      // Verificar si ya existe en caché
      final existingPath = await getLocalPdfPath(numeroOrden);
      if (existingPath != null) {
        return PdfDownloadResult(
          success: true,
          localPath: existingPath,
          fromCache: true,
        );
      }

      // Descargar el PDF
      final response = await http.get(Uri.parse(url));

      if (response.statusCode != 200) {
        return PdfDownloadResult(
          success: false,
          error:
              'Error HTTP ${response.statusCode}: No se pudo descargar el PDF',
        );
      }

      // Guardar en caché
      final dir = await _cacheDir;
      final fileName = _getLocalFileName(numeroOrden);
      final file = File('${dir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      return PdfDownloadResult(
        success: true,
        localPath: file.path,
        fromCache: false,
        sizeBytes: response.bodyBytes.length,
      );
    } catch (e) {
      return PdfDownloadResult(success: false, error: 'Error al descargar: $e');
    }
  }

  /// Comparte un PDF usando el sistema nativo
  Future<bool> sharePdf({
    required String localPath,
    required String numeroOrden,
    String? subject,
  }) async {
    try {
      final file = File(localPath);
      if (!await file.exists()) {
        return false;
      }

      await Share.shareXFiles(
        [XFile(localPath)],
        subject: subject ?? 'Reporte de Servicio $numeroOrden',
        text: 'Adjunto el reporte del servicio técnico $numeroOrden',
      );

      return true;
    } catch (_) {
      return false;
    }
  }

  /// Elimina un PDF del caché
  Future<bool> deleteCachedPdf(String numeroOrden) async {
    try {
      final dir = await _cacheDir;
      final fileName = _getLocalFileName(numeroOrden);
      final file = File('${dir.path}/$fileName');

      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Limpia todos los PDFs del caché
  Future<int> clearCache() async {
    try {
      final dir = await _cacheDir;
      final files = await dir.list().toList();
      int deleted = 0;

      for (final file in files) {
        if (file is File && file.path.endsWith('.pdf')) {
          await file.delete();
          deleted++;
        }
      }

      return deleted;
    } catch (_) {
      return 0;
    }
  }

  /// Obtiene el tamaño total del caché de PDFs
  Future<int> getCacheSize() async {
    try {
      final dir = await _cacheDir;
      final files = await dir.list().toList();
      int totalSize = 0;

      for (final file in files) {
        if (file is File && file.path.endsWith('.pdf')) {
          totalSize += await file.length();
        }
      }

      return totalSize;
    } catch (e) {
      return 0;
    }
  }
}

/// Resultado de descarga de PDF
class PdfDownloadResult {
  final bool success;
  final String? localPath;
  final String? error;
  final bool fromCache;
  final int? sizeBytes;

  PdfDownloadResult({
    required this.success,
    this.localPath,
    this.error,
    this.fromCache = false,
    this.sizeBytes,
  });

  /// Tamaño formateado (KB o MB)
  String get sizeFormatted {
    if (sizeBytes == null) return '';
    if (sizeBytes! < 1024) return '$sizeBytes B';
    if (sizeBytes! < 1024 * 1024) {
      return '${(sizeBytes! / 1024).toStringAsFixed(1)} KB';
    }
    return '${(sizeBytes! / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
