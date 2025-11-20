import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { equipos_motor } from '@prisma/client';
import { EQUIPOS_MOTOR_REPOSITORY_TOKEN } from '../../constants';
import { ActualizarEquipoMotorData, IEquiposMotorRepository } from '../../domain/equipos-motor.repository';

export class ActualizarEquipoMotorCommand {
  constructor(
    public readonly id_equipo: number,
    public readonly data: ActualizarEquipoMotorData,
  ) {}
}

@CommandHandler(ActualizarEquipoMotorCommand)
export class ActualizarEquipoMotorHandler implements ICommandHandler<ActualizarEquipoMotorCommand> {
  constructor(
    @Inject(EQUIPOS_MOTOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposMotorRepository,
  ) {}

  async execute(command: ActualizarEquipoMotorCommand): Promise<equipos_motor> {
    return this.repository.actualizar(command.id_equipo, command.data);
  }
}
