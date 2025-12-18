import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';

/// Provider para el servicio de ejecución
final ejecucionServiceProvider = Provider<EjecucionService>((ref) {
  final db = ref.watch(databaseProvider);
  return EjecucionService(db);
});

/// Servicio de Ejecución - RUTA 6
/// Maneja la lógica transaccional de iniciar y ejecutar órdenes de servicio
class EjecucionService {
  final AppDatabase _db;

  EjecucionService(this._db);

  /// Inicia la ejecución de una orden
  ///
  /// REQUISITOS TRANSACCIONALES:
  /// 1. Idempotencia: Si ya existen actividades, NO hace nada
  /// 2. Clonado: Copia actividades del catálogo a la tabla transaccional
  /// 3. Estado: Actualiza la orden a EN_PROCESO
  ///
  /// Retorna un [InicioEjecucionResult] con los detalles de la operación
  Future<InicioEjecucionResult> iniciarEjecucion(int idOrdenLocal) async {
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
      final actividadesExistentes = await _db.getActividadesByOrden(
        idOrdenLocal,
      );
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
          int medicionesReparadas = 0;
          for (final act in actividadesConMedicion) {
            final parametro =
                await (_db.select(_db.parametrosCatalogo)
                      ..where((p) => p.id.equals(act.idParametroMedicion!)))
                    .getSingleOrNull();

            if (parametro != null) {
              await _db.insertMedicion(
                MedicionesCompanion.insert(
                  idOrden: idOrdenLocal,
                  idActividadEjecutada: Value(act.idLocal),
                  idParametro: parametro.id,
                  nombreParametro: parametro.nombre,
                  unidadMedida: parametro.unidad ?? '',
                  rangoMinimoNormal: Value(parametro.valorMinimoNormal),
                  rangoMaximoNormal: Value(parametro.valorMaximoNormal),
                  rangoMinimoCritico: Value(parametro.valorMinimoCritico),
                  rangoMaximoCritico: Value(parametro.valorMaximoCritico),
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

      // 4. Consultar actividades del catálogo para el tipo de servicio
      final actividadesCatalogo =
          await (_db.select(_db.actividadesCatalogo)
                ..where((a) => a.idTipoServicio.equals(orden.idTipoServicio))
                ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]))
              .get();

      if (actividadesCatalogo.isEmpty) {
        return InicioEjecucionResult(
          exito: false,
          error:
              'No hay actividades en catálogo para tipo de servicio: ${orden.idTipoServicio}',
        );
      }

      // 5. Clonar actividades del catálogo a la tabla transaccional
      // Y crear mediciones con SNAPSHOT completo para actividades de medición
      int instanciadas = 0;
      int medicionesCreadas = 0;
      String? primeraActividadNombre;

      for (final actCatalogo in actividadesCatalogo) {
        // Determinar el sistema (usar GENERAL si es null)
        final sistemaNombre = actCatalogo.sistema ?? 'GENERAL';

        // Insertar actividad ejecutada y obtener su ID
        final idActividadEjecutada = await _db.insertActividadEjecutada(
          ActividadesEjecutadasCompanion.insert(
            idOrden: idOrdenLocal,
            idActividadCatalogo: actCatalogo.id,
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
        // ==================================================================
        if (actCatalogo.idParametroMedicion != null) {
          // Buscar el parámetro en el catálogo para copiar sus datos
          final parametro =
              await (_db.select(_db.parametrosCatalogo)..where(
                    (p) => p.id.equals(actCatalogo.idParametroMedicion!),
                  ))
                  .getSingleOrNull();

          if (parametro != null) {
            // Crear fila de medición VACÍA con SNAPSHOT de rangos y unidad
            await _db.insertMedicion(
              MedicionesCompanion.insert(
                idOrden: idOrdenLocal,
                idActividadEjecutada: Value(idActividadEjecutada),
                idParametro: parametro.id,
                // SNAPSHOT: Copiar datos del parámetro para offline
                nombreParametro: parametro.nombre,
                unidadMedida: parametro.unidad ?? '',
                rangoMinimoNormal: Value(parametro.valorMinimoNormal),
                rangoMaximoNormal: Value(parametro.valorMaximoNormal),
                rangoMinimoCritico: Value(parametro.valorMinimoCritico),
                rangoMaximoCritico: Value(parametro.valorMaximoCritico),
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

  /// Actualiza el estado de una actividad ejecutada
  ///
  /// [simbologia]: B=Bueno, M=Malo, C=Cambiado, NA=No Aplica
  ///
  /// Persiste INMEDIATAMENTE en drift (sin botón guardar)
  Future<bool> marcarActividad({
    required int idActividadLocal,
    required String simbologia,
    String? observacion,
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
  Future<List<Medicione>> getMedicionesByOrdenLocal(int idOrdenLocal) async {
    return await (_db.select(_db.mediciones)
          ..where((m) => m.idOrden.equals(idOrdenLocal))
          ..orderBy([(m) => OrderingTerm.asc(m.idLocal)]))
        .get();
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
  /// IMPORTANTE: Excluye actividades tipo MEDICION (se muestran solo en tab Mediciones)
  Future<Map<String, List<ActividadesEjecutada>>> getActividadesAgrupadas(
    int idOrdenLocal,
  ) async {
    final actividades =
        await (_db.select(_db.actividadesEjecutadas)
              ..where((a) => a.idOrden.equals(idOrdenLocal))
              // EXCLUIR tipo MEDICION - se muestran en tab separado
              ..where((a) => a.tipoActividad.equals('MEDICION').not())
              ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]))
            .get();

    final Map<String, List<ActividadesEjecutada>> grupos = {};
    for (final act in actividades) {
      final sistema = act.sistema ?? 'GENERAL';
      grupos.putIfAbsent(sistema, () => []);
      grupos[sistema]!.add(act);
    }
    return grupos;
  }

  /// Obtiene las actividades que requieren medición
  Future<List<ActividadesEjecutada>> getActividadesConMedicion(
    int idOrdenLocal,
  ) async {
    return await (_db.select(_db.actividadesEjecutadas)
          ..where((a) => a.idOrden.equals(idOrdenLocal))
          ..where((a) => a.idParametroMedicion.isNotNull())
          ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]))
        .get();
  }

  /// Obtiene el resumen de progreso de la ejecución
  /// IMPORTANTE: Excluye actividades tipo MEDICION para evitar doble conteo
  Future<ResumenEjecucion> getResumenEjecucion(int idOrdenLocal) async {
    // ✅ FIX: Filtrar actividades tipo MEDICION (se cuentan en tabla mediciones)
    final todasActividades = await _db.getActividadesByOrden(idOrdenLocal);
    final actividades = todasActividades
        .where((a) => a.tipoActividad != 'MEDICION')
        .toList();
    final mediciones = await _db.getMedicionesByOrden(idOrdenLocal);

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
