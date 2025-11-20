import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IMedicionesRepository } from '../domain/mediciones.repository.interface';

/**
 * PrismaMedicionesRepository - Implementación con Prisma ORM
 * FASE 4.2 - Mediciones con relaciones completas
 */

@Injectable()
export class PrismaMedicionesRepository implements IMedicionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CREATE/UPDATE medición
   */
  async save(data: {
    id_medicion?: number;
    id_orden_servicio: number;
    id_parametro_medicion: number;
    valor_numerico?: number;
    valor_texto?: string;
    unidad_medida?: string;
    fuera_de_rango?: boolean;
    nivel_alerta?: string;
    mensaje_alerta?: string;
    observaciones?: string;
    temperatura_ambiente?: number;
    humedad_relativa?: number;
    fecha_medicion?: Date;
    medido_por?: number;
    instrumento_medicion?: string;
  }): Promise<any> {
    if (data.id_medicion) {
      // UPDATE
      return await this.prisma.mediciones_servicio.update({
        where: { id_medicion: data.id_medicion },
        data: {
          valor_numerico: data.valor_numerico,
          valor_texto: data.valor_texto,
          unidad_medida: data.unidad_medida,
          fuera_de_rango: data.fuera_de_rango,
          nivel_alerta: data.nivel_alerta as any,
          mensaje_alerta: data.mensaje_alerta,
          observaciones: data.observaciones,
          temperatura_ambiente: data.temperatura_ambiente,
          humedad_relativa: data.humedad_relativa,
          fecha_medicion: data.fecha_medicion,
          medido_por: data.medido_por,
          instrumento_medicion: data.instrumento_medicion,
        },
        include: this.getFullIncludes(),
      });
    } else {
      // CREATE
      return await this.prisma.mediciones_servicio.create({
        data: {
          id_orden_servicio: data.id_orden_servicio,
          id_parametro_medicion: data.id_parametro_medicion,
          valor_numerico: data.valor_numerico,
          valor_texto: data.valor_texto,
          unidad_medida: data.unidad_medida,
          fuera_de_rango: data.fuera_de_rango ?? false,
          nivel_alerta: data.nivel_alerta as any,
          mensaje_alerta: data.mensaje_alerta,
          observaciones: data.observaciones,
          temperatura_ambiente: data.temperatura_ambiente,
          humedad_relativa: data.humedad_relativa,
          fecha_medicion: data.fecha_medicion ?? new Date(),
          medido_por: data.medido_por,
          instrumento_medicion: data.instrumento_medicion,
          fecha_registro: new Date(),
        },
        include: this.getFullIncludes(),
      });
    }
  }

  /**
   * READ ONE - obtener medición por ID con relaciones completas
   */
  async findById(id: number): Promise<any | null> {
    return await this.prisma.mediciones_servicio.findUnique({
      where: { id_medicion: id },
      include: this.getFullIncludes(),
    });
  }

  /**
   * READ ALL por orden - filtrar mediciones de orden específica
   */
  async findByOrden(id_orden_servicio: number): Promise<any[]> {
    return await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio },
      include: {
        parametros_medicion: {
          select: {
            id_parametro_medicion: true,
            codigo_parametro: true,
            nombre_parametro: true,
            unidad_medida: true,
            valor_minimo_normal: true,
            valor_maximo_normal: true,
            valor_minimo_critico: true,
            valor_maximo_critico: true,
          },
        },
        empleados: {
          include: {
            persona: {
              select: {
                id_persona: true,
                nombre_completo: true,
              },
            },
          },
        },
      },
      orderBy: [{ fecha_medicion: 'desc' }],
    });
  }

  /**
   * READ ALL con paginación y filtros
   */
  async findAll(filters?: {
    page?: number;
    limit?: number;
    id_orden_servicio?: number;
    id_parametro_medicion?: number;
    nivel_alerta?: string;
  }): Promise<{ items: any[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.id_orden_servicio)
      where.id_orden_servicio = filters.id_orden_servicio;
    if (filters?.id_parametro_medicion)
      where.id_parametro_medicion = filters.id_parametro_medicion;
    if (filters?.nivel_alerta) where.nivel_alerta = filters.nivel_alerta;

    const [items, total] = await Promise.all([
      this.prisma.mediciones_servicio.findMany({
        where,
        include: this.getFullIncludes(),
        orderBy: [{ fecha_medicion: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.mediciones_servicio.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * DELETE - eliminar medición
   */
  async delete(id: number): Promise<void> {
    await this.prisma.mediciones_servicio.delete({
      where: { id_medicion: id },
    });
  }

  /**
   * Helper: Relaciones completas para includes
   */
  private getFullIncludes() {
    return {
      ordenes_servicio: {
        select: {
          id_orden_servicio: true,
          numero_orden: true,
          estado: {
            select: {
              codigo_estado: true,
              nombre_estado: true,
            },
          },
        },
      },
      parametros_medicion: {
        select: {
          id_parametro_medicion: true,
          codigo_parametro: true,
          nombre_parametro: true,
          unidad_medida: true,
          valor_minimo_normal: true,
          valor_maximo_normal: true,
          valor_minimo_critico: true,
          valor_maximo_critico: true,
          valor_ideal: true,
        },
      },
      empleados: {
        include: {
          persona: {
            select: {
              id_persona: true,
              nombre_completo: true,
              tipo_identificacion: true,
              numero_identificacion: true,
            },
          },
        },
      },
    };
  }
}
