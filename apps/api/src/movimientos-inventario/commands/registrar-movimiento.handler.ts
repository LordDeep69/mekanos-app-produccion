import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaMovimientosInventarioRepository } from '../infrastructure/prisma-movimientos-inventario.repository';
import { RegistrarMovimientoCommand } from './registrar-movimiento.command';

@CommandHandler(RegistrarMovimientoCommand)
export class RegistrarMovimientoHandler
  implements ICommandHandler<RegistrarMovimientoCommand>
{
  constructor(
    private readonly repository: PrismaMovimientosInventarioRepository,
  ) {}

  async execute(command: RegistrarMovimientoCommand) {
    const movimiento = await this.repository.registrarMovimiento({
      tipo_movimiento: command.tipo_movimiento as any,
      origen_movimiento: command.origen_movimiento as any,
      id_componente: command.id_componente,
      cantidad: command.cantidad,
      id_ubicacion: command.id_ubicacion,
      id_lote: command.id_lote,
      id_orden_servicio: command.id_orden_servicio,
      id_orden_compra: command.id_orden_compra,
      id_remision: command.id_remision,
      observaciones: command.observaciones,
      realizado_por: command.userId,
    });

    return movimiento;
  }
}
