import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { GetOrdenByIdQuery } from './get-orden-by-id.query';

@QueryHandler(GetOrdenByIdQuery)
export class GetOrdenByIdHandler implements IQueryHandler<GetOrdenByIdQuery> {
  constructor(private readonly repository: PrismaOrdenServicioRepository) { }

  async execute(query: GetOrdenByIdQuery): Promise<any> {
    try {
      // ✅ OPTIMIZADO 05-ENE-2026: Usar findByIdOptimizado para carga rápida
      // Las relaciones pesadas (actividades, mediciones, evidencias) se cargan bajo demanda
      const orden = await this.repository.findByIdOptimizado(query.ordenId);

      if (!orden) {
        throw new NotFoundException(`Orden de servicio ${query.ordenId} no encontrada`);
      }

      // ✅ FIX 10-FEB-2026: Transformación segura de ordenes_equipos
      // El frontend espera 'equipo' pero Prisma retorna 'equipos' según el nombre de la relación
      if (orden.ordenes_equipos && Array.isArray(orden.ordenes_equipos)) {
        orden.ordenes_equipos = orden.ordenes_equipos.map((oe: any) => ({
          ...oe,
          equipo: oe.equipos || null, // Renombrar equipos → equipo (con null-safety)
          equipos: undefined, // Eliminar la propiedad original
        }));
      }

      return orden;
    } catch (error) {
      // ✅ FIX 10-FEB-2026: Loguear error completo para debugging
      console.error(`[GetOrdenByIdHandler] Error al obtener orden ${query.ordenId}:`, error);
      throw error;
    }
  }
}
