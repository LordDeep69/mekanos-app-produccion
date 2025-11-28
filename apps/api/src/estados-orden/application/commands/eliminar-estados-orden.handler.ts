import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { EliminarEstadosOrdenCommand } from './eliminar-estados-orden.command';

/**
 * Handler para eliminar (soft delete) estado de orden
 * 
 * LÓGICA:
 * - Soft delete: marca activo = false
 * - No se eliminan estados físicamente (integridad referencial)
 */
@CommandHandler(EliminarEstadosOrdenCommand)
export class EliminarEstadosOrdenHandler
  implements ICommandHandler<EliminarEstadosOrdenCommand>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(command: EliminarEstadosOrdenCommand): Promise<any> {
    // 1. Verificar existencia
    const estadoExistente = await this.repository.findById(command.idEstado);
    if (!estadoExistente) {
      throw new NotFoundException(
        `Estado con ID ${command.idEstado} no encontrado`,
      );
    }

    // 2. Soft delete
    return this.repository.softDelete(command.idEstado);
  }
}
