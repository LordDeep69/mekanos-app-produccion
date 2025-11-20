// Command Handler - Actualizar Item Componente

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateItemComponenteCommand } from './update-item-componente.command';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../../domain/item-cotizacion-componente.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';

@Injectable()
@CommandHandler(UpdateItemComponenteCommand)
export class UpdateItemComponenteHandler
  implements ICommandHandler<UpdateItemComponenteCommand>
{
  constructor(
    @Inject('ItemsComponentesRepository')
    private readonly itemsRepository: ItemsCotizacionComponentesRepository,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  async execute(
    command: UpdateItemComponenteCommand,
  ): Promise<ItemCotizacionComponente> {
    const itemExistente = await this.itemsRepository.findById(
      command.idItemComponente,
    );
    if (!itemExistente) {
      throw new BadRequestException(
        `Item componente ${command.idItemComponente} no encontrado`,
      );
    }

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
        'Solo se pueden modificar items de cotizaciones en estado BORRADOR',
      );
    }

    // Construir objeto update solo con campos definidos
    const updateData: any = {};
    if (command.descripcion !== undefined) updateData.descripcion = command.descripcion;
    if (command.referenciaManual !== undefined) updateData.referencia_manual = command.referenciaManual;
    if (command.marcaManual !== undefined) updateData.marca_manual = command.marcaManual;
    if (command.cantidad !== undefined) updateData.cantidad = command.cantidad;
    if (command.unidad !== undefined) updateData.unidad = command.unidad;
    if (command.precioUnitario !== undefined) updateData.precio_unitario = command.precioUnitario;
    if (command.descuentoPorcentaje !== undefined) updateData.descuento_porcentaje = command.descuentoPorcentaje;
    if (command.garantiaMeses !== undefined) updateData.garantia_meses = command.garantiaMeses;
    if (command.observacionesGarantia !== undefined) updateData.observaciones_garantia = command.observacionesGarantia;
    if (command.observaciones !== undefined) updateData.observaciones = command.observaciones;
    if (command.ordenItem !== undefined) updateData.orden_item = command.ordenItem;

    const itemActualizado = await this.itemsRepository.update(
      command.idItemComponente,
      updateData,
    );

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

    return itemActualizado;
  }
}
