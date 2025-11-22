import { PrismaService } from '@mekanos/database';
import { Injectable } from '@nestjs/common';
import { estados_orden } from '@prisma/client';

/**
 * Repository para estados_orden
 * 
 * CARACTERÍSTICAS:
 * - Sin foreign keys (tabla catálogo independiente)
 * - Sin includes (no relaciones directas)
 * - Validación constraint orden_visualizacion > 0 en DTO
 * - Soft delete con campo activo
 * - Código único validado (normalizado UPPER en command)
 */
@Injectable()
export class PrismaEstadosOrdenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear nuevo estado de orden
   */
  async create(data: {
    codigo_estado: string;
    nombre_estado: string;
    descripcion?: string;
    permite_edicion?: boolean;
    permite_eliminacion?: boolean;
    es_estado_final?: boolean;
    color_hex?: string;
    icono?: string;
    orden_visualizacion?: number;
    activo?: boolean;
  }): Promise<estados_orden> {
    return this.prisma.estados_orden.create({
      data: {
        codigo_estado: data.codigo_estado,
        nombre_estado: data.nombre_estado,
        descripcion: data.descripcion,
        permite_edicion: data.permite_edicion ?? true,
        permite_eliminacion: data.permite_eliminacion ?? false,
        es_estado_final: data.es_estado_final ?? false,
        color_hex: data.color_hex,
        icono: data.icono,
        orden_visualizacion: data.orden_visualizacion,
        activo: data.activo ?? true,
        fecha_creacion: new Date(),
      },
    });
  }

  /**
   * Buscar estado por ID
   */
  async findById(id_estado: number): Promise<estados_orden | null> {
    return this.prisma.estados_orden.findUnique({
      where: { id_estado },
    });
  }

  /**
   * Buscar estado por código (UNIQUE)
   */
  async findByCodigo(codigo_estado: string): Promise<estados_orden | null> {
    return this.prisma.estados_orden.findUnique({
      where: { codigo_estado },
    });
  }

  /**
   * Listar estados con filtros y paginación
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    activo?: boolean;
    es_estado_final?: boolean;
    permite_edicion?: boolean;
  }): Promise<estados_orden[]> {
    const { page = 1, limit = 50, activo, es_estado_final, permite_edicion } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (es_estado_final !== undefined) {
      where.es_estado_final = es_estado_final;
    }

    if (permite_edicion !== undefined) {
      where.permite_edicion = permite_edicion;
    }

    return this.prisma.estados_orden.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { orden_visualizacion: 'asc' }, // Ordenar por orden_visualizacion primero
        { id_estado: 'asc' },
      ],
    });
  }

  /**
   * Buscar solo estados activos
   */
  async findActivos(): Promise<estados_orden[]> {
    return this.prisma.estados_orden.findMany({
      where: { activo: true },
      orderBy: [
        { orden_visualizacion: 'asc' },
        { id_estado: 'asc' },
      ],
    });
  }

  /**
   * Actualizar estado existente
   */
  async update(
    id_estado: number,
    data: Partial<{
      codigo_estado: string;
      nombre_estado: string;
      descripcion: string;
      permite_edicion: boolean;
      permite_eliminacion: boolean;
      es_estado_final: boolean;
      color_hex: string;
      icono: string;
      orden_visualizacion: number;
      activo: boolean;
    }>,
  ): Promise<estados_orden> {
    return this.prisma.estados_orden.update({
      where: { id_estado },
      data,
    });
  }

  /**
   * Soft delete (marcar como inactivo)
   */
  async softDelete(id_estado: number): Promise<estados_orden> {
    return this.prisma.estados_orden.update({
      where: { id_estado },
      data: { activo: false },
    });
  }

  /**
   * Hard delete (eliminación física - solo para testing/cleanup)
   */
  async hardDelete(id_estado: number): Promise<estados_orden> {
    return this.prisma.estados_orden.delete({
      where: { id_estado },
    });
  }

  /**
   * Contar estados con filtros
   */
  async count(params: {
    activo?: boolean;
    es_estado_final?: boolean;
    permite_edicion?: boolean;
  }): Promise<number> {
    const { activo, es_estado_final, permite_edicion } = params;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (es_estado_final !== undefined) {
      where.es_estado_final = es_estado_final;
    }

    if (permite_edicion !== undefined) {
      where.permite_edicion = permite_edicion;
    }

    return this.prisma.estados_orden.count({ where });
  }
}
