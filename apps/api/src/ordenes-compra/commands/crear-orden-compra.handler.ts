import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from '../infrastructure/prisma-ordenes-compra.repository';
import { OrdenCompraResult } from '../interfaces/ordenes-compra.repository.interface';
import { CrearOrdenCompraCommand } from './crear-orden-compra.command';

@CommandHandler(CrearOrdenCompraCommand)
export class CrearOrdenCompraHandler implements ICommandHandler<CrearOrdenCompraCommand> {
  constructor(private readonly repository: PrismaOrdenesCompraRepository) {}

  async execute(command: CrearOrdenCompraCommand): Promise<OrdenCompraResult> {
    const fechaNecesidad = command.fecha_necesidad ? new Date(command.fecha_necesidad) : undefined;

    return await this.repository.crearOrdenCompra({
      numero_orden_compra: command.numero_orden_compra,
      id_proveedor: command.id_proveedor,
      fecha_necesidad: fechaNecesidad,
      observaciones: command.observaciones,
      solicitada_por: command.userId,
      items: command.items,
    });
  }
}
