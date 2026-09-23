import 'dart:io';

import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../data/evidencia_service.dart';

/// ============================================================================
/// EVIDENCIAS GALLERY VIEWER - VISOR DE FOTOS FULLSCREEN
/// ============================================================================
/// Visor interactivo estilo galería nativa con:
/// - Swipe horizontal entre todas las fotos del grupo (item o sección)
/// - Zoom y paneo fluido con InteractiveViewer
/// - Barra superior con contador 'X de Y', título y botón de eliminar
/// - Tira de miniaturas inferior para navegación rápida
/// - Lectura y edición reactiva de descripción de cada foto
/// - Ocultamiento/visualización de controles al tocar la pantalla
/// ============================================================================
class EvidenciasGalleryViewer extends ConsumerStatefulWidget {
  final List<Evidencia> evidencias;
  final int initialIndex;
  final String? titulo;
  final VoidCallback? onEvidenciasModificadas;

  const EvidenciasGalleryViewer({
    super.key,
    required this.evidencias,
    this.initialIndex = 0,
    this.titulo,
    this.onEvidenciasModificadas,
  });

  @override
  ConsumerState<EvidenciasGalleryViewer> createState() =>
      _EvidenciasGalleryViewerState();
}

class _EvidenciasGalleryViewerState
    extends ConsumerState<EvidenciasGalleryViewer> {
  late PageController _pageController;
  late ScrollController _thumbnailsController;
  late int _currentIndex;
  late List<Evidencia> _evidencias;

  bool _showControls = true;
  bool _editandoDescripcion = false;
  late TextEditingController _descController;
  bool _isSavingDesc = false;

  @override
  void initState() {
    super.initState();
    _evidencias = List<Evidencia>.from(widget.evidencias);
    _currentIndex = widget.initialIndex.clamp(
      0,
      _evidencias.isEmpty ? 0 : _evidencias.length - 1,
    );
    _pageController = PageController(initialPage: _currentIndex);
    _thumbnailsController = ScrollController();

    final currentDesc = _evidencias.isNotEmpty
        ? (_evidencias[_currentIndex].descripcion ?? '')
        : '';
    _descController = TextEditingController(text: currentDesc);

    // Entrar en modo inmersivo oscuro
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Colors.black,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    _thumbnailsController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentIndex = index;
      _editandoDescripcion = false;
      _descController.text = _evidencias[index].descripcion ?? '';
    });
    _scrollToThumbnail(index);
  }

  void _scrollToThumbnail(int index) {
    if (!_thumbnailsController.hasClients) return;
    const thumbWidth = 56.0 + 8.0;
    final targetOffset = (index * thumbWidth) - (thumbWidth * 1.5);
    _thumbnailsController.animateTo(
      targetOffset.clamp(
        0.0,
        _thumbnailsController.position.maxScrollExtent,
      ),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  Future<void> _guardarDescripcion() async {
    if (_evidencias.isEmpty) return;
    final ev = _evidencias[_currentIndex];
    final nuevaDesc = _descController.text.trim();

    setState(() => _isSavingDesc = true);
    final service = ref.read(evidenciaServiceProvider);
    final exito = await service.actualizarDescripcion(ev.idLocal, nuevaDesc);

    if (mounted) {
      setState(() => _isSavingDesc = false);
      if (exito) {
        setState(() {
          _evidencias[_currentIndex] = ev.copyWith(
            descripcion: drift.Value(nuevaDesc.isEmpty ? null : nuevaDesc),
          );
          _editandoDescripcion = false;
        });
        widget.onEvidenciasModificadas?.call();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Descripción actualizada'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Error al guardar descripción'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _eliminarFotoActual() async {
    if (_evidencias.isEmpty) return;
    final ev = _evidencias[_currentIndex];

    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          '¿Eliminar foto?',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Esta fotografía será eliminada permanentemente del dispositivo.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    final service = ref.read(evidenciaServiceProvider);
    final exito = await service.eliminarEvidencia(ev.idLocal);

    if (exito && mounted) {
      widget.onEvidenciasModificadas?.call();

      setState(() {
        _evidencias.removeAt(_currentIndex);
        if (_evidencias.isEmpty) {
          Navigator.pop(context);
          return;
        }
        if (_currentIndex >= _evidencias.length) {
          _currentIndex = _evidencias.length - 1;
        }
        _descController.text = _evidencias[_currentIndex].descripcion ?? '';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🗑️ Foto eliminada'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Color _getColorTipo(String tipo) {
    switch (tipo.toUpperCase()) {
      case 'ANTES':
        return Colors.amber.shade700;
      case 'DURANTE':
        return Colors.blue.shade700;
      case 'DESPUES':
        return Colors.green.shade700;
      default:
        return const Color(0xFF6366F1);
    }
  }

  String _formatFecha(DateTime fecha) {
    final d = fecha.day.toString().padLeft(2, '0');
    final m = fecha.month.toString().padLeft(2, '0');
    final y = fecha.year;
    final h = fecha.hour.toString().padLeft(2, '0');
    final min = fecha.minute.toString().padLeft(2, '0');
    return '$d/$m/$y $h:$min';
  }

  @override
  Widget build(BuildContext context) {
    if (_evidencias.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Text(
            'No hay fotos para mostrar',
            style: TextStyle(color: Colors.white70),
          ),
        ),
      );
    }

    final currentEvidencia = _evidencias[_currentIndex];
    final colorTipo = _getColorTipo(currentEvidencia.tipoEvidencia);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Visor interactivo con PageView + InteractiveViewer
          GestureDetector(
            onTap: () {
              if (_editandoDescripcion) {
                FocusScope.of(context).unfocus();
                setState(() => _editandoDescripcion = false);
              } else {
                setState(() => _showControls = !_showControls);
              }
            },
            child: PageView.builder(
              controller: _pageController,
              itemCount: _evidencias.length,
              onPageChanged: _onPageChanged,
              physics: const BouncingScrollPhysics(),
              itemBuilder: (context, index) {
                final ev = _evidencias[index];
                final archivo = File(ev.rutaLocal);
                final existe = archivo.existsSync();

                return InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 5.0,
                  clipBehavior: Clip.none,
                  child: Center(
                    child: existe
                        ? Image.file(
                            archivo,
                            fit: BoxFit.contain,
                            errorBuilder: (c, e, s) => _buildErrorImage(),
                          )
                        : (ev.urlRemota != null && ev.urlRemota!.isNotEmpty)
                            ? Image.network(
                                ev.urlRemota!,
                                fit: BoxFit.contain,
                                loadingBuilder: (_, child, progress) {
                                  if (progress == null) return child;
                                  return const Center(
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                    ),
                                  );
                                },
                                errorBuilder: (c, e, s) => _buildErrorImage(),
                              )
                            : _buildErrorImage(),
                  ),
                );
              },
            ),
          ),

          // 2. Barra Superior (Header)
          AnimatedPositioned(
            duration: const Duration(milliseconds: 250),
            top: _showControls ? 0 : -120,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 8,
                bottom: 12,
                left: 12,
                right: 12,
              ),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black87,
                    Colors.black54,
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                children: [
                  // Botón Volver
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.black45,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_back_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),

                  const SizedBox(width: 8),

                  // Título & Contador
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.titulo ?? 'Evidencia Fotográfica',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: colorTipo.withValues(alpha: 0.85),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                currentEvidencia.tipoEvidencia.toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${_currentIndex + 1} de ${_evidencias.length}',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Botón Eliminar
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.black45,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.delete_outline_rounded,
                        color: Colors.redAccent,
                        size: 22,
                      ),
                    ),
                    onPressed: _eliminarFotoActual,
                  ),
                ],
              ),
            ),
          ),

          // 3. Barra Inferior (Footer con Miniaturas + Descripción + Fecha)
          AnimatedPositioned(
            duration: const Duration(milliseconds: 250),
            bottom: _showControls ? 0 : -220,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: 16,
                bottom: MediaQuery.of(context).padding.bottom + 12,
                left: 16,
                right: 16,
              ),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black,
                    Colors.black87,
                    Colors.transparent,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tira de miniaturas (si hay más de 1 foto)
                  if (_evidencias.length > 1) ...[
                    SizedBox(
                      height: 52,
                      child: ListView.separated(
                        controller: _thumbnailsController,
                        scrollDirection: Axis.horizontal,
                        itemCount: _evidencias.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final ev = _evidencias[index];
                          final isSelected = index == _currentIndex;
                          final archivo = File(ev.rutaLocal);

                          return GestureDetector(
                            onTap: () {
                              _pageController.animateToPage(
                                index,
                                duration: const Duration(milliseconds: 250),
                                curve: Curves.easeInOut,
                              );
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected
                                      ? colorTipo
                                      : Colors.white24,
                                  width: isSelected ? 2.5 : 1,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: archivo.existsSync()
                                    ? Image.file(
                                        archivo,
                                        fit: BoxFit.cover,
                                        errorBuilder: (c, e, s) =>
                                            const Icon(
                                          Icons.broken_image,
                                          color: Colors.white30,
                                          size: 20,
                                        ),
                                      )
                                    : const Icon(
                                        Icons.image_outlined,
                                        color: Colors.white30,
                                        size: 20,
                                      ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Fecha e info de captura
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time_rounded,
                        color: Colors.white54,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatFecha(currentEvidencia.fechaCaptura),
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 12,
                        ),
                      ),
                      const Spacer(),
                      // Botón editar / guardar descripción
                      if (!_editandoDescripcion)
                        InkWell(
                          onTap: () {
                            setState(() {
                              _editandoDescripcion = true;
                              _descController.text =
                                  currentEvidencia.descripcion ?? '';
                            });
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.edit_note_rounded,
                                  color: Colors.blue.shade300,
                                  size: 18,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Editar nota',
                                  style: TextStyle(
                                    color: Colors.blue.shade300,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Caja de descripción (modo lectura o edición)
                  if (_editandoDescripcion) ...[
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _descController,
                            autofocus: true,
                            maxLines: 2,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Agregar descripción a esta foto...',
                              hintStyle: const TextStyle(color: Colors.white38),
                              filled: true,
                              fillColor: Colors.white.withValues(alpha: 0.1),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: colorTipo),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: colorTipo,
                                  width: 1.5,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: _isSavingDesc
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    color: Colors.green,
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(
                                  Icons.check_circle_rounded,
                                  color: Colors.greenAccent,
                                  size: 28,
                                ),
                          onPressed:
                              _isSavingDesc ? null : _guardarDescripcion,
                        ),
                        IconButton(
                          icon: const Icon(
                            Icons.cancel_rounded,
                            color: Colors.white54,
                            size: 24,
                          ),
                          onPressed: () {
                            setState(() => _editandoDescripcion = false);
                          },
                        ),
                      ],
                    ),
                  ] else ...[
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _editandoDescripcion = true;
                          _descController.text =
                              currentEvidencia.descripcion ?? '';
                        });
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          (currentEvidencia.descripcion != null &&
                                  currentEvidencia.descripcion!.isNotEmpty)
                              ? currentEvidencia.descripcion!
                              : 'Sin nota adjunta. Toca aquí para agregar una descripción...',
                          style: TextStyle(
                            color: (currentEvidencia.descripcion != null &&
                                    currentEvidencia.descripcion!.isNotEmpty)
                                ? Colors.white
                                : Colors.white38,
                            fontSize: 13,
                            fontStyle: (currentEvidencia.descripcion != null &&
                                    currentEvidencia.descripcion!.isNotEmpty)
                                ? FontStyle.normal
                                : FontStyle.italic,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorImage() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.broken_image_rounded, size: 72, color: Colors.grey.shade600),
        const SizedBox(height: 12),
        const Text(
          'No se pudo cargar el archivo de la imagen',
          style: TextStyle(color: Colors.white54, fontSize: 14),
        ),
      ],
    );
  }
}
