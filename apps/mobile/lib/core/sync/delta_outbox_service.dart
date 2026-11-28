import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

import '../api/api_client.dart';
import '../database/app_database.dart';
import '../database/database_service.dart';
import 'connectivity_service.dart';

/// Función top-level para calcular SHA-256 de un archivo fuera del hilo UI (`compute`).
Future<String> _computeFileSha256Isolate(String filePath) async {
  final file = File(filePath);
  if (!await file.exists()) return '';
  final bytes = await file.readAsBytes();
  return sha256.convert(bytes).toString();
}

/// Resultado de subida binaria directa al proveedor de almacenamiento (Cloudinary o R2).
class DirectUploadResponse {
  final String publicUrl;
  final String? storageKey;
  final String provider;

  const DirectUploadResponse({
    required this.publicUrl,
    this.storageKey,
    required this.provider,
  });
}

/// Contrato inyectable para subida binaria directa (Cloudinary multipart / R2 PUT).
/// Permite inyectar mocks deterministas en pruebas unitarias sin tráfico real.
typedef DirectMediaUploader = Future<DirectUploadResponse> Function({
  required String strategy,
  required String provider,
  required String uploadUrl,
  required String localFilePath,
  required String storageKey,
  Map<String, String>? fields,
  Map<String, String>? headers,
  String? fallbackPublicUrl,
});

/// Sonda inyectable de conectividad real extremo a extremo (`HEAD /health`).
typedef ReachabilityProbe = Future<bool> Function();

/// Provider global del motor Delta Sync Outbox (Fase 1).
/// Sin autoDispose para mantener vivos los timers de debounce y la suscripción de red.
final deltaOutboxServiceProvider = Provider<DeltaOutboxService>((ref) {
  final db = ref.watch(databaseProvider);
  final apiClient = ref.watch(apiClientProvider);
  final connectivity = ref.watch(connectivityServiceProvider);

  final service = DeltaOutboxService(
    db: db,
    dio: apiClient.dio,
    connectivity: connectivity,
  );
  ref.onDispose(service.dispose);
  return service;
});

/// ============================================================================
/// DELTA OUTBOX SERVICE (FASE 1 · OFFLINE-FIRST + CLOUDINARY JIT DIRECT UPLOAD)
/// ============================================================================
///
/// Motor transaccional de sincronización incremental con 2 carriles:
/// - **Carril 1 (`METADATA`)**: `POST /ordenes/:id/sync-delta` con debounce
///   inteligente (`1.5s` trailing / `5s` maxWait; `0ms` inmediato para inicio
///   de orden y creación/eliminación de pendientes).
/// - **Carril 2 (`MEDIA`)**: Subida binaria directa a Cloudinary (o R2-Ready)
///   solicitando la firma criptográfica **Just-In-Time** (`POST /ordenes/:id/evidencias/prepare-upload`)
///   únicamente cuando `HEAD /api/health` confirma conectividad real, evitando
///   expiración de firmas (1h) en modo offline y eliminando Base64 del API.
class DeltaOutboxService {
  static const _uuid = Uuid();
  static const _defaultDebounce = Duration(milliseconds: 1500);
  static const _defaultMaxWait = Duration(seconds: 5);
  static const _deltaTimeout = Duration(seconds: 15);
  static const _mediaTimeout = Duration(seconds: 60);

  final AppDatabase _db;
  final Dio _dio;
  final ConnectivityService _connectivity;
  final Duration _debounceDelay;
  final Duration _maxWaitDelay;
  final DirectMediaUploader _directUploader;
  final ReachabilityProbe _reachabilityProbe;

  final Map<int, Timer> _trailingTimers = {};
  final Map<int, Timer> _maxWaitTimers = {};
  final Set<int> _drainingOrders = {};
  final Set<int> _pendingRedrainOrders = {};
  Future<void> _enqueueChain = Future<void>.value();
  StreamSubscription<ConnectivityStatus>? _connectivitySub;
  bool _disposed = false;

  DeltaOutboxService({
    required AppDatabase db,
    required Dio dio,
    required ConnectivityService connectivity,
    Duration? debounceDelay,
    Duration? maxWaitDelay,
    DirectMediaUploader? directUploader,
    ReachabilityProbe? reachabilityProbe,
    bool autoListenConnectivity = true,
  })  : _db = db,
        _dio = dio,
        _connectivity = connectivity,
        _debounceDelay = debounceDelay ?? _defaultDebounce,
        _maxWaitDelay = maxWaitDelay ?? _defaultMaxWait,
        _directUploader = directUploader ?? _defaultDirectMediaUploader,
        _reachabilityProbe =
            reachabilityProbe ?? (() => connectivity.hasRealServerReachability(dio)) {
    if (autoListenConnectivity) {
      _connectivitySub = _connectivity.statusStream.listen((status) {
        if (status == ConnectivityStatus.online && !_disposed) {
          unawaited(flushAllPending());
        }
      });
    }
  }

  // ==========================================================================
  // HELPERS DETERMINISTAS (UUID + SHA-256)
  // ==========================================================================

  String _newUuid() => _uuid.v4();

  String _computePayloadHash(Map<String, dynamic> payload) {
    final canonical = jsonEncode(payload);
    return sha256.convert(utf8.encode(canonical)).toString();
  }

  Future<String> _computeFileSha256(String filePath) async {
    if (kIsWeb) return '';
    try {
      return await compute(_computeFileSha256Isolate, filePath);
    } catch (_) {
      return _computeFileSha256Isolate(filePath);
    }
  }

  static Future<DirectUploadResponse> _defaultDirectMediaUploader({
    required String strategy,
    required String provider,
    required String uploadUrl,
    required String localFilePath,
    required String storageKey,
    Map<String, String>? fields,
    Map<String, String>? headers,
    String? fallbackPublicUrl,
  }) async {
    final cleanDio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 20),
        sendTimeout: _mediaTimeout,
        receiveTimeout: _mediaTimeout,
      ),
    );

    if (strategy == 'R2_PUT') {
      final bytes = await File(localFilePath).readAsBytes();
      await cleanDio.put(
        uploadUrl,
        data: Stream.fromIterable([bytes]),
        options: Options(
          headers: {
            ...?headers,
            Headers.contentLengthHeader: bytes.length,
          },
        ),
      );
      return DirectUploadResponse(
        publicUrl: fallbackPublicUrl ?? uploadUrl.split('?').first,
        storageKey: storageKey,
        provider: 'R2',
      );
    }

    // Por defecto: CLOUDINARY_MULTIPART (binario directo, 0% Base64)
    final formMap = <String, dynamic>{
      ...?fields,
      'file': await MultipartFile.fromFile(
        localFilePath,
        filename: p.basename(localFilePath),
      ),
    };
    final response = await cleanDio.post<Map<String, dynamic>>(
      uploadUrl,
      data: FormData.fromMap(formMap),
    );
    final body = response.data ?? const {};
    final secureUrl = (body['secure_url'] ?? body['url'])?.toString();
    if (secureUrl == null || secureUrl.isEmpty) {
      throw Exception('Cloudinary no devolvió secure_url tras subida directa');
    }
    final publicId = body['public_id']?.toString() ?? storageKey;
    return DirectUploadResponse(
      publicUrl: secureUrl,
      storageKey: publicId,
      provider: 'CLOUDINARY',
    );
  }

  // ==========================================================================
  // SERIALIZACIÓN FIFO DE ENCOLADO + HELPERS DE CONCURRENCIA
  // ==========================================================================

  /// Serializa estrictamente en orden FIFO todas las mutaciones hacia `sync_outbox`
  /// y tablas de dominio para impedir race conditions en ráfagas rápidas (`unawaited`)
  /// sobre asignación de `clientUuid`, incremento monotónico de `localVersion` y coalescing.
  Future<T> _runSerializedEnqueue<T>(Future<T> Function() action) {
    final completer = Completer<T>();
    _enqueueChain = _enqueueChain.then((_) async {
      try {
        final result = await action();
        if (!completer.isCompleted) completer.complete(result);
      } catch (e, st) {
        if (!completer.isCompleted) completer.completeError(e, st);
      }
    });
    return completer.future;
  }

  /// Verifica si existe una mutación `IN_FLIGHT` activa para `(entityType, clientUuid)`.
  /// Si existe, no podemos cancelar silenciosamente reversiones anti-no-op ni deletes locales.
  Future<bool> _hasInFlightOutbox(String entityType, String clientUuid) async {
    final rows = await (_db.select(_db.syncOutbox)
          ..where(
            (o) =>
                o.entityType.equals(entityType) &
                o.entityClientUuid.equals(clientUuid) &
                o.status.equals('IN_FLIGHT'),
          )
          ..limit(1))
        .get();
    return rows.isNotEmpty;
  }

  // ==========================================================================
  // MÉTODOS DE ENCOLADO ATÓMICO POR ENTIDAD (WIRE PARA SERVICIOS Y WIDGETS)
  // ==========================================================================

  /// Encola el inicio de ejecución de la orden (flush inmediato `0ms`).
  Future<void> enqueueOrdenInicio(int idOrdenLocal) =>
      _runSerializedEnqueue(() => _enqueueOrdenInicioInternal(idOrdenLocal));

  Future<void> _enqueueOrdenInicioInternal(int idOrdenLocal) async {
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null || orden.idBackend == null) return;

    final nextVersion = orden.localVersion + 1;
    final payload = <String, dynamic>{
      'iniciarSiAsignada': true,
      'fechaInicioReal': (orden.fechaInicio ?? DateTime.now()).toIso8601String(),
      'syncVersion': nextVersion,
    };

    await _db.transaction(() async {
      await (_db.update(_db.ordenes)..where((o) => o.idLocal.equals(idOrdenLocal))).write(
        OrdenesCompanion(
          localVersion: Value(nextVersion),
          isDirty: const Value(true),
          updatedAt: Value(DateTime.now()),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'ORDEN_INICIAR',
        entityClientUuid: 'orden-inicio-${orden.idBackend}',
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode(payload),
      );
    });

    _scheduleFlush(idOrdenLocal, immediate: true);
  }

  /// Encola observaciones generales / razón de falla / horas de la orden (debounce 1.5s).
  Future<void> enqueueObservacionesOrden(int idOrdenLocal) =>
      _runSerializedEnqueue(() => _enqueueObservacionesOrdenInternal(idOrdenLocal));

  Future<void> _enqueueObservacionesOrdenInternal(int idOrdenLocal) async {
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null || orden.idBackend == null) return;

    final nextVersion = orden.localVersion + 1;
    final payload = <String, dynamic>{
      'observacionesTecnico': orden.observacionesTecnico,
      'trabajoRealizado': orden.trabajoRealizado,
      'razonFalla': orden.razonFalla,
      'horaEntrada': orden.horaEntradaTexto,
      'horaSalida': orden.horaSalidaTexto,
      'syncVersion': nextVersion,
    };

    await _db.transaction(() async {
      await (_db.update(_db.ordenes)..where((o) => o.idLocal.equals(idOrdenLocal))).write(
        OrdenesCompanion(
          localVersion: Value(nextVersion),
          isDirty: const Value(true),
          updatedAt: Value(DateTime.now()),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'OBSERVACION',
        entityClientUuid: 'orden-obs-${orden.idBackend}',
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode(payload),
      );
    });

    _scheduleFlush(idOrdenLocal);
  }

  /// Encola creación o edición de una actividad del checklist (debounce 1.5s + anti-no-op).
  Future<void> enqueueActividadUpsert(int idActividadLocal) =>
      _runSerializedEnqueue(() => _enqueueActividadUpsertInternal(idActividadLocal));

  Future<void> _enqueueActividadUpsertInternal(int idActividadLocal) async {
    final act = await (_db.select(_db.actividadesEjecutadas)
          ..where((a) => a.idLocal.equals(idActividadLocal)))
        .getSingleOrNull();
    if (act == null) return;

    final orden = await _db.getOrdenById(act.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final clientUuid = (act.clientUuid != null && act.clientUuid!.isNotEmpty)
        ? act.clientUuid!
        : _newUuid();

    Map<String, dynamic>? respuestaDecoded;
    if (act.respuestaJson != null && act.respuestaJson!.trim().isNotEmpty) {
      try {
        final raw = jsonDecode(act.respuestaJson!);
        if (raw is Map<String, dynamic>) respuestaDecoded = raw;
      } catch (_) {}
    }

    final obsFinal = _combinarObservacionActividad(act.observacion, act.observacionTecnico);
    final contentForHash = <String, dynamic>{
      'idOrdenEquipo': act.idOrdenEquipo,
      'idActividadCatalogo': act.idActividadCatalogo,
      'estado': act.simbologia,
      'observaciones': obsFinal,
      'respuestaJson': respuestaDecoded,
      'deleted': false,
    };
    final payloadHash = _computePayloadHash(contentForHash);

    // Regla anti-no-op: si volvió exactamente al estado ya confirmado en servidor y no hay IN_FLIGHT
    if (act.syncedVersion > 0 &&
        act.syncedPayloadHash == payloadHash &&
        !(await _hasInFlightOutbox('ACTIVIDAD', clientUuid))) {
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityType.equals('ACTIVIDAD') &
                  o.entityClientUuid.equals(clientUuid) &
                  o.status.equals('PENDING'),
            ))
          .go();
      await (_db.update(_db.actividadesEjecutadas)
            ..where((a) => a.idLocal.equals(idActividadLocal)))
          .write(
        ActividadesEjecutadasCompanion(
          isDirty: const Value(false),
          payloadHash: Value(payloadHash),
        ),
      );
      return;
    }

    final nextVersion = (act.localVersion < act.syncedVersion
            ? act.syncedVersion
            : act.localVersion) +
        1;
    final deltaPayload = <String, dynamic>{
      'clientUuid': clientUuid,
      'idLocal': act.idLocal,
      'idOrdenEquipo': act.idOrdenEquipo,
      'idActividadCatalogo': act.idActividadCatalogo,
      'descripcionManual': act.descripcion,
      'sistema': act.sistema,
      'ordenSecuencia': act.ordenEjecucion,
      'estado': act.simbologia,
      'observaciones': obsFinal,
      'respuestaJson': respuestaDecoded,
      'fechaEjecucion': (act.fechaEjecucion ?? DateTime.now()).toIso8601String(),
      'syncVersion': nextVersion,
      'payloadHash': payloadHash,
      'deleted': false,
    };

    await _db.transaction(() async {
      await (_db.update(_db.actividadesEjecutadas)
            ..where((a) => a.idLocal.equals(idActividadLocal)))
          .write(
        ActividadesEjecutadasCompanion(
          clientUuid: Value(clientUuid),
          localVersion: Value(nextVersion),
          payloadHash: Value(payloadHash),
          deletedAt: const Value(null),
          isDirty: const Value(true),
        ),
      );

      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: act.idOrden,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'ACTIVIDAD',
        entityClientUuid: clientUuid,
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode(deltaPayload),
      );
    });

    _scheduleFlush(act.idOrden);
  }

  /// Encola eliminación (tombstone) de una actividad local si ya fue sincronizada antes.
  Future<void> enqueueActividadDeleteSnapshot(ActividadesEjecutada act) =>
      _runSerializedEnqueue(() => _enqueueActividadDeleteSnapshotInternal(act));

  Future<void> _enqueueActividadDeleteSnapshotInternal(ActividadesEjecutada act) async {
    final clientUuid = act.clientUuid;
    if (clientUuid == null || clientUuid.isEmpty) return;

    if (act.syncedVersion == 0 && !(await _hasInFlightOutbox('ACTIVIDAD', clientUuid))) {
      // Nunca llegó al servidor -> 0 bytes de red
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityType.equals('ACTIVIDAD') &
                  o.entityClientUuid.equals(clientUuid) &
                  o.status.equals('PENDING'),
            ))
          .go();
      return;
    }

    final orden = await _db.getOrdenById(act.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final nextVersion = act.localVersion + 1;
    await _db.enqueueOrCoalesceOutbox(
      idOrdenLocal: act.idOrden,
      idOrdenBackend: orden.idBackend,
      lane: 'METADATA',
      entityType: 'ACTIVIDAD',
      entityClientUuid: clientUuid,
      operation: 'DELETE',
      targetVersion: nextVersion,
      payloadJson: jsonEncode({
        'clientUuid': clientUuid,
        'idOrdenEquipo': act.idOrdenEquipo,
        'idActividadCatalogo': act.idActividadCatalogo,
        'syncVersion': nextVersion,
        'deleted': true,
      }),
    );

    _scheduleFlush(act.idOrden);
  }

  /// Encola creación, actualización (incluyendo valor 0) o limpieza de una medición.
  Future<void> enqueueMedicionUpsert(int idMedicionLocal) =>
      _runSerializedEnqueue(() => _enqueueMedicionUpsertInternal(idMedicionLocal));

  Future<void> _enqueueMedicionUpsertInternal(int idMedicionLocal) async {
    final med = await (_db.select(_db.mediciones)
          ..where((m) => m.idLocal.equals(idMedicionLocal)))
        .getSingleOrNull();
    if (med == null) return;

    final orden = await _db.getOrdenById(med.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final clientUuid = (med.clientUuid != null && med.clientUuid!.isNotEmpty)
        ? med.clientUuid!
        : _newUuid();

    final deleted = med.valor == null;
    final hasInFlight = await _hasInFlightOutbox('MEDICION', clientUuid);
    if (deleted && med.syncedVersion == 0 && !hasInFlight) {
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityType.equals('MEDICION') &
                  o.entityClientUuid.equals(clientUuid) &
                  o.status.equals('PENDING'),
            ))
          .go();
      return;
    }

    final contentForHash = <String, dynamic>{
      'idOrdenEquipo': med.idOrdenEquipo,
      'idParametroMedicion': med.idParametro,
      'valorNumerico': med.valor,
      'observaciones': med.observacion,
      'deleted': deleted,
    };
    final payloadHash = _computePayloadHash(contentForHash);

    if (med.syncedVersion > 0 && med.syncedPayloadHash == payloadHash && !hasInFlight) {
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityType.equals('MEDICION') &
                  o.entityClientUuid.equals(clientUuid) &
                  o.status.equals('PENDING'),
            ))
          .go();
      await (_db.update(_db.mediciones)..where((m) => m.idLocal.equals(idMedicionLocal))).write(
        MedicionesCompanion(
          isDirty: const Value(false),
          payloadHash: Value(payloadHash),
        ),
      );
      return;
    }

    final nextVersion = (med.localVersion < med.syncedVersion
            ? med.syncedVersion
            : med.localVersion) +
        1;
    final deltaPayload = <String, dynamic>{
      'clientUuid': clientUuid,
      'idLocal': med.idLocal,
      'idOrdenEquipo': med.idOrdenEquipo,
      'idParametroMedicion': med.idParametro,
      'valorNumerico': med.valor,
      'unidadMedida': med.unidadMedida,
      'observaciones': med.observacion,
      'fechaMedicion': (med.fechaMedicion ?? DateTime.now()).toIso8601String(),
      'syncVersion': nextVersion,
      'payloadHash': payloadHash,
      'deleted': deleted,
    };

    await _db.transaction(() async {
      await (_db.update(_db.mediciones)..where((m) => m.idLocal.equals(idMedicionLocal))).write(
        MedicionesCompanion(
          clientUuid: Value(clientUuid),
          localVersion: Value(nextVersion),
          payloadHash: Value(payloadHash),
          deletedAt: Value(deleted ? DateTime.now() : null),
          isDirty: const Value(true),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: med.idOrden,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'MEDICION',
        entityClientUuid: clientUuid,
        operation: deleted ? 'DELETE' : 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode(deltaPayload),
      );
    });

    _scheduleFlush(med.idOrden);
  }

  /// Encola creación o actualización de un Pendiente técnico (flush inmediato `0ms`).
  Future<void> enqueuePendienteUpsert(int idPendienteLocal) =>
      _runSerializedEnqueue(() => _enqueuePendienteUpsertInternal(idPendienteLocal));

  Future<void> _enqueuePendienteUpsertInternal(int idPendienteLocal) async {
    final pend = await (_db.select(_db.ordenesPendientes)
          ..where((p) => p.idLocal.equals(idPendienteLocal)))
        .getSingleOrNull();
    if (pend == null) return;

    final orden = await _db.getOrdenById(pend.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final clientUuid = (pend.clientUuid != null && pend.clientUuid!.isNotEmpty)
        ? pend.clientUuid!
        : _newUuid();

    final nextVersion = (pend.localVersion < pend.syncedVersion
            ? pend.syncedVersion
            : pend.localVersion) +
        1;
    final payloadHash = _computePayloadHash({
      'idOrdenEquipo': pend.idOrdenEquipo,
      'idPendienteCatalogo': pend.idPendienteCatalogo,
      'descripcion': pend.descripcion,
      'origen': pend.origen,
      'prioridad': pend.prioridad,
      'observaciones': pend.observaciones,
    });

    final deltaPayload = <String, dynamic>{
      'clientUuid': clientUuid,
      'idLocal': pend.idLocal,
      'idOrdenEquipo': pend.idOrdenEquipo,
      'idEquipo': pend.idEquipo,
      'idPendienteCatalogo': pend.idPendienteCatalogo,
      'descripcion': pend.descripcion,
      'origen': pend.origen,
      'prioridad': pend.prioridad,
      'observaciones': pend.observaciones,
      'syncVersion': nextVersion,
      'payloadHash': payloadHash,
      'deleted': false,
    };

    await _db.transaction(() async {
      await (_db.update(_db.ordenesPendientes)
            ..where((p) => p.idLocal.equals(idPendienteLocal)))
          .write(
        OrdenesPendientesCompanion(
          clientUuid: Value(clientUuid),
          localVersion: Value(nextVersion),
          payloadHash: Value(payloadHash),
          isDirty: const Value(true),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: pend.idOrden,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'PENDIENTE',
        entityClientUuid: clientUuid,
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode(deltaPayload),
      );
    });

    _scheduleFlush(pend.idOrden, immediate: true);
  }

  /// Encola eliminación de un pendiente técnico (0 bytes si nunca sincronizó; tombstone si ya subió).
  Future<void> enqueuePendienteDeleteSnapshot(OrdenesPendiente pend) =>
      _runSerializedEnqueue(() => _enqueuePendienteDeleteSnapshotInternal(pend));

  Future<void> _enqueuePendienteDeleteSnapshotInternal(OrdenesPendiente pend) async {
    final clientUuid = pend.clientUuid;
    if (clientUuid == null || clientUuid.isEmpty) return;

    if (pend.syncedVersion == 0 && !(await _hasInFlightOutbox('PENDIENTE', clientUuid))) {
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityType.equals('PENDIENTE') &
                  o.entityClientUuid.equals(clientUuid) &
                  o.status.equals('PENDING'),
            ))
          .go();
      return;
    }

    final orden = await _db.getOrdenById(pend.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final nextVersion = pend.localVersion + 1;
    await _db.enqueueOrCoalesceOutbox(
      idOrdenLocal: pend.idOrden,
      idOrdenBackend: orden.idBackend,
      lane: 'METADATA',
      entityType: 'PENDIENTE',
      entityClientUuid: clientUuid,
      operation: 'DELETE',
      targetVersion: nextVersion,
      payloadJson: jsonEncode({
        'clientUuid': clientUuid,
        'syncVersion': nextVersion,
        'deleted': true,
      }),
    );

    _scheduleFlush(pend.idOrden, immediate: true);
  }

  /// Encola una foto recién capturada al Carril 2 (`MEDIA`) sin solicitar firma aún (Just-In-Time!).
  Future<void> enqueueEvidenciaCaptured(int idEvidenciaLocal) =>
      _runSerializedEnqueue(() => _enqueueEvidenciaCapturedInternal(idEvidenciaLocal));

  Future<void> _enqueueEvidenciaCapturedInternal(int idEvidenciaLocal) async {
    final ev = await (_db.select(_db.evidencias)
          ..where((e) => e.idLocal.equals(idEvidenciaLocal)))
        .getSingleOrNull();
    if (ev == null) return;

    final orden = await _db.getOrdenById(ev.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final clientUuid = (ev.clientUuid != null && ev.clientUuid!.isNotEmpty)
        ? ev.clientUuid!
        : _newUuid();
    final hashSha256 = (ev.hashSha256 != null && ev.hashSha256!.isNotEmpty)
        ? ev.hashSha256!
        : await _computeFileSha256(ev.rutaLocal);

    final file = File(ev.rutaLocal);
    final sizeBytes = await file.exists() ? await file.length() : 0;

    // Si está ligada a una actividad local, asegurarnos de que la actividad tenga clientUuid
    String? actividadClientUuid;
    if (ev.idActividadEjecutada != null) {
      actividadClientUuid = await _ensureActividadHasClientUuid(ev.idActividadEjecutada!);
    }

    final nextVersion = (ev.localVersion < ev.syncedVersion
            ? ev.syncedVersion
            : ev.localVersion) +
        1;

    await _db.transaction(() async {
      await (_db.update(_db.evidencias)..where((e) => e.idLocal.equals(idEvidenciaLocal))).write(
        EvidenciasCompanion(
          clientUuid: Value(clientUuid),
          hashSha256: Value(hashSha256),
          localVersion: Value(nextVersion),
          isDirty: const Value(true),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: ev.idOrden,
        idOrdenBackend: orden.idBackend,
        lane: 'MEDIA',
        entityType: 'EVIDENCIA_MEDIA',
        entityClientUuid: clientUuid,
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode({
          'clientUuid': clientUuid,
          'idLocal': ev.idLocal,
          'rutaLocal': ev.rutaLocal,
          'hashSha256': hashSha256,
          'tamanoBytes': sizeBytes,
          'mimeType': 'image/jpeg',
          'tipoEvidencia': ev.tipoEvidencia,
          'descripcion': ev.descripcion,
          'idOrdenEquipo': ev.idOrdenEquipo,
          'idActividadEjecutadaLocal': ev.idActividadEjecutada,
          'actividadClientUuid': actividadClientUuid,
          'fechaCaptura': ev.fechaCaptura.toIso8601String(),
          'syncVersion': nextVersion,
        }),
      );
    });

    _scheduleFlush(ev.idOrden);
  }

  /// Actualiza solo la descripción/caption de una evidencia (si ya subió a Cloudinary,
  /// salta por completo Carril 2 y envía solo ~180 bytes por Carril 1!).
  Future<void> enqueueEvidenciaMetaUpdate(int idEvidenciaLocal) =>
      _runSerializedEnqueue(() => _enqueueEvidenciaMetaUpdateInternal(idEvidenciaLocal));

  Future<void> _enqueueEvidenciaMetaUpdateInternal(int idEvidenciaLocal) async {
    final ev = await (_db.select(_db.evidencias)
          ..where((e) => e.idLocal.equals(idEvidenciaLocal)))
        .getSingleOrNull();
    if (ev == null) return;

    // Si aún no tiene URL remota, el encolado MEDIA llevará la descripción actualizada
    if (ev.urlRemota == null || ev.urlRemota!.isEmpty) {
      await _enqueueEvidenciaCapturedInternal(idEvidenciaLocal);
      return;
    }

    final orden = await _db.getOrdenById(ev.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final clientUuid = (ev.clientUuid != null && ev.clientUuid!.isNotEmpty)
        ? ev.clientUuid!
        : _newUuid();
    final nextVersion = (ev.localVersion < ev.syncedVersion
            ? ev.syncedVersion
            : ev.localVersion) +
        1;
    final actividadClientUuid = ev.idActividadEjecutada != null
        ? await _ensureActividadHasClientUuid(ev.idActividadEjecutada!)
        : null;

    await _db.transaction(() async {
      await (_db.update(_db.evidencias)..where((e) => e.idLocal.equals(idEvidenciaLocal))).write(
        EvidenciasCompanion(
          clientUuid: Value(clientUuid),
          localVersion: Value(nextVersion),
          isDirty: const Value(true),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: ev.idOrden,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'EVIDENCIA_META',
        entityClientUuid: clientUuid,
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode({
          'clientUuid': clientUuid,
          'idLocal': ev.idLocal,
          'idOrdenEquipo': ev.idOrdenEquipo,
          'actividadClientUuid': actividadClientUuid,
          'tipoEvidencia': ev.tipoEvidencia,
          'descripcion': ev.descripcion,
          'publicUrl': ev.urlRemota,
          'hashSha256': ev.hashSha256,
          'storageProvider': ev.storageProvider ?? 'CLOUDINARY',
          'storageKey': ev.storageKey,
          'fechaCaptura': ev.fechaCaptura.toIso8601String(),
          'syncVersion': nextVersion,
          'deleted': false,
        }),
      );
    });

    _scheduleFlush(ev.idOrden);
  }

  /// Encola eliminación de una evidencia (cancela MEDIA local si nunca subió; tombstone si ya subió).
  Future<void> enqueueEvidenciaDeleteSnapshot(Evidencia ev) =>
      _runSerializedEnqueue(() => _enqueueEvidenciaDeleteSnapshotInternal(ev));

  Future<void> _enqueueEvidenciaDeleteSnapshotInternal(Evidencia ev) async {
    final clientUuid = ev.clientUuid;
    if (clientUuid == null || clientUuid.isEmpty) return;

    // Cancelar cualquier subida de binario pendiente
    await (_db.delete(_db.syncOutbox)
          ..where(
            (o) =>
                o.entityClientUuid.equals(clientUuid) &
                o.entityType.equals('EVIDENCIA_MEDIA') &
                o.status.equals('PENDING'),
          ))
        .go();

    final hasInFlightMeta = await _hasInFlightOutbox('EVIDENCIA_META', clientUuid);
    final hasInFlightMedia = await _hasInFlightOutbox('EVIDENCIA_MEDIA', clientUuid);
    if (ev.syncedVersion == 0 &&
        (ev.urlRemota == null || ev.urlRemota!.isEmpty) &&
        !hasInFlightMeta &&
        !hasInFlightMedia) {
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityClientUuid.equals(clientUuid) &
                  o.entityType.equals('EVIDENCIA_META') &
                  o.status.equals('PENDING'),
            ))
          .go();
      return;
    }

    final orden = await _db.getOrdenById(ev.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final nextVersion = ev.localVersion + 1;
    await _db.enqueueOrCoalesceOutbox(
      idOrdenLocal: ev.idOrden,
      idOrdenBackend: orden.idBackend,
      lane: 'METADATA',
      entityType: 'EVIDENCIA_META',
      entityClientUuid: clientUuid,
      operation: 'DELETE',
      targetVersion: nextVersion,
      payloadJson: jsonEncode({
        'clientUuid': clientUuid,
        'hashSha256': ev.hashSha256,
        'syncVersion': nextVersion,
        'deleted': true,
      }),
    );

    _scheduleFlush(ev.idOrden);
  }

  /// Encola captura o edición de firma digital (PNG con dedup SHA-256).
  Future<void> enqueueFirmaUpsert(int idFirmaLocal, {bool soloMetadatos = false}) =>
      _runSerializedEnqueue(
        () => _enqueueFirmaUpsertInternal(idFirmaLocal, soloMetadatos: soloMetadatos),
      );

  Future<void> _enqueueFirmaUpsertInternal(int idFirmaLocal, {bool soloMetadatos = false}) async {
    final firma = await (_db.select(_db.firmas)
          ..where((f) => f.idLocal.equals(idFirmaLocal)))
        .getSingleOrNull();
    if (firma == null) return;

    final orden = await _db.getOrdenById(firma.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final clientUuid = (firma.clientUuid != null && firma.clientUuid!.isNotEmpty)
        ? firma.clientUuid!
        : _newUuid();

    String? firmaBase64;
    String? hashSha256 = firma.hashSha256;
    if (!soloMetadatos) {
      final file = File(firma.rutaLocal);
      if (await file.exists()) {
        final bytes = await file.readAsBytes();
        firmaBase64 = base64Encode(bytes);
        hashSha256 = sha256.convert(bytes).toString();
      }
    }

    final nextVersion = (firma.localVersion < firma.syncedVersion
            ? firma.syncedVersion
            : firma.localVersion) +
        1;

    await _db.transaction(() async {
      await (_db.update(_db.firmas)..where((f) => f.idLocal.equals(idFirmaLocal))).write(
        FirmasCompanion(
          clientUuid: Value(clientUuid),
          hashSha256: Value(hashSha256),
          localVersion: Value(nextVersion),
          isDirty: const Value(true),
        ),
      );
      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: firma.idOrden,
        idOrdenBackend: orden.idBackend,
        lane: 'METADATA',
        entityType: 'FIRMA',
        entityClientUuid: clientUuid,
        operation: 'UPSERT',
        targetVersion: nextVersion,
        payloadJson: jsonEncode({
          'clientUuid': clientUuid,
          'idLocal': firma.idLocal,
          'tipoFirma': firma.tipoFirma,
          'hashSha256': hashSha256,
          if (firmaBase64 != null) 'firmaBase64': firmaBase64,
          'nombreFirmante': firma.nombreFirmante,
          'cargoFirmante': firma.cargoFirmante,
          'documentoFirmante': firma.documentoFirmante,
          'syncVersion': nextVersion,
          'deleted': false,
        }),
      );
    });

    _scheduleFlush(firma.idOrden);
  }

  /// Encola eliminación de firma digital.
  Future<void> enqueueFirmaDeleteSnapshot(Firma firma) =>
      _runSerializedEnqueue(() => _enqueueFirmaDeleteSnapshotInternal(firma));

  Future<void> _enqueueFirmaDeleteSnapshotInternal(Firma firma) async {
    final clientUuid = firma.clientUuid;
    if (clientUuid == null || clientUuid.isEmpty) return;

    if (firma.syncedVersion == 0 && !(await _hasInFlightOutbox('FIRMA', clientUuid))) {
      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.entityType.equals('FIRMA') &
                  o.entityClientUuid.equals(clientUuid) &
                  o.status.equals('PENDING'),
            ))
          .go();
      return;
    }

    final orden = await _db.getOrdenById(firma.idOrden);
    if (orden == null || orden.idBackend == null) return;

    final nextVersion = firma.localVersion + 1;
    await _db.enqueueOrCoalesceOutbox(
      idOrdenLocal: firma.idOrden,
      idOrdenBackend: orden.idBackend,
      lane: 'METADATA',
      entityType: 'FIRMA',
      entityClientUuid: clientUuid,
      operation: 'DELETE',
      targetVersion: nextVersion,
      payloadJson: jsonEncode({
        'clientUuid': clientUuid,
        'tipoFirma': firma.tipoFirma,
        'syncVersion': nextVersion,
        'deleted': true,
      }),
    );

    _scheduleFlush(firma.idOrden);
  }

  // ==========================================================================
  // PROGRAMACIÓN DEBOUNCE (1.5s TRAILING / 5s MAXWAIT) + DRENADO DOBLE CARRIL
  // ==========================================================================

  void _scheduleFlush(int idOrdenLocal, {bool immediate = false}) {
    if (_disposed) return;

    if (immediate) {
      _trailingTimers.remove(idOrdenLocal)?.cancel();
      _maxWaitTimers.remove(idOrdenLocal)?.cancel();
      unawaited(flushOrden(idOrdenLocal));
      return;
    }

    _trailingTimers[idOrdenLocal]?.cancel();
    _trailingTimers[idOrdenLocal] = Timer(_debounceDelay, () {
      _trailingTimers.remove(idOrdenLocal);
      _maxWaitTimers.remove(idOrdenLocal)?.cancel();
      unawaited(flushOrden(idOrdenLocal));
    });

    _maxWaitTimers.putIfAbsent(idOrdenLocal, () {
      return Timer(_maxWaitDelay, () {
        _trailingTimers.remove(idOrdenLocal)?.cancel();
        _maxWaitTimers.remove(idOrdenLocal);
        unawaited(flushOrden(idOrdenLocal));
      });
    });
  }

  /// Drena todas las órdenes con mutaciones pendientes en `sync_outbox`.
  Future<void> flushAllPending() async {
    if (_disposed) return;
    final pendingRows = await (_db.select(_db.syncOutbox)
          ..where((o) => o.status.equals('PENDING')))
        .get();
    final ordenIds = pendingRows.map((e) => e.idOrdenLocal).toSet();
    for (final idOrden in ordenIds) {
      await flushOrden(idOrden);
    }
  }

  /// Drena Carril 2 (`MEDIA` con firma JIT Cloudinary) y luego Carril 1 (`METADATA` -> `sync-delta`).
  /// Retorna `true` si la orden quedó sin pendientes (o no había nada pendiente).
  Future<bool> flushOrden(int idOrdenLocal) async {
    if (_disposed) return false;
    // Garantizar que cualquier enqueue* previamente despachado (`unawaited`)
    // haya terminado su commit en SQLite antes de leer la cola.
    await _enqueueChain;
    if (_disposed) return false;
    if (_drainingOrders.contains(idOrdenLocal)) {
      _pendingRedrainOrders.add(idOrdenLocal);
      return false;
    }

    _drainingOrders.add(idOrdenLocal);
    try {
      final orden = await _db.getOrdenById(idOrdenLocal);
      if (orden == null || orden.idBackend == null) return true;

      final now = DateTime.now();
      final pendingAll = await (_db.select(_db.syncOutbox)
            ..where(
              (o) =>
                  o.idOrdenLocal.equals(idOrdenLocal) &
                  o.status.equals('PENDING') &
                  (o.nextRetryAt.isNull() | o.nextRetryAt.isSmallerOrEqualValue(now)),
            )
            ..orderBy([(o) => OrderingTerm.asc(o.id)]))
          .get();

      if (pendingAll.isEmpty) return true;

      // 🛡️ BLINDAJE JIT: Confirmar red REAL (HEAD /health) ANTES de pedir firmas Cloudinary o enviar deltas
      final reachable = await _reachabilityProbe();
      if (!reachable) {
        debugPrint(
          '📴 [DELTA-OUTBOX] Sin conectividad real (HEAD /health) para OS #${orden.idBackend}; '
          '${pendingAll.length} mutaciones preservadas en SQLite sin desperdiciar firmas.',
        );
        return false;
      }

      // 1. CARRIL 2 (MEDIA): Firma JIT Cloudinary/R2 + subida binaria directa
      final mediaItems = pendingAll.where((e) => e.lane == 'MEDIA').toList();
      if (mediaItems.isNotEmpty) {
        await _drainMediaLane(orden.idBackend!, idOrdenLocal, mediaItems);
      }

      // 2. CARRIL 1 (METADATA): Releer todos los PENDING METADATA (incluye EVIDENCIA_META recién encoladas)
      final metaItems = await (_db.select(_db.syncOutbox)
            ..where(
              (o) =>
                  o.idOrdenLocal.equals(idOrdenLocal) &
                  o.lane.equals('METADATA') &
                  o.status.equals('PENDING') &
                  (o.nextRetryAt.isNull() |
                      o.nextRetryAt.isSmallerOrEqualValue(DateTime.now())),
            )
            ..orderBy([(o) => OrderingTerm.asc(o.id)]))
          .get();

      if (metaItems.isNotEmpty) {
        await _drainMetadataLane(orden.idBackend!, idOrdenLocal, metaItems);
      }

      final remaining = await _db.countPendingOutboxByOrden(idOrdenLocal);
      return remaining == 0;
    } finally {
      _drainingOrders.remove(idOrdenLocal);
      if (_pendingRedrainOrders.remove(idOrdenLocal) && !_disposed) {
        _scheduleFlush(idOrdenLocal);
      }
    }
  }

  /// Carril 2: Solicita firma Just-In-Time en `/evidencias/prepare-upload`, sube binario directo
  /// a Cloudinary/R2 (0% Base64 por API) y encola `EVIDENCIA_META` para confirmación en Carril 1.
  Future<void> _drainMediaLane(
    int idOrdenBackend,
    int idOrdenLocal,
    List<SyncOutboxData> mediaItems,
  ) async {
    final ids = mediaItems.map((e) => e.id).toList();
    await (_db.update(_db.syncOutbox)..where((o) => o.id.isIn(ids))).write(
      SyncOutboxCompanion(
        status: const Value('IN_FLIGHT'),
        updatedAt: Value(DateTime.now()),
      ),
    );

    final parsedByUuid = <String, Map<String, dynamic>>{};
    final outboxByUuid = <String, SyncOutboxData>{};
    final prepareItems = <Map<String, dynamic>>[];

    for (final item in mediaItems) {
      final map = jsonDecode(item.payloadJson) as Map<String, dynamic>;
      final rutaLocal = map['rutaLocal']?.toString() ?? '';
      var hashSha256 = map['hashSha256']?.toString() ?? '';
      if (hashSha256.isEmpty && rutaLocal.isNotEmpty) {
        hashSha256 = await _computeFileSha256(rutaLocal);
        map['hashSha256'] = hashSha256;
      }
      if (hashSha256.isEmpty) {
        await _markOutboxPermanentFailure(item.id, 'Archivo local no disponible para hash SHA-256');
        continue;
      }

      parsedByUuid[item.entityClientUuid] = map;
      outboxByUuid[item.entityClientUuid] = item;
      prepareItems.add({
        'clientUuid': item.entityClientUuid,
        'hashSha256': hashSha256,
        'mimeType': map['mimeType'] ?? 'image/jpeg',
        'sizeBytes': map['tamanoBytes'] ?? 0,
        'tipoEvidencia': map['tipoEvidencia'] ?? 'GENERAL',
        if (map['idOrdenEquipo'] != null) 'idOrdenEquipo': map['idOrdenEquipo'],
        if (map['actividadClientUuid'] != null)
          'actividadClientUuid': map['actividadClientUuid'],
      });
    }

    if (prepareItems.isEmpty) return;

    try {
      final prepResponse = await _dio.post<Map<String, dynamic>>(
        '/ordenes/$idOrdenBackend/evidencias/prepare-upload',
        data: {'items': prepareItems},
        options: Options(sendTimeout: _deltaTimeout, receiveTimeout: _deltaTimeout),
      );
      final instructions =
          (prepResponse.data?['items'] as List?)?.cast<Map<String, dynamic>>() ?? const [];

      for (final instr in instructions) {
        final clientUuid = instr['clientUuid']?.toString();
        if (clientUuid == null) continue;
        final outboxItem = outboxByUuid[clientUuid];
        final meta = parsedByUuid[clientUuid];
        if (outboxItem == null || meta == null) continue;

        try {
          final alreadyUploaded = instr['alreadyUploaded'] == true;
          String publicUrl;
          String provider = instr['provider']?.toString() ?? 'CLOUDINARY';
          String? storageKey = instr['storageKey']?.toString();

          if (alreadyUploaded && instr['publicUrl'] != null) {
            publicUrl = instr['publicUrl'].toString();
          } else {
            final uploadUrl = instr['uploadUrl']?.toString() ?? '';
            final strategy = instr['strategy']?.toString() ?? 'CLOUDINARY_MULTIPART';
            final fieldsRaw = instr['fields'];
            final headersRaw = instr['headers'];
            final uploadRes = await _directUploader(
              strategy: strategy,
              provider: provider,
              uploadUrl: uploadUrl,
              localFilePath: meta['rutaLocal'].toString(),
              storageKey: storageKey ?? '',
              fields: fieldsRaw is Map
                  ? fieldsRaw.map((k, v) => MapEntry(k.toString(), v.toString()))
                  : null,
              headers: headersRaw is Map
                  ? headersRaw.map((k, v) => MapEntry(k.toString(), v.toString()))
                  : null,
              fallbackPublicUrl: instr['publicUrl']?.toString(),
            );
            publicUrl = uploadRes.publicUrl;
            provider = uploadRes.provider;
            storageKey = uploadRes.storageKey ?? storageKey;
          }

          final idLocalEv = meta['idLocal'] as int?;
          // Actualizar evidencia local + eliminar item MEDIA + encolar EVIDENCIA_META atómicamente
          await _db.transaction(() async {
            if (idLocalEv != null) {
              await (_db.update(_db.evidencias)..where((e) => e.idLocal.equals(idLocalEv))).write(
                EvidenciasCompanion(
                  urlRemota: Value(publicUrl),
                  storageProvider: Value(provider),
                  storageKey: Value(storageKey),
                  subida: const Value(true),
                ),
              );
            }
            await (_db.delete(_db.syncOutbox)..where((o) => o.id.equals(outboxItem.id))).go();
            await _db.enqueueOrCoalesceOutbox(
              idOrdenLocal: idOrdenLocal,
              idOrdenBackend: idOrdenBackend,
              lane: 'METADATA',
              entityType: 'EVIDENCIA_META',
              entityClientUuid: clientUuid,
              operation: 'UPSERT',
              targetVersion: outboxItem.targetVersion,
              payloadJson: jsonEncode({
                'clientUuid': clientUuid,
                'idLocal': idLocalEv,
                'idOrdenEquipo': meta['idOrdenEquipo'],
                'actividadClientUuid': meta['actividadClientUuid'],
                'tipoEvidencia': meta['tipoEvidencia'],
                'descripcion': meta['descripcion'],
                'nombreArchivo': p.basename(meta['rutaLocal'].toString()),
                'publicUrl': publicUrl,
                'hashSha256': meta['hashSha256'],
                'tamanoBytes': meta['tamanoBytes'],
                'mimeType': meta['mimeType'] ?? 'image/jpeg',
                'storageProvider': provider,
                'storageKey': storageKey,
                'fechaCaptura': meta['fechaCaptura'],
                'syncVersion': outboxItem.targetVersion,
                'deleted': false,
              }),
            );
          });
        } catch (errUpload) {
          await _scheduleOutboxRetry(outboxItem, errUpload);
        }
      }
    } catch (errPrep) {
      for (final item in mediaItems) {
        await _scheduleOutboxRetry(item, errPrep);
      }
    }
  }

  /// Carril 1: Empaqueta mutaciones `METADATA` en un único batch `POST /ordenes/:id/sync-delta`.
  Future<void> _drainMetadataLane(
    int idOrdenBackend,
    int idOrdenLocal,
    List<SyncOutboxData> metaItems,
  ) async {
    final ids = metaItems.map((e) => e.id).toList();
    await (_db.update(_db.syncOutbox)..where((o) => o.id.isIn(ids))).write(
      SyncOutboxCompanion(
        status: const Value('IN_FLIGHT'),
        updatedAt: Value(DateTime.now()),
      ),
    );

    final ordenPatch = <String, dynamic>{};
    final actividades = <Map<String, dynamic>>[];
    final pendientes = <Map<String, dynamic>>[];
    final mediciones = <Map<String, dynamic>>[];
    final evidenciasMeta = <Map<String, dynamic>>[];
    final firmas = <Map<String, dynamic>>[];

    final itemByTypeAndUuid = <String, SyncOutboxData>{};

    for (final item in metaItems) {
      final map = Map<String, dynamic>.from(jsonDecode(item.payloadJson) as Map);
      map.remove('idLocal'); // Campo solo interno de Drift

      switch (item.entityType) {
        case 'ORDEN_INICIAR':
        case 'OBSERVACION':
          ordenPatch.addAll(map);
          itemByTypeAndUuid['ORDEN:${item.entityClientUuid}'] = item;
          break;
        case 'ACTIVIDAD':
          actividades.add(map);
          itemByTypeAndUuid['ACTIVIDAD:${item.entityClientUuid}'] = item;
          break;
        case 'PENDIENTE':
          pendientes.add(map);
          itemByTypeAndUuid['PENDIENTE:${item.entityClientUuid}'] = item;
          break;
        case 'MEDICION':
          mediciones.add(map);
          itemByTypeAndUuid['MEDICION:${item.entityClientUuid}'] = item;
          break;
        case 'EVIDENCIA_META':
          evidenciasMeta.add(map);
          itemByTypeAndUuid['EVIDENCIA:${item.entityClientUuid}'] = item;
          break;
        case 'FIRMA':
          firmas.add(map);
          itemByTypeAndUuid['FIRMA:${item.entityClientUuid}'] = item;
          break;
      }
    }

    final body = <String, dynamic>{
      'batchId': _newUuid(),
      if (ordenPatch.isNotEmpty) 'ordenPatch': ordenPatch,
      if (actividades.isNotEmpty) 'actividades': actividades,
      if (pendientes.isNotEmpty) 'pendientes': pendientes,
      if (mediciones.isNotEmpty) 'mediciones': mediciones,
      if (evidenciasMeta.isNotEmpty) 'evidenciasMeta': evidenciasMeta,
      if (firmas.isNotEmpty) 'firmas': firmas,
    };

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/ordenes/$idOrdenBackend/sync-delta',
        data: body,
        options: Options(sendTimeout: _deltaTimeout, receiveTimeout: _deltaTimeout),
      );

      final resData = response.data ?? const {};
      final acks = (resData['acks'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
      final execVersion = resData['executionSyncVersion'] as int?;
      final now = DateTime.now();

      await _db.transaction(() async {
        // 1. Procesar ACKs por entidad
        for (final ack in acks) {
          final entityType = ack['entityType']?.toString() ?? '';
          final clientUuid = ack['clientUuid']?.toString() ?? '';
          final serverId = ack['serverId'] as int?;
          final acceptedVersion = ack['acceptedVersion'] as int? ?? 1;

          await _applyAckToDomainTable(
            entityType: entityType,
            clientUuid: clientUuid,
            serverId: serverId,
            acceptedVersion: acceptedVersion,
            now: now,
          );

          final outboxItem = itemByTypeAndUuid['$entityType:$clientUuid'];
          if (outboxItem != null) {
            await (_db.delete(_db.syncOutbox)..where((o) => o.id.equals(outboxItem.id))).go();
          }
        }

        // 2. Eliminar items de ordenPatch (ORDEN_INICIAR / OBSERVACION) ya confirmados por HTTP 200
        for (final item in metaItems) {
          if (item.entityType == 'ORDEN_INICIAR' || item.entityType == 'OBSERVACION') {
            await (_db.delete(_db.syncOutbox)..where((o) => o.id.equals(item.id))).go();
          }
        }

        // 3. Actualizar versión confirmada de la orden local
        if (execVersion != null || ordenPatch.isNotEmpty) {
          final ordenActual = await _db.getOrdenById(idOrdenLocal);
          if (ordenActual != null) {
            final newSynced = ordenPatch['syncVersion'] is int
                ? (ordenPatch['syncVersion'] as int)
                : ordenActual.syncedVersion;
            final remainingOutbox = await _db.countPendingOutboxByOrden(idOrdenLocal);
            await (_db.update(_db.ordenes)..where((o) => o.idLocal.equals(idOrdenLocal))).write(
              OrdenesCompanion(
                syncedVersion: Value(
                  newSynced > ordenActual.syncedVersion ? newSynced : ordenActual.syncedVersion,
                ),
                executionSyncVersion: execVersion != null
                    ? Value(execVersion)
                    : const Value.absent(),
                isDirty: Value(remainingOutbox > 0),
                lastSyncedAt: Value(now),
              ),
            );
          }
        }
      });
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 403 || status == 409) {
        // Error permanente de autorización/estado -> marcar FAILED para no ciclar batería
        for (final item in metaItems) {
          await _markOutboxPermanentFailure(
            item.id,
            'HTTP $status: ${e.response?.data ?? e.message}',
          );
        }
      } else {
        for (final item in metaItems) {
          await _scheduleOutboxRetry(item, e);
        }
      }
    } catch (e) {
      for (final item in metaItems) {
        await _scheduleOutboxRetry(item, e);
      }
    }
  }

  Future<void> _applyAckToDomainTable({
    required String entityType,
    required String clientUuid,
    required int? serverId,
    required int acceptedVersion,
    required DateTime now,
  }) async {
    switch (entityType) {
      case 'ACTIVIDAD':
        final row = await (_db.select(_db.actividadesEjecutadas)
              ..where((a) => a.clientUuid.equals(clientUuid)))
            .getSingleOrNull();
        if (row != null) {
          final sv = acceptedVersion > row.syncedVersion ? acceptedVersion : row.syncedVersion;
          await (_db.update(_db.actividadesEjecutadas)
                ..where((a) => a.idLocal.equals(row.idLocal)))
              .write(
            ActividadesEjecutadasCompanion(
              idBackend: serverId != null ? Value(serverId) : const Value.absent(),
              syncedVersion: Value(sv),
              syncedPayloadHash: row.localVersion <= sv ? Value(row.payloadHash) : const Value.absent(),
              isDirty: Value(row.localVersion > sv),
              lastSyncedAt: Value(now),
            ),
          );
        }
        break;
      case 'MEDICION':
        final row = await (_db.select(_db.mediciones)
              ..where((m) => m.clientUuid.equals(clientUuid)))
            .getSingleOrNull();
        if (row != null) {
          final sv = acceptedVersion > row.syncedVersion ? acceptedVersion : row.syncedVersion;
          await (_db.update(_db.mediciones)..where((m) => m.idLocal.equals(row.idLocal))).write(
            MedicionesCompanion(
              idBackend: serverId != null ? Value(serverId) : const Value.absent(),
              syncedVersion: Value(sv),
              syncedPayloadHash: row.localVersion <= sv ? Value(row.payloadHash) : const Value.absent(),
              isDirty: Value(row.localVersion > sv),
              lastSyncedAt: Value(now),
            ),
          );
        }
        break;
      case 'PENDIENTE':
        final row = await (_db.select(_db.ordenesPendientes)
              ..where((p) => p.clientUuid.equals(clientUuid)))
            .getSingleOrNull();
        if (row != null) {
          final sv = acceptedVersion > row.syncedVersion ? acceptedVersion : row.syncedVersion;
          await (_db.update(_db.ordenesPendientes)
                ..where((p) => p.idLocal.equals(row.idLocal)))
              .write(
            OrdenesPendientesCompanion(
              idBackend: serverId != null ? Value(serverId) : const Value.absent(),
              syncedVersion: Value(sv),
              syncedPayloadHash: row.localVersion <= sv ? Value(row.payloadHash) : const Value.absent(),
              isDirty: Value(row.localVersion > sv),
              lastSyncedAt: Value(now),
            ),
          );
        }
        break;
      case 'EVIDENCIA':
        final row = await (_db.select(_db.evidencias)
              ..where((e) => e.clientUuid.equals(clientUuid)))
            .getSingleOrNull();
        if (row != null) {
          final sv = acceptedVersion > row.syncedVersion ? acceptedVersion : row.syncedVersion;
          await (_db.update(_db.evidencias)..where((e) => e.idLocal.equals(row.idLocal))).write(
            EvidenciasCompanion(
              idBackend: serverId != null ? Value(serverId) : const Value.absent(),
              syncedVersion: Value(sv),
              syncedPayloadHash: row.localVersion <= sv ? Value(row.payloadHash) : const Value.absent(),
              subida: const Value(true),
              isDirty: Value(row.localVersion > sv),
              lastSyncedAt: Value(now),
            ),
          );
        }
        break;
      case 'FIRMA':
        final row = await (_db.select(_db.firmas)
              ..where((f) => f.clientUuid.equals(clientUuid)))
            .getSingleOrNull();
        if (row != null) {
          final sv = acceptedVersion > row.syncedVersion ? acceptedVersion : row.syncedVersion;
          await (_db.update(_db.firmas)..where((f) => f.idLocal.equals(row.idLocal))).write(
            FirmasCompanion(
              idBackend: serverId != null ? Value(serverId) : const Value.absent(),
              syncedVersion: Value(sv),
              subida: const Value(true),
              isDirty: Value(row.localVersion > sv),
              lastSyncedAt: Value(now),
            ),
          );
        }
        break;
    }
  }

  Future<String?> _ensureActividadHasClientUuid(int idActividadLocal) async {
    final act = await (_db.select(_db.actividadesEjecutadas)
          ..where((a) => a.idLocal.equals(idActividadLocal)))
        .getSingleOrNull();
    if (act == null) return null;
    if (act.clientUuid != null && act.clientUuid!.isNotEmpty) return act.clientUuid;
    final generated = _newUuid();
    await (_db.update(_db.actividadesEjecutadas)
          ..where((a) => a.idLocal.equals(idActividadLocal)))
        .write(ActividadesEjecutadasCompanion(clientUuid: Value(generated)));
    return generated;
  }

  String? _combinarObservacionActividad(String? principal, String? obsTecnico) {
    final pTrim = principal?.trim() ?? '';
    final tTrim = obsTecnico?.trim() ?? '';
    if (pTrim.isEmpty && tTrim.isEmpty) return null;
    if (pTrim.isNotEmpty && tTrim.isNotEmpty) return '$pTrim | $tTrim';
    return pTrim.isNotEmpty ? pTrim : tTrim;
  }

  Future<void> _scheduleOutboxRetry(SyncOutboxData item, Object error) async {
    final nextAttempts = item.attempts + 1;
    final backoffSeconds = (5 * (1 << (nextAttempts - 1).clamp(0, 6))).clamp(5, 300);
    await (_db.update(_db.syncOutbox)..where((o) => o.id.equals(item.id))).write(
      SyncOutboxCompanion(
        status: const Value('PENDING'),
        attempts: Value(nextAttempts),
        nextRetryAt: Value(DateTime.now().add(Duration(seconds: backoffSeconds))),
        lastError: Value(error.toString().substring(0, error.toString().length.clamp(0, 400))),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> _markOutboxPermanentFailure(int outboxId, String message) async {
    await (_db.update(_db.syncOutbox)..where((o) => o.id.equals(outboxId))).write(
      SyncOutboxCompanion(
        status: const Value('FAILED'),
        lastError: Value(message.substring(0, message.length.clamp(0, 400))),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  void dispose() {
    _disposed = true;
    for (final t in _trailingTimers.values) {
      t.cancel();
    }
    for (final t in _maxWaitTimers.values) {
      t.cancel();
    }
    _trailingTimers.clear();
    _maxWaitTimers.clear();
    _connectivitySub?.cancel();
  }
}
