import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { EliminarParametrosMedicionCommand } from './eliminar-parametros-medicion.command';

/**
 * Handler: Eliminar (soft delete) parámetro de medición
 * Marca activo = false sin eliminación física
 */
@Injectable()
@CommandHandler(EliminarParametrosMedicionCommand)
export class EliminarParametrosMedicionHandler
  implements ICommandHandler<EliminarParametrosMedicionCommand>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
  ) {}

  async execute(command: EliminarParametrosMedicionCommand): Promise<any> {
    // Verificar que el parámetro existe antes de eliminar
    const parametroExistente = await this.repository.findById(command.id);
    if (!parametroExistente) {
      throw new NotFoundException(
        `Parámetro de medición con ID ${command.id} no existe`,
      );
    }

    // Soft delete: marcar como inactivo
    return this.repository.softDelete(command.id);
  }
}
