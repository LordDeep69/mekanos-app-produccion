import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IComponentesUsadosRepository } from '../../domain/componentes-usados.repository.interface';
import { DeleteComponenteUsadoCommand } from './delete-componente-usado.command';

/**
 * Handler para eliminar componente usado
 * Tabla 12/14 - FASE 3
 * DELETE físico (hard delete)
 */
@CommandHandler(DeleteComponenteUsadoCommand)
export class DeleteComponenteUsadoHandler
  implements ICommandHandler<DeleteComponenteUsadoCommand>
{
  constructor(
    @Inject('IComponentesUsadosRepository')
    private readonly repository: IComponentesUsadosRepository,
  ) {}

  async execute(command: DeleteComponenteUsadoCommand): Promise<{ message: string }> {
    const { id } = command;

    // Verificar existencia
    const existente = await this.repository.findById(id);
    if (!existente) {
      throw new NotFoundException(`Componente usado con ID ${id} no encontrado`);
    }

    await this.repository.delete(id);

    return { message: 'Componente usado eliminado exitosamente' };
  }
}
