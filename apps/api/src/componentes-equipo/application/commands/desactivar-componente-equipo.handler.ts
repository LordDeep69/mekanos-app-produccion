import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { COMPONENTES_EQUIPO_REPOSITORY } from '../../componentes-equipo.constants';
import { PrismaComponentesEquipoRepository } from '../../infrastructure/persistence/prisma-componentes-equipo.repository';
import { DesactivarComponenteEquipoCommand } from './desactivar-componente-equipo.command';

@CommandHandler(DesactivarComponenteEquipoCommand)
export class DesactivarComponenteEquipoHandler implements ICommandHandler<DesactivarComponenteEquipoCommand> {
  constructor(
    @Inject(COMPONENTES_EQUIPO_REPOSITORY)
    private readonly repository: PrismaComponentesEquipoRepository,
  ) {}

  async execute(command: DesactivarComponenteEquipoCommand) {
    const componente = await this.repository.desactivar(command.id, command.usuario);
    return {
      success: true,
      message: 'Componente-Equipo desactivado exitosamente',
      data: componente,
    };
  }
}
