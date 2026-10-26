import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { GetOrdenByIdQuery } from './get-orden-by-id.query';

@QueryHandler(GetOrdenByIdQuery)
export class GetOrdenByIdHandler implements IQueryHandler<GetOrdenByIdQuery> {
  constructor(private readonly repository: PrismaOrdenServicioRepository) { }

  async execute(query: GetOrdenByIdQuery): Promise<any> {
    try {
      const orden = await this.repository.findByIdOptimizado(query.ordenId);

      if (!orden) {
        throw new NotFoundException(`Orden de servicio ${query.ordenId} no encontrada`);
      }

      if (orden.ordenes_equipos && Array.isArray(orden.ordenes_equipos)) {
        orden.ordenes_equipos = orden.ordenes_equipos.map((oe: any) => ({
          ...oe,
          equipo: oe.equipos || null,
          equipos: undefined,
        }));
      }

      // ✅ HILO DE CASO (ENCADENAMIENTO FRACTAL VISITA 1 -> VISITA N):
      // Obtener el expediente completo del caso (visitas hermanas + resumen consolidado)
      const hiloCaso = await this.repository.obtenerHiloCaso(orden);
      orden.hilo_caso = hiloCaso;

      return orden;
    } catch (error) {
      console.error(`[GetOrdenByIdHandler] Error al obtener orden ${query.ordenId}:`, error);
      throw error;
    }
  }
}
