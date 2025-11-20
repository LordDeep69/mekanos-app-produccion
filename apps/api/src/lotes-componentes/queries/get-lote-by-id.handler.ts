import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ILotesComponentesRepository } from '../interfaces/lotes-componentes.repository.interface';
import { GetLoteByIdQuery } from './get-lote-by-id.query';

@QueryHandler(GetLoteByIdQuery)
export class GetLoteByIdHandler implements IQueryHandler<GetLoteByIdQuery> {
  constructor(
    @Inject('ILotesComponentesRepository')
    private readonly repository: ILotesComponentesRepository,
  ) {}

  async execute(query: GetLoteByIdQuery) {
    const lote = await this.repository.findById(query.id_lote);
    if (!lote) {
      throw new NotFoundException(
        `Lote con ID ${query.id_lote} no encontrado`,
      );
    }
    return lote;
  }
}
