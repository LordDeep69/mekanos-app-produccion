import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CancelarOrdenCommand } from './cancelar-orden.command';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { permiteCancelacion } from '../domain/workflow-estados';

/**
 * Handler: Cancelar orden de servicio
 * 
 * LÓGICA DE NEGOCIO:
 * 1. Verificar que la orden existe
 * 2. Validar que el estado actual permite cancelación (no finales)
 * 3. Cambiar estado a CANCELADA
 * 4. Registrar motivo en observaciones_cierre
 */
@CommandHandler(CancelarOrdenCommand)
export class CancelarOrdenHandler implements ICommandHandler<CancelarOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository,
  ) {}

  async execute(command: CancelarOrdenCommand): Promise<any> {
    const { ordenId, motivoCancelacion, userId } = command;

    // 1. Verificar existencia
    const ordenExistente = await this.repository.findById(ordenId);
    if (!ordenExistente) {
      throw new NotFoundException(`Orden de servicio ${ordenId} no encontrada`);
    }

    // 2. Validar que permite cancelación
    const estadoCodigo = ordenExistente.estado.codigo_estado;
    if (!permiteCancelacion(estadoCodigo)) {
      throw new BadRequestException(
        `No se puede cancelar la orden en estado ${estadoCodigo}. ` +
        `Los estados finales (APROBADA, CANCELADA) no permiten cambios.`,
      );
    }

    // 3. Obtener estado CANCELADA
    const estadoCancelada = await this.repository.findEstadoByCodigo('CANCELADA');
    if (!estadoCancelada) {
      throw new BadRequestException('No se encontró el estado CANCELADA en el catálogo');
    }

    // 4. Cancelar orden
    return await this.repository.cancelar(
      ordenId,
      motivoCancelacion,
      estadoCancelada.id_estado,
      userId,
    );
  }
}
