import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetOrdenByIdQuery } from './get-orden-by-id.query';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';

@QueryHandler(GetOrdenByIdQuery)
export class GetOrdenByIdHandler implements IQueryHandler<GetOrdenByIdQuery> {
  constructor(private readonly repository: PrismaOrdenServicioRepository) {}

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

    return orden;
  }
}
