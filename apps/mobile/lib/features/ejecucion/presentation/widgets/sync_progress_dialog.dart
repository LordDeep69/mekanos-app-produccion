import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/sync/sync_progress.dart';

/// Diálogo de progreso de sincronización en tiempo real vía SSE.
class SyncProgressDialog extends ConsumerWidget {
  const SyncProgressDialog({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(syncProgressProvider);

    return PopScope(
      canPop:
          progress.pasoActual == SyncStep.completado ||
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
              if (progress.porcentaje > 0 &&
                  progress.pasoActual != SyncStep.completado &&
                  progress.pasoActual != SyncStep.error) ...[
                LinearProgressIndicator(
                  value: progress.porcentaje / 100,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Colors.blue.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${progress.porcentaje}%',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 16),
              ],
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
                step: SyncStep.obteniendoOrden,
                progress: progress,
                icon: Icons.cloud_download,
              ),
              _buildStepItem(
                step: SyncStep.limpiezaResiduales,
                progress: progress,
                icon: Icons.cleaning_services,
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
                step: SyncStep.actualizandoEstado,
                progress: progress,
                icon: Icons.cloud_done,
              ),
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
                      Icon(
                        Icons.celebration,
                        color: Colors.green.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          '¡Orden sincronizada correctamente con el servidor!',
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
          if (progress.pasoActual == SyncStep.completado ||
              progress.pasoActual == SyncStep.error)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: progress.pasoActual == SyncStep.completado
                    ? Colors.green
                    : Colors.blue,
              ),
              onPressed: () {
                Navigator.of(context).pop();
                if (progress.pasoActual == SyncStep.completado) {
                  Navigator.of(context).pop();
                }
              },
              child: Text(
                progress.pasoActual == SyncStep.completado
                    ? 'CONTINUAR'
                    : 'CERRAR',
              ),
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
      leading = Icon(
        Icons.circle_outlined,
        color: Colors.grey.shade400,
        size: 22,
      );
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
