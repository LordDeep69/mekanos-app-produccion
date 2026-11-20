import { PrismaService } from '@mekanos/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Cotizacion } from '../../domain/cotizacion.entity';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { CreateCotizacionCommand } from './create-cotizacion.command';

/**
 * CREATE COTIZACION HANDLER (EAM-CPQ Universal)
 */
@Injectable()
@CommandHandler(CreateCotizacionCommand)
export class CreateCotizacionHandler implements ICommandHandler<CreateCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateCotizacionCommand): Promise<Cotizacion> {
    if (command.fecha_vencimiento <= command.fecha_cotizacion) {
      throw new BadRequestException('fecha_vencimiento debe ser posterior a fecha_cotizacion');
    }

    const extras = command.extras || {};

    // Resolver empleado elaborador (explícito → JWT → primer empleado activo)
    let elaboradaPor = command.elaborada_por ?? extras.user_empleado_id ?? undefined;
    if (!elaboradaPor) {
      const empFallback = await this.prisma.empleados.findFirst({
        where: { empleado_activo: true },
        orderBy: { id_empleado: 'asc' },
        select: { id_empleado: true },
      });
      if (!empFallback) {
        throw new BadRequestException(
          'No se encontró un empleado activo para asignar como elaborador de la cotización',
        );
      }
      elaboradaPor = empFallback.id_empleado;
    }

    // Leer defaults de configuración de organización (moneda, IVA, términos, garantía)
    const org = await this.prisma.configuracion_organizacion
      .findUnique({
        where: { id_configuracion: 1 },
        select: {
          codigo_moneda: true,
          tasa_impuesto_defecto: true,
          garantia_meses_defecto: true,
          terminos_cotizacion_defecto: true,
        },
      })
      .catch(() => null);

    // Equipos normalizados (N:M + principal legacy)
    const equiposIds = Array.from(
      new Set<number>(
        [
          ...(extras.equipos_ids || []),
          ...(command.id_equipo ? [command.id_equipo] : []),
        ].filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    const idEquipoPrincipal = equiposIds.length > 0 ? equiposIds[0] : command.id_equipo;

    const numeroCotizacion = await this.repository.generateNumeroCotizacion();

    const ivaPorcentaje =
      command.iva_porcentaje !== undefined
        ? command.iva_porcentaje
        : org?.tasa_impuesto_defecto !== undefined && org?.tasa_impuesto_defecto !== null
          ? Number(org.tasa_impuesto_defecto)
          : 19;

    const cotizacion = await this.repository.save({
      numero_cotizacion: numeroCotizacion,
      id_cliente: command.id_cliente,
      id_sede: command.id_sede,
      id_equipo: idEquipoPrincipal,
      tipo_cotizacion: extras.tipo_cotizacion || 'SERVICIO_TECNICO',
      id_plantilla_origen: extras.id_plantilla_origen,
      id_propuesta_origen: extras.id_propuesta_origen,
      moneda: extras.moneda || org?.codigo_moneda || 'COP',
      fecha_cotizacion: command.fecha_cotizacion,
      fecha_vencimiento: command.fecha_vencimiento,
      id_estado: 1, // BORRADOR
      asunto: command.asunto,
      descripcion_general: command.descripcion_general,
      alcance_trabajo: command.alcance_trabajo,
      exclusiones: command.exclusiones,
      subtotal_servicios: 0,
      subtotal_componentes: 0,
      subtotal_otros: 0,
      subtotal_general: 0,
      subtotal_opcionales: 0,
      descuento_porcentaje: command.descuento_porcentaje ?? 0,
      descuento_valor: 0,
      subtotal_con_descuento: 0,
      usa_aiu: Boolean(extras.usa_aiu),
      aiu_admin_porcentaje: extras.aiu_admin_porcentaje ?? 0,
      aiu_imprevistos_porcentaje: extras.aiu_imprevistos_porcentaje ?? 0,
      aiu_utilidad_porcentaje: extras.aiu_utilidad_porcentaje ?? 0,
      iva_sobre_utilidad_aiu: Boolean(extras.iva_sobre_utilidad_aiu),
      iva_porcentaje: ivaPorcentaje,
      iva_valor: 0,
      total_cotizacion: 0,
      modo_agrupacion_pdf: extras.modo_agrupacion_pdf || 'POR_CATEGORIA',
      forma_pago: command.forma_pago || 'CONTADO',
      terminos_condiciones:
        command.terminos_condiciones ?? org?.terminos_cotizacion_defecto ?? undefined,
      meses_garantia: command.meses_garantia ?? org?.garantia_meses_defecto ?? 3,
      observaciones_garantia: command.observaciones_garantia,
      tiempo_estimado_dias: command.tiempo_estimado_dias,
      elaborada_por: elaboradaPor,
      modificado_por: extras.user_id ?? elaboradaPor,
    });

    // Sincronizar todos los equipos N:M
    if (equiposIds.length > 0) {
      await Promise.all(
        equiposIds.map((idEquipo, idx) =>
          this.prisma.cotizaciones_equipos.upsert({
            where: {
              id_cotizacion_id_equipo: {
                id_cotizacion: cotizacion.id_cotizacion,
                id_equipo: idEquipo,
              },
            },
            create: {
              id_cotizacion: cotizacion.id_cotizacion,
              id_equipo: idEquipo,
              orden_secuencia: idx + 1,
            },
            update: { orden_secuencia: idx + 1 },
          }),
        ),
      );
    }

    return (
      (await this.repository.findById(cotizacion.id_cotizacion, {
        cliente: true,
        sede: true,
        equipo: true,
        estado: true,
        items_servicios: true,
        items_componentes: true,
        aprobaciones: true,
      })) || cotizacion
    );
  }
}
