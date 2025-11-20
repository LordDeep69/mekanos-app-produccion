import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IMotivosAjusteRepository } from '../../domain/motivos-ajuste.repository.interface';
import { MOTIVOS_AJUSTE_REPOSITORY } from '../../motivos-ajuste.constants';
import { CrearMotivoAjusteCommand } from './crear-motivo-ajuste.command';

@Injectable()
@CommandHandler(CrearMotivoAjusteCommand)
export class CrearMotivoAjusteHandler
  implements ICommandHandler<CrearMotivoAjusteCommand>
{
  constructor(
    @Inject(MOTIVOS_AJUSTE_REPOSITORY)
    private readonly repository: IMotivosAjusteRepository,
  ) {}

  async execute(command: CrearMotivoAjusteCommand) {
    return this.repository.crear({
      codigo_motivo: command.codigo_motivo,
      nombre_motivo: command.nombre_motivo,
      categoria: command.categoria,
      requiere_justificacion_detallada:
        command.requiere_justificacion_detallada,
      requiere_aprobacion_gerencia: command.requiere_aprobacion_gerencia,
    });
  }
}
