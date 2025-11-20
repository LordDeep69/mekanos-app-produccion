import { PrismaService } from '@mekanos/database';
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAprobacionesPendientesQuery } from './get-aprobaciones-pendientes.query';

/**
 * GET APROBACIONES PENDIENTES HANDLER
 *
 * Lista aprobaciones pendientes para Dashboard supervisor/gerente
 */
@Injectable()
@QueryHandler(GetAprobacionesPendientesQuery)
export class GetAprobacionesPendientesHandler
  implements IQueryHandler<GetAprobacionesPendientesQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAprobacionesPendientesQuery): Promise<any> {
    const where: any = {
      estado_aprobacion: 'PENDIENTE',
    };

    if (query.nivelAprobacion) {
      where.nivel_aprobacion = query.nivelAprobacion;
    }

    const [aprobaciones, total] = await Promise.all([
      this.prisma.aprobaciones_cotizacion.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: {
          fecha_solicitud: 'asc', // Más antiguas primero (FIFO)
        },
        include: {
          cotizacion: {
            select: {
              id_cotizacion: true,
              numero_cotizacion: true,
              asunto: true,
              total_cotizacion: true,
              descuento_porcentaje: true,
              fecha_cotizacion: true,
            },
          },
        },
      }),
      this.prisma.aprobaciones_cotizacion.count({ where }),
    ]);

    return {
      data: aprobaciones,
      total,
      skip: query.skip,
      take: query.take,
      hasMore: query.skip + query.take < total,
    };
  }
}
