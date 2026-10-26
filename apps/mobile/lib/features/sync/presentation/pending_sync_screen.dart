import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/database/app_database.dart';
import '../../../core/errors/user_friendly_error.dart';
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
  final Set<int> _syncingOrders =
      {}; // Órdenes individuales siendo sincronizadas

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
                    color: isOnline
                        ? Colors.green.shade700
                        : Colors.red.shade700,
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
        error: (e, _) => _buildErrorState(e),
        data: (pendientes) {
          if (pendientes.isEmpty) {
            return _buildEmptyState();
          }
          return _buildPendientesList(pendientes, isOnline);
        },
      ),
      floatingActionButton: pendientesAsync.maybeWhen(
        data: (pendientes) =>
            pendientes.isNotEmpty && isOnline && pendientes.length > 1
            ? FloatingActionButton.extended(
                onPressed: (_isSyncingAll || _syncingOrders.isNotEmpty)
                    ? null
                    : _syncAll,
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
                  _isSyncingAll
                      ? 'Subiendo...'
                      : 'Subir Todas (${pendientes.length})',
                ),
                backgroundColor: _isSyncingAll
                    ? Colors.grey
                    : Colors.orange.shade700,
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
            child: Icon(
              Icons.cloud_done,
              size: 80,
              color: Colors.green.shade400,
            ),
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
                    style: TextStyle(
                      color: Colors.orange.shade800,
                      fontWeight: FontWeight.w500,
                    ),
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

    final Color backgroundColor = statusColor.withValues(alpha: 0.03);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 1.5,
      shadowColor: statusColor.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        color: backgroundColor,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Indicador lateral enterprise
              Container(
                width: 6,
                decoration: BoxDecoration(
                  color: statusColor,
                  boxShadow: [
                    BoxShadow(
                      color: statusColor.withValues(alpha: 0.3),
                      blurRadius: 4,
                      offset: const Offset(2, 0),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header con estado
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      color: statusColor.withValues(alpha: 0.05),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: statusColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              statusIcon,
                              color: statusColor,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Orden #${orden.idOrdenBackend}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 17,
                                    letterSpacing: 0.5,
                                    color: Colors.blueGrey.shade900,
                                  ),
                                ),
                                Text(
                                  statusText,
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (info['esMultiEquipo'] == true)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.purple.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'Multi-Equipo',
                                style: TextStyle(
                                  color: Colors.purple,
                                  fontSize: 9,
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
                          Wrap(
                            spacing: 12,
                            runSpacing: 8,
                            children: [
                              if (info['totalActividades'] > 0)
                                _buildInfoChip(
                                  Icons.checklist_rtl_rounded,
                                  '${info['totalActividades']} act.',
                                ),
                              if (info['totalMediciones'] > 0)
                                _buildInfoChip(
                                  Icons.analytics_rounded,
                                  '${info['totalMediciones']} med.',
                                ),
                              if (info['totalEvidencias'] > 0)
                                _buildInfoChip(
                                  Icons.camera_alt_rounded,
                                  '${info['totalEvidencias']} fotos',
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(
                                Icons.history_toggle_off_rounded,
                                size: 14,
                                color: Colors.blueGrey,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Guardado: ${_formatDate(orden.fechaCreacion)}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade700,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),

                          if (isError && orden.ultimoError != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.red.shade100),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.warning_amber_rounded,
                                    size: 16,
                                    color: Colors.red.shade700,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      orden.ultimoError!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.red.shade800,
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

                    // Botón de acción
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: ElevatedButton.icon(
                        onPressed:
                            (isOnline &&
                                !isSyncingThis &&
                                !isEnProceso &&
                                _syncingOrders.isEmpty &&
                                !_isSyncingAll)
                            ? () => _subirOrdenIndividual(orden.idOrdenLocal)
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade600,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
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
                            : const Icon(Icons.cloud_upload_rounded, size: 20),
                        label: Text(
                          isSyncingThis ? 'SUBIENDO...' : 'SUBIR AL SERVIDOR',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
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
    );
  }

  Widget _buildErrorState(Object error) {
    final traducido = traducirError(error, contexto: 'cargar las órdenes pendientes');
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off, size: 48, color: Colors.grey.shade500),
            const SizedBox(height: 12),
            Text(
              traducido.mensaje,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade800),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => ref.invalidate(pendingSyncListProvider),
              icon: const Icon(Icons.refresh),
              label: const Text('REINTENTAR'),
            ),
          ],
        ),
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
      builder: (ctx) => _SyncProgressDialog(
        onReintentar: () {
          if (!mounted) return;
          // Dar tiempo a que el diálogo anterior termine de cerrarse.
          Future.microtask(() => _subirOrdenIndividual(idOrdenLocal));
        },
      ),
    );

    try {
      final offlineSync = ref.read(offlineSyncServiceProvider);
      final success = await offlineSync.reintentarOrden(idOrdenLocal);

      if (mounted) {
        // Refrescar lista de pendientes. El diálogo ya muestra el error
        // traducido con opción de reintentar, así que no se duplica aquí.
        ref.invalidate(pendingSyncListProvider);
        if (!success) {
          debugPrint('⚠️ [SYNC-INDIVIDUAL] La orden $idOrdenLocal no se pudo subir');
        }
      }
    } catch (e) {
      // ✅ 24-OCT-2026: garantizar que el diálogo nunca quede "cargando".
      debugPrint('❌ [SYNC-INDIVIDUAL] Error no controlado: $e');
      ref
          .read(syncProgressProvider.notifier)
          .error(
            mensajeAmigable(e, contexto: 'subir la orden'),
          );
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
        final mensaje = result.success
            ? result.mensaje
            : (result.errores.isNotEmpty
                  ? result.errores.first
                  : result.mensaje);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  result.success ? Icons.check_circle : Icons.warning_amber,
                  color: Colors.white,
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(mensaje)),
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
class _SyncProgressDialog extends ConsumerStatefulWidget {
  const _SyncProgressDialog({this.onReintentar});

  /// Si se entrega, el diálogo ofrece REINTENTAR cuando el error es
  /// reintentable. El botón cierra el diálogo y vuelve a lanzar la subida.
  final VoidCallback? onReintentar;

  @override
  ConsumerState<_SyncProgressDialog> createState() =>
      _SyncProgressDialogState();
}

class _SyncProgressDialogState extends ConsumerState<_SyncProgressDialog> {
  late final DateTime _inicio;
  Timer? _cronometro;
  Duration _transcurrido = Duration.zero;

  @override
  void initState() {
    super.initState();
    _inicio = DateTime.now();
    _cronometro = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final progress = ref.read(syncProgressProvider);
      if (progress.pasoActual == SyncStep.completado ||
          progress.pasoActual == SyncStep.error) {
        _cronometro?.cancel();
      }
      setState(() => _transcurrido = DateTime.now().difference(_inicio));
    });
  }

  @override
  void dispose() {
    _cronometro?.cancel();
    super.dispose();
  }

  String get _tiempoTexto {
    final s = _transcurrido.inSeconds;
    final m = s ~/ 60;
    return m > 0 ? '${m}m ${s % 60}s' : '${s}s';
  }

  @override
  Widget build(BuildContext context) {
    final progress = ref.watch(syncProgressProvider);
    final enProgreso =
        progress.pasoActual != SyncStep.completado &&
        progress.pasoActual != SyncStep.error;

    return PopScope(
      // No permitir cerrar con back mientras está en progreso
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
              // Mensaje actual del servidor, si está disponible.
              if (enProgreso && progress.mensajeActual != null) ...[
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

              // Barra de progreso + cronómetro. El cronómetro deja de correr
              // al terminar y demuestra que el proceso avanzó de verdad.
              if (enProgreso) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress.porcentaje > 0
                        ? progress.porcentaje / 100
                        : null,
                    minHeight: 6,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.blue.shade600,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Tiempo: $_tiempoTexto',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    Text(
                      progress.porcentaje > 0
                          ? '${progress.porcentaje}%'
                          : 'Procesando…',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
              ],

              // Lista de pasos realmente ejecutados. Se construye desde
              // `pasosVisibles` para que la UI no pueda desincronizarse del
              // flujo (antes había una lista fija que ocultaba los pasos donde
              // el técnico pasaba más tiempo).
              ...pasosVisibles.map(
                (step) => _buildStepItem(
                  step: step,
                  progress: progress,
                  icon: step.icono,
                ),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          traducirError(
                            progress.mensajeError,
                            contexto: 'finalizar la orden',
                          ).mensaje,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.35,
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
                      Icon(
                        Icons.celebration,
                        color: Colors.green.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Datos sincronizados correctamente. '
                          'Ya puedes consultar la orden en el servidor.',
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
          // Solo mostrar botones cuando el proceso terminó.
          if (progress.pasoActual == SyncStep.completado)
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('CONTINUAR'),
            ),
          if (progress.pasoActual == SyncStep.error) ...[
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('CERRAR'),
            ),
            if (widget.onReintentar != null)
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                onPressed: () {
                  Navigator.of(context).pop();
                  widget.onReintentar!();
                },
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('REINTENTAR'),
              ),
          ],
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
    // Cuando el backend reporta error, `pasoActual` es `error`: el paso que
    // falló es el primero visible sin completar.
    final isError =
        progress.pasoActual == SyncStep.error &&
        progress.pasoPendienteVisible == step;

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
