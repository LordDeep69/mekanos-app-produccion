import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaUbicacionesBodegaRepository } from '../infrastructure/prisma-ubicaciones-bodega.repository';
import { ActualizarUbicacionCommand } from './actualizar-ubicacion.command';

@CommandHandler(ActualizarUbicacionCommand)
export class ActualizarUbicacionHandler
  implements ICommandHandler<ActualizarUbicacionCommand>
{
  constructor(
    private readonly repository: PrismaUbicacionesBodegaRepository,
  ) {}

  async execute(command: ActualizarUbicacionCommand) {
    return this.repository.actualizar(command.id_ubicacion, {
      codigo_ubicacion: command.codigo_ubicacion,
      zona: command.zona,
      pasillo: command.pasillo,
      estante: command.estante,
      nivel: command.nivel,
      activo: command.activo,
    });
  }
}
