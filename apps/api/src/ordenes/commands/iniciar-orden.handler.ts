import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { IniciarOrdenCommand } from './iniciar-orden.command';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';

@CommandHandler(IniciarOrdenCommand)
export class IniciarOrdenHandler implements ICommandHandler<IniciarOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository
  ) {}

  async execute(command: IniciarOrdenCommand): Promise<any> {
    const { ordenId } = command;

    // 1. Verificar existencia
    const ordenExistente = await this.repository.findById(parseInt(ordenId, 10));
    if (!ordenExistente) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    // 2. Obtener estado EN_PROCESO
    const estadoEnProceso = await this.repository.findEstadoByCodigo('EN_PROCESO');
    if (!estadoEnProceso) {
      throw new NotFoundException('No se encontró el estado EN_PROCESO en el catálogo');
    }

    // 3. Iniciar orden
    return await this.repository.iniciar(
      parseInt(ordenId, 10),
      estadoEnProceso.id_estado,
      1 // TODO: obtener userId desde JWT
    );
  }
}
