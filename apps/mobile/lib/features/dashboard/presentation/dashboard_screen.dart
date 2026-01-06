import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../orders/presentation/ordenes_list_screen.dart';
import '../data/dashboard_service.dart';

/// Pantalla de Dashboard del técnico
///
/// Muestra métricas clave de rendimiento:
/// - Órdenes completadas (hoy/semana/mes)
/// - Órdenes pendientes y urgentes
/// - Tiempo promedio de servicio
/// - Calidad del checklist
/// - Distribución por tipo de servicio
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  DashboardMetricsDto? _metrics;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarMetricas();
  }

  Future<void> _cargarMetricas({bool forceRefresh = false}) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(dashboardServiceProvider);
      final metrics = await service.getMetrics(forceRefresh: forceRefresh);

      if (mounted) {
        setState(() {
          _metrics = metrics;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar métricas: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('Mi Dashboard'),
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _cargarMetricas(forceRefresh: true),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _buildError()
          : _buildContent(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(_error!, style: TextStyle(color: Colors.red.shade700)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => _cargarMetricas(forceRefresh: true),
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final metrics = _metrics!;

    return RefreshIndicator(
      onRefresh: () => _cargarMetricas(forceRefresh: true),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header con saludo y fecha
            _buildHeader(metrics),
            const SizedBox(height: 20),

            // v2: Indicador de racha (si tiene racha activa)
            if (metrics.tieneRacha) ...[
              _buildRachaCard(metrics),
              const SizedBox(height: 16),
            ],

            // Alerta de urgentes (si hay)
            if (metrics.tieneUrgentes) ...[
              _buildAlertaUrgentes(metrics),
              const SizedBox(height: 16),
            ],

            // Cards de órdenes
            _buildSeccionTitulo('📊 Órdenes Completadas'),
            const SizedBox(height: 12),
            _buildOrdenesGrid(metrics),
            const SizedBox(height: 24),

            // Card de pendientes
            _buildSeccionTitulo('⏳ Órdenes Pendientes'),
            const SizedBox(height: 12),
            _buildPendientesCard(metrics),
            const SizedBox(height: 24),

            // Métricas de rendimiento
            _buildSeccionTitulo('🎯 Rendimiento'),
            const SizedBox(height: 12),
            _buildRendimientoGrid(metrics),
            const SizedBox(height: 24),

            // Distribución por tipo
            if (metrics.distribucionPorTipo.isNotEmpty) ...[
              _buildSeccionTitulo('📈 Por Tipo de Servicio'),
              const SizedBox(height: 12),
              _buildDistribucionCard(metrics),
              const SizedBox(height: 24),
            ],

            // Footer con última actualización
            _buildFooter(metrics),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(DashboardMetricsDto metrics) {
    final hora = DateTime.now().hour;
    String saludo;
    if (hora < 12) {
      saludo = '¡Buenos días!';
    } else if (hora < 18) {
      saludo = '¡Buenas tardes!';
    } else {
      saludo = '¡Buenas noches!';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo.shade700, Colors.indigo.shade500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.indigo.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  saludo,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('EEEE, d MMMM yyyy', 'es').format(DateTime.now()),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${metrics.totalOrdenesCompletadas} servicios realizados',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.engineering, color: Colors.white, size: 40),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertaUrgentes(DashboardMetricsDto metrics) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.red.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.warning_amber, color: Colors.red.shade700),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${metrics.ordenesUrgentes} orden${metrics.ordenesUrgentes > 1 ? 'es' : ''} urgente${metrics.ordenesUrgentes > 1 ? 's' : ''}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red.shade700,
                  ),
                ),
                Text(
                  'Requiere${metrics.ordenesUrgentes > 1 ? 'n' : ''} atención inmediata',
                  style: TextStyle(color: Colors.red.shade600, fontSize: 13),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: Colors.red.shade400),
        ],
      ),
    );
  }

  /// v2: Card de racha con animación de fuego
  Widget _buildRachaCard(DashboardMetricsDto metrics) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.orange.shade400, Colors.deepOrange.shade500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Text('🔥', style: TextStyle(fontSize: 28)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '¡Racha de ${metrics.rachaActual} días!',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
                const Text(
                  'Sigue así, vas muy bien 💪',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeccionTitulo(String titulo) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              color: Colors.indigo.shade700,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            titulo.toUpperCase(),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.blueGrey.shade800,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdenesGrid(DashboardMetricsDto metrics) {
    return Row(
      children: [
        // v3: Card "Hoy" interactivo - tap para ver órdenes de hoy
        Expanded(
          child: GestureDetector(
            onTap: () => _irAOrdenesHoy(),
            child: _buildMetricCard(
              titulo: 'Hoy',
              valor: metrics.ordenesHoy.toString(),
              icono: Icons.today,
              color: Colors.blue,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCardConTendencia(
            titulo: 'Semana',
            valor: metrics.ordenesSemana.toString(),
            tendencia: metrics.tendenciaSemana,
            mejora: metrics.mejoroVsSemanaAnterior,
            icono: Icons.date_range,
            color: Colors.teal,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            titulo: 'Mes',
            valor: metrics.ordenesMes.toString(),
            icono: Icons.calendar_month,
            color: Colors.purple,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCardConTendencia({
    required String titulo,
    required String valor,
    required String tendencia,
    required bool mejora,
    required IconData icono,
    required Color color,
  }) {
    return Card(
      elevation: 1.5,
      shadowColor: color.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.02),
          border: Border(top: BorderSide(color: color, width: 3)),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icono, color: color, size: 18),
            ),
            const SizedBox(height: 6),
            Text(
              valor,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              titulo.toUpperCase(),
              style: TextStyle(
                color: Colors.blueGrey.shade700,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: mejora ? Colors.green.shade50 : Colors.orange.shade50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: mejora
                      ? Colors.green.shade100
                      : Colors.orange.shade100,
                ),
              ),
              child: Text(
                tendencia,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: mejora
                      ? Colors.green.shade700
                      : Colors.orange.shade700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String titulo,
    required String valor,
    required IconData icono,
    required Color color,
  }) {
    return Card(
      elevation: 1.5,
      shadowColor: color.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.02),
          border: Border(top: BorderSide(color: color, width: 3)),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icono, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              valor,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              titulo.toUpperCase(),
              style: TextStyle(
                color: Colors.blueGrey.shade700,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// v3: Card de pendientes con acceso rápido (tap para ir a lista filtrada)
  Widget _buildPendientesCard(DashboardMetricsDto metrics) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Card Pendientes - tap para ir a lista
          Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(12),
                ),
                onTap: metrics.ordenesPendientes > 0
                    ? () => _irAOrdenesPendientes()
                    : null,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _buildPendienteItem(
                    titulo: 'Pendientes',
                    valor: metrics.ordenesPendientes,
                    color: Colors.orange,
                    icono: Icons.pending_actions,
                    tapeable: metrics.ordenesPendientes > 0,
                  ),
                ),
              ),
            ),
          ),
          Container(width: 1, height: 50, color: Colors.grey.shade200),
          // Card Urgentes - tap para ir a lista filtrada
          Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: const BorderRadius.horizontal(
                  right: Radius.circular(12),
                ),
                onTap: metrics.ordenesUrgentes > 0
                    ? () => _irAOrdenesUrgentes()
                    : null,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _buildPendienteItem(
                    titulo: 'Urgentes',
                    valor: metrics.ordenesUrgentes,
                    color: Colors.red,
                    icono: Icons.priority_high,
                    tapeable: metrics.ordenesUrgentes > 0,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// v3: Navega a lista de órdenes pendientes
  void _irAOrdenesPendientes() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const OrdenesListScreen(filtroInicial: 'pendientes'),
      ),
    );
  }

  /// v3: Navega a lista de órdenes urgentes
  void _irAOrdenesUrgentes() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const OrdenesListScreen(filtroInicial: 'urgentes'),
      ),
    );
  }

  /// v3: Navega a lista de órdenes de hoy
  void _irAOrdenesHoy() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const OrdenesListScreen(filtroInicial: 'hoy'),
      ),
    );
  }

  Widget _buildPendienteItem({
    required String titulo,
    required int valor,
    required Color color,
    required IconData icono,
    bool tapeable = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icono, color: color, size: 24),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              valor.toString(),
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
                letterSpacing: -0.5,
              ),
            ),
            Row(
              children: [
                Text(
                  titulo.toUpperCase(),
                  style: TextStyle(
                    color: Colors.blueGrey.shade700,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                if (tapeable) ...[
                  const SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 14,
                    color: color.withValues(alpha: 0.6),
                  ),
                ],
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRendimientoGrid(DashboardMetricsDto metrics) {
    return Row(
      children: [
        Expanded(
          child: _buildRendimientoCard(
            titulo: 'Tiempo Promedio',
            valor: metrics.tiempoPromedioFormateado,
            subtitulo: 'por servicio',
            icono: Icons.timer,
            color: Colors.amber.shade700,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildRendimientoCard(
            titulo: 'Checklist OK',
            valor: '${metrics.porcentajeChecklistOK.toStringAsFixed(1)}%',
            subtitulo: 'estado Bueno',
            icono: Icons.check_circle,
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildRendimientoCard({
    required String titulo,
    required String valor,
    required String subtitulo,
    required IconData icono,
    required Color color,
  }) {
    return Card(
      elevation: 1.5,
      shadowColor: color.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.02),
          border: Border(left: BorderSide(color: color, width: 4)),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icono, color: color, size: 18),
                const SizedBox(width: 6),
                Text(
                  titulo.toUpperCase(),
                  style: TextStyle(
                    color: Colors.blueGrey.shade700,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              valor,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: color,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              subtitulo,
              style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDistribucionCard(DashboardMetricsDto metrics) {
    final total = metrics.distribucionPorTipo.fold<int>(
      0,
      (sum, e) => sum + e.cantidad,
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: metrics.distribucionPorTipo.map((tipo) {
          final porcentaje = total > 0 ? (tipo.cantidad / total) * 100 : 0.0;
          final color = _getColorForTipo(tipo.codigo);

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: Text(
                    tipo.codigo,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                Expanded(
                  flex: 5,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: porcentaje / 100,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                      minHeight: 8,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 40,
                  child: Text(
                    tipo.cantidad.toString(),
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Color _getColorForTipo(String codigo) {
    final colors = [
      Colors.blue,
      Colors.teal,
      Colors.purple,
      Colors.orange,
      Colors.pink,
    ];
    final index = codigo.hashCode.abs() % colors.length;
    return colors[index];
  }

  Widget _buildFooter(DashboardMetricsDto metrics) {
    final formato = DateFormat('HH:mm', 'es');
    return Center(
      child: Text(
        'Actualizado a las ${formato.format(metrics.ultimaActualizacion)}',
        style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
      ),
    );
  }
}
