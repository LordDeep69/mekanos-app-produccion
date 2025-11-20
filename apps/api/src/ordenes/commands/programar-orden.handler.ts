import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { ProgramarOrdenCommand } from './programar-orden.command';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';

@CommandHandler(ProgramarOrdenCommand)
export class ProgramarOrdenHandler implements ICommandHandler<ProgramarOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository
  ) {}

  async execute(command: ProgramarOrdenCommand): Promise<any> {
    const { ordenId, fechaProgramada } = command;

    // 1. Verificar existencia
    const ordenExistente = await this.repository.findById(parseInt(ordenId, 10));
    if (!ordenExistente) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    // 2. Obtener estado PROGRAMADA
    const estadoProgramada = await this.repository.findEstadoByCodigo('PROGRAMADA');
    if (!estadoProgramada) {
      throw new NotFoundException('No se encontró el estado PROGRAMADA en el catálogo');
    }

    // 3. Programar orden
    return await this.repository.programar(
      parseInt(ordenId, 10),
      fechaProgramada,
      null, // hora_programada
      estadoProgramada.id_estado,
      1 // TODO: obtener userId desde JWT
    );
  }
}
