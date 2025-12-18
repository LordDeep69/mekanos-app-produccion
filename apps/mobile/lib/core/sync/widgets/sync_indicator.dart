import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../features/sync/presentation/pending_sync_screen.dart';
import '../sync_state.dart';

/// Widget indicador de sincronización para mostrar en AppBar o Home
/// ✅ SYNC MANUAL: Al presionar, navega a "Órdenes por Subir"
class SyncIndicator extends ConsumerWidget {
  final bool showText;
  final bool compact;

  const SyncIndicator({super.key, this.showText = true, this.compact = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);
    final theme = Theme.of(context);

    // Envolver en GestureDetector para hacer clickeable
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const PendingSyncScreen()),
        );
      },
      child: compact
          ? _buildCompactIndicator(context, syncState, theme)
          : _buildFullIndicator(context, syncState, theme),
    );
  }

  Widget _buildCompactIndicator(
    BuildContext context,
    SyncState syncState,
    ThemeData theme,
  ) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: syncState.isSyncing
          ? SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  theme.colorScheme.primary,
                ),
              ),
            )
          : Icon(
              _getStatusIcon(syncState.status),
              size: 20,
              color: _getStatusColor(syncState.status, theme),
            ),
    );
  }

  Widget _buildFullIndicator(
    BuildContext context,
    SyncState syncState,
    ThemeData theme,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _getBackgroundColor(syncState.status, theme),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (syncState.isSyncing)
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  theme.colorScheme.primary,
                ),
              ),
            )
          else
            Icon(
              _getStatusIcon(syncState.status),
              size: 16,
              color: _getStatusColor(syncState.status, theme),
            ),
          if (showText) ...[
            const SizedBox(width: 8),
            Text(
              syncState.isSyncing
                  ? syncState.currentStep ?? 'Sincronizando...'
                  : syncState.lastSyncText,
              style: theme.textTheme.bodySmall?.copyWith(
                color: _getStatusColor(syncState.status, theme),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  IconData _getStatusIcon(SyncStatus status) {
    switch (status) {
      case SyncStatus.idle:
        return Icons.cloud_outlined;
      case SyncStatus.syncing:
        return Icons.sync;
      case SyncStatus.success:
        return Icons.cloud_done;
      case SyncStatus.error:
        return Icons.cloud_off;
    }
  }

  Color _getStatusColor(SyncStatus status, ThemeData theme) {
    switch (status) {
      case SyncStatus.idle:
        return theme.colorScheme.onSurface.withOpacity(0.6);
      case SyncStatus.syncing:
        return theme.colorScheme.primary;
      case SyncStatus.success:
        return Colors.green;
      case SyncStatus.error:
        return theme.colorScheme.error;
    }
  }

  Color _getBackgroundColor(SyncStatus status, ThemeData theme) {
    switch (status) {
      case SyncStatus.idle:
        return theme.colorScheme.surfaceContainerHighest.withOpacity(0.5);
      case SyncStatus.syncing:
        return theme.colorScheme.primaryContainer.withOpacity(0.3);
      case SyncStatus.success:
        return Colors.green.withOpacity(0.1);
      case SyncStatus.error:
        return theme.colorScheme.errorContainer.withOpacity(0.3);
    }
  }
}

/// Botón de sincronización manual con estado
class SyncButton extends ConsumerWidget {
  final int tecnicoId;
  final bool showLabel;

  const SyncButton({super.key, required this.tecnicoId, this.showLabel = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: syncState.isSyncing ? null : () => _handleSync(context, ref),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (syncState.isSyncing)
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      theme.colorScheme.primary,
                    ),
                  ),
                )
              else
                Icon(Icons.sync, color: theme.colorScheme.primary),
              if (showLabel) ...[
                const SizedBox(width: 8),
                Text(
                  syncState.isSyncing ? 'Sincronizando...' : 'Sincronizar',
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSync(BuildContext context, WidgetRef ref) async {
    final result = await ref
        .read(syncStateProvider.notifier)
        .syncNow(tecnicoId);

    if (!context.mounted) return;

    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '✅ Sincronización completada: ${result.ordenesDescargadas} órdenes',
          ),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: ${result.error ?? result.message}'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

/// Card con información completa de sincronización
class SyncStatusCard extends ConsumerWidget {
  final int tecnicoId;

  const SyncStatusCard({super.key, required this.tecnicoId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.cloud_sync, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Estado de Sincronización',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Estado actual
            Row(
              children: [
                const SyncIndicator(compact: true),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        syncState.statusText,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (syncState.lastSyncAt != null)
                        Text(
                          'Última sync: ${syncState.lastSyncText}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),

            // Barra de progreso si está sincronizando
            if (syncState.isSyncing) ...[
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: syncState.progress > 0 ? syncState.progress : null,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
              ),
              if (syncState.currentStep != null) ...[
                const SizedBox(height: 4),
                Text(
                  syncState.currentStep!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ],

            // Error si hay
            if (syncState.status == SyncStatus.error &&
                syncState.errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 16,
                      color: theme.colorScheme.error,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        syncState.errorMessage!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.error,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Botón de sincronización
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: syncState.isSyncing
                    ? null
                    : () => ref
                          .read(syncStateProvider.notifier)
                          .syncNow(tecnicoId),
                icon: syncState.isSyncing
                    ? SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            theme.colorScheme.onPrimary,
                          ),
                        ),
                      )
                    : const Icon(Icons.sync),
                label: Text(
                  syncState.isSyncing
                      ? 'Sincronizando...'
                      : 'Sincronizar Ahora',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
