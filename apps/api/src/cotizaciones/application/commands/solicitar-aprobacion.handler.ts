import { PrismaService } from '@mekanos/database';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../services/cotizacion-calculo.service';
import { SolicitarAprobacionCommand } from './solicitar-aprobacion.command';

/**
 * SOLICITAR APROBACION HANDLER (Gobernanza Comercial White-Label Dinámica)
 *
 * Lee umbrales de monto, descuento y margen mínimo desde `configuracion_organizacion`:
 * - Total > umbral_aprobacion_gerente OR Descuento > descuento_max_sin_aprobacion + 10%
 *   OR Margen Bruto < margen_minimo_aprobacion (cuando hay costos registrados) => GERENTE
 * - Total > umbral_aprobacion_supervisor OR Descuento > descuento_max_sin_aprobacion => SUPERVISOR
 * - De lo contrario => APROBADA_INTERNA automática (id_estado = 3)
 */
@Injectable()
@CommandHandler(SolicitarAprobacionCommand)
export class SolicitarAprobacionHandler implements ICommandHandler<SolicitarAprobacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly prisma: PrismaService,
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  async execute(command: SolicitarAprobacionCommand): Promise<any> {
    const cotizacionInicial = await this.repository.findById(command.idCotizacion);
    if (!cotizacionInicial) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    if (cotizacionInicial.id_estado !== 1) {
      throw new BadRequestException(
        `Solo cotizaciones BORRADOR pueden solicitar aprobación. Estado actual: ${cotizacionInicial.id_estado}`,
      );
    }

    // Recalcular totales para garantizar evaluación con cifras exactas
    const totales = await this.calculoService.recalcularTotales(command.idCotizacion);
    const cotizacion = (await this.repository.findById(command.idCotizacion))!;

    const org = await this.prisma.configuracion_organizacion
      .findUnique({
        where: { id_configuracion: 1 },
        select: {
          codigo_moneda: true,
          simbolo_moneda: true,
          umbral_aprobacion_supervisor: true,
          umbral_aprobacion_gerente: true,
          descuento_max_sin_aprobacion: true,
          margen_minimo_aprobacion: true,
        },
      })
      .catch(() => null);

    const umbrales = {
      moneda: cotizacion.moneda || org?.codigo_moneda || 'COP',
      simbolo: org?.simbolo_moneda || '$',
      supervisorTotal: Number(org?.umbral_aprobacion_supervisor ?? 5000000),
      gerenteTotal: Number(org?.umbral_aprobacion_gerente ?? 15000000),
      supervisorDescuento: Number(org?.descuento_max_sin_aprobacion ?? 15),
      gerenteDescuento: Math.min(100, Number(org?.descuento_max_sin_aprobacion ?? 15) + 10),
      margenMinimoAprobacion: Number(org?.margen_minimo_aprobacion ?? 18),
    };

    const nivelAprobacion = this.determinarNivelAprobacion(
      Number(totales.total_cotizacion),
      cotizacion.descuento_porcentaje ?? 0,
      Number(totales.costo_total_estimado),
      Number(totales.margen_bruto_porcentaje),
      umbrales,
    );

    if (nivelAprobacion.nivel === 'NINGUNO') {
      await this.repository.update(command.idCotizacion, {
        id_estado: 3, // APROBADA_INTERNA
        aprobada_internamente_por: command.solicitadaPor,
        fecha_aprobacion_interna: new Date(),
        modificado_por: command.solicitadaPor,
      });

      return {
        message: 'Cotización dentro de políticas comerciales, aprobada automáticamente',
        cotizacion: await this.repository.findById(command.idCotizacion, {
          cliente: true,
          sede: true,
          equipo: true,
          estado: true,
          items_servicios: true,
          items_componentes: true,
          aprobaciones: true,
        }),
        requiere_aprobacion: false,
        razon: nivelAprobacion.razon,
      };
    }

    const aprobacion = await this.prisma.aprobaciones_cotizacion.create({
      data: {
        id_cotizacion: command.idCotizacion,
        nivel_aprobacion: nivelAprobacion.nivel as any,
        razon_nivel: nivelAprobacion.razon,
        estado_aprobacion: 'PENDIENTE',
        solicitada_por: command.solicitadaPor,
        observaciones_solicitante: command.observacionesSolicitante,
        metadata: {
          total_cotizacion: Number(totales.total_cotizacion),
          descuento_porcentaje: cotizacion.descuento_porcentaje,
          costo_total_estimado: Number(totales.costo_total_estimado),
          margen_bruto_porcentaje: Number(totales.margen_bruto_porcentaje),
          moneda: umbrales.moneda,
          notificacion_enviada: false,
        },
      },
      include: {
        cotizaciones: {
          select: {
            numero_cotizacion: true,
            total_cotizacion: true,
          },
        },
      },
    });

    await this.repository.update(command.idCotizacion, {
      id_estado: 2, // EN_REVISION
      modificado_por: command.solicitadaPor,
    });

    return {
      message: `Solicitud de aprobación (${nivelAprobacion.nivel}) creada exitosamente`,
      cotizacion: await this.repository.findById(command.idCotizacion, {
        cliente: true,
        sede: true,
        equipo: true,
        estado: true,
        items_servicios: true,
        items_componentes: true,
        aprobaciones: true,
      }),
      aprobacion,
      requiere_aprobacion: true,
      razon: nivelAprobacion.razon,
    };
  }

  private determinarNivelAprobacion(
    total: number,
    descuento: number,
    costoTotal: number,
    margenPct: number,
    umbrales: {
      moneda: string;
      simbolo: string;
      supervisorTotal: number;
      gerenteTotal: number;
      supervisorDescuento: number;
      gerenteDescuento: number;
      margenMinimoAprobacion: number;
    },
  ): { nivel: 'GERENTE' | 'SUPERVISOR' | 'NINGUNO'; razon: string } {
    const fmt = (n: number) => `${umbrales.simbolo}${n.toLocaleString('es-CO')} ${umbrales.moneda}`;
    const razonesGerente: string[] = [];

    if (total > umbrales.gerenteTotal) {
      razonesGerente.push(`Total ${fmt(total)} supera umbral gerencial (${fmt(umbrales.gerenteTotal)})`);
    }
    if (descuento > umbrales.gerenteDescuento) {
      razonesGerente.push(`Descuento ${descuento}% supera límite gerencial (${umbrales.gerenteDescuento}%)`);
    }
    if (costoTotal > 0 && margenPct < umbrales.margenMinimoAprobacion) {
      razonesGerente.push(
        `Margen bruto estimado (${margenPct.toFixed(1)}%) está por debajo del piso gerencial (${umbrales.margenMinimoAprobacion}%)`,
      );
    }

    if (razonesGerente.length > 0) {
      return { nivel: 'GERENTE', razon: razonesGerente.join(' · ') };
    }

    const razonesSupervisor: string[] = [];
    if (total > umbrales.supervisorTotal) {
      razonesSupervisor.push(
        `Total ${fmt(total)} supera umbral de supervisión (${fmt(umbrales.supervisorTotal)})`,
      );
    }
    if (descuento > umbrales.supervisorDescuento) {
      razonesSupervisor.push(
        `Descuento ${descuento}% supera límite sin aprobación (${umbrales.supervisorDescuento}%)`,
      );
    }

    if (razonesSupervisor.length > 0) {
      return { nivel: 'SUPERVISOR', razon: razonesSupervisor.join(' · ') };
    }

    return {
      nivel: 'NINGUNO',
      razon: `Total ${fmt(total)}, descuento ${descuento}% y rentabilidad dentro de políticas automáticas`,
    };
  }
}
