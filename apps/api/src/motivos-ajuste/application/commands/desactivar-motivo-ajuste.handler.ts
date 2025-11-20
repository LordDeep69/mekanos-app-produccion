import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IMotivosAjusteRepository } from '../../domain/motivos-ajuste.repository.interface';
import { MOTIVOS_AJUSTE_REPOSITORY } from '../../motivos-ajuste.constants';
import { DesactivarMotivoAjusteCommand } from './desactivar-motivo-ajuste.command';

@Injectable()
@CommandHandler(DesactivarMotivoAjusteCommand)
export class DesactivarMotivoAjusteHandler
  implements ICommandHandler<DesactivarMotivoAjusteCommand>
{
  constructor(
    @Inject(MOTIVOS_AJUSTE_REPOSITORY)
    private readonly repository: IMotivosAjusteRepository,
  ) {}

  async execute(command: DesactivarMotivoAjusteCommand) {
    const existe = await this.repository.findById(command.id_motivo_ajuste);
    if (!existe) {
      throw new NotFoundException(
        `Motivo ajuste con ID ${command.id_motivo_ajuste} no encontrado`,
      );
    }

    return this.repository.desactivar(command.id_motivo_ajuste);
  }
}
