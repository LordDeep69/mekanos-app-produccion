import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IMotivosAjusteRepository } from '../../domain/motivos-ajuste.repository.interface';
import { MOTIVOS_AJUSTE_REPOSITORY } from '../../motivos-ajuste.constants';
import { ActualizarMotivoAjusteCommand } from './actualizar-motivo-ajuste.command';

@Injectable()
@CommandHandler(ActualizarMotivoAjusteCommand)
export class ActualizarMotivoAjusteHandler
  implements ICommandHandler<ActualizarMotivoAjusteCommand>
{
  constructor(
    @Inject(MOTIVOS_AJUSTE_REPOSITORY)
    private readonly repository: IMotivosAjusteRepository,
  ) {}

  async execute(command: ActualizarMotivoAjusteCommand) {
    const existe = await this.repository.findById(command.id_motivo_ajuste);
    if (!existe) {
      throw new NotFoundException(
        `Motivo ajuste con ID ${command.id_motivo_ajuste} no encontrado`,
      );
    }

    const dataToUpdate: any = {};
    if (command.codigo_motivo !== undefined)
      dataToUpdate.codigo_motivo = command.codigo_motivo;
    if (command.nombre_motivo !== undefined)
      dataToUpdate.nombre_motivo = command.nombre_motivo;
    if (command.categoria !== undefined)
      dataToUpdate.categoria = command.categoria;
    if (command.requiere_justificacion_detallada !== undefined)
      dataToUpdate.requiere_justificacion_detallada =
        command.requiere_justificacion_detallada;
    if (command.requiere_aprobacion_gerencia !== undefined)
      dataToUpdate.requiere_aprobacion_gerencia =
        command.requiere_aprobacion_gerencia;
    if (command.activo !== undefined) dataToUpdate.activo = command.activo;

    return this.repository.actualizar(command.id_motivo_ajuste, dataToUpdate);
  }
}
