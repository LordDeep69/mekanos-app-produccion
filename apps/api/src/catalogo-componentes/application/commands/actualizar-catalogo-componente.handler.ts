import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CATALOGO_COMPONENTES_REPOSITORY } from '../../catalogo-componentes.constants';
import { PrismaCatalogoComponentesRepository } from '../../infrastructure/persistence/prisma-catalogo-componentes.repository';
import { ActualizarCatalogoComponenteCommand } from './actualizar-catalogo-componente.command';

@CommandHandler(ActualizarCatalogoComponenteCommand)
export class ActualizarCatalogoComponenteHandler implements ICommandHandler<ActualizarCatalogoComponenteCommand> {
  constructor(
    @Inject(CATALOGO_COMPONENTES_REPOSITORY)
    private readonly repository: PrismaCatalogoComponentesRepository,
  ) {}

  async execute(command: ActualizarCatalogoComponenteCommand) {
    const componente = await this.repository.actualizar(command.id, command.data);
    return {
      success: true,
      message: 'Componente actualizado exitosamente',
      data: componente,
    };
  }
}
