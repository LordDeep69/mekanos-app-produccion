import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CotizacionesRepository } from '../domain/cotizaciones.repository.interface';
import { Cotizacion } from '../domain/cotizacion.entity';

/**
 * PRISMA REPOSITORY - Infrastructure Layer
 * 
 * Implementación concreta del repositorio usando Prisma ORM.
 */
@Injectable()
export class PrismaCotizacionesRepository implements CotizacionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Mapea cotización Prisma a Entity Domain
   */
  private mapToEntity(c: any): Cotizacion {
    return new Cotizacion({
      ...c,
      fecha_cotizacion: c.fecha_cotizacion ?? new Date(),
      id_sede: c.id_sede ?? undefined,
      id_equipo: c.id_equipo ?? undefined,
      dias_validez: c.dias_validez ?? undefined,
      fecha_cambio_estado: c.fecha_cambio_estado ?? undefined,
      id_motivo_rechazo: c.id_motivo_rechazo ?? undefined,
      observaciones_rechazo: c.observaciones_rechazo ?? undefined,
      descripcion_general: c.descripcion_general ?? undefined,
      alcance_trabajo: c.alcance_trabajo ?? undefined,
      exclusiones: c.exclusiones ?? undefined,
      subtotal_servicios: c.subtotal_servicios ? Number(c.subtotal_servicios) : 0,
      subtotal_componentes: c.subtotal_componentes ? Number(c.subtotal_componentes) : 0,
      subtotal_general: c.subtotal_general ? Number(c.subtotal_general) : 0,
      descuento_porcentaje: c.descuento_porcentaje ? Number(c.descuento_porcentaje) : undefined,
      descuento_valor: c.descuento_valor ? Number(c.descuento_valor) : undefined,
      subtotal_con_descuento: c.subtotal_con_descuento ? Number(c.subtotal_con_descuento) : undefined,
      iva_porcentaje: Number(c.iva_porcentaje),
      iva_valor: c.iva_valor ? Number(c.iva_valor) : undefined,
      total_cotizacion: c.total_cotizacion ? Number(c.total_cotizacion) : undefined,
      forma_pago: c.forma_pago ?? undefined,
      terminos_condiciones: c.terminos_condiciones ?? undefined,
      meses_garantia: c.meses_garantia ?? undefined,
      observaciones_garantia: c.observaciones_garantia ?? undefined,
      tiempo_estimado_dias: c.tiempo_estimado_dias ?? undefined,
      version: c.version ?? undefined,
      id_cotizacion_padre: c.id_cotizacion_padre ?? undefined,
      id_orden_servicio_generada: c.id_orden_servicio_generada ?? undefined,
      fecha_conversion_os: c.fecha_conversion_os ?? undefined,
      aprobada_internamente_por: c.aprobada_internamente_por ?? undefined,
      fecha_aprobacion_interna: c.fecha_aprobacion_interna ?? undefined,
      modificado_por: c.modificado_por ?? undefined,
    });
  }

  async save(data: Partial<Cotizacion>): Promise<Cotizacion> {
    const cotizacion = await this.prisma.cotizaciones.create({
      data: {
        numero_cotizacion: data.numero_cotizacion!,
        id_cliente: data.id_cliente!,
        id_sede: data.id_sede,
        id_equipo: data.id_equipo,
        fecha_cotizacion: data.fecha_cotizacion!,
        fecha_vencimiento: data.fecha_vencimiento!,
        id_estado: data.id_estado || 1, // BORRADOR
        asunto: data.asunto!,
        descripcion_general: data.descripcion_general,
        alcance_trabajo: data.alcance_trabajo,
        exclusiones: data.exclusiones,
        subtotal_servicios: data.subtotal_servicios || 0,
        subtotal_componentes: data.subtotal_componentes || 0,
        subtotal_general: data.subtotal_general || 0,
        descuento_porcentaje: data.descuento_porcentaje || 0,
        descuento_valor: data.descuento_valor || 0,
        subtotal_con_descuento: data.subtotal_con_descuento || 0,
        iva_porcentaje: data.iva_porcentaje || 0,
        iva_valor: data.iva_valor || 0,
        total_cotizacion: data.total_cotizacion || 0,
        forma_pago: data.forma_pago || 'CONTADO',
        terminos_condiciones: data.terminos_condiciones,
        meses_garantia: data.meses_garantia || 3,
        observaciones_garantia: data.observaciones_garantia,
        tiempo_estimado_dias: data.tiempo_estimado_dias,
        version: data.version || 1,
        id_cotizacion_padre: data.id_cotizacion_padre,
        metadata: data.metadata,
        elaborada_por: data.elaborada_por!,
        modificado_por: data.modificado_por,
      },
    });

    return this.mapToEntity(cotizacion);
  }

  async findById(
    idCotizacion: number,
    includeRelations?: {
      cliente?: boolean;
      sede?: boolean;
      equipo?: boolean;
      estado?: boolean;
      items_servicios?: boolean;
      items_componentes?: boolean;
      aprobaciones?: boolean;
      historial_envios?: boolean;
    },
  ): Promise<Cotizacion | null> {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        cliente: includeRelations?.cliente || false,
        sede: includeRelations?.sede || false,
        equipo: includeRelations?.equipo || false,
        estado: includeRelations?.estado || false,
        items_servicios: includeRelations?.items_servicios || false,
        items_componentes: includeRelations?.items_componentes || false,
        aprobaciones: includeRelations?.aprobaciones || false,
        envios: includeRelations?.historial_envios || false,
      },
    });

    if (!cotizacion) return null;

    return this.mapToEntity(cotizacion);
  }

  async findAll(filters: {
    clienteId?: number;
    sedeId?: number;
    estadoId?: number;
    fechaCotizacionDesde?: Date;
    fechaCotizacionHasta?: Date;
    elaboradaPor?: number;
    skip?: number;
    take?: number;
  }): Promise<{ cotizaciones: Cotizacion[]; total: number }> {
    const where: any = {};

    if (filters.clienteId) where.id_cliente = filters.clienteId;
    if (filters.sedeId) where.id_sede = filters.sedeId;
    if (filters.estadoId) where.id_estado = filters.estadoId;
    if (filters.elaboradaPor) where.elaborada_por = filters.elaboradaPor;

    if (filters.fechaCotizacionDesde || filters.fechaCotizacionHasta) {
      where.fecha_cotizacion = {};
      if (filters.fechaCotizacionDesde) where.fecha_cotizacion.gte = filters.fechaCotizacionDesde;
      if (filters.fechaCotizacionHasta) where.fecha_cotizacion.lte = filters.fechaCotizacionHasta;
    }

    const [cotizaciones, total] = await Promise.all([
      this.prisma.cotizaciones.findMany({
        where,
        include: {
          cliente: true,
          estado: true,
        },
        orderBy: { fecha_cotizacion: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.cotizaciones.count({ where }),
    ]);

    return {
      cotizaciones: cotizaciones.map((c) => this.mapToEntity(c)),
      total,
    };
  }

  async findByNumero(numeroCotizacion: string): Promise<Cotizacion | null> {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { numero_cotizacion: numeroCotizacion },
    });

    if (!cotizacion) return null;

    return this.mapToEntity(cotizacion);
  }

  async update(idCotizacion: number, data: Partial<Cotizacion>): Promise<Cotizacion> {
    const cotizacion = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        id_sede: data.id_sede,
        id_equipo: data.id_equipo,
        fecha_vencimiento: data.fecha_vencimiento,
        asunto: data.asunto,
        descripcion_general: data.descripcion_general,
        alcance_trabajo: data.alcance_trabajo,
        exclusiones: data.exclusiones,
        descuento_porcentaje: data.descuento_porcentaje,
        descuento_valor: data.descuento_valor,
        iva_porcentaje: data.iva_porcentaje,
        tiempo_estimado_dias: data.tiempo_estimado_dias,
        forma_pago: data.forma_pago,
        terminos_condiciones: data.terminos_condiciones,
        meses_garantia: data.meses_garantia,
        observaciones_garantia: data.observaciones_garantia,
        modificado_por: data.modificado_por,
        fecha_modificacion: new Date(),
      },
    });

    return this.mapToEntity(cotizacion);
  }

  async delete(idCotizacion: number): Promise<void> {
    // Soft delete: cambiar a estado CANCELADA (asumiendo id_estado 6)
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { id_estado: 6 },
    });
  }

  async updateEstado(idCotizacion: number, idEstado: number, userId: number): Promise<Cotizacion> {
    const cotizacion = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        id_estado: idEstado,
        fecha_cambio_estado: new Date(),
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
    });

    return this.mapToEntity(cotizacion);
  }

  async updateTotales(
    idCotizacion: number,
    totales: {
      subtotal_servicios: number;
      subtotal_componentes: number;
      subtotal_general: number;
      descuento_valor: number;
      subtotal_con_descuento: number;
      iva_valor: number;
      total_cotizacion: number;
    },
  ): Promise<Cotizacion> {
    const cotizacion = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        subtotal_servicios: totales.subtotal_servicios,
        subtotal_componentes: totales.subtotal_componentes,
        subtotal_general: totales.subtotal_general,
        descuento_valor: totales.descuento_valor,
        subtotal_con_descuento: totales.subtotal_con_descuento,
        iva_valor: totales.iva_valor,
        total_cotizacion: totales.total_cotizacion,
      },
    });

    return this.mapToEntity(cotizacion);
  }
  
  async findProximasVencer(diasAnticipacion: number): Promise<Cotizacion[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const cotizaciones = await this.prisma.cotizaciones.findMany({
      where: {
        id_estado: 2, // ENVIADA
        fecha_vencimiento: {
          lte: fechaLimite,
          gte: new Date(),
        },
      },
      include: {
        cliente: true,
      },
    });

    return cotizaciones.map((c) => this.mapToEntity(c));
  }

  async generateNumeroCotizacion(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `COT-${year}-`;

    // Buscar última cotización del año
    const lastCotizacion = await this.prisma.cotizaciones.findFirst({
      where: {
        numero_cotizacion: {
          startsWith: prefix,
        },
      },
      orderBy: { numero_cotizacion: 'desc' },
    });

    if (!lastCotizacion) {
      return `${prefix}0001`;
    }

    // Extraer número y sumar 1
    const lastNumber = parseInt(lastCotizacion.numero_cotizacion.split('-')[2]);
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

    return `${prefix}${nextNumber}`;
  }
}
