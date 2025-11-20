import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CATALOGO_COMPONENTES_REPOSITORY } from '../../catalogo-componentes.constants';
import { PrismaCatalogoComponentesRepository } from '../../infrastructure/persistence/prisma-catalogo-componentes.repository';
import { DesactivarCatalogoComponenteCommand } from './desactivar-catalogo-componente.command';

@CommandHandler(DesactivarCatalogoComponenteCommand)
export class DesactivarCatalogoComponenteHandler implements ICommandHandler<DesactivarCatalogoComponenteCommand> {
  constructor(
    @Inject(CATALOGO_COMPONENTES_REPOSITORY)
    private readonly repository: PrismaCatalogoComponentesRepository,
  ) {}

  async execute(command: DesactivarCatalogoComponenteCommand) {
    const componente = await this.repository.desactivar(command.id, command.usuario);
    return {
      success: true,
      message: 'Componente desactivado exitosamente',
      data: componente,
    };
  }
}
