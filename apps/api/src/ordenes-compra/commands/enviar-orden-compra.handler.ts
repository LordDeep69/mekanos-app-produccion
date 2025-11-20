import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenCompraResult } from '../interfaces/ordenes-compra.repository.interface';
import { EnviarOrdenCompraCommand } from './enviar-orden-compra.command';

@CommandHandler(EnviarOrdenCompraCommand)
export class EnviarOrdenCompraHandler implements ICommandHandler<EnviarOrdenCompraCommand> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(command: EnviarOrdenCompraCommand): Promise<OrdenCompraResult> {
    return await this.repository.enviarOrdenCompra(command.id_orden_compra, command.userId);
  }
}
