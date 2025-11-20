import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EQUIPOS_MOTOR_REPOSITORY_TOKEN } from '../../constants';
import { EquipoMotorEntity, EquiposMotorFilters, IEquiposMotorRepository } from '../../domain/equipos-motor.repository';

export class GetAllEquiposMotorQuery {
  constructor(public readonly filters: EquiposMotorFilters) {}
}

@QueryHandler(GetAllEquiposMotorQuery)
export class GetAllEquiposMotorHandler implements IQueryHandler<GetAllEquiposMotorQuery> {
  constructor(
    @Inject(EQUIPOS_MOTOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposMotorRepository,
  ) {}

  async execute(query: GetAllEquiposMotorQuery): Promise<{ data: EquipoMotorEntity[]; total: number }> {
    return this.repository.obtenerTodos(query.filters);
  }
}
