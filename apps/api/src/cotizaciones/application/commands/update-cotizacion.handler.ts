import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCotizacionCommand } from './update-cotizacion.command';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { Cotizacion } from '../../domain/cotizacion.entity';

/**
 * UPDATE COTIZACION HANDLER
 * 
 * Solo permite modificar cotizaciones en estado BORRADOR.
 * Si se cambia porcentaje_descuento o porcentaje_iva, recalcula totales.
 */
@Injectable()
@CommandHandler(UpdateCotizacionCommand)
export class UpdateCotizacionHandler implements ICommandHandler<UpdateCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
  ) {}

  async execute(command: UpdateCotizacionCommand): Promise<Cotizacion> {
    // 1. Verificar que existe
    const cotizacionExistente = await this.repository.findById(command.id_cotizacion);
    if (!cotizacionExistente) {
      throw new NotFoundException(`Cotización ${command.id_cotizacion} no encontrada`);
    }

    // 2. Verificar que está en BORRADOR (solo BORRADOR puede modificarse)
    if (cotizacionExistente.id_estado !== 1) {
      throw new BadRequestException(
        'Solo cotizaciones en estado BORRADOR pueden ser modificadas',
      );
    }

    // 3. Actualizar datos
    const cotizacionActualizada = await this.repository.update(command.id_cotizacion, {
      id_sede: command.id_sede,
      id_equipo: command.id_equipo,
      fecha_vencimiento: command.fecha_vencimiento,
      asunto: command.asunto,
      descripcion_general: command.descripcion_general,
      alcance_trabajo: command.alcance_trabajo,
      exclusiones: command.exclusiones,
      descuento_porcentaje: command.descuento_porcentaje,
      iva_porcentaje: command.iva_porcentaje,
      tiempo_estimado_dias: command.tiempo_estimado_dias,
      forma_pago: command.forma_pago,
      terminos_condiciones: command.terminos_condiciones,
      meses_garantia: command.meses_garantia,
      observaciones_garantia: command.observaciones_garantia,
      modificado_por: command.modificado_por,
    });

    // 4. Si cambió descuento o IVA, recalcular totales
    if (
      command.descuento_porcentaje !== undefined ||
      command.iva_porcentaje !== undefined
    ) {
      const totalesRecalculados = Cotizacion.calcularTotales(
        cotizacionActualizada.subtotal_servicios,
        cotizacionActualizada.subtotal_componentes,
        command.descuento_porcentaje ?? cotizacionActualizada.descuento_porcentaje,
        command.iva_porcentaje ?? cotizacionActualizada.iva_porcentaje,
      );

      return await this.repository.updateTotales(command.id_cotizacion, {
        subtotal_servicios: cotizacionActualizada.subtotal_servicios,
        subtotal_componentes: cotizacionActualizada.subtotal_componentes,
        subtotal_general: totalesRecalculados.subtotalGeneral,
        descuento_valor: totalesRecalculados.descuentoValor,
        subtotal_con_descuento: totalesRecalculados.subtotalConDescuento,
        iva_valor: totalesRecalculados.ivaValor,
        total_cotizacion: totalesRecalculados.totalCotizacion,
      });
    }

    return cotizacionActualizada;
  }
}
