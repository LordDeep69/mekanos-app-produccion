import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EQUIPOS_BOMBA_REPOSITORY_TOKEN } from '../../constants';
import { IEquiposBombaRepository } from '../../domain/equipos-bomba.repository';

export class GetEquipoBombaByIdQuery {
  constructor(public readonly id_equipo: number) {}
}

@QueryHandler(GetEquipoBombaByIdQuery)
export class GetEquipoBombaByIdHandler implements IQueryHandler<GetEquipoBombaByIdQuery> {
  constructor(
    @Inject(EQUIPOS_BOMBA_REPOSITORY_TOKEN)
    private readonly repository: IEquiposBombaRepository,
  ) {}

  async execute(query: GetEquipoBombaByIdQuery) {
    const equipo = await this.repository.obtenerPorId(query.id_equipo);

    if (!equipo) {
      throw new NotFoundException(`Equipo bomba ${query.id_equipo} no encontrado`);
    }

    return equipo;
  }
}
