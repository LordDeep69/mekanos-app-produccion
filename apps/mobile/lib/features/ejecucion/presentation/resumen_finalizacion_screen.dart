import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';
import '../../../core/sync/sync_upload_service.dart';
import '../../auth/data/auth_provider.dart';
import '../../evidencias/presentation/evidencias_screen.dart';
import '../../firmas/data/firma_service.dart';
import '../../firmas/presentation/firmas_section.dart';
import '../data/ejecucion_service.dart';

/// Pantalla de Resumen y Finalización de Orden - NIVEL ORDEN (no equipo)
/// 
/// Para órdenes multi-equipo:
/// - Muestra progreso de TODOS los equipos
/// - Valida que TODOS los equipos estén completados
/// - Captura firmas UNA SOLA VEZ para toda la orden
/// - Sincroniza TODOS los datos agrupados por equipo
class ResumenFinalizacionScreen extends ConsumerStatefulWidget {
  final int idOrdenLocal;
  final int? idBackend;
  final String? numeroOrden;

  const ResumenFinalizacionScreen({
    super.key,
    required this.idOrdenLocal,
    this.idBackend,
    this.numeroOrden,
  });

  @override
  ConsumerState<ResumenFinalizacionScreen> createState() =>
      _ResumenFinalizacionScreenState();
}

class _ResumenFinalizacionScreenState
    extends ConsumerState<ResumenFinalizacionScreen> {
  bool _isLoading = true;
  List<OrdenesEquipo> _equipos = [];
  final Map<int, _EstadoEquipo> _estadosPorEquipo = {};
  bool _esMultiEquipo = false;
  bool _tieneFirmaTecnico = false;
  bool _tieneFirmaCliente = false;
  bool _esCorrectivo = false;
  String? _razonFallaActual;

  // Totales agregados de todos los equipos
  int _totalActividades = 0;
  int _actividadesCompletadas = 0;
  int _totalMediciones = 0;
  int _medicionesConValor = 0;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);

    try {
      final db = ref.read(databaseProvider);
      final ejecService = ref.read(ejecucionServiceProvider);
      final firmaService = ref.read(firmaServiceProvider);

      // Cargar orden para detectar tipo
      final orden = await (db.select(db.ordenes)
            ..where((o) => o.idLocal.equals(widget.idOrdenLocal)))
          .getSingleOrNull();

      if (orden != null) {
        final tipoServicio = await db.getTipoServicioById(orden.idTipoServicio);
        final codigoTipo = tipoServicio?.codigo ?? '';
        final numero = orden.numeroOrden.toUpperCase();
        _esCorrectivo =
            codigoTipo.toUpperCase().contains('CORR') ||
            numero.contains('CORR');
        _razonFallaActual = orden.razonFalla;
      }

      // Cargar equipos de la orden (si es multi-equipo)
      if (widget.idBackend != null) {
        _equipos = await db.getEquiposByOrdenServicio(widget.idBackend!);
        _esMultiEquipo = _equipos.length > 1;
      }

      // Cargar estado de cada equipo
      _estadosPorEquipo.clear();
      _totalActividades = 0;
      _actividadesCompletadas = 0;
      _totalMediciones = 0;
      _medicionesConValor = 0;

      if (_esMultiEquipo) {
        // Para cada equipo, cargar sus estadísticas
        for (final equipo in _equipos) {
          final actividadesMap = await ejecService.getActividadesAgrupadas(
            widget.idOrdenLocal,
            idOrdenEquipo: equipo.idOrdenEquipo,
          );
          final mediciones = await ejecService.getMedicionesByOrdenLocal(
            widget.idOrdenLocal,
            idOrdenEquipo: equipo.idOrdenEquipo,
          );

          int totalAct = 0;
          int completadasAct = 0;
          for (final lista in actividadesMap.values) {
            for (final act in lista) {
              totalAct++;
              if (act.simbologia != null) completadasAct++;
            }
          }

          final totalMed = mediciones.length;
          final medConValor = mediciones.where((m) => m.valor != null).length;

          _estadosPorEquipo[equipo.idOrdenEquipo] = _EstadoEquipo(
            nombreEquipo: equipo.nombreSistema ?? equipo.nombreEquipo ?? 'Equipo ${equipo.ordenSecuencia}',
            totalActividades: totalAct,
            actividadesCompletadas: completadasAct,
            totalMediciones: totalMed,
            medicionesCompletadas: medConValor,
          );

          _totalActividades += totalAct;
          _actividadesCompletadas += completadasAct;
          _totalMediciones += totalMed;
          _medicionesConValor += medConValor;
        }
      } else {
        // Orden simple (1 equipo o sin tabla ordenes_equipos)
        final actividadesMap = await ejecService.getActividadesAgrupadas(
          widget.idOrdenLocal,
        );
        final mediciones = await ejecService.getMedicionesByOrdenLocal(
          widget.idOrdenLocal,
        );

        for (final lista in actividadesMap.values) {
          for (final act in lista) {
            _totalActividades++;
            if (act.simbologia != null) _actividadesCompletadas++;
          }
        }
        _totalMediciones = mediciones.length;
        _medicionesConValor = mediciones.where((m) => m.valor != null).length;
      }

      // Cargar estado de firmas
      _tieneFirmaTecnico = await firmaService.existeFirma(
        widget.idOrdenLocal,
        'TECNICO',
      );
      _tieneFirmaCliente = await firmaService.existeFirma(
        widget.idOrdenLocal,
        'CLIENTE',
      );
    } catch (e) {
      debugPrint('❌ Error cargando datos: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  /// Actualiza estado de firmas después de capturar
  /// VoidCallback compatible con FirmasSection.onFirmaGuardada
  Future<void> _actualizarEstadoFirmas() async {
    final firmaService = ref.read(firmaServiceProvider);
    final tieneTecnico = await firmaService.existeFirma(
      widget.idOrdenLocal,
      'TECNICO',
    );
    final tieneCliente = await firmaService.existeFirma(
      widget.idOrdenLocal,
      'CLIENTE',
    );
    
    if (mounted) {
      setState(() {
        _tieneFirmaTecnico = tieneTecnico;
        _tieneFirmaCliente = tieneCliente;
      });
    }
  }

  /// Verifica si todos los equipos están completos
  bool _todosEquiposCompletos() {
    if (!_esMultiEquipo) {
      // Orden simple: solo verificar actividades + mediciones
      return _actividadesCompletadas >= _totalActividades &&
             _medicionesConValor >= _totalMediciones;
    }

    // Multi-equipo: verificar cada equipo
    for (final estado in _estadosPorEquipo.values) {
      if (!estado.estaCompleto) return false;
    }
    return true;
  }

  /// Lista de equipos incompletos (para mostrar en error)
  List<String> _equiposIncompletos() {
    final incompletos = <String>[];
    for (final entry in _estadosPorEquipo.entries) {
      if (!entry.value.estaCompleto) {
        incompletos.add(entry.value.nombreEquipo);
      }
    }
    return incompletos;
  }

  @override
  Widget build(BuildContext context) {
    final totalItems = _totalActividades + _totalMediciones;
    final completados = _actividadesCompletadas + _medicionesConValor;
    final porcentaje = totalItems > 0 ? (completados / totalItems * 100).toInt() : 0;
    final progresoCompleto = _todosEquiposCompletos();

    // Condición completa para finalizar
    final puedeFinalizarItems = progresoCompleto;
    final puedeFinalizarFirmas = _tieneFirmaTecnico && _tieneFirmaCliente;
    final puedeFinalizar = puedeFinalizarItems && puedeFinalizarFirmas;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Resumen del Servicio', style: TextStyle(fontSize: 16)),
            if (widget.numeroOrden != null)
              Text(
                widget.numeroOrden!,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              ),
          ],
        ),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargarDatos,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Indicador multi-equipo
                    if (_esMultiEquipo)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.blue.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.devices_other, color: Colors.blue.shade700),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Orden Multi-Equipo: ${_equipos.length} equipos',
                                style: TextStyle(
                                  color: Colors.blue.shade700,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Progreso general
                    _buildProgresoGeneral(completados, totalItems, porcentaje, progresoCompleto),
                    const SizedBox(height: 16),

                    // Estado por equipo (solo multi-equipo)
                    if (_esMultiEquipo) ...[
                      _buildEstadosPorEquipo(),
                      const SizedBox(height: 16),
                    ],

                    // Fotos Generales
                    _buildFotosGeneralesCard(),
                    const SizedBox(height: 16),

                    // Firmas Digitales
                    FirmasSection(
                      idOrden: widget.idOrdenLocal,
                      onFirmaGuardada: _actualizarEstadoFirmas,
                    ),
                    const SizedBox(height: 32),

                    // Botón Finalizar
                    _buildBotonFinalizar(puedeFinalizar, porcentaje, puedeFinalizarItems),
                    
                    const SizedBox(height: 100), // Espacio para scroll
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildProgresoGeneral(int completados, int totalItems, int porcentaje, bool progresoCompleto) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const Text(
              'Progreso de Ejecución',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    value: totalItems > 0 ? completados / totalItems : 0,
                    strokeWidth: 12,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      progresoCompleto ? Colors.green : Colors.blue,
                    ),
                  ),
                ),
                Text(
                  '$porcentaje%',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '$completados de $totalItems items completados',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            Text(
              '📋 Checklist: $_actividadesCompletadas/$_totalActividades  |  📏 Mediciones: $_medicionesConValor/$_totalMediciones',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
            if (!progresoCompleto && _esMultiEquipo) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.orange.shade700, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Hay equipos sin completar. Ejecuta cada equipo antes de finalizar.',
                        style: TextStyle(color: Colors.orange.shade700, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEstadosPorEquipo() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Estado por Equipo',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ...List.generate(_equipos.length, (index) {
              final equipo = _equipos[index];
              final estado = _estadosPorEquipo[equipo.idOrdenEquipo];
              if (estado == null) return const SizedBox.shrink();

              final completo = estado.estaCompleto;
              final progreso = estado.porcentaje;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: completo ? Colors.green.shade50 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: completo ? Colors.green.shade300 : Colors.grey.shade300,
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: completo ? Colors.green : Colors.grey,
                      child: completo
                          ? const Icon(Icons.check, color: Colors.white, size: 20)
                          : Text(
                              '${equipo.ordenSecuencia}',
                              style: const TextStyle(color: Colors.white, fontSize: 14),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            estado.nombreEquipo,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '📋 ${estado.actividadesCompletadas}/${estado.totalActividades} | 📏 ${estado.medicionesCompletadas}/${estado.totalMediciones}',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: completo ? Colors.green : Colors.orange,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        completo ? '✓ Completo' : '$progreso%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildFotosGeneralesCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.teal.shade600, Colors.teal.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.teal.shade200,
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => EvidenciasScreen(
                  idOrdenLocal: widget.idOrdenLocal,
                  numeroOrden: widget.numeroOrden,
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.collections,
                    size: 32,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '📷 FOTOS GENERALES',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Fotos ANTES, DURANTE y DESPUÉS',
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white70,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBotonFinalizar(bool puedeFinalizar, int porcentaje, bool puedeFinalizarItems) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: puedeFinalizar
            ? () => _mostrarDialogoFinalizacion()
            : () => _mostrarFaltantes(porcentaje, puedeFinalizarItems),
        icon: Icon(puedeFinalizar ? Icons.check_circle : Icons.pending),
        label: Text(
          puedeFinalizar
              ? 'FINALIZAR SERVICIO'
              : _getTextoBotonFinalizar(porcentaje),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: puedeFinalizar ? Colors.green : Colors.orange,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  void _mostrarFaltantes(int porcentaje, bool puedeFinalizarItems) {
    String faltantes = '';
    
    if (!puedeFinalizarItems) {
      if (_esMultiEquipo) {
        final incompletos = _equiposIncompletos();
        faltantes += '• Equipos sin completar:\n';
        for (final nombre in incompletos) {
          faltantes += '   - $nombre\n';
        }
      } else {
        faltantes += '• Completar items ($porcentaje%)\n';
      }
    }
    if (!_tieneFirmaTecnico) {
      faltantes += '• Firma del Técnico\n';
    }
    if (!_tieneFirmaCliente) {
      faltantes += '• Firma del Cliente\n';
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Falta completar:\n$faltantes'),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  String _getTextoBotonFinalizar(int porcentaje) {
    if (!_todosEquiposCompletos()) {
      if (_esMultiEquipo) {
        return 'EQUIPOS INCOMPLETOS';
      }
      return 'COMPLETAR ITEMS ($porcentaje%)';
    }
    if (!_tieneFirmaTecnico && !_tieneFirmaCliente) {
      return 'FALTAN FIRMAS';
    }
    if (!_tieneFirmaTecnico) {
      return 'FALTA FIRMA TÉCNICO';
    }
    if (!_tieneFirmaCliente) {
      return 'FALTA FIRMA CLIENTE';
    }
    return 'FINALIZAR SERVICIO';
  }

  /// Muestra diálogo para capturar datos finales y sincronizar
  Future<void> _mostrarDialogoFinalizacion() async {
    final now = DateTime.now();
    final horaEntradaController = TextEditingController(
      text: DateFormat('HH:mm').format(now.subtract(const Duration(hours: 1))),
    );
    final horaSalidaController = TextEditingController(
      text: DateFormat('HH:mm').format(now),
    );
    final observacionesController = TextEditingController();
    final razonFallaController = TextEditingController(
      text: _razonFallaActual ?? '',
    );

    final resultado = await showDialog<Map<String, String>>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Finalizar Servicio'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _esMultiEquipo
                    ? 'Finalizando servicio con ${_equipos.length} equipos.'
                    : 'Complete los datos para finalizar el servicio.',
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: horaEntradaController,
                decoration: const InputDecoration(
                  labelText: 'Hora de Entrada',
                  hintText: 'HH:mm',
                  prefixIcon: Icon(Icons.login),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.datetime,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: horaSalidaController,
                decoration: const InputDecoration(
                  labelText: 'Hora de Salida',
                  hintText: 'HH:mm',
                  prefixIcon: Icon(Icons.logout),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.datetime,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: observacionesController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Observaciones Generales',
                  hintText: 'Observaciones del servicio...',
                  prefixIcon: Icon(Icons.notes),
                  border: OutlineInputBorder(),
                ),
              ),
              if (_esCorrectivo) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: razonFallaController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Razón de la falla (opcional)',
                    hintText: 'Describe la causa raíz o hallazgo principal',
                    prefixIcon: Icon(Icons.bug_report),
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(null),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(ctx).pop({
                'horaEntrada': horaEntradaController.text,
                'horaSalida': horaSalidaController.text,
                'observaciones': observacionesController.text.isEmpty
                    ? 'Servicio completado satisfactoriamente.'
                    : observacionesController.text,
                if (_esCorrectivo) 'razonFalla': razonFallaController.text,
              });
            },
            icon: const Icon(Icons.cloud_upload),
            label: const Text('FINALIZAR Y SINCRONIZAR'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
          ),
        ],
      ),
    );

    if (resultado != null) {
      await _ejecutarFinalizacion(
        horaEntrada: resultado['horaEntrada']!,
        horaSalida: resultado['horaSalida']!,
        observaciones: resultado['observaciones']!,
        razonFalla: resultado['razonFalla'],
      );
    }
  }

  /// Ejecuta la sincronización con el backend
  Future<void> _ejecutarFinalizacion({
    required String horaEntrada,
    required String horaSalida,
    required String observaciones,
    String? razonFalla,
  }) async {
    // Mostrar loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            const Text(
              'Finalizando servicio...',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            if (_esMultiEquipo) ...[
              const SizedBox(height: 8),
              Text(
                'Procesando ${_equipos.length} equipos...',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  _buildLoadingStep(Icons.photo, 'Subiendo evidencias...'),
                  _buildLoadingStep(Icons.gesture, 'Subiendo firmas...'),
                  _buildLoadingStep(Icons.picture_as_pdf, 'Generando PDF...'),
                  _buildLoadingStep(Icons.email, 'Enviando notificación...'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Este proceso puede tardar hasta 30 segundos.\nNo cierres la aplicación.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          ],
        ),
      ),
    );

    try {
      final db = ref.read(databaseProvider);
      final orden = await (db.select(db.ordenes)
            ..where((o) => o.idLocal.equals(widget.idOrdenLocal)))
          .getSingleOrNull();

      if (orden == null || orden.idBackend == null) {
        Navigator.of(context).pop(); // Cerrar loading
        _mostrarError('No se pudo obtener la información de la orden');
        return;
      }

      // Llamar al servicio de sincronización
      // ✅ MULTI-EQUIPOS: El sync_upload_service ahora agrupa por idOrdenEquipo
      final syncService = ref.read(syncUploadServiceProvider);
      final resultado = await syncService.finalizarOrden(
        idOrdenLocal: widget.idOrdenLocal,
        idOrdenBackend: orden.idBackend!,
        observaciones: observaciones,
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        usuarioId: ref.read(authStateProvider).user?.id ?? 1,
        razonFalla: (razonFalla?.trim().isNotEmpty ?? false) ? razonFalla!.trim() : null,
      );

      Navigator.of(context).pop(); // Cerrar loading

      if (resultado.success) {
        if (resultado.guardadoOffline) {
          _mostrarExitoOffline(resultado);
        } else {
          _mostrarExitoOnline(resultado);
        }
      } else {
        _mostrarError(resultado.mensaje);
      }
    } catch (e) {
      Navigator.of(context).pop(); // Cerrar loading
      _mostrarError('Error inesperado: $e');
    }
  }

  Widget _buildLoadingStep(IconData icon, String texto) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.blue.shade700),
          const SizedBox(width: 8),
          Text(
            texto,
            style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
          ),
        ],
      ),
    );
  }

  void _mostrarExitoOnline(SyncUploadResult resultado) {
    final datosRes = resultado.datos;
    
    // ✅ 20-DIC-2025: Soportar ambas estructuras de respuesta
    // Puede venir como datosRes['datos'] (SSE) o datosRes directamente (endpoint tradicional)
    Map<String, dynamic>? datosInternos;
    if (datosRes != null) {
      // Primero intentar 'datos' (estructura SSE y respuesta del servicio)
      if (datosRes['datos'] is Map<String, dynamic>) {
        datosInternos = datosRes['datos'] as Map<String, dynamic>;
      } else {
        // Fallback: los datos podrían estar directamente en datosRes
        datosInternos = datosRes;
      }
    }

    final evidenciasCount = (datosInternos?['evidencias'] as List?)?.length ?? 0;
    final firmasCount = (datosInternos?['firmas'] as List?)?.length ?? 0;
    final pdfGenerado = datosInternos?['documento'] != null;
    final emailEnviado = datosInternos?['email']?['enviado'] == true;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.check_circle, color: Colors.green, size: 28),
            SizedBox(width: 8),
            Flexible(
              child: Text(
                '¡Servicio Completado!',
                style: TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _esMultiEquipo
                    ? 'El servicio con ${_equipos.length} equipos ha sido finalizado y sincronizado.'
                    : 'El servicio ha sido finalizado y sincronizado correctamente.',
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              _buildResultadoItem(Icons.photo, 'Evidencias', '$evidenciasCount'),
              _buildResultadoItem(Icons.gesture, 'Firmas', '$firmasCount'),
              if (pdfGenerado)
                _buildResultadoItem(Icons.picture_as_pdf, 'PDF Generado', '✅'),
              if (emailEnviado)
                _buildResultadoItem(Icons.email, 'Email Enviado', '✅'),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop(); // Volver a orden_detalle
              Navigator.of(context).pop(); // Volver a lista de órdenes
            },
            child: const Text('ACEPTAR'),
          ),
        ],
      ),
    );
  }

  void _mostrarExitoOffline(SyncUploadResult resultado) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.cloud_sync, color: Colors.blue, size: 28),
            SizedBox(width: 8),
            Flexible(
              child: Text('Servicio Completado', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green.shade700),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        '¡Servicio finalizado correctamente!',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
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
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade600),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'El servidor está generando el PDF y enviando el email.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _buildResultadoItem(Icons.save, 'Datos locales', 'Guardados ✅'),
              _buildResultadoItem(Icons.cloud_upload, 'Subida al servidor', 'En proceso 🔄'),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('CONTINUAR'),
          ),
        ],
      ),
    );
  }

  Widget _buildResultadoItem(IconData icon, String label, String valor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.blue),
          const SizedBox(width: 8),
          Text(label),
          const Spacer(),
          Text(valor, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _mostrarError(String mensaje) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.error, color: Colors.red),
            SizedBox(width: 8),
            Text('Error'),
          ],
        ),
        content: Text(mensaje),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('CERRAR'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _mostrarDialogoFinalizacion();
            },
            child: const Text('REINTENTAR'),
          ),
        ],
      ),
    );
  }
}

/// Helper class para estado de cada equipo
class _EstadoEquipo {
  final String nombreEquipo;
  final int totalActividades;
  final int actividadesCompletadas;
  final int totalMediciones;
  final int medicionesCompletadas;

  _EstadoEquipo({
    required this.nombreEquipo,
    required this.totalActividades,
    required this.actividadesCompletadas,
    required this.totalMediciones,
    required this.medicionesCompletadas,
  });

  bool get estaCompleto =>
      actividadesCompletadas >= totalActividades &&
      medicionesCompletadas >= totalMediciones;

  int get porcentaje {
    final total = totalActividades + totalMediciones;
    if (total == 0) return 100;
    final completados = actividadesCompletadas + medicionesCompletadas;
    return (completados / total * 100).toInt();
  }
}
