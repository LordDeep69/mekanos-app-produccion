import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { EliminarCatalogoServicioCommand } from './eliminar-catalogo-servicio.command';

@CommandHandler(EliminarCatalogoServicioCommand)
export class EliminarCatalogoServicioHandler
  implements ICommandHandler<EliminarCatalogoServicioCommand>
{
  constructor(private readonly repository: PrismaCatalogoServiciosRepository) {}

  async execute(command: EliminarCatalogoServicioCommand) {
    // 1. Validar existe
    const existente = await this.repository.findById(command.id);
    if (!existente) {
      throw new NotFoundException(`Servicio con ID ${command.id} no encontrado`);
    }

    // 2. Soft delete
    return this.repository.softDelete(command.id);
  }
}
