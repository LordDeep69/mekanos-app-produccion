import { PrismaService } from '@mekanos/database';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Cotizacion } from '../../domain/cotizacion.entity';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../services/cotizacion-calculo.service';
import { UpdateCotizacionCommand } from './update-cotizacion.command';

/**
 * UPDATE COTIZACION HANDLER (EAM-CPQ Universal)
 *
 * Solo permite modificar cotizaciones en estado BORRADOR.
 * Recalcula totales, AIU, IVA y rentabilidad usando CotizacionCalculoService.
 */
@Injectable()
@CommandHandler(UpdateCotizacionCommand)
export class UpdateCotizacionHandler implements ICommandHandler<UpdateCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly calculoService: CotizacionCalculoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UpdateCotizacionCommand): Promise<Cotizacion> {
    const cotizacionExistente = await this.repository.findById(command.id_cotizacion);
    if (!cotizacionExistente) {
      throw new NotFoundException(`Cotización ${command.id_cotizacion} no encontrada`);
    }

    if (cotizacionExistente.id_estado !== 1) {
      throw new BadRequestException(
        'Solo cotizaciones en estado BORRADOR pueden ser modificadas',
      );
    }

    const extras = command.extras || {};

    // Sincronizar equipos N:M si se envían
    let idEquipoPrincipal: number | null | undefined = command.id_equipo;
    if (extras.equipos_ids !== undefined) {
      const cleanIds = Array.from(
        new Set<number>(extras.equipos_ids.filter((id) => Number.isInteger(id) && id > 0)),
      );
      idEquipoPrincipal = cleanIds.length > 0 ? cleanIds[0] : null;
      await this.prisma.$transaction(async (tx) => {
        await tx.cotizaciones_equipos.deleteMany({
          where: { id_cotizacion: command.id_cotizacion },
        });
        if (cleanIds.length > 0) {
          await tx.cotizaciones_equipos.createMany({
            data: cleanIds.map((idEquipo, idx) => ({
              id_cotizacion: command.id_cotizacion,
              id_equipo: idEquipo,
              orden_secuencia: idx + 1,
            })),
          });
        }
      });
    }

    await this.repository.update(command.id_cotizacion, {
      id_sede: command.id_sede ?? undefined,
      id_equipo: idEquipoPrincipal ?? undefined,
      atencion_a_nombre: extras.atencion_a_nombre,
      atencion_a_cargo: extras.atencion_a_cargo,
      tipo_cotizacion: extras.tipo_cotizacion,
      moneda: extras.moneda,
      fecha_cotizacion: extras.fecha_cotizacion,
      fecha_vencimiento: command.fecha_vencimiento,
      asunto: command.asunto,
      descripcion_general: command.descripcion_general,
      alcance_trabajo: command.alcance_trabajo,
      exclusiones: command.exclusiones,
      descuento_porcentaje: command.descuento_porcentaje,
      iva_porcentaje: command.iva_porcentaje,
      usa_aiu: extras.usa_aiu,
      aiu_admin_porcentaje: extras.aiu_admin_porcentaje,
      aiu_imprevistos_porcentaje: extras.aiu_imprevistos_porcentaje,
      aiu_utilidad_porcentaje: extras.aiu_utilidad_porcentaje,
      iva_sobre_utilidad_aiu: extras.iva_sobre_utilidad_aiu,
      modo_agrupacion_pdf: extras.modo_agrupacion_pdf,
      mostrar_desglose_precios: extras.mostrar_desglose_precios,
      tiempo_estimado_dias: command.tiempo_estimado_dias,
      forma_pago: command.forma_pago,
      terminos_condiciones: command.terminos_condiciones,
      meses_garantia: command.meses_garantia,
      observaciones_garantia: command.observaciones_garantia,
      modificado_por: command.modificado_por,
    });

    const requiereRecalculo =
      command.descuento_porcentaje !== undefined ||
      command.iva_porcentaje !== undefined ||
      extras.usa_aiu !== undefined ||
      extras.aiu_admin_porcentaje !== undefined ||
      extras.aiu_imprevistos_porcentaje !== undefined ||
      extras.aiu_utilidad_porcentaje !== undefined ||
      extras.iva_sobre_utilidad_aiu !== undefined;

    if (requiereRecalculo) {
      await this.calculoService.recalcularTotales(command.id_cotizacion);
    }

    return (await this.repository.findById(command.id_cotizacion, {
      cliente: true,
      sede: true,
      equipo: true,
      estado: true,
      items_servicios: true,
      items_componentes: true,
      aprobaciones: true,
    }))!;
  }
}
