import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ITiposComponenteRepository } from '../../domain/tipos-componente.repository.interface';
import { TIPOS_COMPONENTE_REPOSITORY } from '../../tipos-componente.constants';
import { GetTiposComponenteQuery } from './get-tipos-componente.query';

@QueryHandler(GetTiposComponenteQuery)
export class GetTiposComponenteHandler
  implements IQueryHandler<GetTiposComponenteQuery>
{
  constructor(
    @Inject(TIPOS_COMPONENTE_REPOSITORY)
    private readonly repository: ITiposComponenteRepository,
  ) {}

  async execute(query: GetTiposComponenteQuery) {
    return await this.repository.findAll({
      categoria: query.categoria,
      aplica_a: query.aplica_a,
      es_consumible: query.es_consumible,
      es_inventariable: query.es_inventariable,
      activo: query.activo,
      page: query.page,
      limit: query.limit,
    });
  }
}
