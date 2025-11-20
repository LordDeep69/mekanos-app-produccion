import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITiposComponenteRepository } from '../../domain/tipos-componente.repository.interface';
import { TIPOS_COMPONENTE_REPOSITORY } from '../../tipos-componente.constants';
import { CrearTipoComponenteCommand } from './crear-tipo-componente.command';

@CommandHandler(CrearTipoComponenteCommand)
export class CrearTipoComponenteHandler
  implements ICommandHandler<CrearTipoComponenteCommand>
{
  constructor(
    @Inject(TIPOS_COMPONENTE_REPOSITORY)
    private readonly repository: ITiposComponenteRepository,
  ) {}

  async execute(command: CrearTipoComponenteCommand) {
    return await this.repository.crear({
      codigo_tipo: command.codigo_tipo,
      nombre_componente: command.nombre_componente,
      categoria: command.categoria,
      aplica_a: command.aplica_a,
      subcategoria: command.subcategoria,
      es_consumible: command.es_consumible,
      es_inventariable: command.es_inventariable,
      descripcion: command.descripcion,
      creado_por: command.creado_por,
    });
  }
}
