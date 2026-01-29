import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/database/app_database.dart';
import '../../../../core/database/database_service.dart';

/// Provider para obtener los equipos de una orden
final equiposOrdenProvider = FutureProvider.family<List<OrdenesEquipo>, int>((
  ref,
  idOrdenServicio,
) async {
  final db = ref.watch(databaseProvider);
  final equipos = await db.getEquiposByOrdenServicio(idOrdenServicio);
  // Debug: Log para diagnosticar problema multiequipo
  debugPrint(
    '🔍 [MULTIEQUIPO-WIDGET] getEquiposByOrdenServicio($idOrdenServicio) → ${equipos.length} equipos',
  );
  if (equipos.isNotEmpty) {
    for (final e in equipos) {
      debugPrint(
        '   📦 idOrdenEquipo=${e.idOrdenEquipo}, idEquipo=${e.idEquipo}, codigo=${e.codigoEquipo}',
      );
    }
  }
  return equipos;
});

/// Widget que muestra la lista de equipos de una orden multi-equipo.
/// Si la orden solo tiene un equipo (o ninguno en la tabla intermedia),
/// este widget no se muestra o muestra un mensaje apropiado.
class EquiposOrdenWidget extends ConsumerWidget {
  final int idOrdenServicio;
  final Function(OrdenesEquipo equipo)? onEquipoSelected;
  final int? equipoSeleccionadoId;

  const EquiposOrdenWidget({
    super.key,
    required this.idOrdenServicio,
    this.onEquipoSelected,
    this.equipoSeleccionadoId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final equiposAsync = ref.watch(equiposOrdenProvider(idOrdenServicio));

    return equiposAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (error, stack) => const SizedBox.shrink(),
      data: (equipos) {
        // Si no hay equipos en la tabla intermedia, es orden simple (1 equipo)
        if (equipos.isEmpty) {
          return const SizedBox.shrink();
        }

        // Si solo hay 1 equipo, no mostrar selector
        if (equipos.length == 1) {
          return const SizedBox.shrink();
        }

        // Multi-equipos: mostrar lista
        return _buildEquiposList(context, equipos);
      },
    );
  }

  Widget _buildEquiposList(BuildContext context, List<OrdenesEquipo> equipos) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(Icons.devices_other, color: Colors.blue.shade700),
                const SizedBox(width: 8),
                Text(
                  'Equipos de la Orden (${equipos.length})',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Lista de equipos
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: equipos.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final equipo = equipos[index];
              final isSelected = equipoSeleccionadoId == equipo.idOrdenEquipo;

              return _buildEquipoTile(context, equipo, isSelected);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEquipoTile(
    BuildContext context,
    OrdenesEquipo equipo,
    bool isSelected,
  ) {
    // Determinar color según estado
    Color estadoColor;
    IconData estadoIcon;
    switch (equipo.estado.toUpperCase()) {
      case 'COMPLETADO':
      case 'FINALIZADO':
        estadoColor = Colors.green;
        estadoIcon = Icons.check_circle;
        break;
      case 'EN_PROCESO':
      case 'EN PROCESO':
        estadoColor = Colors.orange;
        estadoIcon = Icons.pending;
        break;
      case 'PENDIENTE':
      default:
        estadoColor = Colors.grey;
        estadoIcon = Icons.radio_button_unchecked;
    }

    return Material(
      color: isSelected ? Colors.blue.shade100 : Colors.transparent,
      child: InkWell(
        onTap: onEquipoSelected != null
            ? () => onEquipoSelected!(equipo)
            : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              // Número de secuencia
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isSelected ? Colors.blue : Colors.grey.shade300,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '${equipo.ordenSecuencia}',
                    style: TextStyle(
                      color: isSelected ? Colors.white : Colors.black87,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Info del equipo
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      equipo.nombreSistema ??
                          equipo.nombreEquipo ??
                          'Equipo ${equipo.ordenSecuencia}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    if (equipo.codigoEquipo != null)
                      Text(
                        equipo.codigoEquipo!,
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              // Estado
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(estadoIcon, color: estadoColor, size: 20),
                  const SizedBox(width: 4),
                  Text(
                    _formatEstado(equipo.estado),
                    style: TextStyle(
                      color: estadoColor,
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              // Flecha si es seleccionable
              if (onEquipoSelected != null) ...[
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, color: Colors.grey.shade400),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatEstado(String estado) {
    switch (estado.toUpperCase()) {
      case 'COMPLETADO':
      case 'FINALIZADO':
        return 'Completado';
      case 'EN_PROCESO':
      case 'EN PROCESO':
        return 'En Proceso';
      case 'PENDIENTE':
        return 'Pendiente';
      default:
        return estado;
    }
  }
}

/// Widget compacto para mostrar en el header de ejecución
class EquipoActualIndicator extends StatelessWidget {
  final OrdenesEquipo equipo;
  final int totalEquipos;
  final VoidCallback? onTap;

  const EquipoActualIndicator({
    super.key,
    required this.equipo,
    required this.totalEquipos,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.blue.shade700,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.build, color: Colors.white, size: 16),
            const SizedBox(width: 6),
            Text(
              '${equipo.ordenSecuencia}/$totalEquipos: ${equipo.nombreSistema ?? equipo.nombreEquipo ?? "Equipo"}',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 4),
              const Icon(Icons.swap_horiz, color: Colors.white70, size: 14),
            ],
          ],
        ),
      ),
    );
  }
}
