import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CATALOGO_SISTEMAS_REPOSITORY } from '../../catalogo-sistemas.constants';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { DesactivarCatalogoSistemaCommand } from './desactivar-catalogo-sistema.command';

@CommandHandler(DesactivarCatalogoSistemaCommand)
export class DesactivarCatalogoSistemaHandler
  implements ICommandHandler<DesactivarCatalogoSistemaCommand>
{
  constructor(
    @Inject(CATALOGO_SISTEMAS_REPOSITORY)
    private readonly repository: ICatalogoSistemasRepository,
  ) {}

  async execute(command: DesactivarCatalogoSistemaCommand) {
    return this.repository.desactivar(command.id_sistema);
  }
}
