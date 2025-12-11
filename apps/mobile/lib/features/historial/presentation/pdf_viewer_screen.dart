import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/pdf_service.dart';

/// Pantalla para visualizar PDFs de órdenes finalizadas
///
/// Características:
/// - Descarga el PDF si no está en caché
/// - Muestra indicador de progreso
/// - Navegación por páginas
/// - Botón de compartir
class PdfViewerScreen extends ConsumerStatefulWidget {
  final String pdfUrl;
  final String numeroOrden;
  final String? titulo;

  const PdfViewerScreen({
    super.key,
    required this.pdfUrl,
    required this.numeroOrden,
    this.titulo,
  });

  @override
  ConsumerState<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends ConsumerState<PdfViewerScreen> {
  bool _isLoading = true;
  String? _localPath;
  String? _error;
  int _currentPage = 0;
  int _totalPages = 0;
  PDFViewController? _pdfController;

  @override
  void initState() {
    super.initState();
    _loadPdf();
  }

  Future<void> _loadPdf() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final pdfService = ref.read(pdfServiceProvider);

      // Intentar descargar o usar caché
      final result = await pdfService.downloadPdf(
        url: widget.pdfUrl,
        numeroOrden: widget.numeroOrden,
      );

      if (result.success && result.localPath != null) {
        // Verificar que el archivo existe
        final file = File(result.localPath!);
        if (await file.exists()) {
          setState(() {
            _localPath = result.localPath;
            _isLoading = false;
          });

          if (result.fromCache) {
            _showSnackBar('PDF cargado desde caché');
          } else {
            _showSnackBar('PDF descargado (${result.sizeFormatted})');
          }
        } else {
          setState(() {
            _error = 'El archivo descargado no existe';
            _isLoading = false;
          });
        }
      } else {
        setState(() {
          _error = result.error ?? 'Error desconocido al descargar el PDF';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
        _isLoading = false;
      });
    }
  }

  void _showSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), duration: const Duration(seconds: 2)),
      );
    }
  }

  Future<void> _sharePdf() async {
    if (_localPath == null) return;

    final pdfService = ref.read(pdfServiceProvider);
    final success = await pdfService.sharePdf(
      localPath: _localPath!,
      numeroOrden: widget.numeroOrden,
    );

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error al compartir el PDF'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.titulo ?? 'Reporte ${widget.numeroOrden}'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (_localPath != null) ...[
            // Indicador de página
            if (_totalPages > 0)
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_currentPage + 1} / $_totalPages',
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ),
            // Botón compartir
            IconButton(
              icon: const Icon(Icons.share),
              tooltip: 'Compartir PDF',
              onPressed: _sharePdf,
            ),
          ],
          // Botón recargar
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Recargar',
            onPressed: _loadPdf,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return _buildLoadingState();
    }

    if (_error != null) {
      return _buildErrorState();
    }

    if (_localPath != null) {
      return _buildPdfViewer();
    }

    return const Center(child: Text('Estado desconocido'));
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 24),
          Text(
            'Descargando PDF...',
            style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            widget.numeroOrden,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            const Text(
              'Error al cargar el PDF',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Error desconocido',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadPdf,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Volver'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPdfViewer() {
    return PDFView(
      filePath: _localPath!,
      enableSwipe: true,
      swipeHorizontal: false,
      autoSpacing: true,
      pageFling: true,
      pageSnap: true,
      fitPolicy: FitPolicy.BOTH,
      preventLinkNavigation: false,
      onRender: (pages) {
        setState(() {
          _totalPages = pages ?? 0;
        });
      },
      onError: (error) {
        print('❌ Error al renderizar PDF: $error');
        setState(() {
          _error = 'Error al renderizar el PDF: $error';
        });
      },
      onPageError: (page, error) {
        print('❌ Error en página $page: $error');
      },
      onViewCreated: (controller) {
        _pdfController = controller;
      },
      onPageChanged: (page, total) {
        setState(() {
          _currentPage = page ?? 0;
          _totalPages = total ?? 0;
        });
      },
    );
  }
}
