import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EQUIPOS_GENERADOR_REPOSITORY_TOKEN } from '../../constants';
import { EquiposGeneradorFilters, IEquiposGeneradorRepository } from '../../domain/equipos-generador.repository';

export class GetAllEquiposGeneradorQuery {
  constructor(public readonly filters: EquiposGeneradorFilters) {}
}

@QueryHandler(GetAllEquiposGeneradorQuery)
export class GetAllEquiposGeneradorHandler implements IQueryHandler<GetAllEquiposGeneradorQuery> {
  constructor(
    @Inject(EQUIPOS_GENERADOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposGeneradorRepository,
  ) {}

  async execute(query: GetAllEquiposGeneradorQuery) {
    return this.repository.obtenerTodos(query.filters);
  }
}
