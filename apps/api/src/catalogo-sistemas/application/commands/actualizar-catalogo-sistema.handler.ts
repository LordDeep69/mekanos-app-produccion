import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CATALOGO_SISTEMAS_REPOSITORY } from '../../catalogo-sistemas.constants';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { ActualizarCatalogoSistemaCommand } from './actualizar-catalogo-sistema.command';

@CommandHandler(ActualizarCatalogoSistemaCommand)
export class ActualizarCatalogoSistemaHandler
  implements ICommandHandler<ActualizarCatalogoSistemaCommand>
{
  constructor(
    @Inject(CATALOGO_SISTEMAS_REPOSITORY)
    private readonly repository: ICatalogoSistemasRepository,
  ) {}

  async execute(command: ActualizarCatalogoSistemaCommand) {
    const { id_sistema, ...updateData } = command;

    // Filtrar undefined values
    const data = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined),
    );

    return this.repository.actualizar(id_sistema, data);
  }
}
