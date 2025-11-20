// Command Handler - Crear Item Componente

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateItemComponenteCommand } from './create-item-componente.command';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../../domain/item-cotizacion-componente.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';

@Injectable()
@CommandHandler(CreateItemComponenteCommand)
export class CreateItemComponenteHandler
  implements ICommandHandler<CreateItemComponenteCommand>
{
  constructor(
    @Inject('ItemsComponentesRepository')
    private readonly itemsRepository: ItemsCotizacionComponentesRepository,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  async execute(
    command: CreateItemComponenteCommand,
  ): Promise<ItemCotizacionComponente> {
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
        'Solo se pueden agregar items a cotizaciones en estado BORRADOR',
      );
    }

    const errors = ItemCotizacionComponente.validate({
      id_cotizacion: command.idCotizacion,
      id_tipo_componente: command.idTipoComponente,
      descripcion: command.descripcion,
      cantidad: command.cantidad,
      precio_unitario: command.precioUnitario,
      descuento_porcentaje: command.descuentoPorcentaje,
    });

    if (errors.length > 0) {
      throw new BadRequestException(
        `Errores de validación: ${errors.join(', ')}`,
      );
    }

    const itemCreado = await this.itemsRepository.save({
      id_cotizacion: command.idCotizacion,
      id_componente: command.idComponente,
      id_tipo_componente: command.idTipoComponente,
      descripcion: command.descripcion,
      referencia_manual: command.referenciaManual,
      marca_manual: command.marcaManual,
      cantidad: command.cantidad,
      unidad: command.unidad,
      precio_unitario: command.precioUnitario,
      descuento_porcentaje: command.descuentoPorcentaje,
      garantia_meses: command.garantiaMeses,
      observaciones_garantia: command.observacionesGarantia,
      observaciones: command.observaciones,
      orden_item: command.ordenItem,
      registrado_por: command.registradoPor,
    });

    const nuevoSubtotalComponentes =
      await this.itemsRepository.calcularSubtotalComponentes(
        command.idCotizacion,
      );

    await this.cotizacionesRepository.update(command.idCotizacion, {
      subtotal_componentes: nuevoSubtotalComponentes,
    });

    const cotizacionActualizada = await this.cotizacionesRepository.findById(
      command.idCotizacion,
    );

    const { Cotizacion } = await import('../../../domain/cotizacion.entity');
    const totalesCalc = Cotizacion.calcularTotales(
      cotizacionActualizada!.subtotal_servicios || 0,
      nuevoSubtotalComponentes,
      cotizacionActualizada!.descuento_porcentaje || 0,
      cotizacionActualizada!.iva_porcentaje || 0,
    );

    const totalesRepository = {
      subtotal_servicios: cotizacionActualizada!.subtotal_servicios || 0,
      subtotal_componentes: nuevoSubtotalComponentes,
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
