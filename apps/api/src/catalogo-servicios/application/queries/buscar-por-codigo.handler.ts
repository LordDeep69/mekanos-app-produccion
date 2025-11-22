import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { BuscarPorCodigoQuery } from './buscar-por-codigo.query';

@QueryHandler(BuscarPorCodigoQuery)
export class BuscarPorCodigoHandler implements IQueryHandler<BuscarPorCodigoQuery> {
  constructor(private readonly repository: PrismaCatalogoServiciosRepository) {}

  async execute(query: BuscarPorCodigoQuery) {
    const servicio = await this.repository.findByCodigo(query.codigo);
    
    if (!servicio) {
      throw new NotFoundException(`Servicio con código '${query.codigo}' no encontrado`);
    }

    return servicio;
  }
}
