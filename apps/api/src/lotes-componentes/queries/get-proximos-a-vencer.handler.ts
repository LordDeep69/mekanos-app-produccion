import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ILotesComponentesRepository } from '../interfaces/lotes-componentes.repository.interface';
import { GetProximosAVencerQuery } from './get-proximos-a-vencer.query';

@QueryHandler(GetProximosAVencerQuery)
export class GetProximosAVencerHandler
  implements IQueryHandler<GetProximosAVencerQuery>
{
  constructor(
    @Inject('ILotesComponentesRepository')
    private readonly repository: ILotesComponentesRepository,
  ) {}

  async execute(query: GetProximosAVencerQuery) {
    return this.repository.findProximosAVencer(query.dias_anticipacion);
  }
}
