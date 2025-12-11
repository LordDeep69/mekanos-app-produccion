import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../data/evidencia_service.dart';

/// ============================================================================
/// EVIDENCIAS SCREEN - RUTA 7
/// ============================================================================
/// Pantalla de gestión de evidencias fotográficas con:
/// - Segmented Button para filtrar por tipo (ANTES | DURANTE | DESPUES)
/// - Grid de miniaturas
/// - Visor de imagen completa
/// - Eliminación con confirmación
/// - Edición de descripción
/// ============================================================================

class EvidenciasScreen extends ConsumerStatefulWidget {
  final int idOrdenLocal;
  final String? numeroOrden;

  const EvidenciasScreen({
    super.key,
    required this.idOrdenLocal,
    this.numeroOrden,
  });

  @override
  ConsumerState<EvidenciasScreen> createState() => _EvidenciasScreenState();
}

class _EvidenciasScreenState extends ConsumerState<EvidenciasScreen> {
  TipoEvidencia _tipoSeleccionado = TipoEvidencia.ANTES;
  List<Evidencia> _evidencias = [];
  bool _isLoading = true;
  Map<TipoEvidencia, int> _conteo = {};

  @override
  void initState() {
    super.initState();
    _cargarEvidencias();
  }

  Future<void> _cargarEvidencias() async {
    setState(() => _isLoading = true);

    final service = ref.read(evidenciaServiceProvider);

    try {
      // ✅ FIX: Cargar SOLO evidencias generales (sin actividad vinculada)
      // Las evidencias de actividades se muestran en sus propias tarjetas
      _evidencias = await service.getEvidenciasGenerales(widget.idOrdenLocal);
      _conteo = await service.contarEvidenciasGeneralesPorTipo(
        widget.idOrdenLocal,
      );
    } catch (e) {
      print('❌ Error cargando evidencias generales: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  List<Evidencia> get _evidenciasFiltradas {
    return _evidencias
        .where((e) => e.tipoEvidencia == _tipoSeleccionado.name)
        .toList();
  }

  Future<void> _capturarFoto() async {
    final service = ref.read(evidenciaServiceProvider);

    // Mostrar opciones: Cámara o Galería
    final opcion = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.blue),
              title: const Text('Tomar foto con cámara'),
              onTap: () => Navigator.pop(context, 'camara'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.green),
              title: const Text('Seleccionar de galería'),
              onTap: () => Navigator.pop(context, 'galeria'),
            ),
            ListTile(
              leading: const Icon(Icons.close, color: Colors.grey),
              title: const Text('Cancelar'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );

    if (opcion == null) return;

    // Mostrar indicador de carga
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
              SizedBox(width: 12),
              Text('Procesando imagen...'),
            ],
          ),
          duration: Duration(seconds: 10),
        ),
      );
    }

    // Capturar
    final resultado = opcion == 'camara'
        ? await service.capturarFotoCamara(
            idOrden: widget.idOrdenLocal,
            tipo: _tipoSeleccionado,
          )
        : await service.seleccionarDeGaleria(
            idOrden: widget.idOrdenLocal,
            tipo: _tipoSeleccionado,
          );

    // Cerrar snackbar de carga
    if (mounted) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
    }

    if (resultado.exito) {
      await _cargarEvidencias();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '✅ Foto guardada (${resultado.tamanoKB.toStringAsFixed(0)} KB)',
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } else {
      if (mounted &&
          resultado.error != 'Captura cancelada' &&
          resultado.error != 'Selección cancelada') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: ${resultado.error}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _eliminarEvidencia(Evidencia evidencia) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar evidencia?'),
        content: const Text(
          'Esta acción eliminará la foto y no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    final service = ref.read(evidenciaServiceProvider);
    final exito = await service.eliminarEvidencia(evidencia.idLocal);

    if (exito) {
      await _cargarEvidencias();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🗑️ Evidencia eliminada'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  void _verImagenCompleta(Evidencia evidencia) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _VisorImagenScreen(
          evidencia: evidencia,
          onDescripcionActualizada: _cargarEvidencias,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.numeroOrden ?? 'Evidencias'),
        backgroundColor: Colors.amber.shade700,
        foregroundColor: Colors.white,
        actions: const [],
      ),
      body: Column(
        children: [
          // Selector de tipo
          _buildTipoSelector(),

          // Grid de evidencias
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _evidenciasFiltradas.isEmpty
                ? _buildEmptyState()
                : _buildGrid(),
          ),
        ],
      ),
      // FAB para capturar
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _capturarFoto,
        backgroundColor: Colors.amber.shade700,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_a_photo),
        label: Text('Agregar ${_tipoSeleccionado.name}'),
      ),
    );
  }

  Widget _buildTipoSelector() {
    return Container(
      padding: const EdgeInsets.all(12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SegmentedButton<TipoEvidencia>(
          segments: [
            ButtonSegment(
              value: TipoEvidencia.ANTES,
              label: Text('ANTES (${_conteo[TipoEvidencia.ANTES] ?? 0})'),
              icon: const Icon(Icons.history, size: 18),
            ),
            ButtonSegment(
              value: TipoEvidencia.DURANTE,
              label: Text('DURANTE (${_conteo[TipoEvidencia.DURANTE] ?? 0})'),
              icon: const Icon(Icons.build, size: 18),
            ),
            ButtonSegment(
              value: TipoEvidencia.DESPUES,
              label: Text('DESPUES (${_conteo[TipoEvidencia.DESPUES] ?? 0})'),
              icon: const Icon(Icons.check_circle, size: 18),
            ),
            // ✅ FIX: Removido tab GENERAL - Las fotos generales deben ser ANTES/DURANTE/DESPUES
            // El backend solo acepta: ANTES, DURANTE, DESPUES, MEDICION
          ],
          selected: {_tipoSeleccionado},
          onSelectionChanged: (Set<TipoEvidencia> selection) {
            setState(() {
              _tipoSeleccionado = selection.first;
            });
          },
          style: const ButtonStyle(visualDensity: VisualDensity.compact),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.photo_camera, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No hay fotos ${_tipoSeleccionado.name}',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Toca el botón + para agregar',
            style: TextStyle(color: Colors.grey.shade400),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid() {
    return RefreshIndicator(
      onRefresh: _cargarEvidencias,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1,
        ),
        itemCount: _evidenciasFiltradas.length,
        itemBuilder: (context, index) {
          final evidencia = _evidenciasFiltradas[index];
          return _EvidenciaCard(
            evidencia: evidencia,
            onTap: () => _verImagenCompleta(evidencia),
            onLongPress: () => _eliminarEvidencia(evidencia),
          );
        },
      ),
    );
  }
}

// ============================================================================
// CARD DE EVIDENCIA (MINIATURA)
// ============================================================================

class _EvidenciaCard extends StatelessWidget {
  final Evidencia evidencia;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _EvidenciaCard({
    required this.evidencia,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final archivo = File(evidencia.rutaLocal);

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Card(
        clipBehavior: Clip.antiAlias,
        elevation: 3,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Imagen
            FutureBuilder<bool>(
              future: archivo.exists(),
              builder: (context, snapshot) {
                if (snapshot.data == true) {
                  return Image.file(
                    archivo,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholder(),
                  );
                }
                return _buildPlaceholder();
              },
            ),

            // Overlay con descripción
            if (evidencia.descripcion != null &&
                evidencia.descripcion!.isNotEmpty)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Text(
                    evidencia.descripcion!,
                    style: const TextStyle(color: Colors.white, fontSize: 11),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),

            // Indicador de tipo
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _getColorForTipo(evidencia.tipoEvidencia),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  evidencia.tipoEvidencia,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            // ✅ FIX: Botón de eliminar visible (además del long press)
            Positioned(
              top: 4,
              left: 4,
              child: GestureDetector(
                onTap: onLongPress, // Usa la misma función de eliminar
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.85),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey.shade200,
      child: const Icon(Icons.broken_image, size: 50, color: Colors.grey),
    );
  }

  Color _getColorForTipo(String tipo) {
    switch (tipo) {
      case 'ANTES':
        return Colors.blue;
      case 'DURANTE':
        return Colors.orange;
      case 'DESPUES':
        return Colors.green;
      case 'MEDICION':
        return Colors.purple;
      case 'GENERAL':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }
}

// ============================================================================
// VISOR DE IMAGEN COMPLETA
// ============================================================================

class _VisorImagenScreen extends ConsumerStatefulWidget {
  final Evidencia evidencia;
  final VoidCallback onDescripcionActualizada;

  const _VisorImagenScreen({
    required this.evidencia,
    required this.onDescripcionActualizada,
  });

  @override
  ConsumerState<_VisorImagenScreen> createState() => _VisorImagenScreenState();
}

class _VisorImagenScreenState extends ConsumerState<_VisorImagenScreen> {
  late TextEditingController _descripcionController;
  bool _editando = false;
  late String _descripcionActual; // Estado local para UI reactiva

  @override
  void initState() {
    super.initState();
    _descripcionActual = widget.evidencia.descripcion ?? '';
    _descripcionController = TextEditingController(text: _descripcionActual);
  }

  @override
  void dispose() {
    _descripcionController.dispose();
    super.dispose();
  }

  Future<void> _guardarDescripcion() async {
    final nuevaDescripcion = _descripcionController.text.trim();
    final service = ref.read(evidenciaServiceProvider);
    final exito = await service.actualizarDescripcion(
      widget.evidencia.idLocal,
      nuevaDescripcion,
    );

    if (exito) {
      setState(() {
        _editando = false;
        _descripcionActual = nuevaDescripcion; // ✅ Actualizar estado local
      });
      widget.onDescripcionActualizada();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Descripción guardada'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Error al guardar'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final archivo = File(widget.evidencia.rutaLocal);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.evidencia.tipoEvidencia),
        actions: [
          IconButton(
            icon: Icon(_editando ? Icons.save : Icons.edit),
            onPressed: () {
              if (_editando) {
                _guardarDescripcion();
              } else {
                setState(() => _editando = true);
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Imagen
          Expanded(
            child: InteractiveViewer(
              child: Center(
                child: FutureBuilder<bool>(
                  future: archivo.exists(),
                  builder: (context, snapshot) {
                    if (snapshot.data == true) {
                      return Image.file(archivo);
                    }
                    return const Icon(
                      Icons.broken_image,
                      size: 100,
                      color: Colors.grey,
                    );
                  },
                ),
              ),
            ),
          ),

          // Descripción
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey.shade900,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Fecha: ${_formatFecha(widget.evidencia.fechaCaptura)}',
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                ),
                const SizedBox(height: 8),
                if (_editando)
                  TextField(
                    controller: _descripcionController,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      hintText: 'Agregar descripción...',
                      hintStyle: TextStyle(color: Colors.grey),
                      border: OutlineInputBorder(),
                      enabledBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: Colors.grey),
                      ),
                    ),
                    maxLines: 3,
                    autofocus: true,
                  )
                else
                  Text(
                    _descripcionActual.isNotEmpty
                        ? _descripcionActual
                        : 'Sin descripción (toca ✏️ para agregar)',
                    style: TextStyle(
                      color: _descripcionActual.isNotEmpty
                          ? Colors.white
                          : Colors.grey,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatFecha(DateTime fecha) {
    return '${fecha.day}/${fecha.month}/${fecha.year} ${fecha.hour}:${fecha.minute.toString().padLeft(2, '0')}';
  }
}
