import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_GENERADOR_REPOSITORY_TOKEN } from '../../constants';
import { IEquiposGeneradorRepository } from '../../domain/equipos-generador.repository';

export class EliminarEquipoGeneradorCommand {
  constructor(public readonly id_equipo: number) {}
}

@CommandHandler(EliminarEquipoGeneradorCommand)
export class EliminarEquipoGeneradorHandler implements ICommandHandler<EliminarEquipoGeneradorCommand> {
  constructor(
    @Inject(EQUIPOS_GENERADOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposGeneradorRepository,
  ) {}

  async execute(command: EliminarEquipoGeneradorCommand): Promise<void> {
    await this.repository.eliminar(command.id_equipo);
  }
}
