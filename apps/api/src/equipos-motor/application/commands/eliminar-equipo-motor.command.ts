import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_MOTOR_REPOSITORY_TOKEN } from '../../constants';
import { IEquiposMotorRepository } from '../../domain/equipos-motor.repository';

export class EliminarEquipoMotorCommand {
  constructor(public readonly id_equipo: number) {}
}

@CommandHandler(EliminarEquipoMotorCommand)
export class EliminarEquipoMotorHandler implements ICommandHandler<EliminarEquipoMotorCommand> {
  constructor(
    @Inject(EQUIPOS_MOTOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposMotorRepository,
  ) {}

  async execute(command: EliminarEquipoMotorCommand): Promise<void> {
    await this.repository.eliminar(command.id_equipo);
  }
}
