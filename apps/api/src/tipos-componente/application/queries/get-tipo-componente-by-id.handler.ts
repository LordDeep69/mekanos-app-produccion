import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ITiposComponenteRepository } from '../../domain/tipos-componente.repository.interface';
import { TIPOS_COMPONENTE_REPOSITORY } from '../../tipos-componente.constants';
import { GetTipoComponenteByIdQuery } from './get-tipo-componente-by-id.query';

@QueryHandler(GetTipoComponenteByIdQuery)
export class GetTipoComponenteByIdHandler
  implements IQueryHandler<GetTipoComponenteByIdQuery>
{
  constructor(
    @Inject(TIPOS_COMPONENTE_REPOSITORY)
    private readonly repository: ITiposComponenteRepository,
  ) {}

  async execute(query: GetTipoComponenteByIdQuery) {
    const tipoComponente = await this.repository.findById(query.id);

    if (!tipoComponente) {
      throw new NotFoundException(
        `Tipo de componente con ID ${query.id} no encontrado`,
      );
    }

    return tipoComponente;
  }
}
