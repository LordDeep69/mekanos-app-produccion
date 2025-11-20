import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaLotesComponentesRepository } from '../infrastructure/prisma-lotes-componentes.repository';
import { CrearLoteCommand } from './crear-lote.command';

@CommandHandler(CrearLoteCommand)
export class CrearLoteHandler implements ICommandHandler<CrearLoteCommand> {
  constructor(private readonly repository: PrismaLotesComponentesRepository) {}

  async execute(command: CrearLoteCommand) {
    return this.repository.crear({
      codigo_lote: command.codigo_lote,
      id_componente: command.id_componente,
      cantidad_inicial: command.cantidad_inicial,
      ingresado_por: command.ingresado_por,
      fecha_fabricacion: command.fecha_fabricacion,
      fecha_vencimiento: command.fecha_vencimiento,
      id_proveedor: command.id_proveedor,
      numero_factura_proveedor: command.numero_factura_proveedor,
      observaciones: command.observaciones,
    });
  }
}
