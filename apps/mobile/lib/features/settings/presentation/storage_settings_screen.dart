import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/lifecycle/data_lifecycle_manager.dart';
import '../../../core/storage/storage_preferences.dart';

/// ============================================================================
/// PANTALLA DE CONFIGURACIÓN DE ALMACENAMIENTO
/// ============================================================================
///
/// Permite al usuario configurar:
/// - Días de retención de órdenes completadas
/// - Días de retención de archivos post-sync
/// - Máximo de órdenes en historial
/// - Activar/desactivar limpieza automática
/// - Ver estadísticas de uso de almacenamiento
/// - Ejecutar limpieza manual

class StorageSettingsScreen extends ConsumerStatefulWidget {
  const StorageSettingsScreen({super.key});

  @override
  ConsumerState<StorageSettingsScreen> createState() =>
      _StorageSettingsScreenState();
}

class _StorageSettingsScreenState extends ConsumerState<StorageSettingsScreen> {
  bool _isLoading = true;
  bool _isCleaningInProgress = false;
  StoragePreferencesData? _preferences;
  StorageStats? _stats;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);

    try {
      final prefs = ref.read(storagePreferencesProvider);
      final lifecycleManager = ref.read(dataLifecycleManagerProvider);

      final preferences = await prefs.cargarPreferencias();
      final stats = await lifecycleManager.getStorageStats();

      setState(() {
        _preferences = preferences;
        _stats = stats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error cargando configuración: $e')),
        );
      }
    }
  }

  Future<void> _ejecutarLimpiezaManual() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.cleaning_services, color: Colors.orange),
            SizedBox(width: 8),
            Text('Limpiar Ahora'),
          ],
        ),
        content: const Text(
          'Esto eliminará:\n\n'
          '• Fotos ya sincronizadas (más antiguas que el período configurado)\n'
          '• Firmas ya sincronizadas\n'
          '• Órdenes completadas antiguas\n\n'
          '¿Desea continuar?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.cleaning_services),
            label: const Text('Limpiar'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    setState(() => _isCleaningInProgress = true);

    try {
      final lifecycleManager = ref.read(dataLifecycleManagerProvider);

      // ✅ FIX: Usar limpieza forzada que elimina TODAS las fotos sincronizadas
      // Los técnicos quieren que "Limpiar Ahora" elimine todo inmediatamente
      final result = await lifecycleManager.limpiarFotosSincronizadasAhora();

      // Recargar estadísticas
      final stats = await lifecycleManager.getStorageStats();

      setState(() {
        _stats = stats;
        _isCleaningInProgress = false;
      });

      if (mounted) {
        final mensaje = result.tuvoCambios
            ? 'Limpieza completada:\n'
                  '• ${result.evidenciasPurgadas} fotos eliminadas del dispositivo\n'
                  '• ${result.firmasPurgadas} firmas eliminadas\n'
                  '(Las fotos siguen disponibles en la nube)'
            : 'No hay fotos sincronizadas para limpiar.';

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(mensaje),
            duration: const Duration(seconds: 4),
            backgroundColor: result.tuvoCambios ? Colors.green : Colors.blue,
          ),
        );
      }
    } catch (e) {
      setState(() => _isCleaningInProgress = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error durante limpieza: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _restaurarDefaults() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Restaurar Valores'),
        content: const Text(
          '¿Restaurar configuración de almacenamiento a valores por defecto?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Restaurar'),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    try {
      final prefs = ref.read(storagePreferencesProvider);
      await prefs.restaurarDefaults();
      await _cargarDatos();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Configuración restaurada')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Almacenamiento'),
        actions: [
          IconButton(
            icon: const Icon(Icons.restore),
            tooltip: 'Restaurar valores por defecto',
            onPressed: _restaurarDefaults,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargarDatos,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Estadísticas de uso
                  _buildStatsCard(),
                  const SizedBox(height: 16),

                  // Configuración de retención
                  _buildRetentionCard(),
                  const SizedBox(height: 16),

                  // Limpieza automática
                  _buildAutoCleanCard(),
                  const SizedBox(height: 24),

                  // Botón de limpieza manual
                  _buildCleanButton(),
                ],
              ),
            ),
    );
  }

  Widget _buildStatsCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.storage,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Uso de Almacenamiento',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),

            _buildStatRow(
              icon: Icons.assignment,
              label: 'Órdenes locales',
              value: '${_stats?.totalOrdenes ?? 0}',
              color: Colors.blue,
            ),
            _buildStatRow(
              icon: Icons.photo_camera,
              label: 'Evidencias',
              value: '${_stats?.totalEvidencias ?? 0}',
              subtitle:
                  '${_stats?.espacioEvidenciasMB.toStringAsFixed(1) ?? 0} MB',
              color: Colors.green,
            ),
            _buildStatRow(
              icon: Icons.draw,
              label: 'Firmas',
              value: '${_stats?.totalFirmas ?? 0}',
              subtitle: '${_stats?.espacioFirmasMB.toStringAsFixed(1) ?? 0} MB',
              color: Colors.purple,
            ),
            _buildStatRow(
              icon: Icons.data_usage,
              label: 'Base de datos',
              value: '${_stats?.espacioBDMB.toStringAsFixed(1) ?? 0} MB',
              color: Colors.orange,
            ),
            const Divider(),
            _buildStatRow(
              icon: Icons.folder,
              label: 'Total usado',
              value: _stats?.espacioFormateado ?? '0 KB',
              color: Theme.of(context).colorScheme.primary,
              isBold: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow({
    required IconData icon,
    required String label,
    required String value,
    String? subtitle,
    required Color color,
    bool isBold = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: TextStyle(fontWeight: FontWeight.bold, color: color),
              ),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRetentionCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.schedule,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Política de Retención',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),

            // Días retención órdenes completadas
            _buildSliderSetting(
              title: 'Órdenes completadas',
              subtitle:
                  'Mantener por ${_preferences?.diasRetencionCompletadas ?? 7} días',
              value: (_preferences?.diasRetencionCompletadas ?? 7).toDouble(),
              min: 1,
              max: 30,
              divisions: 29,
              icon: Icons.assignment_turned_in,
              onChanged: (value) async {
                final prefs = ref.read(storagePreferencesProvider);
                await prefs.setDiasRetencionCompletadas(value.toInt());
                setState(() {
                  _preferences = _preferences?.copyWith(
                    diasRetencionCompletadas: value.toInt(),
                  );
                });
              },
            ),
            const SizedBox(height: 16),

            // Días retención archivos
            _buildSliderSetting(
              title: 'Fotos/Firmas sincronizadas',
              subtitle:
                  'Eliminar después de ${_preferences?.diasRetencionArchivos ?? 3} días',
              value: (_preferences?.diasRetencionArchivos ?? 3).toDouble(),
              min: 1,
              max: 14,
              divisions: 13,
              icon: Icons.photo_library,
              onChanged: (value) async {
                final prefs = ref.read(storagePreferencesProvider);
                await prefs.setDiasRetencionArchivos(value.toInt());
                setState(() {
                  _preferences = _preferences?.copyWith(
                    diasRetencionArchivos: value.toInt(),
                  );
                });
              },
            ),
            const SizedBox(height: 16),

            // Max órdenes en historial
            _buildSliderSetting(
              title: 'Historial visible',
              subtitle:
                  'Máximo ${_preferences?.maxOrdenesHistorial ?? 15} órdenes',
              value: (_preferences?.maxOrdenesHistorial ?? 15).toDouble(),
              min: 5,
              max: 50,
              divisions: 9,
              icon: Icons.history,
              onChanged: (value) async {
                final prefs = ref.read(storagePreferencesProvider);
                await prefs.setMaxOrdenesHistorial(value.toInt());
                setState(() {
                  _preferences = _preferences?.copyWith(
                    maxOrdenesHistorial: value.toInt(),
                  );
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliderSetting({
    required String title,
    required String subtitle,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required IconData icon,
    required ValueChanged<double> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: Colors.grey[600]),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                '${value.toInt()}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ),
          ],
        ),
        Slider(
          value: value,
          min: min,
          max: max,
          divisions: divisions,
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildAutoCleanCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.auto_delete,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Limpieza Automática',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(),
            SwitchListTile(
              title: const Text('Activar limpieza automática'),
              subtitle: const Text(
                'Limpia datos obsoletos automáticamente al abrir la app y después de sincronizar',
              ),
              value: _preferences?.limpiezaAutomaticaActiva ?? true,
              onChanged: (value) async {
                final prefs = ref.read(storagePreferencesProvider);
                await prefs.setLimpiezaAutomatica(value);
                setState(() {
                  _preferences = _preferences?.copyWith(
                    limpiezaAutomaticaActiva: value,
                  );
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCleanButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isCleaningInProgress ? null : _ejecutarLimpiezaManual,
        icon: _isCleaningInProgress
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.cleaning_services),
        label: Text(_isCleaningInProgress ? 'Limpiando...' : 'Limpiar Ahora'),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          backgroundColor: Colors.orange,
          foregroundColor: Colors.white,
        ),
      ),
    );
  }
}
