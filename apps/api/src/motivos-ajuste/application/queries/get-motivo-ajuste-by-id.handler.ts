import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IMotivosAjusteRepository } from '../../domain/motivos-ajuste.repository.interface';
import { MOTIVOS_AJUSTE_REPOSITORY } from '../../motivos-ajuste.constants';
import { GetMotivoAjusteByIdQuery } from './get-motivo-ajuste-by-id.query';

@Injectable()
@QueryHandler(GetMotivoAjusteByIdQuery)
export class GetMotivoAjusteByIdHandler
  implements IQueryHandler<GetMotivoAjusteByIdQuery>
{
  constructor(
    @Inject(MOTIVOS_AJUSTE_REPOSITORY)
    private readonly repository: IMotivosAjusteRepository,
  ) {}

  async execute(query: GetMotivoAjusteByIdQuery) {
    const motivo = await this.repository.findById(query.id_motivo_ajuste);

    if (!motivo) {
      throw new NotFoundException(
        `Motivo ajuste con ID ${query.id_motivo_ajuste} no encontrado`,
      );
    }

    return motivo;
  }
}
