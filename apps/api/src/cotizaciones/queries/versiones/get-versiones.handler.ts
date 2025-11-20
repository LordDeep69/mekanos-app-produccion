import { PrismaService } from '@mekanos/database';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVersionesQuery } from './get-versiones.query';

/**
 * GetVersionesHandler
 * FASE 4.8: Lista versiones históricas cotización
 */
@QueryHandler(GetVersionesQuery)
export class GetVersionesHandler implements IQueryHandler<GetVersionesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetVersionesQuery) {
    const { idCotizacion, skip = 0, take = 50 } = query;

    // Validar cotización existe
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: {
        id_cotizacion: true,
        numero_cotizacion: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    // Obtener versiones ordenadas descendente (más reciente primero)
    const versiones = await this.prisma.versiones_cotizacion.findMany({
      where: { id_cotizacion: idCotizacion },
      orderBy: { numero_version: 'desc' },
      skip,
      take,
      include: {
        usuarios: {
          select: {
            id_usuario: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Total versiones para paginación
    const total = await this.prisma.versiones_cotizacion.count({
      where: { id_cotizacion: idCotizacion },
    });

    return {
      cotizacion: {
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
      },
      versiones: versiones.map((v) => ({
        id_version: v.id_version,
        numero_version: v.numero_version,
        fecha_creacion: v.fecha_version,
        motivo_cambio: v.motivo_cambio,
        resumen_cambios: v.resumen_cambios,
        subtotal: v.subtotal_version,
        total: v.total_version,
        creada_por: v.usuarios?.username,
        // Contar items sin incluir JSONB completo (performance)
        items_servicios_count: Array.isArray(v.items_servicios) ? v.items_servicios.length : 0,
        items_componentes_count: Array.isArray(v.items_componentes) ? v.items_componentes.length : 0,
      })),
      pagination: {
        total,
        skip,
        take,
        has_more: skip + take < total,
      },
    };
  }
}
