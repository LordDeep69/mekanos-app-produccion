import { PrismaService } from '@mekanos/database';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVersionDetalleQuery } from './get-version-detalle.query';

/**
 * GetVersionDetalleHandler
 * FASE 4.8: Obtiene detalle completo versión específica (incluye JSONB completo)
 */
@QueryHandler(GetVersionDetalleQuery)
export class GetVersionDetalleHandler implements IQueryHandler<GetVersionDetalleQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetVersionDetalleQuery) {
    const { idVersion } = query;

    const version = await this.prisma.versiones_cotizacion.findUnique({
      where: { id_version: idVersion },
      include: {
        cotizaciones: {
          select: {
            id_cotizacion: true,
            numero_cotizacion: true,
          },
        },
        usuarios: {
          select: {
            id_usuario: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(`Versión ${idVersion} no encontrada`);
    }

    return {
      id_version: version.id_version,
      numero_version: version.numero_version,
      fecha_creacion: version.fecha_version,
      motivo_cambio: version.motivo_cambio,
      subtotal: version.subtotal_version,
      total: version.total_version,
      resumen_cambios: version.resumen_cambios,
      creada_por: version.usuarios,
      cotizacion: version.cotizaciones,
      // JSONB completo (datos pesados - solo en detalle)
      datos_cotizacion: version.datos_cotizacion,
      items_servicios: version.items_servicios,
      items_componentes: version.items_componentes,
      metadata: version.metadata,
    };
  }
}
