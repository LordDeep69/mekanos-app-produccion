import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { EliminarDetalleServiciosOrdenCommand } from '../commands/eliminar-detalle-servicios-orden.command';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

@CommandHandler(EliminarDetalleServiciosOrdenCommand)
export class EliminarDetalleServiciosOrdenHandler implements ICommandHandler<EliminarDetalleServiciosOrdenCommand> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
  ) {}

  async execute(command: EliminarDetalleServiciosOrdenCommand): Promise<DetalleServiciosOrdenResponseDto> {
    const { id, modificadoPor } = command;

    // Validar existencia
    const detalleExistente = await this.repository.encontrarPorId(id);
    if (!detalleExistente) {
      throw new NotFoundException(`Detalle de servicio con ID ${id} no encontrado`);
    }

    // ✅ SOFT DELETE: Cambiar estado a CANCELADO
    const detalleEliminado = await this.repository.actualizar(id, {
      estado_servicio: 'CANCELADO',
      modificado_por: modificadoPor,
      fecha_modificacion: new Date(),
    });

    return detalleEliminado;
  }
}
