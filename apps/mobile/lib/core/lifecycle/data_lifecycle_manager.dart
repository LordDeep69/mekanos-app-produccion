import 'dart:io';

import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../database/app_database.dart';
import '../database/database_service.dart';
import '../storage/storage_preferences.dart';

/// Provider para el servicio de ciclo de vida de datos
final dataLifecycleManagerProvider = Provider<DataLifecycleManager>((ref) {
  final db = ref.watch(databaseProvider);
  final prefs = ref.watch(storagePreferencesProvider);
  return DataLifecycleManager(db, prefs);
});

/// ============================================================================
/// ESTRATEGIA INTELIGENTE DE CICLO DE VIDA DE DATOS - MEKANOS MOBILE
/// ============================================================================
///
/// PROBLEMA RESUELTO:
/// - Sin esta estrategia, en 1 mes la app tendría +200 órdenes acumuladas
/// - Fotos/firmas ocuparían GB de espacio innecesario en el dispositivo
/// - La app se volvería lenta y poco responsive
///
/// FLUJO REAL MEKANOS (técnico de campo):
/// ADMIN asigna orden → TÉCNICO ejecuta → Completa → SE DESENTIENDE
///
/// El técnico NO necesita:
/// - Ver órdenes completadas de hace semanas/meses
/// - Conservar fotos locales después de sync exitoso a Cloudinary
/// - Mantener historial extenso de trabajos anteriores
///
/// POLÍTICAS DE RETENCIÓN:
/// ┌─────────────────────────────────────────────────────────────────────────┐
/// │ ENTIDAD              │ RETENCIÓN           │ CONDICIÓN                  │
/// ├─────────────────────────────────────────────────────────────────────────┤
/// │ Órdenes ACTIVAS      │ Indefinida          │ EN_PROCESO, ASIGNADA, etc  │
/// │ Órdenes COMPLETADAS  │ 7 días              │ Después de finalización    │
/// │ Órdenes POR_SUBIR    │ Indefinida          │ Hasta sync exitoso         │
/// │ Evidencias locales   │ 3 días post-sync    │ subida=true + 3 días       │
/// │ Firmas locales       │ 3 días post-sync    │ subida=true + 3 días       │
/// │ Máx órdenes historial│ 15 órdenes          │ Soft limit en UI           │
/// └─────────────────────────────────────────────────────────────────────────┘
///
/// ALGORITMO DE PRIORIZACIÓN (para listados):
/// 1. 🔴 URGENTES activas (prioridad máxima)
/// 2. 🟡 EN_PROCESO (trabajo en curso)
/// 3. 🟢 ASIGNADAS (próximas a ejecutar)
/// 4. 📤 POR_SUBIR (pendientes de sync offline)
/// 5. ✅ COMPLETADAS últimos 7 días (solo historial reciente)
///
/// TRIGGERS DE LIMPIEZA:
/// - Al abrir la app (onAppResume)
/// - Después de sync exitoso
/// - Al cerrar sesión (limpieza total opcional)
/// - Manual desde configuración
///
/// SEGURIDAD (Zero Trust):
/// - NUNCA purgar órdenes con isDirty=true
/// - NUNCA purgar órdenes en cola de sync pendiente
/// - NUNCA eliminar archivos sin verificar sync exitoso
/// - Logging detallado de cada purga para auditoría

class DataLifecycleManager {
  final AppDatabase _db;
  final StoragePreferences _prefs;

  // ============================================================================
  // CONFIGURACIÓN DE POLÍTICAS (valores por defecto, se actualizan desde prefs)
  // ============================================================================

  /// Días de retención para órdenes completadas (default, se lee de prefs)
  int _diasRetencionCompletadas = 7;

  /// Días de retención para archivos multimedia después de sync (default, se lee de prefs)
  int _diasRetencionArchivosPostSync = 3;

  /// Máximo de órdenes en historial (soft limit para UI)
  int _maxOrdenesHistorial = 15;

  /// Si la limpieza automática está activa
  bool _limpiezaAutomaticaActiva = true;

  // Getters para acceso externo
  int get diasRetencionCompletadas => _diasRetencionCompletadas;
  int get diasRetencionArchivosPostSync => _diasRetencionArchivosPostSync;
  int get maxOrdenesHistorial => _maxOrdenesHistorial;
  bool get limpiezaAutomaticaActiva => _limpiezaAutomaticaActiva;

  /// Estados considerados "finales" (candidatos a purga)
  static const List<String> estadosFinales = [
    'COMPLETADA',
    'CERRADA',
    'CANCELADA',
    'FINALIZADA',
    'APROBADA',
  ];

  /// Estados que NUNCA se deben purgar
  static const List<String> estadosProtegidos = [
    'EN_PROCESO',
    'ASIGNADA',
    'PROGRAMADA',
    'EN_ESPERA_REPUESTO',
    'POR_SUBIR',
  ];

  DataLifecycleManager(this._db, this._prefs);

  /// Carga las preferencias del usuario antes de ejecutar limpieza
  Future<void> _cargarPreferencias() async {
    final data = await _prefs.cargarPreferencias();
    _diasRetencionCompletadas = data.diasRetencionCompletadas;
    _diasRetencionArchivosPostSync = data.diasRetencionArchivos;
    _maxOrdenesHistorial = data.maxOrdenesHistorial;
    _limpiezaAutomaticaActiva = data.limpiezaAutomaticaActiva;

    debugPrint('📋 [LIFECYCLE] Preferencias cargadas:');
    debugPrint('   - Retención órdenes: $_diasRetencionCompletadas días');
    debugPrint('   - Retención archivos: $_diasRetencionArchivosPostSync días');
    debugPrint('   - Máx historial: $_maxOrdenesHistorial órdenes');
    debugPrint('   - Limpieza automática: $_limpiezaAutomaticaActiva');
  }

  // ============================================================================
  // MÉTODO PRINCIPAL: Limpieza Inteligente Completa
  // ============================================================================

  /// Ejecuta limpieza inteligente de datos obsoletos.
  ///
  /// Retorna un [PurgeResult] con estadísticas de la limpieza.
  ///
  /// SEGURIDAD: Este método NUNCA elimina datos que no hayan sido sincronizados.
  Future<PurgeResult> ejecutarLimpiezaInteligente() async {
    debugPrint('🧹 [LIFECYCLE] Iniciando limpieza inteligente de datos...');

    // ✅ FIX 06-ENE-2026: Cargar preferencias del usuario antes de limpiar
    await _cargarPreferencias();

    final resultado = PurgeResult();
    final stopwatch = Stopwatch()..start();

    try {
      // 1. Purgar evidencias ya sincronizadas (liberar espacio)
      resultado.evidenciasPurgadas = await purgarEvidenciasSincronizadas();

      // 2. Purgar firmas ya sincronizadas
      resultado.firmasPurgadas = await purgarFirmasSincronizadas();

      // 3. Purgar órdenes antiguas completadas
      resultado.ordenesPurgadas = await purgarOrdenesAntiguas();

      // 4. Limpiar datos huérfanos (actividades/mediciones de órdenes eliminadas)
      resultado.datosHuerfanosPurgados = await purgarDatosHuerfanos();

      stopwatch.stop();
      resultado.duracionMs = stopwatch.elapsedMilliseconds;
      resultado.success = true;

      debugPrint(
        '✅ [LIFECYCLE] Limpieza completada en ${resultado.duracionMs}ms:',
      );
      debugPrint('   📸 Evidencias purgadas: ${resultado.evidenciasPurgadas}');
      debugPrint('   ✍️ Firmas purgadas: ${resultado.firmasPurgadas}');
      debugPrint('   📋 Órdenes purgadas: ${resultado.ordenesPurgadas}');
      debugPrint('   🗑️ Datos huérfanos: ${resultado.datosHuerfanosPurgados}');
      debugPrint(
        '   💾 Espacio liberado: ${resultado.espacioLiberadoMB.toStringAsFixed(2)} MB',
      );
    } catch (e, stack) {
      resultado.success = false;
      resultado.error = e.toString();
      debugPrint('❌ [LIFECYCLE] Error en limpieza: $e');
      debugPrint('$stack');
    }

    return resultado;
  }

  // ============================================================================
  // PURGA DE EVIDENCIAS SINCRONIZADAS
  // ============================================================================

  /// Elimina archivos de evidencias que ya fueron sincronizadas a Cloudinary.
  ///
  /// Política:
  /// - Solo elimina si subida=true (ya está en Cloudinary)
  /// - Solo elimina si han pasado [diasRetencionArchivosPostSync] días
  /// - Preserva la URL remota en la BD para referencia
  /// - Elimina solo el archivo local, no el registro en BD
  Future<int> purgarEvidenciasSincronizadas() async {
    final fechaLimite = DateTime.now().subtract(
      Duration(days: diasRetencionArchivosPostSync),
    );

    // Obtener evidencias sincronizadas hace más de X días
    final evidencias =
        await (_db.select(_db.evidencias)
              ..where((e) => e.subida.equals(true))
              ..where((e) => e.lastSyncedAt.isSmallerOrEqualValue(fechaLimite)))
            .get();

    int eliminadas = 0;
    int bytesLiberados = 0;

    for (final ev in evidencias) {
      // Verificar que tiene URL remota (seguridad)
      if (ev.urlRemota == null || ev.urlRemota!.isEmpty) {
        debugPrint(
          '⚠️ [LIFECYCLE] Evidencia ${ev.idLocal} sin URL remota, saltando',
        );
        continue;
      }

      // Verificar que el archivo local existe
      final archivo = File(ev.rutaLocal);
      if (await archivo.exists()) {
        try {
          final fileSize = await archivo.length();
          await archivo.delete();
          bytesLiberados += fileSize;
          eliminadas++;

          debugPrint(
            '🗑️ [LIFECYCLE] Eliminada evidencia local: ${ev.rutaLocal}',
          );
        } catch (e) {
          debugPrint('⚠️ [LIFECYCLE] Error eliminando ${ev.rutaLocal}: $e');
        }
      }
    }

    _espacioLiberadoBytes += bytesLiberados;
    return eliminadas;
  }

  // ============================================================================
  // PURGA DE FIRMAS SINCRONIZADAS
  // ============================================================================

  /// Elimina archivos de firmas que ya fueron sincronizadas.
  /// Misma lógica que evidencias.
  Future<int> purgarFirmasSincronizadas() async {
    final fechaLimite = DateTime.now().subtract(
      Duration(days: diasRetencionArchivosPostSync),
    );

    final firmas =
        await (_db.select(_db.firmas)
              ..where((f) => f.subida.equals(true))
              ..where((f) => f.lastSyncedAt.isSmallerOrEqualValue(fechaLimite)))
            .get();

    int eliminadas = 0;
    int bytesLiberados = 0;

    for (final firma in firmas) {
      if (firma.urlRemota == null || firma.urlRemota!.isEmpty) {
        continue;
      }

      final archivo = File(firma.rutaLocal);
      if (await archivo.exists()) {
        try {
          final fileSize = await archivo.length();
          await archivo.delete();
          bytesLiberados += fileSize;
          eliminadas++;
        } catch (e) {
          debugPrint('⚠️ [LIFECYCLE] Error eliminando firma: $e');
        }
      }
    }

    _espacioLiberadoBytes += bytesLiberados;
    return eliminadas;
  }

  // ============================================================================
  // PURGA DE ÓRDENES ANTIGUAS
  // ============================================================================

  /// Elimina órdenes completadas más antiguas que [diasRetencionCompletadas].
  ///
  /// SEGURIDAD ZERO TRUST:
  /// - NUNCA purga órdenes con isDirty=true
  /// - NUNCA purga órdenes en cola de sync pendiente
  /// - Solo purga estados finales (COMPLETADA, CERRADA, etc.)
  Future<int> purgarOrdenesAntiguas() async {
    final fechaLimite = DateTime.now().subtract(
      Duration(days: diasRetencionCompletadas),
    );

    // Obtener IDs de estados finales
    final estadosFinalesIds = await _getEstadosFinalesIds();
    if (estadosFinalesIds.isEmpty) {
      debugPrint('⚠️ [LIFECYCLE] No se encontraron estados finales');
      return 0;
    }

    // Obtener órdenes candidatas a purga
    final ordenesCandidatas =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.isIn(estadosFinalesIds))
              ..where((o) => o.isDirty.equals(false)) // NUNCA dirty
              ..where((o) => o.fechaFin.isSmallerOrEqualValue(fechaLimite)))
            .get();

    debugPrint(
      '🔍 [LIFECYCLE] Encontradas ${ordenesCandidatas.length} órdenes candidatas a purga',
    );

    int purgadas = 0;

    for (final orden in ordenesCandidatas) {
      // Verificación adicional: no debe estar en cola de sync
      final enColaPendiente = await _db.existeOrdenEnColaPendiente(
        orden.idLocal,
      );
      if (enColaPendiente) {
        debugPrint(
          '🛡️ [LIFECYCLE] Orden ${orden.numeroOrden} en cola pendiente, protegida',
        );
        continue;
      }

      // Verificar que es seguro purgar
      final esSeguro = await esSeguroPurgar(orden.idLocal);
      if (!esSeguro) {
        debugPrint(
          '🛡️ [LIFECYCLE] Orden ${orden.numeroOrden} no es seguro purgar',
        );
        continue;
      }

      // Purgar orden y sus datos relacionados
      await _purgarOrdenCompleta(orden.idLocal);
      purgadas++;

      debugPrint(
        '🗑️ [LIFECYCLE] Purgada orden ${orden.numeroOrden} (completada hace ${DateTime.now().difference(orden.fechaFin!).inDays} días)',
      );
    }

    return purgadas;
  }

  // ============================================================================
  // PURGA DE DATOS HUÉRFANOS
  // ============================================================================

  /// Limpia actividades, mediciones y evidencias sin orden asociada.
  /// Esto puede ocurrir si hubo errores durante purgas anteriores.
  Future<int> purgarDatosHuerfanos() async {
    int eliminados = 0;

    // Obtener IDs de órdenes existentes
    final ordenes = await _db.getAllOrdenes();
    final ordenesIds = ordenes.map((o) => o.idLocal).toSet();

    // Purgar actividades huérfanas
    final actividades = await _db.select(_db.actividadesEjecutadas).get();
    for (final act in actividades) {
      if (!ordenesIds.contains(act.idOrden)) {
        await (_db.delete(
          _db.actividadesEjecutadas,
        )..where((a) => a.idLocal.equals(act.idLocal))).go();
        eliminados++;
      }
    }

    // Purgar mediciones huérfanas
    final mediciones = await _db.select(_db.mediciones).get();
    for (final med in mediciones) {
      if (!ordenesIds.contains(med.idOrden)) {
        await (_db.delete(
          _db.mediciones,
        )..where((m) => m.idLocal.equals(med.idLocal))).go();
        eliminados++;
      }
    }

    // Purgar evidencias huérfanas (archivo + registro)
    final evidencias = await _db.select(_db.evidencias).get();
    for (final ev in evidencias) {
      if (!ordenesIds.contains(ev.idOrden)) {
        // Eliminar archivo si existe
        final archivo = File(ev.rutaLocal);
        if (await archivo.exists()) {
          try {
            final fileSize = await archivo.length();
            await archivo.delete();
            _espacioLiberadoBytes += fileSize;
          } catch (_) {}
        }
        // Eliminar registro
        await (_db.delete(
          _db.evidencias,
        )..where((e) => e.idLocal.equals(ev.idLocal))).go();
        eliminados++;
      }
    }

    // Purgar firmas huérfanas
    final firmas = await _db.select(_db.firmas).get();
    for (final firma in firmas) {
      if (!ordenesIds.contains(firma.idOrden)) {
        final archivo = File(firma.rutaLocal);
        if (await archivo.exists()) {
          try {
            final fileSize = await archivo.length();
            await archivo.delete();
            _espacioLiberadoBytes += fileSize;
          } catch (_) {}
        }
        await (_db.delete(
          _db.firmas,
        )..where((f) => f.idLocal.equals(firma.idLocal))).go();
        eliminados++;
      }
    }

    return eliminados;
  }

  // ============================================================================
  // VERIFICACIÓN DE SEGURIDAD
  // ============================================================================

  /// Verifica si es seguro purgar una orden.
  ///
  /// Retorna false si:
  /// - La orden tiene isDirty=true
  /// - La orden está en cola de sync pendiente
  /// - La orden tiene evidencias no sincronizadas
  /// - La orden tiene firmas no sincronizadas
  Future<bool> esSeguroPurgar(int idOrdenLocal) async {
    // 1. Verificar isDirty
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null) return true; // Ya no existe
    if (orden.isDirty) return false;

    // 2. Verificar cola de sync
    final enCola = await _db.existeOrdenEnColaPendiente(idOrdenLocal);
    if (enCola) return false;

    // 3. Verificar evidencias no sincronizadas
    final evidencias = await _db.getEvidenciasByOrden(idOrdenLocal);
    final evidenciasNoSync = evidencias.where((e) => !e.subida).toList();
    if (evidenciasNoSync.isNotEmpty) return false;

    // 4. Verificar firmas no sincronizadas
    final firmas = await _db.getFirmasByOrden(idOrdenLocal);
    final firmasNoSync = firmas.where((f) => !f.subida).toList();
    if (firmasNoSync.isNotEmpty) return false;

    return true;
  }

  // ============================================================================
  // MÉTODOS DE CONSULTA PARA UI
  // ============================================================================

  /// Obtiene órdenes priorizadas para mostrar en UI.
  /// Implementa el algoritmo de priorización inteligente.
  Future<List<Ordene>> getOrdenesPriorizadas({int limite = 20}) async {
    final estadosMap = await _getEstadosCodigoMap();

    // Obtener todas las órdenes
    final todasOrdenes = await _db.getAllOrdenes();

    // Separar por categoría
    final urgentes = <Ordene>[];
    final enProceso = <Ordene>[];
    final asignadas = <Ordene>[];
    final porSubir = <Ordene>[];
    final completadas = <Ordene>[];
    final otras = <Ordene>[];

    for (final orden in todasOrdenes) {
      final codigoEstado = estadosMap[orden.idEstado] ?? '';

      if (orden.prioridad == 'URGENTE' &&
          !estadosFinales.contains(codigoEstado)) {
        urgentes.add(orden);
      } else if (codigoEstado == 'EN_PROCESO') {
        enProceso.add(orden);
      } else if (codigoEstado == 'ASIGNADA' || codigoEstado == 'PROGRAMADA') {
        asignadas.add(orden);
      } else if (codigoEstado == 'POR_SUBIR') {
        porSubir.add(orden);
      } else if (estadosFinales.contains(codigoEstado)) {
        completadas.add(orden);
      } else {
        otras.add(orden);
      }
    }

    // Ordenar completadas por fecha (más recientes primero)
    completadas.sort(
      (a, b) => (b.fechaFin ?? DateTime(1970)).compareTo(
        a.fechaFin ?? DateTime(1970),
      ),
    );

    // Construir lista priorizada
    final resultado = <Ordene>[];
    resultado.addAll(urgentes);
    resultado.addAll(enProceso);
    resultado.addAll(asignadas);
    resultado.addAll(porSubir);
    resultado.addAll(otras);
    resultado.addAll(
      completadas.take(maxOrdenesHistorial),
    ); // Limitar historial

    return resultado.take(limite).toList();
  }

  /// Obtiene estadísticas de uso de espacio
  Future<StorageStats> getStorageStats() async {
    final stats = StorageStats();

    // Contar registros
    stats.totalOrdenes = (await _db.getAllOrdenes()).length;
    stats.totalEvidencias = (await _db.select(_db.evidencias).get()).length;
    stats.totalFirmas = (await _db.select(_db.firmas).get()).length;

    // Calcular espacio de archivos
    final evidencias = await _db.select(_db.evidencias).get();
    for (final ev in evidencias) {
      final archivo = File(ev.rutaLocal);
      if (await archivo.exists()) {
        stats.espacioEvidenciasMB += (await archivo.length()) / (1024 * 1024);
      }
    }

    final firmas = await _db.select(_db.firmas).get();
    for (final firma in firmas) {
      final archivo = File(firma.rutaLocal);
      if (await archivo.exists()) {
        stats.espacioFirmasMB += (await archivo.length()) / (1024 * 1024);
      }
    }

    // Espacio de BD
    final dbFolder = await getApplicationDocumentsDirectory();
    final dbFile = File('${dbFolder.path}/mekanos_local.db');
    if (await dbFile.exists()) {
      stats.espacioBDMB = (await dbFile.length()) / (1024 * 1024);
    }

    stats.espacioTotalMB =
        stats.espacioEvidenciasMB + stats.espacioFirmasMB + stats.espacioBDMB;

    return stats;
  }

  // ============================================================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================================================

  int _espacioLiberadoBytes = 0;

  Future<List<int>> _getEstadosFinalesIds() async {
    final estados = await _db.getAllEstadosOrden();
    return estados
        .where((e) => estadosFinales.contains(e.codigo.toUpperCase()))
        .map((e) => e.id)
        .toList();
  }

  Future<Map<int, String>> _getEstadosCodigoMap() async {
    final estados = await _db.getAllEstadosOrden();
    return {for (var e in estados) e.id: e.codigo};
  }

  /// Purga una orden y todos sus datos relacionados
  Future<void> _purgarOrdenCompleta(int idOrdenLocal) async {
    await _db.transaction(() async {
      // 1. Eliminar archivos de evidencias
      final evidencias = await _db.getEvidenciasByOrden(idOrdenLocal);
      for (final ev in evidencias) {
        final archivo = File(ev.rutaLocal);
        if (await archivo.exists()) {
          try {
            final fileSize = await archivo.length();
            await archivo.delete();
            _espacioLiberadoBytes += fileSize;
          } catch (_) {}
        }
      }

      // 2. Eliminar archivos de firmas
      final firmas = await _db.getFirmasByOrden(idOrdenLocal);
      for (final firma in firmas) {
        final archivo = File(firma.rutaLocal);
        if (await archivo.exists()) {
          try {
            final fileSize = await archivo.length();
            await archivo.delete();
            _espacioLiberadoBytes += fileSize;
          } catch (_) {}
        }
      }

      // 3. Eliminar registros de BD (en orden por FK)
      await (_db.delete(
        _db.evidencias,
      )..where((e) => e.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.firmas,
      )..where((f) => f.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.mediciones,
      )..where((m) => m.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.actividadesEjecutadas,
      )..where((a) => a.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.actividadesPlan,
      )..where((p) => p.idOrden.equals(idOrdenLocal))).go();

      await (_db.delete(
        _db.ordenes,
      )..where((o) => o.idLocal.equals(idOrdenLocal))).go();
    });
  }
}

// ============================================================================
// DTOs DE RESULTADO
// ============================================================================

/// Resultado de una operación de purga
class PurgeResult {
  bool success = false;
  String? error;
  int evidenciasPurgadas = 0;
  int firmasPurgadas = 0;
  int ordenesPurgadas = 0;
  int datosHuerfanosPurgados = 0;
  int duracionMs = 0;

  double get espacioLiberadoMB =>
      (evidenciasPurgadas * 0.5) + (firmasPurgadas * 0.1); // Estimación

  int get totalPurgado =>
      evidenciasPurgadas +
      firmasPurgadas +
      ordenesPurgadas +
      datosHuerfanosPurgados;

  bool get tuvoCambios => totalPurgado > 0;
}

/// Estadísticas de uso de almacenamiento
class StorageStats {
  int totalOrdenes = 0;
  int totalEvidencias = 0;
  int totalFirmas = 0;
  double espacioEvidenciasMB = 0;
  double espacioFirmasMB = 0;
  double espacioBDMB = 0;
  double espacioTotalMB = 0;

  String get espacioFormateado {
    if (espacioTotalMB < 1) {
      return '${(espacioTotalMB * 1024).toStringAsFixed(0)} KB';
    }
    return '${espacioTotalMB.toStringAsFixed(1)} MB';
  }
}
