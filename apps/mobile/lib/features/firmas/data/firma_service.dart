import 'dart:io';

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Provider para el servicio de firmas
final firmaServiceProvider = Provider<FirmaService>((ref) {
  final db = ref.watch(databaseProvider);
  return FirmaService(db);
});

/// Servicio de Firmas Digitales - RUTA 8
///
/// Maneja:
/// - Guardado de PNG en Documents/firmas/
/// - Persistencia en tabla Firmas (drift)
/// - Consulta de firmas existentes
class FirmaService {
  final AppDatabase _db;

  FirmaService(this._db);

  /// Guarda una firma digital
  ///
  /// [idOrden] - ID de la orden local
  /// [tipoFirma] - TECNICO o CLIENTE
  /// [pngBytes] - Bytes del PNG generado por el canvas
  /// [nombreFirmante] - Nombre legible obligatorio
  /// [cargoFirmante] - Cargo (opcional para técnico, obligatorio para cliente)
  /// [documentoFirmante] - Documento de identidad opcional
  ///
  /// Retorna el ID de la firma insertada o null si falla
  Future<int?> guardarFirma({
    required int idOrden,
    required String tipoFirma, // TECNICO, CLIENTE
    required Uint8List pngBytes,
    required String nombreFirmante,
    String? cargoFirmante,
    String? documentoFirmante,
  }) async {
    try {
      // 1. Crear directorio de firmas si no existe
      final appDir = await getApplicationDocumentsDirectory();
      final firmasDir = Directory(p.join(appDir.path, 'firmas'));
      if (!await firmasDir.exists()) {
        await firmasDir.create(recursive: true);
      }

      // 2. Generar nombre de archivo único
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = 'FIRMA_${idOrden}_${tipoFirma}_$timestamp.png';
      final filePath = p.join(firmasDir.path, fileName);

      // 3. Guardar archivo PNG
      final file = File(filePath);
      await file.writeAsBytes(pngBytes);

      // 4. Insertar registro en BD
      final idFirma = await _db.insertFirma(
        FirmasCompanion.insert(
          idOrden: idOrden,
          rutaLocal: filePath,
          tipoFirma: tipoFirma,
          nombreFirmante: Value(nombreFirmante),
          cargoFirmante: Value(cargoFirmante),
          documentoFirmante: Value(documentoFirmante),
        ),
      );

      return idFirma;
    } catch (_) {
      return null;
    }
  }

  /// Obtiene las firmas de una orden
  Future<List<Firma>> getFirmasByOrden(int idOrden) async {
    return await _db.getFirmasByOrden(idOrden);
  }

  /// Obtiene una firma específica por tipo
  Future<Firma?> getFirmaByTipo(int idOrden, String tipoFirma) async {
    final firmas =
        await (_db.select(_db.firmas)
              ..where((f) => f.idOrden.equals(idOrden))
              ..where((f) => f.tipoFirma.equals(tipoFirma)))
            .get();

    return firmas.isNotEmpty ? firmas.first : null;
  }

  /// Verifica si existe una firma de un tipo específico
  Future<bool> existeFirma(int idOrden, String tipoFirma) async {
    final firma = await getFirmaByTipo(idOrden, tipoFirma);
    return firma != null;
  }

  /// Elimina una firma (archivo y registro BD)
  Future<bool> eliminarFirma(int idFirma) async {
    try {
      // 1. Obtener la firma
      final firma = await (_db.select(
        _db.firmas,
      )..where((f) => f.idLocal.equals(idFirma))).getSingleOrNull();

      if (firma == null) return false;

      // 2. Eliminar archivo físico
      final file = File(firma.rutaLocal);
      if (await file.exists()) {
        await file.delete();
      }

      // 3. Eliminar registro de BD
      await (_db.delete(
        _db.firmas,
      )..where((f) => f.idLocal.equals(idFirma))).go();

      return true;
    } catch (_) {
      return false;
    }
  }

  /// Verifica requisitos para finalizar orden
  /// Retorna un mapa con el estado de cada requisito
  Future<Map<String, bool>> verificarRequisitosFinalizacion(int idOrden) async {
    final firmaTecnico = await existeFirma(idOrden, 'TECNICO');
    final firmaCliente = await existeFirma(idOrden, 'CLIENTE');

    return {'firmaTecnico': firmaTecnico, 'firmaCliente': firmaCliente};
  }
}
