import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CATALOGO_COMPONENTES_REPOSITORY } from '../../catalogo-componentes.constants';
import { PrismaCatalogoComponentesRepository } from '../../infrastructure/persistence/prisma-catalogo-componentes.repository';
import { CrearCatalogoComponenteCommand } from './crear-catalogo-componente.command';

@CommandHandler(CrearCatalogoComponenteCommand)
export class CrearCatalogoComponenteHandler implements ICommandHandler<CrearCatalogoComponenteCommand> {
  constructor(
    @Inject(CATALOGO_COMPONENTES_REPOSITORY)
    private readonly repository: PrismaCatalogoComponentesRepository,
  ) {}

  async execute(command: CrearCatalogoComponenteCommand) {
    const componente = await this.repository.crear(command.data);
    return {
      success: true,
      message: 'Componente creado exitosamente',
      data: componente,
    };
  }
}
