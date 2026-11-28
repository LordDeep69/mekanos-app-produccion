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

/// Resultado del Cierre Final Armónico v2 (Fase 3).
class HarmonicCommitResult {
  final bool success;
  final bool guardadoOffline;
  final bool alreadyCompleted;
  final bool fallbackLegacyRequired;
  final String estadoLocal; // 'POR_SUBIR' | 'COMPLETADA' | 'EN_PROCESO'
  final String mensaje;
  final String? error;
  final Map<String, dynamic>? datos;

  const HarmonicCommitResult({
    required this.success,
    this.guardadoOffline = false,
    this.alreadyCompleted = false,
    this.fallbackLegacyRequired = false,
    this.estadoLocal = 'EN_PROCESO',
    required this.mensaje,
    this.error,
    this.datos,
  });
}

/// Callback opcional de progreso durante el cierre armónico v2.
typedef HarmonicProgressCallback = void Function(String etapa, String mensaje, int porcentaje);

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
  final Map<int, Completer<bool>> _activeDrains = {};
  final Set<int> _pendingRedrainOrders = {};
  final Set<int> _finalizingOrders = {};
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

  Future<void> _enqueueActividadUpsertInternal(
    int idActividadLocal, {
    bool scheduleFlush = true,
  }) async {
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

    if (scheduleFlush) _scheduleFlush(act.idOrden);
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

  Future<void> _enqueueMedicionUpsertInternal(
    int idMedicionLocal, {
    bool scheduleFlush = true,
  }) async {
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

    if (scheduleFlush) _scheduleFlush(med.idOrden);
  }

  /// Encola creación o actualización de un Pendiente técnico (flush inmediato `0ms`).
  Future<void> enqueuePendienteUpsert(int idPendienteLocal) =>
      _runSerializedEnqueue(() => _enqueuePendienteUpsertInternal(idPendienteLocal));

  Future<void> _enqueuePendienteUpsertInternal(
    int idPendienteLocal, {
    bool scheduleFlush = true,
  }) async {
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

    if (scheduleFlush) _scheduleFlush(pend.idOrden, immediate: true);
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

  Future<void> _enqueueEvidenciaCapturedInternal(
    int idEvidenciaLocal, {
    bool scheduleFlush = true,
  }) async {
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

    if (scheduleFlush) _scheduleFlush(ev.idOrden);
  }

  /// Actualiza solo la descripción/caption de una evidencia (si ya subió a Cloudinary,
  /// salta por completo Carril 2 y envía solo ~180 bytes por Carril 1!).
  Future<void> enqueueEvidenciaMetaUpdate(int idEvidenciaLocal) =>
      _runSerializedEnqueue(() => _enqueueEvidenciaMetaUpdateInternal(idEvidenciaLocal));

  Future<void> _enqueueEvidenciaMetaUpdateInternal(
    int idEvidenciaLocal, {
    bool scheduleFlush = true,
  }) async {
    final ev = await (_db.select(_db.evidencias)
          ..where((e) => e.idLocal.equals(idEvidenciaLocal)))
        .getSingleOrNull();
    if (ev == null) return;

    // Si aún no tiene URL remota, el encolado MEDIA llevará la descripción actualizada
    if (ev.urlRemota == null || ev.urlRemota!.isEmpty) {
      await _enqueueEvidenciaCapturedInternal(
        idEvidenciaLocal,
        scheduleFlush: scheduleFlush,
      );
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

    if (scheduleFlush) _scheduleFlush(ev.idOrden);
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

  Future<void> _enqueueFirmaUpsertInternal(
    int idFirmaLocal, {
    bool soloMetadatos = false,
    bool scheduleFlush = true,
  }) async {
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

    if (scheduleFlush) _scheduleFlush(firma.idOrden);
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
    final activeDrain = _activeDrains[idOrdenLocal];
    if (activeDrain != null) {
      _pendingRedrainOrders.add(idOrdenLocal);
      return activeDrain.future;
    }

    final completer = Completer<bool>();
    _activeDrains[idOrdenLocal] = completer;
    var drainedResult = false;
    try {
      final orden = await _db.getOrdenById(idOrdenLocal);
      if (orden == null || orden.idBackend == null) {
        drainedResult = true;
        return true;
      }

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

      if (pendingAll.isEmpty) {
        drainedResult = true;
        return true;
      }

      // 🛡️ BLINDAJE JIT: Confirmar red REAL (HEAD /health) ANTES de pedir firmas Cloudinary o enviar deltas
      final reachable = await _reachabilityProbe();
      if (!reachable) {
        debugPrint(
          '📴 [DELTA-OUTBOX] Sin conectividad real (HEAD /health) para OS #${orden.idBackend}; '
          '${pendingAll.length} mutaciones preservadas en SQLite sin desperdiciar firmas.',
        );
        drainedResult = false;
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

      // 3. CARRIL 3 (COMMIT): Si la orden está lista en POR_SUBIR con ORDEN_FINALIZAR
      // y ya no quedan mutaciones MEDIA/METADATA pendientes, ejecutar finalizar-commit automáticamente.
      final pendingDeltasCount = await _countPendingMediaOrMetadata(idOrdenLocal);
      if (pendingDeltasCount == 0 && !_finalizingOrders.contains(idOrdenLocal)) {
        final commitItem = await (_db.select(_db.syncOutbox)
              ..where(
                (o) =>
                    o.idOrdenLocal.equals(idOrdenLocal) &
                    o.lane.equals('COMMIT') &
                    o.entityType.equals('ORDEN_FINALIZAR') &
                    o.status.equals('PENDING') &
                    (o.nextRetryAt.isNull() |
                        o.nextRetryAt.isSmallerOrEqualValue(DateTime.now())),
              )
              ..limit(1))
            .getSingleOrNull();

        if (commitItem != null) {
          await _executeQueuedFinalizarCommit(
            orden.idBackend!,
            idOrdenLocal,
            commitItem,
          );
        }
      }

      final remaining = await _db.countPendingOutboxByOrden(idOrdenLocal);
      drainedResult = remaining == 0;
      return drainedResult;
    } finally {
      _activeDrains.remove(idOrdenLocal);
      if (!completer.isCompleted) completer.complete(drainedResult);
      if (_pendingRedrainOrders.remove(idOrdenLocal) && !_disposed) {
        _scheduleFlush(idOrdenLocal);
      }
    }
  }

  // ==========================================================================
  // FASE 3 · CIERRE FINAL ARMÓNICO (v2) + ESTADO REAL `POR_SUBIR` + MANIFEST
  // ==========================================================================

  Future<int> _countPendingMediaOrMetadata(int idOrdenLocal) async {
    final rows = await (_db.select(_db.syncOutbox)
          ..where(
            (o) =>
                o.idOrdenLocal.equals(idOrdenLocal) &
                (o.lane.equals('MEDIA') | o.lane.equals('METADATA')) &
                (o.status.equals('PENDING') | o.status.equals('IN_FLIGHT')),
          ))
        .get();
    return rows.length;
  }

  /// Escanea todas las tablas locales de la orden y encola ÚNICAMENTE los registros
  /// no sincronizados o modificados (`syncedVersion == 0 || localVersion > syncedVersion || isDirty`).
  /// Las fotos ya sincronizadas con `urlRemota` y sin cambios generan **0 bytes de subida**.
  Future<void> enqueueAllUnsyncedForOrder(int idOrdenLocal) =>
      _runSerializedEnqueue(() => _enqueueAllUnsyncedForOrderInternal(idOrdenLocal));

  Future<void> _enqueueAllUnsyncedForOrderInternal(int idOrdenLocal) async {
    final orden = await _db.getOrdenById(idOrdenLocal);
    if (orden == null || orden.idBackend == null) return;

    // 1. Actividades ejecutadas con respuesta o simbología
    final actividades = await _db.getActividadesByOrden(idOrdenLocal);
    for (final act in actividades) {
      if (act.deletedAt != null) continue;
      final tieneDato =
          (act.simbologia != null && act.simbologia!.isNotEmpty) ||
          (act.respuestaJson != null && act.respuestaJson!.trim().isNotEmpty);
      if (!tieneDato) continue;
      final needsSync =
          act.clientUuid == null ||
          act.clientUuid!.isEmpty ||
          act.syncedVersion == 0 ||
          act.localVersion > act.syncedVersion ||
          act.isDirty;
      if (needsSync) {
        await _enqueueActividadUpsertInternal(act.idLocal, scheduleFlush: false);
      }
    }

    // 2. Mediciones con valor numérico (incluye 0.0!)
    final mediciones = await _db.getMedicionesByOrden(idOrdenLocal);
    for (final med in mediciones) {
      if (med.deletedAt != null || med.valor == null) continue;
      final needsSync =
          med.clientUuid == null ||
          med.clientUuid!.isEmpty ||
          med.syncedVersion == 0 ||
          med.localVersion > med.syncedVersion ||
          med.isDirty;
      if (needsSync) {
        await _enqueueMedicionUpsertInternal(med.idLocal, scheduleFlush: false);
      }
    }

    // 3. Pendientes técnicos
    final pendientes = await _db.getPendientesByOrden(idOrdenLocal);
    for (final pend in pendientes) {
      if (pend.deletedAt != null) continue;
      final needsSync =
          pend.clientUuid == null ||
          pend.clientUuid!.isEmpty ||
          pend.syncedVersion == 0 ||
          pend.localVersion > pend.syncedVersion ||
          pend.isDirty;
      if (needsSync) {
        await _enqueuePendienteUpsertInternal(pend.idLocal, scheduleFlush: false);
      }
    }

    // 4. Evidencias fotográficas (Carril 2 solo si no tiene urlRemota; Carril 1 solo si metadata cambió)
    final evidencias = await (_db.select(_db.evidencias)
          ..where((e) => e.idOrden.equals(idOrdenLocal)))
        .get();
    for (final ev in evidencias) {
      if (ev.deletedAt != null) continue;
      final hasRemoteUrl = ev.urlRemota != null && ev.urlRemota!.trim().isNotEmpty;
      if (!hasRemoteUrl) {
        await _enqueueEvidenciaCapturedInternal(ev.idLocal, scheduleFlush: false);
      } else if (ev.clientUuid == null ||
          ev.clientUuid!.isEmpty ||
          ev.syncedVersion == 0 ||
          ev.localVersion > ev.syncedVersion ||
          ev.isDirty) {
        await _enqueueEvidenciaMetaUpdateInternal(ev.idLocal, scheduleFlush: false);
      }
    }

    // 5. Firmas digitales (si no fueron confirmadas aún)
    final firmas = await _db.getFirmasByOrden(idOrdenLocal);
    for (final f in firmas) {
      if (f.deletedAt != null) continue;
      final needsSync =
          (f.syncedVersion == 0 && !f.subida) ||
          f.localVersion > f.syncedVersion ||
          f.isDirty;
      if (needsSync) {
        await _enqueueFirmaUpsertInternal(f.idLocal, scheduleFlush: false);
      }
    }
  }

  /// Construye el manifiesto exacto de `clientUuids` activos locales para validación
  /// transaccional en `POST /api/ordenes/:id/finalizar-commit`.
  Future<Map<String, dynamic>> buildCommitManifest(int idOrdenLocal) async {
    final actividades = await _db.getActividadesByOrden(idOrdenLocal);
    final mediciones = await _db.getMedicionesByOrden(idOrdenLocal);
    final evidencias = await (_db.select(_db.evidencias)
          ..where((e) => e.idOrden.equals(idOrdenLocal)))
        .get();
    final pendientes = await _db.getPendientesByOrden(idOrdenLocal);
    final firmas = await _db.getFirmasByOrden(idOrdenLocal);

    final actividadesUuids = actividades
        .where(
          (a) =>
              a.deletedAt == null &&
              a.clientUuid != null &&
              a.clientUuid!.isNotEmpty &&
              ((a.simbologia != null && a.simbologia!.isNotEmpty) ||
                  (a.respuestaJson != null && a.respuestaJson!.trim().isNotEmpty)),
        )
        .map((a) => a.clientUuid!)
        .toSet()
        .toList();

    final medicionesUuids = mediciones
        .where(
          (m) =>
              m.deletedAt == null &&
              m.valor != null &&
              m.clientUuid != null &&
              m.clientUuid!.isNotEmpty,
        )
        .map((m) => m.clientUuid!)
        .toSet()
        .toList();

    final evidenciasUuids = evidencias
        .where(
          (e) =>
              e.deletedAt == null &&
              e.clientUuid != null &&
              e.clientUuid!.isNotEmpty,
        )
        .map((e) => e.clientUuid!)
        .toSet()
        .toList();

    final pendientesUuids = pendientes
        .where(
          (p) =>
              p.deletedAt == null &&
              p.clientUuid != null &&
              p.clientUuid!.isNotEmpty,
        )
        .map((p) => p.clientUuid!)
        .toSet()
        .toList();

    final firmasTipos = firmas
        .where((f) => f.deletedAt == null)
        .map((f) => f.tipoFirma.toUpperCase())
        .toSet()
        .toList();

    return {
      'actividadesUuids': actividadesUuids,
      'medicionesUuids': medicionesUuids,
      'evidenciasUuids': evidenciasUuids,
      'pendientesUuids': pendientesUuids,
      'firmasTipos': firmasTipos,
    };
  }

  /// Re-encola selectivamente ÚNICAMENTE los registros reportados como faltantes
  /// por el servidor ante HTTP 409 `INCOMPLETE_MANIFEST`.
  Future<int> reEnqueueMissingManifestItems(
    int idOrdenLocal,
    Map<String, dynamic> missing,
  ) =>
      _runSerializedEnqueue(
        () => _reEnqueueMissingManifestItemsInternal(idOrdenLocal, missing),
      );

  Future<int> _reEnqueueMissingManifestItemsInternal(
    int idOrdenLocal,
    Map<String, dynamic> missing,
  ) async {
    int count = 0;

    final missingActs = ((missing['actividades'] as List?) ?? const [])
        .map((e) => e.toString())
        .toSet();
    if (missingActs.isNotEmpty) {
      final rows = await (_db.select(_db.actividadesEjecutadas)
            ..where(
              (a) =>
                  a.idOrden.equals(idOrdenLocal) &
                  a.clientUuid.isIn(missingActs),
            ))
          .get();
      for (final r in rows) {
        await (_db.update(_db.actividadesEjecutadas)
              ..where((a) => a.idLocal.equals(r.idLocal)))
            .write(
          const ActividadesEjecutadasCompanion(
            syncedVersion: Value(0),
            syncedPayloadHash: Value(null),
            isDirty: Value(true),
          ),
        );
        await _enqueueActividadUpsertInternal(r.idLocal, scheduleFlush: false);
        count++;
      }
    }

    final missingMeds = ((missing['mediciones'] as List?) ?? const [])
        .map((e) => e.toString())
        .toSet();
    if (missingMeds.isNotEmpty) {
      final rows = await (_db.select(_db.mediciones)
            ..where(
              (m) =>
                  m.idOrden.equals(idOrdenLocal) &
                  m.clientUuid.isIn(missingMeds),
            ))
          .get();
      for (final r in rows) {
        await (_db.update(_db.mediciones)
              ..where((m) => m.idLocal.equals(r.idLocal)))
            .write(
          const MedicionesCompanion(
            syncedVersion: Value(0),
            syncedPayloadHash: Value(null),
            isDirty: Value(true),
          ),
        );
        await _enqueueMedicionUpsertInternal(r.idLocal, scheduleFlush: false);
        count++;
      }
    }

    final missingEvs = ((missing['evidencias'] as List?) ?? const [])
        .map((e) => e.toString())
        .toSet();
    if (missingEvs.isNotEmpty) {
      final rows = await (_db.select(_db.evidencias)
            ..where(
              (e) =>
                  e.idOrden.equals(idOrdenLocal) &
                  e.clientUuid.isIn(missingEvs),
            ))
          .get();
      for (final r in rows) {
        await (_db.update(_db.evidencias)
              ..where((e) => e.idLocal.equals(r.idLocal)))
            .write(
          const EvidenciasCompanion(
            syncedVersion: Value(0),
            isDirty: Value(true),
          ),
        );
        if (r.urlRemota != null && r.urlRemota!.trim().isNotEmpty) {
          await _enqueueEvidenciaMetaUpdateInternal(r.idLocal, scheduleFlush: false);
        } else {
          await _enqueueEvidenciaCapturedInternal(r.idLocal, scheduleFlush: false);
        }
        count++;
      }
    }

    final missingPends = ((missing['pendientes'] as List?) ?? const [])
        .map((e) => e.toString())
        .toSet();
    if (missingPends.isNotEmpty) {
      final rows = await (_db.select(_db.ordenesPendientes)
            ..where(
              (p) =>
                  p.idOrden.equals(idOrdenLocal) &
                  p.clientUuid.isIn(missingPends),
            ))
          .get();
      for (final r in rows) {
        await (_db.update(_db.ordenesPendientes)
              ..where((p) => p.idLocal.equals(r.idLocal)))
            .write(
          const OrdenesPendientesCompanion(
            syncedVersion: Value(0),
            isDirty: Value(true),
          ),
        );
        await _enqueuePendienteUpsertInternal(r.idLocal, scheduleFlush: false);
        count++;
      }
    }

    final missingFirmas = ((missing['firmas'] as List?) ?? const [])
        .map((e) => e.toString().toUpperCase())
        .toSet();
    if (missingFirmas.isNotEmpty) {
      final rows = await _db.getFirmasByOrden(idOrdenLocal);
      for (final f in rows) {
        if (missingFirmas.contains(f.tipoFirma.toUpperCase())) {
          await (_db.update(_db.firmas)
                ..where((t) => t.idLocal.equals(f.idLocal)))
              .write(
            const FirmasCompanion(
              syncedVersion: Value(0),
              subida: Value(false),
              isDirty: Value(true),
            ),
          );
          await _enqueueFirmaUpsertInternal(f.idLocal, scheduleFlush: false);
          count++;
        }
      }
    }

    return count;
  }

  /// Transiciona localmente la orden al estado real **`POR_SUBIR`** (`idEstado = -1`, editable)
  /// y registra la intención atómica `ORDEN_FINALIZAR` en `sync_outbox` + puntero ligero en
  /// `ordenes_pendientes_sync` (0% Base64, 0% payload truncado).
  Future<void> _marcarOrdenPorSubirYEncolarCommit({
    required int idOrdenLocal,
    required int idOrdenBackend,
    required String observaciones,
    required String horaEntrada,
    required String horaSalida,
    String? razonFalla,
    String? emailAdicional,
    String modo = 'SOLO_DATOS',
    bool esResubida = false,
  }) async {
    await _db.asegurarEstadoLocal(
      id: -1,
      codigo: 'POR_SUBIR',
      nombre: 'Por Subir',
      esEstadoFinal: false,
    );

    final actividades = await _db.getActividadesByOrden(idOrdenLocal);
    final mediciones = await _db.getMedicionesByOrden(idOrdenLocal);
    final evidencias = await (_db.select(_db.evidencias)
          ..where((e) => e.idOrden.equals(idOrdenLocal)))
        .get();
    final equipos = await _db.getEquiposByOrdenServicio(idOrdenBackend);

    final commitPayload = <String, dynamic>{
      'pipelineVersion': 'V2_HARMONIC',
      'idOrdenBackend': idOrdenBackend,
      'observaciones': observaciones,
      'horaEntrada': horaEntrada,
      'horaSalida': horaSalida,
      if (razonFalla != null && razonFalla.trim().isNotEmpty)
        'razonFalla': razonFalla.trim(),
      if (emailAdicional != null && emailAdicional.trim().isNotEmpty)
        'emailAdicional': emailAdicional.trim(),
      'modo': modo,
      'esResubida': esResubida,
      'esMultiEquipo': equipos.length > 1,
      'totalActividades': actividades.where((a) => a.deletedAt == null).length,
      'totalMediciones': mediciones.where((m) => m.deletedAt == null && m.valor != null).length,
      'totalEvidencias': evidencias.where((e) => e.deletedAt == null).length,
      if (_db.scopedUserId != null) '_ownerUserId': _db.scopedUserId,
    };

    final now = DateTime.now();
    await _db.transaction(() async {
      // NUNCA pasar a COMPLETADA antes de confirmación HTTP 200 del servidor!
      await (_db.update(_db.ordenes)
            ..where((o) => o.idLocal.equals(idOrdenLocal)))
          .write(
        OrdenesCompanion(
          idEstado: esResubida ? const Value.absent() : const Value(-1),
          observacionesTecnico: Value(observaciones),
          horaEntradaTexto: Value(horaEntrada),
          horaSalidaTexto: Value(horaSalida),
          razonFalla: razonFalla != null && razonFalla.trim().isNotEmpty
              ? Value(razonFalla.trim())
              : const Value.absent(),
          isDirty: const Value(true),
          updatedAt: Value(now),
        ),
      );

      await _db.enqueueOrCoalesceOutbox(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: idOrdenBackend,
        lane: 'COMMIT',
        entityType: 'ORDEN_FINALIZAR',
        entityClientUuid: 'orden-finalizar-$idOrdenBackend',
        operation: 'UPSERT',
        targetVersion: 1,
        payloadJson: jsonEncode(commitPayload),
      );

      // Puntero ligero en ordenes_pendientes_sync para visibilidad en PendingSyncScreen
      final existingQueue = await (_db.select(_db.ordenesPendientesSync)
            ..where((q) => q.idOrdenLocal.equals(idOrdenLocal)))
          .getSingleOrNull();
      if (existingQueue != null) {
        await (_db.update(_db.ordenesPendientesSync)
              ..where((q) => q.idOrdenLocal.equals(idOrdenLocal)))
            .write(
          OrdenesPendientesSyncCompanion(
            payloadJson: Value(jsonEncode(commitPayload)),
            estadoSync: const Value('PENDIENTE'),
            intentos: const Value(0),
            ultimoError: const Value(null),
          ),
        );
      } else {
        await _db.insertOrdenPendienteSync(
          idOrdenLocal: idOrdenLocal,
          idOrdenBackend: idOrdenBackend,
          payloadJson: jsonEncode(commitPayload),
        );
      }
    });
  }

  /// Marca la orden local como `COMPLETADA` **ÚNICAMENTE** tras recibir HTTP 200 de `finalizar-commit`.
  Future<void> _marcarOrdenCompletadaPostCommit(
    int idOrdenLocal, {
    bool esResubida = false,
  }) async {
    final now = DateTime.now();
    await _db.transaction(() async {
      final estadoCompletada = await (_db.select(_db.estadosOrden)
            ..where((e) => e.codigo.equals('COMPLETADA')))
          .getSingleOrNull();

      await (_db.update(_db.ordenes)
            ..where((o) => o.idLocal.equals(idOrdenLocal)))
          .write(
        OrdenesCompanion(
          idEstado: estadoCompletada != null
              ? Value(estadoCompletada.id)
              : const Value.absent(),
          isDirty: const Value(false),
          permiteEdicionTecnico: const Value(false),
          fechaFin: esResubida ? const Value.absent() : Value(now),
          lastSyncedAt: Value(now),
          updatedAt: Value(now),
        ),
      );

      await (_db.update(_db.evidencias)
            ..where((e) => e.idOrden.equals(idOrdenLocal)))
          .write(
        EvidenciasCompanion(
          subida: const Value(true),
          isDirty: const Value(false),
          lastSyncedAt: Value(now),
        ),
      );

      await (_db.update(_db.firmas)
            ..where((f) => f.idOrden.equals(idOrdenLocal)))
          .write(
        FirmasCompanion(
          subida: const Value(true),
          isDirty: const Value(false),
          lastSyncedAt: Value(now),
        ),
      );

      await (_db.delete(_db.syncOutbox)
            ..where(
              (o) =>
                  o.idOrdenLocal.equals(idOrdenLocal) &
                  o.lane.equals('COMMIT') &
                  o.entityType.equals('ORDEN_FINALIZAR'),
            ))
          .go();

      await _db.eliminarOrdenPendienteSync(idOrdenLocal);
    });
  }

  /// Orquestador maestro de **SUBIR ORDEN v2 (Cierre Final Armónico)**:
  /// 1. Bloqueo per-orden contra doble clic simultáneo.
  /// 2. Valida requisitos mínimos locales (firma técnico + >=1 evidencia).
  /// 3. Persiste cierre en estado real `POR_SUBIR` (`idEstado = -1`, editable) y encola deltas faltantes.
  /// 4. Verifica red real (`HEAD /health`): si está offline retorna `guardadoOffline: true` sin bloquear en `COMPLETADA`.
  /// 5. Si hay red: drena Carril 2 (`MEDIA` JIT) -> Carril 1 (`METADATA`) -> dispara `POST /ordenes/:id/finalizar-commit`
  ///    con manifiesto de `clientUuids` (con auto-recuperación ante HTTP 409 `INCOMPLETE_MANIFEST`).
  /// 6. Marca `COMPLETADA` **únicamente** tras HTTP 200 confirmado del servidor.
  Future<HarmonicCommitResult> finalizarOrdenArmonico({
    required int idOrdenLocal,
    required int idOrdenBackend,
    required String observaciones,
    required String horaEntrada,
    required String horaSalida,
    String? razonFalla,
    String? emailAdicional,
    String modo = 'SOLO_DATOS',
    bool esResubida = false,
    HarmonicProgressCallback? onProgress,
  }) async {
    if (_finalizingOrders.contains(idOrdenLocal)) {
      return const HarmonicCommitResult(
        success: false,
        estadoLocal: 'POR_SUBIR',
        mensaje: 'Esta orden ya se está sincronizando en este momento.',
        error: 'FINALIZACION_EN_PROGRESO',
      );
    }

    _finalizingOrders.add(idOrdenLocal);
    try {
      // Cancelar timers de debounce pendientes para esta orden
      _trailingTimers.remove(idOrdenLocal)?.cancel();
      _maxWaitTimers.remove(idOrdenLocal)?.cancel();

      onProgress?.call('preparando', 'Verificando datos y requisitos...', 10);

      // Validar requisitos mínimos locales (soportando datos hidratados de otro dispositivo!)
      final firmas = await _db.getFirmasByOrden(idOrdenLocal);
      final tieneFirmaTecnico = firmas.any(
        (f) => f.deletedAt == null && f.tipoFirma.toUpperCase() == 'TECNICO',
      );
      if (!tieneFirmaTecnico) {
        return const HarmonicCommitResult(
          success: false,
          mensaje: 'Falta la firma del técnico',
          error: 'MISSING_TECNICO_SIGNATURE',
        );
      }

      final evidencias = await (_db.select(_db.evidencias)
            ..where((e) => e.idOrden.equals(idOrdenLocal)))
          .get();
      final evidenciasActivas = evidencias.where((e) => e.deletedAt == null).toList();
      if (evidenciasActivas.isEmpty) {
        return const HarmonicCommitResult(
          success: false,
          mensaje: 'Debe incluir al menos una evidencia fotográfica',
          error: 'MISSING_EVIDENCIAS',
        );
      }

      // Resolver si esResubida aplica (solo si el estado actual es COMPLETADA)
      var modoResubida = esResubida;
      final ordenLocal = await _db.getOrdenById(idOrdenLocal);
      if (ordenLocal != null && modoResubida) {
        final est = await _db.getEstadoOrdenById(ordenLocal.idEstado);
        if (est?.codigo.toUpperCase() != 'COMPLETADA') {
          modoResubida = false;
        }
      }

      // 1. Transicionar a POR_SUBIR (editable, NO COMPLETADA) + encolar COMMIT + deltas faltantes
      await _marcarOrdenPorSubirYEncolarCommit(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: idOrdenBackend,
        observaciones: observaciones,
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        razonFalla: razonFalla,
        emailAdicional: emailAdicional,
        modo: modo,
        esResubida: modoResubida,
      );
      await enqueueAllUnsyncedForOrder(idOrdenLocal);
      await _enqueueChain;

      // 2. Verificar conectividad real (HEAD /health) ANTES de solicitar firmas Cloudinary
      final reachable = await _reachabilityProbe();
      if (!reachable) {
        return const HarmonicCommitResult(
          success: true,
          guardadoOffline: true,
          estadoLocal: 'POR_SUBIR',
          mensaje:
              'Sin conexión a internet. Tu orden quedó en estado POR SUBIR con todos tus datos resguardados.\n\n'
              'Se sincronizará automáticamente al recuperar señal y aún puedes revisarla o editarla.',
        );
      }

      // 3. Drenar Carril 2 (MEDIA) -> Carril 1 (METADATA) y ejecutar finalizar-commit
      return await _drainAndExecuteCommit(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: idOrdenBackend,
        observaciones: observaciones,
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        razonFalla: razonFalla,
        emailAdicional: emailAdicional,
        modo: modo,
        esResubida: modoResubida,
        onProgress: onProgress,
      );
    } finally {
      _finalizingOrders.remove(idOrdenLocal);
    }
  }

  /// Drena Carril 2 y Carril 1 (reseteando `nextRetryAt` vencidos para ejecución inmediata)
  /// y ejecuta `POST /ordenes/:id/finalizar-commit` con auto-recuperación ante `409 INCOMPLETE_MANIFEST`.
  Future<HarmonicCommitResult> _drainAndExecuteCommit({
    required int idOrdenLocal,
    required int idOrdenBackend,
    required String observaciones,
    required String horaEntrada,
    required String horaSalida,
    String? razonFalla,
    String? emailAdicional,
    String modo = 'SOLO_DATOS',
    bool esResubida = false,
    bool waitForActiveDrain = true,
    HarmonicProgressCallback? onProgress,
  }) async {
    Future<void> drainDeltasNow() async {
      // Esperar cualquier drenado en segundo plano activo sobre esta orden antes de drenar el cierre
      if (waitForActiveDrain) {
        final inflightDrain = _activeDrains[idOrdenLocal];
        if (inflightDrain != null) {
          await inflightDrain.future;
        }
      }

      // Habilitar reintento inmediato de cualquier delta PENDING diferido por backoff
      await (_db.update(_db.syncOutbox)
            ..where(
              (o) =>
                  o.idOrdenLocal.equals(idOrdenLocal) &
                  (o.lane.equals('MEDIA') | o.lane.equals('METADATA')) &
                  o.status.equals('PENDING'),
            ))
          .write(const SyncOutboxCompanion(nextRetryAt: Value(null)));

      final mediaItems = await (_db.select(_db.syncOutbox)
            ..where(
              (o) =>
                  o.idOrdenLocal.equals(idOrdenLocal) &
                  o.lane.equals('MEDIA') &
                  o.status.equals('PENDING'),
            )
            ..orderBy([(o) => OrderingTerm.asc(o.id)]))
          .get();

      if (mediaItems.isNotEmpty) {
        onProgress?.call(
          'evidencias',
          'Subiendo ${mediaItems.length} evidencia(s) pendiente(s)...',
          35,
        );
        await _drainMediaLane(idOrdenBackend, idOrdenLocal, mediaItems);
      }

      final metaItems = await (_db.select(_db.syncOutbox)
            ..where(
              (o) =>
                  o.idOrdenLocal.equals(idOrdenLocal) &
                  o.lane.equals('METADATA') &
                  o.status.equals('PENDING'),
            )
            ..orderBy([(o) => OrderingTerm.asc(o.id)]))
          .get();

      if (metaItems.isNotEmpty) {
        onProgress?.call(
          'validando',
          'Sincronizando ${metaItems.length} cambio(s) delta...',
          65,
        );
        await _drainMetadataLane(idOrdenBackend, idOrdenLocal, metaItems);
      }
    }

    await drainDeltasNow();

    // Verificar si falló algún delta de forma transitoria (red perdida a mitad del drenado)
    final remainingDeltas = await _countPendingMediaOrMetadata(idOrdenLocal);
    if (remainingDeltas > 0) {
      return const HarmonicCommitResult(
        success: true,
        guardadoOffline: true,
        estadoLocal: 'POR_SUBIR',
        mensaje:
            'Conexión inestable durante la sincronización. La orden permanece en estado POR SUBIR '
            'y continuará automáticamente al recuperar señal.',
      );
    }

    // Enviar `POST /ordenes/:id/finalizar-commit` (hasta 2 intentos si el servidor reporta 409 INCOMPLETE_MANIFEST)
    for (int intento = 1; intento <= 2; intento++) {
      onProgress?.call(
        'actualizando_estado',
        intento == 1
            ? 'Consolidando cierre en el servidor...'
            : 'Reenviando registros faltantes y consolidando cierre...',
        85,
      );

      final manifest = await buildCommitManifest(idOrdenLocal);
      final commitBody = <String, dynamic>{
        'observaciones': observaciones,
        'horaEntrada': horaEntrada,
        'horaSalida': horaSalida,
        if (razonFalla != null && razonFalla.trim().isNotEmpty)
          'razonFalla': razonFalla.trim(),
        if (emailAdicional != null && emailAdicional.trim().isNotEmpty)
          'emailAdicional': emailAdicional.trim(),
        'modo': modo,
        'esResubida': esResubida,
        'manifest': manifest,
      };

      try {
        final response = await _dio.post<Map<String, dynamic>>(
          '/ordenes/$idOrdenBackend/finalizar-commit',
          data: commitBody,
          options: Options(
            sendTimeout: const Duration(seconds: 30),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          final resData = response.data ?? const <String, dynamic>{};
          await _marcarOrdenCompletadaPostCommit(
            idOrdenLocal,
            esResubida: esResubida,
          );
          onProgress?.call('completado', '¡Orden sincronizada y cerrada!', 100);
          return HarmonicCommitResult(
            success: true,
            alreadyCompleted: resData['alreadyCompleted'] == true,
            estadoLocal: 'COMPLETADA',
            mensaje: esResubida
                ? 'Orden corregida y resubida exitosamente.'
                : 'Orden finalizada y sincronizada exitosamente.',
            datos: resData,
          );
        }
      } on DioException catch (e) {
        final status = e.response?.statusCode;
        final resData = e.response?.data;

        // 1. Recuperación inteligente ante 409 INCOMPLETE_MANIFEST
        if (status == 409 && resData is Map) {
          final code = resData['code']?.toString();
          final missing = resData['missingClientUuids'];
          if (code == 'INCOMPLETE_MANIFEST' && missing is Map && intento == 1) {
            final reQueued = await reEnqueueMissingManifestItems(
              idOrdenLocal,
              Map<String, dynamic>.from(missing),
            );
            if (reQueued > 0) {
              await drainDeltasNow();
              continue; // Reintentar finalizar-commit con manifest completo
            }
          }
        }

        // 2. Backend antiguo sin endpoint /finalizar-commit -> señalar fallback legacy limpio
        if (status == 404 || status == 405 || status == 501) {
          final bodyStr = resData?.toString() ?? '';
          if (status != 404 ||
              bodyStr.contains('Cannot POST') ||
              bodyStr.contains('finalizar-commit')) {
            return const HarmonicCommitResult(
              success: false,
              fallbackLegacyRequired: true,
              estadoLocal: 'POR_SUBIR',
              mensaje: 'Endpoint v2 no disponible en el servidor.',
              error: 'COMMIT_V2_UNAVAILABLE',
            );
          }
        }

        // 3. Rechazos definitivos de sesión/autorización (401/403)
        if (status == 401 || status == 403) {
          await (_db.delete(_db.syncOutbox)
                ..where(
                  (o) =>
                      o.idOrdenLocal.equals(idOrdenLocal) &
                      o.lane.equals('COMMIT'),
                ))
              .go();
          await _db.eliminarOrdenPendienteSync(idOrdenLocal);
          return HarmonicCommitResult(
            success: false,
            estadoLocal: esResubida ? 'COMPLETADA' : 'POR_SUBIR',
            mensaje: status == 403
                ? 'El administrador no autorizó (o revocó) la edición de esta orden.'
                : 'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
            error: status == 403 ? 'EDICION_NO_AUTORIZADA' : 'SESION_EXPIRADA',
          );
        }

        // 4. Error de red / timeout / 5xx -> preservar orden intacta en POR_SUBIR
        return const HarmonicCommitResult(
          success: true,
          guardadoOffline: true,
          estadoLocal: 'POR_SUBIR',
          mensaje:
              'No se pudo confirmar el cierre con el servidor en este momento. '
              'Tu orden quedó resguardada en estado POR SUBIR y se enviará automáticamente al estabilizarse la señal.',
        );
      } catch (_) {
        return const HarmonicCommitResult(
          success: true,
          guardadoOffline: true,
          estadoLocal: 'POR_SUBIR',
          mensaje:
              'Tu orden quedó resguardada en estado POR SUBIR y se enviará automáticamente al recuperar señal.',
        );
      }
    }

    return const HarmonicCommitResult(
      success: true,
      guardadoOffline: true,
      estadoLocal: 'POR_SUBIR',
      mensaje:
          'Algunos registros siguen pendientes de sincronización. La orden permanece en POR SUBIR y reintentará automáticamente.',
    );
  }

  /// Ejecuta automáticamente un `ORDEN_FINALIZAR` encolado en `sync_outbox` al recuperar red
  /// (cierra órdenes que quedaron en `POR_SUBIR` tras trabajar offline).
  Future<bool> _executeQueuedFinalizarCommit(
    int idOrdenBackend,
    int idOrdenLocal,
    SyncOutboxData commitItem,
  ) async {
    if (_finalizingOrders.contains(idOrdenLocal)) return false;
    _finalizingOrders.add(idOrdenLocal);
    try {
      final payload = Map<String, dynamic>.from(jsonDecode(commitItem.payloadJson) as Map);
      // Si el técnico editó la orden mientras estaba en POR_SUBIR offline, encolar deltas nuevos antes de commit
      await _enqueueAllUnsyncedForOrderInternal(idOrdenLocal);

      final ordenActual = await _db.getOrdenById(idOrdenLocal);
      final res = await _drainAndExecuteCommit(
        idOrdenLocal: idOrdenLocal,
        idOrdenBackend: idOrdenBackend,
        observaciones:
            ordenActual?.observacionesTecnico ??
            payload['observaciones']?.toString() ??
            'Servicio completado.',
        horaEntrada:
            ordenActual?.horaEntradaTexto ??
            payload['horaEntrada']?.toString() ??
            '08:00',
        horaSalida:
            ordenActual?.horaSalidaTexto ??
            payload['horaSalida']?.toString() ??
            '09:00',
        razonFalla: ordenActual?.razonFalla ?? payload['razonFalla']?.toString(),
        emailAdicional: payload['emailAdicional']?.toString(),
        modo: payload['modo']?.toString() ?? 'SOLO_DATOS',
        esResubida: payload['esResubida'] == true,
        waitForActiveDrain: false,
      );

      return res.success && !res.guardadoOffline;
    } catch (e) {
      await _scheduleOutboxRetry(commitItem, e);
      return false;
    } finally {
      _finalizingOrders.remove(idOrdenLocal);
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
