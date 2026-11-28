import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
// ignore: depend_on_referenced_packages
import 'package:sqlite3/sqlite3.dart' as raw_sqlite;

import 'package:mekanos_mobile/core/api/api_client.dart';
import 'package:mekanos_mobile/core/database/app_database.dart';
import 'package:mekanos_mobile/core/sync/smart_sync_service.dart';
import 'package:mekanos_mobile/core/sync/sync_lifecycle_manager.dart';

class _MockAdapter implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions options) handler;

  _MockAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) => handler(options);

  @override
  void close({bool force = false}) {}
}

class _FakeApiClient implements ApiClient {
  @override
  late final Dio dio;

  _FakeApiClient(this.dio);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  group('Fase 0 · Drift v20 (WAL, migración v19 -> v20, sync_outbox y protecciones)', () {
    test('Instalación fresca v20 activa WAL, busy_timeout=10000, foreign_keys y crea idx_ordenes_id_backend_unique', () async {
      final tempDir = await Directory.systemTemp.createTemp('eam_v20_fresh_');
      final dbFile = File('${tempDir.path}/fresh_v20.sqlite');
      addTearDown(() async {
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      });

      final db = AppDatabase(executor: NativeDatabase(dbFile));
      addTearDown(() async => db.close());

      // Trigger beforeOpen + onCreate
      await db.getAllEstadosOrden();

      final journalMode = (await db.customSelect('PRAGMA journal_mode').getSingle())
          .data
          .values
          .first
          .toString()
          .toLowerCase();
      final busyTimeout = (await db.customSelect('PRAGMA busy_timeout').getSingle())
          .data
          .values
          .first;
      final foreignKeys = (await db.customSelect('PRAGMA foreign_keys').getSingle())
          .data
          .values
          .first;

      expect(journalMode, 'wal');
      expect(busyTimeout, 10000);
      expect(foreignKeys, 1);

      final indexes = await db
          .customSelect("SELECT name FROM sqlite_master WHERE type = 'index'")
          .get();
      final indexNames = indexes.map((r) => r.read<String>('name')).toSet();

      expect(indexNames, contains('idx_ordenes_id_backend_unique'));
      expect(indexNames, contains('idx_sync_outbox_pending_entity'));
      expect(indexNames, contains('idx_sync_outbox_lane_status'));
      expect(indexNames, contains('idx_sync_outbox_orden_status'));
    });

    test('Migración real v19 -> v20 preserva datos previos, añade columnas v20 y habilita sync_outbox coalescing', () async {
      final tempDir = await Directory.systemTemp.createTemp('eam_v19_to_v20_');
      final dbFile = File('${tempDir.path}/legacy_v19.sqlite');
      addTearDown(() async {
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      });

      // 1. Sembrar una BD SQLite con esquema v19 (sin columnas v20 ni sync_outbox)
      final legacy = raw_sqlite.sqlite3.open(dbFile.path);
      legacy.execute('''
        CREATE TABLE estados_orden (
          id INTEGER NOT NULL PRIMARY KEY,
          codigo TEXT NOT NULL,
          nombre TEXT NOT NULL,
          es_estado_final INTEGER NOT NULL DEFAULT 0,
          last_synced_at INTEGER
        );
        CREATE TABLE clientes (
          id INTEGER NOT NULL PRIMARY KEY,
          nombre TEXT NOT NULL,
          direccion TEXT, telefono TEXT, email TEXT, nit TEXT,
          activo INTEGER NOT NULL DEFAULT 1,
          last_synced_at INTEGER
        );
        CREATE TABLE equipos (
          id INTEGER NOT NULL PRIMARY KEY,
          codigo TEXT NOT NULL, nombre TEXT NOT NULL,
          marca TEXT, modelo TEXT, serie TEXT, ubicacion TEXT, tipo_equipo TEXT,
          id_cliente INTEGER REFERENCES clientes(id),
          activo INTEGER NOT NULL DEFAULT 1,
          config_parametros TEXT,
          last_synced_at INTEGER
        );
        CREATE TABLE tipos_servicio (
          id INTEGER NOT NULL PRIMARY KEY,
          codigo TEXT NOT NULL, nombre TEXT NOT NULL, descripcion TEXT,
          activo INTEGER NOT NULL DEFAULT 1,
          last_synced_at INTEGER
        );
        CREATE TABLE ordenes_equipos (
          id_orden_equipo INTEGER NOT NULL PRIMARY KEY,
          id_orden_servicio INTEGER NOT NULL,
          id_equipo INTEGER NOT NULL,
          orden_secuencia INTEGER NOT NULL DEFAULT 1,
          nombre_sistema TEXT, codigo_equipo TEXT, nombre_equipo TEXT,
          estado TEXT NOT NULL DEFAULT 'PENDIENTE',
          fecha_inicio INTEGER, fecha_fin INTEGER, observaciones TEXT,
          last_synced_at INTEGER
        );
        CREATE TABLE actividades_catalogo (
          id INTEGER NOT NULL PRIMARY KEY,
          codigo TEXT NOT NULL, descripcion TEXT NOT NULL,
          id_tipo_servicio INTEGER NOT NULL REFERENCES tipos_servicio(id),
          tipo_actividad TEXT NOT NULL,
          orden_ejecucion INTEGER NOT NULL DEFAULT 0,
          sistema TEXT, id_parametro_medicion INTEGER,
          es_obligatoria INTEGER NOT NULL DEFAULT 1,
          naturaleza_personalizada TEXT,
          tipo_control_input TEXT NOT NULL DEFAULT 'ESCALA_ESTADO',
          config_input_json TEXT, rol_semantico TEXT,
          last_synced_at INTEGER
        );
        CREATE TABLE parametros_catalogo (
          id INTEGER NOT NULL PRIMARY KEY,
          codigo TEXT NOT NULL, nombre TEXT NOT NULL, unidad TEXT NOT NULL,
          valor_minimo_normal REAL, valor_maximo_normal REAL,
          valor_minimo_critico REAL, valor_maximo_critico REAL,
          last_synced_at INTEGER
        );
        CREATE TABLE pendientes_catalogo (
          id INTEGER NOT NULL PRIMARY KEY,
          codigo TEXT, descripcion TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT 'GENERAL',
          id_tipo_equipo INTEGER, activo INTEGER NOT NULL DEFAULT 1,
          orden_visual INTEGER NOT NULL DEFAULT 0, last_synced_at INTEGER
        );
        CREATE TABLE ordenes (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_backend INTEGER,
          numero_orden TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 0,
          id_estado INTEGER NOT NULL REFERENCES estados_orden(id),
          id_cliente INTEGER NOT NULL REFERENCES clientes(id),
          id_equipo INTEGER NOT NULL REFERENCES equipos(id),
          id_tipo_servicio INTEGER NOT NULL REFERENCES tipos_servicio(id),
          prioridad TEXT NOT NULL DEFAULT 'MEDIA',
          fecha_programada INTEGER, fecha_inicio INTEGER, fecha_fin INTEGER,
          descripcion_inicial TEXT, trabajo_realizado TEXT, observaciones_tecnico TEXT,
          url_pdf TEXT,
          total_actividades INTEGER NOT NULL DEFAULT 0,
          total_mediciones INTEGER NOT NULL DEFAULT 0,
          total_evidencias INTEGER NOT NULL DEFAULT 0,
          total_firmas INTEGER NOT NULL DEFAULT 0,
          actividades_buenas INTEGER NOT NULL DEFAULT 0,
          actividades_malas INTEGER NOT NULL DEFAULT 0,
          actividades_corregidas INTEGER NOT NULL DEFAULT 0,
          actividades_n_a INTEGER NOT NULL DEFAULT 0,
          mediciones_normales INTEGER NOT NULL DEFAULT 0,
          mediciones_advertencia INTEGER NOT NULL DEFAULT 0,
          mediciones_criticas INTEGER NOT NULL DEFAULT 0,
          hora_entrada_texto TEXT, hora_salida_texto TEXT, razon_falla TEXT,
          permite_edicion_tecnico INTEGER NOT NULL DEFAULT 0,
          is_dirty INTEGER NOT NULL DEFAULT 0,
          last_synced_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE actividades_plan (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_orden INTEGER NOT NULL REFERENCES ordenes(id_local),
          id_actividad_catalogo INTEGER NOT NULL REFERENCES actividades_catalogo(id),
          orden_secuencia INTEGER NOT NULL DEFAULT 1,
          origen TEXT NOT NULL DEFAULT 'ADMIN',
          es_obligatoria INTEGER NOT NULL DEFAULT 1,
          last_synced_at INTEGER
        );
        CREATE TABLE actividades_ejecutadas (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_backend INTEGER,
          id_orden INTEGER NOT NULL REFERENCES ordenes(id_local),
          id_actividad_catalogo INTEGER NOT NULL REFERENCES actividades_catalogo(id),
          id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo),
          descripcion TEXT NOT NULL, sistema TEXT, tipo_actividad TEXT NOT NULL,
          id_parametro_medicion INTEGER, orden_ejecucion INTEGER NOT NULL DEFAULT 0,
          simbologia TEXT, completada INTEGER NOT NULL DEFAULT 0,
          observacion TEXT, observacion_tecnico TEXT, respuesta_json TEXT,
          fecha_ejecucion INTEGER,
          is_dirty INTEGER NOT NULL DEFAULT 0, last_synced_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE mediciones (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_backend INTEGER,
          id_orden INTEGER NOT NULL REFERENCES ordenes(id_local),
          id_actividad_ejecutada INTEGER REFERENCES actividades_ejecutadas(id_local),
          id_parametro INTEGER NOT NULL REFERENCES parametros_catalogo(id),
          id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo),
          nombre_parametro TEXT NOT NULL, unidad_medida TEXT NOT NULL,
          rango_minimo_normal REAL, rango_maximo_normal REAL,
          rango_minimo_critico REAL, rango_maximo_critico REAL,
          valor REAL, estado_valor TEXT, observacion TEXT, fecha_medicion INTEGER,
          is_dirty INTEGER NOT NULL DEFAULT 0, last_synced_at INTEGER
        );
        CREATE TABLE evidencias (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_backend INTEGER,
          id_orden INTEGER NOT NULL REFERENCES ordenes(id_local),
          id_actividad_ejecutada INTEGER REFERENCES actividades_ejecutadas(id_local),
          id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo),
          ruta_local TEXT NOT NULL, url_remota TEXT,
          tipo_evidencia TEXT NOT NULL, descripcion TEXT,
          fecha_captura INTEGER NOT NULL DEFAULT 0,
          is_dirty INTEGER NOT NULL DEFAULT 1, subida INTEGER NOT NULL DEFAULT 0,
          last_synced_at INTEGER
        );
        CREATE TABLE firmas (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_backend INTEGER,
          id_orden INTEGER NOT NULL REFERENCES ordenes(id_local),
          ruta_local TEXT NOT NULL, url_remota TEXT,
          tipo_firma TEXT NOT NULL, nombre_firmante TEXT,
          cargo_firmante TEXT, documento_firmante TEXT,
          fecha_firma INTEGER NOT NULL DEFAULT 0,
          is_dirty INTEGER NOT NULL DEFAULT 1, subida INTEGER NOT NULL DEFAULT 0,
          last_synced_at INTEGER
        );
        CREATE TABLE ordenes_pendientes (
          id_local INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_backend INTEGER,
          id_orden INTEGER NOT NULL REFERENCES ordenes(id_local),
          id_orden_backend INTEGER, id_cliente INTEGER, id_equipo INTEGER,
          id_orden_equipo INTEGER, id_pendiente_catalogo INTEGER,
          descripcion TEXT NOT NULL, origen TEXT NOT NULL DEFAULT 'CATALOGO',
          prioridad TEXT NOT NULL DEFAULT 'NORMAL',
          estado TEXT NOT NULL DEFAULT 'PENDIENTE',
          observaciones TEXT, fecha_creacion INTEGER NOT NULL DEFAULT 0,
          is_dirty INTEGER NOT NULL DEFAULT 1, last_synced_at INTEGER
        );
        CREATE TABLE sync_status_entries (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          entidad TEXT NOT NULL UNIQUE,
          ultima_sync INTEGER,
          pendientes_subir INTEGER NOT NULL DEFAULT 0,
          pendientes_bajar INTEGER NOT NULL DEFAULT 0,
          ultimo_error TEXT
        );
        CREATE TABLE ordenes_pendientes_sync (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          id_orden_local INTEGER NOT NULL UNIQUE,
          id_orden_backend INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          estado_sync TEXT NOT NULL,
          intentos INTEGER NOT NULL DEFAULT 0,
          ultimo_error TEXT,
          fecha_creacion INTEGER NOT NULL DEFAULT 0,
          fecha_ultimo_intento INTEGER
        );

        INSERT INTO estados_orden (id, codigo, nombre, es_estado_final) VALUES (2, 'EN_PROCESO', 'En Proceso', 0);
        INSERT INTO clientes (id, nombre) VALUES (10, 'Cliente Legacy');
        INSERT INTO equipos (id, codigo, nombre, id_cliente) VALUES (20, 'EQ-20', 'Planta Legacy', 10);
        INSERT INTO tipos_servicio (id, codigo, nombre) VALUES (30, 'PREV_A', 'Preventivo A');
        INSERT INTO ordenes (id_local, id_backend, numero_orden, id_estado, id_cliente, id_equipo, id_tipo_servicio, is_dirty)
          VALUES (1, 777, 'OS-LEGACY-777', 2, 10, 20, 30, 1);
        INSERT INTO ordenes_pendientes (id_orden, id_orden_backend, descripcion)
          VALUES (1, 777, 'Cambiar correa');
        PRAGMA user_version = 19;
      ''');
      legacy.dispose();

      // 2. Abrir con AppDatabase v20 -> dispara onUpgrade(19 -> 20)
      final db = AppDatabase(executor: NativeDatabase(dbFile));
      addTearDown(() async => db.close());

      final ordenMigrada = await db.getOrdenByBackendId(777);
      expect(ordenMigrada, isNotNull);
      expect(ordenMigrada!.numeroOrden, 'OS-LEGACY-777');
      expect(ordenMigrada.localVersion, 0);
      expect(ordenMigrada.syncedVersion, 0);
      expect(ordenMigrada.executionSyncVersion, 0);

      // 3. Coalescing en sync_outbox: 2 mutaciones sobre el mismo entityClientUuid producen 1 sola fila con versión 2
      await db.enqueueOrCoalesceOutbox(
        idOrdenLocal: 1,
        idOrdenBackend: 777,
        lane: 'METADATA',
        entityType: 'ACTIVIDAD',
        entityClientUuid: '0195c8e0-aaaa-7000-8000-000000000001',
        targetVersion: 1,
        payloadJson: '{"estado":"B"}',
      );
      await db.enqueueOrCoalesceOutbox(
        idOrdenLocal: 1,
        idOrdenBackend: 777,
        lane: 'METADATA',
        entityType: 'ACTIVIDAD',
        entityClientUuid: '0195c8e0-aaaa-7000-8000-000000000001',
        targetVersion: 2,
        payloadJson: '{"estado":"M"}',
      );

      final outboxItems = await db.getOutboxByOrden(1);
      expect(outboxItems, hasLength(1));
      expect(outboxItems.first.targetVersion, 2);
      expect(outboxItems.first.payloadJson, '{"estado":"M"}');
      expect(await db.hasPendingOutboxForOrden(1), isTrue);

      // 4. Purga con pendientes y sync_outbox NO debe lanzar FOREIGN KEY constraint failed
      await db.eliminarOrdenCompletaPorIdLocal(1, idBackend: 777);
      expect(await db.getOrdenByBackendId(777), isNull);
      expect(await db.hasPendingOutboxForOrden(1), isFalse);
      expect(await db.getPendientesByOrden(1), isEmpty);
    });

    test('SmartSyncService protege ordenes isDirty contra revertir estado y persiste actividadesPlan', () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      addTearDown(() async => db.close());

      // Preparar estados y catálogo de actividades
      await db.upsertEstadoOrden(
        EstadosOrdenCompanion.insert(
          id: const Value(1),
          codigo: 'ASIGNADA',
          nombre: 'Asignada',
        ),
      );
      await db.upsertEstadoOrden(
        EstadosOrdenCompanion.insert(
          id: const Value(2),
          codigo: 'EN_PROCESO',
          nombre: 'En Proceso',
        ),
      );
      await db.upsertTipoServicio(
        TiposServicioCompanion.insert(
          id: const Value(5),
          codigo: 'PREV',
          nombre: 'Preventivo',
        ),
      );
      await db.upsertActividadCatalogo(
        ActividadesCatalogoCompanion.insert(
          id: const Value(101),
          codigo: 'ACT-101',
          descripcion: 'Revisar nivel de aceite',
          idTipoServicio: const Value(5),
          tipoActividad: 'INSPECCION',
        ),
      );

      // Orden #8001 iniciada OFFLINE (EN_PROCESO + isDirty = true)
      await db.into(db.ordenes).insert(
            OrdenesCompanion.insert(
              idBackend: const Value(8001),
              numeroOrden: 'OS-OFFLINE-8001',
              idEstado: 2, // EN_PROCESO local
              idCliente: 1,
              idEquipo: 1,
              idTipoServicio: 5,
              isDirty: const Value(true),
            ),
          );

      final dio = Dio(BaseOptions(baseUrl: 'http://fake.local/api'));
      dio.httpClientAdapter = _MockAdapter((options) async {
        if (options.path.contains('/sync/compare/')) {
          return ResponseBody.fromString(
            jsonEncode({
              'serverTimestamp': '2026-11-28T04:00:00Z',
              'ordenes': [
                {
                  'id': 8001,
                  'numeroOrden': 'OS-OFFLINE-8001',
                  'estadoId': 1,
                  'estadoCodigo': 'ASIGNADA',
                  'fechaModificacion': '2026-11-28T04:00:00Z',
                  'esEstadoFinal': false,
                  'permiteEdicionTecnico': false,
                },
                {
                  'id': 8002,
                  'numeroOrden': 'OS-NUEVA-8002',
                  'estadoId': 1,
                  'estadoCodigo': 'ASIGNADA',
                  'fechaModificacion': '2026-11-28T04:00:00Z',
                  'esEstadoFinal': false,
                  'permiteEdicionTecnico': false,
                },
              ],
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        if (options.path.contains('/sync/orden/8002')) {
          return ResponseBody.fromString(
            jsonEncode({
              'idOrdenServicio': 8002,
              'numeroOrden': 'OS-NUEVA-8002',
              'codigoEstado': 'ASIGNADA',
              'idCliente': 1,
              'nombreCliente': 'Cliente Demo',
              'idEquipo': 1,
              'codigoEquipo': 'EQ-001',
              'nombreEquipo': 'Planta Demo',
              'idTipoServicio': 5,
              'codigoTipoServicio': 'PREV',
              'nombreTipoServicio': 'Preventivo',
              'actividadesPlan': [
                {
                  'idActividadCatalogo': 101,
                  'ordenSecuencia': 1,
                  'origen': 'ADMIN',
                  'esObligatoria': true,
                },
              ],
              'ordenesEquipos': [],
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString('{}', 404);
      });

      final smartSync = SmartSyncService(_FakeApiClient(dio), db);
      final result = await smartSync.sincronizarInteligente(10);

      expect(result.success, isTrue);

      // 1. La orden 8001 (isDirty=true) conservó EN_PROCESO (idEstado=2) y NO fue revertida a ASIGNADA (1)
      final orden8001 = await db.getOrdenByBackendId(8001);
      expect(orden8001, isNotNull);
      expect(orden8001!.idEstado, 2);
      expect(orden8001.isDirty, isTrue);

      // 2. La orden nueva 8002 persistió su actividadesPlan en Drift
      final orden8002 = await db.getOrdenByBackendId(8002);
      expect(orden8002, isNotNull);
      final plan8002 = await db.getPlanActividadesByOrden(orden8002!.idLocal);
      expect(plan8002, hasLength(1));
      expect(plan8002.first.idActividadCatalogo, 101);
    });

    test('syncLifecycleManagerProvider persiste sin autoDispose tras ref.read', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final manager1 = container.read(syncLifecycleManagerProvider(42));
      await Future<void>.delayed(Duration.zero);
      final manager2 = container.read(syncLifecycleManagerProvider(42));

      expect(identical(manager1, manager2), isTrue);
    });
  });
}
