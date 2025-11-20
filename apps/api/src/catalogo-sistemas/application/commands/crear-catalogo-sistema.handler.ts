import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CATALOGO_SISTEMAS_REPOSITORY } from '../../catalogo-sistemas.constants';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CrearCatalogoSistemaCommand } from './crear-catalogo-sistema.command';

@CommandHandler(CrearCatalogoSistemaCommand)
export class CrearCatalogoSistemaHandler
  implements ICommandHandler<CrearCatalogoSistemaCommand>
{
  constructor(
    @Inject(CATALOGO_SISTEMAS_REPOSITORY)
    private readonly repository: ICatalogoSistemasRepository,
  ) {}

  async execute(command: CrearCatalogoSistemaCommand) {
    const {
      codigo_sistema,
      nombre_sistema,
      aplica_a,
      orden_visualizacion,
      descripcion,
      icono,
      color_hex,
      observaciones,
    } = command;

    return this.repository.crear({
      codigo_sistema,
      nombre_sistema,
      aplica_a,
      orden_visualizacion,
      descripcion,
      icono,
      color_hex,
      observaciones,
    });
  }
}
