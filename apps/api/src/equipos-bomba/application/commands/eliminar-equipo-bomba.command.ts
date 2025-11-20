import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_BOMBA_REPOSITORY_TOKEN } from '../../constants';
import { IEquiposBombaRepository } from '../../domain/equipos-bomba.repository';

export class EliminarEquipoBombaCommand {
  constructor(public readonly id_equipo: number) {}
}

@CommandHandler(EliminarEquipoBombaCommand)
export class EliminarEquipoBombaHandler implements ICommandHandler<EliminarEquipoBombaCommand> {
  constructor(
    @Inject(EQUIPOS_BOMBA_REPOSITORY_TOKEN)
    private readonly repository: IEquiposBombaRepository,
  ) {}

  async execute(command: EliminarEquipoBombaCommand): Promise<void> {
    await this.repository.eliminar(command.id_equipo);
  }
}
