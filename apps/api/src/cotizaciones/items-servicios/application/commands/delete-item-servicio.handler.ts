// Command Handler - Eliminar Item Servicio

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteItemServicioCommand } from './delete-item-servicio.command';
import { ItemsCotizacionServiciosRepository } from '../../domain/items-cotizacion-servicios.repository.interface';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';

@Injectable()
@CommandHandler(DeleteItemServicioCommand)
export class DeleteItemServicioHandler
  implements ICommandHandler<DeleteItemServicioCommand>
{
  constructor(
    @Inject('ItemsServiciosRepository')
    private readonly itemsRepository: ItemsCotizacionServiciosRepository,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  async execute(command: DeleteItemServicioCommand): Promise<void> {
    // 1. Validar que el item exista
    const itemExistente = await this.itemsRepository.findById(
      command.idItemServicio,
    );
    if (!itemExistente) {
      throw new BadRequestException(
        `Item servicio ${command.idItemServicio} no encontrado`,
      );
    }

    // 2. Validar que la cotización esté en estado BORRADOR
    const cotizacion = await this.cotizacionesRepository.findById(
      command.idCotizacion,
    );
    if (!cotizacion) {
      throw new BadRequestException(
        `Cotización ${command.idCotizacion} no encontrada`,
      );
    }

    if (cotizacion.id_estado !== 1) {
      throw new BadRequestException(
        'Solo se pueden eliminar items de cotizaciones en estado BORRADOR',
      );
    }

    // 3. Eliminar item servicio
    await this.itemsRepository.delete(command.idItemServicio);

    // 4. Recalcular subtotal_servicios de la cotización
    const nuevoSubtotalServicios =
      await this.itemsRepository.calcularSubtotalServicios(
        command.idCotizacion,
      );

    // 5. Actualizar totales de la cotización
    await this.cotizacionesRepository.update(command.idCotizacion, {
      subtotal_servicios: nuevoSubtotalServicios,
    });

    // 6. Recalcular totales generales cotización
    const cotizacionActualizada = await this.cotizacionesRepository.findById(
      command.idCotizacion,
    );

    const { Cotizacion } = await import('../../../domain/cotizacion.entity');
    const totalesCalc = Cotizacion.calcularTotales(
      nuevoSubtotalServicios,
      cotizacionActualizada!.subtotal_componentes || 0,
      cotizacionActualizada!.descuento_porcentaje || 0,
      cotizacionActualizada!.iva_porcentaje || 0,
    );

    const totalesRepository = {
      subtotal_servicios: nuevoSubtotalServicios,
      subtotal_componentes: cotizacionActualizada!.subtotal_componentes || 0,
      subtotal_general: totalesCalc.subtotalGeneral,
      descuento_valor: totalesCalc.descuentoValor,
      subtotal_con_descuento: totalesCalc.subtotalConDescuento,
      iva_valor: totalesCalc.ivaValor,
      total_cotizacion: totalesCalc.totalCotizacion,
    };

    await this.cotizacionesRepository.updateTotales(
      command.idCotizacion,
      totalesRepository,
    );
  }
}
