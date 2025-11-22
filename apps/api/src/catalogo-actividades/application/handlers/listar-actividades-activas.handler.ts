import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';

export class ListarActividadesActivasQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarActividadesActivasQuery)
export class ListarActividadesActivasHandler implements IQueryHandler<ListarActividadesActivasQuery> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(query: ListarActividadesActivasQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const { data, total } = await this.repository.findActive(skip, limit);

    return {
      data: data.map(entity => CatalogoActividadesMapper.toCamelCase(entity)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
