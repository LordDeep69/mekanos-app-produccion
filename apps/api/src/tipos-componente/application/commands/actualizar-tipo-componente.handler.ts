import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITiposComponenteRepository } from '../../domain/tipos-componente.repository.interface';
import { TIPOS_COMPONENTE_REPOSITORY } from '../../tipos-componente.constants';
import { ActualizarTipoComponenteCommand } from './actualizar-tipo-componente.command';

@CommandHandler(ActualizarTipoComponenteCommand)
export class ActualizarTipoComponenteHandler
  implements ICommandHandler<ActualizarTipoComponenteCommand>
{
  constructor(
    @Inject(TIPOS_COMPONENTE_REPOSITORY)
    private readonly repository: ITiposComponenteRepository,
  ) {}

  async execute(command: ActualizarTipoComponenteCommand) {
    return await this.repository.actualizar(command.id, {
      codigo_tipo: command.codigo_tipo,
      nombre_componente: command.nombre_componente,
      categoria: command.categoria,
      subcategoria: command.subcategoria,
      es_consumible: command.es_consumible,
      es_inventariable: command.es_inventariable,
      aplica_a: command.aplica_a,
      descripcion: command.descripcion,
      activo: command.activo,
      modificado_por: command.modificado_por,
    });
  }
}
