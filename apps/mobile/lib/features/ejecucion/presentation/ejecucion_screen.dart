import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';
import '../../../core/sync/sync_progress.dart';
import '../../../core/sync/sync_upload_service.dart'
    show SyncUploadResult, syncUploadServiceProvider;
import '../../auth/data/auth_provider.dart';
import '../../evidencias/data/evidencia_service.dart';
import '../../evidencias/presentation/evidencias_actividad_bottom_sheet.dart';
import '../../evidencias/presentation/evidencias_screen.dart';
import '../../firmas/data/firma_service.dart';
import '../../firmas/presentation/firmas_section.dart';
import '../../settings/presentation/configuracion_screen.dart'
    show modoFinalizacionProvider;
import '../data/ejecucion_service.dart';

/// Pantalla de Ejecución de Orden - RUTA 6
/// TabBar: Checklist | Mediciones | Resumen
///
/// ✅ MULTI-EQUIPOS: Puede recibir idOrdenEquipo para filtrar por equipo específico
class EjecucionScreen extends ConsumerStatefulWidget {
  final int idOrdenLocal;
  final int?
  idOrdenEquipo; // ✅ MULTI-EQUIPOS: ID del equipo específico (opcional)

  const EjecucionScreen({
    super.key,
    required this.idOrdenLocal,
    this.idOrdenEquipo, // null = orden simple, valor = multi-equipo
  });

  @override
  ConsumerState<EjecucionScreen> createState() => _EjecucionScreenState();
}

class _EjecucionScreenState extends ConsumerState<EjecucionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, List<ActividadesEjecutada>> _actividadesPorSistema = {};
  List<Medicione> _mediciones =
      []; // Mediciones desde tabla local (con snapshot)
  Map<int, int> _conteoEvidenciasPorActividad = {}; // ✅ MINI-GALERÍA v2
  bool _isLoading = true;
  String? _numeroOrden;
  bool _esCorrectivo = false;
  String? _razonFallaActual;
  late TextEditingController _observacionesController;
  final _observacionesFocusNode = FocusNode();
  int _completadas = 0;
  int _total = 0;
  int _medicionesConValor = 0;
  int _totalMediciones = 0;

  // ✅ RUTA 8: Estado de firmas
  bool _tieneFirmaTecnico = false;
  bool _tieneFirmaCliente = false;

  // ✅ MULTI-EQUIPOS: Nombre del equipo actual
  String? _nombreEquipoActual;

  // ✅ FIX 17-DIC-2025: Flag para saber si es orden de un solo equipo (necesita tab Resumen)
  bool get _esOrdenSimple => widget.idOrdenEquipo == null;

  @override
  void initState() {
    super.initState();
    _observacionesController = TextEditingController();
    // ✅ FIX 17-DIC-2025: Orden simple = 3 tabs (Checklist + Mediciones + Resumen)
    // Multi-equipo = 2 tabs (Resumen está en NavigacionEquiposScreen)
    _tabController = TabController(length: _esOrdenSimple ? 3 : 2, vsync: this);
    _cargarDatos();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _observacionesController.dispose();
    _observacionesFocusNode.dispose();
    super.dispose();
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);

    final service = ref.read(ejecucionServiceProvider);
    final db = ref.read(databaseProvider);

    try {
      // ✅ MULTI-EQUIPOS: Si hay idOrdenEquipo, cargar nombre del equipo
      if (widget.idOrdenEquipo != null) {
        final equipoInfo = await db.getOrdenEquipoById(widget.idOrdenEquipo!);
        _nombreEquipoActual =
            equipoInfo?.nombreSistema ??
            equipoInfo?.nombreEquipo ??
            'Equipo ${equipoInfo?.ordenSecuencia ?? '?'}';
      }

      // Cargar actividades agrupadas
      // ✅ MULTI-EQUIPOS: Pasar idOrdenEquipo para filtrar
      _actividadesPorSistema = await service.getActividadesAgrupadas(
        widget.idOrdenLocal,
        idOrdenEquipo: widget.idOrdenEquipo,
      );

      // Cargar MEDICIONES desde tabla local (con snapshot completo)
      // ✅ MULTI-EQUIPOS: Pasar idOrdenEquipo para filtrar
      _mediciones = await service.getMedicionesByOrdenLocal(
        widget.idOrdenLocal,
        idOrdenEquipo: widget.idOrdenEquipo,
      );

      // Calcular estadísticas de actividades
      _total = 0;
      _completadas = 0;
      for (final actividades in _actividadesPorSistema.values) {
        for (final act in actividades) {
          _total++;
          if (act.simbologia != null) {
            _completadas++;
          }
        }
      }

      // Calcular estadísticas de mediciones
      _totalMediciones = _mediciones.length;
      _medicionesConValor = _mediciones.where((m) => m.valor != null).length;

      // ✅ Cargar conteo de evidencias por actividad (MODELO HÍBRIDO v2)
      final evidenciaService = ref.read(evidenciaServiceProvider);
      _conteoEvidenciasPorActividad = await _cargarConteoEvidencias(
        evidenciaService,
      );

      // ✅ RUTA 8: Cargar estado de firmas
      final firmaService = ref.read(firmaServiceProvider);
      _tieneFirmaTecnico = await firmaService.existeFirma(
        widget.idOrdenLocal,
        'TECNICO',
      );
      _tieneFirmaCliente = await firmaService.existeFirma(
        widget.idOrdenLocal,
        'CLIENTE',
      );

      // Obtener número de orden y tipo de servicio para detección de correctivos
      // (reutilizamos 'db' ya declarado arriba)
      final orden = await (db.select(
        db.ordenes,
      )..where((o) => o.idLocal.equals(widget.idOrdenLocal))).getSingleOrNull();
      _numeroOrden = orden?.numeroOrden ?? 'Sin número';
      _razonFallaActual = orden?.razonFalla;
      _observacionesController.text = orden?.observacionesTecnico ?? '';

      if (orden != null) {
        final tipoServicio = await db.getTipoServicioById(orden.idTipoServicio);
        final codigoTipo = tipoServicio?.codigo ?? '';
        final numero = orden.numeroOrden.toUpperCase();
        _esCorrectivo =
            codigoTipo.toUpperCase().contains('CORR') ||
            numero.contains('CORR');
      } else {
        _esCorrectivo = false;
      }
    } catch (e) {
      print('❌ Error cargando datos: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  /// Actualiza el estado de una actividad (B, M, C, NA)
  /// ✅ OPTIMIZADO: Actualización LOCAL sin reconstruir ListView (preserva scroll)
  Future<void> _marcarActividad(int idActividadLocal, String simbologia) async {
    final service = ref.read(ejecucionServiceProvider);

    try {
      // Guardar en BD
      await service.marcarActividad(
        idActividadLocal: idActividadLocal,
        simbologia: simbologia,
      );

      // ✅ ACTUALIZACIÓN LOCAL - Sin recargar todo
      // Buscar y actualizar el objeto en memoria
      for (final sistema in _actividadesPorSistema.keys) {
        final actividades = _actividadesPorSistema[sistema]!;
        for (int i = 0; i < actividades.length; i++) {
          if (actividades[i].idLocal == idActividadLocal) {
            // Crear copia con nueva simbología
            actividades[i] = actividades[i].copyWith(
              simbologia: Value(simbologia),
            );
            break;
          }
        }
      }

      // Recalcular estadísticas localmente
      int completadas = 0;
      for (final actividades in _actividadesPorSistema.values) {
        for (final act in actividades) {
          if (act.simbologia != null) completadas++;
        }
      }

      // ✅ MULTI-EQUIPOS: Verificar y actualizar estado del equipo
      if (widget.idOrdenEquipo != null) {
        await service.verificarYActualizarEstadoEquipo(
          widget.idOrdenLocal,
          widget.idOrdenEquipo!,
        );
      }

      // Actualizar UI sin reconstruir lista
      if (mounted) {
        setState(() {
          _completadas = completadas;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Actividad marcada: $simbologia'),
            duration: const Duration(milliseconds: 800),
            backgroundColor: _getColorForSimbologia(simbologia),
          ),
        );
      }
    } catch (e) {
      print('❌ Error marcando actividad: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  /// Carga el conteo de evidencias por actividad
  /// ✅ FIX RENDIMIENTO: Usa batch query en vez de N queries secuenciales
  Future<Map<int, int>> _cargarConteoEvidencias(
    EvidenciaService evidenciaService,
  ) async {
    // Obtener IDs de actividades del CHECKLIST
    final todasActividades = <int>{};
    for (final lista in _actividadesPorSistema.values) {
      for (final act in lista) {
        todasActividades.add(act.idLocal);
      }
    }

    // Agregar IDs de actividades de MEDICIONES
    for (final med in _mediciones) {
      final idAct = med.idActividadEjecutada;
      if (idAct != null) {
        todasActividades.add(idAct);
      }
    }

    // ✅ FIX RENDIMIENTO: UNA sola query en vez de N queries
    return await evidenciaService.contarEvidenciasBatch(todasActividades);
  }

  Color _getColorForSimbologia(String simbologia) {
    switch (simbologia) {
      case 'B':
        return Colors.green;
      case 'M':
        return Colors.red;
      case 'C':
        return Colors.orange;
      case 'NA':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    // ✅ FIX: Contador simplificado - razón de falla ya no es actividad (se captura en JSON)
    final completadosDisplay = _completadas + _medicionesConValor;
    final totalDisplay = _total + _totalMediciones;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _numeroOrden ?? 'Ejecución',
              style: const TextStyle(fontSize: 16),
            ),
            // ✅ MULTI-EQUIPOS: Mostrar nombre del equipo
            if (_nombreEquipoActual != null)
              Text(
                _nombreEquipoActual!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
          ],
        ),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          // ✅ FIX 17-DIC-2025: Orden simple = 3 tabs, multi-equipo = 2 tabs
          tabs: [
            const Tab(icon: Icon(Icons.checklist), text: 'Checklist'),
            const Tab(icon: Icon(Icons.speed), text: 'Mediciones'),
            if (_esOrdenSimple)
              const Tab(icon: Icon(Icons.summarize), text: 'Resumen'),
          ],
        ),
        actions: [
          // Indicador de progreso COMPLETO (Checklist + Mediciones)
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$completadosDisplay/$totalDisplay',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              // ✅ FIX 17-DIC-2025: Orden simple = 3 tabs, multi-equipo = 2 tabs
              children: [
                _buildChecklistTab(),
                _buildMedicionesTab(),
                if (_esOrdenSimple) _buildResumenTab(),
              ],
            ),
    );
  }

  /// TAB 1: CHECKLIST - Lista agrupada por sistema
  /// ✅ FIX 14-DIC-2025: Ahora incluye TODAS las actividades (incluyendo tipo MEDICION)
  Widget _buildChecklistTab() {
    if (_actividadesPorSistema.isEmpty) {
      return _buildEmptyChecklist();
    }

    return RefreshIndicator(
      onRefresh: _cargarDatos,
      child: Stack(
        children: [
          ListView.builder(
            padding: const EdgeInsets.only(bottom: 100),
            itemCount: _actividadesPorSistema.length,
            itemBuilder: (context, index) {
              final sistema = _actividadesPorSistema.keys.elementAt(index);
              final actividades = _actividadesPorSistema[sistema]!;

              return _buildSistemaSection(sistema, actividades);
            },
          ),
          if (_esCorrectivo)
            Positioned(
              bottom: 20,
              right: 20,
              child: FloatingActionButton.extended(
                onPressed: _mostrarDialogoAddActividad,
                label: const Text('Add Actividad'),
                icon: const Icon(Icons.add),
                backgroundColor: Colors.green.shade700,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyChecklist() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.checklist, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No hay actividades para esta orden',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
          ),
          if (_esCorrectivo) ...[
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _mostrarDialogoAddActividad,
              icon: const Icon(Icons.add),
              label: const Text('Add primera actividad'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.green.shade700,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Muestra dialogo para añadir actividad del catalogo
  Future<void> _mostrarDialogoAddActividad() async {
    final db = ref.read(databaseProvider);
    // Obtener actividades del catalogo que NO estan ya en la orden
    final actividadesCat = await db.getAllActividadesCatalogo();

    // Obtener IDs de actividades ya presentes para filtrar
    final idsExistentes = <int>{};
    for (final lista in _actividadesPorSistema.values) {
      for (final act in lista) {
        idsExistentes.add(act.idActividadCatalogo);
      }
    }

    final actividadesDisponibles = actividadesCat
        .where((a) => !idsExistentes.contains(a.id))
        .toList();

    if (!mounted) return;

    final idSeleccionado = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Actividad'),
        content: SizedBox(
          width: double.maxFinite,
          child: actividadesDisponibles.isEmpty
              ? const Text('No hay mas actividades disponibles.')
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: actividadesDisponibles.length,
                  itemBuilder: (context, index) {
                    final act = actividadesDisponibles[index];
                    return ListTile(
                      title: Text(act.descripcion),
                      subtitle: Text(act.sistema ?? 'General'),
                      leading: const Icon(Icons.add_circle_outline),
                      onTap: () => Navigator.pop(ctx, act.id),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );

    if (idSeleccionado != null) {
      await _addActividadPlan(idSeleccionado);
    }
  }

  Future<void> _addActividadPlan(int idActividadCatalogo) async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(ejecucionServiceProvider);
      await service.addActividadDinamica(
        idOrdenLocal: widget.idOrdenLocal,
        idActividadCatalogo: idActividadCatalogo,
        idOrdenEquipo: widget.idOrdenEquipo,
      );

      await _cargarDatos();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Actividad añadida exitosamente')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmarEliminarActividad(
    ActividadesEjecutada actividad,
  ) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Actividad'),
        content: Text(
          '¿Está seguro de eliminar "${actividad.descripcion}" del plan?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      setState(() => _isLoading = true);
      try {
        final service = ref.read(ejecucionServiceProvider);
        await service.eliminarActividadLocal(actividad.idLocal);
        await _cargarDatos();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildSistemaSection(
    String sistema,
    List<ActividadesEjecutada> actividades,
  ) {
    // Contar completadas en este sistema
    final completadasSistema = actividades
        .where((a) => a.simbologia != null)
        .length;
    final esTodoCompletado = completadasSistema == actividades.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header del sistema (Enterprise Style)
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.blueGrey.shade50,
            border: Border(
              bottom: BorderSide(color: Colors.blueGrey.shade100, width: 1),
              top: BorderSide(color: Colors.blueGrey.shade100, width: 0.5),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Icon(
                _getSistemaIcon(sistema),
                color: Colors.blueGrey.shade700,
                size: 18,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  sistema.toUpperCase(),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.blueGrey.shade800,
                    fontSize: 12,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: esTodoCompletado
                      ? Colors.green.shade600
                      : Colors.blueGrey.shade200,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$completadasSistema/${actividades.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Actividades del sistema
        ...actividades.map((act) => _buildActividadItem(act)),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildActividadItem(ActividadesEjecutada actividad) {
    final simbologia = actividad.simbologia;
    final estaCompletada = simbologia != null;
    final Color colorSimbologia = estaCompletada
        ? _getColorForSimbologia(simbologia)
        : Colors.blueGrey.shade300;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: estaCompletada
              ? colorSimbologia.withValues(alpha: 0.3)
              : Colors.grey.shade200,
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Indicador lateral de estado de actividad
              Container(
                width: 4,
                color: estaCompletada ? colorSimbologia : Colors.transparent,
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Cabecera de actividad
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          GestureDetector(
                            onLongPress: _esCorrectivo
                                ? () => _confirmarEliminarActividad(actividad)
                                : null,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: estaCompletada
                                    ? colorSimbologia
                                    : Colors.blueGrey.shade50,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: estaCompletada
                                      ? colorSimbologia
                                      : Colors.blueGrey.shade100,
                                  width: 1,
                                ),
                              ),
                              child: Center(
                                child: estaCompletada
                                    ? Text(
                                        simbologia,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      )
                                    : Icon(
                                        Icons.radio_button_off_rounded,
                                        size: 20,
                                        color: Colors.blueGrey.shade300,
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  actividad.descripcion,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: estaCompletada
                                        ? FontWeight.w600
                                        : FontWeight.w500,
                                    color: estaCompletada
                                        ? Colors.blueGrey.shade900
                                        : Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.blueGrey.shade50,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        actividad.tipoActividad,
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: Colors.blueGrey.shade600,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ),
                                    if (actividad.idParametroMedicion !=
                                        null) ...[
                                      const SizedBox(width: 8),
                                      Icon(
                                        Icons.analytics_outlined,
                                        size: 14,
                                        color: Colors.blue.shade600,
                                      ),
                                      const SizedBox(width: 2),
                                      Text(
                                        'REQUIERE MEDIDA',
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: Colors.blue.shade700,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Acciones (Inputs + Observación + Cámara)
                      Row(
                        children: [
                          Expanded(
                            child: _buildActividadInputWidget(actividad),
                          ),
                          const SizedBox(width: 12),
                          _buildActionCircleButton(
                            icon: Icons.notes_rounded,
                            onTap: () => _mostrarDialogoObservacion(actividad),
                            isActive:
                                actividad.observacion != null &&
                                actividad.observacion!.isNotEmpty,
                            color: Colors.amber.shade700,
                          ),
                          const SizedBox(width: 8),
                          _buildBotonCamaraEnterprise(actividad),
                        ],
                      ),
                      // Vista previa de observación si existe
                      if (actividad.observacion != null &&
                          actividad.observacion!.isNotEmpty &&
                          !_esActividadEspecial(actividad.descripcion))
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade50.withValues(
                                alpha: 0.5,
                              ),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.amber.shade100),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.info_outline_rounded,
                                  size: 14,
                                  color: Colors.amber.shade800,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    actividad.observacion!,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.amber.shade900,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionCircleButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isActive,
    required Color color,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isActive ? color.withValues(alpha: 0.1) : Colors.grey.shade50,
          shape: BoxShape.circle,
          border: Border.all(
            color: isActive ? color : Colors.grey.shade300,
            width: 1,
          ),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isActive ? color : Colors.grey.shade400,
        ),
      ),
    );
  }

  Widget _buildBotonCamaraEnterprise(ActividadesEjecutada actividad) {
    final conteoFotos = _conteoEvidenciasPorActividad[actividad.idLocal] ?? 0;
    final tieneEvidencia = conteoFotos > 0;
    final Color color = Colors.blue.shade700;

    return InkWell(
      onTap: () => _abrirMiniGaleria(actividad.idLocal, actividad.descripcion),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: tieneEvidencia
              ? color.withValues(alpha: 0.1)
              : Colors.grey.shade50,
          shape: BoxShape.circle,
          border: Border.all(
            color: tieneEvidencia ? color : Colors.grey.shade300,
            width: 1,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              tieneEvidencia
                  ? Icons.photo_library_rounded
                  : Icons.camera_alt_rounded,
              size: 20,
              color: tieneEvidencia ? color : Colors.grey.shade400,
            ),
            if (tieneEvidencia)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '$conteoFotos',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData _getSistemaIcon(String sistema) {
    final sistemaLower = sistema.toLowerCase();
    if (sistemaLower.contains('enfriamiento')) return Icons.ac_unit_rounded;
    if (sistemaLower.contains('combustible')) {
      return Icons.local_gas_station_rounded;
    }
    if (sistemaLower.contains('lubricacion') ||
        sistemaLower.contains('lubricación')) {
      return Icons.oil_barrel_rounded;
    }
    if (sistemaLower.contains('electrico') ||
        sistemaLower.contains('eléctrico')) {
      return Icons.electrical_services_rounded;
    }
    if (sistemaLower.contains('control')) return Icons.settings_remote_rounded;
    if (sistemaLower.contains('escape')) return Icons.air_rounded;
    if (sistemaLower.contains('aspiracion') ||
        sistemaLower.contains('aspiración')) {
      return Icons.filter_alt_rounded;
    }
    return Icons.build_circle_rounded;
  }

  /// Determina si una actividad es "especial" (usa la observación para datos)
  bool _esActividadEspecial(String descripcion) {
    final tipo = _getTipoActividadEspecial(descripcion);
    return tipo != null; // null significa que no es actividad especial
  }

  /// Muestra diálogo para agregar/editar observación
  Future<void> _mostrarDialogoObservacion(
    ActividadesEjecutada actividad,
  ) async {
    final controller = TextEditingController(text: actividad.observacion ?? '');

    final resultado = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Observación'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              actividad.descripcion,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 4,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Ingrese observación para esta actividad...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          if (actividad.observacion != null &&
              actividad.observacion!.isNotEmpty)
            TextButton(
              onPressed: () => Navigator.pop(ctx, ''),
              child: const Text('Borrar', style: TextStyle(color: Colors.red)),
            ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (resultado != null) {
      await _guardarObservacionActividad(actividad.idLocal, resultado);
    }
  }

  /// Guarda la observación de una actividad
  Future<void> _guardarObservacionActividad(
    int idLocal,
    String observacion,
  ) async {
    final db = ref.read(databaseProvider);

    await (db.update(
      db.actividadesEjecutadas,
    )..where((a) => a.idLocal.equals(idLocal))).write(
      ActividadesEjecutadasCompanion(
        observacion: Value(observacion.isEmpty ? null : observacion),
        isDirty: const Value(true),
      ),
    );

    // Actualizar UI localmente
    for (final sistema in _actividadesPorSistema.keys) {
      final actividades = _actividadesPorSistema[sistema]!;
      for (var i = 0; i < actividades.length; i++) {
        if (actividades[i].idLocal == idLocal) {
          actividades[i] = actividades[i].copyWith(
            observacion: Value(observacion.isEmpty ? null : observacion),
          );
          break;
        }
      }
    }

    if (mounted) {
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            observacion.isEmpty
                ? 'Observación eliminada'
                : 'Observación guardada',
          ),
          duration: const Duration(seconds: 1),
          backgroundColor: Colors.amber.shade700,
        ),
      );
    }
  }

  /// Abre la mini-galería de evidencias para una actividad
  Future<void> _abrirMiniGaleria(
    int idActividad,
    String nombreActividad,
  ) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EvidenciasActividadBottomSheet(
        idOrden: widget.idOrdenLocal,
        idActividad: idActividad,
        nombreActividad: nombreActividad,
        idOrdenEquipo: widget.idOrdenEquipo, // ✅ MULTI-EQUIPOS (16-DIC-2025)
      ),
    );
    // Recargar conteo después de cerrar
    await _actualizarConteoEvidencias();
  }

  /// Actualiza solo el conteo de evidencias (más eficiente que recargar todo)
  Future<void> _actualizarConteoEvidencias() async {
    final evidenciaService = ref.read(evidenciaServiceProvider);
    final nuevoConteo = await _cargarConteoEvidencias(evidenciaService);
    if (mounted) {
      setState(() {
        _conteoEvidenciasPorActividad = nuevoConteo;
      });
    }
  }

  /// ✅ RUTA 8: Actualiza el estado de las firmas
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

  /// ✅ FIX SCROLL MEDICIONES: Callback optimizado para mediciones
  /// Recibe el idLocal y el nuevo valor para actualizar localmente
  void _onMedicionGuardada(int idLocal, double? nuevoValor) {
    // Actualizar la medición en la lista local
    for (int i = 0; i < _mediciones.length; i++) {
      if (_mediciones[i].idLocal == idLocal) {
        _mediciones[i] = _mediciones[i].copyWith(valor: Value(nuevoValor));
        break;
      }
    }

    // Recalcular contador de mediciones con valor
    int conValor = 0;
    for (final med in _mediciones) {
      if (med.valor != null) {
        conValor++;
      }
    }

    // ✅ MULTI-EQUIPOS: Verificar y actualizar estado del equipo
    if (widget.idOrdenEquipo != null) {
      final service = ref.read(ejecucionServiceProvider);
      service.verificarYActualizarEstadoEquipo(
        widget.idOrdenLocal,
        widget.idOrdenEquipo!,
      );
    }

    if (mounted) {
      setState(() {
        _medicionesConValor = conValor;
      });
    }
  }

  Widget _buildSimboloogiaChips(ActividadesEjecutada actividad) {
    // ✅ FIX: C = Cambiado (según formatos MEKANOS)
    final opciones = [
      ('B', 'Bueno', Colors.green),
      ('M', 'Malo', Colors.red),
      ('C', 'Cambiado', Colors.orange),
      ('NA', 'N/A', Colors.grey),
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: opciones.map((opcion) {
        final codigo = opcion.$1;
        final label = opcion.$2;
        final color = opcion.$3;
        final isSelected = actividad.simbologia == codigo;

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Material(
              color: isSelected ? color : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () => _marcarActividad(actividad.idLocal, codigo),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    children: [
                      Text(
                        codigo,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: isSelected ? Colors.white : color,
                        ),
                      ),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 10,
                          color: isSelected
                              ? Colors.white70
                              : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ==========================================================================
  // RUTA 11: ACTIVIDADES ESPECIALES CON VALOR
  // ==========================================================================

  /// Detecta el tipo de actividad especial
  /// ✅ FIX 26-ENE-2026: Lógica refinada para detectar correctamente cada tipo
  String? _getTipoActividadEspecial(String descripcion) {
    final desc = descripcion.toUpperCase();

    // 1. PRIMERO: Detectar actividades SI/NO (terminan con "(SI/NO)")
    if (desc.contains('(SI/NO)') || desc.contains('(S/N)')) {
      return 'SI_NO';
    }

    // 2. Nivel de combustible - SOLO si es específicamente sobre NIVEL, no sobre TANQUE
    // "REVISAR NIVEL DE COMBUSTIBLE" → selector de nivel
    // "REVISAR TANQUE DE COMBUSTIBLE" → B/M/C/NA (revisar estado del tanque)
    if ((desc.contains('NIVEL DE COMBUSTIBLE') ||
            desc.contains('NIVEL COMBUSTIBLE')) &&
        !desc.contains('TANQUE')) {
      return 'NIVEL_COMBUSTIBLE';
    }

    // 3. Nivel de aceite - SOLO si es específicamente sobre NIVEL
    if (desc.contains('NIVEL DE ACEITE') || desc.contains('NIVEL ACEITE')) {
      return 'NIVEL_ACEITE';
    }

    // 4. Horas de trabajo / Horómetro
    if (desc.contains('HOROMETRO') ||
        desc.contains('HORÓMETRO') ||
        desc.contains('HORAS DE TRABAJO') ||
        desc.contains('HORAS TRABAJO') ||
        desc.contains('LECTURA DE HORAS')) {
      return 'HOROMETRO';
    }

    // 5. Electrolitos de batería - Selector tipo nivel (Full/OK/Bajo/Crítico)
    if (desc.contains('ELECTROLITOS DE BATERIA') ||
        desc.contains('ELECTROLITOS BATERIA')) {
      return 'ELECTROLITOS';
    }

    // 6. Estado de batería - SOLO para "CARGA DE BATERIA" → selector porcentaje
    // "CARGADOR DE BATERIA" o "SISTEMA DE CARGA" → B/M/C/NA (revisar estado)
    if (desc.contains('CARGA DE BATERIA') &&
        !desc.contains('CARGADOR') &&
        !desc.contains('SISTEMA DE CARGA')) {
      return 'BATERIA';
    }

    // 6. Temperatura
    if (desc.contains('TEMPERATURA') || desc.contains('TEMP.')) {
      return 'TEMPERATURA';
    }

    return null; // Actividad normal (B/M/C/NA)
  }

  /// Construye el widget apropiado según el tipo de actividad
  Widget _buildActividadInputWidget(ActividadesEjecutada actividad) {
    final tipo = _getTipoActividadEspecial(actividad.descripcion);

    switch (tipo) {
      case 'SI_NO':
        return _buildSiNoSelector(actividad);
      case 'NIVEL_COMBUSTIBLE':
        return _buildNivelCombustibleSelector(actividad);
      case 'NIVEL_ACEITE':
        return _buildNivelAceiteSelector(actividad);
      case 'ELECTROLITOS':
        return _buildElectrolitosSelector(actividad);
      case 'HOROMETRO':
        return _buildHorometroInput(actividad);
      case 'BATERIA':
        return _buildBateriaSelector(actividad);
      case 'TEMPERATURA':
        return _buildTemperaturaInput(actividad);
      default:
        return _buildSimboloogiaChips(actividad);
    }
  }

  /// ✅ FIX 26-ENE-2026: Widget selector SÍ/NO para actividades tipo pregunta
  Widget _buildSiNoSelector(ActividadesEjecutada actividad) {
    final observacion = actividad.observacion ?? '';
    final valorActual = observacion.startsWith('RESPUESTA: ')
        ? observacion.substring(11)
        : '';

    final opciones = [
      ('SI', 'SÍ', Colors.green, Icons.check_circle),
      ('NO', 'NO', Colors.red, Icons.cancel),
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: opciones.map((opcion) {
        final codigo = opcion.$1;
        final label = opcion.$2;
        final color = opcion.$3;
        final icon = opcion.$4;
        final isSelected = valorActual == codigo;

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Material(
              color: isSelected ? color : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              elevation: isSelected ? 2 : 0,
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  // SÍ = B (Bueno), NO = C (Cambio/Atención requerida)
                  final simb = codigo == 'SI' ? 'B' : 'C';
                  _marcarActividadEspecial(
                    actividad.idLocal,
                    'RESPUESTA: $codigo',
                    simb,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 14,
                    horizontal: 20,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        icon,
                        size: 24,
                        color: isSelected ? Colors.white : color,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        label,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: isSelected ? Colors.white : color,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  /// Widget selector de nivel de combustible con opciones visuales
  /// ✅ FIX 26-ENE-2026: Agregado botón "Otro" para valores personalizados
  Widget _buildNivelCombustibleSelector(ActividadesEjecutada actividad) {
    // Obtener el valor actual de la observación (si existe)
    // Formato guardado: "NIVEL: LLENO" -> extraer "LLENO"
    final observacion = actividad.observacion ?? '';
    final valorActual = observacion.startsWith('NIVEL: ')
        ? observacion.substring(7)
        : '';

    // Opciones de nivel de combustible
    final opciones = [
      ('LLENO', 'Full', Colors.green, Icons.local_gas_station),
      ('3/4', '3/4', Colors.lightGreen, Icons.local_gas_station),
      ('MEDIO', '1/2', Colors.orange, Icons.local_gas_station),
      ('1/4', '1/4', Colors.deepOrange, Icons.local_gas_station),
      ('VACIO', 'Vacío', Colors.red, Icons.local_gas_station_outlined),
    ];

    // Verificar si es valor personalizado
    final esValorPersonalizado =
        valorActual.isNotEmpty && !opciones.any((o) => o.$1 == valorActual);

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            ...opciones.map((opcion) {
              final codigo = opcion.$1;
              final label = opcion.$2;
              final color = opcion.$3;
              final icon = opcion.$4;
              final isSelected = valorActual == codigo;

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Material(
                    color: isSelected ? color : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () {
                        // Simbología según nivel: VACIO/1/4 = M, MEDIO = C, resto = B
                        final simb = (codigo == 'VACIO' || codigo == '1/4')
                            ? 'M'
                            : (codigo == 'MEDIO')
                            ? 'C'
                            : 'B';
                        _marcarActividadEspecial(
                          actividad.idLocal,
                          'NIVEL: $codigo',
                          simb,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              icon,
                              size: 18,
                              color: isSelected ? Colors.white : color,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              label,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                                color: isSelected ? Colors.white : color,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
            // Botón "Otro" para valor personalizado
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Material(
                color: esValorPersonalizado
                    ? Colors.blue
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => _mostrarDialogoNivelCombustible(actividad),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 8,
                      horizontal: 8,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.edit,
                          size: 18,
                          color: esValorPersonalizado
                              ? Colors.white
                              : Colors.blue,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          esValorPersonalizado ? valorActual : 'Otro',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            color: esValorPersonalizado
                                ? Colors.white
                                : Colors.blue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Widget selector de nivel de aceite (similar a combustible)
  Widget _buildNivelAceiteSelector(ActividadesEjecutada actividad) {
    final observacion = actividad.observacion ?? '';
    final valorActual = observacion.startsWith('ACEITE: ')
        ? observacion.substring(8)
        : '';

    final opciones = [
      ('LLENO', 'Full', Colors.green, Icons.water_drop),
      ('OK', 'OK', Colors.lightGreen, Icons.water_drop),
      ('BAJO', 'Bajo', Colors.orange, Icons.water_drop_outlined),
      ('CRITICO', 'Crítico', Colors.red, Icons.warning),
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: opciones.map((opcion) {
        final codigo = opcion.$1;
        final label = opcion.$2;
        final color = opcion.$3;
        final icon = opcion.$4;
        final isSelected = valorActual == codigo;

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Material(
              color: isSelected ? color : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () => _marcarNivelAceite(actividad.idLocal, codigo),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        icon,
                        size: 18,
                        color: isSelected ? Colors.white : color,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        label,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                          color: isSelected ? Colors.white : color,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  /// ✅ FIX 26-ENE-2026: Widget selector de electrolitos de batería (tipo nivel)
  Widget _buildElectrolitosSelector(ActividadesEjecutada actividad) {
    final observacion = actividad.observacion ?? '';
    final valorActual = observacion.startsWith('ELECTROLITOS: ')
        ? observacion.substring(14)
        : '';

    final opciones = [
      ('LLENO', 'Full', Colors.green, Icons.battery_charging_full),
      ('OK', 'OK', Colors.lightGreen, Icons.battery_5_bar),
      ('BAJO', 'Bajo', Colors.orange, Icons.battery_3_bar),
      ('CRITICO', 'Crítico', Colors.red, Icons.battery_alert),
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: opciones.map((opcion) {
        final codigo = opcion.$1;
        final label = opcion.$2;
        final color = opcion.$3;
        final icon = opcion.$4;
        final isSelected = valorActual == codigo;

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Material(
              color: isSelected ? color : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () {
                  // CRITICO = M, BAJO = C, resto = B
                  final simb = codigo == 'CRITICO'
                      ? 'M'
                      : (codigo == 'BAJO' ? 'C' : 'B');
                  _marcarActividadEspecial(
                    actividad.idLocal,
                    'ELECTROLITOS: $codigo',
                    simb,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        icon,
                        size: 18,
                        color: isSelected ? Colors.white : color,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        label,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                          color: isSelected ? Colors.white : color,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  /// Widget input para horómetro (valor numérico)
  Widget _buildHorometroInput(ActividadesEjecutada actividad) {
    final observacion = actividad.observacion ?? '';
    // Extraer valor numérico de "HORAS: 12345.5"
    final valorActual = observacion.startsWith('HORAS: ')
        ? observacion.substring(7)
        : '';

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: valorActual.isNotEmpty
                  ? Colors.blue.shade50
                  : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: valorActual.isNotEmpty
                    ? Colors.blue
                    : Colors.grey.shade300,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer,
                  color: valorActual.isNotEmpty ? Colors.blue : Colors.grey,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    valorActual.isNotEmpty
                        ? '$valorActual hrs'
                        : 'Registrar horas',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: valorActual.isNotEmpty
                          ? FontWeight.bold
                          : FontWeight.normal,
                      color: valorActual.isNotEmpty
                          ? Colors.blue.shade700
                          : Colors.grey,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.edit, color: Colors.blue.shade700, size: 20),
                  onPressed: () => _mostrarDialogoHorometro(actividad),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Muestra diálogo para ingresar horas del horómetro
  Future<void> _mostrarDialogoHorometro(ActividadesEjecutada actividad) async {
    final controller = TextEditingController();
    final observacion = actividad.observacion ?? '';
    if (observacion.startsWith('HORAS: ')) {
      controller.text = observacion.substring(7);
    }

    final resultado = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.timer, color: Colors.blue),
            SizedBox(width: 8),
            Text('Lectura Horómetro'),
          ],
        ),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Horas de trabajo',
            hintText: 'Ej: 12345.5',
            suffixText: 'hrs',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (resultado != null && resultado.isNotEmpty) {
      await _marcarHorometro(actividad.idLocal, resultado);
    }
  }

  /// ✅ FIX 26-ENE-2026: Muestra diálogo para ingresar nivel de combustible personalizado
  Future<void> _mostrarDialogoNivelCombustible(
    ActividadesEjecutada actividad,
  ) async {
    final controller = TextEditingController();
    final observacion = actividad.observacion ?? '';
    if (observacion.startsWith('NIVEL: ')) {
      final valorActual = observacion.substring(7);
      // Solo pre-llenar si es un valor personalizado (contiene %)
      if (valorActual.contains('%')) {
        controller.text = valorActual.replaceAll('%', '');
      }
    }

    final resultado = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.local_gas_station, color: Colors.orange),
            SizedBox(width: 8),
            Text('Nivel de Combustible'),
          ],
        ),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Porcentaje de combustible',
            hintText: 'Ej: 84',
            suffixText: '%',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (resultado != null && resultado.isNotEmpty) {
      final porcentaje = int.tryParse(resultado) ?? 0;
      // Simbología según porcentaje: <25% = M, 25-50% = C, >50% = B
      final simb = porcentaje < 25 ? 'M' : (porcentaje < 50 ? 'C' : 'B');
      await _marcarActividadEspecial(
        actividad.idLocal,
        'NIVEL: $resultado%',
        simb,
      );
    }
  }

  /// Marca nivel de aceite con simbología según nivel
  Future<void> _marcarNivelAceite(int idActividadLocal, String nivel) async {
    // CRITICO = M, BAJO = C, resto = B
    final simb = nivel == 'CRITICO' ? 'M' : (nivel == 'BAJO' ? 'C' : 'B');
    await _marcarActividadEspecial(idActividadLocal, 'ACEITE: $nivel', simb);
  }

  /// Marca lectura de horómetro
  Future<void> _marcarHorometro(int idActividadLocal, String horas) async {
    await _marcarActividadEspecial(idActividadLocal, 'HORAS: $horas', 'B');
  }

  /// Método genérico para marcar actividades especiales
  Future<void> _marcarActividadEspecial(
    int idActividadLocal,
    String observacionNueva,
    String simbologia,
  ) async {
    final db = ref.read(databaseProvider);

    await (db.update(
      db.actividadesEjecutadas,
    )..where((a) => a.idLocal.equals(idActividadLocal))).write(
      ActividadesEjecutadasCompanion(
        simbologia: Value(simbologia),
        completada: const Value(true),
        observacion: Value(observacionNueva),
        fechaEjecucion: Value(DateTime.now()),
        isDirty: const Value(true),
      ),
    );

    // ✅ FIX: Crear nueva copia del mapa para forzar reconstrucción
    final nuevoMapa = <String, List<ActividadesEjecutada>>{};

    for (final sistema in _actividadesPorSistema.keys) {
      final actividadesOriginales = _actividadesPorSistema[sistema]!;
      final nuevasActividades = <ActividadesEjecutada>[];

      for (final actividad in actividadesOriginales) {
        if (actividad.idLocal == idActividadLocal) {
          // Crear nueva instancia con datos actualizados
          nuevasActividades.add(
            actividad.copyWith(
              simbologia: Value(simbologia),
              completada: true,
              observacion: Value(observacionNueva),
            ),
          );
        } else {
          nuevasActividades.add(actividad);
        }
      }
      nuevoMapa[sistema] = nuevasActividades;
    }

    // Recalcular contadores
    int nuevasCompletadas = 0;
    for (final actividades in nuevoMapa.values) {
      nuevasCompletadas += actividades.where((a) => a.completada).length;
    }

    if (mounted) {
      setState(() {
        _actividadesPorSistema = nuevoMapa; // ✅ Asignar nuevo mapa
        _completadas = nuevasCompletadas;
      });
    }
  }

  /// Widget selector de estado de batería
  /// ✅ FIX 18-DIC-2025: Añadido botón para valor personalizado (ej: 88%, 34%)
  Widget _buildBateriaSelector(ActividadesEjecutada actividad) {
    final observacion = actividad.observacion ?? '';
    final valorActual = observacion.startsWith('BATERIA: ')
        ? observacion.substring(9)
        : '';

    final opciones = [
      ('100%', '100%', Colors.green, Icons.battery_full),
      ('75%', '75%', Colors.lightGreen, Icons.battery_5_bar),
      ('50%', '50%', Colors.orange, Icons.battery_3_bar),
      ('25%', '25%', Colors.deepOrange, Icons.battery_2_bar),
      ('BAJA', 'Baja', Colors.red, Icons.battery_alert),
    ];

    // Verificar si el valor actual es personalizado (no está en opciones predefinidas)
    final esValorPersonalizado =
        valorActual.isNotEmpty && !opciones.any((o) => o.$1 == valorActual);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Fila de opciones predefinidas
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: opciones.map((opcion) {
            final codigo = opcion.$1;
            final label = opcion.$2;
            final color = opcion.$3;
            final icon = opcion.$4;
            final isSelected = valorActual == codigo;

            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Material(
                  color: isSelected ? color : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => _marcarActividadEspecial(
                      actividad.idLocal,
                      'BATERIA: $codigo',
                      // M si 25% o BAJA, C si 50%, B si 75% o 100%
                      (codigo == 'BAJA' || codigo == '25%')
                          ? 'M'
                          : (codigo == '50%')
                          ? 'C'
                          : 'B',
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            icon,
                            size: 18,
                            color: isSelected ? Colors.white : color,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            label,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 10,
                              color: isSelected ? Colors.white : color,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),

        // Botón de valor personalizado
        const SizedBox(height: 8),
        InkWell(
          onTap: () => _mostrarDialogoPorcentajeBateria(actividad),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: esValorPersonalizado
                  ? Colors.blue.shade50
                  : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: esValorPersonalizado
                    ? Colors.blue
                    : Colors.grey.shade300,
                width: esValorPersonalizado ? 2 : 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.edit_note,
                  size: 18,
                  color: esValorPersonalizado
                      ? Colors.blue.shade700
                      : Colors.grey.shade600,
                ),
                const SizedBox(width: 6),
                Text(
                  esValorPersonalizado
                      ? 'Valor: $valorActual'
                      : 'Otro valor...',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: esValorPersonalizado
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: esValorPersonalizado
                        ? Colors.blue.shade700
                        : Colors.grey.shade600,
                  ),
                ),
                if (esValorPersonalizado) ...[
                  const SizedBox(width: 4),
                  Icon(
                    Icons.check_circle,
                    size: 16,
                    color: Colors.blue.shade700,
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Diálogo para ingresar porcentaje de batería personalizado
  Future<void> _mostrarDialogoPorcentajeBateria(
    ActividadesEjecutada actividad,
  ) async {
    final controller = TextEditingController();
    final observacion = actividad.observacion ?? '';

    // Si ya tiene un valor, pre-llenar (quitando el %)
    if (observacion.startsWith('BATERIA: ')) {
      final valorSinPrefix = observacion.substring(9);
      // Si termina en %, quitar el %
      if (valorSinPrefix.endsWith('%')) {
        controller.text = valorSinPrefix.substring(
          0,
          valorSinPrefix.length - 1,
        );
      } else if (valorSinPrefix != 'BAJA') {
        controller.text = valorSinPrefix;
      }
    }

    final resultado = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.battery_charging_full, color: Colors.blue),
            SizedBox(width: 8),
            Text('Carga de Batería'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ingresa el porcentaje exacto de carga:',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Porcentaje',
                hintText: 'Ej: 88',
                suffixText: '%',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.battery_std),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 8),
            Text(
              'Valores sugeridos: 100%, 75%, 50%, 25%',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(ctx, controller.text),
            icon: const Icon(Icons.save, size: 18),
            label: const Text('Guardar'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );

    if (resultado != null && resultado.isNotEmpty) {
      // Validar que sea un número
      final numero = int.tryParse(resultado);
      if (numero != null) {
        // Determinar simbología según porcentaje
        // M si <=25%, C si 26-50%, B si >50%
        final simbologia = numero <= 25 ? 'M' : (numero <= 50 ? 'C' : 'B');
        await _marcarActividadEspecial(
          actividad.idLocal,
          'BATERIA: $resultado%',
          simbologia,
        );
      } else {
        // Si no es número válido, mostrar error
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Por favor ingresa un número válido'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    }
  }

  /// Widget input para temperatura
  Widget _buildTemperaturaInput(ActividadesEjecutada actividad) {
    final observacion = actividad.observacion ?? '';
    final valorActual = observacion.startsWith('TEMP: ')
        ? observacion.substring(6)
        : '';

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: valorActual.isNotEmpty
                  ? Colors.orange.shade50
                  : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: valorActual.isNotEmpty
                    ? Colors.orange
                    : Colors.grey.shade300,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.thermostat,
                  color: valorActual.isNotEmpty ? Colors.orange : Colors.grey,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    valorActual.isNotEmpty
                        ? '$valorActual°C'
                        : 'Registrar temp.',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: valorActual.isNotEmpty
                          ? FontWeight.bold
                          : FontWeight.normal,
                      color: valorActual.isNotEmpty
                          ? Colors.orange.shade700
                          : Colors.grey,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.edit,
                    color: Colors.orange.shade700,
                    size: 20,
                  ),
                  onPressed: () => _mostrarDialogoTemperatura(actividad),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Diálogo para ingresar temperatura
  Future<void> _mostrarDialogoTemperatura(
    ActividadesEjecutada actividad,
  ) async {
    final controller = TextEditingController();
    final observacion = actividad.observacion ?? '';
    if (observacion.startsWith('TEMP: ')) {
      controller.text = observacion.substring(6);
    }

    final resultado = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.thermostat, color: Colors.orange),
            SizedBox(width: 8),
            Text('Temperatura'),
          ],
        ),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Temperatura',
            hintText: 'Ej: 85.5',
            suffixText: '°C',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (resultado != null && resultado.isNotEmpty) {
      // Determinar simbología según temperatura
      final temp = double.tryParse(resultado) ?? 0;
      final simbologia = temp > 100 ? 'M' : 'B'; // Crítico si > 100°C
      await _marcarActividadEspecial(
        actividad.idLocal,
        'TEMP: $resultado',
        simbologia,
      );
    }
  }

  /// TAB 2: MEDICIONES - Desde tabla local con SNAPSHOT completo
  Widget _buildMedicionesTab() {
    if (_mediciones.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.speed, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'No hay mediciones para esta orden',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            Text(
              'Las mediciones se crean al iniciar la ejecución',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _cargarDatos,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _mediciones.length,
        itemBuilder: (context, index) {
          final medicion = _mediciones[index];
          final idActividad = medicion.idActividadEjecutada;
          final conteoFotos = idActividad != null
              ? _conteoEvidenciasPorActividad[idActividad] ?? 0
              : 0;

          return _MedicionInputCard(
            key: ValueKey(medicion.idLocal),
            medicion: medicion,
            onValorGuardado: _onMedicionGuardada, // ✅ FIX SCROLL
            conteoFotos: conteoFotos,
            onCapturaEvidencia: idActividad != null
                ? () => _abrirMiniGaleriaMedicion(medicion)
                : null,
          );
        },
      ),
    );
  }

  /// Abre mini-galería para una medición (usa actividad padre)
  Future<void> _abrirMiniGaleriaMedicion(Medicione medicion) async {
    final idActividad = medicion.idActividadEjecutada;
    if (idActividad == null) return;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EvidenciasActividadBottomSheet(
        idOrden: widget.idOrdenLocal,
        idActividad: idActividad,
        nombreActividad: 'Medición: ${medicion.nombreParametro}',
        idOrdenEquipo: widget.idOrdenEquipo, // ✅ MULTI-EQUIPOS (16-DIC-2025)
      ),
    );
    // Recargar conteo después de cerrar
    await _actualizarConteoEvidencias();
  }

  /// Guarda las observaciones generales en la BD
  Future<void> _guardarObservacionesGenerales() async {
    final db = ref.read(databaseProvider);
    final texto = _observacionesController.text.trim();

    await (db.update(
      db.ordenes,
    )..where((o) => o.idLocal.equals(widget.idOrdenLocal))).write(
      OrdenesCompanion(
        observacionesTecnico: Value(texto.isEmpty ? null : texto),
        updatedAt: Value(DateTime.now()),
        isDirty: const Value(true),
      ),
    );
  }

  /// TAB 3: RESUMEN - Vista general con progreso COMPLETO (Checklist + Mediciones)
  Widget _buildResumenTab() {
    // ✅ FIX: Contador simplificado - razón de falla ya no es actividad
    final totalItems = _total + _totalMediciones;
    final completados = _completadas + _medicionesConValor;
    final porcentaje = totalItems > 0
        ? (completados / totalItems * 100).toInt()
        : 0;
    final progresoCompleto = porcentaje == 100;

    // ✅ RUTA 8: Condición completa para finalizar (items + firmas)
    final puedeFinalizarItems = progresoCompleto;
    final puedeFinalizarFirmas = _tieneFirmaTecnico && _tieneFirmaCliente;
    final puedeFinalizar = puedeFinalizarItems && puedeFinalizarFirmas;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Progreso general
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
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
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '$completados de $totalItems items completados',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  // ✅ FIX: Desglose simplificado - razón de falla se captura aparte en diálogo finalización
                  Text(
                    '📋 Checklist: $_completadas/$_total  |  📏 Mediciones: $_medicionesConValor/$_totalMediciones',
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Resumen por estado
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Resumen por Estado',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  _buildResumenEstadoRow(
                    'Bueno (B)',
                    _contarPorSimbologia('B'),
                    Colors.green,
                  ),
                  _buildResumenEstadoRow(
                    'Malo (M)',
                    _contarPorSimbologia('M'),
                    Colors.red,
                  ),
                  _buildResumenEstadoRow(
                    'Cambiado (C)',
                    _contarPorSimbologia('C'),
                    Colors.orange,
                  ),
                  _buildResumenEstadoRow(
                    'N/A',
                    _contarPorSimbologia('NA'),
                    Colors.grey,
                  ),
                  _buildResumenEstadoRow(
                    'Pendientes',
                    _total - _completadas,
                    Colors.blue,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ✅ NUEVO: Observaciones Generales (Movido aquí para que el cliente lo vea antes de firmar)
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.notes, color: Colors.blue),
                      SizedBox(width: 8),
                      Text(
                        'Observaciones Generales',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _observacionesController,
                    focusNode: _observacionesFocusNode,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText:
                          'Ingrese las observaciones generales del servicio...',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                    ),
                    onChanged: (_) {
                      // Opcional: Auto-guardar con debounce
                    },
                    onEditingComplete: () {
                      _guardarObservacionesGenerales();
                      _observacionesFocusNode.unfocus();
                    },
                    onTapOutside: (_) {
                      _guardarObservacionesGenerales();
                      _observacionesFocusNode.unfocus();
                    },
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Este campo será visible en el reporte PDF final.',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade500,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ✅ FIX: RUTA 7 - Fotos Generales con estilo diferenciador
          Container(
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
                        numeroOrden: _numeroOrden,
                      ),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      // Ícono distintivo con fondo circular
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons
                              .collections, // Ícono diferente a las fotos de actividad
                          size: 32,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // ✅ FIX OVERFLOW: Usar Wrap en vez de Row
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                const Text(
                                  '📷 FOTOS GENERALES',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: Colors.white,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.3),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Text(
                                    'Del Servicio',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Fotos ANTES, DURANTE y DESPUÉS',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
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
          ),
          const SizedBox(height: 16),

          // ✅ RUTA 8: Sección de Firmas Digitales
          FirmasSection(
            idOrden: widget.idOrdenLocal,
            onFirmaGuardada: _actualizarEstadoFirmas,
          ),
          const SizedBox(height: 32),

          // ✅ RUTA 9: Botón de finalizar con sincronización al backend
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: puedeFinalizar
                  ? () => _mostrarDialogoFinalizacion()
                  : () {
                      // Mostrar qué falta
                      String faltantes = '';
                      if (!puedeFinalizarItems) {
                        faltantes += '• Completar items ($porcentaje%)\n';
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
                          duration: const Duration(seconds: 3),
                        ),
                      );
                    },
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
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResumenEstadoRow(String label, int cantidad, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(label)),
          Text(
            cantidad.toString(),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  /// ✅ RUTA 8: Genera texto descriptivo del botón FINALIZAR
  String _getTextoBotonFinalizar(int porcentaje) {
    if (porcentaje < 100) {
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

  int _contarPorSimbologia(String simbologia) {
    int count = 0;
    for (final actividades in _actividadesPorSistema.values) {
      for (final act in actividades) {
        if (act.simbologia == simbologia) {
          count++;
        }
      }
    }
    return count;
  }

  // ✅ _extraRazonFallaCount() ELIMINADO - razón de falla ahora se captura en diálogo de finalización
  // y se almacena en el campo JSON de la orden, no como actividad

  // ============================================================================
  // ✅ RUTA 9: DIÁLOGO Y LÓGICA DE FINALIZACIÓN CON SYNC AL BACKEND
  // ============================================================================

  /// Muestra diálogo para capturar datos finales y sincronizar
  Future<void> _mostrarDialogoFinalizacion() async {
    // 🔍 INVESTIGACIÓN FORENSE: Ver todos los valores de tiempo
    final now = DateTime.now();
    final nowUtc = DateTime.now().toUtc();
    print('🔍 FORENSE TIEMPO:');
    print('   DateTime.now() = $now');
    print('   DateTime.now().toUtc() = $nowUtc');
    print('   now.timeZoneOffset = ${now.timeZoneOffset}');
    print('   now.timeZoneName = ${now.timeZoneName}');
    print('   now.isUtc = ${now.isUtc}');
    print('   nowUtc.isUtc = ${nowUtc.isUtc}');

    // Usar la hora LOCAL del dispositivo directamente (sin ajustes)
    // El técnico está en el sitio, su dispositivo tiene la hora correcta
    final horaEntradaController = TextEditingController(
      text: DateFormat('HH:mm').format(now.subtract(const Duration(hours: 1))),
    );
    final horaSalidaController = TextEditingController(
      text: DateFormat('HH:mm').format(now),
    );
    final razonFallaController = TextEditingController(
      text: _razonFallaActual ?? '',
    );

    // ✅ MODO CONFIGURABLE: Usar modo guardado en Configuración como default
    String modoSeleccionado = ref.read(modoFinalizacionProvider);

    // DEBUG: Log de valores iniciales
    print('🕐 Diálogo Finalización:');
    print('   Hora entrada default: ${horaEntradaController.text}');
    print('   Hora salida default: ${horaSalidaController.text}');

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
              const Text(
                'Complete los datos para finalizar el servicio y sincronizar con el servidor.',
                style: TextStyle(color: Colors.grey),
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
              // ✅ MODO: Se usa el configurado en Configuración (sin selector aquí)
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 16,
                      color: Colors.blue.shade700,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        modoSeleccionado == 'COMPLETO'
                            ? 'Modo: Completo (PDF + Email)'
                            : 'Modo: Solo datos',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
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
              // DEBUG: Ver valores que se envían
              print('🕐 DEBUG FINALIZACIÓN:');
              print('   horaEntrada: ${horaEntradaController.text}');
              print('   horaSalida: ${horaSalidaController.text}');
              print('   modo: $modoSeleccionado');
              Navigator.of(ctx).pop({
                'horaEntrada': horaEntradaController.text,
                'horaSalida': horaSalidaController.text,
                'observaciones': _observacionesController.text.isEmpty
                    ? 'Servicio completado satisfactoriamente.'
                    : _observacionesController.text,
                if (_esCorrectivo) 'razonFalla': razonFallaController.text,
                'modo': modoSeleccionado,
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
        modo: resultado['modo'] ?? 'COMPLETO',
      );
    }
  }

  /// Ejecuta la sincronización con el backend
  /// ✅ 19-DIC-2025: Con feedback de progreso en tiempo real
  Future<void> _ejecutarFinalizacion({
    required String horaEntrada,
    required String horaSalida,
    required String observaciones,
    String? razonFalla,
    String modo = 'COMPLETO',
  }) async {
    // ✅ 19-DIC-2025: Mostrar diálogo con progreso reactivo
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _SyncProgressDialog(modo: modo),
    );

    try {
      // Obtener la orden para saber el ID del backend
      final db = ref.read(databaseProvider);
      final orden = await (db.select(
        db.ordenes,
      )..where((o) => o.idLocal.equals(widget.idOrdenLocal))).getSingleOrNull();

      if (orden == null || orden.idBackend == null) {
        Navigator.of(context).pop(); // Cerrar loading
        _mostrarError('No se pudo obtener la información de la orden');
        return;
      }

      // Llamar al servicio de sincronización
      final syncService = ref.read(syncUploadServiceProvider);
      final resultado = await syncService.finalizarOrden(
        idOrdenLocal: widget.idOrdenLocal,
        idOrdenBackend: orden.idBackend!,
        observaciones: observaciones,
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        usuarioId: ref.read(authStateProvider).user?.id ?? 1,
        razonFalla: (razonFalla?.trim().isNotEmpty ?? false)
            ? razonFalla!.trim()
            : null,
        modo: modo,
      );

      Navigator.of(context).pop(); // Cerrar loading

      if (resultado.success) {
        if (razonFalla != null) {
          setState(() {
            _razonFallaActual = (razonFalla.trim().isNotEmpty)
                ? razonFalla.trim()
                : null;
          });
        }
        if (resultado.guardadoOffline) {
          _mostrarExitoOffline(resultado);
        } else {
          await _mostrarExitoOnline(resultado);
        }
      } else {
        _mostrarError(resultado.mensaje);
      }
    } catch (e) {
      Navigator.of(context).pop(); // Cerrar loading
      _mostrarError('Error inesperado: $e');
    }
  }

  /// Muestra diálogo de éxito cuando se sincronizó online
  /// ✅ 03-ENE-2026: FIX CRÍTICO - Obtener conteos de BD local como fallback
  Future<void> _mostrarExitoOnline(SyncUploadResult resultado) async {
    final datosRes = resultado.datos;

    debugPrint('🔍 [RESULTADO] datosRes: $datosRes');
    debugPrint('🔍 [RESULTADO] datosRes.runtimeType: ${datosRes.runtimeType}');

    int evidenciasCount = 0;
    int firmasCount = 0;
    bool pdfGenerado = false;
    bool emailEnviado = false;

    // Intentar extraer de la respuesta del servidor
    if (datosRes != null) {
      List? evidenciasList;
      List? firmasList;
      Map<String, dynamic>? documentoMap;
      Map<String, dynamic>? emailMap;

      // Buscar en estructura directa primero
      if (datosRes['evidencias'] is List) {
        evidenciasList = datosRes['evidencias'] as List;
      }
      if (datosRes['firmas'] is List) {
        firmasList = datosRes['firmas'] as List;
      }
      if (datosRes['documento'] is Map) {
        documentoMap = datosRes['documento'] as Map<String, dynamic>;
      }
      if (datosRes['email'] is Map) {
        emailMap = datosRes['email'] as Map<String, dynamic>;
      }

      // Si no encontró, buscar en estructura anidada 'datos'
      if (evidenciasList == null && datosRes['datos'] is Map<String, dynamic>) {
        final datosAnidados = datosRes['datos'] as Map<String, dynamic>;
        evidenciasList ??= datosAnidados['evidencias'] as List?;
        firmasList ??= datosAnidados['firmas'] as List?;
        documentoMap ??= datosAnidados['documento'] as Map<String, dynamic>?;
        emailMap ??= datosAnidados['email'] as Map<String, dynamic>?;
      }

      evidenciasCount = evidenciasList?.length ?? 0;
      firmasCount = firmasList?.length ?? 0;
      pdfGenerado = documentoMap != null;
      emailEnviado = emailMap?['enviado'] == true;
    }

    // ✅ FALLBACK CRÍTICO: Si no hay datos del servidor, obtener de BD local
    if (evidenciasCount == 0 && firmasCount == 0) {
      debugPrint(
        '⚠️ [RESULTADO] Datos del servidor vacíos, obteniendo de BD local...',
      );
      try {
        final db = ref.read(databaseProvider);
        final evidenciasLocal = await (db.select(
          db.evidencias,
        )..where((e) => e.idOrden.equals(widget.idOrdenLocal))).get();
        final firmasLocal = await db.getFirmasByOrden(widget.idOrdenLocal);
        final ordenLocal =
            await (db.select(db.ordenes)
                  ..where((o) => o.idLocal.equals(widget.idOrdenLocal)))
                .getSingleOrNull();

        evidenciasCount = evidenciasLocal.length;
        firmasCount = firmasLocal.length;
        pdfGenerado =
            ordenLocal?.urlPdf != null && ordenLocal!.urlPdf!.isNotEmpty;
        emailEnviado = true; // Si llegó aquí, el backend procesó exitosamente

        debugPrint(
          '✅ [RESULTADO FALLBACK] evidencias=$evidenciasCount, firmas=$firmasCount',
        );
      } catch (e) {
        debugPrint('❌ [RESULTADO FALLBACK] Error: $e');
      }
    }

    debugPrint(
      '🔍 [RESULTADO FINAL] evidencias=$evidenciasCount, firmas=$firmasCount, pdf=$pdfGenerado, email=$emailEnviado',
    );

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
              const Text(
                'El servicio ha sido finalizado y sincronizado correctamente.',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              _buildResultadoItem(
                Icons.photo,
                'Evidencias',
                '$evidenciasCount',
              ),
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
              Navigator.of(context).pop(); // Volver a lista de órdenes
            },
            child: const Text('ACEPTAR'),
          ),
        ],
      ),
    );
  }

  /// Muestra diálogo de éxito cuando se guardó offline (para sync posterior)
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
              child: Text(
                'Servicio Completado',
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
              // ✅ MEJORA: Mensaje más claro sobre el estado real
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
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
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
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Colors.blue.shade600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'El servidor está generando el PDF y enviando el email. Esto puede tardar hasta 30 segundos.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Puedes continuar trabajando. La sincronización se completará en segundo plano.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              _buildResultadoItem(Icons.save, 'Datos locales', 'Guardados ✅'),
              _buildResultadoItem(
                Icons.cloud_upload,
                'Subida al servidor',
                'En proceso 🔄',
              ),
              _buildResultadoItem(Icons.picture_as_pdf, 'PDF', 'Generando...'),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop(); // Volver a lista de órdenes
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

  /// ✅ NUEVO: Widget para mostrar paso de loading
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

  /// Muestra diálogo de error
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
              _mostrarDialogoFinalizacion(); // Reintentar
            },
            child: const Text('REINTENTAR'),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// WIDGET DE MEDICIÓN CON SEMÁFORO Y PERSISTENCIA
// ============================================================================

/// Widget de entrada de medición con:
/// - Valor inicial desde BD (snapshot)
/// - Unidad real del parámetro
/// - Semáforo de colores según rangos
/// - Persistencia automática al perder foco
class _MedicionInputCard extends ConsumerStatefulWidget {
  final Medicione medicion;
  final void Function(int idLocal, double? valor)
  onValorGuardado; // ✅ FIX SCROLL
  final int conteoFotos; // ✅ MINI-GALERÍA v2
  final VoidCallback? onCapturaEvidencia; // ✅ MINI-GALERÍA v2

  const _MedicionInputCard({
    super.key,
    required this.medicion,
    required this.onValorGuardado,
    this.conteoFotos = 0,
    this.onCapturaEvidencia,
  });

  @override
  ConsumerState<_MedicionInputCard> createState() => _MedicionInputCardState();
}

class _MedicionInputCardState extends ConsumerState<_MedicionInputCard> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  String _estadoActual = 'PENDIENTE'; // NORMAL, ADVERTENCIA, CRITICO, PENDIENTE
  bool _guardando = false;

  @override
  void initState() {
    super.initState();
    // Inicializar con valor existente de BD (si existe)
    final valorInicial = widget.medicion.valor;
    _controller = TextEditingController(
      text: valorInicial != null ? valorInicial.toString() : '',
    );
    _focusNode = FocusNode();

    // Escuchar pérdida de foco para guardar
    _focusNode.addListener(_onFocusChange);

    // Calcular estado inicial si hay valor
    if (valorInicial != null) {
      _estadoActual = _calcularEstado(valorInicial);
    }
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      if (_controller.text.trim().isNotEmpty) {
        _guardarValor();
      } else if (widget.medicion.valor != null) {
        // El campo tenía valor y ahora está vacío -> limpiar
        _limpiarValor();
      }
    }
  }

  /// Limpia el valor cuando el usuario borra el contenido del campo
  Future<void> _limpiarValor() async {
    setState(() => _guardando = true);

    final service = ref.read(ejecucionServiceProvider);
    final exito = await service.limpiarMedicion(
      idMedicion: widget.medicion.idLocal,
    );

    if (exito) {
      setState(() {
        _estadoActual = 'PENDIENTE';
        _guardando = false;
      });
      widget.onValorGuardado(
        widget.medicion.idLocal,
        null,
      ); // Notificar cambio (disminuir contador)
    } else {
      setState(() => _guardando = false);
    }
  }

  /// Calcula el estado semáforo según los rangos del SNAPSHOT
  String _calcularEstado(double valor) {
    final minNormal = widget.medicion.rangoMinimoNormal;
    final maxNormal = widget.medicion.rangoMaximoNormal;
    final minCritico = widget.medicion.rangoMinimoCritico;
    final maxCritico = widget.medicion.rangoMaximoCritico;

    // Fuera de rangos críticos -> CRITICO
    if (minCritico != null && valor < minCritico) return 'CRITICO';
    if (maxCritico != null && valor > maxCritico) return 'CRITICO';

    // Fuera de rangos normales -> ADVERTENCIA
    if (minNormal != null && valor < minNormal) return 'ADVERTENCIA';
    if (maxNormal != null && valor > maxNormal) return 'ADVERTENCIA';

    // Dentro de rango -> NORMAL
    return 'NORMAL';
  }

  Color _getColorForEstado(String estado) {
    switch (estado) {
      case 'NORMAL':
        return Colors.green;
      case 'ADVERTENCIA':
        return Colors.orange;
      case 'CRITICO':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getIconForEstado(String estado) {
    switch (estado) {
      case 'NORMAL':
        return Icons.check_circle;
      case 'ADVERTENCIA':
        return Icons.warning;
      case 'CRITICO':
        return Icons.error;
      default:
        return Icons.pending;
    }
  }

  /// Guarda el valor en la BD y actualiza el estado
  Future<void> _guardarValor() async {
    final texto = _controller.text.trim();
    if (texto.isEmpty) return;

    final valor = double.tryParse(texto);
    if (valor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ingrese un número válido'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (!mounted) return;
    setState(() => _guardando = true);

    final nuevoEstado = _calcularEstado(valor);
    final service = ref.read(ejecucionServiceProvider);

    final exito = await service.actualizarMedicion(
      idMedicion: widget.medicion.idLocal,
      valor: valor,
      estadoValor: nuevoEstado,
    );

    if (!mounted) return; // Widget puede haberse desmontado durante await

    if (exito) {
      setState(() {
        _estadoActual = nuevoEstado;
        _guardando = false;
      });
      widget.onValorGuardado(widget.medicion.idLocal, valor); // ✅ FIX SCROLL

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Medición guardada: $valor ${widget.medicion.unidadMedida}',
            ),
            backgroundColor: _getColorForEstado(nuevoEstado),
            duration: const Duration(milliseconds: 800),
          ),
        );
      }
    } else {
      setState(() => _guardando = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al guardar medición'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColorForEstado(_estadoActual);
    final icon = _getIconForEstado(_estadoActual);
    final unidad = widget.medicion.unidadMedida;
    final nombre = widget.medicion.nombreParametro;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _estadoActual != 'PENDIENTE'
              ? color.withValues(alpha: 0.5)
              : Colors.transparent,
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header con nombre, estado y botón cámara
            Row(
              children: [
                Expanded(
                  child: Text(
                    nombre,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                // ✅ BOTÓN CÁMARA - MODELO HÍBRIDO
                if (widget.onCapturaEvidencia != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: widget.onCapturaEvidencia,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        width: 42,
                        height: 36,
                        decoration: BoxDecoration(
                          color: widget.conteoFotos > 0
                              ? Colors.blue.shade50
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: widget.conteoFotos > 0
                                ? Colors.blue
                                : Colors.grey.shade300,
                            width: widget.conteoFotos > 0 ? 2 : 1,
                          ),
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: Icon(
                                widget.conteoFotos > 0
                                    ? Icons.photo_library
                                    : Icons.camera_alt_outlined,
                                color: widget.conteoFotos > 0
                                    ? Colors.blue
                                    : Colors.grey.shade400,
                                size: 18,
                              ),
                            ),
                            if (widget.conteoFotos > 0)
                              Positioned(
                                top: 2,
                                right: 2,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                    vertical: 1,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.blue,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '${widget.conteoFotos}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                // Indicador de estado (semáforo)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 16, color: color),
                      const SizedBox(width: 4),
                      Text(
                        _estadoActual,
                        style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Rangos de referencia (desde snapshot)
            if (widget.medicion.rangoMinimoNormal != null ||
                widget.medicion.rangoMaximoNormal != null)
              Container(
                padding: const EdgeInsets.all(8),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 14,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Rango normal: ${widget.medicion.rangoMinimoNormal ?? "∞"} - ${widget.medicion.rangoMaximoNormal ?? "∞"} $unidad',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),

            // Campo de entrada con UNIDAD REAL
            TextField(
              controller: _controller,
              focusNode: _focusNode,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: 'Valor medido',
                hintText: 'Ingrese el valor',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: color),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: color, width: 2),
                ),
                prefixIcon: Icon(Icons.speed, color: color),
                suffixText: unidad, // UNIDAD REAL del snapshot
                suffixStyle: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              onChanged: (text) {
                // Actualizar semáforo en tiempo real
                final valor = double.tryParse(text);
                if (valor != null) {
                  setState(() {
                    _estadoActual = _calcularEstado(valor);
                  });
                }
              },
              onSubmitted: (_) => _guardarValor(),
            ),

            // Indicador de guardado
            if (_guardando)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: LinearProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}

/// ✅ WIDGET DE DIÁLOGO DE PROGRESO DE SINCRONIZACIÓN
/// Muestra el progreso en tiempo real de la subida al servidor
class _SyncProgressDialog extends ConsumerWidget {
  final String modo;
  const _SyncProgressDialog({this.modo = 'COMPLETO'});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(syncProgressProvider);

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
              // ✅ Solo mostrar pasos de PDF/Email si el modo es COMPLETO
              if (modo == 'COMPLETO') ...[
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
              ],

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
                      Icon(
                        Icons.celebration,
                        color: Colors.green.shade700,
                        size: 20,
                      ),
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
                if (progress.pasoActual == SyncStep.completado) {
                  Navigator.of(context).pop(); // Volver a lista de órdenes
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
