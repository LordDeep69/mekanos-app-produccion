import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from '../infrastructure/prisma-tipos-servicio.repository';
import { DeleteTiposServicioCommand } from './delete-tipos-servicio.command';

/**
 * Handler: Eliminar (soft delete) tipo de servicio
 * 
 * Marca el registro como inactivo (activo: false)
 * NO elimina físicamente el registro de la base de datos
 */
@CommandHandler(DeleteTiposServicioCommand)
export class DeleteTiposServicioHandler
  implements ICommandHandler<DeleteTiposServicioCommand>
{
  constructor(
    private readonly repository: PrismaTiposServicioRepository,
  ) {}

  async execute(command: DeleteTiposServicioCommand) {
    // Repository.delete() implementa soft delete (activo: false)
    return this.repository.delete(command.id);
  }
}
