import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_BOMBA_REPOSITORY_TOKEN } from '../../constants';
import { ActualizarEquipoBombaData, IEquiposBombaRepository } from '../../domain/equipos-bomba.repository';

export class ActualizarEquipoBombaCommand {
  constructor(
    public readonly id_equipo: number,
    public readonly data: ActualizarEquipoBombaData,
  ) {}
}

@CommandHandler(ActualizarEquipoBombaCommand)
export class ActualizarEquipoBombaHandler implements ICommandHandler<ActualizarEquipoBombaCommand> {
  constructor(
    @Inject(EQUIPOS_BOMBA_REPOSITORY_TOKEN)
    private readonly repository: IEquiposBombaRepository,
  ) {}

  async execute(command: ActualizarEquipoBombaCommand) {
    return this.repository.actualizar(command.id_equipo, command.data);
  }
}
