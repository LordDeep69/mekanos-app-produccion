import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IEvidenciasRepository } from '../../domain/evidencias.repository.interface';
import { DeleteEvidenciaCommand } from './delete-evidencia.command';

/**
 * Handler eliminar evidencia fotográfica
 * FASE 3 - Tabla 11 - DELETE físico
 */

@CommandHandler(DeleteEvidenciaCommand)
export class DeleteEvidenciaHandler
  implements ICommandHandler<DeleteEvidenciaCommand>
{
  constructor(
    @Inject('IEvidenciasRepository')
    private readonly repository: IEvidenciasRepository,
  ) {}

  async execute(command: DeleteEvidenciaCommand): Promise<{ message: string }> {
    const { id } = command;

    // 1. Validar existencia
    const evidenciaExistente = await this.repository.findById(id);
    if (!evidenciaExistente) {
      throw new NotFoundException(`Evidencia con ID ${id} no encontrada`);
    }

    // 2. DELETE físico
    await this.repository.delete(id);

    return { message: 'Evidencia eliminada exitosamente' };
  }
}
