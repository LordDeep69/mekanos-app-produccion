import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';

/// Provider singleton para la base de datos
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});

/// Servicio de base de datos - Singleton
class DatabaseService {
  static AppDatabase? _instance;

  /// Obtener instancia única de la base de datos
  static AppDatabase get instance {
    _instance ??= AppDatabase();
    return _instance!;
  }

  /// Cerrar la base de datos
  static Future<void> close() async {
    await _instance?.close();
    _instance = null;
  }

  /// Resetear la base de datos (para testing)
  static Future<void> reset() async {
    await close();
    _instance = AppDatabase();
  }
}
