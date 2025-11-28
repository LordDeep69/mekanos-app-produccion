import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { HistorialEstadosOrdenRepositoryInterface } from '../../domain/historial-estados-orden.repository.interface';

export class ListarHistorialPorOrdenQuery {
  constructor(
    public readonly idOrden: number,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarHistorialPorOrdenQuery)
export class ListarHistorialPorOrdenHandler
  implements IQueryHandler<ListarHistorialPorOrdenQuery>
{
  constructor(
    @Inject('HistorialEstadosOrdenRepositoryInterface')
    private readonly repository: HistorialEstadosOrdenRepositoryInterface,
  ) {}

  async execute(query: ListarHistorialPorOrdenQuery): Promise<any> {
    return await this.repository.listarPorOrden(
      query.idOrden,
      query.page,
      query.limit,
    );
  }
}
