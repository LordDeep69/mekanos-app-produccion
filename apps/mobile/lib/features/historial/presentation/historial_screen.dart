import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../data/historial_service.dart';
import 'historial_detalle_screen.dart';

/// Pantalla principal de historial de órdenes finalizadas
///
/// Muestra lista de órdenes completadas con:
/// - Búsqueda por número de orden o cliente
/// - Filtros por rango de fechas
/// - Estadísticas de resumen
class HistorialScreen extends ConsumerStatefulWidget {
  const HistorialScreen({super.key});

  @override
  ConsumerState<HistorialScreen> createState() => _HistorialScreenState();
}

class _HistorialScreenState extends ConsumerState<HistorialScreen> {
  final TextEditingController _busquedaController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<OrdenHistorialDto> _ordenes = [];
  EstadisticasHistorialDto? _estadisticas;
  bool _isLoading = true;
  String? _error;

  // Filtros
  DateTime? _fechaDesde;
  DateTime? _fechaHasta;
  DateTime? _fechaEspecifica; // RUTA 12
  int? _idClienteSeleccionado;
  int? _idTipoServicioSeleccionado; // RUTA 12
  List<ClienteFiltroDto> _clientes = [];
  List<TipoServicioFiltroDto> _tiposServicio = []; // RUTA 12

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  @override
  void dispose() {
    _busquedaController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _cargarDatos({bool mostrarLoading = true}) async {
    if (mostrarLoading) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final service = ref.read(historialServiceProvider);

      // Reparar órdenes antiguas sin fechaFin (solo la primera vez)
      if (_ordenes.isEmpty) {
        await service.repararOrdenesAntiguasSinFecha();
      }

      // Cargar órdenes con filtros (incluyendo nuevos de RUTA 12)
      final ordenesNuevas = await service.getOrdenesFinalizadas(
        busqueda: _busquedaController.text.isNotEmpty
            ? _busquedaController.text
            : null,
        fechaDesde: _fechaDesde,
        fechaHasta: _fechaHasta,
        fechaEspecifica: _fechaEspecifica, // RUTA 12
        idCliente: _idClienteSeleccionado,
        idTipoServicio: _idTipoServicioSeleccionado, // RUTA 12
      );

      // Cargar estadísticas
      final estadisticasNuevas = await service.getEstadisticas(
        fechaDesde: _fechaDesde,
        fechaHasta: _fechaHasta,
      );

      // Cargar clientes para filtro (solo la primera vez)
      if (_clientes.isEmpty) {
        final clientes = await service.getClientesParaFiltro();
        _clientes = clientes;
      }

      // RUTA 12: Cargar tipos de servicio para filtro (solo la primera vez)
      if (_tiposServicio.isEmpty) {
        final tipos = await service.getTiposServicioParaFiltro();
        _tiposServicio = tipos;
      }

      if (mounted) {
        setState(() {
          // ✅ FIX ROBUSTO: Solo actualizamos si los datos son diferentes
          // para evitar reconstrucciones innecesarias que rompen el scroll
          _ordenes = ordenesNuevas;
          _estadisticas = estadisticasNuevas;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar historial: $e';
          _isLoading = false;
        });
      }
    }
  }

  void _refrescar() {
    _cargarDatos(mostrarLoading: false);
  }

  void _buscar() {
    _cargarDatos();
  }

  void _limpiarFiltros() {
    setState(() {
      _busquedaController.clear();
      _fechaDesde = null;
      _fechaHasta = null;
      _fechaEspecifica = null; // RUTA 12
      _idClienteSeleccionado = null;
      _idTipoServicioSeleccionado = null; // RUTA 12
    });
    _cargarDatos();
  }

  Future<void> _seleccionarFechaDesde() async {
    final fecha = await showDatePicker(
      context: context,
      initialDate:
          _fechaDesde ?? DateTime.now().subtract(const Duration(days: 30)),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      locale: const Locale('es', 'CO'),
    );
    if (fecha != null) {
      setState(() => _fechaDesde = fecha);
      _cargarDatos();
    }
  }

  Future<void> _seleccionarFechaHasta() async {
    final fecha = await showDatePicker(
      context: context,
      initialDate: _fechaHasta ?? DateTime.now(),
      firstDate: _fechaDesde ?? DateTime(2020),
      lastDate: DateTime.now(),
      locale: const Locale('es', 'CO'),
    );
    if (fecha != null) {
      setState(() => _fechaHasta = fecha);
      _cargarDatos();
    }
  }

  // RUTA 12: Selector de fecha específica
  Future<void> _seleccionarFechaEspecifica() async {
    final fecha = await showDatePicker(
      context: context,
      initialDate: _fechaEspecifica ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      locale: const Locale('es', 'CO'),
    );
    if (fecha != null) {
      setState(() {
        _fechaEspecifica = fecha;
        // Limpiar rango de fechas si se selecciona fecha específica
        _fechaDesde = null;
        _fechaHasta = null;
      });
      _cargarDatos();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('Historial de Servicios'),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_fechaDesde != null ||
              _fechaHasta != null ||
              _idClienteSeleccionado != null)
            IconButton(
              icon: const Icon(Icons.filter_alt_off),
              onPressed: _limpiarFiltros,
              tooltip: 'Limpiar filtros',
            ),
        ],
      ),
      body: Column(
        children: [
          // Estadísticas
          if (_estadisticas != null) _buildEstadisticas(),

          // Barra de búsqueda y filtros
          _buildBarraBusqueda(),

          // Filtros de fecha
          _buildFiltrosFecha(),

          // Lista de órdenes
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? _buildError()
                : _ordenes.isEmpty
                ? _buildEmpty()
                : _buildLista(),
          ),
        ],
      ),
    );
  }

  Widget _buildEstadisticas() {
    final stats = _estadisticas!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.shade700, Colors.green.shade500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              icon: Icons.assignment_turned_in,
              valor: stats.totalOrdenes.toString(),
              label: 'Total',
            ),
          ),
          Expanded(
            child: _buildStatCard(
              icon: Icons.calendar_month,
              valor: stats.ordenesEsteMes.toString(),
              label: 'Este mes',
            ),
          ),
          Expanded(
            child: _buildStatCard(
              icon: Icons.timer,
              valor: stats.promedioDuracionFormateado,
              label: 'Promedio',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String valor,
    required String label,
  }) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 24),
        const SizedBox(height: 4),
        Text(
          valor,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildBarraBusqueda() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _busquedaController,
              decoration: InputDecoration(
                hintText: 'Buscar por N° orden o cliente...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onSubmitted: (_) => _buscar(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: _buscar,
            icon: const Icon(Icons.search),
            style: IconButton.styleFrom(
              backgroundColor: Colors.green.shade600,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFiltrosFecha() {
    final dateFormat = DateFormat('dd/MM/yyyy');
    final tieneFiltroDeFecha = _fechaDesde != null || _fechaHasta != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: Colors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            // Chip fecha desde
            ActionChip(
              avatar: Icon(
                Icons.calendar_today,
                size: 18,
                color: _fechaDesde != null
                    ? Colors.green.shade700
                    : Colors.grey,
              ),
              label: Text(
                _fechaDesde != null
                    ? 'Desde: ${dateFormat.format(_fechaDesde!)}'
                    : 'Fecha desde',
              ),
              onPressed: _seleccionarFechaDesde,
              backgroundColor: _fechaDesde != null
                  ? Colors.green.shade50
                  : Colors.grey.shade100,
            ),
            const SizedBox(width: 8),

            // Chip fecha hasta
            ActionChip(
              avatar: Icon(
                Icons.calendar_today,
                size: 18,
                color: _fechaHasta != null
                    ? Colors.green.shade700
                    : Colors.grey,
              ),
              label: Text(
                _fechaHasta != null
                    ? 'Hasta: ${dateFormat.format(_fechaHasta!)}'
                    : 'Fecha hasta',
              ),
              onPressed: _seleccionarFechaHasta,
              backgroundColor: _fechaHasta != null
                  ? Colors.green.shade50
                  : Colors.grey.shade100,
            ),
            const SizedBox(width: 8),

            // Dropdown de clientes
            if (_clientes.isNotEmpty)
              PopupMenuButton<int?>(
                initialValue: _idClienteSeleccionado,
                onSelected: (value) {
                  setState(() => _idClienteSeleccionado = value);
                  _cargarDatos();
                },
                itemBuilder: (context) => [
                  const PopupMenuItem<int?>(
                    value: null,
                    child: Text('Todos los clientes'),
                  ),
                  const PopupMenuDivider(),
                  ..._clientes.map(
                    (c) =>
                        PopupMenuItem<int?>(value: c.id, child: Text(c.nombre)),
                  ),
                ],
                child: Chip(
                  avatar: Icon(
                    Icons.business,
                    size: 18,
                    color: _idClienteSeleccionado != null
                        ? Colors.green.shade700
                        : Colors.grey,
                  ),
                  label: Text(
                    _idClienteSeleccionado != null
                        ? _clientes
                              .firstWhere((c) => c.id == _idClienteSeleccionado)
                              .nombre
                        : 'Cliente',
                  ),
                  backgroundColor: _idClienteSeleccionado != null
                      ? Colors.green.shade50
                      : Colors.grey.shade100,
                ),
              ),

            // RUTA 12: Chip fecha específica
            const SizedBox(width: 8),
            ActionChip(
              avatar: Icon(
                Icons.today,
                size: 18,
                color: _fechaEspecifica != null
                    ? Colors.purple.shade700
                    : Colors.grey,
              ),
              label: Text(
                _fechaEspecifica != null
                    ? dateFormat.format(_fechaEspecifica!)
                    : 'Día específico',
              ),
              onPressed: _seleccionarFechaEspecifica,
              backgroundColor: _fechaEspecifica != null
                  ? Colors.purple.shade50
                  : Colors.grey.shade100,
            ),

            // RUTA 12: Dropdown de tipos de servicio
            if (_tiposServicio.isNotEmpty) ...[
              const SizedBox(width: 8),
              PopupMenuButton<int?>(
                initialValue: _idTipoServicioSeleccionado,
                onSelected: (value) {
                  setState(() => _idTipoServicioSeleccionado = value);
                  _cargarDatos();
                },
                itemBuilder: (context) => [
                  const PopupMenuItem<int?>(
                    value: null,
                    child: Text('Todos los servicios'),
                  ),
                  const PopupMenuDivider(),
                  ..._tiposServicio.map(
                    (t) => PopupMenuItem<int?>(
                      value: t.id,
                      child: Text('${t.codigo} - ${t.nombre}'),
                    ),
                  ),
                ],
                child: Chip(
                  avatar: Icon(
                    Icons.build,
                    size: 18,
                    color: _idTipoServicioSeleccionado != null
                        ? Colors.blue.shade700
                        : Colors.grey,
                  ),
                  label: Text(
                    _idTipoServicioSeleccionado != null
                        ? _tiposServicio
                              .firstWhere(
                                (t) => t.id == _idTipoServicioSeleccionado,
                              )
                              .codigo
                        : 'Servicio',
                  ),
                  backgroundColor: _idTipoServicioSeleccionado != null
                      ? Colors.blue.shade50
                      : Colors.grey.shade100,
                ),
              ),
            ],

            // Botón limpiar (si hay filtros)
            if (tieneFiltroDeFecha ||
                _idClienteSeleccionado != null ||
                _fechaEspecifica != null ||
                _idTipoServicioSeleccionado != null) ...[
              const SizedBox(width: 8),
              ActionChip(
                avatar: const Icon(Icons.clear, size: 18, color: Colors.red),
                label: const Text('Limpiar'),
                onPressed: _limpiarFiltros,
                backgroundColor: Colors.red.shade50,
              ),
            ],
          ],
        ),
      ),
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
            onPressed: _cargarDatos,
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
          Icon(Icons.history, size: 80, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No hay órdenes finalizadas',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _busquedaController.text.isNotEmpty ||
                    _fechaDesde != null ||
                    _fechaHasta != null
                ? 'Prueba con otros filtros'
                : 'Las órdenes completadas aparecerán aquí',
            style: TextStyle(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildLista() {
    return RefreshIndicator(
      onRefresh: () => _cargarDatos(mostrarLoading: false),
      child: ListView.builder(
        key: const PageStorageKey<String>('historial_list'),
        controller: _scrollController,
        padding: const EdgeInsets.all(12),
        itemCount: _ordenes.length,
        itemBuilder: (context, index) {
          final orden = _ordenes[index];
          return _HistorialCard(
            orden: orden,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      HistorialDetalleScreen(idOrdenLocal: orden.idLocal),
                ),
              ).then((_) => _refrescar());
            },
          );
        },
      ),
    );
  }
}

/// Card de orden en historial
class _HistorialCard extends StatelessWidget {
  final OrdenHistorialDto orden;
  final VoidCallback onTap;

  const _HistorialCard({required this.orden, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'es');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cabecera: número de orden y tipo de servicio
              Row(
                children: [
                  // Número de orden con Flexible para evitar overflow
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle,
                            size: 16,
                            color: Colors.green.shade700,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              orden.numeroOrden,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.green.shade700,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Tipo de servicio con ancho máximo
                  Container(
                    constraints: const BoxConstraints(maxWidth: 100),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      orden.codigoTipoServicio,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Cliente
              Row(
                children: [
                  Icon(Icons.business, size: 18, color: Colors.grey.shade600),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      orden.nombreCliente,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Equipo
              Row(
                children: [
                  Icon(
                    Icons.precision_manufacturing,
                    size: 18,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${orden.nombreEquipo}${orden.marcaEquipo != null ? ' - ${orden.marcaEquipo}' : ''}',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Fecha y duración
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    // Fecha de finalización
                    Expanded(
                      child: Row(
                        children: [
                          Icon(
                            Icons.event_available,
                            size: 18,
                            color: Colors.green.shade600,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            orden.fechaFin != null
                                ? dateFormat.format(orden.fechaFin!)
                                : 'Sin fecha',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Duración
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.timer,
                            size: 16,
                            color: Colors.orange.shade700,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            orden.duracionFormateada,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.orange.shade700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Trabajo realizado (preview)
              if (orden.trabajoRealizado != null &&
                  orden.trabajoRealizado!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  orden.trabajoRealizado!,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],

              // Indicador de ver más
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Ver detalle',
                    style: TextStyle(
                      color: Colors.green.shade600,
                      fontWeight: FontWeight.w500,
                      fontSize: 13,
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    color: Colors.green.shade600,
                    size: 20,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
