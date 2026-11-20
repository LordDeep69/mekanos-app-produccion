// Command Handler - Crear Item Componente (Fuente Única de Verdad: CotizacionCalculoService)

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateItemComponenteCommand } from './create-item-componente.command';
import { ItemsCotizacionComponentesRepository } from '../../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../../domain/item-cotizacion-componente.entity';
import { CotizacionesRepository } from '../../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../../services/cotizacion-calculo.service';

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
    private readonly calculoService: CotizacionCalculoService,
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
      id_componente: command.idComponente,
      id_tipo_componente: command.idTipoComponente,
      id_equipo: command.idEquipo,
      descripcion: command.descripcion,
      referencia_manual: command.referenciaManual,
      marca_manual: command.marcaManual,
      cantidad: command.cantidad,
      unidad: command.unidad,
      costo_unitario: command.costoUnitario,
      precio_unitario: command.precioUnitario,
      descuento_porcentaje: command.descuentoPorcentaje,
      es_opcional: command.esOpcional,
      iva_aplicable: command.ivaAplicable,
      seccion_titulo: command.seccionTitulo,
      garantia_meses: command.garantiaMeses,
      observaciones_garantia: command.observacionesGarantia,
      observaciones: command.observaciones,
      orden_item: command.ordenItem,
      registrado_por: command.registradoPor,
    });

    await this.calculoService.recalcularTotales(command.idCotizacion);

    return itemCreado;
  }
}
