// Command Handler - Eliminar Item Componente

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteItemComponenteCommand } from './delete-item-componente.command';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';

@Injectable()
@CommandHandler(DeleteItemComponenteCommand)
export class DeleteItemComponenteHandler
  implements ICommandHandler<DeleteItemComponenteCommand>
{
  constructor(
    @Inject('ItemsComponentesRepository')
    private readonly itemsRepository: ItemsCotizacionComponentesRepository,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  async execute(command: DeleteItemComponenteCommand): Promise<void> {
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
        'Solo se pueden eliminar items de cotizaciones en estado BORRADOR',
      );
    }

    await this.itemsRepository.delete(command.idItemComponente);

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
  }
}
