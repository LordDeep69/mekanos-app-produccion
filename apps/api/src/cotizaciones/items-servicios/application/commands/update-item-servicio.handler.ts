// Command Handler - Actualizar Item Servicio (Fuente Única de Verdad: CotizacionCalculoService)

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateItemServicioCommand } from './update-item-servicio.command';
import { ItemsCotizacionServiciosRepository } from '../../domain/items-cotizacion-servicios.repository.interface';
import { ItemCotizacionServicio } from '../../domain/item-cotizacion-servicio.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../../services/cotizacion-calculo.service';

@Injectable()
@CommandHandler(UpdateItemServicioCommand)
export class UpdateItemServicioHandler
  implements ICommandHandler<UpdateItemServicioCommand>
{
  constructor(
    @Inject('ItemsServiciosRepository')
    private readonly itemsRepository: ItemsCotizacionServiciosRepository,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  async execute(
    command: UpdateItemServicioCommand,
  ): Promise<ItemCotizacionServicio> {
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
        'Solo se pueden modificar items de cotizaciones en estado BORRADOR',
      );
    }

    const updateData: any = {};
    if (command.idEquipo !== undefined) updateData.id_equipo = command.idEquipo;
    if (command.cantidad !== undefined) updateData.cantidad = command.cantidad;
    if (command.unidad !== undefined) updateData.unidad = command.unidad;
    if (command.costoUnitario !== undefined) updateData.costo_unitario = command.costoUnitario;
    if (command.precioUnitario !== undefined) updateData.precio_unitario = command.precioUnitario;
    if (command.descuentoPorcentaje !== undefined)
      updateData.descuento_porcentaje = command.descuentoPorcentaje;
    if (command.esOpcional !== undefined) updateData.es_opcional = command.esOpcional;
    if (command.ivaAplicable !== undefined) updateData.iva_aplicable = command.ivaAplicable;
    if (command.seccionTitulo !== undefined) updateData.seccion_titulo = command.seccionTitulo;
    if (command.descripcionPersonalizada !== undefined)
      updateData.descripcion_personalizada = command.descripcionPersonalizada;
    if (command.observaciones !== undefined) updateData.observaciones = command.observaciones;
    if (command.justificacionPrecio !== undefined)
      updateData.justificacion_precio = command.justificacionPrecio;
    if (command.ordenItem !== undefined) updateData.orden_item = command.ordenItem;

    const itemActualizado = await this.itemsRepository.update(
      command.idItemServicio,
      updateData,
    );

    await this.calculoService.recalcularTotales(command.idCotizacion);

    return itemActualizado;
  }
}
