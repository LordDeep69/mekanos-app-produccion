import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/database/app_database.dart';
import '../../../core/sync/background_sync_worker.dart';
import '../../../core/sync/connectivity_service.dart';
import '../../../core/sync/offline_sync_service.dart';

/// Pantalla de órdenes pendientes de sincronización
///
/// Muestra lista de órdenes guardadas offline que aún no se han sincronizado.
/// Permite:
/// - Ver estado de cada orden (pendiente, error, en proceso)
/// - Reintentar sincronización manual
/// - Ver detalles de errores
class PendingSyncScreen extends ConsumerStatefulWidget {
  const PendingSyncScreen({super.key});

  @override
  ConsumerState<PendingSyncScreen> createState() => _PendingSyncScreenState();
}

class _PendingSyncScreenState extends ConsumerState<PendingSyncScreen> {
  bool _isSyncing = false;

  @override
  Widget build(BuildContext context) {
    final pendientesAsync = ref.watch(pendingSyncListProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sincronización Pendiente'),
        actions: [
          // Indicador de conectividad
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isOnline ? Icons.wifi : Icons.wifi_off,
                  color: isOnline ? Colors.green : Colors.red,
                  size: 20,
                ),
                const SizedBox(width: 4),
                Text(
                  isOnline ? 'Online' : 'Offline',
                  style: TextStyle(
                    color: isOnline ? Colors.green : Colors.red,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: pendientesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (pendientes) {
          if (pendientes.isEmpty) {
            return _buildEmptyState();
          }
          return _buildPendientesList(pendientes, isOnline);
        },
      ),
      floatingActionButton: pendientesAsync.maybeWhen(
        data: (pendientes) => pendientes.isNotEmpty && isOnline
            ? FloatingActionButton.extended(
                onPressed: _isSyncing ? null : _syncAll,
                icon: _isSyncing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.sync),
                label: Text(
                  _isSyncing ? 'Sincronizando...' : 'Sincronizar Todo',
                ),
                backgroundColor: _isSyncing ? Colors.grey : Colors.blue,
              )
            : null,
        orElse: () => null,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_done, size: 80, color: Colors.green.shade300),
          const SizedBox(height: 16),
          const Text(
            '¡Todo sincronizado!',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'No hay órdenes pendientes de sincronización',
            style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildPendientesList(
    List<OrdenesPendientesSyncData> pendientes,
    bool isOnline,
  ) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pendientes.length,
      itemBuilder: (context, index) {
        final orden = pendientes[index];
        return _buildOrdenCard(orden, isOnline);
      },
    );
  }

  Widget _buildOrdenCard(OrdenesPendientesSyncData orden, bool isOnline) {
    final isError = orden.estadoSync == 'ERROR';
    final isEnProceso = orden.estadoSync == 'EN_PROCESO';

    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (isEnProceso) {
      statusColor = Colors.blue;
      statusIcon = Icons.sync;
      statusText = 'Sincronizando...';
    } else if (isError) {
      statusColor = Colors.red;
      statusIcon = Icons.error_outline;
      statusText = 'Error (intento ${orden.intentos}/5)';
    } else {
      statusColor = Colors.orange;
      statusIcon = Icons.schedule;
      statusText = 'Pendiente';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Orden #${orden.idOrdenBackend}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        statusText,
                        style: TextStyle(color: statusColor, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                // Botón de reintentar
                if (isOnline && !isEnProceso)
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: () => _reintentarOrden(orden.idOrdenLocal),
                    tooltip: 'Reintentar',
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Info de fechas
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Text(
                  'Creado: ${_formatDate(orden.fechaCreacion)}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),

            if (orden.fechaUltimoIntento != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.update, size: 16, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    'Último intento: ${_formatDate(orden.fechaUltimoIntento!)}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],

            // Error message
            if (isError && orden.ultimoError != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.warning, size: 16, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        orden.ultimoError!.length > 100
                            ? '${orden.ultimoError!.substring(0, 100)}...'
                            : orden.ultimoError!,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.red.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  Future<void> _syncAll() async {
    setState(() => _isSyncing = true);

    try {
      final syncNotifier = ref.read(syncNotifierProvider.notifier);
      final result = await syncNotifier.syncManual();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.mensaje),
            backgroundColor: result.success ? Colors.green : Colors.orange,
          ),
        );
        // Refrescar lista
        ref.invalidate(pendingSyncListProvider);
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  Future<void> _reintentarOrden(int idOrdenLocal) async {
    final offlineSync = ref.read(offlineSyncServiceProvider);
    final success = await offlineSync.reintentarOrden(idOrdenLocal);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Orden sincronizada correctamente'
                : 'No se pudo sincronizar. Se reintentará automáticamente.',
          ),
          backgroundColor: success ? Colors.green : Colors.orange,
        ),
      );
      // Refrescar lista
      ref.invalidate(pendingSyncListProvider);
    }
  }
}
