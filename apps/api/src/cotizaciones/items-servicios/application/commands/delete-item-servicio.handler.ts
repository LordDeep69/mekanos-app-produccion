// Command Handler - Eliminar Item Servicio (Fuente Única de Verdad: CotizacionCalculoService)

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteItemServicioCommand } from './delete-item-servicio.command';
import { ItemsCotizacionServiciosRepository } from '../../domain/items-cotizacion-servicios.repository.interface';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../../services/cotizacion-calculo.service';

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
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  async execute(command: DeleteItemServicioCommand): Promise<void> {
    const itemExistente = await this.itemsRepository.findById(
      command.idItemServicio,
    );
    if (!itemExistente || itemExistente.id_cotizacion !== command.idCotizacion) {
      throw new BadRequestException(
        `Item servicio ${command.idItemServicio} no pertenece a la cotización ${command.idCotizacion}`,
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

    await this.itemsRepository.delete(command.idItemServicio);
    await this.calculoService.recalcularTotales(command.idCotizacion);
  }
}
