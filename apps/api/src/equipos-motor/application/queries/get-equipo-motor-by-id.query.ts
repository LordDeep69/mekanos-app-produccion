import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EQUIPOS_MOTOR_REPOSITORY_TOKEN } from '../../constants';
import { EquipoMotorEntity, IEquiposMotorRepository } from '../../domain/equipos-motor.repository';

export class GetEquipoMotorByIdQuery {
  constructor(public readonly id_equipo: number) {}
}

@QueryHandler(GetEquipoMotorByIdQuery)
export class GetEquipoMotorByIdHandler implements IQueryHandler<GetEquipoMotorByIdQuery> {
  constructor(
    @Inject(EQUIPOS_MOTOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposMotorRepository,
  ) {}

  async execute(query: GetEquipoMotorByIdQuery): Promise<EquipoMotorEntity> {
    const result = await this.repository.obtenerPorId(query.id_equipo);

    if (!result) {
      throw new NotFoundException(`Equipo motor ${query.id_equipo} no encontrado`);
    }

    return result;
  }
}
