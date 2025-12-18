/// Pantalla de inicio después del login
///
/// RUTA 1: Incluye sincronización con BD local drift
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/sync/background_sync_worker.dart';
import '../../../core/sync/offline_sync_service.dart';
import '../../../core/sync/sync_lifecycle_manager.dart';
import '../../../core/sync/sync_service.dart';
import '../../auth/data/auth_provider.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../notificaciones/presentation/notificaciones_badge.dart';
import '../../sync/presentation/pending_sync_screen.dart';
import '../../sync/presentation/sync_status_indicator.dart';
import 'ordenes_list_screen.dart';

/// Estado de sincronización
final syncStateProvider = StateProvider<SyncState>((ref) => SyncState());

class SyncState {
  final bool isSyncing;
  final SyncResult? lastResult;
  final Map<String, int>? localStats;

  SyncState({this.isSyncing = false, this.lastResult, this.localStats});

  SyncState copyWith({
    bool? isSyncing,
    SyncResult? lastResult,
    Map<String, int>? localStats,
  }) {
    return SyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      lastResult: lastResult ?? this.lastResult,
      localStats: localStats ?? this.localStats,
    );
  }
}

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  SyncLifecycleManager? _syncLifecycleManager;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadLocalStats();
      _setupSyncListener();
      _initializeSmartSync();
    });
  }

  /// Inicializar sistema de sincronización inteligente
  void _initializeSmartSync() {
    final authState = ref.read(authStateProvider);
    final user = authState.user;
    if (user == null) return;

    final tecnicoId = user.syncId;
    _syncLifecycleManager = ref.read(syncLifecycleManagerProvider(tecnicoId));
    _syncLifecycleManager?.initialize();
  }

  /// Configura listener para mostrar SnackBar cuando se completa sync
  void _setupSyncListener() {
    final worker = ref.read(backgroundSyncWorkerProvider);
    worker.addListener(_onSyncComplete);
  }

  @override
  void dispose() {
    // Remover listener al disponer
    try {
      final worker = ref.read(backgroundSyncWorkerProvider);
      worker.removeListener(_onSyncComplete);
    } catch (_) {}
    super.dispose();
  }

  void _onSyncComplete(OfflineSyncResult result) {
    if (!mounted) return;

    // Solo mostrar si hubo órdenes sincronizadas o errores
    if (result.ordenesSync > 0 || result.ordenesFallidas > 0) {
      showSyncResultSnackBar(context, result);
      // Recargar stats después de sync
      _loadLocalStats();
    }
  }

  Future<void> _loadLocalStats() async {
    if (!mounted) return;

    try {
      final syncService = ref.read(syncServiceProvider);
      final stats = await syncService.getLocalStats();

      if (!mounted) return;
      ref.read(syncStateProvider.notifier).state = ref
          .read(syncStateProvider)
          .copyWith(localStats: stats);
    } catch (_) {
      // Error silencioso - no crítico
    }
  }

  Future<void> _syncData() async {
    final authState = ref.read(authStateProvider);
    final user = authState.user;
    if (user == null) return;

    // Usar syncId que prefiere idEmpleado sobre id
    final syncId = user.syncId;

    ref.read(syncStateProvider.notifier).state = ref
        .read(syncStateProvider)
        .copyWith(isSyncing: true);

    final syncService = ref.read(syncServiceProvider);
    final result = await syncService.downloadData(syncId);

    // Recargar estadísticas
    final stats = await syncService.getLocalStats();

    ref.read(syncStateProvider.notifier).state = SyncState(
      isSyncing: false,
      lastResult: result,
      localStats: stats,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.success
                ? '✅ Sincronización exitosa: ${result.ordenesDescargadas} órdenes'
                : '❌ Error: ${result.error}',
          ),
          backgroundColor: result.success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final syncState = ref.watch(syncStateProvider);
    final user = authState.user;

    // Inicializar BackgroundSyncWorker (se auto-inicia al acceder)
    ref.watch(backgroundSyncWorkerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('MEKANOS'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          // Widget de estado de sincronización (siempre visible)
          _buildSyncStatusWidget(),
          const SizedBox(width: 4),
          // v14: Badge de notificaciones (con fix de timeout)
          NotificacionesBadge(),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authStateProvider.notifier).logout();
            },
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icono de éxito
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.check_circle,
                  size: 80,
                  color: Colors.green.shade400,
                ),
              ),
              const SizedBox(height: 24),

              // Mensaje de bienvenida
              const Text(
                '¡Login Exitoso!',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
              const SizedBox(height: 16),

              // Info del usuario
              if (user != null) ...[
                Text(
                  'Bienvenido',
                  style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 8),
                Text(
                  user.email,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade100,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Rol: ${user.rol}',
                    style: TextStyle(
                      color: Colors.blue.shade800,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'ID Usuario: ${user.id}',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                ),
              ],

              const SizedBox(height: 48),

              // Botón de sincronización
              ElevatedButton.icon(
                onPressed: syncState.isSyncing ? null : _syncData,
                icon: syncState.isSyncing
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
                  syncState.isSyncing
                      ? 'Sincronizando...'
                      : 'SINCRONIZAR DATOS',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Estadísticas de BD local
              if (syncState.localStats != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.storage,
                        size: 32,
                        color: Colors.blue.shade700,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'BASE DE DATOS LOCAL',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade800,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildStatRow(
                        'Órdenes',
                        syncState.localStats!['ordenes'] ?? 0,
                      ),
                      _buildStatRow(
                        'Clientes',
                        syncState.localStats!['clientes'] ?? 0,
                      ),
                      _buildStatRow(
                        'Estados',
                        syncState.localStats!['estados'] ?? 0,
                      ),
                      _buildStatRow(
                        'Parámetros',
                        syncState.localStats!['parametros'] ?? 0,
                      ),
                      _buildStatRow(
                        'Tipos Servicio',
                        syncState.localStats!['tiposServicio'] ?? 0,
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // Último resultado de sync
              if (syncState.lastResult != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: syncState.lastResult!.success
                        ? Colors.green.shade50
                        : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    syncState.lastResult!.success
                        ? '✅ Última sync: ${syncState.lastResult!.ordenesDescargadas} órdenes, '
                              '${syncState.lastResult!.clientesGuardados} clientes'
                        : '❌ Error: ${syncState.lastResult!.error}',
                    style: TextStyle(
                      color: syncState.lastResult!.success
                          ? Colors.green.shade800
                          : Colors.red.shade800,
                      fontSize: 12,
                    ),
                  ),
                ),

              const SizedBox(height: 24),

              // RUTA 13: Botón para Dashboard del técnico
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(
                    context,
                  ).push(MaterialPageRoute(builder: (_) => DashboardScreen()));
                },
                icon: const Icon(Icons.dashboard),
                label: const Text('MI DASHBOARD'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Botón para ver lista de órdenes (desde BD local)
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const OrdenesListScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.list_alt),
                label: const Text('VER ÓRDENES (BD LOCAL)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Botón de logout alternativo
              OutlinedButton.icon(
                onPressed: () async {
                  await ref.read(authStateProvider.notifier).logout();
                },
                icon: const Icon(Icons.logout),
                label: const Text('Cerrar Sesión'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Widget de estado de sincronización (siempre visible)
  Widget _buildSyncStatusWidget() {
    final asyncInfo = ref.watch(syncIndicatorStateProvider);

    return asyncInfo.when(
      loading: () => _buildSyncChip(
        icon: Icons.cloud_queue,
        text: '...',
        color: Colors.grey,
        isLoading: true,
      ),
      error: (_, __) => _buildSyncChip(
        icon: Icons.help_outline,
        text: '?',
        color: Colors.grey,
      ),
      data: (info) {
        final isSyncing = info.state == SyncIndicatorState.syncing;
        return _buildSyncChip(
          icon: info.icon,
          text: info.statusText,
          color: info.color,
          isLoading: isSyncing,
        );
      },
    );
  }

  Widget _buildSyncChip({
    required IconData icon,
    required String text,
    required Color color,
    bool isLoading = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PendingSyncScreen()),
            );
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              // Fondo blanco semi-opaco para mejor contraste con header azul
              color: Colors.white.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color, width: 1.5),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isLoading)
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: color,
                    ),
                  )
                else
                  Icon(icon, size: 14, color: color),
                const SizedBox(width: 5),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, int value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.blue.shade700)),
          Text(
            value.toString(),
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade900,
            ),
          ),
        ],
      ),
    );
  }
}
