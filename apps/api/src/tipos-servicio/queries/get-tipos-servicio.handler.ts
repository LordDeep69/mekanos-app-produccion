import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from '../infrastructure/prisma-tipos-servicio.repository';
import { GetTiposServicioQuery } from './get-tipos-servicio.query';

/**
 * Handler: Obtener listado de tipos de servicio
 * 
 * Retorna listado paginado con filtros opcionales
 * Incluye metadata de paginación
 */
@QueryHandler(GetTiposServicioQuery)
export class GetTiposServicioHandler
  implements IQueryHandler<GetTiposServicioQuery>
{
  constructor(
    private readonly repository: PrismaTiposServicioRepository,
  ) {}

  async execute(query: GetTiposServicioQuery) {
    // Calcular skip para paginación
    const skip = (query.page - 1) * query.limit;

    // Construir filtros
    const filters = {
      skip,
      limit: query.limit,
      search: query.search,
      categoria: query.categoria,
      tipoEquipoId: query.tipoEquipoId,
      activo: query.activo,
    };

    // Obtener datos y total en paralelo
    const [data, total] = await Promise.all([
      this.repository.findAll(filters),
      this.repository.count(filters),
    ]);

    // Retornar con metadata de paginación
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
