import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { HistorialEstadosOrdenRepositoryInterface } from '../../domain/historial-estados-orden.repository.interface';

export class ListarHistorialEstadosOrdenQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

@QueryHandler(ListarHistorialEstadosOrdenQuery)
export class ListarHistorialEstadosOrdenHandler
  implements IQueryHandler<ListarHistorialEstadosOrdenQuery>
{
  constructor(
    @Inject('HistorialEstadosOrdenRepositoryInterface')
    private readonly repository: HistorialEstadosOrdenRepositoryInterface,
  ) {}

  async execute(query: ListarHistorialEstadosOrdenQuery): Promise<any> {
    return await this.repository.listar(query.page, query.limit);
  }
}
