import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaMovimientosInventarioRepository } from '../infrastructure/prisma-movimientos-inventario.repository';
import { RegistrarTrasladoCommand } from './registrar-traslado.command';

@CommandHandler(RegistrarTrasladoCommand)
export class RegistrarTrasladoHandler
  implements ICommandHandler<RegistrarTrasladoCommand>
{
  constructor(
    private readonly repository: PrismaMovimientosInventarioRepository,
  ) {}

  async execute(command: RegistrarTrasladoCommand) {
    const traslado = await this.repository.registrarTraslado({
      id_componente: command.id_componente,
      cantidad: command.cantidad,
      id_ubicacion_origen: command.id_ubicacion_origen,
      id_ubicacion_destino: command.id_ubicacion_destino,
      observaciones: command.observaciones,
      creado_por: command.userId,
    });

    return traslado;
  }
}
