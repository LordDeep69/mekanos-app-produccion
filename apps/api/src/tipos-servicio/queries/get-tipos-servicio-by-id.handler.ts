import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from '../infrastructure/prisma-tipos-servicio.repository';
import { GetTiposServicioByIdQuery } from './get-tipos-servicio-by-id.query';

/**
 * Handler: Obtener tipo de servicio por ID
 * 
 * Retorna tipo de servicio con relaciones completas
 * Repository lanza NotFoundException si no existe
 */
@QueryHandler(GetTiposServicioByIdQuery)
export class GetTiposServicioByIdHandler
  implements IQueryHandler<GetTiposServicioByIdQuery>
{
  constructor(
    private readonly repository: PrismaTiposServicioRepository,
  ) {}

  async execute(query: GetTiposServicioByIdQuery) {
    return this.repository.findById(query.id);
  }
}
