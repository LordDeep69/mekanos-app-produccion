import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { AsignarTecnicoCommand } from './asignar-tecnico.command';

@CommandHandler(AsignarTecnicoCommand)
export class AsignarTecnicoHandler implements ICommandHandler<AsignarTecnicoCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository
  ) { }

  async execute(command: AsignarTecnicoCommand): Promise<any> {
    const { ordenId, tecnicoId } = command;

    // 1. Verificar existencia
    console.log(`[AsignarTecnicoHandler] Verificando orden ${ordenId}`);
    const id = typeof ordenId === 'string' ? parseInt(ordenId, 10) : ordenId;
    const ordenExistente = await this.repository.findById(id);
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
      typeof ordenId === 'string' ? parseInt(ordenId, 10) : ordenId,
      tecnicoId,
      estadoAsignada.id_estado,
      command.userId || 1
    );
    console.log(`[AsignarTecnicoHandler] Asignacion completada`);
    return result;
  }
}
