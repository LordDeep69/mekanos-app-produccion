import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../data/evidencia_service.dart';

/// ============================================================================
/// EVIDENCIAS ACTIVIDAD BOTTOM SHEET - RUTA 7.5
/// ============================================================================
/// Mini-galería vinculada a una actividad específica con tabs ANTES/DURANTE/DESPUÉS
/// Permite múltiples fotos por tipo, vinculadas a la actividad
/// ============================================================================

class EvidenciasActividadBottomSheet extends ConsumerStatefulWidget {
  final int idOrden;
  final int idActividad;
  final String nombreActividad;
  final int? idOrdenEquipo; // ✅ MULTI-EQUIPOS (16-DIC-2025)

  const EvidenciasActividadBottomSheet({
    super.key,
    required this.idOrden,
    required this.idActividad,
    required this.nombreActividad,
    this.idOrdenEquipo, // ✅ MULTI-EQUIPOS: Opcional para backward compatibility
  });

  @override
  ConsumerState<EvidenciasActividadBottomSheet> createState() =>
      _EvidenciasActividadBottomSheetState();
}

class _EvidenciasActividadBottomSheetState
    extends ConsumerState<EvidenciasActividadBottomSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<Evidencia> _evidenciasAntes = [];
  List<Evidencia> _evidenciasDurante = [];
  List<Evidencia> _evidenciasDespues = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _cargarEvidencias();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _cargarEvidencias() async {
    setState(() => _isLoading = true);

    final service = ref.read(evidenciaServiceProvider);

    try {
      _evidenciasAntes = await service.getEvidenciasByActividadYTipo(
        widget.idActividad,
        TipoEvidencia.ANTES,
      );
      _evidenciasDurante = await service.getEvidenciasByActividadYTipo(
        widget.idActividad,
        TipoEvidencia.DURANTE,
      );
      _evidenciasDespues = await service.getEvidenciasByActividadYTipo(
        widget.idActividad,
        TipoEvidencia.DESPUES,
      );
    } catch (e) {
      debugPrint('❌ Error cargando evidencias: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _agregarFoto(TipoEvidencia tipo) async {
    final service = ref.read(evidenciaServiceProvider);

    final resultado = await service.capturarFotoCamara(
      idOrden: widget.idOrden,
      tipo: tipo,
      descripcion: widget.nombreActividad,
      idActividadEjecutada: widget.idActividad,
      idOrdenEquipo: widget.idOrdenEquipo, // ✅ MULTI-EQUIPOS (16-DIC-2025)
    );

    if (resultado.exito) {
      await _cargarEvidencias();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '📸 Foto guardada (${resultado.tamanoKB.toStringAsFixed(0)} KB)',
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } else if (resultado.error != 'Captura cancelada' && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: ${resultado.error}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _eliminarFoto(Evidencia evidencia) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar foto?'),
        content: const Text('Esta acción no se puede deshacer.'),
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

    if (confirmar == true) {
      final service = ref.read(evidenciaServiceProvider);
      final exito = await service.eliminarEvidencia(evidencia.idLocal);

      if (exito) {
        await _cargarEvidencias();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🗑️ Foto eliminada'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalFotos =
        _evidenciasAntes.length +
        _evidenciasDurante.length +
        _evidenciasDespues.length;

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.photo_library, color: Colors.blue.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Evidencias de Actividad',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: totalFotos > 0
                            ? Colors.blue.shade100
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$totalFotos fotos',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: totalFotos > 0 ? Colors.blue : Colors.grey,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  widget.nombreActividad,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Tabs
          Container(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.blue.shade700,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Colors.blue.shade700,
              indicatorWeight: 3,
              tabs: [
                _buildTab('ANTES', _evidenciasAntes.length, Colors.amber),
                _buildTab('DURANTE', _evidenciasDurante.length, Colors.blue),
                _buildTab('DESPUÉS', _evidenciasDespues.length, Colors.green),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildGaleriaTab(
                        _evidenciasAntes,
                        TipoEvidencia.ANTES,
                        Colors.amber,
                      ),
                      _buildGaleriaTab(
                        _evidenciasDurante,
                        TipoEvidencia.DURANTE,
                        Colors.blue,
                      ),
                      _buildGaleriaTab(
                        _evidenciasDespues,
                        TipoEvidencia.DESPUES,
                        Colors.green,
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTab(String label, int count, Color color) {
    return Tab(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGaleriaTab(
    List<Evidencia> evidencias,
    TipoEvidencia tipo,
    Color color,
  ) {
    return Column(
      children: [
        // Botón agregar
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _agregarFoto(tipo),
              icon: const Icon(Icons.camera_alt),
              label: Text('Agregar foto ${tipo.name}'),
              style: ElevatedButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),

        // Grid de fotos
        Expanded(
          child: evidencias.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.photo_library_outlined,
                        size: 64,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Sin fotos ${tipo.name}',
                        style: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: evidencias.length,
                  itemBuilder: (context, index) {
                    final evidencia = evidencias[index];
                    return _buildFotoCard(evidencia, color);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildFotoCard(Evidencia evidencia, Color color) {
    final archivo = File(evidencia.rutaLocal);
    final existe = archivo.existsSync();

    return GestureDetector(
      onTap: () => _verFoto(evidencia),
      onLongPress: () => _eliminarFoto(evidencia),
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withValues(alpha: 0.5), width: 2),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: existe
                  ? Image.file(
                      archivo,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      errorBuilder: (_, __, ___) => _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
          // ✅ Botón de eliminar visible
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: () => _eliminarFoto(evidencia),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.85),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey.shade200,
      child: Icon(Icons.broken_image, color: Colors.grey.shade400, size: 32),
    );
  }

  void _verFoto(Evidencia evidencia) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          children: [
            // Imagen
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  File(evidencia.rutaLocal),
                  fit: BoxFit.contain,
                ),
              ),
            ),
            // Cerrar
            Positioned(
              top: 0,
              right: 0,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white),
                ),
              ),
            ),
            // Descripción
            if (evidencia.descripcion != null)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [Colors.black87, Colors.transparent],
                    ),
                  ),
                  child: Text(
                    evidencia.descripcion!,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
