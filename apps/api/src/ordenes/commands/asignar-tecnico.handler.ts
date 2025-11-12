import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { AsignarTecnicoCommand } from './asignar-tecnico.command';
import { OrdenServicioEntity, IOrdenServicioRepository, OrdenServicioId } from '@mekanos/core';

@CommandHandler(AsignarTecnicoCommand)
export class AsignarTecnicoHandler implements ICommandHandler<AsignarTecnicoCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(command: AsignarTecnicoCommand): Promise<OrdenServicioEntity> {
    const { ordenId, tecnicoId } = command;

    const orden = await this.ordenRepository.findById(OrdenServicioId.from(ordenId));
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    orden.asignarTecnico(tecnicoId);

    return await this.ordenRepository.save(orden);
  }
}
