import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CatalogoActividadesFilterParams,
  CatalogoActividadesRepository,
} from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';

export class ListarCatalogoActividadesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 500,
    public readonly filters: Omit<CatalogoActividadesFilterParams, 'skip' | 'take'> = {},
  ) {}
}

@QueryHandler(ListarCatalogoActividadesQuery)
export class ListarCatalogoActividadesHandler implements IQueryHandler<ListarCatalogoActividadesQuery> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(query: ListarCatalogoActividadesQuery) {
    const { page, limit, filters } = query;
    const skip = (page - 1) * limit;

    const { data, total } = await this.repository.findFiltered({
      skip,
      take: limit,
      ...filters,
    });

    return {
      data: data.map((entity) => CatalogoActividadesMapper.toCamelCase(entity)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
