import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaMedicionesRepository } from '../../infrastructure/prisma-mediciones.repository';
import { DeleteMedicionCommand } from './delete-medicion.command';

/**
 * Handler para eliminar medición (DELETE físico - NO soft delete)
 * Tabla 10/14 - FASE 3
 */

@CommandHandler(DeleteMedicionCommand)
export class DeleteMedicionHandler
  implements ICommandHandler<DeleteMedicionCommand>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: PrismaMedicionesRepository,
  ) {}

  async execute(command: DeleteMedicionCommand): Promise<{ message: string }> {
    const { id } = command;

    // Verificar que medición exista
    const medicionExistente = await this.repository.findById(id);
    if (!medicionExistente) {
      throw new NotFoundException(`Medición ID ${id} no encontrada`);
    }

    // DELETE físico (NO soft delete - tabla permite eliminación)
    await this.repository.delete(id);

    return {
      message: 'Medición eliminada exitosamente',
    };
  }
}
