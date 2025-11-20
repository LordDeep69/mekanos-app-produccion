import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CATALOGO_SISTEMAS_REPOSITORY } from '../../catalogo-sistemas.constants';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { GetCatalogoSistemasQuery } from './get-catalogo-sistemas.query';

@QueryHandler(GetCatalogoSistemasQuery)
export class GetCatalogoSistemasHandler
  implements IQueryHandler<GetCatalogoSistemasQuery>
{
  constructor(
    @Inject(CATALOGO_SISTEMAS_REPOSITORY)
    private readonly repository: ICatalogoSistemasRepository,
  ) {}

  async execute(query: GetCatalogoSistemasQuery) {
    const { data, total } = await this.repository.findAll(query);

    return {
      data,
      total,
      page: query.page || 1,
      totalPages: Math.ceil(total / (query.limit || 10)),
    };
  }
}
