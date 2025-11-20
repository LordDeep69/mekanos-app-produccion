import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ITiposEquipoRepository } from '../../domain/tipos-equipo.repository.interface';
import { TIPOS_EQUIPO_REPOSITORY } from '../../tipos-equipo.constants';
import { GetTipoEquipoByIdQuery } from './get-tipo-equipo-by-id.query';

@QueryHandler(GetTipoEquipoByIdQuery)
export class GetTipoEquipoByIdHandler
  implements IQueryHandler<GetTipoEquipoByIdQuery>
{
  constructor(
    @Inject(TIPOS_EQUIPO_REPOSITORY)
    private readonly repository: ITiposEquipoRepository,
  ) {}

  async execute(query: GetTipoEquipoByIdQuery) {
    const tipoEquipo = await this.repository.findById(query.id);

    if (!tipoEquipo) {
      throw new NotFoundException(
        `Tipo de equipo con ID ${query.id} no encontrado`,
      );
    }

    return tipoEquipo;
  }
}
