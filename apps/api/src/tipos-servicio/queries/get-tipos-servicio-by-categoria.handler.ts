import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from '../infrastructure/prisma-tipos-servicio.repository';
import { GetTiposServicioByCategoriaQuery } from './get-tipos-servicio-by-categoria.query';

/**
 * Handler: Obtener tipos de servicio por categoría
 * 
 * Retorna tipos de servicio filtrados por categoría
 * Útil para dropdowns y filtros frontend
 */
@QueryHandler(GetTiposServicioByCategoriaQuery)
export class GetTiposServicioByCategoriaHandler
  implements IQueryHandler<GetTiposServicioByCategoriaQuery>
{
  constructor(
    private readonly repository: PrismaTiposServicioRepository,
  ) {}

  async execute(query: GetTiposServicioByCategoriaQuery) {
    return this.repository.findByCategoria(
      query.categoria,
      query.soloActivos,
    );
  }
}
