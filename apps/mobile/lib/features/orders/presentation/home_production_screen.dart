/// Pantalla Home de Producción
///
/// Vista principal optimizada para el técnico de campo:
/// - Resumen de órdenes del día
/// - Estado de sincronización
/// - Accesos rápidos
/// - Indicadores de rendimiento
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_service.dart';
import '../../../core/sync/sync_lifecycle_manager.dart';
import '../../../core/sync/sync_state.dart';
import '../../../core/sync/widgets/sync_indicator.dart';
import '../../auth/data/auth_provider.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../historial/presentation/historial_screen.dart';
import '../../notificaciones/presentation/notificaciones_badge.dart';
import '../../sync/presentation/pending_sync_screen.dart';
import 'ordenes_list_screen.dart';

/// Provider para estadísticas rápidas del técnico
final quickStatsProvider = FutureProvider.autoDispose<QuickStats>((ref) async {
  final db = ref.watch(databaseProvider);
  final ordenes = await db.getAllOrdenes();
  final estados = await db.getAllEstadosOrden();

  // Crear mapa de id -> código de estado
  final estadoMap = <int, String>{};
  for (final e in estados) {
    estadoMap[e.id] = e.codigo;
  }

  // v3.2 FIX: Pendientes = todos los estados activos del técnico
  final pendientes = ordenes.where((o) {
    final codigo = estadoMap[o.idEstado] ?? '';
    return codigo == 'ASIGNADA' ||
        codigo == 'PROGRAMADA' ||
        codigo == 'EN_ESPERA_REPUESTO';
  }).length;

  // En Proceso = órdenes que el técnico ya inició
  final enProceso = ordenes.where((o) {
    final codigo = estadoMap[o.idEstado] ?? '';
    return codigo == 'EN_PROCESO';
  }).length;

  final completadas = ordenes.where((o) {
    final codigo = estadoMap[o.idEstado] ?? '';
    return codigo == 'COMPLETADA' || codigo == 'CERRADA';
  }).length;

  // Órdenes de hoy
  final hoy = DateTime.now();
  final ordenesHoy = ordenes.where((o) {
    if (o.fechaProgramada == null) return false;
    return o.fechaProgramada!.year == hoy.year &&
        o.fechaProgramada!.month == hoy.month &&
        o.fechaProgramada!.day == hoy.day;
  }).length;

  return QuickStats(
    pendientes: pendientes,
    enProceso: enProceso,
    completadas: completadas,
    ordenesHoy: ordenesHoy,
    totalOrdenes: ordenes.length,
  );
});

class QuickStats {
  final int pendientes;
  final int enProceso;
  final int completadas;
  final int ordenesHoy;
  final int totalOrdenes;

  QuickStats({
    required this.pendientes,
    required this.enProceso,
    required this.completadas,
    required this.ordenesHoy,
    required this.totalOrdenes,
  });

  factory QuickStats.empty() => QuickStats(
    pendientes: 0,
    enProceso: 0,
    completadas: 0,
    ordenesHoy: 0,
    totalOrdenes: 0,
  );
}

class HomeProductionScreen extends ConsumerStatefulWidget {
  const HomeProductionScreen({super.key});

  @override
  ConsumerState<HomeProductionScreen> createState() =>
      _HomeProductionScreenState();
}

class _HomeProductionScreenState extends ConsumerState<HomeProductionScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeSync();
    });
  }

  void _initializeSync() {
    final authState = ref.read(authStateProvider);
    final user = authState.user;
    if (user == null) return;

    final tecnicoId = user.syncId;
    final manager = ref.read(syncLifecycleManagerProvider(tecnicoId));
    manager.initialize();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final syncState = ref.watch(syncStateProvider);
    final statsAsync = ref.watch(quickStatsProvider);
    final theme = Theme.of(context);

    // ✅ FIX: Invalidar stats cuando sync complete exitosamente
    ref.listen<SyncState>(syncStateProvider, (previous, next) {
      if (previous?.status == SyncStatus.syncing &&
          next.status == SyncStatus.success) {
        // Sync terminó exitosamente, actualizar estadísticas
        ref.invalidate(quickStatsProvider);
      }
    });

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('MEKANOS'),
        centerTitle: true,
        elevation: 0,
        actions: [
          // Indicador de sync compacto
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: SyncIndicator(compact: true, showText: false),
          ),
          // Badge de notificaciones
          NotificacionesBadge(),
          // Menú de usuario
          PopupMenuButton<String>(
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Text(
                user?.email.substring(0, 1).toUpperCase() ?? 'U',
                style: TextStyle(
                  color: theme.colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            onSelected: (value) async {
              if (value == 'logout') {
                await ref.read(authStateProvider.notifier).logout();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.email ?? '',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Rol: ${user?.rol ?? ''}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 20),
                    SizedBox(width: 8),
                    Text('Cerrar sesión'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final tecnicoId = user?.syncId ?? 1;
          await ref.read(syncStateProvider.notifier).syncNow(tecnicoId);
          ref.invalidate(quickStatsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Saludo personalizado
              _buildGreetingCard(user, theme),
              const SizedBox(height: 16),

              // Estado de sincronización
              _buildSyncStatusCard(syncState, user?.syncId ?? 1, theme),
              const SizedBox(height: 16),

              // Estadísticas rápidas
              _buildQuickStatsGrid(statsAsync, theme),
              const SizedBox(height: 24),

              // Acciones rápidas
              Text(
                'Acciones Rápidas',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              _buildQuickActions(theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreetingCard(dynamic user, ThemeData theme) {
    final hour = DateTime.now().hour;
    String greeting;
    IconData icon;

    if (hour < 12) {
      greeting = 'Buenos días';
      icon = Icons.wb_sunny;
    } else if (hour < 18) {
      greeting = 'Buenas tardes';
      icon = Icons.wb_cloudy;
    } else {
      greeting = 'Buenas noches';
      icon = Icons.nightlight_round;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: theme.colorScheme.onPrimaryContainer,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    greeting,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                  ),
                  Text(
                    user?.nombre ?? user?.email?.split('@').first ?? 'Técnico',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncStatusCard(
    SyncState syncState,
    int tecnicoId,
    ThemeData theme,
  ) {
    // ✅ SYNC MANUAL: Toda la tarjeta es clickeable para ir a "Órdenes por Subir"
    return Card(
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const PendingSyncScreen()),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.cloud_sync,
                    color: theme.colorScheme.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Sincronización',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  SyncIndicator(compact: true),
                ],
              ),
              const SizedBox(height: 12),

              // Barra de progreso si está sincronizando
              if (syncState.isSyncing) ...[
                LinearProgressIndicator(
                  value: syncState.progress > 0 ? syncState.progress : null,
                ),
                const SizedBox(height: 8),
                Text(
                  syncState.currentStep ?? 'Sincronizando...',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ] else ...[
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 16,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                    const SizedBox(width: 4),
                    // ✅ FIX: Flexible para evitar overflow
                    Flexible(
                      child: Text(
                        'Última sync: ${syncState.lastSyncText}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.6,
                          ),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton.icon(
                      onPressed: () {
                        ref.read(syncStateProvider.notifier).syncNow(tecnicoId);
                      },
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Sync'),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                    ),
                  ],
                ),
              ],

              // Error si hay
              if (syncState.status == SyncStatus.error &&
                  syncState.errorMessage != null) ...[
                const SizedBox(height: 8),
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
            ],
          ),
        ),
      ), // Cierra InkWell
    ); // Cierra Card
  }

  Widget _buildQuickStatsGrid(
    AsyncValue<QuickStats> statsAsync,
    ThemeData theme,
  ) {
    return statsAsync.when(
      data: (stats) => GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.5,
        children: [
          _buildStatCard(
            'Pendientes',
            stats.pendientes.toString(),
            Icons.pending_actions,
            Colors.orange,
            theme,
            onTap: () => _navigateToOrdenes('PENDIENTE'),
          ),
          _buildStatCard(
            'En Proceso',
            stats.enProceso.toString(),
            Icons.engineering,
            Colors.blue,
            theme,
            onTap: () => _navigateToOrdenes('EN_PROCESO'),
          ),
          _buildStatCard(
            'Completadas',
            stats.completadas.toString(),
            Icons.check_circle,
            Colors.green,
            theme,
            onTap: () => _navigateToHistorial(),
          ),
          _buildStatCard(
            'Hoy',
            stats.ordenesHoy.toString(),
            Icons.today,
            Colors.purple,
            theme,
            onTap: () => _navigateToOrdenesHoy(),
          ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) =>
          const Center(child: Text('Error cargando estadísticas')),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
    ThemeData theme, {
    VoidCallback? onTap,
  }) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(icon, color: color, size: 24),
                  Text(
                    value,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
              Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActions(ThemeData theme) {
    return Column(
      children: [
        _buildActionTile(
          icon: Icons.list_alt,
          title: 'Ver Todas las Órdenes',
          subtitle: 'Lista completa de órdenes asignadas',
          color: Colors.blue,
          onTap: () => _navigateToOrdenes(null),
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          icon: Icons.history,
          title: 'Historial',
          subtitle: 'Órdenes completadas y reportes',
          color: Colors.green,
          onTap: () => _navigateToHistorial(),
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          icon: Icons.dashboard,
          title: 'Mi Dashboard',
          subtitle: 'Estadísticas y rendimiento',
          color: Colors.indigo,
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => DashboardScreen()),
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(subtitle, style: theme.textTheme.bodySmall),
        trailing: Icon(
          Icons.chevron_right,
          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
        ),
        onTap: onTap,
      ),
    );
  }

  void _navigateToOrdenes(String? filterEstado) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OrdenesListScreen(initialFilterEstado: filterEstado),
      ),
    );
  }

  void _navigateToHistorial() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const HistorialScreen()),
    );
  }

  void _navigateToOrdenesHoy() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const OrdenesListScreen(initialFilterHoy: true),
      ),
    );
  }
}
