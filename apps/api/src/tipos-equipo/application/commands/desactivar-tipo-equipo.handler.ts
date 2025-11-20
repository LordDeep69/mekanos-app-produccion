import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITiposEquipoRepository } from '../../domain/tipos-equipo.repository.interface';
import { TIPOS_EQUIPO_REPOSITORY } from '../../tipos-equipo.constants';
import { DesactivarTipoEquipoCommand } from './desactivar-tipo-equipo.command';

@CommandHandler(DesactivarTipoEquipoCommand)
export class DesactivarTipoEquipoHandler
  implements ICommandHandler<DesactivarTipoEquipoCommand>
{
  constructor(
    @Inject(TIPOS_EQUIPO_REPOSITORY)
    private readonly repository: ITiposEquipoRepository,
  ) {}

  async execute(command: DesactivarTipoEquipoCommand) {
    return this.repository.desactivar(command.id);
  }
}
