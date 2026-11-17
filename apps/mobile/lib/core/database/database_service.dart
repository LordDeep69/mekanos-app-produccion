import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/data/auth_provider.dart';
import 'app_database.dart';

/// Provider aislado por cuenta para la base de datos SQLite local (`db_user_<id>.sqlite`).
/// Se reconstruye y cierra automáticamente la instancia anterior al cambiar de usuario o hacer logout.
final databaseProvider = Provider<AppDatabase>((ref) {
  final userId = ref.watch(activeUserIdProvider);
  final db = AppDatabase(scopedUserId: userId);
  DatabaseService.bindActiveInstance(userId, db);
  debugPrint(
    '🗄️ [DB] Instancia abierta para cuenta=${userId ?? 'guest'} (${db.scopedUserId})',
  );
  ref.onDispose(() {
    DatabaseService.unbindIfSame(db);
    db.close();
  });
  return db;
});

/// Servicio de base de datos - Singleton sincronizado con la sesión activa
class DatabaseService {
  static AppDatabase? _instance;
  static int? _boundUserId;

  static void bindActiveInstance(int? userId, AppDatabase db) {
    _boundUserId = userId;
    _instance = db;
  }

  static void unbindIfSame(AppDatabase db) {
    if (identical(_instance, db)) {
      _instance = null;
      _boundUserId = null;
    }
  }

  /// Obtener instancia de la base de datos para el usuario actualmente enlazado.
  static AppDatabase get instance {
    _instance ??= AppDatabase(scopedUserId: _boundUserId);
    return _instance!;
  }

  /// Cerrar la base de datos
  static Future<void> close() async {
    await _instance?.close();
    _instance = null;
  }

  /// Resetear la base de datos (para testing)
  static Future<void> reset({int? userId}) async {
    await close();
    _boundUserId = userId;
    _instance = AppDatabase(scopedUserId: userId);
  }
}
