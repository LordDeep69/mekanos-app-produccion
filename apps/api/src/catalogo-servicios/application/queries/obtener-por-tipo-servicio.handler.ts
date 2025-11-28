import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { ObtenerPorTipoServicioQuery } from './obtener-por-tipo-servicio.query';

@QueryHandler(ObtenerPorTipoServicioQuery)
export class ObtenerPorTipoServicioHandler
  implements IQueryHandler<ObtenerPorTipoServicioQuery>
{
  constructor(private readonly repository: PrismaCatalogoServiciosRepository) {}

  async execute(query: ObtenerPorTipoServicioQuery) {
    return this.repository.findByTipoServicio(query.tipoServicioId);
  }
}
