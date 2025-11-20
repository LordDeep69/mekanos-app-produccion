import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { equipos_motor } from '@prisma/client';
import { EQUIPOS_MOTOR_REPOSITORY_TOKEN } from '../../constants';
import { CrearEquipoMotorData, IEquiposMotorRepository } from '../../domain/equipos-motor.repository';

export class CrearEquipoMotorCommand {
  constructor(public readonly data: CrearEquipoMotorData) {}
}

@CommandHandler(CrearEquipoMotorCommand)
export class CrearEquipoMotorHandler implements ICommandHandler<CrearEquipoMotorCommand> {
  constructor(
    @Inject(EQUIPOS_MOTOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposMotorRepository,
  ) {}

  async execute(command: CrearEquipoMotorCommand): Promise<equipos_motor> {
    return this.repository.crear(command.data);
  }
}
