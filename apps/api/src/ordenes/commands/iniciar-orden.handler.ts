import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { IniciarOrdenCommand } from './iniciar-orden.command';
import { OrdenServicioEntity, IOrdenServicioRepository, OrdenServicioId } from '@mekanos/core';

@CommandHandler(IniciarOrdenCommand)
export class IniciarOrdenHandler implements ICommandHandler<IniciarOrdenCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(command: IniciarOrdenCommand): Promise<OrdenServicioEntity> {
    const { ordenId } = command;

    const orden = await this.ordenRepository.findById(OrdenServicioId.from(ordenId));
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    orden.iniciar();

    return await this.ordenRepository.save(orden);
  }
}
