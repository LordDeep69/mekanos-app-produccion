import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { GetOrdenByIdQuery } from './get-orden-by-id.query';

@QueryHandler(GetOrdenByIdQuery)
export class GetOrdenByIdHandler implements IQueryHandler<GetOrdenByIdQuery> {
  constructor(private readonly repository: PrismaOrdenServicioRepository) { }

  async execute(query: GetOrdenByIdQuery): Promise<any> {
    const orden = await this.repository.findById(query.ordenId);

    if (!orden) {
      throw new NotFoundException(`Orden de servicio ${query.ordenId} no encontrada`);
    }

    // Serializar BigInt en evidencias_fotograficas
    if (orden.evidencias_fotograficas) {
      orden.evidencias_fotograficas = orden.evidencias_fotograficas.map((ev: any) => ({
        ...ev,
        tama_o_bytes: ev.tama_o_bytes ? Number(ev.tama_o_bytes) : null,
        tama_o_original_bytes: ev.tama_o_original_bytes ? Number(ev.tama_o_original_bytes) : null,
      }));
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
