import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Provider para el servicio de ejecución
final ejecucionServiceProvider = Provider<EjecucionService>((ref) {
  final db = ref.watch(databaseProvider);
  final apiClient = ref.watch(apiClientProvider);
  return EjecucionService(db, apiClient);
});

/// Servicio de Ejecución - RUTA 6
/// Maneja la lógica transaccional de iniciar y ejecutar órdenes de servicio
/// ✅ MULTI-EQUIPOS: Soporta órdenes con múltiples equipos (15-DIC-2025)
class EjecucionService {
  final AppDatabase _db;
  final ApiClient _apiClient;

  EjecucionService(this._db, this._apiClient);

  /// Inicia la ejecución de una orden
  ///
  /// ✅ MULTI-EQUIPOS: Si [idOrdenEquipo] no es null, clona actividades
  /// solo para ese equipo específico. Si es null, usa flujo simple.
  ///
  /// REQUISITOS TRANSACCIONALES:
  /// 1. Idempotencia: Si ya existen actividades (para ese equipo), NO hace nada
  /// 2. Clonado: Copia actividades del catálogo a la tabla transaccional
  /// 3. Estado: Actualiza la orden a EN_PROCESO
  ///
  /// Retorna un [InicioEjecucionResult] con los detalles de la operación
  Future<InicioEjecucionResult> iniciarEjecucion(
    int idOrdenLocal, {
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS: ID del equipo específico (opcional)
  }) async {
    return await _db.transaction(() async {
      // 1. Obtener la orden
      final orden = await _db.getOrdenById(idOrdenLocal);
      if (orden == null) {
        return InicioEjecucionResult(
          exito: false,
          error: 'Orden no encontrada con id: $idOrdenLocal',
        );
      }

      // ✅ FIX CRÍTICO: Verificar si la orden ya está finalizada
      // Obtener el estado actual de la orden
      final estadoOrden = await _db.getEstadoOrdenById(orden.idEstado);
      if (estadoOrden != null) {
        // Verificar por código de estado o por flag esEstadoFinal
        final estadosFinalizados = ['COMPLETADA', 'CERRADA', 'CANCELADA'];
        if (estadoOrden.esEstadoFinal ||
            estadosFinalizados.contains(estadoOrden.codigo.toUpperCase())) {
          // Orden ya finalizada - NO modificar nada
          return InicioEjecucionResult(
            exito: true,
            mensaje:
                'Orden ya finalizada (${estadoOrden.codigo}). Solo visualización.',
            actividadesInstanciadas: orden.totalActividades,
            medicionesCreadas: orden.totalMediciones,
            estadoAnterior: estadoOrden.codigo,
            estadoNuevo: estadoOrden.codigo,
            yaExistia: true,
          );
        }
      }

      // 2. Verificar idempotencia: ¿Ya existen actividades ejecutadas?
      // ✅ MULTI-EQUIPOS: Si hay idOrdenEquipo, verificar solo para ese equipo
      List<ActividadesEjecutada> actividadesExistentes;
      if (idOrdenEquipo != null) {
        // Multi-equipo: Filtrar por equipo específico
        actividadesExistentes =
            await (_db.select(_db.actividadesEjecutadas)
                  ..where((a) => a.idOrden.equals(idOrdenLocal))
                  ..where((a) => a.idOrdenEquipo.equals(idOrdenEquipo)))
                .get();
        debugPrint(
          '🔧 [MULTI-EQ] Verificando actividades para equipo $idOrdenEquipo: ${actividadesExistentes.length}',
        );
      } else {
        // Orden simple: Todas las actividades
        actividadesExistentes = await _db.getActividadesByOrden(idOrdenLocal);
      }
      if (actividadesExistentes.isNotEmpty) {
        // Ya fue iniciada previamente - PERO verificar si faltan mediciones
        final medicionesExistentes = await (_db.select(
          _db.mediciones,
        )..where((m) => m.idOrden.equals(idOrdenLocal))).get();

        // Si hay actividades con medición pero NO hay registros en tabla Mediciones
        // → REPARAR: Crear las mediciones faltantes
        final actividadesConMedicion = actividadesExistentes
            .where((a) => a.idParametroMedicion != null)
            .toList();

        if (actividadesConMedicion.isNotEmpty && medicionesExistentes.isEmpty) {
          // ✅ FLEXIBILIZACIÓN PARÁMETROS: Obtener config del equipo
          final configEquipoJson = await _obtenerConfigEquipo(idOrdenLocal);

          int medicionesReparadas = 0;
          for (final act in actividadesConMedicion) {
            final parametro =
                await (_db.select(_db.parametrosCatalogo)
                      ..where((p) => p.id.equals(act.idParametroMedicion!)))
                    .getSingleOrNull();

            if (parametro != null) {
              // ✅ FLEXIBILIZACIÓN PARÁMETROS: Resolver rangos y unidades (equipo > catálogo)
              final rangosCustom = _resolverRangosPersonalizados(
                configParametrosJson: configEquipoJson,
                codigoParametro: parametro.codigo,
              );
              final unidadCustom = _resolverUnidadPersonalizada(
                configParametrosJson: configEquipoJson,
                codigoParametro: parametro.codigo,
              );

              await _db.insertMedicion(
                MedicionesCompanion.insert(
                  idOrden: idOrdenLocal,
                  idActividadEjecutada: Value(act.idLocal),
                  idParametro: parametro.id,
                  nombreParametro: parametro.nombre,
                  unidadMedida: unidadCustom ?? parametro.unidad ?? '',
                  rangoMinimoNormal: Value(
                    rangosCustom?.minNormal ?? parametro.valorMinimoNormal,
                  ),
                  rangoMaximoNormal: Value(
                    rangosCustom?.maxNormal ?? parametro.valorMaximoNormal,
                  ),
                  rangoMinimoCritico: Value(
                    rangosCustom?.minCritico ?? parametro.valorMinimoCritico,
                  ),
                  rangoMaximoCritico: Value(
                    rangosCustom?.maxCritico ?? parametro.valorMaximoCritico,
                  ),
                  valor: const Value(null),
                  estadoValor: const Value(null),
                  isDirty: const Value(true),
                ),
              );
              medicionesReparadas++;
            }
          }

          return InicioEjecucionResult(
            exito: true,
            mensaje: 'Mediciones reparadas para orden existente',
            actividadesInstanciadas: actividadesExistentes.length,
            medicionesCreadas: medicionesReparadas,
            estadoAnterior: _getEstadoCodigo(orden.idEstado),
            estadoNuevo: _getEstadoCodigo(orden.idEstado),
            yaExistia: true,
          );
        }

        // Si todo está bien, retornar sin cambios
        return InicioEjecucionResult(
          exito: true,
          mensaje: 'Ejecución ya iniciada previamente',
          actividadesInstanciadas: actividadesExistentes.length,
          medicionesCreadas: medicionesExistentes.length,
          estadoAnterior: _getEstadoCodigo(orden.idEstado),
          estadoNuevo: _getEstadoCodigo(orden.idEstado),
          yaExistia: true,
        );
      }

      // 3. Obtener el estado actual
      final estadoAnterior = _getEstadoCodigo(orden.idEstado);

      // ======================================================================
      // 4. OBTENER ACTIVIDADES A EJECUTAR
      // ======================================================================
      // PRIORIDAD:
      // 1. Si existe plan de actividades asignado por admin → usar plan
      // 2. Si no → usar catálogo por tipo de servicio (comportamiento original)
      // ======================================================================

      List<ActividadesCatalogoData> actividadesAEjecutar = [];

      // 4.1 Verificar si existe plan de actividades para esta orden
      final planActividades = await _db.getPlanActividadesByOrden(idOrdenLocal);

      if (planActividades.isNotEmpty) {
        // ✅ USAR PLAN DE ACTIVIDADES ASIGNADO POR ADMIN
        // Obtener las actividades del catálogo según el plan
        for (final planItem in planActividades) {
          final actCatalogo =
              await (_db.select(_db.actividadesCatalogo)
                    ..where((a) => a.id.equals(planItem.idActividadCatalogo)))
                  .getSingleOrNull();

          if (actCatalogo != null) {
            actividadesAEjecutar.add(actCatalogo);
          }
        }

        if (actividadesAEjecutar.isEmpty) {
          return InicioEjecucionResult(
            exito: false,
            error:
                'Plan de actividades asignado pero actividades no encontradas en catálogo',
          );
        }
      } else {
        // ✅ FALLBACK: Usar catálogo por tipo de servicio (comportamiento original)
        actividadesAEjecutar =
            await (_db.select(_db.actividadesCatalogo)
                  ..where((a) => a.idTipoServicio.equals(orden.idTipoServicio))
                  ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]))
                .get();

        if (actividadesAEjecutar.isEmpty) {
          return InicioEjecucionResult(
            exito: false,
            error:
                'No hay actividades en catálogo para tipo de servicio: ${orden.idTipoServicio}',
          );
        }
      }

      // 5. Clonar actividades a la tabla transaccional
      // Y crear mediciones con SNAPSHOT completo para actividades de medición
      // ✅ MULTI-EQUIPOS: Incluir idOrdenEquipo si se proporciona
      // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Obtener config del equipo
      final configEquipoJson = await _obtenerConfigEquipo(idOrdenLocal);
      debugPrint(
        '🔍 [CONFIG] idOrdenLocal: $idOrdenLocal, idEquipo: ${orden.idEquipo}',
      );
      debugPrint('🔍 [CONFIG] configEquipoJson: ${configEquipoJson ?? "NULL"}');
      if (configEquipoJson != null && configEquipoJson.isNotEmpty) {
        debugPrint(
          '✅ [CONFIG] Equipo tiene configuración personalizada: ${configEquipoJson.substring(0, configEquipoJson.length > 100 ? 100 : configEquipoJson.length)}...',
        );
      } else {
        debugPrint(
          '⚠️ [CONFIG] Equipo SIN configuración personalizada - usando catálogo global',
        );
      }

      int instanciadas = 0;
      int medicionesCreadas = 0;
      String? primeraActividadNombre;

      debugPrint(
        '🔧 [EJECUCIÓN] Clonando ${actividadesAEjecutar.length} actividades${idOrdenEquipo != null ? ' para equipo $idOrdenEquipo' : ''}',
      );

      for (final actCatalogo in actividadesAEjecutar) {
        // Determinar el sistema (usar GENERAL si es null)
        final sistemaNombre = actCatalogo.sistema ?? 'GENERAL';

        // Insertar actividad ejecutada y obtener su ID
        // ✅ MULTI-EQUIPOS: Incluir idOrdenEquipo
        final idActividadEjecutada = await _db.insertActividadEjecutada(
          ActividadesEjecutadasCompanion.insert(
            idOrden: idOrdenLocal,
            idActividadCatalogo: actCatalogo.id,
            // ✅ MULTI-EQUIPOS: FK al equipo específico (null si orden simple)
            idOrdenEquipo: Value(idOrdenEquipo),
            // Campos desnormalizados (snapshot)
            descripcion: actCatalogo.descripcion,
            sistema: Value(sistemaNombre),
            tipoActividad: actCatalogo.tipoActividad,
            idParametroMedicion: Value(actCatalogo.idParametroMedicion),
            ordenEjecucion: Value(actCatalogo.ordenEjecucion),
            // Estado inicial
            simbologia: const Value(null), // Pendiente de marcar
            completada: const Value(false),
            isDirty: const Value(true),
          ),
        );
        instanciadas++;
        primeraActividadNombre ??= actCatalogo.descripcion;

        // ==================================================================
        // CREAR MEDICIÓN CON SNAPSHOT SI LA ACTIVIDAD REQUIERE MEDICIÓN
        // ✅ MULTI-EQUIPOS: Incluir idOrdenEquipo
        // ==================================================================
        if (actCatalogo.idParametroMedicion != null) {
          // Buscar el parámetro en el catálogo para copiar sus datos
          final parametro =
              await (_db.select(_db.parametrosCatalogo)..where(
                    (p) => p.id.equals(actCatalogo.idParametroMedicion!),
                  ))
                  .getSingleOrNull();

          if (parametro != null) {
            // ✅ FLEXIBILIZACIÓN PARÁMETROS: Resolver rangos y unidades (equipo > catálogo)
            final rangosCustom = _resolverRangosPersonalizados(
              configParametrosJson: configEquipoJson,
              codigoParametro: parametro.codigo,
            );
            final unidadCustom = _resolverUnidadPersonalizada(
              configParametrosJson: configEquipoJson,
              codigoParametro: parametro.codigo,
            );

            // Crear fila de medición VACÍA con SNAPSHOT de rangos y unidad
            // ✅ MULTI-EQUIPOS: Incluir idOrdenEquipo
            await _db.insertMedicion(
              MedicionesCompanion.insert(
                idOrden: idOrdenLocal,
                idActividadEjecutada: Value(idActividadEjecutada),
                idParametro: parametro.id,
                // ✅ MULTI-EQUIPOS: FK al equipo específico
                idOrdenEquipo: Value(idOrdenEquipo),
                // SNAPSHOT: Usar rangos/unidades personalizados si existen, sino catálogo
                nombreParametro: parametro.nombre,
                unidadMedida: unidadCustom ?? parametro.unidad ?? '',
                rangoMinimoNormal: Value(
                  rangosCustom?.minNormal ?? parametro.valorMinimoNormal,
                ),
                rangoMaximoNormal: Value(
                  rangosCustom?.maxNormal ?? parametro.valorMaximoNormal,
                ),
                rangoMinimoCritico: Value(
                  rangosCustom?.minCritico ?? parametro.valorMinimoCritico,
                ),
                rangoMaximoCritico: Value(
                  rangosCustom?.maxCritico ?? parametro.valorMaximoCritico,
                ),
                // Valor NULL - se llenará cuando el técnico mida
                valor: const Value(null),
                estadoValor: const Value(null),
                isDirty: const Value(true),
              ),
            );
            medicionesCreadas++;
          }
        }
      }

      // 6. Actualizar estado de la orden a EN_PROCESO
      // Buscar el ID del estado EN_PROCESO
      final estadoEnProceso = await (_db.select(
        _db.estadosOrden,
      )..where((e) => e.codigo.equals('EN_PROCESO'))).getSingleOrNull();

      if (estadoEnProceso != null) {
        // IMPORTANTE: Solo actualizar fechaInicio si no existía previamente
        // Esto preserva la hora real de inicio aunque se reinicie la app
        await (_db.update(
          _db.ordenes,
        )..where((o) => o.idLocal.equals(idOrdenLocal))).write(
          OrdenesCompanion(
            idEstado: Value(estadoEnProceso.id),
            // Solo establecer fechaInicio si es la primera vez (orden.fechaInicio es null)
            fechaInicio: orden.fechaInicio == null
                ? Value(DateTime.now())
                : const Value.absent(),
            isDirty: const Value(true),
            updatedAt: Value(DateTime.now()),
          ),
        );

        // ✅ v3.3 INTELLIGENT SYNC: Notificar al backend de inmediato si hay red
        // No bloqueamos el flujo principal si falla (el isDirty garantiza el sync posterior)
        if (orden.idBackend != null) {
          _notificarInicioBackend(orden.idBackend!);
        }
      }

      // 7. Verificación de lectura
      final verificacion = await _db.getActividadesByOrden(idOrdenLocal);

      return InicioEjecucionResult(
        exito: true,
        mensaje: 'Ejecución iniciada correctamente',
        actividadesInstanciadas: instanciadas,
        medicionesCreadas: medicionesCreadas,
        estadoAnterior: estadoAnterior,
        estadoNuevo: 'EN_PROCESO',
        yaExistia: false,
        primeraActividad: primeraActividadNombre,
        verificacionLectura: verificacion.isNotEmpty,
      );
    });
  }

  /// ✅ v3.3: Notifica al backend que se inició la ejecución (mejor esfuerzo)
  Future<void> _notificarInicioBackend(int idOrdenBackend) async {
    try {
      debugPrint(
        '📡 [SYNC] Notificando inicio de orden $idOrdenBackend al backend...',
      );
      await _apiClient.dio.put('/ordenes/$idOrdenBackend/iniciar');
      debugPrint('✅ [SYNC] Backend notificado correctamente');
    } catch (e) {
      // Error silencioso: el flag isDirty de la orden garantiza que el SyncWorker
      // lo intente de nuevo más tarde de forma más robusta.
      debugPrint(
        '⚠️ [SYNC] No se pudo notificar inicio al backend (se hará en sync posterior): $e',
      );
    }
  }

  /// Elimina una actividad del plan local y sus dependencias
  Future<void> eliminarActividadLocal(int idActividadLocal) async {
    await _db.transaction(() async {
      await (_db.delete(
        _db.evidencias,
      )..where((e) => e.idActividadEjecutada.equals(idActividadLocal))).go();
      await (_db.delete(
        _db.mediciones,
      )..where((m) => m.idActividadEjecutada.equals(idActividadLocal))).go();
      await (_db.delete(
        _db.actividadesEjecutadas,
      )..where((a) => a.idLocal.equals(idActividadLocal))).go();
    });
  }

  /// Adds a dynamic activity to the execution plan
  Future<int> addActividadDinamica({
    required int idOrdenLocal,
    required int idActividadCatalogo,
    int? idOrdenEquipo,
    String? sistema,
  }) async {
    return await _db.transaction(() async {
      final actCatalogo = await (_db.select(
        _db.actividadesCatalogo,
      )..where((a) => a.id.equals(idActividadCatalogo))).getSingleOrNull();

      if (actCatalogo == null) throw Exception('Activity not found in catalog');

      // Get last sequence
      // ✅ FIX 03-FEB-2026: Usar get() + firstOrNull en vez de getSingleOrNull()
      // para evitar "Bad State: Too Many Elements" cuando hay múltiples actividades
      final queryUltima = _db.select(_db.actividadesEjecutadas)
        ..where((a) => a.idOrden.equals(idOrdenLocal));
      if (idOrdenEquipo != null) {
        queryUltima.where((a) => a.idOrdenEquipo.equals(idOrdenEquipo));
      }
      queryUltima.orderBy([(a) => OrderingTerm.desc(a.ordenEjecucion)]);

      final listaActividades = await queryUltima.get();
      final ultimaAct = listaActividades.isNotEmpty
          ? listaActividades.first
          : null;
      final nuevaSecuencia = (ultimaAct?.ordenEjecucion ?? 0) + 1;

      final idActividadEjecutada = await _db.insertActividadEjecutada(
        ActividadesEjecutadasCompanion.insert(
          idOrden: idOrdenLocal,
          idActividadCatalogo: idActividadCatalogo,
          idOrdenEquipo: Value(idOrdenEquipo),
          descripcion: actCatalogo.descripcion,
          sistema: Value(sistema ?? actCatalogo.sistema ?? 'GENERAL'),
          tipoActividad: actCatalogo.tipoActividad,
          idParametroMedicion: Value(actCatalogo.idParametroMedicion),
          ordenEjecucion: Value(nuevaSecuencia),
          simbologia: const Value(null),
          completada: const Value(false),
          isDirty: const Value(true),
        ),
      );

      // If it requires measurement, create it
      if (actCatalogo.idParametroMedicion != null) {
        final parametro =
            await (_db.select(_db.parametrosCatalogo)
                  ..where((p) => p.id.equals(actCatalogo.idParametroMedicion!)))
                .getSingleOrNull();

        if (parametro != null) {
          // ✅ FLEXIBILIZACIÓN PARÁMETROS: Obtener config y resolver rangos/unidades
          final configEquipoJson = await _obtenerConfigEquipo(idOrdenLocal);
          final rangosCustom = _resolverRangosPersonalizados(
            configParametrosJson: configEquipoJson,
            codigoParametro: parametro.codigo,
          );
          final unidadCustom = _resolverUnidadPersonalizada(
            configParametrosJson: configEquipoJson,
            codigoParametro: parametro.codigo,
          );

          await _db.insertMedicion(
            MedicionesCompanion.insert(
              idOrden: idOrdenLocal,
              idActividadEjecutada: Value(idActividadEjecutada),
              idParametro: parametro.id,
              idOrdenEquipo: Value(idOrdenEquipo),
              nombreParametro: parametro.nombre,
              unidadMedida: unidadCustom ?? parametro.unidad ?? '',
              rangoMinimoNormal: Value(
                rangosCustom?.minNormal ?? parametro.valorMinimoNormal,
              ),
              rangoMaximoNormal: Value(
                rangosCustom?.maxNormal ?? parametro.valorMaximoNormal,
              ),
              rangoMinimoCritico: Value(
                rangosCustom?.minCritico ?? parametro.valorMinimoCritico,
              ),
              rangoMaximoCritico: Value(
                rangosCustom?.maxCritico ?? parametro.valorMaximoCritico,
              ),
              isDirty: const Value(true),
            ),
          );
        }
      }

      return idActividadEjecutada;
    });
  }

  /// Actualiza el estado de una actividad ejecutada
  ///
  /// [simbologia]: B=Bueno, M=Malo, C=Cambiado, NA=No Aplica
  ///
  /// Persiste INMEDIATAMENTE en drift (sin botón guardar)
  Future<bool> marcarActividad({
    required int idActividadLocal,
    required String simbologia,
    String? observacion,
    String? respuestaJson,
  }) async {
    try {
      await (_db.update(
        _db.actividadesEjecutadas,
      )..where((a) => a.idLocal.equals(idActividadLocal))).write(
        ActividadesEjecutadasCompanion(
          simbologia: Value(simbologia),
          completada: const Value(true),
          fechaEjecucion: Value(DateTime.now()),
          observacion: observacion != null
              ? Value(observacion)
              : const Value.absent(),
          respuestaJson: respuestaJson != null
              ? Value(respuestaJson)
              : const Value.absent(),
          isDirty: const Value(true),
        ),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Actualiza el valor de una medición existente
  ///
  /// La fila de medición ya fue creada al iniciar la ejecución (con snapshot).
  /// Este método solo actualiza el valor capturado por el técnico.
  ///
  /// [estadoValor]: NORMAL, ADVERTENCIA, CRITICO (calculado automáticamente)
  Future<bool> actualizarMedicion({
    required int idMedicion,
    required double valor,
    required String estadoValor,
    String? observacion,
  }) async {
    try {
      await (_db.update(
        _db.mediciones,
      )..where((m) => m.idLocal.equals(idMedicion))).write(
        MedicionesCompanion(
          valor: Value(valor),
          estadoValor: Value(estadoValor),
          observacion: observacion != null
              ? Value(observacion)
              : const Value.absent(),
          fechaMedicion: Value(DateTime.now()),
          isDirty: const Value(true),
        ),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Limpia el valor de una medición (cuando el usuario borra el campo)
  /// Establece valor y estadoValor a null
  Future<bool> limpiarMedicion({required int idMedicion}) async {
    try {
      await (_db.update(
        _db.mediciones,
      )..where((m) => m.idLocal.equals(idMedicion))).write(
        const MedicionesCompanion(
          valor: Value(null),
          estadoValor: Value(null),
          fechaMedicion: Value(null),
          isDirty: Value(true),
        ),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Obtiene todas las mediciones de una orden (con snapshot completo)
  /// ✅ MULTI-EQUIPOS: Si [idOrdenEquipo] no es null, filtra por ese equipo
  Future<List<Medicione>> getMedicionesByOrdenLocal(
    int idOrdenLocal, {
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS
  }) async {
    var query = _db.select(_db.mediciones)
      ..where((m) => m.idOrden.equals(idOrdenLocal))
      ..orderBy([(m) => OrderingTerm.asc(m.idLocal)]);

    // ✅ MULTI-EQUIPOS: Filtrar por equipo si se proporciona
    if (idOrdenEquipo != null) {
      query = query..where((m) => m.idOrdenEquipo.equals(idOrdenEquipo));
    }

    return await query.get();
  }

  // =========================================================================
  // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Resolución de rangos en cascada
  // Prioridad: configParametros del equipo > catálogo global
  // =========================================================================

  /// Clase helper para rangos resueltos
  /// Retorna los rangos personalizados del equipo si existen, o null para usar catálogo
  _RangosResueltos? _resolverRangosPersonalizados({
    required String? configParametrosJson,
    required String codigoParametro,
  }) {
    if (configParametrosJson == null || configParametrosJson.isEmpty) {
      return null;
    }

    try {
      final config = jsonDecode(configParametrosJson) as Map<String, dynamic>;
      final rangos = config['rangos'] as Map<String, dynamic>?;
      if (rangos == null) return null;

      // Mapeo de códigos de parámetro del catálogo a claves del config
      // El frontend usa claves como "frecuencia_generador", "voltaje_generador", etc.
      // IMPORTANTE: Los códigos deben coincidir EXACTAMENTE con los del seed
      final mapaClaves = {
        // Generadores - códigos del catálogo (fase-menos-1-ejecutar.ts)
        'GEN_RPM': 'velocidad_motor',
        'GEN_PRESION_ACEITE': 'presion_aceite',
        'GEN_TEMP_REFRIGERANTE': 'temperatura_refrigerante',
        'GEN_VOLTAJE_BATERIA': 'carga_bateria', // Carga de Batería
        'GEN_HOROMETRO': 'horas_trabajo', // Sin rangos normalmente
        'GEN_VOLTAJE_SALIDA': 'voltaje_generador', // Voltaje del Generador
        'GEN_FRECUENCIA': 'frecuencia_generador',
        'GEN_AMPERAJE': 'corriente_generador',
        // Alias por si hay variaciones de nombre
        'GEN_VOLTAJE': 'voltaje_generador',
        'GEN_CORRIENTE': 'corriente_generador',
        // Bombas
        'BOM_VIBRACION': 'vibracion',
        'BOM_PRESION_DESCARGA': 'presion_descarga',
        'BOM_PRESION_SUCCION': 'presion_succion',
        'BOM_VOLTAJE': 'voltaje_motor',
        'BOM_AMPERAJE': 'corriente_motor',
        'BOM_TEMPERATURA': 'temperatura_motor',
        'BOM_CAUDAL': 'caudal',
        'BOM_RPM': 'velocidad_bomba',
      };

      final claveConfig = mapaClaves[codigoParametro.toUpperCase()];
      if (claveConfig == null) return null;

      final rangoParam = rangos[claveConfig] as Map<String, dynamic>?;
      if (rangoParam == null) return null;

      debugPrint(
        '✅ [CONFIG] Usando rangos personalizados para $codigoParametro: $rangoParam',
      );

      return _RangosResueltos(
        minNormal: (rangoParam['min_normal'] as num?)?.toDouble(),
        maxNormal: (rangoParam['max_normal'] as num?)?.toDouble(),
        minCritico: (rangoParam['min_critico'] as num?)?.toDouble(),
        maxCritico: (rangoParam['max_critico'] as num?)?.toDouble(),
      );
    } catch (e) {
      debugPrint('⚠️ [CONFIG] Error parseando configParametros: $e');
      return null;
    }
  }

  /// Resuelve la unidad personalizada del equipo para un parámetro
  /// Retorna la unidad personalizada o null para usar la del catálogo
  String? _resolverUnidadPersonalizada({
    required String? configParametrosJson,
    required String codigoParametro,
  }) {
    if (configParametrosJson == null || configParametrosJson.isEmpty) {
      return null;
    }

    try {
      final config = jsonDecode(configParametrosJson) as Map<String, dynamic>;
      final unidades = config['unidades'] as Map<String, dynamic>?;
      if (unidades == null) return null;

      // Mapeo de códigos de parámetro a tipo de magnitud
      final mapaParamAMagnitud = {
        // Generadores
        'GEN_TEMP_REFRIGERANTE': 'temperatura',
        'GEN_PRESION_ACEITE': 'presion',
        'GEN_VOLTAJE_SALIDA': 'voltaje',
        'GEN_VOLTAJE_BATERIA': 'voltaje',
        'GEN_VOLTAJE': 'voltaje',
        'GEN_FRECUENCIA': 'frecuencia',
        'GEN_AMPERAJE': 'corriente',
        'GEN_CORRIENTE': 'corriente',
        // Bombas
        'BOM_PRESION_DESCARGA': 'presion',
        'BOM_PRESION_SUCCION': 'presion',
        'BOM_VOLTAJE': 'voltaje',
        'BOM_AMPERAJE': 'corriente',
        'BOM_TEMPERATURA': 'temperatura',
      };

      final magnitud = mapaParamAMagnitud[codigoParametro.toUpperCase()];
      if (magnitud == null) return null;

      final unidadCustom = unidades[magnitud] as String?;
      if (unidadCustom != null) {
        debugPrint(
          '✅ [CONFIG] Usando unidad personalizada para $codigoParametro: $unidadCustom',
        );
      }
      return unidadCustom;
    } catch (e) {
      debugPrint('⚠️ [CONFIG] Error parseando unidades: $e');
      return null;
    }
  }

  /// Obtiene el configParametros del equipo de una orden
  Future<String?> _obtenerConfigEquipo(int idOrdenLocal) async {
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null) return null;

    final equipo = await (_db.select(
      _db.equipos,
    )..where((e) => e.id.equals(orden.idEquipo))).getSingleOrNull();

    return equipo?.configParametros;
  }

  /// Calcula el estado del valor según los rangos
  /// Retorna: NORMAL, ADVERTENCIA, CRITICO
  String calcularEstadoValor({
    required double valor,
    double? rangoMinimoNormal,
    double? rangoMaximoNormal,
    double? rangoMinimoCritico,
    double? rangoMaximoCritico,
  }) {
    // Si está fuera de rangos críticos -> CRITICO
    if (rangoMinimoCritico != null && valor < rangoMinimoCritico) {
      return 'CRITICO';
    }
    if (rangoMaximoCritico != null && valor > rangoMaximoCritico) {
      return 'CRITICO';
    }

    // Si está fuera de rangos normales pero dentro de críticos -> ADVERTENCIA
    if (rangoMinimoNormal != null && valor < rangoMinimoNormal) {
      return 'ADVERTENCIA';
    }
    if (rangoMaximoNormal != null && valor > rangoMaximoNormal) {
      return 'ADVERTENCIA';
    }

    // Dentro de rango normal -> NORMAL
    return 'NORMAL';
  }

  /// Obtiene las actividades ejecutadas agrupadas por sistema
  /// ✅ FIX 15-DIC-2025: EXCLUYE actividades tipo MEDICION (van en tab Mediciones)
  /// ✅ MULTI-EQUIPOS: Si [idOrdenEquipo] no es null, filtra por ese equipo
  /// Las actividades con idParametroMedicion se manejan en tabla mediciones
  Future<Map<String, List<ActividadesEjecutada>>> getActividadesAgrupadas(
    int idOrdenLocal, {
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS: Filtrar por equipo específico
  }) async {
    var query = _db.select(_db.actividadesEjecutadas)
      ..where((a) => a.idOrden.equals(idOrdenLocal))
      // ✅ FIX: Excluir actividades que tienen parámetro de medición
      // Estas aparecen en el tab Mediciones, no en Checklist
      ..where((a) => a.idParametroMedicion.isNull())
      ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]);

    // ✅ MULTI-EQUIPOS: Filtrar por equipo si se proporciona
    if (idOrdenEquipo != null) {
      query = query..where((a) => a.idOrdenEquipo.equals(idOrdenEquipo));
    }

    final actividades = await query.get();

    final Map<String, List<ActividadesEjecutada>> grupos = {};
    for (final act in actividades) {
      final sistema = act.sistema ?? 'GENERAL';
      grupos.putIfAbsent(sistema, () => []);
      grupos[sistema]!.add(act);
    }
    return grupos;
  }

  /// Obtiene las actividades que requieren medición
  /// ✅ MULTI-EQUIPOS: Si [idOrdenEquipo] no es null, filtra por ese equipo
  Future<List<ActividadesEjecutada>> getActividadesConMedicion(
    int idOrdenLocal, {
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS
  }) async {
    var query = _db.select(_db.actividadesEjecutadas)
      ..where((a) => a.idOrden.equals(idOrdenLocal))
      ..where((a) => a.idParametroMedicion.isNotNull())
      ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]);

    // ✅ MULTI-EQUIPOS: Filtrar por equipo si se proporciona
    if (idOrdenEquipo != null) {
      query = query..where((a) => a.idOrdenEquipo.equals(idOrdenEquipo));
    }

    return await query.get();
  }

  /// Obtiene el resumen de progreso de la ejecución
  /// ✅ MULTI-EQUIPOS: Si [idOrdenEquipo] no es null, filtra por ese equipo
  /// IMPORTANTE: Excluye actividades tipo MEDICION para evitar doble conteo
  Future<ResumenEjecucion> getResumenEjecucion(
    int idOrdenLocal, {
    int? idOrdenEquipo, // ✅ MULTI-EQUIPOS
  }) async {
    // ✅ FIX: Filtrar actividades tipo MEDICION (se cuentan en tabla mediciones)
    List<ActividadesEjecutada> todasActividades;
    List<Medicione> mediciones;

    if (idOrdenEquipo != null) {
      // ✅ MULTI-EQUIPOS: Filtrar por equipo
      todasActividades =
          await (_db.select(_db.actividadesEjecutadas)
                ..where((a) => a.idOrden.equals(idOrdenLocal))
                ..where((a) => a.idOrdenEquipo.equals(idOrdenEquipo)))
              .get();
      mediciones =
          await (_db.select(_db.mediciones)
                ..where((m) => m.idOrden.equals(idOrdenLocal))
                ..where((m) => m.idOrdenEquipo.equals(idOrdenEquipo)))
              .get();
    } else {
      // Orden simple: Todas las actividades
      todasActividades = await _db.getActividadesByOrden(idOrdenLocal);
      mediciones = await _db.getMedicionesByOrden(idOrdenLocal);
    }

    final actividades = todasActividades
        .where((a) => a.tipoActividad != 'MEDICION')
        .toList();

    int completadas = 0;
    int pendientes = 0;
    int buenos = 0;
    int malos = 0;
    int corregidos = 0;
    int noAplica = 0;

    for (final act in actividades) {
      if (act.completada) {
        completadas++;
        switch (act.simbologia) {
          case 'B':
            buenos++;
            break;
          case 'M':
            malos++;
            break;
          case 'C':
            corregidos++;
            break;
          case 'NA':
            noAplica++;
            break;
        }
      } else {
        pendientes++;
      }
    }

    int medicionesNormales = 0;
    int medicionesAdvertencia = 0;
    int medicionesCriticas = 0;
    int medicionesConValor = 0; // ✅ Mediciones que tienen un valor registrado

    for (final med in mediciones) {
      // ✅ Contar mediciones que tienen un valor (independiente del estado)
      if (med.valor != null) {
        medicionesConValor++;
      }

      switch (med.estadoValor) {
        case 'NORMAL':
          medicionesNormales++;
          break;
        case 'ADVERTENCIA':
          medicionesAdvertencia++;
          break;
        case 'CRITICO':
          medicionesCriticas++;
          break;
      }
    }

    return ResumenEjecucion(
      totalActividades: actividades.length,
      completadas: completadas,
      pendientes: pendientes,
      buenos: buenos,
      malos: malos,
      corregidos: corregidos,
      noAplica: noAplica,
      totalMediciones: mediciones.length,
      medicionesConValor: medicionesConValor, // ✅ NUEVO
      medicionesNormales: medicionesNormales,
      medicionesAdvertencia: medicionesAdvertencia,
      medicionesCriticas: medicionesCriticas,
    );
  }

  /// Obtiene los parámetros de medición del catálogo
  Future<ParametrosCatalogoData?> getParametroCatalogo(int idParametro) async {
    return await (_db.select(
      _db.parametrosCatalogo,
    )..where((p) => p.id.equals(idParametro))).getSingleOrNull();
  }

  String _getEstadoCodigo(int idEstado) {
    // Mapeo básico de estados conocidos
    switch (idEstado) {
      case 1:
        return 'PENDIENTE';
      case 2:
        return 'ASIGNADA';
      case 3:
        return 'EN_PROCESO';
      case 4:
        return 'EN_PAUSA';
      case 5:
        return 'COMPLETADA';
      case 6:
        return 'CERRADA';
      case 7:
        return 'CANCELADA';
      default:
        return 'DESCONOCIDO';
    }
  }

  /// ✅ NUEVO: Verifica si todas las actividades+mediciones del equipo están completas
  /// y actualiza el estado del equipo automáticamente
  ///
  /// Retorna el nuevo estado del equipo o null si no hubo cambio
  Future<String?> verificarYActualizarEstadoEquipo(
    int idOrdenLocal,
    int idOrdenEquipo,
  ) async {
    try {
      // Obtener resumen del equipo
      final resumen = await getResumenEjecucion(
        idOrdenLocal,
        idOrdenEquipo: idOrdenEquipo,
      );

      // Verificar si todo está completo
      final actividadesCompletas =
          resumen.completadas >= resumen.totalActividades;
      final medicionesCompletas =
          resumen.medicionesConValor >= resumen.totalMediciones;
      final todoCompleto =
          actividadesCompletas &&
          medicionesCompletas &&
          (resumen.totalActividades > 0 || resumen.totalMediciones > 0);

      // Obtener estado actual del equipo
      final equipo = await _db.getOrdenEquipoById(idOrdenEquipo);
      if (equipo == null) return null;

      final estadoActual = equipo.estado.toUpperCase();
      String nuevoEstado;

      if (todoCompleto) {
        nuevoEstado = 'COMPLETADO';
      } else if (resumen.completadas > 0 || resumen.medicionesConValor > 0) {
        nuevoEstado = 'EN_PROCESO';
      } else {
        nuevoEstado = 'PENDIENTE';
      }

      // Solo actualizar si cambió el estado
      if (nuevoEstado != estadoActual) {
        await _db.updateEstadoEquipo(
          idOrdenEquipo,
          nuevoEstado,
          fechaInicio: nuevoEstado == 'EN_PROCESO' && equipo.fechaInicio == null
              ? DateTime.now()
              : null,
          fechaFin: nuevoEstado == 'COMPLETADO' ? DateTime.now() : null,
        );
        debugPrint(
          '✅ [MULTI-EQUIPO] Estado actualizado: $estadoActual -> $nuevoEstado',
        );
        return nuevoEstado;
      }

      return null; // No hubo cambio
    } catch (e) {
      debugPrint('❌ Error verificando estado equipo: $e');
      return null;
    }
  }
}

/// Resultado de iniciar ejecución
class InicioEjecucionResult {
  final bool exito;
  final String? mensaje;
  final String? error;
  final int actividadesInstanciadas;
  final int medicionesCreadas;
  final String? estadoAnterior;
  final String? estadoNuevo;
  final bool yaExistia;
  final String? primeraActividad;
  final bool verificacionLectura;

  InicioEjecucionResult({
    required this.exito,
    this.mensaje,
    this.error,
    this.actividadesInstanciadas = 0,
    this.medicionesCreadas = 0,
    this.estadoAnterior,
    this.estadoNuevo,
    this.yaExistia = false,
    this.primeraActividad,
    this.verificacionLectura = false,
  });

  @override
  String toString() {
    if (exito) {
      return '''
⚙️ INICIO EJECUCIÓN:
   - Estado: $estadoAnterior -> $estadoNuevo
   - Transacción: ✅ Exitosa${yaExistia ? ' (ya existía)' : ''}
   - Actividades Instanciadas: $actividadesInstanciadas
   - Mediciones Creadas: $medicionesCreadas
   - Verificación Lectura: ${verificacionLectura ? '✅' : '❌'}
   ${primeraActividad != null ? "- Primera Actividad: '$primeraActividad'" : ''}''';
    } else {
      return '❌ ERROR: $error';
    }
  }
}

/// Resumen del estado de ejecución
class ResumenEjecucion {
  final int totalActividades;
  final int completadas;
  final int pendientes;
  final int buenos;
  final int malos;
  final int corregidos;
  final int noAplica;
  final int totalMediciones;
  final int medicionesConValor; // ✅ NUEVO: mediciones con valor registrado
  final int medicionesNormales;
  final int medicionesAdvertencia;
  final int medicionesCriticas;

  ResumenEjecucion({
    required this.totalActividades,
    required this.completadas,
    required this.pendientes,
    required this.buenos,
    required this.malos,
    required this.corregidos,
    required this.noAplica,
    required this.totalMediciones,
    required this.medicionesConValor, // ✅ NUEVO
    required this.medicionesNormales,
    required this.medicionesAdvertencia,
    required this.medicionesCriticas,
  });

  /// ✅ CORREGIDO: Porcentaje incluye actividades Y mediciones
  double get porcentajeCompletado {
    final totalItems = totalActividades + totalMediciones;
    final completadosTotal = completadas + medicionesConValor;
    return totalItems > 0 ? (completadosTotal / totalItems) * 100 : 0;
  }

  /// ✅ NUEVO: Total de items completados (actividades + mediciones)
  int get totalCompletados => completadas + medicionesConValor;

  /// ✅ NUEVO: Total de items (actividades + mediciones)
  int get totalItems => totalActividades + totalMediciones;

  bool get tieneAlertas => malos > 0 || medicionesCriticas > 0;
}

/// ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Helper para rangos resueltos
class _RangosResueltos {
  final double? minNormal;
  final double? maxNormal;
  final double? minCritico;
  final double? maxCritico;

  _RangosResueltos({
    this.minNormal,
    this.maxNormal,
    this.minCritico,
    this.maxCritico,
  });
}
