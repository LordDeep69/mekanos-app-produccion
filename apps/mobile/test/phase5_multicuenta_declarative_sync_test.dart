import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mekanos_mobile/core/api/api_client.dart';
import 'package:mekanos_mobile/core/config/branding_provider.dart';
import 'package:mekanos_mobile/core/config/local_api_discovery.dart';
import 'package:mekanos_mobile/core/database/app_database.dart';
import 'package:mekanos_mobile/core/storage/account_scope.dart';
import 'package:mekanos_mobile/core/storage/storage_preferences.dart';
import 'package:mekanos_mobile/core/sync/connectivity_service.dart';
import 'package:mekanos_mobile/core/sync/media_payload_codec.dart';
import 'package:mekanos_mobile/core/sync/offline_sync_service.dart';
import 'package:mekanos_mobile/core/sync/smart_sync_service.dart';
import 'package:mekanos_mobile/core/sync/sync_progress.dart';
import 'package:mekanos_mobile/features/ejecucion/data/declarative_activity_resolver.dart';
import 'package:mekanos_mobile/features/ejecucion/presentation/widgets/metrica_uso_mobile.dart';

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

class _AlwaysOnlineConnectivity extends Fake implements ConnectivityService {
  @override
  Future<bool> checkConnection() async => true;

  @override
  bool get isOnline => true;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  group('Phase 5 · Multi-Account Isolation (logout <-> login)', () {
    test('AccountScope genera rutas SQLite, media y prefs separadas por userId', () {
      expect(AccountScope.dbFileName(101), 'db_user_101.sqlite');
      expect(AccountScope.dbFileName(202), 'db_user_202.sqlite');
      expect(AccountScope.dbFileName(null), 'db_guest.sqlite');

      final mediaA = AccountScope.mediaCategoryPath(
        '/data/app/docs',
        101,
        AccountScope.mediaCategoryEvidencias,
      );
      final mediaB = AccountScope.mediaCategoryPath(
        '/data/app/docs',
        202,
        AccountScope.mediaCategoryEvidencias,
      );
      expect(mediaA, isNot(equals(mediaB)));
      expect(AccountScope.pathBelongsToUser('$mediaA/foto.jpg', 101), isTrue);
      expect(AccountScope.pathBelongsToUser('$mediaA/foto.jpg', 202), isFalse);

      expect(
        AccountScope.prefsKey(101, 'initial_sync_done'),
        'user_101_initial_sync_done',
      );
      expect(
        AccountScope.prefsKey(202, 'initial_sync_done'),
        'user_202_initial_sync_done',
      );
    });

    test('StoragePreferences mantiene configuracion independiente entre cuentas A y B', () async {
      SharedPreferences.setMockInitialValues({});

      final prefsA = StoragePreferences(userId: 10);
      await prefsA.setValorRetencion(30);
      await prefsA.setUnidadRetencion(UnidadRetencion.horas);
      await prefsA.setLimpiezaAutomatica(false);

      final prefsB = StoragePreferences(userId: 20);
      final dataB = await prefsB.cargarPreferencias();
      expect(dataB.valorRetencion, StoragePreferences.defaultValorRetencion);
      expect(dataB.unidadRetencion, StoragePreferences.defaultUnidadRetencion);
      expect(dataB.limpiezaAutomaticaActiva, isTrue);

      final dataA = await prefsA.cargarPreferencias();
      expect(dataA.valorRetencion, 30);
      expect(dataA.unidadRetencion, UnidadRetencion.horas);
      expect(dataA.limpiezaAutomaticaActiva, isFalse);
    });

    test('Ciclo A (POR_SUBIR) -> logout -> B (0 ordenes A) -> A retoma y sube con su JWT', () async {
      final tempDir = await Directory.systemTemp.createTemp('eam_p5_multi_');
      addTearDown(() async {
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      });

      final fotoA = File('${tempDir.path}/ev_a.jpg');
      await fotoA.writeAsBytes(utf8.encode('fake-jpeg-bytes-user-a'));
      final firmaA = File('${tempDir.path}/firma_a.png');
      await firmaA.writeAsBytes(utf8.encode('fake-png-bytes-user-a'));

      // Técnico A inicia sesión con su SQLite privado
      final dbA = AppDatabase(
        scopedUserId: 10,
        executor: NativeDatabase.memory(),
      );
      // Técnico B inicia sesión con su SQLite privado
      final dbB = AppDatabase(
        scopedUserId: 20,
        executor: NativeDatabase.memory(),
      );
      addTearDown(() async {
        await dbA.close();
        await dbB.close();
      });

      // Estados locales reservados (-1 POR_SUBIR y -2 CONFLICTO_ELIMINADA) creados en beforeOpen
      expect(await dbA.getEstadoOrdenById(-1), isNotNull);
      expect(await dbA.getEstadoOrdenById(-2), isNotNull);

      // Técnico A inserta orden en estado POR_SUBIR + entrada en cola liviana (sin Base64)
      final idOrdenLocalA = await dbA.into(dbA.ordenes).insert(
            OrdenesCompanion.insert(
              idBackend: const Value(9001),
              numeroOrden: 'OS-A-9001',
              idCliente: 1,
              idEquipo: 1,
              idTipoServicio: 1,
              idEstado: -1, // POR_SUBIR
              isDirty: const Value(true),
            ),
          );

      final lightweightQueuePayload = MediaPayloadCodec.buildLightweightQueuePayload(
        basePayload: {
          'idOrden': 9001,
          'observaciones': 'Trabajo finalizado offline por A',
          'horaEntrada': '08:00',
          'horaSalida': '09:30',
          'usuarioId': 10,
          'actividades': const [],
          'mediciones': const [],
          'modo': 'SOLO_DATOS',
        },
        evidenciasRefs: [
          {
            'tipo': 'ANTES',
            'rutaLocal': fotoA.path,
            'descripcion': 'Evidencia inicial',
          },
        ],
        firmasRefs: {
          'tecnico': {
            'tipo': 'TECNICO',
            'rutaLocal': firmaA.path,
            'idPersona': 10,
            'nombreFirmante': 'Tecnico A',
            'cargoFirmante': 'Tecnico',
          },
        },
        ownerUserId: 10,
      );

      final encodedQueueJson = jsonEncode(lightweightQueuePayload);
      // Verificar que NO guarda blobs base64 dentro de SQLite
      expect(lightweightQueuePayload.containsKey('evidencias'), isFalse);
      expect(lightweightQueuePayload.containsKey('firmas'), isFalse);
      expect(encodedQueueJson.contains('evidenciasRefs'), isTrue);

      await dbA.insertOrdenPendienteSync(
        idOrdenLocal: idOrdenLocalA,
        idOrdenBackend: 9001,
        payloadJson: encodedQueueJson,
      );

      expect(await dbA.countUnsyncedWork(), 1);

      // Técnico B inicia sesión -> ve 0 órdenes y 0 pendientes del Técnico A
      expect(await dbB.getAllOrdenes(), isEmpty);
      expect(await dbB.countUnsyncedWork(), 0);
      expect(await dbB.getOrdenesPendientesSync(), isEmpty);

      // Defensa en profundidad: intentar hidratar/subir payload de A bajo sesión de B falla
      expect(
        () => MediaPayloadCodec.hydratePayloadForUpload(
          lightweightQueuePayload,
          expectedOwnerUserId: 20,
        ),
        throwsStateError,
      );

      // Técnico A vuelve a iniciar sesión: su cola sigue intacta y se hidrata sin claves internas `_`
      expect(await dbA.countUnsyncedWork(), 1);
      final hydratedForA = await MediaPayloadCodec.hydratePayloadForUpload(
        jsonDecode(encodedQueueJson) as Map<String, dynamic>,
        expectedOwnerUserId: 10,
      );
      expect(hydratedForA.containsKey('_ownerUserId'), isFalse);
      expect(hydratedForA.containsKey('evidenciasRefs'), isFalse);
      expect(hydratedForA.containsKey('firmasRefs'), isFalse);
      expect((hydratedForA['evidencias'] as List).length, 1);
      expect(
        ((hydratedForA['evidencias'] as List).first as Map)['base64'],
        base64Encode(utf8.encode('fake-jpeg-bytes-user-a')),
      );
      expect(
        ((hydratedForA['firmas'] as Map)['tecnico'] as Map)['base64'],
        base64Encode(utf8.encode('fake-png-bytes-user-a')),
      );
    });
  });

  group('Phase 5 · SmartSync 404 Protection & Offline Queue Resiliency', () {
    test('Paso 4B marca orden isDirty/enCola con 404 como CONFLICTO_ELIMINADA sin purgar datos locales', () async {
      final db = AppDatabase(
        scopedUserId: 55,
        executor: NativeDatabase.memory(),
      );
      addTearDown(() async => db.close());

      // Insertar orden limpia (404 debe purgar) y orden sucia/offline (404 debe proteger como CONFLICTO_ELIMINADA)
      final idClean = await db.into(db.ordenes).insert(
            OrdenesCompanion.insert(
              idBackend: const Value(701),
              numeroOrden: 'OS-CLEAN-701',
              idCliente: 1,
              idEquipo: 1,
              idTipoServicio: 1,
              idEstado: 1,
              isDirty: const Value(false),
            ),
          );
      final idDirty = await db.into(db.ordenes).insert(
            OrdenesCompanion.insert(
              idBackend: const Value(702),
              numeroOrden: 'OS-DIRTY-702',
              idCliente: 1,
              idEquipo: 1,
              idTipoServicio: 1,
              idEstado: 1,
              isDirty: const Value(true),
            ),
          );
      await db.insertOrdenPendienteSync(
        idOrdenLocal: idDirty,
        idOrdenBackend: 702,
        payloadJson: jsonEncode({'idOrden': 702, '_ownerUserId': 55}),
      );

      final dio = Dio();
      dio.httpClientAdapter = _MockAdapter((options) async {
        if (options.path.contains('/sync/compare/')) {
          return ResponseBody.fromString(
            jsonEncode({
              'serverTimestamp': DateTime.now().toUtc().toIso8601String(),
              'ordenes': [],
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString(
          jsonEncode({'message': 'Not Found'}),
          404,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final smartSync = SmartSyncService(_FakeApiClient(dio), db);
      final res = await smartSync.sincronizarInteligente(55);
      expect(res.success, isTrue);

      // Orden limpia sin trabajo pendiente sí se purgó
      expect(await db.getOrdenById(idClean), isNull);

      // Orden con trabajo offline se preservó intacta en estado CONFLICTO_ELIMINADA (-2)
      final dirtyUpdated = await db.getOrdenById(idDirty);
      expect(dirtyUpdated, isNotNull);
      expect(dirtyUpdated!.idEstado, -2);
      expect(dirtyUpdated.isDirty, isTrue);

      final queueRows = await (db.select(db.ordenesPendientesSync)
            ..where((q) => q.idOrdenLocal.equals(idDirty)))
          .get();
      expect(queueRows.length, 1);
      expect(queueRows.first.estadoSync, 'CONFLICTO_ELIMINADA');
    });

    test('OfflineSyncService rechaza procesar orden ajena a la cuenta activa', () async {
      final db = AppDatabase(
        scopedUserId: 99,
        executor: NativeDatabase.memory(),
      );
      addTearDown(() async => db.close());

      final idOrden = await db.into(db.ordenes).insert(
            OrdenesCompanion.insert(
              idBackend: const Value(888),
              numeroOrden: 'OS-888',
              idCliente: 1,
              idEquipo: 1,
              idTipoServicio: 1,
              idEstado: -1,
            ),
          );
      await db.insertOrdenPendienteSync(
        idOrdenLocal: idOrden,
        idOrdenBackend: 888,
        payloadJson: jsonEncode({'idOrden': 888, '_ownerUserId': 10}),
      );

      final dio = Dio();
      var serverCalled = false;
      dio.httpClientAdapter = _MockAdapter((options) async {
        serverCalled = true;
        return ResponseBody.fromString('{}', 200);
      });

      final service = OfflineSyncService(
        db,
        dio,
        _AlwaysOnlineConnectivity(),
        SyncProgressNotifier(),
      );

      final result = await service.procesarCola();
      expect(serverCalled, isFalse);
      expect(result.ordenesSync, 0);
      expect(result.ordenesFallidas, 1);
    });
  });

  group('Phase 5 · Pure Declarative Engine & Equipment Agnosticism', () {
    test('ESCALA_ESTADO titulada "Verificar Temperatura de Tablero" NO es secuestrada', () {
      final res = DeclarativeActivityResolver.resolve(
        descripcion: 'Verificar Temperatura de Tablero',
        tipoControlInput: 'ESCALA_ESTADO',
        rolSemantico: null,
        hasCatalogEntry: true,
      );
      expect(res.kind, DeclarativeControlKind.escalaEstado);
    });

    test('tipoControlInput explícito BINARIO y LECTURA_CONTADOR mandan sin importar texto', () {
      final binRes = DeclarativeActivityResolver.resolve(
        descripcion: 'Revisar Nivel de Aceite y Fugas',
        tipoControlInput: 'BINARIO',
        hasCatalogEntry: true,
      );
      expect(binRes.kind, DeclarativeControlKind.selectorOpciones);
      expect(binRes.controlType, 'BINARIO');

      final counterRes = DeclarativeActivityResolver.resolve(
        descripcion: 'Inspección general',
        tipoControlInput: 'LECTURA_CONTADOR',
        hasCatalogEntry: true,
      );
      expect(counterRes.kind, DeclarativeControlKind.lecturaContador);
    });

    test('MetricaUsoMobile lee dinámicamente unidad_uso KM_ODO/CICLOS desde _metrologia', () {
      final metricaOdo = MetricaUsoMobile.desdeConfig(
        jsonEncode({
          '_metrologia': {
            'unidadUso': 'KM_ODO',
            'etiquetaContador': 'Odómetro Cabina',
            'requiereHorometro': true,
            'lecturaActual': 45210,
          },
        }),
      );
      expect(metricaOdo.unidadUso, 'KM_ODO');
      expect(metricaOdo.sufijo, 'km');
      expect(metricaOdo.etiqueta, 'Odómetro Cabina');
      expect(metricaOdo.lecturaActual, 45210.0);
    });
  });

  group('Phase 5 · White-Label Branding & Generic Health Discovery', () {
    test('OrgBrandingConfig parsea paleta, moneda, locale y fallback offline cleanly', () {
      final cfg = OrgBrandingConfig.fromJson({
        'nombre_comercial': 'Puertas Automáticas',
        'eslogan': 'Especialistas en Accesos',
        'color_primario': '#D97706',
        'locale': 'es-MX',
        'codigo_moneda': 'MXN',
        'simbolo_moneda': '\$',
        'decimales_moneda': 2,
      });

      expect(cfg.nombreComercial, 'Puertas Automáticas');
      expect(cfg.eslogan, 'Especialistas en Accesos');
      expect(cfg.colorPrimario, const Color(0xFFD97706));
      expect(cfg.materialLocale, const Locale('es', 'MX'));
      expect(cfg.codigoMoneda, 'MXN');
    });

    test('VerifiedApiServer acepta identidad genérica White-Label EAM API', () {
      final genericEam = VerifiedApiServer.tryFromHealthJson(
        {
          'status': 'ok',
          'service': 'EAM API',
          'app': 'eam-api',
          'hostname': 'SRV-PUERTAS',
          'environment': 'production',
        },
        baseUrl: 'https://api.puertas.example.com/api',
        originLabel: 'Producción',
        latencyMs: 18,
      );
      expect(genericEam, isNotNull);
      expect(genericEam!.hostname, 'SRV-PUERTAS');
    });
  });
}
