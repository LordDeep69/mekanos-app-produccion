import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { IniciarOrdenCommand } from './iniciar-orden.command';

@CommandHandler(IniciarOrdenCommand)
export class IniciarOrdenHandler implements ICommandHandler<IniciarOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository
  ) { }

  async execute(command: IniciarOrdenCommand): Promise<any> {
    const { ordenId } = command;
    const id = parseInt(ordenId, 10);

    // ✅ ZERO TRUST: Consultar estado actual ultraligero y estado EN_PROCESO en paralelo
    const [ordenActual, estadoEnProceso] = await Promise.all([
      this.repository.findEstadoActualById(id),
      this.repository.findEstadoByCodigo('EN_PROCESO'),
    ]);

    if (!ordenActual) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    if (!estadoEnProceso) {
      throw new NotFoundException('No se encontró el estado EN_PROCESO en el catálogo');
    }

    const codigoActual = ordenActual.estados_orden?.codigo_estado;
    const esFinal = ordenActual.estados_orden?.es_estado_final;

    // 1. Idempotencia: Si ya está en EN_PROCESO, retornar éxito sin mutar timestamps ni ensuciar DB
    if (codigoActual === 'EN_PROCESO' || ordenActual.id_estado_actual === estadoEnProceso.id_estado) {
      return {
        id_orden_servicio: ordenActual.id_orden_servicio,
        numero_orden: ordenActual.numero_orden,
        id_estado_actual: ordenActual.id_estado_actual,
        estados_orden: ordenActual.estados_orden,
        mensaje: 'La orden ya se encuentra en proceso (operación idempotente)',
      };
    }

    // 2. Blindaje FSM: Si está en un estado final (COMPLETADA, CERRADA, CANCELADA), BLOQUEAR terminantemente
    if (esFinal || ['COMPLETADA', 'CERRADA', 'CANCELADA'].includes(codigoActual || '')) {
      throw new ConflictException(
        `Transición inválida: La orden ${ordenActual.numero_orden} ya se encuentra en estado '${ordenActual.estados_orden?.nombre_estado || codigoActual}' y no puede volver a iniciarse.`
      );
    }

    // 3. Iniciar orden y registrar en historial
    return await this.repository.iniciar(
      id,
      estadoEnProceso.id_estado,
      1, // TODO: obtener userId desde JWT
      ordenActual.id_estado_actual
    );
  }
}
