import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaUbicacionesBodegaRepository } from '../infrastructure/prisma-ubicaciones-bodega.repository';
import { DesactivarUbicacionCommand } from './desactivar-ubicacion.command';

@CommandHandler(DesactivarUbicacionCommand)
export class DesactivarUbicacionHandler
  implements ICommandHandler<DesactivarUbicacionCommand>
{
  constructor(
    private readonly repository: PrismaUbicacionesBodegaRepository,
  ) {}

  async execute(command: DesactivarUbicacionCommand) {
    return this.repository.desactivar(command.id_ubicacion);
  }
}
