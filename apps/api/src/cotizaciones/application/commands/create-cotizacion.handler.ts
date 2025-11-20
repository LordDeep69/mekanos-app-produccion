import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCotizacionCommand } from './create-cotizacion.command';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { Cotizacion } from '../../domain/cotizacion.entity';

/**
 * CREATE COTIZACION HANDLER
 * 
 * Maneja la creación de una nueva cotización:
 * 1. Genera número de cotización automático (COT-YYYY-NNNN)
 * 2. Valida fechas (vencimiento > emisión)
 * 3. Crea cotización en estado BORRADOR (id_estado = 1)
 * 4. Inicializa totales en 0 (se calculan al agregar ítems)
 */
@Injectable()
@CommandHandler(CreateCotizacionCommand)
export class CreateCotizacionHandler implements ICommandHandler<CreateCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
  ) {}

  async execute(command: CreateCotizacionCommand): Promise<Cotizacion> {
    // 1. Validar fechas
    if (command.fecha_vencimiento <= command.fecha_cotizacion) {
      throw new BadRequestException('fecha_vencimiento debe ser posterior a fecha_cotizacion');
    }

    // 2. Generar número de cotización
    const numeroCotizacion = await this.repository.generateNumeroCotizacion();

    // 3. Crear cotización en estado BORRADOR
    const cotizacion = await this.repository.save({
      numero_cotizacion: numeroCotizacion,
      id_cliente: command.id_cliente,
      id_sede: command.id_sede,
      id_equipo: command.id_equipo,
      fecha_cotizacion: command.fecha_cotizacion,
      fecha_vencimiento: command.fecha_vencimiento,
      id_estado: 1, // BORRADOR
      asunto: command.asunto,
      descripcion_general: command.descripcion_general,
      alcance_trabajo: command.alcance_trabajo,
      exclusiones: command.exclusiones,
      // Totales iniciales en 0 (se calculan al agregar ítems)
      subtotal_servicios: 0,
      subtotal_componentes: 0,
      subtotal_general: 0,
      descuento_porcentaje: command.descuento_porcentaje || 0,
      descuento_valor: 0,
      subtotal_con_descuento: 0,
      iva_porcentaje: command.iva_porcentaje || 0,
      iva_valor: 0,
      total_cotizacion: 0,
      forma_pago: command.forma_pago || 'CONTADO',
      terminos_condiciones: command.terminos_condiciones,
      meses_garantia: command.meses_garantia || 3,
      observaciones_garantia: command.observaciones_garantia,
      tiempo_estimado_dias: command.tiempo_estimado_dias,
      elaborada_por: command.elaborada_por,
      modificado_por: command.elaborada_por,
    });

    return cotizacion;
  }
}
