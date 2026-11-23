import { PrismaService } from '@mekanos/database';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../../services/cotizacion-calculo.service';
import { SolicitarAprobacionCommand } from './solicitar-aprobacion.command';

/**
 * Políticas de gobernanza CPQ leídas de `configuracion_organizacion` (exclusivo para COT, nunca PROP).
 */
export interface PoliticasGobernanzaCpq {
  enable_cpq_governance: boolean;
  moneda: string;
  simbolo: string;
  locale?: string;
  decimales?: number;
  umbral_aprobacion_supervisor?: number | null;
  umbral_aprobacion_gerente?: number | null;
  descuento_max_sin_aprobacion?: number | null;
  margen_minimo_alerta?: number | null;
  margen_minimo_aprobacion?: number | null;
}

export interface ResultadoGobernanzaCpq {
  nivel: 'GERENTE' | 'SUPERVISOR' | 'NINGUNO';
  estadoGobernanza: 'GERENTE' | 'SUPERVISOR' | 'ALERTA_MARGEN' | 'LIBRE' | 'MODO_AGIL';
  alertaMargen: boolean;
  razon: string;
}

/**
 * Evalúa las 5 reglas oficiales de gobernanza comercial CPQ para Cotizaciones (COT):
 * 1. Exclusivo para COT (nunca PROP).
 * 2. Bypass universal si `enable_cpq_governance === false`.
 * 3. Omisión individual: cualquier umbral o porcentaje en 0 o null se ignora.
 * 4. Margen fiel al motor COT (incluye costos internos y absorbidos ocultos); si costoTotal <= 0 se omite bloqueo/alerta de margen.
 * 5. Jerarquía estricta: GERENTE > SUPERVISOR > ALERTA_MARGEN > LIBRE.
 */
export function evaluarGobernanzaCpq(
  total: number,
  descuentoEfectivo: number,
  costoTotal: number,
  margenPct: number,
  politicas: PoliticasGobernanzaCpq,
): ResultadoGobernanzaCpq {
  if (!politicas.enable_cpq_governance) {
    return {
      nivel: 'NINGUNO',
      estadoGobernanza: 'MODO_AGIL',
      alertaMargen: false,
      razon: 'Modo ágil activo (gobernanza CPQ desactivada): aprobación interna automática',
    };
  }

  const locale = politicas.locale || 'es-CO';
  const decimales = politicas.decimales ?? 0;
  const fmt = (n: number) =>
    `${politicas.simbolo}${n.toLocaleString(locale, {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })} ${politicas.moneda}`;

  const supervisorTotal = Number(politicas.umbral_aprobacion_supervisor ?? 0);
  const gerenteTotal = Number(politicas.umbral_aprobacion_gerente ?? 0);
  const descuentoMax = Number(politicas.descuento_max_sin_aprobacion ?? 0);
  const descuentoGerente = descuentoMax > 0 ? Math.min(100, descuentoMax + 10) : 0;
  const margenAlerta = Number(politicas.margen_minimo_alerta ?? 0);
  const margenGerente = Number(politicas.margen_minimo_aprobacion ?? 0);

  const alertaMargen = margenAlerta > 0 && costoTotal > 0 && margenPct < margenAlerta;
  const razonesGerente: string[] = [];

  if (gerenteTotal > 0 && total > gerenteTotal) {
    razonesGerente.push(`Total ${fmt(total)} supera umbral gerencial (${fmt(gerenteTotal)})`);
  }
  if (descuentoMax > 0 && descuentoGerente < 100 && descuentoEfectivo > descuentoGerente) {
    razonesGerente.push(
      `Descuento efectivo ${descuentoEfectivo.toFixed(1)}% supera límite gerencial (${descuentoGerente}%)`,
    );
  }
  if (margenGerente > 0 && costoTotal > 0 && margenPct < margenGerente) {
    razonesGerente.push(
      `Margen bruto (${margenPct.toFixed(1)}%) por debajo del piso gerencial (${margenGerente}%)`,
    );
  }

  if (razonesGerente.length > 0) {
    return {
      nivel: 'GERENTE',
      estadoGobernanza: 'GERENTE',
      alertaMargen,
      razon: razonesGerente.join(' · '),
    };
  }

  const razonesSupervisor: string[] = [];
  if (supervisorTotal > 0 && total > supervisorTotal) {
    razonesSupervisor.push(
      `Total ${fmt(total)} supera umbral de supervisión (${fmt(supervisorTotal)})`,
    );
  }
  if (descuentoMax > 0 && descuentoEfectivo > descuentoMax) {
    razonesSupervisor.push(
      `Descuento efectivo ${descuentoEfectivo.toFixed(1)}% supera límite sin aprobación (${descuentoMax}%)`,
    );
  }

  if (razonesSupervisor.length > 0) {
    return {
      nivel: 'SUPERVISOR',
      estadoGobernanza: 'SUPERVISOR',
      alertaMargen,
      razon: razonesSupervisor.join(' · '),
    };
  }

  if (alertaMargen) {
    return {
      nivel: 'NINGUNO',
      estadoGobernanza: 'ALERTA_MARGEN',
      alertaMargen: true,
      razon: `Alerta visual de margen (${margenPct.toFixed(1)}% < ${margenAlerta}%), aprobada automáticamente sin bloqueo`,
    };
  }

  return {
    nivel: 'NINGUNO',
    estadoGobernanza: 'LIBRE',
    alertaMargen: false,
    razon: `Total ${fmt(total)}, descuento ${descuentoEfectivo.toFixed(1)}% y rentabilidad dentro de políticas automáticas`,
  };
}

/**
 * SOLICITAR APROBACION HANDLER (Gobernanza Comercial White-Label Dinámica — Exclusivo COT)
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

    // Recalcular totales para garantizar evaluación con cifras exactas (costos internos + absorbidos ocultos)
    const totales = await this.calculoService.recalcularTotales(command.idCotizacion);
    const cotizacion = (await this.repository.findById(command.idCotizacion))!;

    const [org, itemsServ, itemsComp, itemsOtros] = await Promise.all([
      this.prisma.configuracion_organizacion
        .findUnique({
          where: { id_configuracion: 1 },
          select: {
            codigo_moneda: true,
            simbolo_moneda: true,
            locale: true,
            decimales_moneda: true,
            enable_cpq_governance: true,
            umbral_aprobacion_supervisor: true,
            umbral_aprobacion_gerente: true,
            descuento_max_sin_aprobacion: true,
            margen_minimo_alerta: true,
            margen_minimo_aprobacion: true,
          },
        })
        .catch(() => null),
      this.prisma.items_cotizacion_servicios.findMany({
        where: { id_cotizacion: command.idCotizacion, es_opcional: false },
        select: { cantidad: true, precio_unitario: true },
      }),
      this.prisma.items_cotizacion_componentes.findMany({
        where: { id_cotizacion: command.idCotizacion, es_opcional: false },
        select: { cantidad: true, precio_unitario: true },
      }),
      this.prisma.items_cotizacion_otros.findMany({
        where: {
          id_cotizacion: command.idCotizacion,
          es_opcional: false,
          visible_cliente: true,
        },
        select: { cantidad: true, precio_unitario: true },
      }),
    ]);

    // Calcular descuento efectivo real (combina descuentos por línea y descuento global)
    const brutoSinDescuentos =
      itemsServ.reduce((acc, s) => acc + Number(s.cantidad) * Number(s.precio_unitario), 0) +
      itemsComp.reduce((acc, c) => acc + Number(c.cantidad) * Number(c.precio_unitario), 0) +
      itemsOtros.reduce((acc, o) => acc + Number(o.cantidad) * Number(o.precio_unitario), 0);

    const descuentoGlobal = Number(cotizacion.descuento_porcentaje ?? 0);
    const descuentoCombinado =
      brutoSinDescuentos > 0
        ? Math.max(
            0,
            Math.round(
              ((brutoSinDescuentos - Number(totales.subtotal_con_descuento)) / brutoSinDescuentos) *
                10000,
            ) / 100,
          )
        : 0;
    const descuentoEfectivo = Math.max(descuentoGlobal, descuentoCombinado);

    const politicas: PoliticasGobernanzaCpq = {
      enable_cpq_governance: Boolean(org?.enable_cpq_governance ?? false),
      moneda: cotizacion.moneda || org?.codigo_moneda || 'COP',
      simbolo: org?.simbolo_moneda || '$',
      locale: org?.locale || 'es-CO',
      decimales: Number(org?.decimales_moneda ?? 0),
      umbral_aprobacion_supervisor:
        org?.umbral_aprobacion_supervisor != null
          ? Number(org.umbral_aprobacion_supervisor)
          : 0,
      umbral_aprobacion_gerente:
        org?.umbral_aprobacion_gerente != null ? Number(org.umbral_aprobacion_gerente) : 0,
      descuento_max_sin_aprobacion:
        org?.descuento_max_sin_aprobacion != null
          ? Number(org.descuento_max_sin_aprobacion)
          : 0,
      margen_minimo_alerta:
        org?.margen_minimo_alerta != null ? Number(org.margen_minimo_alerta) : 0,
      margen_minimo_aprobacion:
        org?.margen_minimo_aprobacion != null ? Number(org.margen_minimo_aprobacion) : 0,
    };

    const evaluacion = evaluarGobernanzaCpq(
      Number(totales.total_cotizacion),
      descuentoEfectivo,
      Number(totales.costo_total_estimado),
      Number(totales.margen_bruto_porcentaje),
      politicas,
    );

    if (evaluacion.nivel === 'NINGUNO') {
      await this.repository.update(command.idCotizacion, {
        id_estado: 3, // APROBADA_INTERNA
        aprobada_internamente_por: command.solicitadaPor,
        fecha_aprobacion_interna: new Date(),
        modificado_por: command.solicitadaPor,
      });

      return {
        message:
          evaluacion.estadoGobernanza === 'MODO_AGIL'
            ? 'Cotización aprobada automáticamente (modo ágil sin gobernanza CPQ)'
            : 'Cotización dentro de políticas comerciales, aprobada automáticamente',
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
        estado_gobernanza: evaluacion.estadoGobernanza,
        alerta_margen: evaluacion.alertaMargen,
        razon: evaluacion.razon,
      };
    }

    const aprobacion = await this.prisma.aprobaciones_cotizacion.create({
      data: {
        id_cotizacion: command.idCotizacion,
        nivel_aprobacion: evaluacion.nivel as any,
        razon_nivel: evaluacion.razon,
        estado_aprobacion: 'PENDIENTE',
        solicitada_por: command.solicitadaPor,
        observaciones_solicitante: command.observacionesSolicitante,
        metadata: {
          total_cotizacion: Number(totales.total_cotizacion),
          descuento_porcentaje: descuentoGlobal,
          descuento_efectivo_porcentaje: descuentoEfectivo,
          costo_total_estimado: Number(totales.costo_total_estimado),
          margen_bruto_porcentaje: Number(totales.margen_bruto_porcentaje),
          moneda: politicas.moneda,
          estado_gobernanza: evaluacion.estadoGobernanza,
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
      message: `Solicitud de aprobación (${evaluacion.nivel}) creada exitosamente`,
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
      estado_gobernanza: evaluacion.estadoGobernanza,
      alerta_margen: evaluacion.alertaMargen,
      razon: evaluacion.razon,
    };
  }
}
