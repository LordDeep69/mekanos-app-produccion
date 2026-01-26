/// Pantalla de Lista de Órdenes - RUTA 4 + RUTA 10 (Filtros)
///
/// FILOSOFÍA: Esta UI lee EXCLUSIVAMENTE de la base de datos local (drift).
/// NO sabe que existe una API. Solo conoce el OrdenRepository.
///
/// PRUEBA DE FUEGO: Con el emulador en MODO AVIÓN, la lista debe seguir visible.
///
/// RUTA 10: Sistema de filtros por Estado, Fecha, Prioridad y Búsqueda
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../historial/presentation/historial_screen.dart';
import '../data/orden_repository.dart';
import 'home_production_screen.dart';
import 'orden_detalle_screen.dart';

/// Enum para filtros de fecha rápidos
enum FiltroFecha { todos, hoy, estaSemana, esteMes, fechaEspecifica }

/// Enum para filtros de estado - COHERENTE CON BACKEND
enum FiltroEstado {
  todos,
  programada,
  enProceso,
  completada,
  cancelada,
  cerrada,
  porSubir, // ✅ 20-DIC-2025: Filtrar órdenes pendientes de subir
}

/// Enum para filtros de prioridad - COHERENTE CON BACKEND
enum FiltroPrioridad { todos, urgente, alta, normal, baja }

/// ✅ NUEVO: Enum para filtro de Tipo de Servicio
enum FiltroTipoServicio {
  todos,
  genPrevA, // Generador Preventivo Tipo A
  genPrevB, // Generador Preventivo Tipo B
  bomPrevA, // Bomba Preventivo Tipo A
  correctivo, // Correctivos
}

/// ✅ NUEVO: Enum para ordenamiento
enum OrdenLista { recientesPrimero, antiguosPrimero, numeroAsc, numeroDesc }

class OrdenesListScreen extends ConsumerStatefulWidget {
  /// v3: Filtro inicial desde Dashboard
  /// Valores: null, 'pendientes', 'urgentes'
  final String? filtroInicial;

  /// ✅ NUEVO: Filtro inicial por estado (desde HomeProductionScreen)
  final String? initialFilterEstado;

  /// ✅ NUEVO: Filtro para mostrar solo ordenes de hoy
  final bool initialFilterHoy;

  const OrdenesListScreen({
    super.key,
    this.filtroInicial,
    this.initialFilterEstado,
    this.initialFilterHoy = false,
  });

  @override
  ConsumerState<OrdenesListScreen> createState() => _OrdenesListScreenState();
}

class _OrdenesListScreenState extends ConsumerState<OrdenesListScreen> {
  // Controladores y estado de filtros
  final TextEditingController _busquedaController = TextEditingController();
  // v3.1: ScrollController para preservar posición al cargar más
  final ScrollController _scrollController = ScrollController();
  FiltroFecha _filtroFecha = FiltroFecha.todos;
  FiltroEstado _filtroEstado = FiltroEstado.todos;
  FiltroPrioridad _filtroPrioridad = FiltroPrioridad.todos;
  FiltroTipoServicio _filtroTipoServicio = FiltroTipoServicio.todos; // ✅ NUEVO
  OrdenLista _ordenLista = OrdenLista.recientesPrimero; // ✅ NUEVO
  bool _mostrarFiltros = false;

  // Fecha específica para filtro personalizado
  DateTime? _fechaEspecifica;

  // v3: Paginación para miles de órdenes
  static const int _pageSize = 50;
  int _itemsToShow = 50;

  // ✅ FIX RENDIMIENTO: Cache de detalles para evitar queries repetidas
  final Map<int, OrdenConDetalles> _detallesCache = {};
  bool _cargandoDetalles = false;

  @override
  void initState() {
    super.initState();
    // v3: Aplicar filtro inicial desde Dashboard
    // ✅ FIX 26-ENE-2026: No desplegar menú automáticamente, solo aplicar filtro
    if (widget.filtroInicial != null) {
      switch (widget.filtroInicial) {
        case 'pendientes':
          // v3.1: Dashboard "Pendientes" = órdenes EN_PROCESO (estandarizado)
          _filtroEstado = FiltroEstado.enProceso;
          break;
        case 'urgentes':
          _filtroPrioridad = FiltroPrioridad.urgente;
          break;
        case 'hoy':
          _filtroFecha = FiltroFecha.hoy;
          break;
      }
    }

    // ✅ NUEVO: Aplicar filtro inicial por estado desde Home
    // ✅ FIX 26-ENE-2026: No desplegar menú automáticamente
    if (widget.initialFilterEstado != null) {
      switch (widget.initialFilterEstado) {
        case 'PENDIENTE':
        case 'ASIGNADA':
          _filtroEstado = FiltroEstado.programada;
          break;
        case 'EN_PROCESO':
          _filtroEstado = FiltroEstado.enProceso;
          break;
        case 'COMPLETADA':
          _filtroEstado = FiltroEstado.completada;
          break;
      }
    }

    // ✅ NUEVO: Aplicar filtro de hoy
    // ✅ FIX 26-ENE-2026: No desplegar menú automáticamente
    if (widget.initialFilterHoy) {
      _filtroFecha = FiltroFecha.hoy;
    }
  }

  /// ✅ FIX RENDIMIENTO: Cargar detalles una sola vez y cachearlos
  Future<void> _cargarDetallesEnBackground(List<Ordene> ordenes) async {
    if (_cargandoDetalles) return;
    _cargandoDetalles = true;

    final repository = ref.read(ordenRepositoryProvider);
    final nuevosDetalles = <int, OrdenConDetalles>{};

    // Procesar en lotes para no bloquear UI
    const batchSize = 20;
    for (int i = 0; i < ordenes.length; i += batchSize) {
      final batch = ordenes.skip(i).take(batchSize);
      await Future.wait(
        batch.map((o) async {
          if (!_detallesCache.containsKey(o.idLocal)) {
            final detalle = await repository.getOrdenConDetalles(o);
            nuevosDetalles[o.idLocal] = detalle;
          }
        }),
      );
      // Yield para permitir que UI responda
      await Future.delayed(Duration.zero);
    }

    if (mounted && nuevosDetalles.isNotEmpty) {
      setState(() {
        _detallesCache.addAll(nuevosDetalles);
      });
    }
    _cargandoDetalles = false;
  }

  @override
  void dispose() {
    _busquedaController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// ✅ v3.3 FIX: Refrescar lista de órdenes al volver de detalle/ejecución
  /// Limpia caché para reflejar cambios de estado (ej: EN_PROCESO)
  void _refrescarOrdenes() {
    if (mounted) {
      // ✅ Invalidar quickStatsProvider para actualizar Home/Dashboard
      ref.invalidate(quickStatsProvider);
      setState(() {
        // ✅ v3.3: Limpiar caché para forzar recarga con estados actualizados
        _detallesCache.clear();
        _cargandoDetalles = false;
      });
    }
  }

  /// Filtra las órdenes según los criterios seleccionados
  List<Ordene> _filtrarOrdenes(
    List<Ordene> ordenes,
    List<OrdenConDetalles> detalles,
  ) {
    // Crear un mapa de detalles por idLocal para acceso rápido
    final detallesMap = {for (var d in detalles) d.orden.idLocal: d};

    final filtradas = ordenes.where((orden) {
      final detalle = detallesMap[orden.idLocal];
      if (detalle == null) return true; // Si no hay detalle, mostrar

      // Filtro de búsqueda por texto
      if (_busquedaController.text.isNotEmpty) {
        final busqueda = _busquedaController.text.toLowerCase();
        final coincide =
            orden.numeroOrden.toLowerCase().contains(busqueda) ||
            detalle.nombreCliente.toLowerCase().contains(busqueda) ||
            detalle.nombreEquipo.toLowerCase().contains(busqueda);
        if (!coincide) return false;
      }

      // v3.2: Estado disponible para todos los filtros
      final estado = detalle.codigoEstado.toUpperCase();

      // Filtro por estado
      switch (_filtroEstado) {
        case FiltroEstado.todos:
          break;
        case FiltroEstado.programada:
          if (estado != 'PROGRAMADA' &&
              estado != 'ASIGNADA' &&
              estado != 'APROBADA' &&
              estado != 'PENDIENTE') {
            return false;
          }
          break;
        case FiltroEstado.enProceso:
          if (estado != 'EN_PROCESO') return false;
          break;
        case FiltroEstado.completada:
          if (estado != 'COMPLETADA') return false;
          break;
        case FiltroEstado.cancelada:
          if (estado != 'CANCELADA') return false;
          break;
        case FiltroEstado.cerrada:
          if (estado != 'CERRADA') return false;
          break;
        case FiltroEstado.porSubir:
          if (!orden.isDirty) return false;
          break;
      }

      // Filtro por prioridad
      switch (_filtroPrioridad) {
        case FiltroPrioridad.todos:
          break;
        case FiltroPrioridad.urgente:
          if (orden.prioridad.toUpperCase() != 'URGENTE') return false;
          break;
        case FiltroPrioridad.alta:
          if (orden.prioridad.toUpperCase() != 'ALTA') return false;
          break;
        case FiltroPrioridad.normal:
          if (orden.prioridad.toUpperCase() != 'NORMAL') return false;
          break;
        case FiltroPrioridad.baja:
          if (orden.prioridad.toUpperCase() != 'BAJA') return false;
          break;
      }

      // Filtro por fecha
      final fechaOrden = orden.fechaProgramada;
      if (fechaOrden != null) {
        final ahora = DateTime.now();
        final hoy = DateTime(ahora.year, ahora.month, ahora.day);

        switch (_filtroFecha) {
          case FiltroFecha.todos:
            break;
          case FiltroFecha.hoy:
            final fechaSolo = DateTime(
              fechaOrden.year,
              fechaOrden.month,
              fechaOrden.day,
            );
            if (fechaSolo != hoy) return false;
            break;
          case FiltroFecha.estaSemana:
            final inicioSemana = hoy.subtract(Duration(days: hoy.weekday - 1));
            final finSemana = inicioSemana.add(const Duration(days: 6));
            if (fechaOrden.isBefore(inicioSemana) ||
                fechaOrden.isAfter(finSemana.add(const Duration(days: 1)))) {
              return false;
            }
            break;
          case FiltroFecha.esteMes:
            if (fechaOrden.year != ahora.year ||
                fechaOrden.month != ahora.month) {
              return false;
            }
            break;
          case FiltroFecha.fechaEspecifica:
            if (_fechaEspecifica != null) {
              final fechaSolo = DateTime(
                fechaOrden.year,
                fechaOrden.month,
                fechaOrden.day,
              );
              final especificaSolo = DateTime(
                _fechaEspecifica!.year,
                _fechaEspecifica!.month,
                _fechaEspecifica!.day,
              );
              if (fechaSolo != especificaSolo) return false;
            }
            break;
        }
      }

      // Filtro por tipo de servicio
      if (_filtroTipoServicio != FiltroTipoServicio.todos) {
        final tipoServicio = detalle.tipoServicio;
        if (tipoServicio == null) return false;
        final codigoTipo = tipoServicio.codigo.toUpperCase();

        switch (_filtroTipoServicio) {
          case FiltroTipoServicio.todos:
            break;
          case FiltroTipoServicio.genPrevA:
            if (!codigoTipo.contains('GEN_PREV_A') &&
                !codigoTipo.contains('GEN_PREV_TIPO_A')) {
              return false;
            }
            break;
          case FiltroTipoServicio.genPrevB:
            if (!codigoTipo.contains('GEN_PREV_B') &&
                !codigoTipo.contains('GEN_PREV_TIPO_B')) {
              return false;
            }
            break;
          case FiltroTipoServicio.bomPrevA:
            if (!codigoTipo.contains('BOM_PREV')) return false;
            break;
          case FiltroTipoServicio.correctivo:
            if (!codigoTipo.contains('CORR')) return false;
            break;
        }
      }

      return true;
    }).toList();

    // ✅ Aplicar ordenamiento
    switch (_ordenLista) {
      case OrdenLista.recientesPrimero:
        filtradas.sort(
          (a, b) => (b.fechaProgramada ?? DateTime(2000)).compareTo(
            a.fechaProgramada ?? DateTime(2000),
          ),
        );
        break;
      case OrdenLista.antiguosPrimero:
        filtradas.sort(
          (a, b) => (a.fechaProgramada ?? DateTime(2000)).compareTo(
            b.fechaProgramada ?? DateTime(2000),
          ),
        );
        break;
      case OrdenLista.numeroAsc:
        filtradas.sort((a, b) => a.numeroOrden.compareTo(b.numeroOrden));
        break;
      case OrdenLista.numeroDesc:
        filtradas.sort((a, b) => b.numeroOrden.compareTo(a.numeroOrden));
        break;
    }

    return filtradas;
  }

  /// Verifica si hay algún filtro activo
  bool get _hayFiltrosActivos =>
      _busquedaController.text.isNotEmpty ||
      _filtroFecha != FiltroFecha.todos ||
      _filtroEstado != FiltroEstado.todos ||
      _filtroPrioridad != FiltroPrioridad.todos;

  /// Limpia todos los filtros
  void _limpiarFiltros() {
    setState(() {
      _busquedaController.clear();
      _filtroFecha = FiltroFecha.todos;
      _filtroEstado = FiltroEstado.todos;
      _filtroPrioridad = FiltroPrioridad.todos;
      _fechaEspecifica = null;
      _itemsToShow = _pageSize; // v3: Resetear paginación
    });
  }

  /// v3.3: Cargar más órdenes PRESERVANDO posición de scroll (fix robusto)
  Widget _buildCargarMasButton(int remaining) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: ElevatedButton.icon(
        onPressed: () => _cargarMasOrdenes(),
        icon: const Icon(Icons.expand_more),
        label: Text('Cargar más ($remaining restantes)'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue.shade50,
          foregroundColor: Colors.blue.shade700,
          padding: const EdgeInsets.symmetric(vertical: 12),
          minimumSize: const Size(double.infinity, 48),
        ),
      ),
    );
  }

  /// v3.3: Método separado para cargar más con scroll preservation robusto
  void _cargarMasOrdenes() {
    // Guardar posición ANTES del setState
    final savedOffset = _scrollController.hasClients
        ? _scrollController.offset
        : 0.0;

    debugPrint('📜 Scroll guardado: $savedOffset');

    setState(() {
      _itemsToShow += _pageSize;
    });

    // v3.3: Múltiples intentos para asegurar que el scroll se restaure
    _restaurarScroll(savedOffset, intentos: 3);
  }

  /// v3.3: Restaurar scroll con reintentos
  void _restaurarScroll(double offset, {int intentos = 5}) {
    if (intentos <= 0 || offset <= 0) return;

    Future.delayed(const Duration(milliseconds: 50), () {
      if (!mounted) return;

      if (_scrollController.hasClients) {
        // Verificar que el offset sea válido para el contenido actual
        final maxScroll = _scrollController.position.maxScrollExtent;
        final targetOffset = offset.clamp(0.0, maxScroll);
        _scrollController.jumpTo(targetOffset);
        debugPrint(
          '📜 [SCROLL] Restaurado a: $targetOffset (solicitado: $offset, max: $maxScroll)',
        );
      } else {
        // Reintentar si el controller no está listo
        debugPrint(
          '📜 [SCROLL] Controller no listo, reintentando... ($intentos restantes)',
        );
        _restaurarScroll(offset, intentos: intentos - 1);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final repository = ref.watch(ordenRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Órdenes de Servicio'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          // Botón de filtros
          IconButton(
            icon: Badge(
              isLabelVisible: _hayFiltrosActivos,
              child: const Icon(Icons.filter_list),
            ),
            tooltip: 'Filtros',
            onPressed: () => setState(() => _mostrarFiltros = !_mostrarFiltros),
          ),
          // Botón para ir a Historial
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Historial',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const HistorialScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Panel de filtros expandible
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: _mostrarFiltros ? null : 0,
            child: _mostrarFiltros
                ? _buildPanelFiltros()
                : const SizedBox.shrink(),
          ),
          // Lista de órdenes
          Expanded(
            child: StreamBuilder<List<Ordene>>(
              stream: repository.watchAllOrdenes(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Cargando órdenes desde BD local...'),
                      ],
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Text('Error: ${snapshot.error}'),
                      ],
                    ),
                  );
                }

                final ordenes = snapshot.data ?? [];
                if (ordenes.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.inbox_outlined,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No hay órdenes en la BD local',
                          style: TextStyle(fontSize: 18, color: Colors.grey),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Sincroniza desde la pantalla Home',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  );
                }

                // ✅ FIX RENDIMIENTO: Usar cache en vez de FutureBuilder que re-ejecuta en cada build
                // Disparar carga en background si hay órdenes sin cachear
                final ordenesNoCacheadas = ordenes
                    .where((o) => !_detallesCache.containsKey(o.idLocal))
                    .toList();
                if (ordenesNoCacheadas.isNotEmpty && !_cargandoDetalles) {
                  // Ejecutar después del build actual para evitar setState durante build
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _cargarDetallesEnBackground(ordenesNoCacheadas);
                  });
                }

                // Usar detalles del cache
                final detalles = _detallesCache.values.toList();
                final ordenesFiltradas = _filtrarOrdenes(ordenes, detalles);

                debugPrint(
                  '📋 Órdenes: ${ordenes.length} | Cache: ${_detallesCache.length} | Filtradas: ${ordenesFiltradas.length}',
                );

                return Column(
                  children: [
                    // Header con conteo y filtros activos
                    _buildHeader(ordenes.length, ordenesFiltradas.length),
                    // Lista
                    Expanded(
                      child: ordenesFiltradas.isEmpty
                          ? (_detallesCache.isEmpty && ordenes.isNotEmpty
                                ? const Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        CircularProgressIndicator(),
                                        SizedBox(height: 16),
                                        Text('Cargando detalles...'),
                                      ],
                                    ),
                                  )
                                : _buildEmptyFiltered())
                          : RefreshIndicator(
                              onRefresh: () async {
                                // Limpiar cache y resetear paginación
                                setState(() {
                                  _detallesCache.clear();
                                  _itemsToShow = _pageSize;
                                });
                              },
                              child: ListView.builder(
                                // ✅ FIX: PageStorageKey preserva el scroll automáticamente
                                key: const PageStorageKey<String>(
                                  'ordenes_list',
                                ),
                                // v3.3: ScrollController para preservar posición manual
                                controller: _scrollController,
                                padding: const EdgeInsets.only(bottom: 16),
                                // v3.4: Cache extent para pre-renderizar items y evitar saltos
                                cacheExtent: 500,
                                // ✅ FIX: itemExtent fijo para mejor rendimiento de scroll
                                itemExtent: 130,
                                // v3: Paginación - mostrar máximo _itemsToShow + 1 (para botón cargar más)
                                itemCount:
                                    ordenesFiltradas.length > _itemsToShow
                                    ? _itemsToShow + 1
                                    : ordenesFiltradas.length,
                                itemBuilder: (context, index) {
                                  // v3: Último item = botón "Cargar más"
                                  if (index == _itemsToShow &&
                                      ordenesFiltradas.length > _itemsToShow) {
                                    return _buildCargarMasButton(
                                      ordenesFiltradas.length - _itemsToShow,
                                    );
                                  }
                                  final orden = ordenesFiltradas[index];
                                  // ✅ FIX: Pasar detalles cacheados directamente, no hacer query por card
                                  final detallesCacheado =
                                      _detallesCache[orden.idLocal];
                                  return _OrdenCardOptimizado(
                                    orden: orden,
                                    detalles: detallesCacheado,
                                    onReturn:
                                        _refrescarOrdenes, // ✅ FIX: Refrescar al volver
                                  );
                                },
                              ),
                            ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPanelFiltros() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Barra de búsqueda
          TextField(
            controller: _busquedaController,
            decoration: InputDecoration(
              hintText: 'Buscar por orden, cliente o equipo...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _busquedaController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() => _busquedaController.clear());
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),

          // Filtros por Estado
          const Text(
            'Estado:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  'Todos',
                  _filtroEstado == FiltroEstado.todos,
                  () => setState(() => _filtroEstado = FiltroEstado.todos),
                  Colors.grey,
                ),
                _buildFilterChip(
                  'Programada',
                  _filtroEstado == FiltroEstado.programada,
                  () => setState(() => _filtroEstado = FiltroEstado.programada),
                  Colors.blue,
                ),
                _buildFilterChip(
                  'En Proceso',
                  _filtroEstado == FiltroEstado.enProceso,
                  () => setState(() => _filtroEstado = FiltroEstado.enProceso),
                  Colors.amber,
                ),
                // v3.1: Eliminados chips redundantes (Pendiente, Pendientes ✓)
                _buildFilterChip(
                  'Completada',
                  _filtroEstado == FiltroEstado.completada,
                  () => setState(() => _filtroEstado = FiltroEstado.completada),
                  Colors.green,
                ),
                _buildFilterChip(
                  'Cancelada',
                  _filtroEstado == FiltroEstado.cancelada,
                  () => setState(() => _filtroEstado = FiltroEstado.cancelada),
                  Colors.red,
                ),
                _buildFilterChip(
                  'Cerrada',
                  _filtroEstado == FiltroEstado.cerrada,
                  () => setState(() => _filtroEstado = FiltroEstado.cerrada),
                  Colors.grey.shade700,
                ),
                // ✅ 20-DIC-2025: Filtro para órdenes pendientes de subir
                _buildFilterChip(
                  'Por Subir',
                  _filtroEstado == FiltroEstado.porSubir,
                  () => setState(() => _filtroEstado = FiltroEstado.porSubir),
                  Colors.orange,
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Filtros por Fecha
          const Text(
            'Fecha:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  'Todas',
                  _filtroFecha == FiltroFecha.todos,
                  () => setState(() => _filtroFecha = FiltroFecha.todos),
                  Colors.grey,
                ),
                _buildFilterChip(
                  'Hoy',
                  _filtroFecha == FiltroFecha.hoy,
                  () => setState(() => _filtroFecha = FiltroFecha.hoy),
                  Colors.green,
                ),
                _buildFilterChip(
                  'Esta Semana',
                  _filtroFecha == FiltroFecha.estaSemana,
                  () => setState(() => _filtroFecha = FiltroFecha.estaSemana),
                  Colors.teal,
                ),
                _buildFilterChip(
                  'Este Mes',
                  _filtroFecha == FiltroFecha.esteMes,
                  () => setState(() => _filtroFecha = FiltroFecha.esteMes),
                  Colors.indigo,
                ),
                // Selector de fecha específica
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: ActionChip(
                    avatar: Icon(
                      Icons.calendar_month,
                      size: 18,
                      color: _filtroFecha == FiltroFecha.fechaEspecifica
                          ? Colors.white
                          : Colors.deepPurple,
                    ),
                    label: Text(
                      _fechaEspecifica != null &&
                              _filtroFecha == FiltroFecha.fechaEspecifica
                          ? '${_fechaEspecifica!.day}/${_fechaEspecifica!.month}/${_fechaEspecifica!.year}'
                          : 'Fecha...',
                      style: TextStyle(
                        color: _filtroFecha == FiltroFecha.fechaEspecifica
                            ? Colors.white
                            : Colors.deepPurple,
                        fontWeight: _filtroFecha == FiltroFecha.fechaEspecifica
                            ? FontWeight.bold
                            : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                    backgroundColor: _filtroFecha == FiltroFecha.fechaEspecifica
                        ? Colors.deepPurple
                        : Colors.deepPurple.withValues(alpha: 0.1),
                    onPressed: () async {
                      final fecha = await showDatePicker(
                        context: context,
                        initialDate: _fechaEspecifica ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        locale: const Locale('es', 'CO'),
                      );
                      if (fecha != null) {
                        setState(() {
                          _fechaEspecifica = fecha;
                          _filtroFecha = FiltroFecha.fechaEspecifica;
                        });
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Filtros por Prioridad
          const Text(
            'Prioridad:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  'Todas',
                  _filtroPrioridad == FiltroPrioridad.todos,
                  () =>
                      setState(() => _filtroPrioridad = FiltroPrioridad.todos),
                  Colors.grey,
                ),
                _buildFilterChip(
                  'Urgente',
                  _filtroPrioridad == FiltroPrioridad.urgente,
                  () => setState(
                    () => _filtroPrioridad = FiltroPrioridad.urgente,
                  ),
                  Colors.purple,
                ),
                _buildFilterChip(
                  'Alta',
                  _filtroPrioridad == FiltroPrioridad.alta,
                  () => setState(() => _filtroPrioridad = FiltroPrioridad.alta),
                  Colors.red,
                ),
                _buildFilterChip(
                  'Normal',
                  _filtroPrioridad == FiltroPrioridad.normal,
                  () =>
                      setState(() => _filtroPrioridad = FiltroPrioridad.normal),
                  Colors.orange,
                ),
                _buildFilterChip(
                  'Baja',
                  _filtroPrioridad == FiltroPrioridad.baja,
                  () => setState(() => _filtroPrioridad = FiltroPrioridad.baja),
                  Colors.green,
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // ===== FILTROS POR TIPO DE SERVICIO =====
          const Text(
            'Tipo de Servicio:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  'Todos',
                  _filtroTipoServicio == FiltroTipoServicio.todos,
                  () => setState(
                    () => _filtroTipoServicio = FiltroTipoServicio.todos,
                  ),
                  Colors.grey,
                ),
                _buildFilterChip(
                  'Gen Prev A',
                  _filtroTipoServicio == FiltroTipoServicio.genPrevA,
                  () => setState(
                    () => _filtroTipoServicio = FiltroTipoServicio.genPrevA,
                  ),
                  Colors.blue,
                ),
                _buildFilterChip(
                  'Gen Prev B',
                  _filtroTipoServicio == FiltroTipoServicio.genPrevB,
                  () => setState(
                    () => _filtroTipoServicio = FiltroTipoServicio.genPrevB,
                  ),
                  Colors.cyan,
                ),
                _buildFilterChip(
                  'Bomba Prev A',
                  _filtroTipoServicio == FiltroTipoServicio.bomPrevA,
                  () => setState(
                    () => _filtroTipoServicio = FiltroTipoServicio.bomPrevA,
                  ),
                  Colors.deepPurple,
                ),
                _buildFilterChip(
                  'Correctivo',
                  _filtroTipoServicio == FiltroTipoServicio.correctivo,
                  () => setState(
                    () => _filtroTipoServicio = FiltroTipoServicio.correctivo,
                  ),
                  Colors.red.shade700,
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // ===== ORDENAMIENTO =====
          const Text(
            'Ordenar por:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  'Más Reciente',
                  _ordenLista == OrdenLista.recientesPrimero,
                  () =>
                      setState(() => _ordenLista = OrdenLista.recientesPrimero),
                  Colors.teal,
                ),
                _buildFilterChip(
                  'Más Antiguo',
                  _ordenLista == OrdenLista.antiguosPrimero,
                  () =>
                      setState(() => _ordenLista = OrdenLista.antiguosPrimero),
                  Colors.brown,
                ),
                _buildFilterChip(
                  'N° Orden ↑',
                  _ordenLista == OrdenLista.numeroAsc,
                  () => setState(() => _ordenLista = OrdenLista.numeroAsc),
                  Colors.indigo,
                ),
                _buildFilterChip(
                  'N° Orden ↓',
                  _ordenLista == OrdenLista.numeroDesc,
                  () => setState(() => _ordenLista = OrdenLista.numeroDesc),
                  Colors.deepOrange,
                ),
              ],
            ),
          ),

          // Botón limpiar filtros
          if (_hayFiltrosActivos) ...[
            const SizedBox(height: 12),
            Center(
              child: TextButton.icon(
                onPressed: _limpiarFiltros,
                icon: const Icon(Icons.clear_all, size: 18),
                label: const Text('Limpiar filtros'),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    String label,
    bool selected,
    VoidCallback onTap,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : color,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
            fontSize: 12,
          ),
        ),
        selected: selected,
        onSelected: (_) => onTap(),
        backgroundColor: color.withValues(alpha: 0.1),
        selectedColor: color,
        checkmarkColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildHeader(int total, int filtradas) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: Colors.blue.shade50,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.list_alt, color: Colors.blue.shade700, size: 20),
              const SizedBox(width: 8),
              Text(
                _hayFiltrosActivos
                    ? '$filtradas de $total órdenes'
                    : '$total órdenes',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade800,
                ),
              ),
            ],
          ),
          if (_hayFiltrosActivos)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.filter_alt,
                    size: 14,
                    color: Colors.orange.shade700,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Filtros activos',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.orange.shade700,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyFiltered() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No se encontraron órdenes',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            'Prueba con otros filtros',
            style: TextStyle(color: Colors.grey.shade500),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _limpiarFiltros,
            icon: const Icon(Icons.clear_all),
            label: const Text('Limpiar filtros'),
          ),
        ],
      ),
    );
  }
}

/// ✅ FIX RENDIMIENTO: Card optimizado que recibe detalles pre-cargados (NO hace queries)
class _OrdenCardOptimizado extends StatelessWidget {
  final Ordene orden;
  final OrdenConDetalles? detalles;
  final VoidCallback? onReturn;

  const _OrdenCardOptimizado({
    required this.orden,
    this.detalles,
    this.onReturn,
  });

  /// v3.5 UI/UX: Obtener color representativo del estado (Enterprise Standard)
  Color _getEstadoColor(String codigoEstado) {
    switch (codigoEstado.toUpperCase()) {
      case 'ASIGNADA':
      case 'PROGRAMADA':
        return Colors.blue.shade700;
      case 'APROBADA':
        return Colors.teal.shade600;
      case 'PENDIENTE':
        return Colors.orange.shade700;
      case 'EN_PROCESO':
        return Colors.amber.shade800;
      case 'EN_ESPERA_REPUESTO':
        return Colors.deepOrange.shade600;
      case 'POR_SUBIR':
        return Colors.deepPurple.shade600;
      case 'COMPLETADA':
        return Colors.green.shade600;
      case 'CERRADA':
        return Colors.blueGrey.shade600;
      case 'CANCELADA':
        return Colors.red.shade600;
      default:
        return Colors.grey.shade600;
    }
  }

  /// v3.5 UI/UX: Chip de estado con iconografía estandarizada enterprise
  Widget _buildEstadoIcon(String codigoEstado) {
    final Color color = _getEstadoColor(codigoEstado);
    IconData icon;
    switch (codigoEstado.toUpperCase()) {
      case 'ASIGNADA':
      case 'PROGRAMADA':
      case 'APROBADA':
        icon = Icons.event_available;
      case 'PENDIENTE':
        icon = Icons.timer_outlined;
      case 'EN_PROCESO':
        icon = Icons.engineering;
      case 'EN_ESPERA_REPUESTO':
        icon = Icons.hourglass_empty;
      case 'POR_SUBIR':
        icon = Icons.cloud_upload_outlined;
      case 'COMPLETADA':
        icon = Icons.check_circle;
      case 'CERRADA':
        icon = Icons.lock_outline;
      case 'CANCELADA':
        icon = Icons.block;
      default:
        icon = Icons.help_outline;
    }
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
      ),
      child: Icon(icon, color: color, size: 28),
    );
  }

  /// v3.5 UI/UX: Chip de prioridad mejorado con mejor contraste
  Widget _buildPrioridadChip(String prioridad) {
    Color color;
    IconData? icon;
    switch (prioridad.toUpperCase()) {
      case 'URGENTE':
        color = Colors.red.shade700;
        icon = Icons.priority_high;
      case 'ALTA':
        color = Colors.orange.shade700;
        icon = Icons.arrow_upward;
      case 'NORMAL':
        color = Colors.blue.shade600;
        icon = null;
      case 'BAJA':
        color = Colors.green.shade600;
        icon = Icons.arrow_downward;
      default:
        color = Colors.grey;
        icon = null;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 3),
          ],
          Text(
            prioridad,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Si no hay detalles aún, mostrar placeholder ligero
    if (detalles == null) {
      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        elevation: 1,
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const SizedBox(width: 28, height: 28),
          ),
          title: Text(
            orden.numeroOrden,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          subtitle: const Text('Cargando...', style: TextStyle(fontSize: 12)),
          trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        ),
      );
    }

    final Color estadoColor = _getEstadoColor(detalles!.codigoEstado);
    final Color backgroundColor = estadoColor.withValues(alpha: 0.03);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 1.5,
      shadowColor: estadoColor.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) =>
                  OrdenDetalleScreen(idOrdenLocal: orden.idLocal),
            ),
          ).then((_) {
            onReturn?.call();
          });
        },
        child: Container(
          color: backgroundColor, // ✅ Subtle background tint
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Indicador lateral de estado (Enterprise Design)
                Container(
                  width: 6,
                  decoration: BoxDecoration(
                    color: estadoColor,
                    boxShadow: [
                      BoxShadow(
                        color: estadoColor.withValues(alpha: 0.3),
                        blurRadius: 4,
                        offset: const Offset(2, 0),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        // Icono de estado centralizado con mayor contraste
                        _buildEstadoIcon(detalles!.codigoEstado),
                        const SizedBox(width: 12),
                        // Información de la orden
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      orden.numeroOrden,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                        letterSpacing: 0.5,
                                        color: Colors.blueGrey.shade900,
                                      ),
                                    ),
                                  ),
                                  if (orden.isDirty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.shade100,
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(
                                          color: Colors.amber.shade300,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons.cloud_off,
                                            size: 10,
                                            color: Colors.amber.shade800,
                                          ),
                                          const SizedBox(width: 2),
                                          Text(
                                            'LOCAL',
                                            style: TextStyle(
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.amber.shade900,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.business_rounded,
                                    size: 14,
                                    color: Colors.blueGrey,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      detalles!.nombreCliente,
                                      style: TextStyle(
                                        color: Colors.grey.shade800,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.settings_suggest_rounded,
                                    size: 14,
                                    color: Colors.blueGrey,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      detalles!.nombreEquipo,
                                      style: TextStyle(
                                        color: Colors.grey.shade600,
                                        fontSize: 12,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.calendar_today_rounded,
                                        size: 14,
                                        color: Colors.blueGrey,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        detalles!.fechaProgramadaFormateada,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade700,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                  _buildPrioridadChip(
                                    detalles!.prioridadFormateada,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: Colors.grey,
                          size: 20,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Card individual de orden (LEGACY - mantener para compatibilidad)
class _OrdenCard extends StatelessWidget {
  final Ordene orden;
  final OrdenRepository repository;

  const _OrdenCard({required this.orden, required this.repository});

  @override
  Widget build(BuildContext context) {
    // Altura fija para evitar saltos de scroll durante carga async
    const double cardMinHeight = 120.0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 2,
      child: FutureBuilder<OrdenConDetalles>(
        future: repository.getOrdenConDetalles(orden),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            // Placeholder con misma altura que el card cargado
            return Container(
              constraints: const BoxConstraints(minHeight: cardMinHeight),
              child: const ListTile(
                contentPadding: EdgeInsets.all(12),
                leading: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                title: Text('Cargando...'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: 8),
                    SizedBox(height: 16, width: 150), // Spacer para altura
                    SizedBox(height: 4),
                    SizedBox(height: 14, width: 100),
                  ],
                ),
              ),
            );
          }

          final detalles = snapshot.data!;

          // Container con misma altura mínima que placeholder
          return Container(
            constraints: const BoxConstraints(minHeight: cardMinHeight),
            child: ListTile(
              contentPadding: const EdgeInsets.all(12),
              leading: _buildEstadoChip(detalles.codigoEstado),
              title: Text(
                orden.numeroOrden,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.person_outline,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          detalles.nombreCliente,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(
                        Icons.precision_manufacturing,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          detalles.nombreEquipo,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        detalles.fechaProgramadaFormateada,
                        style: const TextStyle(fontSize: 12),
                      ),
                      const SizedBox(width: 16),
                      _buildPrioridadChip(detalles.prioridadFormateada),
                    ],
                  ),
                ],
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                // Navegar a detalle de orden - RUTA 5
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        OrdenDetalleScreen(idOrdenLocal: orden.idLocal),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEstadoChip(String codigoEstado) {
    Color color;
    IconData icon;

    switch (codigoEstado) {
      case 'PENDIENTE':
        color = Colors.orange;
        icon = Icons.pending_outlined;
        break;
      case 'PROGRAMADA':
        color = Colors.blue;
        icon = Icons.schedule;
        break;
      case 'EN_PROCESO':
        color = Colors.amber;
        icon = Icons.play_circle_outline;
        break;
      case 'POR_SUBIR':
        color = Colors.deepPurple;
        icon = Icons.cloud_upload_outlined;
        break;
      case 'COMPLETADA':
        color = Colors.green;
        icon = Icons.check_circle_outline;
        break;
      case 'CERRADA':
        color = Colors.grey;
        icon = Icons.lock_outline;
        break;
      default:
        color = Colors.grey;
        icon = Icons.help_outline;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 28),
    );
  }

  Widget _buildPrioridadChip(String prioridad) {
    Color color;
    switch (prioridad) {
      case 'ALTA':
        color = Colors.red;
        break;
      case 'URGENTE':
        color = Colors.purple;
        break;
      case 'BAJA':
        color = Colors.green;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        prioridad,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
