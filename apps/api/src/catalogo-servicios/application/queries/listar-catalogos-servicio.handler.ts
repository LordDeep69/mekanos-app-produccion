import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { ListarCatalogosServicioQuery } from './listar-catalogos-servicio.query';

@QueryHandler(ListarCatalogosServicioQuery)
export class ListarCatalogosServicioHandler
  implements IQueryHandler<ListarCatalogosServicioQuery>
{
  constructor(private readonly repository: PrismaCatalogoServiciosRepository) {}

  async execute(query: ListarCatalogosServicioQuery) {
    return this.repository.findAll({
      activo: query.activo,
      categoria: query.categoria,
      tipoServicioId: query.tipoServicioId,
      tipoEquipoId: query.tipoEquipoId,
    });
  }
}
