import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EQUIPOS_GENERADOR_REPOSITORY_TOKEN } from '../../constants';
import { IEquiposGeneradorRepository } from '../../domain/equipos-generador.repository';

export class GetEquipoGeneradorByIdQuery {
  constructor(public readonly id_equipo: number) {}
}

@QueryHandler(GetEquipoGeneradorByIdQuery)
export class GetEquipoGeneradorByIdHandler implements IQueryHandler<GetEquipoGeneradorByIdQuery> {
  constructor(
    @Inject(EQUIPOS_GENERADOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposGeneradorRepository,
  ) {}

  async execute(query: GetEquipoGeneradorByIdQuery) {
    const equipo = await this.repository.obtenerPorId(query.id_equipo);

    if (!equipo) {
      throw new NotFoundException(`Equipo generador ${query.id_equipo} no encontrado`);
    }

    return equipo;
  }
}
