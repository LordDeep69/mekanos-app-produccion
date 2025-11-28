import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { AsignarTecnicoCommand } from './asignar-tecnico.command';

@CommandHandler(AsignarTecnicoCommand)
export class AsignarTecnicoHandler implements ICommandHandler<AsignarTecnicoCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository
  ) {}

  async execute(command: AsignarTecnicoCommand): Promise<any> {
    const { ordenId, tecnicoId } = command;

    // 1. Verificar existencia
    console.log(`[AsignarTecnicoHandler] Verificando orden ${ordenId}`);
    const ordenExistente = await this.repository.findById(parseInt(ordenId, 10));
    if (!ordenExistente) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    // 2. Obtener estado ASIGNADA
    console.log(`[AsignarTecnicoHandler] Buscando estado ASIGNADA`);
    const estadoAsignada = await this.repository.findEstadoByCodigo('ASIGNADA');
    if (!estadoAsignada) {
      throw new NotFoundException('No se encontró el estado ASIGNADA en el catálogo');
    }

    // 3. Asignar técnico
    console.log(`[AsignarTecnicoHandler] Asignando tecnico ${tecnicoId} a orden ${ordenId}`);
    const result = await this.repository.asignarTecnico(
      parseInt(ordenId, 10),
      tecnicoId,
      estadoAsignada.id_estado,
      1 // TODO: obtener userId desde JWT
    );
    console.log(`[AsignarTecnicoHandler] Asignacion completada`);
    return result;
  }
}
