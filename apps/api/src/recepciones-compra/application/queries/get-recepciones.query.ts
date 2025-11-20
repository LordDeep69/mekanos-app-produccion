import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IRecepcionesCompraRepository } from '../../domain/recepciones-compra.repository';

export class GetRecepcionesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly id_orden_compra?: number,
  ) {}
}

@QueryHandler(GetRecepcionesQuery)
export class GetRecepcionesHandler implements IQueryHandler<GetRecepcionesQuery> {
  constructor(
    @Inject('IRecepcionesCompraRepository')
    private readonly repository: IRecepcionesCompraRepository,
  ) {}

  async execute(query: GetRecepcionesQuery) {
    const skip = (query.page - 1) * query.limit;
    const { data, total } = await this.repository.findAll({
      skip,
      take: query.limit,
      id_orden_compra: query.id_orden_compra,
    });

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
