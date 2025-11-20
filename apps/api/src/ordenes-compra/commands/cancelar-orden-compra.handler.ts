import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenCompraResult } from '../interfaces/ordenes-compra.repository.interface';
import { CancelarOrdenCompraCommand } from './cancelar-orden-compra.command';

@CommandHandler(CancelarOrdenCompraCommand)
export class CancelarOrdenCompraHandler implements ICommandHandler<CancelarOrdenCompraCommand> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(command: CancelarOrdenCompraCommand): Promise<OrdenCompraResult> {
    return await this.repository.cancelarOrdenCompra(
      command.id_orden_compra,
      command.motivo_cancelacion,
      command.userId,
    );
  }
}
