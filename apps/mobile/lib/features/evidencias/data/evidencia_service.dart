import 'dart:io';

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// ============================================================================
/// EVIDENCIA SERVICE - RUTA 7
/// ============================================================================
/// Servicio de gestión de evidencias fotográficas con:
/// - Compresión mandatoria (max 500KB)
/// - Persistencia en directorio permanente (Documents/evidencias/)
/// - Naming convention: ORD_{idOrden}_{TIPO}_{timestamp}.jpg
/// - Auditoría forense completa
/// ============================================================================

/// Tipos de evidencia permitidos
enum TipoEvidencia { ANTES, DURANTE, DESPUES, MEDICION, GENERAL }

/// Resultado de captura de evidencia
class CapturaEvidenciaResult {
  final bool exito;
  final String? rutaArchivo;
  final int? idEvidencia;
  final int? tamanoBytes;
  final String? error;

  CapturaEvidenciaResult({
    required this.exito,
    this.rutaArchivo,
    this.idEvidencia,
    this.tamanoBytes,
    this.error,
  });

  /// Tamaño en KB
  double get tamanoKB => (tamanoBytes ?? 0) / 1024;

  /// Tamaño en MB
  double get tamanoMB => tamanoKB / 1024;
}

/// Provider del servicio de evidencias
final evidenciaServiceProvider = Provider<EvidenciaService>((ref) {
  final db = ref.watch(databaseProvider);
  return EvidenciaService(db);
});

class EvidenciaService {
  final AppDatabase _db;
  final ImagePicker _picker = ImagePicker();

  // ============================================================================
  // CONFIGURACIÓN DE COMPRESIÓN (ESTÁNDARES INDUSTRIALES)
  // ============================================================================
  static const int _maxWidth = 1920; // Full HD
  static const int _maxHeight = 1080; // Full HD
  static const int _imageQuality = 80; // Balance calidad/tamaño

  // Directorio de evidencias
  static const String _evidenciasDir = 'evidencias';

  EvidenciaService(this._db);

  // ============================================================================
  // GESTIÓN DE DIRECTORIO PERMANENTE
  // ============================================================================

  /// Obtiene o crea el directorio permanente de evidencias
  /// NUNCA usa carpeta temporal/cache
  Future<Directory> _getEvidenciasDirectory() async {
    final appDir = await getApplicationDocumentsDirectory();
    final evidenciasPath = path.join(appDir.path, _evidenciasDir);
    final dir = Directory(evidenciasPath);

    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }

    return dir;
  }

  /// Genera nombre de archivo con convención forense
  /// Formato: ORD_{idOrden}_{TIPO}_{timestamp}.jpg
  String _generarNombreArchivo(int idOrden, TipoEvidencia tipo) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'ORD_${idOrden}_${tipo.name}_$timestamp.jpg';
  }

  // ============================================================================
  // CAPTURA Y PERSISTENCIA DE EVIDENCIAS
  // ============================================================================

  /// Captura una foto desde la cámara con compresión automática
  ///
  /// [idOrden]: ID local de la orden
  /// [tipo]: Tipo de evidencia (ANTES, DURANTE, DESPUES, MEDICION, ACTIVIDAD)
  /// [descripcion]: Descripción opcional del técnico
  /// [idActividadEjecutada]: Si se proporciona, vincula la foto a esa actividad específica
  /// [idOrdenEquipo]: ✅ MULTI-EQUIPOS: ID del orden-equipo para vincular evidencia
  ///
  /// Retorna [CapturaEvidenciaResult] con información forense
  Future<CapturaEvidenciaResult> capturarFotoCamara({
    required int idOrden,
    required TipoEvidencia tipo,
    String? descripcion,
    int? idActividadEjecutada, // ✅ NUEVO: Para modelo híbrido
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS (16-DIC-2025)
  }) async {
    try {
      // 1. Capturar imagen con compresión nativa (OFFLINE - no requiere internet)
      final XFile? imagen = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: _maxWidth.toDouble(),
        maxHeight: _maxHeight.toDouble(),
        imageQuality: _imageQuality,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (imagen == null) {
        return CapturaEvidenciaResult(exito: false, error: 'Captura cancelada');
      }

      // 2. Obtener directorio permanente
      final evidenciasDir = await _getEvidenciasDirectory();

      // 3. Generar nombre con convención forense
      final nombreArchivo = _generarNombreArchivo(idOrden, tipo);
      final rutaDestino = path.join(evidenciasDir.path, nombreArchivo);

      // 4. Mover archivo de temporal a permanente
      final archivoTemporal = File(imagen.path);
      final archivoPermanente = await archivoTemporal.copy(rutaDestino);

      // 5. Eliminar archivo temporal
      if (await archivoTemporal.exists()) {
        await archivoTemporal.delete();
      }

      // 6. Obtener tamaño
      final tamanoBytes = await archivoPermanente.length();

      // 7. Registrar en base de datos

      final idEvidencia = await _db.insertEvidencia(
        EvidenciasCompanion.insert(
          idOrden: idOrden,
          idActividadEjecutada: Value(idActividadEjecutada), // ✅ MODELO HÍBRIDO
          idOrdenEquipo: Value(idOrdenEquipo), // ✅ MULTI-EQUIPOS (16-DIC-2025)
          rutaLocal: rutaDestino,
          tipoEvidencia: tipo.name,
          descripcion: Value(descripcion),
          fechaCaptura: Value(DateTime.now()),
          isDirty: const Value(true),
          subida: const Value(false),
        ),
      );

      return CapturaEvidenciaResult(
        exito: true,
        rutaArchivo: rutaDestino,
        idEvidencia: idEvidencia,
        tamanoBytes: tamanoBytes,
      );
    } catch (e) {
      return CapturaEvidenciaResult(exito: false, error: e.toString());
    }
  }

  /// Selecciona una imagen de la galería con compresión automática
  /// ✅ MULTI-EQUIPOS (16-DIC-2025): Agregado idOrdenEquipo opcional
  Future<CapturaEvidenciaResult> seleccionarDeGaleria({
    required int idOrden,
    required TipoEvidencia tipo,
    String? descripcion,
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS: Para asociar evidencia a equipo específico
  }) async {
    try {
      // 1. Seleccionar imagen con compresión
      final XFile? imagen = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: _maxWidth.toDouble(),
        maxHeight: _maxHeight.toDouble(),
        imageQuality: _imageQuality,
      );

      if (imagen == null) {
        return CapturaEvidenciaResult(
          exito: false,
          error: 'Selección cancelada',
        );
      }

      // 2. Mover a directorio permanente (mismo proceso que cámara)
      final evidenciasDir = await _getEvidenciasDirectory();
      final nombreArchivo = _generarNombreArchivo(idOrden, tipo);
      final rutaDestino = path.join(evidenciasDir.path, nombreArchivo);

      final archivoOriginal = File(imagen.path);
      final archivoPermanente = await archivoOriginal.copy(rutaDestino);

      // 3. Obtener tamaño
      final tamanoBytes = await archivoPermanente.length();

      // 4. Registrar en BD (con idOrdenEquipo para multi-equipos)
      final idEvidencia = await _db.insertEvidencia(
        EvidenciasCompanion.insert(
          idOrden: idOrden,
          rutaLocal: rutaDestino,
          tipoEvidencia: tipo.name,
          descripcion: Value(descripcion),
          fechaCaptura: Value(DateTime.now()),
          isDirty: const Value(true),
          subida: const Value(false),
          idOrdenEquipo: Value(idOrdenEquipo), // ✅ MULTI-EQUIPOS
        ),
      );

      return CapturaEvidenciaResult(
        exito: true,
        rutaArchivo: rutaDestino,
        idEvidencia: idEvidencia,
        tamanoBytes: tamanoBytes,
      );
    } catch (e) {
      return CapturaEvidenciaResult(exito: false, error: e.toString());
    }
  }

  // ============================================================================
  // CONSULTAS DE EVIDENCIAS
  // ============================================================================

  /// Obtiene todas las evidencias de una orden
  Future<List<Evidencia>> getEvidenciasByOrden(int idOrden) async {
    return await (_db.select(_db.evidencias)
          ..where((e) => e.idOrden.equals(idOrden))
          ..orderBy([(e) => OrderingTerm.desc(e.fechaCaptura)]))
        .get();
  }

  /// Obtiene evidencias filtradas por tipo
  Future<List<Evidencia>> getEvidenciasByTipo(
    int idOrden,
    TipoEvidencia tipo,
  ) async {
    return await (_db.select(_db.evidencias)
          ..where(
            (e) =>
                e.idOrden.equals(idOrden) & e.tipoEvidencia.equals(tipo.name),
          )
          ..orderBy([(e) => OrderingTerm.desc(e.fechaCaptura)]))
        .get();
  }

  /// Cuenta evidencias por tipo
  Future<Map<TipoEvidencia, int>> contarEvidenciasPorTipo(int idOrden) async {
    final todas = await getEvidenciasByOrden(idOrden);
    final conteo = <TipoEvidencia, int>{};

    for (final tipo in TipoEvidencia.values) {
      conteo[tipo] = todas.where((e) => e.tipoEvidencia == tipo.name).length;
    }

    return conteo;
  }

  // ============================================================================
  // MODELO HÍBRIDO: EVIDENCIAS DE ACTIVIDAD
  // ============================================================================

  /// Obtiene la evidencia vinculada a una actividad específica (si existe)
  Future<Evidencia?> getEvidenciaByActividad(int idActividadEjecutada) async {
    return await (_db.select(_db.evidencias)
          ..where((e) => e.idActividadEjecutada.equals(idActividadEjecutada)))
        .getSingleOrNull();
  }

  /// Verifica si una actividad tiene evidencia asociada
  Future<bool> tieneEvidencia(int idActividadEjecutada) async {
    final evidencia = await getEvidenciaByActividad(idActividadEjecutada);
    return evidencia != null;
  }

  /// Obtiene mapa de actividades con evidencia (para UI reactiva)
  Future<Map<int, bool>> getMapaEvidenciasActividades(int idOrden) async {
    final evidencias = await getEvidenciasByOrden(idOrden);
    final mapa = <int, bool>{};

    for (final ev in evidencias) {
      if (ev.idActividadEjecutada != null) {
        mapa[ev.idActividadEjecutada!] = true;
      }
    }

    return mapa;
  }

  /// Obtiene solo evidencias generales (sin actividad vinculada)
  Future<List<Evidencia>> getEvidenciasGenerales(int idOrden) async {
    return await (_db.select(_db.evidencias)
          ..where(
            (e) => e.idOrden.equals(idOrden) & e.idActividadEjecutada.isNull(),
          )
          ..orderBy([(e) => OrderingTerm.desc(e.fechaCaptura)]))
        .get();
  }

  /// ✅ FIX FOTOS GENERALES: Cuenta solo evidencias generales por tipo
  Future<Map<TipoEvidencia, int>> contarEvidenciasGeneralesPorTipo(
    int idOrden,
  ) async {
    final generales = await getEvidenciasGenerales(idOrden);
    final conteo = <TipoEvidencia, int>{};

    for (final tipo in TipoEvidencia.values) {
      conteo[tipo] = generales
          .where((e) => e.tipoEvidencia == tipo.name)
          .length;
    }

    return conteo;
  }

  /// Obtiene evidencias de una actividad filtradas por tipo (ANTES/DURANTE/DESPUÉS)
  Future<List<Evidencia>> getEvidenciasByActividadYTipo(
    int idActividadEjecutada,
    TipoEvidencia tipo,
  ) async {
    return await (_db.select(_db.evidencias)
          ..where(
            (e) =>
                e.idActividadEjecutada.equals(idActividadEjecutada) &
                e.tipoEvidencia.equals(tipo.name),
          )
          ..orderBy([(e) => OrderingTerm.desc(e.fechaCaptura)]))
        .get();
  }

  /// Cuenta el total de evidencias vinculadas a una actividad
  Future<int> contarEvidenciasActividad(int idActividadEjecutada) async {
    final evidencias = await (_db.select(
      _db.evidencias,
    )..where((e) => e.idActividadEjecutada.equals(idActividadEjecutada))).get();
    return evidencias.length;
  }

  /// ✅ FIX RENDIMIENTO: Cuenta evidencias de MÚLTIPLES actividades en UNA query
  /// Retorna Map<idActividad, conteo>
  Future<Map<int, int>> contarEvidenciasBatch(Set<int> idsActividades) async {
    if (idsActividades.isEmpty) return {};

    // Una sola query que trae todas las evidencias relevantes
    final todasEvidencias = await (_db.select(
      _db.evidencias,
    )..where((e) => e.idActividadEjecutada.isNotNull())).get();

    // Agrupar y contar en memoria (mucho más rápido que N queries)
    final conteo = <int, int>{};
    for (final ev in todasEvidencias) {
      final idAct = ev.idActividadEjecutada;
      if (idAct != null && idsActividades.contains(idAct)) {
        conteo[idAct] = (conteo[idAct] ?? 0) + 1;
      }
    }
    return conteo;
  }

  // ============================================================================
  // ELIMINACIÓN DE EVIDENCIAS
  // ============================================================================

  /// Elimina una evidencia (registro BD + archivo físico)
  Future<bool> eliminarEvidencia(int idEvidencia) async {
    try {
      // 1. Obtener evidencia de BD
      final evidencia = await (_db.select(
        _db.evidencias,
      )..where((e) => e.idLocal.equals(idEvidencia))).getSingleOrNull();

      if (evidencia == null) return false;

      // 2. Eliminar archivo físico
      final archivo = File(evidencia.rutaLocal);
      if (await archivo.exists()) {
        await archivo.delete();
      }

      // 3. Eliminar registro de BD
      await (_db.delete(
        _db.evidencias,
      )..where((e) => e.idLocal.equals(idEvidencia))).go();

      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // ACTUALIZACIÓN DE DESCRIPCIÓN
  // ============================================================================

  /// Actualiza la descripción de una evidencia
  Future<bool> actualizarDescripcion(
    int idEvidencia,
    String descripcion,
  ) async {
    try {
      await (_db.update(
        _db.evidencias,
      )..where((e) => e.idLocal.equals(idEvidencia))).write(
        EvidenciasCompanion(
          descripcion: Value(descripcion),
          isDirty: const Value(true),
        ),
      );

      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // VERIFICACIÓN DE INTEGRIDAD
  // ============================================================================

  /// Verifica que todos los archivos de evidencias existan
  /// Útil para auditoría y debugging
  Future<Map<String, dynamic>> verificarIntegridad(int idOrden) async {
    final evidencias = await getEvidenciasByOrden(idOrden);
    int existentes = 0;
    int faltantes = 0;
    final archivosFaltantes = <String>[];

    for (final ev in evidencias) {
      final archivo = File(ev.rutaLocal);
      if (await archivo.exists()) {
        existentes++;
      } else {
        faltantes++;
        archivosFaltantes.add(ev.rutaLocal);
      }
    }

    return {
      'total': evidencias.length,
      'existentes': existentes,
      'faltantes': faltantes,
      'archivosFaltantes': archivosFaltantes,
      'integridadOK': faltantes == 0,
    };
  }
}
