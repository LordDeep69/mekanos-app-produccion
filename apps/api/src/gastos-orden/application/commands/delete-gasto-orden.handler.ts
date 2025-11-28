import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IGastosOrdenRepository } from '../../domain/gastos-orden.repository.interface';
import { DeleteGastoOrdenCommand } from './delete-gasto-orden.command';

/**
 * Handler: Eliminar gasto de orden (Hard Delete)
 * Tabla 13/14 - FASE 3
 */
@CommandHandler(DeleteGastoOrdenCommand)
export class DeleteGastoOrdenHandler implements ICommandHandler<DeleteGastoOrdenCommand> {
  constructor(
    @Inject('IGastosOrdenRepository')
    private readonly repository: IGastosOrdenRepository,
  ) {}

  async execute(command: DeleteGastoOrdenCommand): Promise<void> {
    const existing = await this.repository.findById(command.idGasto);
    if (!existing) {
      throw new NotFoundException(`Gasto con ID ${command.idGasto} no encontrado`);
    }

    await this.repository.delete(command.idGasto);
  }
}
