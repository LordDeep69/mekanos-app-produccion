import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ILotesComponentesRepository } from '../interfaces/lotes-componentes.repository.interface';
import { GetLotesQuery } from './get-lotes.query';

@QueryHandler(GetLotesQuery)
export class GetLotesHandler implements IQueryHandler<GetLotesQuery> {
  constructor(
    @Inject('ILotesComponentesRepository')
    private readonly repository: ILotesComponentesRepository,
  ) {}

  async execute(query: GetLotesQuery) {
    const filtros = {
      id_componente: query.id_componente,
      estado_lote: query.estado_lote,
      page: query.page,
      limit: query.limit,
    };
    return this.repository.findAll(filtros);
  }
}
