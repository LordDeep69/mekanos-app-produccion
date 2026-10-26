import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_service.dart';
import '../../../core/errors/error_feedback.dart';
import '../../../core/errors/user_friendly_error.dart';
import '../../../core/sync/smart_sync_service.dart';
import '../../orders/presentation/orden_detalle_screen.dart';
import '../data/historial_service.dart';
import '../data/pdf_service.dart';
import 'pdf_viewer_screen.dart';

/// Pantalla de detalle de orden finalizada
///
/// Muestra:
/// - Información completa del cliente y equipo
/// - Resumen de actividades ejecutadas
/// - Resumen de mediciones
/// - Estadísticas del servicio
/// - Opciones para ver/compartir PDF
class HistorialDetalleScreen extends ConsumerStatefulWidget {
  final int idOrdenLocal;

  const HistorialDetalleScreen({super.key, required this.idOrdenLocal});

  @override
  ConsumerState<HistorialDetalleScreen> createState() =>
      _HistorialDetalleScreenState();
}

class _HistorialDetalleScreenState
    extends ConsumerState<HistorialDetalleScreen> {
  OrdenHistorialDetalleDto? _detalle;
  bool _isLoading = true;
  String? _error;
  bool _isFetchingPdf = false;
  bool _isLoadingStats = false; // ✅ NUEVO: Estado para carga on-demand

  /// ✅ 19-OCT-2026: permiso de edición técnica consultado al backend.
  /// null = aún no consultado (se usa el valor local como fallback).
  bool? _permiteEdicion;
  bool _verificandoPermiso = false;

  @override
  void initState() {
    super.initState();
    _cargarDetalle();
  }

  Future<void> _cargarDetalle() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(historialServiceProvider);
      final detalle = await service.getDetalleOrden(widget.idOrdenLocal);

      if (mounted) {
        setState(() {
          _detalle = detalle;
          _isLoading = false;
          if (detalle == null) {
            _error = 'No se encontró la orden';
          }
        });

        // ✅ NUEVO: Cargar estadísticas on-demand si la orden viene de otro dispositivo
        if (detalle != null && _necesitaCargarEstadisticas(detalle)) {
          _cargarEstadisticasOnDemand(detalle.idBackend!);
        }

        // ✅ 19-OCT-2026: consultar el permiso de edición al servidor.
        // No bloquea el render; si falla la red se usa el valor local.
        if (detalle != null) {
          unawaited(_verificarPermisoEdicion());
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = mensajeAmigable(e, contexto: 'cargar el detalle de la orden');
          _isLoading = false;
        });
      }
    }
  }

  /// ✅ 19-OCT-2026: consulta puntual y liviana del permiso de edición.
  /// Se ejecuta al abrir/refrescar el historial y al volver de una edición.
  ///
  /// Regla: solo COMPLETADA con autorización administrativa permite editar.
  /// Si el servidor no responde, se conserva el último valor local para no
  /// romper el modo offline; el backend seguirá validando al resubir.
  Future<void> _verificarPermisoEdicion() async {
    final detalle = _detalle;
    if (detalle == null) return;

    final idBackend = detalle.idBackend;
    final esCompletada = detalle.estado.toUpperCase() == 'COMPLETADA';

    if (!esCompletada || idBackend == null) {
      if (mounted) {
        setState(() {
          _permiteEdicion = false;
          _verificandoPermiso = false;
        });
      }
      return;
    }

    if (_verificandoPermiso) return;
    setState(() => _verificandoPermiso = true);

    try {
      final permite = await ref
          .read(smartSyncServiceProvider)
          .verificarPermisoEdicion(idBackend, idLocal: detalle.idLocal);

      final local = await ref
          .read(databaseProvider)
          .getOrdenById(detalle.idLocal);

      if (!mounted) return;

      setState(() {
        _permiteEdicion = permite ?? local?.permiteEdicionTecnico ?? false;
      });
    } catch (e) {
      debugPrint('⚠️ [HISTORIAL] Error verificando permiso de edición: $e');
      if (!mounted) return;

      final local = await ref
          .read(databaseProvider)
          .getOrdenById(detalle.idLocal);
      if (!mounted) return;

      setState(() {
        _permiteEdicion = local?.permiteEdicionTecnico ?? false;
      });
    } finally {
      if (mounted) {
        setState(() => _verificandoPermiso = false);
      }
    }
  }

  /// ✅ 19-OCT-2026: abre el detalle editable SOLO si el permiso está vigente.
  /// Al volver, refresca el permiso y los datos del historial.
  Future<void> _abrirEdicionAutorizada() async {
    final detalle = _detalle;
    if (detalle == null) return;

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OrdenDetalleScreen(idOrdenLocal: detalle.idLocal),
      ),
    );

    if (!mounted) return;
    await _verificarPermisoEdicion();
    if (!mounted) return;
    await _cargarDetalle();
  }

  /// ✅ NUEVO: Detecta si la orden necesita cargar estadísticas del backend
  bool _necesitaCargarEstadisticas(OrdenHistorialDetalleDto detalle) {
    // Si no tiene idBackend, no podemos cargar del servidor
    if (detalle.idBackend == null) return false;

    // ✅ FIX: Usar el flag estadisticasSincronizadas para detectar si son datos reales
    // Si las estadísticas son de fallback (catálogo), necesitamos cargar del servidor
    if (!detalle.estadisticasSincronizadas) {
      debugPrint(
        '🔄 [ON-DEMAND] Orden ${detalle.numeroOrden} necesita cargar estadísticas (fallback del catálogo)',
      );
      return true;
    }

    return false;
  }

  /// ✅ NUEVO: Carga estadísticas desde el backend (on-demand)
  Future<void> _cargarEstadisticasOnDemand(int idBackend) async {
    if (_isLoadingStats) return;

    setState(() => _isLoadingStats = true);

    try {
      final smartSync = ref.read(smartSyncServiceProvider);
      final cargado = await smartSync.cargarEstadisticasOrden(idBackend);

      if (cargado && mounted) {
        // Recargar el detalle para mostrar las estadísticas actualizadas
        final service = ref.read(historialServiceProvider);
        final detalleActualizado = await service.getDetalleOrden(
          widget.idOrdenLocal,
        );

        if (mounted) {
          setState(() {
            _detalle = detalleActualizado;
            _isLoadingStats = false;
          });
        }
      } else if (mounted) {
        setState(() => _isLoadingStats = false);
      }
    } catch (e) {
      debugPrint('Error cargando estadísticas on-demand: $e');
      if (mounted) {
        setState(() => _isLoadingStats = false);
      }
    }
  }

  /// Abre el visor de PDF
  void _abrirPdf() {
    if (_detalle?.urlPdf == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PdfViewerScreen(
          pdfUrl: _detalle!.urlPdf!,
          numeroOrden: _detalle!.numeroOrden,
          titulo: 'Reporte ${_detalle!.numeroOrden}',
        ),
      ),
    );
  }

  /// Intenta consultar la URL del PDF desde el backend
  Future<void> _consultarUrlPdf() async {
    if (_detalle == null || _isFetchingPdf) return;

    setState(() => _isFetchingPdf = true);

    try {
      final service = ref.read(historialServiceProvider);
      final urlPdf = await service.consultarYGuardarUrlPdf(_detalle!.idLocal);

      if (urlPdf != null && urlPdf.isNotEmpty) {
        // Recargar el detalle para obtener la URL actualizada
        await _cargarDetalle();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ PDF encontrado y disponible'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
          // Abrir el PDF automáticamente
          _abrirPdf();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('PDF aún no disponible. Intente más tarde.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        mostrarErrorSnackBar(context, e, contexto: 'consultar el PDF');
      }
    } finally {
      if (mounted) {
        setState(() => _isFetchingPdf = false);
      }
    }
  }

  /// Descarga y comparte el PDF
  Future<void> _compartirPdf() async {
    if (_detalle?.urlPdf == null) return;

    // Mostrar indicador de carga
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Preparando PDF para compartir...'),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final pdfService = ref.read(pdfServiceProvider);
      final result = await pdfService.downloadPdf(
        url: _detalle!.urlPdf!,
        numeroOrden: _detalle!.numeroOrden,
      );

      if (mounted) Navigator.pop(context); // Cerrar diálogo

      if (result.success && result.localPath != null) {
        await pdfService.sharePdf(
          localPath: result.localPath!,
          numeroOrden: _detalle!.numeroOrden,
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                mensajeAmigable(
                  result.error ?? 'No se pudo descargar el PDF.',
                  contexto: 'descargar el PDF',
                ),
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Cerrar diálogo
        mostrarErrorSnackBar(context, e, contexto: 'descargar el PDF');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: Text(_detalle?.numeroOrden ?? 'Detalle de Orden'),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          // ✅ 19-OCT-2026: acceso directo a la corrección autorizada.
          if (_permiteEdicion == true)
            IconButton(
              icon: const Icon(Icons.edit_note),
              tooltip: 'Corregir y resubir (autorizado)',
              onPressed: _abrirEdicionAutorizada,
            ),
          // Botón Ver PDF - Consulta automática si no está disponible
          _isFetchingPdf
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                )
              : IconButton(
                  icon: Icon(
                    Icons.picture_as_pdf,
                    color:
                        _detalle?.urlPdf != null && _detalle!.urlPdf!.isNotEmpty
                        ? Colors.white
                        : Colors.white70,
                  ),
                  onPressed: () {
                    if (_detalle?.urlPdf != null &&
                        _detalle!.urlPdf!.isNotEmpty) {
                      _abrirPdf();
                    } else {
                      // Si no hay URL, intentar consultar al backend
                      _consultarUrlPdf();
                    }
                  },
                  tooltip:
                      _detalle?.urlPdf != null && _detalle!.urlPdf!.isNotEmpty
                      ? 'Ver PDF'
                      : 'Buscar PDF',
                ),
          // Botón Compartir PDF - Consulta automática si no está disponible
          IconButton(
            icon: Icon(
              Icons.share,
              color: _detalle?.urlPdf != null && _detalle!.urlPdf!.isNotEmpty
                  ? Colors.white
                  : Colors.white54,
            ),
            onPressed: () {
              if (_detalle?.urlPdf != null && _detalle!.urlPdf!.isNotEmpty) {
                _compartirPdf();
              } else {
                // Si no hay URL, intentar consultar primero
                _consultarUrlPdf();
              }
            },
            tooltip: 'Compartir',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _buildError()
          : _detalle == null
          ? _buildEmpty()
          : _buildContenido(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(
            _error!,
            style: TextStyle(color: Colors.red.shade700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _cargarDetalle,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'Orden no encontrada',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildContenido() {
    final detalle = _detalle!;

    return RefreshIndicator(
      onRefresh: _cargarDetalle,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ✅ 19-OCT-2026: banner visible cuando el administrador
            // habilitó la corrección de esta orden completada.
            if (_permiteEdicion == true) ...[
              _buildEdicionAutorizadaBanner(),
              const SizedBox(height: 16),
            ],

            // ✅ NUEVO: Banner de carga on-demand
            if (_isLoadingStats)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Row(
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Colors.blue.shade600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Cargando estadísticas y PDF desde el servidor...',
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Cabecera con estado
            _buildCabecera(detalle),
            const SizedBox(height: 16),

            // Información del cliente
            _buildSeccion(
              titulo: 'Cliente',
              icono: Icons.business,
              color: Colors.blue,
              children: [
                _buildInfoRow('Nombre', detalle.nombreCliente),
                if (detalle.direccionCliente != null)
                  _buildInfoRow('Dirección', detalle.direccionCliente!),
                if (detalle.telefonoCliente != null)
                  _buildInfoRow('Teléfono', detalle.telefonoCliente!),
                if (detalle.emailCliente != null)
                  _buildInfoRow('Email', detalle.emailCliente!),
              ],
            ),
            const SizedBox(height: 16),

            // Información del equipo
            _buildSeccion(
              titulo: 'Equipo',
              icono: Icons.precision_manufacturing,
              color: Colors.orange,
              children: [
                _buildInfoRow('Nombre', detalle.nombreEquipo),
                if (detalle.marcaEquipo != null)
                  _buildInfoRow('Marca', detalle.marcaEquipo!),
                if (detalle.modeloEquipo != null)
                  _buildInfoRow('Modelo', detalle.modeloEquipo!),
                if (detalle.serieEquipo != null)
                  _buildInfoRow('Serie', detalle.serieEquipo!),
                if (detalle.ubicacionEquipo != null)
                  _buildInfoRow('Ubicación', detalle.ubicacionEquipo!),
              ],
            ),
            const SizedBox(height: 16),

            // Información del servicio
            _buildSeccion(
              titulo: 'Servicio',
              icono: Icons.build,
              color: Colors.green,
              children: [
                _buildInfoRow(
                  'Tipo',
                  '${detalle.tipoServicio} (${detalle.codigoTipoServicio})',
                ),
                // Horas se muestran en el PDF - ocultadas aquí por problemas de zona horaria
                if (detalle.duracionServicio != null)
                  _buildInfoRow('Duración', detalle.duracionFormateada),
              ],
            ),
            const SizedBox(height: 16),

            // Resumen de actividades
            _buildResumenActividades(detalle),
            const SizedBox(height: 16),

            // Resumen de mediciones
            if (detalle.totalMediciones > 0) _buildResumenMediciones(detalle),
            if (detalle.totalMediciones > 0) const SizedBox(height: 16),

            // Evidencias y firmas
            _buildResumenEvidencias(detalle),
            const SizedBox(height: 16),

            // Trabajo realizado y observaciones
            if (detalle.trabajoRealizado != null ||
                detalle.observaciones != null)
              _buildSeccion(
                titulo: 'Notas del Servicio',
                icono: Icons.notes,
                color: Colors.purple,
                children: [
                  if (detalle.trabajoRealizado != null &&
                      detalle.trabajoRealizado!.isNotEmpty)
                    _buildTextoExpandido(
                      'Trabajo Realizado',
                      detalle.trabajoRealizado!,
                    ),
                  if (detalle.observaciones != null &&
                      detalle.observaciones!.isNotEmpty)
                    _buildTextoExpandido(
                      'Observaciones',
                      detalle.observaciones!,
                    ),
                ],
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  /// ✅ 19-OCT-2026: banner de edición autorizada por el administrador.
  Widget _buildEdicionAutorizadaBanner() {
    return Material(
      color: Colors.amber.shade50,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: _abrirEdicionAutorizada,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.amber.shade300),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.amber.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.edit_note,
                  color: Colors.amber.shade900,
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Edición autorizada',
                      style: TextStyle(
                        color: Colors.amber.shade900,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'El administrador habilitó corregir y resubir esta orden. '
                      'Toca aquí para abrir la ejecución.',
                      style: TextStyle(
                        color: Colors.amber.shade900,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              if (_verificandoPermiso)
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.amber.shade900,
                    ),
                  ),
                )
              else
                Icon(Icons.chevron_right, color: Colors.amber.shade900),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCabecera(OrdenHistorialDetalleDto detalle) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [Colors.green.shade600, Colors.green.shade400],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.check_circle,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        detalle.numeroOrden,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          detalle.estado.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatMini(
                  icon: Icons.checklist,
                  valor: '${detalle.totalActividades}',
                  label: 'Actividades',
                ),
                _buildStatMini(
                  icon: Icons.speed,
                  valor: '${detalle.totalMediciones}',
                  label: 'Mediciones',
                ),
                _buildStatMini(
                  icon: Icons.camera_alt,
                  valor: '${detalle.totalEvidencias}',
                  label: 'Fotos',
                ),
                _buildStatMini(
                  icon: Icons.draw,
                  valor: '${detalle.totalFirmas}',
                  label: 'Firmas',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatMini({
    required IconData icon,
    required String valor,
    required String label,
  }) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(height: 4),
        Text(
          valor,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 10),
        ),
      ],
    );
  }

  Widget _buildSeccion({
    required String titulo,
    required IconData icono,
    required Color color,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(icono, color: color, size: 24),
                const SizedBox(width: 12),
                Text(
                  titulo,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String valor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              valor,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextoExpandido(String titulo, String texto) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: TextStyle(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Text(
              texto,
              style: TextStyle(color: Colors.grey.shade800, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResumenActividades(OrdenHistorialDetalleDto detalle) {
    final total = detalle.totalActividades;
    if (total == 0) return const SizedBox.shrink();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.checklist, color: Colors.blue.shade600),
                const SizedBox(width: 12),
                const Text(
                  'Resumen de Actividades',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildContadorActividad(
                    'Buenas',
                    detalle.actividadesBuenas,
                    Colors.green,
                    Icons.check_circle,
                  ),
                ),
                Expanded(
                  child: _buildContadorActividad(
                    'Malas',
                    detalle.actividadesMalas,
                    Colors.red,
                    Icons.cancel,
                  ),
                ),
                Expanded(
                  child: _buildContadorActividad(
                    'Corregidas',
                    detalle.actividadesCorregidas,
                    Colors.orange,
                    Icons.build_circle,
                  ),
                ),
                Expanded(
                  child: _buildContadorActividad(
                    'N/A',
                    detalle.actividadesNA,
                    Colors.grey,
                    Icons.remove_circle,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Barra de progreso
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: detalle.porcentajeBuenas / 100,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(
                  detalle.porcentajeBuenas >= 80
                      ? Colors.green
                      : detalle.porcentajeBuenas >= 50
                      ? Colors.orange
                      : Colors.red,
                ),
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${detalle.porcentajeBuenas.toStringAsFixed(0)}% en buen estado',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContadorActividad(
    String label,
    int valor,
    Color color,
    IconData icon,
  ) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 4),
        Text(
          valor.toString(),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
        ),
      ],
    );
  }

  Widget _buildResumenMediciones(OrdenHistorialDetalleDto detalle) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.speed, color: Colors.purple.shade600),
                const SizedBox(width: 12),
                const Text(
                  'Resumen de Mediciones',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildContadorMedicion(
                    'Normal',
                    detalle.medicionesNormales,
                    Colors.green,
                  ),
                ),
                Expanded(
                  child: _buildContadorMedicion(
                    'Advertencia',
                    detalle.medicionesAdvertencia,
                    Colors.orange,
                  ),
                ),
                Expanded(
                  child: _buildContadorMedicion(
                    'Crítico',
                    detalle.medicionesCriticas,
                    Colors.red,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContadorMedicion(String label, int valor, Color color) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            valor.toString(),
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 20,
              color: color,
            ),
          ),
          Text(label, style: TextStyle(fontSize: 11, color: color)),
        ],
      ),
    );
  }

  Widget _buildResumenEvidencias(OrdenHistorialDetalleDto detalle) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.camera_alt, color: Colors.amber.shade700),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${detalle.totalEvidencias}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                      Text(
                        'Evidencias',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(width: 1, height: 40, color: Colors.grey.shade300),
            Expanded(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.teal.shade50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.draw, color: Colors.teal.shade700),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${detalle.totalFirmas}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                      Text(
                        'Firmas',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
