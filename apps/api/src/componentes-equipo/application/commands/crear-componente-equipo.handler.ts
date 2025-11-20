import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { COMPONENTES_EQUIPO_REPOSITORY } from '../../componentes-equipo.constants';
import { PrismaComponentesEquipoRepository } from '../../infrastructure/persistence/prisma-componentes-equipo.repository';
import { CrearComponenteEquipoCommand } from './crear-componente-equipo.command';

@CommandHandler(CrearComponenteEquipoCommand)
export class CrearComponenteEquipoHandler implements ICommandHandler<CrearComponenteEquipoCommand> {
  constructor(
    @Inject(COMPONENTES_EQUIPO_REPOSITORY)
    private readonly repository: PrismaComponentesEquipoRepository,
  ) {}

  async execute(command: CrearComponenteEquipoCommand) {
    const componente = await this.repository.crear(command.data);
    return {
      success: true,
      message: 'Componente asociado al equipo exitosamente',
      data: componente,
    };
  }
}
