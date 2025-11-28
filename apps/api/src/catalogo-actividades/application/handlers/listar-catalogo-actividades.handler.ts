import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';

export class ListarCatalogoActividadesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarCatalogoActividadesQuery)
export class ListarCatalogoActividadesHandler implements IQueryHandler<ListarCatalogoActividadesQuery> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(query: ListarCatalogoActividadesQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const { data, total } = await this.repository.findAll(skip, limit);

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
