import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { GetOrdenByIdQuery } from './get-orden-by-id.query';

@QueryHandler(GetOrdenByIdQuery)
export class GetOrdenByIdHandler implements IQueryHandler<GetOrdenByIdQuery> {
  constructor(private readonly repository: PrismaOrdenServicioRepository) { }

  async execute(query: GetOrdenByIdQuery): Promise<any> {
    // ✅ OPTIMIZADO 05-ENE-2026: Usar findByIdOptimizado para carga rápida
    // Las relaciones pesadas (actividades, mediciones, evidencias) se cargan bajo demanda
    const orden = await this.repository.findByIdOptimizado(query.ordenId);

    if (!orden) {
      throw new NotFoundException(`Orden de servicio ${query.ordenId} no encontrada`);
    }

    // ✅ FIX: Transformar ordenes_equipos para que use 'equipo' (singular) en lugar de 'equipos' (plural)
    // El frontend espera 'equipo' pero Prisma retorna 'equipos' según el nombre de la relación en el schema
    if (orden.ordenes_equipos && Array.isArray(orden.ordenes_equipos)) {
      orden.ordenes_equipos = orden.ordenes_equipos.map((oe: any) => ({
        ...oe,
        equipo: oe.equipos, // Renombrar equipos → equipo
        equipos: undefined, // Eliminar la propiedad original
      }));
    }

    return orden;
  }
}
