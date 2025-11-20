import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaUbicacionesBodegaRepository } from '../infrastructure/prisma-ubicaciones-bodega.repository';
import { CrearUbicacionCommand } from './crear-ubicacion.command';

@CommandHandler(CrearUbicacionCommand)
export class CrearUbicacionHandler implements ICommandHandler<CrearUbicacionCommand> {
  constructor(
    private readonly repository: PrismaUbicacionesBodegaRepository,
  ) {}

  async execute(command: CrearUbicacionCommand) {
    return this.repository.crear({
      codigo_ubicacion: command.codigo_ubicacion,
      zona: command.zona,
      pasillo: command.pasillo,
      estante: command.estante,
      nivel: command.nivel,
    });
  }
}
