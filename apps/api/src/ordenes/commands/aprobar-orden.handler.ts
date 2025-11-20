import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AprobarOrdenCommand } from './aprobar-orden.command';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { validarTransicion } from '../domain/workflow-estados';

@CommandHandler(AprobarOrdenCommand)
export class AprobarOrdenHandler implements ICommandHandler<AprobarOrdenCommand> {
  constructor(private readonly repository: PrismaOrdenServicioRepository) {}

  async execute(command: AprobarOrdenCommand): Promise<any> {
    const { ordenId, aprobadoPor } = command;

    const ordenExistente = await this.repository.findById(ordenId);
    if (!ordenExistente) {
      throw new NotFoundException(`Orden ${ordenId} no encontrada`);
    }

    // Validar transición
    const estadoActual = ordenExistente.estado.codigo_estado;
    validarTransicion(estadoActual, 'APROBADA');

    const estadoAprobada = await this.repository.findEstadoByCodigo('APROBADA');
    if (!estadoAprobada) {
      throw new BadRequestException('Estado APROBADA no encontrado');
    }

    return await this.repository.aprobar(
      ordenId,
      aprobadoPor,
      estadoAprobada.id_estado,
    );
  }
}
