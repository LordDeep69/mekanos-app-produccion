/// Widget indicador de estado de sincronización
///
/// Muestra el estado actual de sincronización de forma persistente:
/// - Al día (verde) - No hay pendientes
/// - Pendientes (naranja) - Hay órdenes por sincronizar
/// - Sincronizando (azul animado) - Sync en progreso
/// - Error (rojo) - Último intento falló
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_service.dart';
import '../../../core/sync/background_sync_worker.dart';
import '../../../core/sync/connectivity_service.dart';
import '../../../core/sync/offline_sync_service.dart';

/// Estado del indicador de sincronización
enum SyncIndicatorState {
  upToDate, // Al día - verde
  pending, // Pendientes - naranja
  syncing, // Sincronizando - azul animado
  error, // Error - rojo
  offline, // Sin conexión - gris
}

/// Provider para el estado del indicador
/// Usa autoDispose: false para mantener el estado entre rebuilds
final syncIndicatorStateProvider = StreamProvider<SyncIndicatorInfo>((ref) {
  final controller = StreamController<SyncIndicatorInfo>.broadcast();

  // Obtener dependencias
  final db = ref.watch(databaseProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final worker = ref.watch(backgroundSyncWorkerProvider);

  // Último estado conocido para evitar parpadeos
  SyncIndicatorInfo? lastKnownState;

  // Función para actualizar estado
  Future<void> updateState() async {
    try {
      final isOnline = connectivity.isOnline;
      final isSyncing = worker.isSyncing;
      final pendingCount = await db.countOrdenesPendientesSync();

      SyncIndicatorState state;
      if (!isOnline) {
        state = pendingCount > 0
            ? SyncIndicatorState.pending
            : SyncIndicatorState.offline;
      } else if (isSyncing) {
        state = SyncIndicatorState.syncing;
      } else if (pendingCount > 0) {
        state = SyncIndicatorState.pending;
      } else {
        state = SyncIndicatorState.upToDate;
      }

      lastKnownState = SyncIndicatorInfo(
        state: state,
        pendingCount: pendingCount,
        isOnline: isOnline,
      );

      controller.add(lastKnownState!);
    } catch (_) {
      // Si hay error, mantener último estado conocido
      if (lastKnownState != null) {
        controller.add(lastKnownState!);
      }
    }
  }

  // Escuchar cambios de conectividad
  final connectivitySub = connectivity.statusStream.listen(
    (_) => updateState(),
  );

  // Escuchar resultados de sync
  void onSyncResult(OfflineSyncResult result) {
    // Actualizar inmediatamente después de sync
    Future.delayed(const Duration(milliseconds: 500), updateState);
  }

  worker.addListener(onSyncResult);

  // Timer periódico para actualizar estado (cada 3 segundos para mejor respuesta)
  final timer = Timer.periodic(
    const Duration(seconds: 3),
    (_) => updateState(),
  );

  // Estado inicial inmediato
  controller.add(
    SyncIndicatorInfo(
      state: SyncIndicatorState.upToDate,
      pendingCount: 0,
      isOnline: connectivity.isOnline,
    ),
  );

  // Luego actualizar con datos reales
  updateState();

  // Cleanup
  ref.onDispose(() {
    connectivitySub.cancel();
    worker.removeListener(onSyncResult);
    timer.cancel();
    controller.close();
  });

  return controller.stream;
});

/// Info del estado de sincronización
class SyncIndicatorInfo {
  final SyncIndicatorState state;
  final int pendingCount;
  final bool isOnline;
  final String? lastError;
  final DateTime? lastSyncTime;

  SyncIndicatorInfo({
    required this.state,
    required this.pendingCount,
    required this.isOnline,
    this.lastError,
    this.lastSyncTime,
  });

  String get statusText {
    switch (state) {
      case SyncIndicatorState.upToDate:
        return 'Al día';
      case SyncIndicatorState.pending:
        return '$pendingCount pendiente${pendingCount > 1 ? 's' : ''}';
      case SyncIndicatorState.syncing:
        return 'Sincronizando...';
      case SyncIndicatorState.error:
        return 'Error de sync';
      case SyncIndicatorState.offline:
        return 'Sin conexión';
    }
  }

  IconData get icon {
    switch (state) {
      case SyncIndicatorState.upToDate:
        return Icons.cloud_done;
      case SyncIndicatorState.pending:
        return Icons.cloud_upload;
      case SyncIndicatorState.syncing:
        return Icons.sync;
      case SyncIndicatorState.error:
        return Icons.cloud_off;
      case SyncIndicatorState.offline:
        return Icons.signal_wifi_off;
    }
  }

  Color get color {
    switch (state) {
      case SyncIndicatorState.upToDate:
        return Colors.green;
      case SyncIndicatorState.pending:
        return Colors.orange;
      case SyncIndicatorState.syncing:
        return Colors.amber; // Amarillo para contrastar con header azul
      case SyncIndicatorState.error:
        return Colors.red;
      case SyncIndicatorState.offline:
        return Colors.grey;
    }
  }
}

/// Widget compacto para AppBar
class SyncStatusChip extends ConsumerWidget {
  final VoidCallback? onTap;

  const SyncStatusChip({super.key, this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncInfo = ref.watch(syncIndicatorStateProvider);

    return asyncInfo.when(
      data: (info) => _buildChip(context, info),
      loading: () => _buildLoadingChip(),
      error: (_, __) => _buildErrorChip(),
    );
  }

  Widget _buildChip(BuildContext context, SyncIndicatorInfo info) {
    final isSyncing = info.state == SyncIndicatorState.syncing;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: info.color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: info.color.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isSyncing)
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: info.color,
                  ),
                )
              else
                Icon(info.icon, size: 16, color: info.color),
              const SizedBox(width: 6),
              Text(
                info.statusText,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: info.color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  Widget _buildErrorChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Icon(Icons.help_outline, size: 16, color: Colors.grey),
    );
  }
}

/// Widget expandido con más detalles
class SyncStatusCard extends ConsumerWidget {
  final VoidCallback? onSyncPressed;
  final VoidCallback? onViewPendingPressed;

  const SyncStatusCard({
    super.key,
    this.onSyncPressed,
    this.onViewPendingPressed,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncInfo = ref.watch(syncIndicatorStateProvider);

    return asyncInfo.when(
      data: (info) => _buildCard(context, info),
      loading: () => _buildLoadingCard(),
      error: (_, __) => _buildErrorCard(),
    );
  }

  Widget _buildCard(BuildContext context, SyncIndicatorInfo info) {
    final isSyncing = info.state == SyncIndicatorState.syncing;
    final hasPending = info.pendingCount > 0;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: info.color.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: info.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: isSyncing
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: info.color,
                          ),
                        )
                      : Icon(info.icon, size: 24, color: info.color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Estado de Sincronización',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        info.statusText,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: info.color,
                        ),
                      ),
                    ],
                  ),
                ),
                // Indicador de conexión
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: info.isOnline
                        ? Colors.green.withValues(alpha: 0.15)
                        : Colors.grey.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        info.isOnline ? Icons.wifi : Icons.wifi_off,
                        size: 14,
                        color: info.isOnline ? Colors.green : Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        info.isOnline ? 'Online' : 'Offline',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: info.isOnline ? Colors.green : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Mensaje descriptivo
            if (hasPending || info.state == SyncIndicatorState.offline) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: info.color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 18, color: info.color),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _getDescriptiveMessage(info),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Botones de acción
            if (hasPending && info.isOnline && !isSyncing) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onViewPendingPressed,
                      icon: const Icon(Icons.list, size: 18),
                      label: const Text('Ver Pendientes'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: info.color,
                        side: BorderSide(color: info.color),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onSyncPressed,
                      icon: const Icon(Icons.sync, size: 18),
                      label: const Text('Sincronizar'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: info.color,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getDescriptiveMessage(SyncIndicatorInfo info) {
    if (!info.isOnline && info.pendingCount > 0) {
      return 'Hay ${info.pendingCount} orden(es) pendiente(s). Se sincronizarán automáticamente cuando recuperes conexión.';
    } else if (info.pendingCount > 0) {
      return 'Tienes ${info.pendingCount} orden(es) esperando sincronización. Puedes sincronizar ahora o esperar la sincronización automática.';
    } else if (!info.isOnline) {
      return 'Estás trabajando sin conexión. Tus cambios se guardarán localmente.';
    }
    return '';
  }

  Widget _buildLoadingCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: CircularProgressIndicator(color: Colors.grey.shade400),
        ),
      ),
    );
  }

  Widget _buildErrorCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.grey.shade400),
            const SizedBox(width: 12),
            Text(
              'Error al cargar estado',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}

/// Muestra un SnackBar con el resultado de la sincronización
void showSyncResultSnackBar(BuildContext context, OfflineSyncResult result) {
  final isSuccess = result.success && result.ordenesSync > 0;
  final hasErrors = result.ordenesFallidas > 0;

  Color backgroundColor;
  IconData icon;
  String message;

  if (isSuccess && !hasErrors) {
    backgroundColor = Colors.green;
    icon = Icons.cloud_done;
    message = '✓ ${result.ordenesSync} orden(es) sincronizada(s) exitosamente';
  } else if (hasErrors) {
    backgroundColor = Colors.orange;
    icon = Icons.warning;
    message =
        '${result.ordenesSync} sincronizada(s), ${result.ordenesFallidas} con error';
  } else if (result.mensaje == 'No hay órdenes pendientes') {
    backgroundColor = Colors.blue;
    icon = Icons.check;
    message = 'Todo sincronizado - estás al día';
  } else {
    backgroundColor = Colors.red;
    icon = Icons.cloud_off;
    message = result.mensaje;
  }

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Row(
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 12),
          Expanded(child: Text(message)),
        ],
      ),
      backgroundColor: backgroundColor,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      margin: const EdgeInsets.all(16),
    ),
  );
}
