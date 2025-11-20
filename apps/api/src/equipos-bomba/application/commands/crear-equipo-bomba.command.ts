import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_BOMBA_REPOSITORY_TOKEN } from '../../constants';
import { CrearEquipoBombaData, IEquiposBombaRepository } from '../../domain/equipos-bomba.repository';

export class CrearEquipoBombaCommand {
  constructor(public readonly data: CrearEquipoBombaData) {}
}

@CommandHandler(CrearEquipoBombaCommand)
export class CrearEquipoBombaHandler implements ICommandHandler<CrearEquipoBombaCommand> {
  constructor(
    @Inject(EQUIPOS_BOMBA_REPOSITORY_TOKEN)
    private readonly repository: IEquiposBombaRepository,
  ) {}

  async execute(command: CrearEquipoBombaCommand) {
    return this.repository.crear(command.data);
  }
}
