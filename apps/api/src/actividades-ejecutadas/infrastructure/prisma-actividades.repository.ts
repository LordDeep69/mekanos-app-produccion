import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repository para actividades_ejecutadas
 * Patrón: CQRS con Prisma ORM
 * FASE 4.1 - Módulos Relacionados a Órdenes
 */

export interface SaveActividadData {
  id_actividad_ejecutada?: number;
  id_orden_servicio: number;
  id_actividad_catalogo?: number | null;
  descripcion_manual?: string | null;
  sistema?: string | null;
  orden_secuencia?: number | null;
  estado?: string | null;
  observaciones?: string | null;
  ejecutada?: boolean;
  fecha_ejecucion?: Date;
  ejecutada_por?: number | null;
  tiempo_ejecucion_minutos?: number | null;
  requiere_evidencia?: boolean;
  evidencia_capturada?: boolean;
}

@Injectable()
export class PrismaActividadesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CREATE o UPDATE con upsert pattern
   * Normaliza descripcion_manual (UPPER + TRIM) en backend
   */
  async save(data: SaveActividadData): Promise<any> {
    // Normalizar descripcion_manual si existe
    if (data.descripcion_manual) {
      data.descripcion_manual = data.descripcion_manual.trim().toUpperCase();
    }

    // Normalizar sistema si existe
    if (data.sistema) {
      data.sistema = data.sistema.trim().toUpperCase();
    }

    if (data.id_actividad_ejecutada) {
      // UPDATE
      return await this.prisma.actividades_ejecutadas.update({
        where: { id_actividad_ejecutada: data.id_actividad_ejecutada },
        data: {
          id_actividad_catalogo: data.id_actividad_catalogo,
          descripcion_manual: data.descripcion_manual,
          sistema: data.sistema,
          orden_secuencia: data.orden_secuencia,
          estado: data.estado as any,
          observaciones: data.observaciones,
          ejecutada: data.ejecutada,
          tiempo_ejecucion_minutos: data.tiempo_ejecucion_minutos,
          requiere_evidencia: data.requiere_evidencia,
          evidencia_capturada: data.evidencia_capturada,
        },
        include: this.getFullIncludes(),
      });
    } else {
      // CREATE
      return await this.prisma.actividades_ejecutadas.create({
        data: {
          id_orden_servicio: data.id_orden_servicio,
          id_actividad_catalogo: data.id_actividad_catalogo,
          descripcion_manual: data.descripcion_manual,
          sistema: data.sistema,
          orden_secuencia: data.orden_secuencia,
          estado: data.estado as any,
          observaciones: data.observaciones,
          ejecutada: data.ejecutada ?? true,
          fecha_ejecucion: data.fecha_ejecucion ?? new Date(),
          ejecutada_por: data.ejecutada_por,
          tiempo_ejecucion_minutos: data.tiempo_ejecucion_minutos,
          requiere_evidencia: data.requiere_evidencia ?? false,
          evidencia_capturada: data.evidencia_capturada ?? false,
          fecha_registro: new Date(),
        },
        include: this.getFullIncludes(),
      });
    }
  }

  /**
   * READ ONE - obtener actividad por ID con relaciones completas
   */
  async findById(id: number): Promise<any | null> {
    return await this.prisma.actividades_ejecutadas.findUnique({
      where: { id_actividad_ejecutada: id },
      include: this.getFullIncludes(),
    });
  }

  /**
   * READ ALL por orden - filtrar actividades de orden específica
   */
  async findByOrden(id_orden_servicio: number): Promise<any[]> {
    return await this.prisma.actividades_ejecutadas.findMany({
      where: { id_orden_servicio },
      include: {
        catalogo_actividades: true,
        empleados: {
          include: {
            persona: true,
          },
        },
      },
      orderBy: [
        { orden_secuencia: 'asc' },
        { fecha_ejecucion: 'asc' },
      ],
    });
  }

  /**
   * READ ALL con paginación y filtros
   */
  async findAll(filters?: {
    id_orden_servicio?: number;
    ejecutada_por?: number;
    estado?: string;
    ejecutada?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ items: any[]; total: number }> {
    const where: any = {};

    if (filters?.id_orden_servicio) {
      where.id_orden_servicio = filters.id_orden_servicio;
    }

    if (filters?.ejecutada_por) {
      where.ejecutada_por = filters.ejecutada_por;
    }

    if (filters?.estado) {
      where.estado = filters.estado;
    }

    if (filters?.ejecutada !== undefined) {
      where.ejecutada = filters.ejecutada;
    }

    const [items, total] = await Promise.all([
      this.prisma.actividades_ejecutadas.findMany({
        where,
        skip: filters?.skip || 0,
        take: filters?.take || 10,
        include: {
          catalogo_actividades: true,
          empleados: {
            include: {
              persona: true,
            },
          },
          ordenes_servicio: {
            select: {
              id_orden_servicio: true,
              numero_orden: true,
            },
          },
        },
        orderBy: { fecha_ejecucion: 'desc' },
      }),
      this.prisma.actividades_ejecutadas.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * DELETE - eliminar actividad ejecutada
   * Nota: Cascade delete configurado en schema si orden se elimina
   */
  async delete(id: number): Promise<void> {
    await this.prisma.actividades_ejecutadas.delete({
      where: { id_actividad_ejecutada: id },
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
          estado: { // ✅ Relación correcta: estado (singular) not estados_orden
            select: {
              codigo_estado: true,
              nombre_estado: true,
            },
          },
        },
      },
      catalogo_actividades: true,
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
