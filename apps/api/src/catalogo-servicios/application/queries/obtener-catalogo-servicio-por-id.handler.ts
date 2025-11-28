import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { ObtenerCatalogoServicioPorIdQuery } from './obtener-catalogo-servicio-por-id.query';

@QueryHandler(ObtenerCatalogoServicioPorIdQuery)
export class ObtenerCatalogoServicioPorIdHandler
  implements IQueryHandler<ObtenerCatalogoServicioPorIdQuery>
{
  constructor(private readonly repository: PrismaCatalogoServiciosRepository) {}

  async execute(query: ObtenerCatalogoServicioPorIdQuery) {
    const servicio = await this.repository.findById(query.id);
    
    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${query.id} no encontrado`);
    }

    return servicio;
  }
}
