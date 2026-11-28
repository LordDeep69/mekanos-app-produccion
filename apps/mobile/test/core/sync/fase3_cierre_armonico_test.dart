import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/core/api/api_client.dart';
import 'package:mekanos_mobile/core/database/app_database.dart';
import 'package:mekanos_mobile/core/sync/connectivity_service.dart';
import 'package:mekanos_mobile/core/sync/delta_outbox_service.dart';
import 'package:mekanos_mobile/core/sync/offline_sync_service.dart';
import 'package:mekanos_mobile/core/sync/smart_sync_service.dart';
import 'package:mekanos_mobile/core/sync/sync_progress.dart';
import 'package:mekanos_mobile/core/sync/sync_upload_service.dart';
import 'package:mekanos_mobile/features/orders/domain/orden_detalle_full.dart';

class _StubConnectivityService extends Fake implements ConnectivityService {
  bool online;
  _StubConnectivityService({this.online = true});

  @override
  bool get isOnline => online;

  @override
  Future<bool> checkConnection() async => online;
}

class _StubApiClient implements ApiClient {
  @override
  late final Dio dio;
  _StubApiClient(this.dio);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Interceptor determinista que simula el backend Fase 1–3 (`/evidencias/prepare-upload`,
/// `/sync-delta`, `/finalizar-commit`, `/sync/orden/:id`).
class _Fase3BackendSimulator extends Interceptor {
  int prepareUploadCalls = 0;
  int syncDeltaCalls = 0;
  int finalizarCommitCalls = 0;
  final List<String> callOrder = [];
  final List<Map<String, dynamic>> syncDeltaBodies = [];
  final List<Map<String, dynamic>> commitBodies = [];

  bool failFirstCommitWithMissingManifest = false;
  List<String> forcedMissingActividadUuids = [];
  int commitDelayMs = 0;
  Map<String, dynamic>? hydratedOrdenResponse;

  int _serverIdSeq = 5000;
  int _execVersion = 1;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final path = options.path;
    final data = options.data is Map
        ? Map<String, dynamic>.from(options.data as Map)
        : <String, dynamic>{};

    if (path.contains('/evidencias/prepare-upload')) {
      prepareUploadCalls++;
      callOrder.add('prepare-upload');
      final items = (data['items'] as List? ?? const []);
      final resItems = items.map((raw) {
        final m = Map<String, dynamic>.from(raw as Map);
        final hash = m['hashSha256']?.toString() ?? 'hash';
        return {
          'clientUuid': m['clientUuid'],
          'hashSha256': hash,
          'alreadyUploaded': false,
          'provider': 'CLOUDINARY',
          'strategy': 'CLOUDINARY_MULTIPART',
          'uploadUrl': 'https://api.cloudinary.com/v1_1/demo/image/upload',
          'storageKey': 'mekanos/OS-TEST/sha256_$hash',
          'fields': {'signature': 'sig-jit', 'timestamp': '1795850000'},
        };
      }).toList();

      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {'success': true, 'provider': 'CLOUDINARY', 'items': resItems},
        ),
      );
    }

    if (path.contains('/sync-delta')) {
      syncDeltaCalls++;
      callOrder.add('sync-delta');
      syncDeltaBodies.add(data);
      _execVersion++;

      final acks = <Map<String, dynamic>>[];
      void addAcks(String entityType, String key) {
        final list = (data[key] as List? ?? const []);
        for (final raw in list) {
          final m = Map<String, dynamic>.from(raw as Map);
          acks.add({
            'entityType': entityType,
            'clientUuid': m['clientUuid'],
            'serverId': _serverIdSeq++,
            'acceptedVersion': m['syncVersion'] ?? 1,
            'status': m['deleted'] == true ? 'DELETED' : 'APPLIED',
          });
        }
      }

      addAcks('ACTIVIDAD', 'actividades');
      addAcks('PENDIENTE', 'pendientes');
      addAcks('MEDICION', 'mediciones');
      addAcks('EVIDENCIA', 'evidenciasMeta');
      addAcks('FIRMA', 'firmas');

      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'success': true,
            'executionSyncVersion': _execVersion,
            'acks': acks,
          },
        ),
      );
    }

    if (path.contains('/finalizar-commit')) {
      if (commitDelayMs > 0) {
        await Future<void>.delayed(Duration(milliseconds: commitDelayMs));
      }
      finalizarCommitCalls++;
      callOrder.add('finalizar-commit');
      commitBodies.add(data);

      if (failFirstCommitWithMissingManifest && finalizarCommitCalls == 1) {
        return handler.reject(
          DioException(
            requestOptions: options,
            type: DioExceptionType.badResponse,
            response: Response(
              requestOptions: options,
              statusCode: 409,
              data: {
                'statusCode': 409,
                'code': 'INCOMPLETE_MANIFEST',
                'message': 'Faltan registros delta por sincronizar.',
                'missingClientUuids': {
                  'actividades': forcedMissingActividadUuids,
                  'mediciones': <String>[],
                  'evidencias': <String>[],
                  'pendientes': <String>[],
                  'firmas': <String>[],
                },
              },
            ),
          ),
        );
      }

      _execVersion++;
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'success': true,
            'alreadyCompleted': false,
            'estadoCodigo': 'COMPLETADA',
            'executionSyncVersion': _execVersion,
          },
        ),
      );
    }

    if (path.contains('/sync/orden/') && hydratedOrdenResponse != null) {
      callOrder.add('sync-orden-hydrate');
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: hydratedOrdenResponse,
        ),
      );
    }

    return handler.resolve(
      Response(requestOptions: options, statusCode: 200, data: {'ok': true}),
    );
  }
}

Future<({int idOrdenLocal, int idAct1, int idAct2, int idMed1, int idPend1, int idEv1, int idFirmaTec, int idFirmaCli})>
    _seedFullOrder(AppDatabase db, Directory tempDir, {int idBackend = 2145}) async {
  await db.upsertEstadoOrden(
    EstadosOrdenCompanion.insert(
      id: const Value(2),
      codigo: 'ASIGNADA',
      nombre: 'Asignada',
    ),
  );
  await db.upsertEstadoOrden(
    EstadosOrdenCompanion.insert(
      id: const Value(3),
      codigo: 'EN_PROCESO',
      nombre: 'En Proceso',
    ),
  );
  await db.upsertEstadoOrden(
    EstadosOrdenCompanion.insert(
      id: const Value(4),
      codigo: 'COMPLETADA',
      nombre: 'Completada',
      esEstadoFinal: const Value(true),
    ),
  );
  await db.asegurarEstadoLocal(
    id: -1,
    codigo: 'POR_SUBIR',
    nombre: 'Por Subir',
    esEstadoFinal: false,
  );
  await db.upsertCliente(
    ClientesCompanion.insert(id: const Value(10), nombre: 'Cliente Prueba'),
  );
  await db.upsertEquipo(
    EquiposCompanion.insert(
      id: const Value(20),
      codigo: 'EQ-01',
      nombre: 'Generador 1',
      idCliente: const Value(10),
    ),
  );
  await db.upsertTipoServicio(
    TiposServicioCompanion.insert(
      id: const Value(1),
      codigo: 'PREV_A',
      nombre: 'Preventivo A',
    ),
  );
  await db.upsertParametroCatalogo(
    ParametrosCatalogoCompanion.insert(
      id: const Value(101),
      codigo: 'VOLT_BAT',
      nombre: 'Voltaje Batería',
      unidad: const Value('VDC'),
    ),
  );
  await db.upsertActividadCatalogo(
    ActividadesCatalogoCompanion.insert(
      id: const Value(201),
      codigo: 'ACT-1',
      descripcion: 'Revisar correas',
      tipoActividad: 'INSPECCION',
      idTipoServicio: const Value(1),
    ),
  );
  await db.upsertActividadCatalogo(
    ActividadesCatalogoCompanion.insert(
      id: const Value(202),
      codigo: 'ACT-2',
      descripcion: 'Revisar niveles',
      tipoActividad: 'INSPECCION',
      idTipoServicio: const Value(1),
    ),
  );

  final idOrdenLocal = await db.insertOrdenFromSync(
    OrdenesCompanion.insert(
      idBackend: Value(idBackend),
      numeroOrden: 'OS-2026-$idBackend',
      idEstado: 3,
      idCliente: 10,
      idEquipo: 20,
      idTipoServicio: 1,
    ),
  );

  final idAct1 = await db.into(db.actividadesEjecutadas).insert(
        ActividadesEjecutadasCompanion.insert(
          idOrden: idOrdenLocal,
          idActividadCatalogo: 201,
          descripcion: 'Revisar correas',
          tipoActividad: 'INSPECCION',
          simbologia: const Value('B'),
          completada: const Value(true),
          isDirty: const Value(true),
        ),
      );
  final idAct2 = await db.into(db.actividadesEjecutadas).insert(
        ActividadesEjecutadasCompanion.insert(
          idOrden: idOrdenLocal,
          idActividadCatalogo: 202,
          descripcion: 'Revisar niveles',
          tipoActividad: 'INSPECCION',
          simbologia: const Value('B'),
          completada: const Value(true),
          isDirty: const Value(true),
        ),
      );
  final idMed1 = await db.into(db.mediciones).insert(
        MedicionesCompanion.insert(
          idOrden: idOrdenLocal,
          idParametro: 101,
          nombreParametro: 'Voltaje Batería',
          unidadMedida: 'VDC',
          valor: const Value(0.0), // Valor 0 explícito!
          estadoValor: const Value('CRITICO'),
          isDirty: const Value(true),
        ),
      );
  final idPend1 = await db.insertOrdenPendiente(
    OrdenesPendientesCompanion.insert(
      idOrden: idOrdenLocal,
      idOrdenBackend: Value(idBackend),
      descripcion: 'Cambiar batería agotada',
      prioridad: const Value('URGENTE'),
    ),
  );

  final photoFile = File('${tempDir.path}/foto_os_$idBackend.jpg');
  await photoFile.writeAsBytes(utf8.encode('JPEG-BIN-DATA-$idBackend'));
  final idEv1 = await db.into(db.evidencias).insert(
        EvidenciasCompanion.insert(
          idOrden: idOrdenLocal,
          idActividadEjecutada: Value(idAct1),
          rutaLocal: photoFile.path,
          tipoEvidencia: 'DURANTE',
          descripcion: const Value('Correa inicial'),
        ),
      );

  final firmaTecFile = File('${tempDir.path}/firma_tec_$idBackend.png');
  await firmaTecFile.writeAsBytes(utf8.encode('PNG-TEC-$idBackend'));
  final idFirmaTec = await db.into(db.firmas).insert(
        FirmasCompanion.insert(
          idOrden: idOrdenLocal,
          rutaLocal: firmaTecFile.path,
          tipoFirma: 'TECNICO',
          nombreFirmante: const Value('Técnico Campo'),
        ),
      );

  final firmaCliFile = File('${tempDir.path}/firma_cli_$idBackend.png');
  await firmaCliFile.writeAsBytes(utf8.encode('PNG-CLI-$idBackend'));
  final idFirmaCli = await db.into(db.firmas).insert(
        FirmasCompanion.insert(
          idOrden: idOrdenLocal,
          rutaLocal: firmaCliFile.path,
          tipoFirma: 'CLIENTE',
          nombreFirmante: const Value('Cliente Campo'),
        ),
      );

  return (
    idOrdenLocal: idOrdenLocal,
    idAct1: idAct1,
    idAct2: idAct2,
    idMed1: idMed1,
    idPend1: idPend1,
    idEv1: idEv1,
    idFirmaTec: idFirmaTec,
    idFirmaCli: idFirmaCli,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('mekanos_fase3_test_');
  });

  tearDownAll(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test(
    'Escenario A: 95% sincronizado en vivo -> finalizarOrdenArmonico realiza 0 re-subidas de fotos y cierra atómicamente',
    () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      final sim = _Fase3BackendSimulator();
      final dio = Dio()..interceptors.add(sim);
      final connectivity = _StubConnectivityService(online: true);
      var directUploads = 0;

      final outbox = DeltaOutboxService(
        db: db,
        dio: dio,
        connectivity: connectivity,
        autoListenConnectivity: false,
        reachabilityProbe: () async => true,
        directUploader: ({
          required String strategy,
          required String provider,
          required String uploadUrl,
          required String localFilePath,
          required String storageKey,
          Map<String, String>? fields,
          Map<String, String>? headers,
          String? fallbackPublicUrl,
        }) async {
          directUploads++;
          return DirectUploadResponse(
            publicUrl: 'https://res.cloudinary.com/demo/image/upload/$storageKey.jpg',
            storageKey: storageKey,
            provider: 'CLOUDINARY',
          );
        },
      );

      final seeded = await _seedFullOrder(db, tempDir, idBackend: 3001);

      // Sincronizar todo en vivo ANTES de pulsar SUBIR ORDEN
      await outbox.enqueueAllUnsyncedForOrder(seeded.idOrdenLocal);
      final drained = await outbox.flushOrden(seeded.idOrdenLocal);
      expect(drained, isTrue);
      expect(directUploads, 1);

      final prevPrepare = sim.prepareUploadCalls;
      final prevDelta = sim.syncDeltaCalls;
      final prevDirect = directUploads;

      // Pulsar SUBIR ORDEN v2
      final res = await outbox.finalizarOrdenArmonico(
        idOrdenLocal: seeded.idOrdenLocal,
        idOrdenBackend: 3001,
        observaciones: 'Cierre instantáneo',
        horaEntrada: '08:00',
        horaSalida: '09:30',
      );

      expect(res.success, isTrue);
      expect(res.guardadoOffline, isFalse);
      expect(res.estadoLocal, 'COMPLETADA');
      // 0 re-subidas de fotos ni deltas redundantes!
      expect(directUploads, prevDirect);
      expect(sim.prepareUploadCalls, prevPrepare);
      expect(sim.syncDeltaCalls, prevDelta);
      expect(sim.finalizarCommitCalls, 1);

      final manifest = sim.commitBodies.single['manifest'] as Map<String, dynamic>;
      expect((manifest['actividadesUuids'] as List).length, 2);
      expect((manifest['medicionesUuids'] as List).length, 1);
      expect((manifest['evidenciasUuids'] as List).length, 1);
      expect((manifest['pendientesUuids'] as List).length, 1);
      expect(manifest['firmasTipos'], containsAll(['TECNICO', 'CLIENTE']));

      final ordenFinal = await db.getOrdenById(seeded.idOrdenLocal);
      expect(ordenFinal!.idEstado, 4); // COMPLETADA
      expect(ordenFinal.isDirty, isFalse);
      expect(await db.countPendingOutboxByOrden(seeded.idOrdenLocal), 0);

      outbox.dispose();
      await db.close();
    },
  );

  test(
    'Escenario B: Editar actividad y caption de foto ya subida -> solo envía delta JSON (0 re-subida binaria) + commit',
    () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      final sim = _Fase3BackendSimulator();
      final dio = Dio()..interceptors.add(sim);
      var directUploads = 0;

      final outbox = DeltaOutboxService(
        db: db,
        dio: dio,
        connectivity: _StubConnectivityService(online: true),
        autoListenConnectivity: false,
        reachabilityProbe: () async => true,
        directUploader: ({
          required String strategy,
          required String provider,
          required String uploadUrl,
          required String localFilePath,
          required String storageKey,
          Map<String, String>? fields,
          Map<String, String>? headers,
          String? fallbackPublicUrl,
        }) async {
          directUploads++;
          return DirectUploadResponse(
            publicUrl: 'https://res.cloudinary.com/demo/image/upload/$storageKey.jpg',
            storageKey: storageKey,
            provider: 'CLOUDINARY',
          );
        },
      );

      final seeded = await _seedFullOrder(db, tempDir, idBackend: 3002);
      await outbox.enqueueAllUnsyncedForOrder(seeded.idOrdenLocal);
      await outbox.flushOrden(seeded.idOrdenLocal);
      expect(directUploads, 1);

      // Editar solo actividad 1 y caption de foto ya subida
      await (db.update(db.actividadesEjecutadas)
            ..where((a) => a.idLocal.equals(seeded.idAct1)))
          .write(
        const ActividadesEjecutadasCompanion(
          simbologia: Value('M'),
          observacion: Value('Correa fisurada tras revisión'),
          isDirty: Value(true),
        ),
      );
      await (db.update(db.evidencias)..where((e) => e.idLocal.equals(seeded.idEv1))).write(
        const EvidenciasCompanion(
          descripcion: Value('Correa fisurada - foto actualizada'),
          isDirty: Value(true),
        ),
      );

      final deltaBefore = sim.syncDeltaBodies.length;
      final res = await outbox.finalizarOrdenArmonico(
        idOrdenLocal: seeded.idOrdenLocal,
        idOrdenBackend: 3002,
        observaciones: 'Cierre con edición',
        horaEntrada: '08:00',
        horaSalida: '10:00',
      );

      expect(res.success, isTrue);
      expect(directUploads, 1); // 0 re-subida de binario!
      expect(sim.syncDeltaBodies.length, deltaBefore + 1);
      final lastDelta = sim.syncDeltaBodies.last;
      expect((lastDelta['actividades'] as List).length, 1); // Solo la actividad editada
      expect((lastDelta['evidenciasMeta'] as List).length, 1); // Solo metadata de foto
      expect(lastDelta['mediciones'], isNull); // No reenvió medición intacta
      expect(lastDelta['pendientes'], isNull); // No reenvió pendiente intacto

      outbox.dispose();
      await db.close();
    },
  );

  test(
    'Escenario C: 100% Offline -> POR_SUBIR editable (NO COMPLETADA), edición en POR_SUBIR y auto-cierre al recuperar señal',
    () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      final sim = _Fase3BackendSimulator();
      final dio = Dio()..interceptors.add(sim);
      var reachable = false;
      var directUploads = 0;

      final outbox = DeltaOutboxService(
        db: db,
        dio: dio,
        connectivity: _StubConnectivityService(online: false),
        autoListenConnectivity: false,
        reachabilityProbe: () async => reachable,
        directUploader: ({
          required String strategy,
          required String provider,
          required String uploadUrl,
          required String localFilePath,
          required String storageKey,
          Map<String, String>? fields,
          Map<String, String>? headers,
          String? fallbackPublicUrl,
        }) async {
          directUploads++;
          return DirectUploadResponse(
            publicUrl: 'https://res.cloudinary.com/demo/image/upload/$storageKey.jpg',
            storageKey: storageKey,
            provider: 'CLOUDINARY',
          );
        },
      );

      final seeded = await _seedFullOrder(db, tempDir, idBackend: 3003);

      // 1. Finalizar 100% OFFLINE
      final offlineRes = await outbox.finalizarOrdenArmonico(
        idOrdenLocal: seeded.idOrdenLocal,
        idOrdenBackend: 3003,
        observaciones: 'Terminado en sótano sin red',
        horaEntrada: '09:00',
        horaSalida: '11:00',
      );

      expect(offlineRes.success, isTrue);
      expect(offlineRes.guardadoOffline, isTrue);
      expect(offlineRes.estadoLocal, 'POR_SUBIR');
      expect(sim.prepareUploadCalls, 0);
      expect(sim.syncDeltaCalls, 0);
      expect(sim.finalizarCommitCalls, 0);

      // Verificar estado local real = POR_SUBIR (-1) y editable (estaFinalizada == false)
      final ordenOffline = await db.getOrdenById(seeded.idOrdenLocal);
      expect(ordenOffline!.idEstado, -1);
      final estadoPorSubir = await db.getEstadoOrdenById(-1);
      expect(estadoPorSubir!.codigo, 'POR_SUBIR');
      final detalleDominio = OrdenDetalleFull(
        orden: ordenOffline,
        cliente: (await db.getClienteById(10))!,
        equipo: (await db.getEquipoById(20))!,
        tipoServicio: (await db.getTipoServicioById(1))!,
        estadoOrden: estadoPorSubir,
        actividadesCatalogo: const [],
      );
      expect(detalleDominio.estaPorSubir, isTrue);
      expect(detalleDominio.estaFinalizada, isFalse);

      // 2. Técnico edita actividad mientras la orden sigue en POR_SUBIR offline
      await (db.update(db.actividadesEjecutadas)
            ..where((a) => a.idLocal.equals(seeded.idAct2)))
          .write(
        const ActividadesEjecutadasCompanion(
          simbologia: Value('C'),
          observacion: Value('Editado estando en POR_SUBIR'),
          isDirty: Value(true),
        ),
      );
      await outbox.enqueueActividadUpsert(seeded.idAct2);

      // 3. Recupera señal -> flushAllPending drena Media -> Metadata -> finalizar-commit automáticamente!
      reachable = true;
      await outbox.flushAllPending();

      expect(directUploads, 1);
      expect(
        sim.callOrder,
        equals(['prepare-upload', 'sync-delta', 'finalizar-commit']),
      );
      // Confirmar que la edición hecha en POR_SUBIR viajó en sync-delta antes del commit
      final sentActs = (sim.syncDeltaBodies.first['actividades'] as List)
          .cast<Map<String, dynamic>>();
      expect(
        sentActs.any((a) => a['estado'] == 'C' && a['observaciones'] == 'Editado estando en POR_SUBIR'),
        isTrue,
      );

      final ordenFinal = await db.getOrdenById(seeded.idOrdenLocal);
      expect(ordenFinal!.idEstado, 4); // COMPLETADA solo tras HTTP 200
      expect(ordenFinal.isDirty, isFalse);
      expect(await db.countPendingOutboxByOrden(seeded.idOrdenLocal), 0);

      outbox.dispose();
      await db.close();
    },
  );

  test(
    'Escenario D & E: Guard anti doble-clic concurrente + auto-recuperación ante 409 INCOMPLETE_MANIFEST',
    () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      final sim = _Fase3BackendSimulator()
        ..commitDelayMs = 40
        ..failFirstCommitWithMissingManifest = true;
      final dio = Dio()..interceptors.add(sim);

      final outbox = DeltaOutboxService(
        db: db,
        dio: dio,
        connectivity: _StubConnectivityService(online: true),
        autoListenConnectivity: false,
        reachabilityProbe: () async => true,
        directUploader: ({
          required String strategy,
          required String provider,
          required String uploadUrl,
          required String localFilePath,
          required String storageKey,
          Map<String, String>? fields,
          Map<String, String>? headers,
          String? fallbackPublicUrl,
        }) async {
          return DirectUploadResponse(
            publicUrl: 'https://res.cloudinary.com/demo/image/upload/$storageKey.jpg',
            storageKey: storageKey,
            provider: 'CLOUDINARY',
          );
        },
      );

      final seeded = await _seedFullOrder(db, tempDir, idBackend: 3004);
      await outbox.enqueueAllUnsyncedForOrder(seeded.idOrdenLocal);
      await outbox.flushOrden(seeded.idOrdenLocal);

      final act1 = await (db.select(db.actividadesEjecutadas)
            ..where((a) => a.idLocal.equals(seeded.idAct1)))
          .getSingle();
      sim.forcedMissingActividadUuids = [act1.clientUuid!];

      // Disparar doble clic simultáneo
      final futures = await Future.wait([
        outbox.finalizarOrdenArmonico(
          idOrdenLocal: seeded.idOrdenLocal,
          idOrdenBackend: 3004,
          observaciones: 'Doble clic + manifest recovery',
          horaEntrada: '10:00',
          horaSalida: '11:00',
        ),
        outbox.finalizarOrdenArmonico(
          idOrdenLocal: seeded.idOrdenLocal,
          idOrdenBackend: 3004,
          observaciones: 'Doble clic duplicado',
          horaEntrada: '10:00',
          horaSalida: '11:00',
        ),
      ]);

      final okCount = futures.where((r) => r.success).length;
      final busyCount = futures.where((r) => r.error == 'FINALIZACION_EN_PROGRESO').length;
      expect(okCount, 1);
      expect(busyCount, 1);

      // 1er commit -> 409 INCOMPLETE_MANIFEST -> re-envió SOLO act1 -> 2do commit -> 200 OK
      expect(sim.finalizarCommitCalls, 2);
      final recoveryDelta = sim.syncDeltaBodies.last;
      expect((recoveryDelta['actividades'] as List).length, 1);
      expect((recoveryDelta['actividades'] as List).first['clientUuid'], act1.clientUuid);

      final ordenFinal = await db.getOrdenById(seeded.idOrdenLocal);
      expect(ordenFinal!.idEstado, 4);

      outbox.dispose();
      await db.close();
    },
  );

  test(
    'Escenario F: SyncUploadService delega en v2 sin payload truncado corrupto ni COMPLETADA prematura offline',
    () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      final sim = _Fase3BackendSimulator();
      final dio = Dio()..interceptors.add(sim);
      final connectivity = _StubConnectivityService(online: false);
      final progress = SyncProgressNotifier();

      final outbox = DeltaOutboxService(
        db: db,
        dio: dio,
        connectivity: connectivity,
        autoListenConnectivity: false,
        reachabilityProbe: () async => false,
      );
      final offlineSync = OfflineSyncService(
        db,
        dio,
        connectivity,
        progress,
        deltaOutbox: outbox,
      );
      final uploadService = SyncUploadService(
        db,
        dio,
        connectivity,
        offlineSync,
        progress,
        deltaOutbox: outbox,
      );

      final seeded = await _seedFullOrder(db, tempDir, idBackend: 3005);

      final res = await uploadService.finalizarOrden(
        idOrdenLocal: seeded.idOrdenLocal,
        idOrdenBackend: 3005,
        observaciones: 'Offline desde SyncUploadService',
        horaEntrada: '12:00',
        horaSalida: '13:00',
        usuarioId: 99,
      );

      expect(res.success, isTrue);
      expect(res.guardadoOffline, isTrue);

      final ordenAfter = await db.getOrdenById(seeded.idOrdenLocal);
      expect(ordenAfter!.idEstado, -1); // POR_SUBIR, JAMÁS COMPLETADA prematura!

      final queueRows = await db.select(db.ordenesPendientesSync).get();
      expect(queueRows.length, 1);
      final stored = jsonDecode(queueRows.single.payloadJson) as Map<String, dynamic>;
      expect(stored['pipelineVersion'], 'V2_HARMONIC');
      expect(stored['totalActividades'], 2);
      expect(stored['totalEvidencias'], 1);

      outbox.dispose();
      await db.close();
    },
  );

  test(
    'Escenario G: Hidratación completa multi-dispositivo (/sync/orden/:id) carga URL+SHA256+clientUuid con 0 re-subidas en Dispositivo B',
    () async {
      final db = AppDatabase(executor: NativeDatabase.memory());
      final sim = _Fase3BackendSimulator();
      final dio = Dio()..interceptors.add(sim);
      final apiClient = _StubApiClient(dio);
      var directUploads = 0;

      // Sembrar solo catálogos base en Dispositivo B (BD sin la orden aún)
      await db.upsertEstadoOrden(
        EstadosOrdenCompanion.insert(id: const Value(3), codigo: 'EN_PROCESO', nombre: 'En Proceso'),
      );
      await db.upsertEstadoOrden(
        EstadosOrdenCompanion.insert(
          id: const Value(4),
          codigo: 'COMPLETADA',
          nombre: 'Completada',
          esEstadoFinal: const Value(true),
        ),
      );
      await db.upsertParametroCatalogo(
        ParametrosCatalogoCompanion.insert(
          id: const Value(101),
          codigo: 'VOLT_BAT',
          nombre: 'Voltaje Batería',
          unidad: const Value('VDC'),
        ),
      );
      await db.upsertActividadCatalogo(
        ActividadesCatalogoCompanion.insert(
          id: const Value(201),
          codigo: 'ACT-1',
          descripcion: 'Revisar correas',
          tipoActividad: 'INSPECCION',
        ),
      );

      sim.hydratedOrdenResponse = {
        'idOrdenServicio': 4001,
        'numeroOrden': 'OS-2026-4001',
        'version': 100,
        'executionSyncVersion': 8,
        'codigoEstado': 'COMPLETADA',
        'permiteEdicionTecnico': true,
        'idCliente': 10,
        'nombreCliente': 'Cliente Multi',
        'idEquipo': 20,
        'codigoEquipo': 'EQ-01',
        'nombreEquipo': 'Generador 1',
        'idTipoServicio': 1,
        'codigoTipoServicio': 'PREV_A',
        'nombreTipoServicio': 'Preventivo A',
        'observacionesTecnico': 'Cargada desde Dispositivo A',
        'actividadesPlan': [],
        'ordenesEquipos': [],
        'actividadesEjecutadas': [
          {
            'idActividadEjecutada': 701,
            'clientUuid': '11111111-1111-4111-8111-111111111111',
            'syncVersion': 2,
            'idActividadCatalogo': 201,
            'descripcion': 'Revisar correas',
            'sistema': 'MOTOR',
            'estado': 'B',
            'observaciones': 'OK en A',
            'ejecutada': true,
          },
        ],
        'mediciones': [
          {
            'idMedicion': 801,
            'clientUuid': '22222222-2222-4222-8222-222222222222',
            'syncVersion': 1,
            'idParametroMedicion': 101,
            'nombreParametro': 'Voltaje Batería',
            'unidadMedida': 'VDC',
            'valorNumerico': 0,
            'nivelAlerta': 'CRITICO',
          },
        ],
        'evidencias': [
          {
            'idEvidencia': 901,
            'clientUuid': '33333333-3333-4333-8333-333333333333',
            'syncVersion': 1,
            'actividadClientUuid': '11111111-1111-4111-8111-111111111111',
            'tipoEvidencia': 'DURANTE',
            'descripcion': 'Foto tomada en Dispositivo A',
            'publicUrl': 'https://res.cloudinary.com/demo/image/upload/sha256_abc.jpg',
            'hashSha256': 'abc123def456',
            'storageProvider': 'CLOUDINARY',
            'storageKey': 'mekanos/OS-2026-4001/sha256_abc123def456',
          },
        ],
        'pendientes': [
          {
            'idOrdenPendiente': 951,
            'clientUuid': '44444444-4444-4444-8444-444444444444',
            'syncVersion': 1,
            'descripcion': 'Reemplazar correa',
            'origen': 'MANUAL',
            'prioridad': 'URGENTE',
            'estado': 'PENDIENTE',
          },
        ],
        'firmas': {
          'tecnico': {
            'idFirmaDigital': 991,
            'tipoFirma': 'TECNICO',
            'hashSha256': 'hash-tec',
          },
          'cliente': {
            'idFirmaDigital': 992,
            'tipoFirma': 'CLIENTE',
            'hashSha256': 'hash-cli',
            'nombreFirmante': 'Carlos Cliente',
          },
        },
      };

      final smartSync = SmartSyncService(apiClient, db);
      final ok = await smartSync.hidratarOrdenCompletaDesdeServidor(4001);
      expect(ok, isTrue);

      final ordenB = await db.getOrdenByBackendId(4001);
      expect(ordenB, isNotNull);
      expect(ordenB!.permiteEdicionTecnico, isTrue);

      final actsB = await db.getActividadesByOrden(ordenB.idLocal);
      final medsB = await db.getMedicionesByOrden(ordenB.idLocal);
      final evsB = await (db.select(db.evidencias)
            ..where((e) => e.idOrden.equals(ordenB.idLocal)))
          .get();
      final pendsB = await db.getPendientesByOrden(ordenB.idLocal);
      final firmasB = await db.getFirmasByOrden(ordenB.idLocal);

      expect(actsB.single.clientUuid, '11111111-1111-4111-8111-111111111111');
      expect(medsB.single.valor, 0.0);
      expect(evsB.single.urlRemota, 'https://res.cloudinary.com/demo/image/upload/sha256_abc.jpg');
      expect(evsB.single.idActividadEjecutada, actsB.single.idLocal);
      expect(evsB.single.subida, isTrue);
      expect(pendsB.single.clientUuid, '44444444-4444-4444-8444-444444444444');
      expect(firmasB.length, 2);

      // Resubir desde Dispositivo B sin tocar la foto -> 0 re-subidas binarias!
      final outboxB = DeltaOutboxService(
        db: db,
        dio: dio,
        connectivity: _StubConnectivityService(online: true),
        autoListenConnectivity: false,
        reachabilityProbe: () async => true,
        directUploader: ({
          required String strategy,
          required String provider,
          required String uploadUrl,
          required String localFilePath,
          required String storageKey,
          Map<String, String>? fields,
          Map<String, String>? headers,
          String? fallbackPublicUrl,
        }) async {
          directUploads++;
          return DirectUploadResponse(publicUrl: 'should-not-run', provider: 'CLOUDINARY');
        },
      );

      final resB = await outboxB.finalizarOrdenArmonico(
        idOrdenLocal: ordenB.idLocal,
        idOrdenBackend: 4001,
        observaciones: 'Resubida desde Dispositivo B',
        horaEntrada: '08:00',
        horaSalida: '10:00',
        esResubida: true,
      );

      expect(resB.success, isTrue);
      expect(directUploads, 0);
      expect(sim.prepareUploadCalls, 0);
      expect(sim.finalizarCommitCalls, 1);
      expect(sim.commitBodies.single['esResubida'], isTrue);

      outboxB.dispose();
      await db.close();
    },
  );
}
