import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/sync/sync_service.dart';
import '../../auth/data/auth_provider.dart';
import 'storage_settings_screen.dart';

/// ============================================================================
/// PANTALLA DE CONFIGURACIÓN GENERAL
/// ============================================================================
///
/// Módulo padre que agrupa todas las configuraciones de la app:
/// - Almacenamiento (gestión de espacio y limpieza)
/// - Modo de Finalización (COMPLETO vs SOLO_DATOS)
/// - Futuras configuraciones...

/// Provider para el modo de finalización persistente
final modoFinalizacionProvider =
    StateNotifierProvider<ModoFinalizacionNotifier, String>((ref) {
      return ModoFinalizacionNotifier();
    });

class ModoFinalizacionNotifier extends StateNotifier<String> {
  ModoFinalizacionNotifier() : super('SOLO_DATOS') {
    _cargarModo();
  }

  static const _key = 'modo_finalizacion_default';
  bool _initialized = false;

  /// Indica si el modo ya fue cargado de SharedPreferences
  bool get initialized => _initialized;

  Future<void> _cargarModo() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final modoGuardado = prefs.getString(_key);
      if (modoGuardado != null &&
          (modoGuardado == 'COMPLETO' || modoGuardado == 'SOLO_DATOS')) {
        state = modoGuardado;
      }
      _initialized = true;
    } catch (e) {
      // Si falla, mantener el default
      _initialized = true;
    }
  }

  Future<void> setModo(String modo) async {
    if (modo != 'COMPLETO' && modo != 'SOLO_DATOS') return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, modo);
      state = modo;
    } catch (e) {
      // Si falla el guardado, al menos actualizar el state en memoria
      state = modo;
    }
  }

  /// Forzar recarga desde SharedPreferences
  Future<void> recargar() async {
    await _cargarModo();
  }
}

/// Provider para el formato de hora (true = 24H, false = 12H AM/PM)
final formatoHora24Provider = StateNotifierProvider<FormatoHoraNotifier, bool>((
  ref,
) {
  return FormatoHoraNotifier();
});

class FormatoHoraNotifier extends StateNotifier<bool> {
  FormatoHoraNotifier() : super(false) {
    _cargar();
  }

  static const _key = 'formato_hora_24h';

  Future<void> _cargar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final valor = prefs.getBool(_key);
      if (valor != null) state = valor;
    } catch (_) {}
  }

  Future<void> setFormato(bool es24h) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_key, es24h);
      state = es24h;
    } catch (_) {
      state = es24h;
    }
  }
}

class ConfiguracionScreen extends ConsumerStatefulWidget {
  const ConfiguracionScreen({super.key});

  @override
  ConsumerState<ConfiguracionScreen> createState() =>
      _ConfiguracionScreenState();
}

class _ConfiguracionScreenState extends ConsumerState<ConfiguracionScreen> {
  bool _sincronizando = false;

  /// ✅ FIX 26-ENE-2026: Ejecutar sincronización forzada de catálogos
  Future<void> _ejecutarSincronizacionForzada() async {
    final authState = ref.read(authStateProvider);
    final tecnicoId = authState.user?.idEmpleado;

    if (tecnicoId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error: No se encontró el ID del técnico'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    setState(() => _sincronizando = true);

    try {
      final syncService = ref.read(syncServiceProvider);

      // Sincronización forzada con fullCatalogs = true
      final result = await syncService.downloadData(
        tecnicoId,
        fullCatalogs: true, // Forzar descarga completa de catálogos
      );

      if (mounted) {
        if (result.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '✅ Sincronización completada:\n'
                '• ${result.actividadesCatalogoGuardadas} actividades\n'
                '• ${result.parametrosGuardados} parámetros\n'
                '• ${result.ordenesDescargadas} órdenes',
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 4),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Error: ${result.error ?? result.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error de sincronización: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _sincronizando = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final modoActual = ref.watch(modoFinalizacionProvider);
    final es24h = ref.watch(formatoHora24Provider);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('Configuración'),
        backgroundColor: Colors.blueGrey.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ================================================================
          // SECCIÓN: ALMACENAMIENTO
          // ================================================================
          _buildSectionHeader(
            context,
            icon: Icons.folder_open,
            title: 'Almacenamiento',
            color: Colors.orange,
          ),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.storage, color: Colors.orange),
              ),
              title: const Text(
                'Gestión de Almacenamiento',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: const Text('Espacio, retención y limpieza de datos'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const StorageSettingsScreen(),
                ),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ================================================================
          // SECCIÓN: MODO DE FINALIZACIÓN
          // ================================================================
          _buildSectionHeader(
            context,
            icon: Icons.upload_file,
            title: 'Finalización de Órdenes',
            color: Colors.indigo,
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.indigo.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.cloud_sync,
                          color: Colors.indigo,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Modo por Defecto',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Define cómo se finalizan las órdenes',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 8),

                  // Opción COMPLETO (protegida con contraseña admin)
                  RadioListTile<String>(
                    value: 'COMPLETO',
                    groupValue: modoActual,
                    onChanged: (v) => _solicitarPasswordAdmin(context, ref),
                    title: Row(
                      children: [
                        const Text(
                          'Completo',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 6),
                        Icon(Icons.lock, size: 14, color: Colors.grey.shade500),
                      ],
                    ),
                    subtitle: const Text(
                      'Sube datos + genera PDF + envía email automáticamente',
                      style: TextStyle(fontSize: 12),
                    ),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 24,
                      ),
                    ),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),

                  const Divider(height: 16),

                  // Opción SOLO_DATOS (default, sin restricciones)
                  RadioListTile<String>(
                    value: 'SOLO_DATOS',
                    groupValue: modoActual,
                    onChanged: (v) {
                      ref.read(modoFinalizacionProvider.notifier).setModo(v!);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Modo Solo Datos activado'),
                          backgroundColor: Colors.blue,
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    title: const Text(
                      'Solo Datos',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text(
                      'Solo sube datos. PDF y email se generan desde Admin Portal',
                      style: TextStyle(fontSize: 12),
                    ),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.cloud_upload,
                        color: Colors.blue,
                        size: 24,
                      ),
                    ),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),

                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Colors.amber.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Colors.amber.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Solo Datos es el modo predeterminado. '
                            'El modo Completo requiere contraseña de administrador.',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.amber.shade900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ================================================================
          // SECCIÓN: FORMATO DE HORA
          // ================================================================
          _buildSectionHeader(
            context,
            icon: Icons.access_time,
            title: 'Formato de Hora',
            color: Colors.teal,
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.teal.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.schedule, color: Colors.teal),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Formato del Reloj',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Selecciona cómo se muestra la hora al finalizar',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 8),

                  // Opción 12H AM/PM
                  RadioListTile<bool>(
                    value: false,
                    groupValue: es24h,
                    onChanged: (v) {
                      ref
                          .read(formatoHora24Provider.notifier)
                          .setFormato(false);
                    },
                    title: const Text(
                      '12 Horas (AM / PM)',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text(
                      'Ej: 02:30 p.m. — Reloj simple con selector AM/PM',
                      style: TextStyle(fontSize: 12),
                    ),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.teal.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'AM\nPM',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.teal,
                          height: 1.2,
                        ),
                      ),
                    ),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),

                  const Divider(height: 16),

                  // Opción 24H
                  RadioListTile<bool>(
                    value: true,
                    groupValue: es24h,
                    onChanged: (v) {
                      ref.read(formatoHora24Provider.notifier).setFormato(true);
                    },
                    title: const Text(
                      '24 Horas',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text(
                      'Ej: 14:30 — Reloj con doble anillo (0-23)',
                      style: TextStyle(fontSize: 12),
                    ),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.teal.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '24H',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.teal,
                        ),
                      ),
                    ),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ================================================================
          // SECCIÓN: AJUSTES AVANZADOS
          // ================================================================
          _buildSectionHeader(
            context,
            icon: Icons.settings_applications,
            title: 'Ajustes Avanzados',
            color: Colors.deepPurple,
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.deepPurple.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: _sincronizando
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(
                                Colors.deepPurple,
                              ),
                            ),
                          )
                        : const Icon(Icons.sync, color: Colors.deepPurple),
                  ),
                  title: const Text(
                    'Sincronización Forzada',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: const Text(
                    'Recargar catálogos y parámetros desde el servidor',
                    style: TextStyle(fontSize: 12),
                  ),
                  trailing: _sincronizando
                      ? null
                      : const Icon(Icons.chevron_right),
                  onTap: _sincronizando ? null : _ejecutarSincronizacionForzada,
                ),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Colors.blue.shade700,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Usa esto si los rangos de mediciones o actividades fueron actualizados en el portal y no se reflejan en la app.',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.blue.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // ================================================================
          // SECCIÓN: INFORMACIÓN
          // ================================================================
          _buildSectionHeader(
            context,
            icon: Icons.info_outline,
            title: 'Información',
            color: Colors.blueGrey,
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.phone_android, color: Colors.grey),
                  title: const Text('Versión de la App'),
                  trailing: Text(
                    '1.0.0',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.cloud, color: Colors.grey),
                  title: const Text('Backend'),
                  trailing: Text(
                    'Render (Producción)',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Solicita contraseña de administrador para desbloquear modo COMPLETO
  Future<void> _solicitarPasswordAdmin(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final controller = TextEditingController();
    final resultado = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.lock, color: Colors.orange),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Acceso Administrador',
                style: TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Ingrese la contraseña de administrador para habilitar el modo Completo.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              obscureText: true,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Contraseña',
                prefixIcon: Icon(Icons.key),
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text == 'AdminMekano123') {
                Navigator.of(ctx).pop(true);
              } else {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(
                    content: Text('❌ Contraseña incorrecta'),
                    backgroundColor: Colors.red,
                    duration: Duration(seconds: 2),
                  ),
                );
              }
            },
            child: const Text('Desbloquear'),
          ),
        ],
      ),
    );

    if (resultado == true) {
      ref.read(modoFinalizacionProvider.notifier).setModo('COMPLETO');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Modo Completo activado'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required IconData icon,
    required String title,
    required Color color,
  }) {
    return Row(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}
