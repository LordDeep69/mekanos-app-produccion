import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { COMPONENTES_EQUIPO_REPOSITORY } from '../../componentes-equipo.constants';
import { PrismaComponentesEquipoRepository } from '../../infrastructure/persistence/prisma-componentes-equipo.repository';
import { ActualizarComponenteEquipoCommand } from './actualizar-componente-equipo.command';

@CommandHandler(ActualizarComponenteEquipoCommand)
export class ActualizarComponenteEquipoHandler implements ICommandHandler<ActualizarComponenteEquipoCommand> {
  constructor(
    @Inject(COMPONENTES_EQUIPO_REPOSITORY)
    private readonly repository: PrismaComponentesEquipoRepository,
  ) {}

  async execute(command: ActualizarComponenteEquipoCommand) {
    const componente = await this.repository.actualizar(command.id, command.data);
    return {
      success: true,
      message: 'Componente-Equipo actualizado exitosamente',
      data: componente,
    };
  }
}
