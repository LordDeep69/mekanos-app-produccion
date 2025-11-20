// Command Handler - Crear Item Servicio

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateItemServicioCommand } from './create-item-servicio.command';
import { ItemsCotizacionServiciosRepository } from '../../domain/items-cotizacion-servicios.repository.interface';
import { ItemCotizacionServicio } from '../../domain/item-cotizacion-servicio.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';

@Injectable()
@CommandHandler(CreateItemServicioCommand)
export class CreateItemServicioHandler
  implements ICommandHandler<CreateItemServicioCommand>
{
  constructor(
    @Inject('ItemsServiciosRepository')
    private readonly itemsRepository: ItemsCotizacionServiciosRepository,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  async execute(
    command: CreateItemServicioCommand,
  ): Promise<ItemCotizacionServicio> {
    // 1. Validar que la cotización exista
    const cotizacion = await this.cotizacionesRepository.findById(
      command.idCotizacion,
    );
    if (!cotizacion) {
      throw new BadRequestException(
        `Cotización ${command.idCotizacion} no encontrada`,
      );
    }

    // 2. Validar que cotización esté en estado BORRADOR (id_estado = 1)
    if (cotizacion.id_estado !== 1) {
      throw new BadRequestException(
        'Solo se pueden agregar items a cotizaciones en estado BORRADOR',
      );
    }

    // 3. Validar datos del item
    const errors = ItemCotizacionServicio.validate({
      id_cotizacion: command.idCotizacion,
      id_servicio: command.idServicio,
      cantidad: command.cantidad,
      precio_unitario: command.precioUnitario,
      descuento_porcentaje: command.descuentoPorcentaje,
    });

    if (errors.length > 0) {
      throw new BadRequestException(
        `Errores de validación: ${errors.join(', ')}`,
      );
    }

    // 4. Crear item servicio
    const itemCreado = await this.itemsRepository.save({
      id_cotizacion: command.idCotizacion,
      id_servicio: command.idServicio,
      cantidad: command.cantidad,
      unidad: command.unidad,
      precio_unitario: command.precioUnitario,
      descuento_porcentaje: command.descuentoPorcentaje,
      descripcion_personalizada: command.descripcionPersonalizada,
      observaciones: command.observaciones,
      justificacion_precio: command.justificacionPrecio,
      orden_item: command.ordenItem,
      registrado_por: command.registradoPor,
    });

    // 5. Recalcular subtotal_servicios de la cotización
    const nuevoSubtotalServicios =
      await this.itemsRepository.calcularSubtotalServicios(
        command.idCotizacion,
      );

    // 6. Actualizar totales de la cotización
    await this.cotizacionesRepository.update(command.idCotizacion, {
      subtotal_servicios: nuevoSubtotalServicios,
    });

    // 7. Recalcular totales generales cotización
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

    return itemCreado;
  }
}
