import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EQUIPOS_BOMBA_REPOSITORY_TOKEN } from '../../constants';
import { EquiposBombaFilters, IEquiposBombaRepository } from '../../domain/equipos-bomba.repository';

export class GetAllEquiposBombaQuery {
  constructor(public readonly filters: EquiposBombaFilters) {}
}

@QueryHandler(GetAllEquiposBombaQuery)
export class GetAllEquiposBombaHandler implements IQueryHandler<GetAllEquiposBombaQuery> {
  constructor(
    @Inject(EQUIPOS_BOMBA_REPOSITORY_TOKEN)
    private readonly repository: IEquiposBombaRepository,
  ) {}

  async execute(query: GetAllEquiposBombaQuery) {
    return this.repository.obtenerTodos(query.filters);
  }
}
