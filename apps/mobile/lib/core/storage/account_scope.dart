/// Utilidades puras de aislamiento multi-cuenta (Zero-Trust).
///
/// Garantiza separación física de datos entre distintas cuentas de técnicos
/// en un dispositivo compartido:
/// - SQLite privado por cuenta: `db_user_<userId>.sqlite`
/// - Bóveda de medios por cuenta: `Documents/media/user_<userId>/<categoria>/`
/// - Claves de `SharedPreferences` prefijadas por cuenta: `user_<userId>_<key>`
library;

import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class AccountScope {
  AccountScope._();

  static const String mediaCategoryEvidencias = 'evidencias';
  static const String mediaCategoryFirmas = 'firmas';

  /// Identificador de segmento normalizado para el usuario actual.
  static String scopeSegment(int? userId) {
    if (userId == null || userId <= 0) return 'guest';
    return 'user_$userId';
  }

  /// Archivo SQLite exclusivo del usuario.
  static String dbFileName(int? userId) {
    if (userId != null && userId > 0) {
      return 'db_user_$userId.sqlite';
    }
    return 'db_guest.sqlite';
  }

  /// Ruta base para la bóveda de archivos multimedia de la cuenta.
  static String mediaRootPath(String appDocsPath, int? userId) {
    return p.join(appDocsPath, 'media', scopeSegment(userId));
  }

  /// Ruta de subcarpeta (`evidencias` o `firmas`) para una cuenta.
  static String mediaCategoryPath(
    String appDocsPath,
    int? userId,
    String category,
  ) {
    return p.join(mediaRootPath(appDocsPath, userId), category);
  }

  /// Obtiene o crea el directorio de almacenamiento multimedia privado del usuario.
  static Future<Directory> ensureMediaDirectory(
    int? userId,
    String category,
  ) async {
    final appDir = await getApplicationDocumentsDirectory();
    final targetPath = mediaCategoryPath(appDir.path, userId, category);
    final dir = Directory(targetPath);
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  /// Construye una clave de `SharedPreferences` aislada por usuario.
  static String prefsKey(int? userId, String baseKey) {
    return '${scopeSegment(userId)}_$baseKey';
  }

  /// Verifica si una ruta local pertenece al espacio aislado del usuario indicado.
  static bool pathBelongsToUser(String filePath, int? userId) {
    if (filePath.trim().isEmpty) return false;
    final segment = scopeSegment(userId);
    final normalized = filePath.replaceAll('\\', '/');
    return normalized.contains('/media/$segment/');
  }

  /// Clave de caché de branding público ligada al origen del servidor.
  static String brandingCacheKey(String apiBaseUrl) {
    final uri = Uri.tryParse(apiBaseUrl.trim());
    final hostKey = (uri != null && uri.host.isNotEmpty)
        ? '${uri.scheme}_${uri.host}_${uri.port}'
        : 'default';
    return 'org_branding_public_$hostKey';
  }
}
