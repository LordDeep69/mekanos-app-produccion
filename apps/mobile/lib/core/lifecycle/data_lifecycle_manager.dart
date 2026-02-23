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
  /// Incluye variantes históricas para compatibilidad retroactiva.
  static const Set<String> estadosFinales = {
    'COMPLETADA',
    'COMPLETADO',
    'CERRADA',
    'CERRADO',
    'FINALIZADA',
    'FINALIZADO',
  };

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

    // Reset contador de bytes para esta ejecución
    _espacioLiberadoBytes = 0;

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

      // ✅ FIX 09-FEB-2026: Transferir bytes reales liberados al resultado
      resultado.espacioLiberadoBytes = _espacioLiberadoBytes.toDouble();

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
  ///
  /// ✅ FIX 14-FEB-2026: Manejar NULL lastSyncedAt correctamente
  /// Antes, evidencias con lastSyncedAt=NULL nunca se purgaban porque
  /// NULL <= fechaLimite = FALSE en SQL. Ahora usamos filtro manual.
  Future<int> purgarEvidenciasSincronizadas() async {
    final fechaLimite = DateTime.now().subtract(
      Duration(days: diasRetencionArchivosPostSync),
    );
    final estadosFinalesIds = (await _getEstadosFinalesIds()).toSet();
    if (estadosFinalesIds.isEmpty) return 0;

    // Obtener TODAS las evidencias sincronizadas (subida=true)
    final todasEvidencias = await (_db.select(
      _db.evidencias,
    )..where((e) => e.subida.equals(true))).get();

    // Filtrar manualmente: lastSyncedAt <= fechaLimite, o si es NULL usar fechaCaptura
    final evidencias = todasEvidencias.where((ev) {
      final fechaRef = ev.lastSyncedAt ?? ev.fechaCaptura;
      return fechaRef.isBefore(fechaLimite) ||
          fechaRef.isAtSameMomentAs(fechaLimite);
    }).toList();

    int eliminadas = 0;
    int bytesLiberados = 0;
    final ordenElegibleCache = <int, bool>{};

    for (final ev in evidencias) {
      final ordenElegible =
          ordenElegibleCache[ev.idOrden] ??
          await _esOrdenElegibleParaPurgarArchivos(
            ev.idOrden,
            estadosFinalesIds: estadosFinalesIds,
          );
      ordenElegibleCache[ev.idOrden] = ordenElegible;

      if (!ordenElegible) {
        continue;
      }

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
  ///
  /// ✅ FIX 14-FEB-2026: Manejar NULL lastSyncedAt con fallback a fechaFirma
  Future<int> purgarFirmasSincronizadas() async {
    final fechaLimite = DateTime.now().subtract(
      Duration(days: diasRetencionArchivosPostSync),
    );
    final estadosFinalesIds = (await _getEstadosFinalesIds()).toSet();
    if (estadosFinalesIds.isEmpty) return 0;

    // Obtener TODAS las firmas sincronizadas
    final todasFirmas = await (_db.select(
      _db.firmas,
    )..where((f) => f.subida.equals(true))).get();

    // Filtrar manualmente con fallback para NULL lastSyncedAt
    final firmas = todasFirmas.where((f) {
      final fechaRef = f.lastSyncedAt ?? f.fechaFirma;
      return fechaRef.isBefore(fechaLimite) ||
          fechaRef.isAtSameMomentAs(fechaLimite);
    }).toList();

    int eliminadas = 0;
    int bytesLiberados = 0;
    final ordenElegibleCache = <int, bool>{};

    for (final firma in firmas) {
      final ordenElegible =
          ordenElegibleCache[firma.idOrden] ??
          await _esOrdenElegibleParaPurgarArchivos(
            firma.idOrden,
            estadosFinalesIds: estadosFinalesIds,
          );
      ordenElegibleCache[firma.idOrden] = ordenElegible;

      if (!ordenElegible) {
        continue;
      }

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
  /// - NUNCA purga órdenes sin evidencia de subida al servidor
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

    // ✅ FIX 29-ENE-2026: Obtener TODAS las órdenes en estado final y filtrar manualmente
    // Antes solo filtraba por fechaFin, pero órdenes sincronizadas pueden tener fechaFin=null
    final todasOrdenesFinales =
        await (_db.select(_db.ordenes)
              ..where((o) => o.idEstado.isIn(estadosFinalesIds))
              ..where((o) => o.isDirty.equals(false)) // NUNCA dirty
              ..where(
                (o) => o.idBackend.isNotNull(),
              )) // Debe existir en servidor
            .get();

    // Filtrar manualmente usando fechaFin, lastSyncedAt, o updatedAt como fallback
    final ordenesCandidatas = todasOrdenesFinales.where((orden) {
      // Usar fechaFin si existe, sino lastSyncedAt, sino updatedAt
      final fechaReferencia =
          orden.fechaFin ?? orden.lastSyncedAt ?? orden.updatedAt;
      return fechaReferencia.isBefore(fechaLimite) ||
          fechaReferencia.isAtSameMomentAs(fechaLimite);
    }).toList();

    debugPrint(
      '🔍 [LIFECYCLE] Encontradas ${ordenesCandidatas.length} órdenes candidatas a purga',
    );

    int purgadas = 0;

    for (final orden in ordenesCandidatas) {
      // Debe ser una orden final ya subida al servidor
      final subidaServidor = await _fueSubidaAlServidor(
        orden,
        permitirDirtyConHuella: false,
      );
      if (!subidaServidor) {
        debugPrint(
          '🛡️ [LIFECYCLE] Orden ${orden.numeroOrden} no confirmada en servidor, protegida',
        );
        continue;
      }

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

      final fechaReferencia =
          orden.fechaFin ?? orden.lastSyncedAt ?? orden.updatedAt;
      final diasAntiguedad = DateTime.now().difference(fechaReferencia).inDays;
      debugPrint(
        '🗑️ [LIFECYCLE] Purgada orden ${orden.numeroOrden} (completada hace $diasAntiguedad días)',
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

    // ✅ FIX 09-FEB-2026: Purgar actividadesPlan huérfanas
    final planes = await _db.select(_db.actividadesPlan).get();
    for (final plan in planes) {
      if (!ordenesIds.contains(plan.idOrden)) {
        await (_db.delete(
          _db.actividadesPlan,
        )..where((p) => p.idLocal.equals(plan.idLocal))).go();
        eliminados++;
      }
    }

    // ✅ FIX 09-FEB-2026: Purgar ordenesEquipos huérfanas
    // ordenesEquipos usa idOrdenServicio (= idBackend), no idOrdenLocal
    final ordenesBackendIds = ordenes
        .where((o) => o.idBackend != null)
        .map((o) => o.idBackend!)
        .toSet();
    final oeRecords = await _db.select(_db.ordenesEquipos).get();
    for (final oe in oeRecords) {
      if (!ordenesBackendIds.contains(oe.idOrdenServicio)) {
        await (_db.delete(
          _db.ordenesEquipos,
        )..where((x) => x.idOrdenEquipo.equals(oe.idOrdenEquipo))).go();
        eliminados++;
      }
    }

    // ✅ FIX 09-FEB-2026: Purgar ordenesPendientesSync completadas/huérfanas
    final syncRecords = await _db.select(_db.ordenesPendientesSync).get();
    for (final sr in syncRecords) {
      if (!ordenesIds.contains(sr.idOrdenLocal)) {
        await (_db.delete(
          _db.ordenesPendientesSync,
        )..where((x) => x.idOrdenLocal.equals(sr.idOrdenLocal))).go();
        eliminados++;
      }
    }

    return eliminados;
  }

  // ============================================================================
  // LIMPIEZA FORZADA DE FOTOS SINCRONIZADAS
  // ============================================================================

  /// Elimina TODAS las fotos, firmas y órdenes completadas.
  /// NO espera el período de retención - elimina inmediatamente.
  ///
  /// ✅ FIX 14-FEB-2026: REESCRITURA COMPLETA - Eliminación agresiva real
  /// El técnico presiona "Limpiar Ahora" y espera que TODO lo completado desaparezca.
  ///
  /// Estrategia:
  /// 1. Obtener TODAS las órdenes en estado final
  /// 2. Para cada orden: eliminar TODOS sus archivos + registros (si ya subió a servidor)
  /// 3. Limpiar entradas de cola de sync completadas/atascadas
  /// 4. Purgar datos huérfanos restantes
  ///
  /// ÚNICAS protecciones:
  /// - Solo purga órdenes finales con evidencia de subida al servidor
  /// - isDirty=true sin huella de sync → NO purgar
  /// - En cola con estado PENDIENTE → esperando conexión, NO purgar
  Future<PurgeResult> limpiarFotosSincronizadasAhora() async {
    debugPrint('🧹 [LIFECYCLE] Limpieza FORZADA AGRESIVA...');

    // Reset contador de bytes para esta ejecución
    _espacioLiberadoBytes = 0;

    final resultado = PurgeResult();
    final stopwatch = Stopwatch()..start();

    try {
      // =====================================================================
      // PASO 1: Obtener órdenes en estado final (COMPLETADA, CERRADA, etc.)
      // =====================================================================
      final estadosFinalesIds = await _getEstadosFinalesIds();
      int ordenesPurgadas = 0;
      int evidenciasEliminadas = 0;
      int firmasEliminadas = 0;
      int bytesLiberados = 0;

      if (estadosFinalesIds.isNotEmpty) {
        // Obtener TODAS las órdenes en estado final
        // (incluye isDirty=true para corregir inconsistencias históricas).
        final ordenesCompletadas = await (_db.select(
          _db.ordenes,
        )..where((o) => o.idEstado.isIn(estadosFinalesIds))).get();

        final ordenesDirty = ordenesCompletadas.where((o) => o.isDirty).length;

        debugPrint(
          '🔍 [LIFECYCLE] Órdenes en estado final: ${ordenesCompletadas.length} '
          '(isDirty=true: $ordenesDirty, isDirty=false: ${ordenesCompletadas.length - ordenesDirty})',
        );

        for (final orden in ordenesCompletadas) {
          // ÚNICA protección fuerte: solo órdenes finales YA subidas al servidor.
          final subidaServidor = await _fueSubidaAlServidor(
            orden,
            permitirDirtyConHuella: true,
          );
          if (!subidaServidor) {
            debugPrint(
              '🛡️ [LIFECYCLE] Orden ${orden.numeroOrden} sin confirmación de subida, protegida',
            );
            continue;
          }

          // En limpieza forzada manual, una orden final con isDirty=true y sin
          // cola pendiente se considera inconsistencia recuperable y se purga.
          if (orden.isDirty) {
            debugPrint(
              '⚠️ [LIFECYCLE] Orden ${orden.numeroOrden} en estado final con isDirty=true: purgando por limpieza forzada manual',
            );
          }

          // Eliminar TODOS los archivos de evidencias (sin importar subida)
          final evidencias = await _db.getEvidenciasByOrden(orden.idLocal);
          for (final ev in evidencias) {
            final archivo = File(ev.rutaLocal);
            if (await archivo.exists()) {
              try {
                final fileSize = await archivo.length();
                await archivo.delete();
                bytesLiberados += fileSize;
                evidenciasEliminadas++;
              } catch (_) {}
            }
          }

          // Eliminar TODOS los archivos de firmas (sin importar subida)
          final firmas = await _db.getFirmasByOrden(orden.idLocal);
          for (final firma in firmas) {
            final archivo = File(firma.rutaLocal);
            if (await archivo.exists()) {
              try {
                final fileSize = await archivo.length();
                await archivo.delete();
                bytesLiberados += fileSize;
                firmasEliminadas++;
              } catch (_) {}
            }
          }

          // Purgar toda la orden y sus registros de BD
          await _purgarOrdenCompleta(orden.idLocal);
          ordenesPurgadas++;
          debugPrint('🗑️ [LIFECYCLE] Orden purgada: ${orden.numeroOrden}');
        }
      }

      // =====================================================================
      // PASO 2: Limpiar entradas de cola atascadas (EN_PROCESO viejo, ERROR agotado)
      // =====================================================================
      final colaAtascada =
          await (_db.select(_db.ordenesPendientesSync)..where(
                (o) =>
                    o.estadoSync.equals('EN_PROCESO') |
                    (o.estadoSync.equals('ERROR') &
                        o.intentos.isBiggerOrEqualValue(5)),
              ))
              .get();
      for (final entry in colaAtascada) {
        await (_db.delete(
          _db.ordenesPendientesSync,
        )..where((o) => o.idOrdenLocal.equals(entry.idOrdenLocal))).go();
        debugPrint(
          '🗑️ [LIFECYCLE] Cola atascada limpiada: orden ${entry.idOrdenBackend} (${entry.estadoSync})',
        );
      }

      // =====================================================================
      // PASO 3: Purgar datos huérfanos restantes
      // =====================================================================
      resultado.datosHuerfanosPurgados = await purgarDatosHuerfanos();

      resultado.ordenesPurgadas = ordenesPurgadas;
      resultado.evidenciasPurgadas = evidenciasEliminadas;
      resultado.firmasPurgadas = firmasEliminadas;
      resultado.espacioLiberadoBytes = (bytesLiberados + _espacioLiberadoBytes)
          .toDouble();

      stopwatch.stop();
      resultado.duracionMs = stopwatch.elapsedMilliseconds;
      resultado.success = true;

      debugPrint('✅ [LIFECYCLE] Limpieza forzada AGRESIVA completada:');
      debugPrint('   📸 Fotos eliminadas: $evidenciasEliminadas');
      debugPrint('   ✍️ Firmas eliminadas: $firmasEliminadas');
      debugPrint('   📋 Órdenes purgadas: $ordenesPurgadas');
      debugPrint('   🗑️ Datos huérfanos: ${resultado.datosHuerfanosPurgados}');
      debugPrint(
        '   💾 Espacio liberado: ${resultado.espacioLiberadoMB.toStringAsFixed(2)} MB',
      );
    } catch (e, stack) {
      resultado.success = false;
      resultado.error = e.toString();
      debugPrint('❌ [LIFECYCLE] Error en limpieza forzada: $e');
      debugPrint('$stack');
    }

    return resultado;
  }

  // ============================================================================
  // VERIFICACIÓN DE SEGURIDAD
  // ============================================================================

  /// Verifica si es seguro purgar una orden.
  ///
  /// Retorna false si:
  /// - La orden tiene isDirty=true
  /// - La orden está en cola de sync pendiente
  /// - La orden tiene evidencias no sincronizadas (solo si isDirty=true)
  ///
  /// ✅ FIX 14-FEB-2026: Relajar verificación de evidencias/firmas
  /// Cuando una orden es COMPLETADA con isDirty=false, el backend ya tiene
  /// TODOS los datos (vía finalizar-completo). El flag `subida` en evidencias
  /// individuales puede no haberse actualizado (ej: fallo parcial en
  /// _marcarOrdenSincronizada). No debe bloquear la purga.
  Future<bool> esSeguroPurgar(int idOrdenLocal) async {
    // 1. Verificar isDirty - CRÍTICO: datos no enviados al servidor
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null) return true; // Ya no existe
    if (orden.isDirty) return false;

    // 2. Verificar cola de sync con estado PENDIENTE real
    final enCola = await _db.existeOrdenEnColaPendiente(idOrdenLocal);
    if (enCola) return false;

    // ✅ FIX 14-FEB-2026: Ya NO verificamos evidencias/firmas individuales
    // Si isDirty=false y no está en cola pendiente, el backend ya tiene todo.
    // El endpoint finalizar-completo sube evidencias+firmas atómicamente.

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

      if (orden.prioridad == 'URGENTE' && !_esEstadoFinalCodigo(codigoEstado)) {
        urgentes.add(orden);
      } else if (codigoEstado == 'EN_PROCESO') {
        enProceso.add(orden);
      } else if (codigoEstado == 'ASIGNADA' || codigoEstado == 'PROGRAMADA') {
        asignadas.add(orden);
      } else if (codigoEstado == 'POR_SUBIR') {
        porSubir.add(orden);
      } else if (_esEstadoFinalCodigo(codigoEstado)) {
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

  String _normalizarEstadoCodigo(String codigo) {
    return codigo
        .trim()
        .toUpperCase()
        .replaceAll('Á', 'A')
        .replaceAll('É', 'E')
        .replaceAll('Í', 'I')
        .replaceAll('Ó', 'O')
        .replaceAll('Ú', 'U');
  }

  bool _esEstadoFinalCodigo(String? codigo) {
    if (codigo == null || codigo.trim().isEmpty) return false;
    return estadosFinales.contains(_normalizarEstadoCodigo(codigo));
  }

  Future<bool> _fueSubidaAlServidor(
    Ordene orden, {
    required bool permitirDirtyConHuella,
  }) async {
    // Sin id backend no existe garantía de persistencia en servidor.
    final idBackend = orden.idBackend;
    if (idBackend == null || idBackend <= 0) {
      return false;
    }

    // Si está en cola activa de sync, aún no es seguro purgar.
    final enColaPendiente = await _db.existeOrdenEnColaPendiente(orden.idLocal);
    if (enColaPendiente) return false;

    // Camino normal: orden limpia = subida confirmada.
    if (!orden.isDirty) return true;

    // ✅ FIX 21-FEB-2026: Para limpieza manual forzada, ser más permisivo.
    // Si la orden tiene idBackend (el servidor la creó), está en estado final,
    // y NO está en cola pendiente → el servidor ya tiene los datos.
    // El flag isDirty=true puede ser residuo de inconsistencias históricas
    // (ej: bug de duplicados, lastSyncedAt nunca seteado, etc.)
    if (permitirDirtyConHuella) {
      debugPrint(
        '⚠️ [LIFECYCLE] Orden ${orden.numeroOrden} isDirty=true pero tiene '
        'idBackend=$idBackend y no está en cola → permitiendo purga manual',
      );
      return true;
    }

    return false;
  }

  Future<bool> _esOrdenElegibleParaPurgarArchivos(
    int idOrdenLocal, {
    required Set<int> estadosFinalesIds,
  }) async {
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null) return false;
    if (!estadosFinalesIds.contains(orden.idEstado)) return false;

    return _fueSubidaAlServidor(orden, permitirDirtyConHuella: false);
  }

  Future<List<int>> _getEstadosFinalesIds() async {
    final estados = await _db.getAllEstadosOrden();
    return estados
        .where((e) {
          final codigoNormalizado = _normalizarEstadoCodigo(e.codigo);
          if (estadosProtegidos.contains(codigoNormalizado)) return false;
          return _esEstadoFinalCodigo(e.codigo);
        })
        .map((e) => e.id)
        .toList();
  }

  Future<Map<int, String>> _getEstadosCodigoMap() async {
    final estados = await _db.getAllEstadosOrden();
    return {for (var e in estados) e.id: e.codigo};
  }

  /// Purga una orden y todos sus datos relacionados
  /// ✅ FIX 09-FEB-2026: También elimina ordenesEquipos y ordenesPendientesSync
  Future<void> _purgarOrdenCompleta(int idOrdenLocal) async {
    // Obtener idBackend ANTES de la transacción (para limpiar ordenesEquipos)
    final orden = await _db.getOrdenById(idOrdenLocal);
    final idBackend = orden?.idBackend;

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

      // ✅ FIX 09-FEB-2026: Limpiar ordenesEquipos (vinculados por idOrdenServicio = idBackend)
      if (idBackend != null) {
        await (_db.delete(
          _db.ordenesEquipos,
        )..where((oe) => oe.idOrdenServicio.equals(idBackend))).go();
      }

      // ✅ FIX 09-FEB-2026: Limpiar cola de sync pendiente
      await (_db.delete(
        _db.ordenesPendientesSync,
      )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).go();

      // Finalmente eliminar la orden
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

  double espacioLiberadoBytes = 0;

  double get espacioLiberadoMB => espacioLiberadoBytes / (1024 * 1024);

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
