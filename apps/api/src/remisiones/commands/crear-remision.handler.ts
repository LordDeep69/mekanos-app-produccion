import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaRemisionesRepository } from '../infrastructure/prisma-remisiones.repository';
import { CrearRemisionCommand } from './crear-remision.command';

@CommandHandler(CrearRemisionCommand)
export class CrearRemisionHandler
  implements ICommandHandler<CrearRemisionCommand>
{
  constructor(private readonly repository: PrismaRemisionesRepository) {}

  async execute(command: CrearRemisionCommand) {
    const remision = await this.repository.crearRemision({
      id_orden_servicio: command.id_orden_servicio,
      id_tecnico_receptor: command.id_tecnico_receptor,
      observaciones: command.observaciones,
      entregado_por: command.userId,
      items: command.items,
    });

    return remision;
  }
}
