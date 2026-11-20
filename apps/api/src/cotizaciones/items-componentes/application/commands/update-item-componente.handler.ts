// Command Handler - Actualizar Item Componente (Fuente Única de Verdad: CotizacionCalculoService)

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateItemComponenteCommand } from './update-item-componente.command';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../../domain/item-cotizacion-componente.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../../services/cotizacion-calculo.service';

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
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  async execute(
    command: UpdateItemComponenteCommand,
  ): Promise<ItemCotizacionComponente> {
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
        'Solo se pueden modificar items de cotizaciones en estado BORRADOR',
      );
    }

    const updateData: any = {};
    if (command.idEquipo !== undefined) updateData.id_equipo = command.idEquipo;
    if (command.idTipoComponente !== undefined)
      updateData.id_tipo_componente = command.idTipoComponente;
    if (command.descripcion !== undefined) updateData.descripcion = command.descripcion;
    if (command.referenciaManual !== undefined)
      updateData.referencia_manual = command.referenciaManual;
    if (command.marcaManual !== undefined) updateData.marca_manual = command.marcaManual;
    if (command.cantidad !== undefined) updateData.cantidad = command.cantidad;
    if (command.unidad !== undefined) updateData.unidad = command.unidad;
    if (command.costoUnitario !== undefined) updateData.costo_unitario = command.costoUnitario;
    if (command.precioUnitario !== undefined) updateData.precio_unitario = command.precioUnitario;
    if (command.descuentoPorcentaje !== undefined)
      updateData.descuento_porcentaje = command.descuentoPorcentaje;
    if (command.esOpcional !== undefined) updateData.es_opcional = command.esOpcional;
    if (command.ivaAplicable !== undefined) updateData.iva_aplicable = command.ivaAplicable;
    if (command.seccionTitulo !== undefined) updateData.seccion_titulo = command.seccionTitulo;
    if (command.garantiaMeses !== undefined) updateData.garantia_meses = command.garantiaMeses;
    if (command.observacionesGarantia !== undefined)
      updateData.observaciones_garantia = command.observacionesGarantia;
    if (command.observaciones !== undefined) updateData.observaciones = command.observaciones;
    if (command.ordenItem !== undefined) updateData.orden_item = command.ordenItem;

    const itemActualizado = await this.itemsRepository.update(
      command.idItemComponente,
      updateData,
    );

    await this.calculoService.recalcularTotales(command.idCotizacion);

    return itemActualizado;
  }
}
