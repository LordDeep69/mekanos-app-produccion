import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

// ============================================================================
// ENUMS - Type Safety para estados
// ============================================================================

/// Estados posibles de una orden
enum EstadoOrdenEnum {
  asignada,
  aprobada,
  programada,
  completada,
  enProceso,
  cancelada,
  enEsperaRepuesto,
}

/// Tipos de actividad
enum TipoActividadEnum {
  inspeccion,
  medicion,
  verificacion,
  limpieza,
  ajuste,
  reemplazo,
}

/// Prioridad de orden
enum PrioridadEnum { baja, media, alta, urgente }

/// Tipo de evidencia fotográfica
enum TipoEvidenciaEnum { antes, durante, despues }

/// Tipo de firma
enum TipoFirmaEnum { tecnico, cliente }

// ============================================================================
// TABLAS CATÁLOGO / MAESTRAS
// ============================================================================

/// Estados de orden (catálogo desde el servidor)
class EstadosOrden extends Table {
  IntColumn get id => integer()();
  TextColumn get codigo => text().withLength(max: 50)();
  TextColumn get nombre => text().withLength(max: 100)();
  BoolColumn get esEstadoFinal =>
      boolean().withDefault(const Constant(false))();

  // Sync control
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Tipos de servicio (PREV-A, PREV-B, CORRECTIVO, etc.)
class TiposServicio extends Table {
  IntColumn get id => integer()();
  TextColumn get codigo => text().withLength(max: 50)();
  TextColumn get nombre => text().withLength(max: 150)();
  TextColumn get descripcion => text().nullable()();
  BoolColumn get activo => boolean().withDefault(const Constant(true))();

  // Sync control
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Parámetros de medición (RPM, Voltaje, Temperatura, etc.)
class ParametrosCatalogo extends Table {
  IntColumn get id => integer()();
  TextColumn get codigo => text().withLength(max: 50)();
  TextColumn get nombre => text().withLength(max: 200)();
  TextColumn get unidad => text().withLength(max: 30).nullable()();
  RealColumn get valorMinimoNormal => real().nullable()();
  RealColumn get valorMaximoNormal => real().nullable()();
  RealColumn get valorMinimoAdvertencia => real().nullable()();
  RealColumn get valorMaximoAdvertencia => real().nullable()();
  RealColumn get valorMinimoCritico => real().nullable()();
  RealColumn get valorMaximoCritico => real().nullable()();
  TextColumn get tipoEquipoAplica => text().nullable()(); // Para filtrar en UI

  // Sync control
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Catálogo de actividades (checklist base)
class ActividadesCatalogo extends Table {
  IntColumn get id => integer()();
  TextColumn get codigo => text().withLength(max: 50)();
  TextColumn get descripcion => text()();
  TextColumn get tipoActividad =>
      text().withLength(max: 30)(); // INSPECCION, MEDICION, etc.
  IntColumn get ordenEjecucion => integer().withDefault(const Constant(0))();
  BoolColumn get esObligatoria => boolean().withDefault(const Constant(true))();
  IntColumn get tiempoEstimadoMinutos => integer().nullable()();
  TextColumn get instrucciones => text().nullable()();
  TextColumn get precauciones => text().nullable()();
  IntColumn get idParametroMedicion =>
      integer().nullable().references(ParametrosCatalogo, #id)();
  TextColumn get sistema => text().nullable()(); // Para agrupar en UI
  IntColumn get idTipoServicio =>
      integer().nullable().references(TiposServicio, #id)();

  // Sync control
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Clientes
class Clientes extends Table {
  IntColumn get id => integer()();
  TextColumn get nombre => text().withLength(max: 200)();
  TextColumn get direccion => text().nullable()();
  TextColumn get telefono => text().withLength(max: 50).nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get nit => text().withLength(max: 50).nullable()();
  BoolColumn get activo => boolean().withDefault(const Constant(true))();

  // Sync control
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Equipos
class Equipos extends Table {
  IntColumn get id => integer()();
  TextColumn get codigo => text().withLength(max: 50)();
  TextColumn get nombre => text().withLength(max: 200)();
  TextColumn get marca => text().nullable()();
  TextColumn get modelo => text().nullable()();
  TextColumn get serie => text().nullable()();
  TextColumn get ubicacion => text().nullable()();
  TextColumn get tipoEquipo => text().nullable()(); // GENERADOR, BOMBA, etc.
  IntColumn get idCliente => integer().nullable().references(Clientes, #id)();
  BoolColumn get activo => boolean().withDefault(const Constant(true))();

  // Sync control
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ============================================================================
// TABLAS TRANSACCIONALES
// ============================================================================

/// Órdenes de servicio
class Ordenes extends Table {
  // ID local autoincremental
  IntColumn get idLocal => integer().autoIncrement()();

  // ID del backend (nullable para órdenes creadas offline)
  IntColumn get idBackend => integer().nullable()();

  TextColumn get numeroOrden => text().withLength(max: 50)();
  IntColumn get version => integer().withDefault(const Constant(0))();

  // Foreign Keys
  IntColumn get idEstado => integer().references(EstadosOrden, #id)();
  IntColumn get idCliente => integer().references(Clientes, #id)();
  IntColumn get idEquipo => integer().references(Equipos, #id)();
  IntColumn get idTipoServicio => integer().references(TiposServicio, #id)();

  // Datos de la orden
  TextColumn get prioridad =>
      text().withLength(max: 20).withDefault(const Constant('MEDIA'))();
  DateTimeColumn get fechaProgramada => dateTime().nullable()();
  DateTimeColumn get fechaInicio => dateTime().nullable()();
  DateTimeColumn get fechaFin => dateTime().nullable()();
  TextColumn get descripcionInicial => text().nullable()();
  TextColumn get trabajoRealizado => text().nullable()();
  TextColumn get observacionesTecnico => text().nullable()();

  // URL del PDF generado (se guarda después de finalizar)
  TextColumn get urlPdf => text().nullable()();

  // ✅ FIX: Estadísticas sincronizadas del backend (para órdenes históricas)
  IntColumn get totalActividades => integer().withDefault(const Constant(0))();
  IntColumn get totalMediciones => integer().withDefault(const Constant(0))();
  IntColumn get totalEvidencias => integer().withDefault(const Constant(0))();
  IntColumn get totalFirmas => integer().withDefault(const Constant(0))();

  // ✅ FIX: Desglose de actividades por estado (B/M/C/NA)
  IntColumn get actividadesBuenas => integer().withDefault(const Constant(0))();
  IntColumn get actividadesMalas => integer().withDefault(const Constant(0))();
  IntColumn get actividadesCorregidas =>
      integer().withDefault(const Constant(0))();
  IntColumn get actividadesNA => integer().withDefault(const Constant(0))();

  // ✅ FIX: Desglose de mediciones por estado (Normal/Advertencia/Crítico)
  IntColumn get medicionesNormales =>
      integer().withDefault(const Constant(0))();
  IntColumn get medicionesAdvertencia =>
      integer().withDefault(const Constant(0))();
  IntColumn get medicionesCriticas =>
      integer().withDefault(const Constant(0))();

  // ✅ FIX: Horas como TEXTO PLANO (HH:mm) - sin procesamiento de zona horaria
  TextColumn get horaEntradaTexto => text().nullable()();
  TextColumn get horaSalidaTexto => text().nullable()();

  // Sync control - CRÍTICO para offline-first
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

/// Actividades ejecutadas (checklist con estado)
/// NOTA: Campos desnormalizados (descripcion, sistema, tipoActividad) para
/// evitar JOINs y mejorar rendimiento offline. Se copian del catálogo al iniciar.
class ActividadesEjecutadas extends Table {
  IntColumn get idLocal => integer().autoIncrement()();
  IntColumn get idBackend => integer().nullable()();

  // Foreign Keys
  IntColumn get idOrden => integer().references(Ordenes, #idLocal)();
  IntColumn get idActividadCatalogo =>
      integer().references(ActividadesCatalogo, #id)();

  // Campos desnormalizados del catálogo (snapshot al momento de ejecutar)
  TextColumn get descripcion => text()(); // Copiado de ActividadesCatalogo
  TextColumn get sistema => text().nullable()(); // Para agrupar en UI
  TextColumn get tipoActividad =>
      text().withLength(max: 30)(); // INSPECCION, MEDICION, etc.
  IntColumn get idParametroMedicion =>
      integer().nullable()(); // Si requiere medición
  IntColumn get ordenEjecucion =>
      integer().withDefault(const Constant(0))(); // Para ordenar

  // Estado de ejecución - REGLA DE NEGOCIO: B=Bueno, M=Malo, C=Cambiado, NA=No Aplica
  TextColumn get simbologia =>
      text().withLength(max: 10).nullable()(); // B, M, C, NA
  BoolColumn get completada => boolean().withDefault(const Constant(false))();
  TextColumn get observacion => text().nullable()();
  DateTimeColumn get fechaEjecucion => dateTime().nullable()();

  // Sync control
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

/// Mediciones realizadas
/// ARQUITECTURA SNAPSHOT: Esta tabla es AUTOSUFICIENTE para renderizado offline.
/// Los rangos y unidad se copian del catálogo al crear la medición.
class Mediciones extends Table {
  IntColumn get idLocal => integer().autoIncrement()();
  IntColumn get idBackend => integer().nullable()();

  // Foreign Keys
  IntColumn get idOrden => integer().references(Ordenes, #idLocal)();
  IntColumn get idActividadEjecutada =>
      integer().nullable().references(ActividadesEjecutadas, #idLocal)();
  IntColumn get idParametro => integer().references(ParametrosCatalogo, #id)();

  // ============================================================================
  // SNAPSHOT DEL PARÁMETRO (copiado al crear - NO DEPENDE DE JOIN)
  // ============================================================================
  TextColumn get nombreParametro =>
      text().withLength(max: 200)(); // Snapshot del nombre
  TextColumn get unidadMedida =>
      text().withLength(max: 30)(); // Snapshot de la unidad (V, RPM, PSI, etc)

  // Rangos para semáforo (snapshot del catálogo)
  RealColumn get rangoMinimoNormal => real().nullable()();
  RealColumn get rangoMaximoNormal => real().nullable()();
  RealColumn get rangoMinimoCritico => real().nullable()();
  RealColumn get rangoMaximoCritico => real().nullable()();

  // ============================================================================
  // VALOR CAPTURADO (puede ser null al crear, se llena cuando el técnico mide)
  // ============================================================================
  RealColumn get valor =>
      real().nullable()(); // NULLABLE para crear filas vacías
  TextColumn get estadoValor =>
      text().withLength(max: 20).nullable()(); // NORMAL, ADVERTENCIA, CRITICO
  TextColumn get observacion => text().nullable()();
  DateTimeColumn get fechaMedicion =>
      dateTime().nullable()(); // Null hasta que se mida

  // Sync control
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
}

/// Evidencias fotográficas - MODELO HÍBRIDO (v4)
/// - Si idActividadEjecutada es NULL -> Foto GENERAL (Tab Resumen)
/// - Si tiene valor -> Foto ESPECÍFICA de esa actividad (Tab Checklist)
class Evidencias extends Table {
  IntColumn get idLocal => integer().autoIncrement()();
  IntColumn get idBackend => integer().nullable()();

  // Foreign Keys
  IntColumn get idOrden => integer().references(Ordenes, #idLocal)();

  // ✅ NUEVO: FK opcional para vincular a actividad específica
  IntColumn get idActividadEjecutada =>
      integer().nullable().references(ActividadesEjecutadas, #idLocal)();

  // Datos de la foto
  TextColumn get rutaLocal => text()(); // Path en el dispositivo
  TextColumn get urlRemota =>
      text().nullable()(); // URL en Cloudinary después de sync
  TextColumn get tipoEvidencia =>
      text().withLength(max: 20)(); // ANTES, DURANTE, DESPUES, ACTIVIDAD
  TextColumn get descripcion => text().nullable()();
  DateTimeColumn get fechaCaptura =>
      dateTime().withDefault(currentDateAndTime)();

  // Sync control
  BoolColumn get isDirty =>
      boolean().withDefault(const Constant(true))(); // Por defecto dirty
  BoolColumn get subida => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
}

/// Firmas digitales
class Firmas extends Table {
  IntColumn get idLocal => integer().autoIncrement()();
  IntColumn get idBackend => integer().nullable()();

  // Foreign Key
  IntColumn get idOrden => integer().references(Ordenes, #idLocal)();

  // Datos de la firma
  TextColumn get rutaLocal => text()(); // Path del PNG en dispositivo
  TextColumn get urlRemota => text().nullable()(); // URL después de sync
  TextColumn get tipoFirma => text().withLength(max: 20)(); // TECNICO, CLIENTE
  TextColumn get nombreFirmante => text().nullable()();
  TextColumn get cargoFirmante => text().nullable()();
  TextColumn get documentoFirmante => text().nullable()();
  DateTimeColumn get fechaFirma => dateTime().withDefault(currentDateAndTime)();

  // Sync control
  BoolColumn get isDirty => boolean().withDefault(const Constant(true))();
  BoolColumn get subida => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
}

// ============================================================================
// TABLA DE CONTROL DE SINCRONIZACIÓN
// ============================================================================

/// Control global de sincronización
class SyncStatusEntries extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entidad =>
      text().withLength(max: 50)(); // ordenes, clientes, etc.
  DateTimeColumn get ultimaSync => dateTime().nullable()();
  IntColumn get pendientesSubir => integer().withDefault(const Constant(0))();
  IntColumn get pendientesBajar => integer().withDefault(const Constant(0))();
  TextColumn get ultimoError => text().nullable()();

  @override
  List<Set<Column>> get uniqueKeys => [
    {entidad},
  ];
}

/// Cola de órdenes pendientes de sincronización (modo offline)
/// Almacena el payload completo para retry automático cuando haya conexión
class OrdenesPendientesSync extends Table {
  IntColumn get id => integer().autoIncrement()();

  // Referencias a la orden
  IntColumn get idOrdenLocal => integer()(); // FK lógica a ordenes.idLocal
  IntColumn get idOrdenBackend => integer()(); // ID en el servidor

  // Payload completo para el request
  TextColumn get payloadJson => text()(); // JSON serializado

  // Estado de sincronización
  TextColumn get estadoSync =>
      text().withLength(max: 20)(); // PENDIENTE, EN_PROCESO, ERROR
  IntColumn get intentos => integer().withDefault(const Constant(0))();
  TextColumn get ultimoError => text().nullable()();

  // Timestamps
  DateTimeColumn get fechaCreacion =>
      dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get fechaUltimoIntento => dateTime().nullable()();

  // Una orden solo puede estar una vez en la cola
  @override
  List<Set<Column>> get uniqueKeys => [
    {idOrdenLocal},
  ];
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

@DriftDatabase(
  tables: [
    // Catálogos
    EstadosOrden,
    TiposServicio,
    ParametrosCatalogo,
    ActividadesCatalogo,
    Clientes,
    Equipos,
    // Transaccionales
    Ordenes,
    ActividadesEjecutadas,
    Mediciones,
    Evidencias,
    Firmas,
    // Control
    SyncStatusEntries,
    OrdenesPendientesSync,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 10; // v10: Tabla ordenes_pendientes_sync (modo offline)

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) => m.createAll(),
    onUpgrade: (Migrator m, int from, int to) async {
      // En desarrollo: borrar y recrear tablas afectadas
      if (from < 2) {
        await m.deleteTable('actividades_ejecutadas');
        await m.createTable(actividadesEjecutadas);
      }
      if (from < 3) {
        // RE-INGENIERÍA: Mediciones ahora tiene snapshot completo
        await m.deleteTable('mediciones');
        await m.createTable(mediciones);
      }
      if (from < 4) {
        // v4: Agregar columna idActividadEjecutada a tabla evidencias (modelo híbrido)
        await customStatement(
          'ALTER TABLE evidencias ADD COLUMN id_actividad_ejecutada INTEGER REFERENCES actividades_ejecutadas(id_local)',
        );
      }
      if (from < 5) {
        // v5: Agregar columna urlPdf a tabla ordenes
        await customStatement('ALTER TABLE ordenes ADD COLUMN url_pdf TEXT');
      }
      if (from < 6) {
        // v6: Agregar columnas de estadísticas para órdenes históricas
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN total_actividades INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN total_mediciones INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN total_evidencias INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN total_firmas INTEGER DEFAULT 0',
        );
      }
      if (from < 7) {
        // v7: Agregar desglose de actividades por estado (B/M/C/NA)
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN actividades_buenas INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN actividades_malas INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN actividades_corregidas INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN actividades_n_a INTEGER DEFAULT 0',
        );
      }
      if (from < 8) {
        // v8: Agregar desglose de mediciones por estado (Normal/Advertencia/Crítico)
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN mediciones_normales INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN mediciones_advertencia INTEGER DEFAULT 0',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN mediciones_criticas INTEGER DEFAULT 0',
        );
      }
      if (from < 9) {
        // v9: Horas como TEXTO PLANO (HH:mm) - sin procesamiento de zona horaria
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN hora_entrada_texto TEXT',
        );
        await customStatement(
          'ALTER TABLE ordenes ADD COLUMN hora_salida_texto TEXT',
        );
      }
      if (from < 10) {
        // v10: Tabla para cola de sincronización offline
        await m.createTable(ordenesPendientesSync);
      }
    },
    beforeOpen: (details) async {
      // Habilitar foreign keys
      await customStatement('PRAGMA foreign_keys = ON');
    },
  );

  // ============================================================================
  // MÉTODOS DE ACCESO - CATÁLOGOS
  // ============================================================================

  /// Insertar o actualizar estados de orden
  Future<void> upsertEstadoOrden(EstadosOrdenCompanion estado) async {
    await into(estadosOrden).insertOnConflictUpdate(estado);
  }

  /// Obtener todos los estados de orden
  Future<List<EstadosOrdenData>> getAllEstadosOrden() {
    return select(estadosOrden).get();
  }

  /// Insertar o actualizar tipo de servicio
  Future<void> upsertTipoServicio(TiposServicioCompanion tipo) async {
    await into(tiposServicio).insertOnConflictUpdate(tipo);
  }

  /// Obtener todos los tipos de servicio
  Future<List<TiposServicioData>> getAllTiposServicio() {
    return select(tiposServicio).get();
  }

  /// Insertar o actualizar parámetro de catálogo
  Future<void> upsertParametroCatalogo(
    ParametrosCatalogoCompanion param,
  ) async {
    await into(parametrosCatalogo).insertOnConflictUpdate(param);
  }

  /// Obtener todos los parámetros
  Future<List<ParametrosCatalogoData>> getAllParametros() {
    return select(parametrosCatalogo).get();
  }

  /// Insertar o actualizar actividad de catálogo
  Future<void> upsertActividadCatalogo(ActividadesCatalogoCompanion act) async {
    await into(actividadesCatalogo).insertOnConflictUpdate(act);
  }

  /// Obtener actividades por tipo de servicio
  Future<List<ActividadesCatalogoData>> getActividadesByTipoServicio(
    int idTipoServicio,
  ) {
    return (select(actividadesCatalogo)
          ..where((a) => a.idTipoServicio.equals(idTipoServicio))
          ..orderBy([(a) => OrderingTerm.asc(a.ordenEjecucion)]))
        .get();
  }

  /// Insertar o actualizar cliente
  Future<void> upsertCliente(ClientesCompanion cliente) async {
    await into(clientes).insertOnConflictUpdate(cliente);
  }

  /// Obtener todos los clientes
  Future<List<Cliente>> getAllClientes() {
    return select(clientes).get();
  }

  /// Insertar o actualizar equipo
  Future<void> upsertEquipo(EquiposCompanion equipo) async {
    await into(equipos).insertOnConflictUpdate(equipo);
  }

  /// Obtener equipos por cliente
  Future<List<Equipo>> getEquiposByCliente(int idCliente) {
    return (select(equipos)..where((e) => e.idCliente.equals(idCliente))).get();
  }

  // ============================================================================
  // MÉTODOS DE ACCESO - ÓRDENES
  // ============================================================================

  /// Insertar orden desde sync
  Future<int> insertOrdenFromSync(OrdenesCompanion orden) async {
    return await into(ordenes).insert(orden);
  }

  /// Actualizar orden existente
  Future<bool> updateOrden(OrdenesCompanion orden, int idLocal) async {
    return await (update(
          ordenes,
        )..where((o) => o.idLocal.equals(idLocal))).write(orden) >
        0;
  }

  /// Obtener todas las órdenes
  Future<List<Ordene>> getAllOrdenes() {
    return select(ordenes).get();
  }

  /// Obtener órdenes pendientes de sincronizar (dirty)
  Future<List<Ordene>> getOrdenesDirty() {
    return (select(ordenes)..where((o) => o.isDirty.equals(true))).get();
  }

  /// Obtener orden por ID local
  Future<Ordene?> getOrdenById(int idLocal) {
    return (select(
      ordenes,
    )..where((o) => o.idLocal.equals(idLocal))).getSingleOrNull();
  }

  /// Obtener orden por ID del backend
  Future<Ordene?> getOrdenByBackendId(int idBackend) {
    return (select(
      ordenes,
    )..where((o) => o.idBackend.equals(idBackend))).getSingleOrNull();
  }

  /// Stream de órdenes (reactivo)
  Stream<List<Ordene>> watchAllOrdenes() {
    return select(ordenes).watch();
  }

  // ============================================================================
  // MÉTODOS DE ACCESO - ACTIVIDADES EJECUTADAS
  // ============================================================================

  /// Insertar actividad ejecutada
  Future<int> insertActividadEjecutada(
    ActividadesEjecutadasCompanion act,
  ) async {
    return await into(actividadesEjecutadas).insert(act);
  }

  /// Actualizar actividad ejecutada
  Future<void> updateActividadEjecutada(
    ActividadesEjecutadasCompanion act,
    int idLocal,
  ) async {
    await (update(
      actividadesEjecutadas,
    )..where((a) => a.idLocal.equals(idLocal))).write(act);
  }

  /// Obtener actividades ejecutadas de una orden
  Future<List<ActividadesEjecutada>> getActividadesByOrden(int idOrden) {
    return (select(
      actividadesEjecutadas,
    )..where((a) => a.idOrden.equals(idOrden))).get();
  }

  // ============================================================================
  // MÉTODOS DE ACCESO - MEDICIONES
  // ============================================================================

  /// Insertar medición
  Future<int> insertMedicion(MedicionesCompanion med) async {
    return await into(mediciones).insert(med);
  }

  /// Obtener mediciones de una orden
  Future<List<Medicione>> getMedicionesByOrden(int idOrden) {
    return (select(mediciones)..where((m) => m.idOrden.equals(idOrden))).get();
  }

  // ============================================================================
  // MÉTODOS DE ACCESO - EVIDENCIAS
  // ============================================================================

  /// Insertar evidencia
  Future<int> insertEvidencia(EvidenciasCompanion ev) async {
    return await into(evidencias).insert(ev);
  }

  /// Obtener evidencias de una orden
  Future<List<Evidencia>> getEvidenciasByOrden(int idOrden) {
    return (select(evidencias)..where((e) => e.idOrden.equals(idOrden))).get();
  }

  /// Obtener evidencias pendientes de subir
  Future<List<Evidencia>> getEvidenciasPendientes() {
    return (select(evidencias)..where((e) => e.subida.equals(false))).get();
  }

  // ============================================================================
  // MÉTODOS DE ACCESO - FIRMAS
  // ============================================================================

  /// Insertar firma
  Future<int> insertFirma(FirmasCompanion firma) async {
    return await into(firmas).insert(firma);
  }

  /// Obtener firmas de una orden
  Future<List<Firma>> getFirmasByOrden(int idOrden) {
    return (select(firmas)..where((f) => f.idOrden.equals(idOrden))).get();
  }

  // ============================================================================
  // MÉTODOS DE SYNC STATUS
  // ============================================================================

  /// Actualizar estado de sincronización
  Future<void> updateSyncStatus(
    String entidad, {
    DateTime? ultimaSync,
    int? pendientesSubir,
    int? pendientesBajar,
    String? ultimoError,
  }) async {
    final existing = await (select(
      syncStatusEntries,
    )..where((s) => s.entidad.equals(entidad))).getSingleOrNull();

    if (existing != null) {
      await (update(
        syncStatusEntries,
      )..where((s) => s.entidad.equals(entidad))).write(
        SyncStatusEntriesCompanion(
          ultimaSync: ultimaSync != null
              ? Value(ultimaSync)
              : const Value.absent(),
          pendientesSubir: pendientesSubir != null
              ? Value(pendientesSubir)
              : const Value.absent(),
          pendientesBajar: pendientesBajar != null
              ? Value(pendientesBajar)
              : const Value.absent(),
          ultimoError: ultimoError != null
              ? Value(ultimoError)
              : const Value.absent(),
        ),
      );
    } else {
      await into(syncStatusEntries).insert(
        SyncStatusEntriesCompanion.insert(
          entidad: entidad,
          ultimaSync: Value(ultimaSync),
          pendientesSubir: Value(pendientesSubir ?? 0),
          pendientesBajar: Value(pendientesBajar ?? 0),
          ultimoError: Value(ultimoError),
        ),
      );
    }
  }

  /// Obtener estado de sync de una entidad
  Future<SyncStatusEntry?> getSyncStatus(String entidad) {
    return (select(
      syncStatusEntries,
    )..where((s) => s.entidad.equals(entidad))).getSingleOrNull();
  }

  // ============================================================================
  // MÉTODOS WATCH - PARA UI REACTIVA
  // ============================================================================

  /// Observar órdenes pendientes (no finalizadas)
  Stream<List<Ordene>> watchOrdenesPendientes() {
    return (select(ordenes)..where(
          (o) => o.idEstado.isNotIn([5, 6, 7]),
        )) // Excluir COMPLETADA, CERRADA, CANCELADA
        .watch();
  }

  /// Observar órdenes por estado específico
  Stream<List<Ordene>> watchOrdenesPorEstado(int idEstado) {
    return (select(ordenes)..where((o) => o.idEstado.equals(idEstado))).watch();
  }

  /// Obtener estado de orden por ID
  Future<EstadosOrdenData?> getEstadoOrdenById(int id) {
    return (select(
      estadosOrden,
    )..where((e) => e.id.equals(id))).getSingleOrNull();
  }

  /// Obtener cliente por ID
  Future<Cliente?> getClienteById(int id) {
    return (select(clientes)..where((c) => c.id.equals(id))).getSingleOrNull();
  }

  /// Obtener equipo por ID
  Future<Equipo?> getEquipoById(int id) {
    return (select(equipos)..where((e) => e.id.equals(id))).getSingleOrNull();
  }

  /// Obtener tipo de servicio por ID
  Future<TiposServicioData?> getTipoServicioById(int id) {
    return (select(
      tiposServicio,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  // ============================================================================
  // MÉTODOS DE ACCESO - COLA SYNC OFFLINE
  // ============================================================================

  /// Insertar orden en cola de sincronización pendiente
  Future<int> insertOrdenPendienteSync({
    required int idOrdenLocal,
    required int idOrdenBackend,
    required String payloadJson,
  }) async {
    return await into(ordenesPendientesSync).insert(
      OrdenesPendientesSyncCompanion.insert(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: idOrdenBackend,
        payloadJson: payloadJson,
        estadoSync: 'PENDIENTE',
      ),
    );
  }

  /// Obtener todas las órdenes pendientes de sincronización
  Future<List<OrdenesPendientesSyncData>> getOrdenesPendientesSync() {
    return (select(ordenesPendientesSync)
          ..where(
            (o) =>
                o.estadoSync.equals('PENDIENTE') |
                (o.estadoSync.equals('ERROR') &
                    o.intentos.isSmallerThanValue(5)),
          )
          ..orderBy([(o) => OrderingTerm.asc(o.fechaCreacion)]))
        .get();
  }

  /// Obtener Y marcar órdenes pendientes como EN_PROCESO atómicamente
  /// Esto previene race conditions donde múltiples procesos obtienen la misma orden
  Future<List<OrdenesPendientesSyncData>> getYMarcarOrdenesPendientesSync() {
    return transaction(() async {
      // 1. Obtener órdenes pendientes
      final pendientes =
          await (select(ordenesPendientesSync)
                ..where(
                  (o) =>
                      o.estadoSync.equals('PENDIENTE') |
                      (o.estadoSync.equals('ERROR') &
                          o.intentos.isSmallerThanValue(5)),
                )
                ..orderBy([(o) => OrderingTerm.asc(o.fechaCreacion)]))
              .get();

      // 2. Marcar todas como EN_PROCESO inmediatamente
      for (final orden in pendientes) {
        await (update(
          ordenesPendientesSync,
        )..where((o) => o.idOrdenLocal.equals(orden.idOrdenLocal))).write(
          OrdenesPendientesSyncCompanion(
            estadoSync: const Value('EN_PROCESO'),
            fechaUltimoIntento: Value(DateTime.now()),
          ),
        );
      }

      return pendientes;
    });
  }

  /// Obtener conteo de órdenes pendientes de sync
  Future<int> countOrdenesPendientesSync() async {
    final resultado =
        await (select(ordenesPendientesSync)..where(
              (o) =>
                  o.estadoSync.equals('PENDIENTE') |
                  (o.estadoSync.equals('ERROR') &
                      o.intentos.isSmallerThanValue(5)),
            ))
            .get();
    return resultado.length;
  }

  /// Marcar orden como en proceso de sincronización
  Future<void> marcarOrdenEnProcesoSync(int idOrdenLocal) async {
    await (update(
      ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).write(
      OrdenesPendientesSyncCompanion(
        estadoSync: const Value('EN_PROCESO'),
        fechaUltimoIntento: Value(DateTime.now()),
      ),
    );
  }

  /// Marcar orden como error de sincronización
  Future<void> marcarOrdenErrorSync(int idOrdenLocal, String error) async {
    // Primero obtener intentos actuales
    final orden = await (select(
      ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).getSingleOrNull();

    if (orden != null) {
      await (update(
        ordenesPendientesSync,
      )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).write(
        OrdenesPendientesSyncCompanion(
          estadoSync: const Value('ERROR'),
          intentos: Value(orden.intentos + 1),
          ultimoError: Value(error),
          fechaUltimoIntento: Value(DateTime.now()),
        ),
      );
    }
  }

  /// Eliminar orden de la cola (sync exitoso)
  Future<void> eliminarOrdenPendienteSync(int idOrdenLocal) async {
    await (delete(
      ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).go();
  }

  /// Verificar si una orden está en cola de sync
  Future<bool> existeOrdenEnColaPendiente(int idOrdenLocal) async {
    final orden = await (select(
      ordenesPendientesSync,
    )..where((o) => o.idOrdenLocal.equals(idOrdenLocal))).getSingleOrNull();
    return orden != null;
  }

  /// Stream reactivo de conteo de pendientes (para badge en UI)
  Stream<int> watchCountOrdenesPendientesSync() {
    return (select(ordenesPendientesSync)..where(
          (o) =>
              o.estadoSync.equals('PENDIENTE') |
              (o.estadoSync.equals('ERROR') & o.intentos.isSmallerThanValue(5)),
        ))
        .watch()
        .map((list) => list.length);
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /// Limpiar toda la base de datos (para logout o reset)
  Future<void> clearAllData() async {
    await delete(firmas).go();
    await delete(evidencias).go();
    await delete(mediciones).go();
    await delete(actividadesEjecutadas).go();
    await delete(ordenes).go();
    await delete(equipos).go();
    await delete(clientes).go();
    await delete(actividadesCatalogo).go();
    await delete(parametrosCatalogo).go();
    await delete(tiposServicio).go();
    await delete(estadosOrden).go();
    await delete(syncStatusEntries).go();
  }

  /// Contar registros pendientes de sincronizar
  Future<int> countPendingSync() async {
    final ordenesDirty = await getOrdenesDirty();
    final evidenciasPendientes = await getEvidenciasPendientes();
    return ordenesDirty.length + evidenciasPendientes.length;
  }
}

// ============================================================================
// CONNECTION
// ============================================================================

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'mekanos_local.db'));
    return NativeDatabase.createInBackground(file);
  });
}
