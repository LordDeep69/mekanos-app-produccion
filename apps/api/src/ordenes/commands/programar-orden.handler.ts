import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { ProgramarOrdenCommand } from './programar-orden.command';
import { OrdenServicioEntity, IOrdenServicioRepository, OrdenServicioId } from '@mekanos/core';

@CommandHandler(ProgramarOrdenCommand)
export class ProgramarOrdenHandler implements ICommandHandler<ProgramarOrdenCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(command: ProgramarOrdenCommand): Promise<OrdenServicioEntity> {
    const { ordenId, fechaProgramada, observaciones } = command;

    const orden = await this.ordenRepository.findById(OrdenServicioId.from(ordenId));
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    orden.programar(fechaProgramada, observaciones);

    return await this.ordenRepository.save(orden);
  }
}
