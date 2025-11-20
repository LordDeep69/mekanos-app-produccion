import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IMotivosAjusteRepository } from '../../domain/motivos-ajuste.repository.interface';
import { MOTIVOS_AJUSTE_REPOSITORY } from '../../motivos-ajuste.constants';
import { GetMotivosAjusteQuery } from './get-motivos-ajuste.query';

@Injectable()
@QueryHandler(GetMotivosAjusteQuery)
export class GetMotivosAjusteHandler
  implements IQueryHandler<GetMotivosAjusteQuery>
{
  constructor(
    @Inject(MOTIVOS_AJUSTE_REPOSITORY)
    private readonly repository: IMotivosAjusteRepository,
  ) {}

  async execute(query: GetMotivosAjusteQuery) {
    const { data, total } = await this.repository.findAll({
      activo: query.activo,
      categoria: query.categoria,
      page: query.page,
      limit: query.limit,
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
