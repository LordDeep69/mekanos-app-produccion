import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/database/app_database.dart';
import '../../../core/sync/background_sync_worker.dart';
import '../../../core/sync/connectivity_service.dart';
import '../../../core/sync/offline_sync_service.dart';
import '../../../core/sync/sync_progress.dart';

/// Pantalla de órdenes pendientes de sincronización
///
/// ✅ SYNC MANUAL: Esta es la pantalla central para subir órdenes offline
/// El técnico tiene control total sobre cuándo subir cada orden
/// Muestra:
/// - Lista de órdenes guardadas offline pendientes de subir
/// - Estado de cada orden (pendiente, error, en proceso)
/// - Botón SUBIR individual por cada orden
/// - Información básica extraída del payload
class PendingSyncScreen extends ConsumerStatefulWidget {
  const PendingSyncScreen({super.key});

  @override
  ConsumerState<PendingSyncScreen> createState() => _PendingSyncScreenState();
}

class _PendingSyncScreenState extends ConsumerState<PendingSyncScreen> {
  bool _isSyncingAll = false;
  final Set<int> _syncingOrders = {}; // Órdenes individuales siendo sincronizadas

  @override
  Widget build(BuildContext context) {
    final pendientesAsync = ref.watch(pendingSyncListProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Órdenes por Subir'),
        backgroundColor: Colors.orange.shade700,
        foregroundColor: Colors.white,
        actions: [
          // Indicador de conectividad
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isOnline ? Colors.green.shade100 : Colors.red.shade100,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isOnline ? Icons.wifi : Icons.wifi_off,
                  color: isOnline ? Colors.green.shade700 : Colors.red.shade700,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Text(
                  isOnline ? 'Conectado' : 'Sin conexión',
                  style: TextStyle(
                    color: isOnline ? Colors.green.shade700 : Colors.red.shade700,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
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
        data: (pendientes) => pendientes.isNotEmpty && isOnline && pendientes.length > 1
            ? FloatingActionButton.extended(
                onPressed: _isSyncingAll ? null : _syncAll,
                icon: _isSyncingAll
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.cloud_upload),
                label: Text(
                  _isSyncingAll ? 'Subiendo...' : 'Subir Todas (${pendientes.length})',
                ),
                backgroundColor: _isSyncingAll ? Colors.grey : Colors.orange.shade700,
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
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.cloud_done, size: 80, color: Colors.green.shade400),
          ),
          const SizedBox(height: 24),
          const Text(
            '¡Todo sincronizado!',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'No tienes órdenes pendientes por subir',
            style: TextStyle(fontSize: 15, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          TextButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Volver'),
          ),
        ],
      ),
    );
  }

  Widget _buildPendientesList(
    List<OrdenesPendientesSyncData> pendientes,
    bool isOnline,
  ) {
    return Column(
      children: [
        // Banner informativo
        if (!isOnline)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: Colors.orange.shade100,
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.orange.shade800),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Conecta a Internet para subir tus órdenes',
                    style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        // Lista
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: pendientes.length,
            itemBuilder: (context, index) {
              final orden = pendientes[index];
              return _buildOrdenCard(orden, isOnline);
            },
          ),
        ),
      ],
    );
  }

  /// Extrae información del payload JSON para mostrar en la UI
  Map<String, dynamic> _extraerInfoDePayload(String payloadJson) {
    try {
      final payload = jsonDecode(payloadJson) as Map<String, dynamic>;
      return {
        'observaciones': payload['observaciones'] ?? '',
        'horaEntrada': payload['horaEntrada'] ?? '',
        'horaSalida': payload['horaSalida'] ?? '',
        'esMultiEquipo': payload['esMultiEquipo'] ?? false,
        'totalActividades': (payload['actividades'] as List?)?.length ?? 0,
        'totalMediciones': (payload['mediciones'] as List?)?.length ?? 0,
        'totalEvidencias': (payload['evidencias'] as List?)?.length ?? 0,
      };
    } catch (e) {
      return {};
    }
  }

  Widget _buildOrdenCard(OrdenesPendientesSyncData orden, bool isOnline) {
    final isError = orden.estadoSync == 'ERROR';
    final isEnProceso = orden.estadoSync == 'EN_PROCESO';
    final isSyncingThis = _syncingOrders.contains(orden.idOrdenLocal);
    final info = _extraerInfoDePayload(orden.payloadJson);

    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (isSyncingThis || isEnProceso) {
      statusColor = Colors.blue;
      statusIcon = Icons.cloud_sync;
      statusText = 'Subiendo...';
    } else if (isError) {
      statusColor = Colors.red;
      statusIcon = Icons.error_outline;
      statusText = 'Error (intento ${orden.intentos}/5)';
    } else {
      statusColor = Colors.orange;
      statusIcon = Icons.cloud_upload_outlined;
      statusText = 'Lista para subir';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: statusColor.withValues(alpha: 0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header con estado
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Orden #${orden.idOrdenBackend}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        statusText,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Badge multi-equipo
                if (info['esMultiEquipo'] == true)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.purple.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Multi-Equipo',
                      style: TextStyle(
                        color: Colors.purple.shade700,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Contenido
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Resumen de datos capturados
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    if (info['totalActividades'] != null && info['totalActividades'] > 0)
                      _buildInfoChip(Icons.checklist, '${info['totalActividades']} act.'),
                    if (info['totalMediciones'] != null && info['totalMediciones'] > 0)
                      _buildInfoChip(Icons.speed, '${info['totalMediciones']} med.'),
                    if (info['totalEvidencias'] != null && info['totalEvidencias'] > 0)
                      _buildInfoChip(Icons.photo_camera, '${info['totalEvidencias']} fotos'),
                  ],
                ),
                
                const SizedBox(height: 12),

                // Info de fechas
                Row(
                  children: [
                    Icon(Icons.access_time, size: 14, color: Colors.grey.shade600),
                    const SizedBox(width: 4),
                    Text(
                      'Guardado: ${_formatDate(orden.fechaCreacion)}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),

                // Error message
                if (isError && orden.ultimoError != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.warning_amber, size: 18, color: Colors.red.shade700),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            orden.ultimoError!.length > 80
                                ? '${orden.ultimoError!.substring(0, 80)}...'
                                : orden.ultimoError!,
                            style: TextStyle(fontSize: 12, color: Colors.red.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Botón SUBIR prominente
          Container(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: ElevatedButton.icon(
              onPressed: (isOnline && !isSyncingThis && !isEnProceso)
                  ? () => _subirOrdenIndividual(orden.idOrdenLocal)
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                disabledBackgroundColor: Colors.grey.shade300,
              ),
              icon: isSyncingThis
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.cloud_upload, size: 20),
              label: Text(
                isSyncingThis
                    ? 'Subiendo...'
                    : (isOnline ? 'SUBIR AHORA' : 'Sin conexión'),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade700),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  /// Sube una orden individual CON FEEDBACK DE PROGRESO
  Future<void> _subirOrdenIndividual(int idOrdenLocal) async {
    setState(() => _syncingOrders.add(idOrdenLocal));

    // ✅ NUEVO: Mostrar diálogo de progreso
    // ignore: unawaited_futures
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const _SyncProgressDialog(),
    );

    try {
      final offlineSync = ref.read(offlineSyncServiceProvider);
      final success = await offlineSync.reintentarOrden(idOrdenLocal);

      if (mounted) {
        // El diálogo se cierra solo cuando el progreso llega a completado/error
        // Refrescar lista
        ref.invalidate(pendingSyncListProvider);
        
        // Mostrar snackbar adicional si hay error
        if (!success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.error_outline, color: Colors.white),
                  SizedBox(width: 8),
                  Text('❌ Error al subir. Revisa los detalles.'),
                ],
              ),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _syncingOrders.remove(idOrdenLocal));
      }
    }
  }

  /// Sube todas las órdenes pendientes
  Future<void> _syncAll() async {
    setState(() => _isSyncingAll = true);

    try {
      final syncNotifier = ref.read(syncNotifierProvider.notifier);
      final result = await syncNotifier.syncManual();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  result.success ? Icons.check_circle : Icons.warning_amber,
                  color: Colors.white,
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(result.mensaje)),
              ],
            ),
            backgroundColor: result.success ? Colors.green : Colors.orange,
            duration: const Duration(seconds: 4),
          ),
        );
        // Refrescar lista
        ref.invalidate(pendingSyncListProvider);
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncingAll = false);
      }
    }
  }
}

/// ✅ WIDGET DE DIÁLOGO DE PROGRESO DE SINCRONIZACIÓN
/// Muestra el progreso en tiempo real de la subida al servidor
class _SyncProgressDialog extends ConsumerWidget {
  const _SyncProgressDialog();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(syncProgressProvider);

    return PopScope(
      // No permitir cerrar con back mientras está en progreso
      canPop: progress.pasoActual == SyncStep.completado ||
          progress.pasoActual == SyncStep.error,
      child: AlertDialog(
        title: Row(
          children: [
            if (progress.pasoActual == SyncStep.completado)
              const Icon(Icons.check_circle, color: Colors.green, size: 28)
            else if (progress.pasoActual == SyncStep.error)
              const Icon(Icons.error, color: Colors.red, size: 28)
            else
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                progress.pasoActual == SyncStep.completado
                    ? '¡Sincronización Exitosa!'
                    : progress.pasoActual == SyncStep.error
                        ? 'Error en Sincronización'
                        : 'Sincronizando...',
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ✅ 19-DIC-2025: Mostrar mensaje actual del servidor si está disponible
              if (progress.mensajeActual != null && 
                  progress.pasoActual != SyncStep.completado &&
                  progress.pasoActual != SyncStep.error) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          progress.mensajeActual!,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.blue.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              
              // ✅ 19-DIC-2025: Barra de progreso visual
              if (progress.porcentaje > 0 && 
                  progress.pasoActual != SyncStep.completado &&
                  progress.pasoActual != SyncStep.error) ...[
                LinearProgressIndicator(
                  value: progress.porcentaje / 100,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade600),
                ),
                const SizedBox(height: 8),
                Text(
                  '${progress.porcentaje}%',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 16),
              ],
              
              // Lista de pasos con estados - Usando pasos visibles simplificados
              _buildStepItem(
                step: SyncStep.preparando,
                progress: progress,
                icon: Icons.settings,
              ),
              _buildStepItem(
                step: SyncStep.validando,
                progress: progress,
                icon: Icons.verified_user,
              ),
              _buildStepItem(
                step: SyncStep.evidencias,
                progress: progress,
                icon: Icons.photo_camera,
              ),
              _buildStepItem(
                step: SyncStep.firmas,
                progress: progress,
                icon: Icons.draw,
              ),
              _buildStepItem(
                step: SyncStep.generando_pdf,
                progress: progress,
                icon: Icons.picture_as_pdf,
              ),
              _buildStepItem(
                step: SyncStep.enviando_email,
                progress: progress,
                icon: Icons.email,
              ),

              // Mensaje de error si hay
              if (progress.pasoActual == SyncStep.error &&
                  progress.mensajeError != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          progress.mensajeError!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.red.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Mensaje de éxito
              if (progress.pasoActual == SyncStep.completado) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.celebration,
                          color: Colors.green.shade700, size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          '¡Orden sincronizada correctamente! PDF generado y email enviado.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          // Solo mostrar botón cuando esté completado o error
          if (progress.pasoActual == SyncStep.completado ||
              progress.pasoActual == SyncStep.error)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: progress.pasoActual == SyncStep.completado
                    ? Colors.green
                    : Colors.blue,
              ),
              onPressed: () {
                Navigator.of(context).pop(); // Cerrar diálogo
              },
              child: Text(progress.pasoActual == SyncStep.completado
                  ? 'CONTINUAR'
                  : 'CERRAR'),
            ),
        ],
      ),
    );
  }

  Widget _buildStepItem({
    required SyncStep step,
    required SyncProgress progress,
    required IconData icon,
  }) {
    final isCompleted = progress.pasosCompletados.contains(step);
    final isActive = progress.pasoActual == step;
    final isError = progress.pasoActual == SyncStep.error && isActive;
    final isPending = !isCompleted && !isActive;

    Color color;
    Widget leading;

    if (isCompleted) {
      color = Colors.green;
      leading = const Icon(Icons.check_circle, color: Colors.green, size: 22);
    } else if (isError) {
      color = Colors.red;
      leading = const Icon(Icons.error, color: Colors.red, size: 22);
    } else if (isActive) {
      color = Colors.blue;
      leading = const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    } else {
      color = Colors.grey.shade400;
      leading = Icon(Icons.circle_outlined, color: Colors.grey.shade400, size: 22);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 12),
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              isCompleted ? step.nombreCompletado : step.nombre,
              style: TextStyle(
                fontSize: 14,
                color: color,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                decoration: isCompleted ? TextDecoration.none : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}