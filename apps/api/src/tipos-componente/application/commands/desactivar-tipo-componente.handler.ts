import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITiposComponenteRepository } from '../../domain/tipos-componente.repository.interface';
import { TIPOS_COMPONENTE_REPOSITORY } from '../../tipos-componente.constants';
import { DesactivarTipoComponenteCommand } from './desactivar-tipo-componente.command';

@CommandHandler(DesactivarTipoComponenteCommand)
export class DesactivarTipoComponenteHandler
  implements ICommandHandler<DesactivarTipoComponenteCommand>
{
  constructor(
    @Inject(TIPOS_COMPONENTE_REPOSITORY)
    private readonly repository: ITiposComponenteRepository,
  ) {}

  async execute(command: DesactivarTipoComponenteCommand) {
    return await this.repository.desactivar(command.id);
  }
}
