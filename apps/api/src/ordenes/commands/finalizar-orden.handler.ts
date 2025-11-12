import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { FinalizarOrdenCommand } from './finalizar-orden.command';
import { OrdenServicioEntity, IOrdenServicioRepository, OrdenServicioId } from '@mekanos/core';

@CommandHandler(FinalizarOrdenCommand)
export class FinalizarOrdenHandler implements ICommandHandler<FinalizarOrdenCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(command: FinalizarOrdenCommand): Promise<OrdenServicioEntity> {
    const { ordenId, observaciones } = command;

    const orden = await this.ordenRepository.findById(OrdenServicioId.from(ordenId));
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    orden.finalizar(observaciones);

    return await this.ordenRepository.save(orden);
  }
}
