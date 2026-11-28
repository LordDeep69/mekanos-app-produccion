import 'dart:async';
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
import 'package:mekanos_mobile/features/ejecucion/data/ejecucion_service.dart';

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

class _FakeConnectivity extends Fake implements ConnectivityService {
  final _ctrl = StreamController<ConnectivityStatus>.broadcast();

  @override
  Stream<ConnectivityStatus> get statusStream => _ctrl.stream;

  @override
  Future<bool> checkConnection() async => true;

  @override
  bool get isOnline => true;

  @override
  void dispose() {
    _ctrl.close();
  }
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

  Future<({AppDatabase db, int idOrdenLocal, int idActLocal, int idMedLocal})>
      seedOrderFixture() async {
    final db = AppDatabase(executor: NativeDatabase.memory());
    await db.upsertActividadCatalogo(
      ActividadesCatalogoCompanion.insert(
        id: const Value(10),
        codigo: 'ACT-10',
        descripcion: 'Verificar correas',
        idTipoServicio: const Value(1),
        tipoActividad: 'INSPECCION',
      ),
    );
    await db.upsertParametroCatalogo(
      ParametrosCatalogoCompanion.insert(
        id: const Value(7),
        codigo: 'PRES',
        nombre: 'Presión Aceite',
        unidad: const Value('PSI'),
      ),
    );

    final idOrdenLocal = await db.into(db.ordenes).insert(
          OrdenesCompanion.insert(
            idBackend: const Value(500),
            numeroOrden: 'OS-2026-0500',
            idEstado: 1,
            idCliente: 1,
            idEquipo: 1,
            idTipoServicio: 1,
          ),
        );

    final idActLocal = await db.insertActividadEjecutada(
      ActividadesEjecutadasCompanion.insert(
        idOrden: idOrdenLocal,
        idActividadCatalogo: 10,
        descripcion: 'Verificar correas',
        tipoActividad: 'INSPECCION',
      ),
    );

    final idMedLocal = await db.insertMedicion(
      MedicionesCompanion.insert(
        idOrden: idOrdenLocal,
        idActividadEjecutada: Value(idActLocal),
        idParametro: 7,
        nombreParametro: 'Presión Aceite',
        unidadMedida: 'PSI',
      ),
    );

    return (
      db: db,
      idOrdenLocal: idOrdenLocal,
      idActLocal: idActLocal,
      idMedLocal: idMedLocal,
    );
  }

  group('Fase 1 · DeltaOutboxService (Debounce, Anti-No-Op, JIT Cloudinary y Dedup SHA-256)', () {
    test('Coalescing + debounce agrupa 4 ediciones rápidas en 1 solo POST /sync-delta y aplica anti-no-op', () async {
      final fx = await seedOrderFixture();
      addTearDown(() async => fx.db.close());

      final syncDeltaPayloads = <Map<String, dynamic>>[];
      final dio = Dio(BaseOptions(baseUrl: 'http://fake.local/api'));
      dio.httpClientAdapter = _MockAdapter((options) async {
        if (options.path == '/ordenes/500/sync-delta') {
          final body = Map<String, dynamic>.from(options.data as Map);
          syncDeltaPayloads.add(body);
          final acts = (body['actividades'] as List?) ?? const [];
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'orderId': 500,
              'numeroOrden': 'OS-2026-0500',
              'executionSyncVersion': syncDeltaPayloads.length,
              'serverTimestamp': '2026-11-28T05:00:00Z',
              'sectionsUpdated': ['actividades'],
              'acks': acts
                  .map(
                    (a) => {
                      'entityType': 'ACTIVIDAD',
                      'clientUuid': a['clientUuid'],
                      'serverId': 9001,
                      'acceptedVersion': a['syncVersion'],
                      'status': 'APPLIED',
                    },
                  )
                  .toList(),
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString('{}', 404);
      });

      final connectivity = _FakeConnectivity();
      addTearDown(connectivity.dispose);

      final outbox = DeltaOutboxService(
        db: fx.db,
        dio: dio,
        connectivity: connectivity,
        debounceDelay: const Duration(milliseconds: 60),
        maxWaitDelay: const Duration(milliseconds: 250),
        reachabilityProbe: () async => true,
        autoListenConnectivity: false,
      );
      addTearDown(outbox.dispose);

      final ejecucion = EjecucionService(fx.db, _FakeApiClient(dio), outbox: outbox);

      // 4 ediciones rápidas en ráfaga sobre el mismo ítem -> coalescing en 1 mutación final 'C'
      await ejecucion.marcarActividad(idActividadLocal: fx.idActLocal, simbologia: 'B');
      await ejecucion.marcarActividad(idActividadLocal: fx.idActLocal, simbologia: 'R');
      await ejecucion.marcarActividad(idActividadLocal: fx.idActLocal, simbologia: 'M');
      await ejecucion.marcarActividad(idActividadLocal: fx.idActLocal, simbologia: 'C');

      // Esperar disparo del debounce (60ms) + margen
      await Future<void>.delayed(const Duration(milliseconds: 200));

      expect(syncDeltaPayloads, hasLength(1));
      final sentAct = (syncDeltaPayloads.first['actividades'] as List).single as Map;
      expect(sentAct['estado'], 'C');
      expect(sentAct['syncVersion'], 5);

      final rowAfterSync = await (fx.db.select(fx.db.actividadesEjecutadas)
            ..where((a) => a.idLocal.equals(fx.idActLocal)))
          .getSingle();
      expect(rowAfterSync.idBackend, 9001);
      expect(rowAfterSync.syncedVersion, 5);
      expect(rowAfterSync.isDirty, isFalse);

      // Anti-no-op: cambiar C -> M -> C antes de que dispare el debounce => 0 peticiones nuevas
      await ejecucion.marcarActividad(idActividadLocal: fx.idActLocal, simbologia: 'M');
      await ejecucion.marcarActividad(idActividadLocal: fx.idActLocal, simbologia: 'C');
      await Future<void>.delayed(const Duration(milliseconds: 180));

      expect(syncDeltaPayloads, hasLength(1));
    });

    test('Blindaje JIT Cloudinary: offline NO solicita firma; al volver red sube directo sin Base64 y enlaza actividadClientUuid', () async {
      final fx = await seedOrderFixture();
      addTearDown(() async => fx.db.close());

      final tempDir = await Directory.systemTemp.createTemp('eam_f1_jit_');
      addTearDown(() async {
        if (await tempDir.exists()) await tempDir.delete(recursive: true);
      });
      final photoFile = File('${tempDir.path}/foto_motor.jpg');
      await photoFile.writeAsBytes(utf8.encode('jpeg-binary-sample-content-2026'));

      var isOnlineNow = false;
      var prepareUploadCalls = 0;
      var directUploadCalls = 0;
      Map<String, dynamic>? lastDeltaBody;

      final dio = Dio(BaseOptions(baseUrl: 'http://fake.local/api'));
      dio.httpClientAdapter = _MockAdapter((options) async {
        if (options.path == '/ordenes/500/evidencias/prepare-upload') {
          prepareUploadCalls++;
          final body = Map<String, dynamic>.from(options.data as Map);
          final items = (body['items'] as List).cast<Map<String, dynamic>>();
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'orderId': 500,
              'provider': 'CLOUDINARY',
              'items': items
                  .map(
                    (it) => {
                      'clientUuid': it['clientUuid'],
                      'hashSha256': it['hashSha256'],
                      'alreadyUploaded': false,
                      'provider': 'CLOUDINARY',
                      'strategy': 'CLOUDINARY_MULTIPART',
                      'uploadUrl': 'https://api.cloudinary.com/v1_1/demo/image/upload',
                      'storageKey': 'eam-media/ordenes/OS-2026-0500/evidencias/sha256_${it['hashSha256']}',
                      'fields': {
                        'api_key': 'k1',
                        'signature': 'sig1',
                        'timestamp': '1795842000',
                        'public_id': 'sha256_${it['hashSha256']}',
                      },
                    },
                  )
                  .toList(),
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        if (options.path == '/ordenes/500/sync-delta') {
          lastDeltaBody = Map<String, dynamic>.from(options.data as Map);
          final evs = (lastDeltaBody!['evidenciasMeta'] as List?) ?? const [];
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'orderId': 500,
              'numeroOrden': 'OS-2026-0500',
              'executionSyncVersion': 1,
              'serverTimestamp': '2026-11-28T05:01:00Z',
              'sectionsUpdated': ['evidencias'],
              'acks': evs
                  .map(
                    (e) => {
                      'entityType': 'EVIDENCIA',
                      'clientUuid': e['clientUuid'],
                      'serverId': 7771,
                      'acceptedVersion': e['syncVersion'],
                      'status': 'APPLIED',
                    },
                  )
                  .toList(),
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString('{}', 404);
      });

      final connectivity = _FakeConnectivity();
      addTearDown(connectivity.dispose);

      final outbox = DeltaOutboxService(
        db: fx.db,
        dio: dio,
        connectivity: connectivity,
        debounceDelay: const Duration(milliseconds: 40),
        maxWaitDelay: const Duration(milliseconds: 120),
        reachabilityProbe: () async => isOnlineNow,
        autoListenConnectivity: false,
        directUploader: ({
          required strategy,
          required provider,
          required uploadUrl,
          required localFilePath,
          required storageKey,
          fields,
          headers,
          fallbackPublicUrl,
        }) async {
          directUploadCalls++;
          expect(strategy, 'CLOUDINARY_MULTIPART');
          expect(localFilePath, photoFile.path);
          return DirectUploadResponse(
            publicUrl: 'https://res.cloudinary.com/demo/image/upload/$storageKey.jpg',
            storageKey: storageKey,
            provider: 'CLOUDINARY',
          );
        },
      );
      addTearDown(outbox.dispose);

      // 1. Capturar evidencia OFFLINE vinculada a actividad
      final idEvLocal = await fx.db.insertEvidencia(
        EvidenciasCompanion.insert(
          idOrden: fx.idOrdenLocal,
          idActividadEjecutada: Value(fx.idActLocal),
          rutaLocal: photoFile.path,
          tipoEvidencia: 'DURANTE',
          descripcion: const Value('Foto en sótano sin señal'),
        ),
      );
      await outbox.enqueueEvidenciaCaptured(idEvLocal);
      await Future<void>.delayed(const Duration(milliseconds: 150));

      // Offline -> 0 firmas pedidas, 0 uploads, item intacto en SQLite
      expect(prepareUploadCalls, 0);
      expect(directUploadCalls, 0);
      expect(await fx.db.countPendingOutboxByOrden(fx.idOrdenLocal), 1);

      // 2. Recupera red real -> flush JIT solicita firma, sube directo y envía evidenciasMeta con actividadClientUuid
      isOnlineNow = true;
      final drained = await outbox.flushOrden(fx.idOrdenLocal);

      expect(drained, isTrue);
      expect(prepareUploadCalls, 1);
      expect(directUploadCalls, 1);
      expect(lastDeltaBody, isNotNull);

      final sentEv = (lastDeltaBody!['evidenciasMeta'] as List).single as Map;
      expect(sentEv['actividadClientUuid'], isNotNull);
      expect(sentEv['publicUrl'], startsWith('https://res.cloudinary.com/demo/'));
      expect(sentEv.containsKey('base64'), isFalse);

      // 3. Editar solo descripción de la foto ya subida -> salta Carril 2 (0 prepare-upload, 0 directUpload)
      await (fx.db.update(fx.db.evidencias)..where((e) => e.idLocal.equals(idEvLocal))).write(
        const EvidenciasCompanion(descripcion: Value('Descripción corregida')),
      );
      await outbox.enqueueEvidenciaMetaUpdate(idEvLocal);
      await outbox.flushOrden(fx.idOrdenLocal);

      expect(prepareUploadCalls, 1);
      expect(directUploadCalls, 1);
      final updatedEvMeta = (lastDeltaBody!['evidenciasMeta'] as List).single as Map;
      expect(updatedEvMeta['descripcion'], 'Descripción corregida');
    });

    test('Dedup SHA-256 (alreadyUploaded: true) sube 0 bytes y medición valor 0 + pendiente inmediato funcionan', () async {
      final fx = await seedOrderFixture();
      addTearDown(() async => fx.db.close());

      final tempDir = await Directory.systemTemp.createTemp('eam_f1_dedup_');
      addTearDown(() async {
        if (await tempDir.exists()) await tempDir.delete(recursive: true);
      });
      final dupFile = File('${tempDir.path}/dup.jpg');
      await dupFile.writeAsBytes(utf8.encode('duplicate-bytes-sha256'));

      var directUploadCalls = 0;
      final deltaCalls = <Map<String, dynamic>>[];

      final dio = Dio(BaseOptions(baseUrl: 'http://fake.local/api'));
      dio.httpClientAdapter = _MockAdapter((options) async {
        if (options.path == '/ordenes/500/evidencias/prepare-upload') {
          final items = ((options.data as Map)['items'] as List).cast<Map<String, dynamic>>();
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'orderId': 500,
              'provider': 'CLOUDINARY',
              'items': items
                  .map(
                    (it) => {
                      'clientUuid': it['clientUuid'],
                      'hashSha256': it['hashSha256'],
                      'alreadyUploaded': true,
                      'provider': 'CLOUDINARY',
                      'strategy': 'ALREADY_UPLOADED',
                      'publicUrl': 'https://res.cloudinary.com/demo/image/upload/ya_existe.jpg',
                      'storageKey': 'eam-media/ya_existe',
                      'existingEvidenciaId': 888,
                    },
                  )
                  .toList(),
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        if (options.path == '/ordenes/500/sync-delta') {
          final body = Map<String, dynamic>.from(options.data as Map);
          deltaCalls.add(body);
          final acks = <Map<String, dynamic>>[];
          for (final p in (body['pendientes'] as List?) ?? const []) {
            acks.add({
              'entityType': 'PENDIENTE',
              'clientUuid': p['clientUuid'],
              'serverId': 301,
              'acceptedVersion': p['syncVersion'],
              'status': 'APPLIED',
            });
          }
          for (final m in (body['mediciones'] as List?) ?? const []) {
            acks.add({
              'entityType': 'MEDICION',
              'clientUuid': m['clientUuid'],
              'serverId': 401,
              'acceptedVersion': m['syncVersion'],
              'status': 'APPLIED',
            });
          }
          for (final e in (body['evidenciasMeta'] as List?) ?? const []) {
            acks.add({
              'entityType': 'EVIDENCIA',
              'clientUuid': e['clientUuid'],
              'serverId': 888,
              'acceptedVersion': e['syncVersion'],
              'status': 'APPLIED',
            });
          }
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'orderId': 500,
              'numeroOrden': 'OS-2026-0500',
              'executionSyncVersion': deltaCalls.length,
              'serverTimestamp': '2026-11-28T05:02:00Z',
              'sectionsUpdated': ['pendientes', 'mediciones', 'evidencias'],
              'acks': acks,
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString('{}', 404);
      });

      final connectivity = _FakeConnectivity();
      addTearDown(connectivity.dispose);

      final outbox = DeltaOutboxService(
        db: fx.db,
        dio: dio,
        connectivity: connectivity,
        debounceDelay: const Duration(seconds: 10), // Largo a propósito para probar flush inmediato de Pendiente
        reachabilityProbe: () async => true,
        autoListenConnectivity: false,
        directUploader: ({
          required strategy,
          required provider,
          required uploadUrl,
          required localFilePath,
          required storageKey,
          fields,
          headers,
          fallbackPublicUrl,
        }) async {
          directUploadCalls++;
          return const DirectUploadResponse(publicUrl: 'unexpected', provider: 'CLOUDINARY');
        },
      );
      addTearDown(outbox.dispose);

      // 1. Pendiente -> flush inmediato (0ms, no espera los 10s de debounce!)
      final idPend = await fx.db.insertOrdenPendiente(
        OrdenesPendientesCompanion.insert(
          idOrden: fx.idOrdenLocal,
          idOrdenBackend: const Value(500),
          descripcion: 'Sello mecánico con fuga urgente',
          prioridad: const Value('URGENTE'),
        ),
      );
      await outbox.enqueuePendienteUpsert(idPend);
      await Future<void>.delayed(const Duration(milliseconds: 120));
      expect(deltaCalls, hasLength(1));
      expect((deltaCalls.first['pendientes'] as List).single['descripcion'], 'Sello mecánico con fuga urgente');

      // 2. Foto duplicada + medición valor 0.0 -> 0 bytes subidos a Cloudinary y valor 0 conservado
      final ejecucion = EjecucionService(fx.db, _FakeApiClient(dio), outbox: outbox);
      await ejecucion.actualizarMedicion(
        idMedicion: fx.idMedLocal,
        valor: 0.0,
        estadoValor: 'CRITICO',
      );
      final idEv = await fx.db.insertEvidencia(
        EvidenciasCompanion.insert(
          idOrden: fx.idOrdenLocal,
          rutaLocal: dupFile.path,
          tipoEvidencia: 'ANTES',
        ),
      );
      await outbox.enqueueEvidenciaCaptured(idEv);
      await outbox.flushOrden(fx.idOrdenLocal);

      expect(directUploadCalls, 0);
      final lastCall = deltaCalls.last;
      expect((lastCall['mediciones'] as List).single['valorNumerico'], 0.0);
      expect(
        (lastCall['evidenciasMeta'] as List).single['publicUrl'],
        'https://res.cloudinary.com/demo/image/upload/ya_existe.jpg',
      );
    });
  });
}
