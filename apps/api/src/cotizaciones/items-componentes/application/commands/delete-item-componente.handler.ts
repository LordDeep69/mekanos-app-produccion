// Command Handler - Eliminar Item Componente (Fuente Única de Verdad: CotizacionCalculoService)

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteItemComponenteCommand } from './delete-item-componente.command';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../../services/cotizacion-calculo.service';

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
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  async execute(command: DeleteItemComponenteCommand): Promise<void> {
    const itemExistente = await this.itemsRepository.findById(
      command.idItemComponente,
    );
    if (!itemExistente || itemExistente.id_cotizacion !== command.idCotizacion) {
      throw new BadRequestException(
        `Item componente ${command.idItemComponente} no pertenece a la cotización ${command.idCotizacion}`,
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
    await this.calculoService.recalcularTotales(command.idCotizacion);
  }
}
