import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../core/database/app_database.dart';
import '../../../core/database/database_service.dart';
import '../../../core/sync/sync_upload_service.dart'
    show SyncUploadResult, syncUploadServiceProvider;
import '../../auth/data/auth_provider.dart';
import '../../evidencias/data/evidencia_service.dart';
import '../../evidencias/presentation/evidencias_actividad_bottom_sheet.dart';
import '../../evidencias/presentation/evidencias_screen.dart';
import '../../firmas/data/firma_service.dart';
import '../../firmas/presentation/firmas_section.dart';
import '../data/ejecucion_service.dart';

/// Pantalla de Ejecución de Orden - RUTA 6
/// TabBar: Checklist | Mediciones | Resumen
class EjecucionScreen extends ConsumerStatefulWidget {
  final int idOrdenLocal;

  const EjecucionScreen({super.key, required this.idOrdenLocal});

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
  int _completadas = 0;
  int _total = 0;
  int _medicionesConValor = 0;
  int _totalMediciones = 0;

  // ✅ RUTA 8: Estado de firmas
  bool _tieneFirmaTecnico = false;
  bool _tieneFirmaCliente = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _cargarDatos();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);

    final service = ref.read(ejecucionServiceProvider);

    try {
      // Cargar actividades agrupadas
      _actividadesPorSistema = await service.getActividadesAgrupadas(
        widget.idOrdenLocal,
      );

      // Cargar MEDICIONES desde tabla local (con snapshot completo)
      _mediciones = await service.getMedicionesByOrdenLocal(
        widget.idOrdenLocal,
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
      final db = ref.read(databaseProvider);
      final orden = await (db.select(
        db.ordenes,
      )..where((o) => o.idLocal.equals(widget.idOrdenLocal))).getSingleOrNull();
      _numeroOrden = orden?.numeroOrden ?? 'Sin número';
      _razonFallaActual = orden?.razonFalla;

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
    final extraRazon = _extraRazonFallaCount();
    final completadosDisplay = _completadas + _medicionesConValor + extraRazon;
    final totalDisplay = _total + _totalMediciones + extraRazon;

    return Scaffold(
      appBar: AppBar(
        title: Text(_numeroOrden ?? 'Ejecución'),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.checklist), text: 'Checklist'),
            Tab(icon: Icon(Icons.speed), text: 'Mediciones'),
            Tab(icon: Icon(Icons.summarize), text: 'Resumen'),
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
              children: [
                _buildChecklistTab(),
                _buildMedicionesTab(),
                _buildResumenTab(),
              ],
            ),
    );
  }

  /// TAB 1: CHECKLIST - Lista agrupada por sistema
  /// EXCLUYE actividades tipo MEDICION (se muestran en tab Mediciones)
  Widget _buildChecklistTab() {
    if (_actividadesPorSistema.isEmpty) {
      return const Center(child: Text('No hay actividades para esta orden'));
    }

    // Filtrar actividades: excluir tipo MEDICION de la vista Checklist
    final checklistPorSistema = <String, List<ActividadesEjecutada>>{};
    for (final entry in _actividadesPorSistema.entries) {
      final actividadesChecklist = entry.value
          .where((a) => a.tipoActividad.toUpperCase() != 'MEDICION')
          .toList();
      if (actividadesChecklist.isNotEmpty) {
        checklistPorSistema[entry.key] = actividadesChecklist;
      }
    }

    if (checklistPorSistema.isEmpty) {
      return const Center(
        child: Text('No hay actividades de checklist para esta orden'),
      );
    }

    return RefreshIndicator(
      onRefresh: _cargarDatos,
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 100),
        itemCount: checklistPorSistema.length,
        itemBuilder: (context, index) {
          final sistema = checklistPorSistema.keys.elementAt(index);
          final actividades = checklistPorSistema[sistema]!;

          return _buildSistemaSection(sistema, actividades);
        },
      ),
    );
  }

  Widget _buildSistemaSection(
    String sistema,
    List<ActividadesEjecutada> actividades,
  ) {
    // Contar completadas en este sistema
    final completadasSistema = actividades
        .where((a) => a.simbologia != null)
        .length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header del sistema (sticky)
        Container(
          color: Colors.green.shade50,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(Icons.folder, color: Colors.green.shade700, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  sistema,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade700,
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: completadasSistema == actividades.length
                      ? Colors.green
                      : Colors.grey,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$completadasSistema/${actividades.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Actividades del sistema
        ...actividades.map((act) => _buildActividadItem(act)),
      ],
    );
  }

  Widget _buildActividadItem(ActividadesEjecutada actividad) {
    final simbologia = actividad.simbologia;
    final estaCompletada = simbologia != null;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: estaCompletada
            ? _getColorForSimbologia(simbologia).withValues(alpha: 0.1)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: estaCompletada
              ? _getColorForSimbologia(simbologia).withValues(alpha: 0.5)
              : Colors.grey.shade300,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Descripción de la actividad
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icono de estado
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: estaCompletada
                        ? _getColorForSimbologia(simbologia)
                        : Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: estaCompletada
                        ? Text(
                            simbologia,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          )
                        : Icon(
                            Icons.pending,
                            size: 18,
                            color: Colors.grey.shade400,
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
                          fontWeight: FontWeight.w500,
                          color: estaCompletada
                              ? Colors.grey.shade700
                              : Colors.black,
                        ),
                      ),
                      if (actividad.tipoActividad != 'INSPECCION')
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            actividad.tipoActividad,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ),
                      if (actividad.idParametroMedicion != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              Icon(
                                Icons.speed,
                                size: 14,
                                color: Colors.blue.shade400,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Requiere medición',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.blue.shade400,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Fila con input de actividad + botones
            // RUTA 11 v2: Widget dinámico según tipo de actividad
            Row(
              children: [
                Expanded(child: _buildActividadInputWidget(actividad)),
                const SizedBox(width: 8),
                // ✅ BOTÓN OBSERVACIÓN
                _buildBotonObservacion(actividad),
                const SizedBox(width: 4),
                // ✅ BOTÓN CÁMARA - MODELO HÍBRIDO
                _buildBotonCamara(actividad),
              ],
            ),
            // ✅ Mostrar observación si existe (para actividades normales)
            if (actividad.observacion != null &&
                actividad.observacion!.isNotEmpty &&
                !_esActividadEspecial(actividad.descripcion))
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.notes, size: 14, color: Colors.amber.shade700),
                      const SizedBox(width: 6),
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
    );
  }

  /// Botón de cámara para abrir mini-galería de evidencias por actividad
  Widget _buildBotonCamara(ActividadesEjecutada actividad) {
    final conteoFotos = _conteoEvidenciasPorActividad[actividad.idLocal] ?? 0;
    final tieneEvidencia = conteoFotos > 0;

    return InkWell(
      onTap: () => _abrirMiniGaleria(actividad.idLocal, actividad.descripcion),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 52,
        height: 48,
        decoration: BoxDecoration(
          color: tieneEvidencia ? Colors.blue.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: tieneEvidencia ? Colors.blue : Colors.grey.shade300,
            width: tieneEvidencia ? 2 : 1,
          ),
        ),
        child: Stack(
          children: [
            Center(
              child: Icon(
                tieneEvidencia
                    ? Icons.photo_library
                    : Icons.camera_alt_outlined,
                color: tieneEvidencia ? Colors.blue : Colors.grey.shade400,
                size: 24,
              ),
            ),
            // Badge con número de fotos
            if (tieneEvidencia)
              Positioned(
                top: 2,
                right: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$conteoFotos',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
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

  /// ✅ Botón para agregar/editar observación por actividad
  Widget _buildBotonObservacion(ActividadesEjecutada actividad) {
    final tieneObservacion =
        actividad.observacion != null &&
        actividad.observacion!.isNotEmpty &&
        !_esActividadEspecial(actividad.descripcion);

    return InkWell(
      onTap: () => _mostrarDialogoObservacion(actividad),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 44,
        height: 48,
        decoration: BoxDecoration(
          color: tieneObservacion ? Colors.amber.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: tieneObservacion ? Colors.amber : Colors.grey.shade300,
            width: tieneObservacion ? 2 : 1,
          ),
        ),
        child: Center(
          child: Icon(
            tieneObservacion ? Icons.speaker_notes : Icons.notes_outlined,
            color: tieneObservacion
                ? Colors.amber.shade700
                : Colors.grey.shade400,
            size: 20,
          ),
        ),
      ),
    );
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

  /// ✅ FIX SCROLL MEDICIONES: Actualiza estado local sin reconstruir ListView
  /// Similar a _marcarActividad pero para mediciones
  void _actualizarContadorMediciones() {
    // Recalcular mediciones con valor basándose en la lista actual en BD
    // No recargamos toda la lista, solo actualizamos el contador
    int conValor = 0;
    for (final med in _mediciones) {
      if (med.valor != null) {
        conValor++;
      }
    }

    if (mounted) {
      setState(() {
        _medicionesConValor = conValor;
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
  String? _getTipoActividadEspecial(String descripcion) {
    final desc = descripcion.toUpperCase();

    // Nivel de combustible
    if (desc.contains('NIVEL DE COMBUSTIBLE') ||
        desc.contains('NIVEL COMBUSTIBLE') ||
        desc.contains('TANQUE DE COMBUSTIBLE')) {
      return 'NIVEL_COMBUSTIBLE';
    }

    // Nivel de aceite
    if (desc.contains('NIVEL DE ACEITE') ||
        desc.contains('NIVEL ACEITE') ||
        desc.contains('REVISAR ACEITE')) {
      return 'NIVEL_ACEITE';
    }

    // Horas de trabajo / Horómetro
    if (desc.contains('HOROMETRO') ||
        desc.contains('HORÓMETRO') ||
        desc.contains('HORAS DE TRABAJO') ||
        desc.contains('HORAS TRABAJO') ||
        desc.contains('LECTURA DE HORAS')) {
      return 'HOROMETRO';
    }

    // Estado de batería
    if (desc.contains('ESTADO DE BATERIA') ||
        desc.contains('ESTADO BATERIA') ||
        desc.contains('BATERÍA') ||
        desc.contains('BATERIA') ||
        desc.contains('CARGA DE BATERIA') ||
        desc.contains('NIVEL BATERIA')) {
      return 'BATERIA';
    }

    // Temperatura
    if (desc.contains('TEMPERATURA') || desc.contains('TEMP.')) {
      return 'TEMPERATURA';
    }

    return null; // Actividad normal (B/M/C/NA)
  }

  /// Construye el widget apropiado según el tipo de actividad
  Widget _buildActividadInputWidget(ActividadesEjecutada actividad) {
    final tipo = _getTipoActividadEspecial(actividad.descripcion);

    switch (tipo) {
      case 'NIVEL_COMBUSTIBLE':
        return _buildNivelCombustibleSelector(actividad);
      case 'NIVEL_ACEITE':
        return _buildNivelAceiteSelector(actividad);
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

  /// Widget selector de nivel de combustible con opciones visuales
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
      }).toList(),
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
    );
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
      ),
    );
    // Recargar conteo después de cerrar
    await _actualizarConteoEvidencias();
  }

  /// TAB 3: RESUMEN - Vista general con progreso COMPLETO (Checklist + Mediciones)
  Widget _buildResumenTab() {
    // CÁLCULO CORRECTO: (Actividades + Mediciones) / Total Items
    final extraRazon = _extraRazonFallaCount();
    final totalItems = _total + _totalMediciones + extraRazon;
    final completados = _completadas + _medicionesConValor + extraRazon;
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
                  // Desglose
                  Text(
                    '📋 Checklist: $_completadas/$_total  |  📏 Mediciones: $_medicionesConValor/$_totalMediciones${_esCorrectivo ? "  |  ⚙️ Razón falla: ${_razonFallaActual?.trim().isNotEmpty == true ? "1/1" : "0/0"}" : ""}',
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

  int _extraRazonFallaCount() {
    if (!_esCorrectivo) return 0;
    return (_razonFallaActual?.trim().isNotEmpty ?? false) ? 1 : 0;
  }

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
    final observacionesController = TextEditingController();
    final razonFallaController = TextEditingController(
      text: _razonFallaActual ?? '',
    );

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
              // DEBUG: Ver valores que se envían
              print('🕐 DEBUG FINALIZACIÓN:');
              print('   horaEntrada: ${horaEntradaController.text}');
              print('   horaSalida: ${horaSalidaController.text}');
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
    // ✅ MEJORA: Mostrar loading con más información
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

  /// Muestra diálogo de éxito cuando se sincronizó online
  void _mostrarExitoOnline(SyncUploadResult resultado) {
    final datosRes = resultado.datos;
    final dataInterna = datosRes?['data'] as Map<String, dynamic>?;

    final evidenciasCount = (dataInterna?['evidencias'] as List?)?.length ?? 0;
    final firmasCount = (dataInterna?['firmas'] as List?)?.length ?? 0;
    final pdfGenerado = dataInterna?['documento'] != null;
    final emailEnviado = dataInterna?['email']?['enviado'] == true;

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
