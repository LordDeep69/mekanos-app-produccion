// Command Handler - Crear Item Servicio (Fuente Única de Verdad: CotizacionCalculoService)

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateItemServicioCommand } from './create-item-servicio.command';
import { ItemsCotizacionServiciosRepository } from '../../domain/items-cotizacion-servicios.repository.interface';
import { ItemCotizacionServicio } from '../../domain/item-cotizacion-servicio.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../../services/cotizacion-calculo.service';

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
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  async execute(
    command: CreateItemServicioCommand,
  ): Promise<ItemCotizacionServicio> {
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

    const errors = ItemCotizacionServicio.validate({
      id_cotizacion: command.idCotizacion,
      id_servicio: command.idServicio,
      descripcion_personalizada: command.descripcionPersonalizada,
      cantidad: command.cantidad,
      costo_unitario: command.costoUnitario,
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
      id_servicio: command.idServicio,
      id_equipo: command.idEquipo,
      cantidad: command.cantidad,
      unidad: command.unidad,
      costo_unitario: command.costoUnitario,
      precio_unitario: command.precioUnitario,
      descuento_porcentaje: command.descuentoPorcentaje,
      es_opcional: command.esOpcional,
      iva_aplicable: command.ivaAplicable,
      seccion_titulo: command.seccionTitulo,
      descripcion_personalizada: command.descripcionPersonalizada,
      observaciones: command.observaciones,
      justificacion_precio: command.justificacionPrecio,
      orden_item: command.ordenItem,
      registrado_por: command.registradoPor,
    });

    await this.calculoService.recalcularTotales(command.idCotizacion);

    return itemCreado;
  }
}
