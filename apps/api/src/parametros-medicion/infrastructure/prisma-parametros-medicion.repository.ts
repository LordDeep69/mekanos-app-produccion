import { PrismaService } from '@mekanos/database';
import { Injectable } from '@nestjs/common';
import { parametros_medicion, Prisma } from '@prisma/client';

/**
 * Repository para parametros_medicion
 * Tabla catálogo: Parámetros medibles equipos con rangos validación
 * Sin FK obligatorias, includes opcionales (tipos_equipo, usuarios)
 */

// Includes para relaciones FK (sin includes de usuario para evitar errores con NULL)
const INCLUDE_RELATIONS_DETAIL = {
  tipos_equipo: {
    select: {
      id_tipo_equipo: true,
      nombre_tipo: true,
      categoria: true, // ✅ Campo correcto según Prisma schema
    },
  },
} as const;

// Include reducido para listados
const INCLUDE_RELATIONS_LIST = {
  tipos_equipo: {
    select: {
      id_tipo_equipo: true,
      nombre_tipo: true,
    },
  },
} as const;

// Tipo para entidad con relaciones completas
export type ParametroMedicionConRelaciones = parametros_medicion & {
  tipos_equipo: {
    id_tipo_equipo: number;
    nombre_tipo: string;
    categoria_equipo: string;
  } | null;
};

@Injectable()
export class PrismaParametrosMedicionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear nuevo parámetro de medición
   * @param data - Datos del parámetro (código ya normalizado en handler)
   * @returns Parámetro creado con relaciones completas
   */
  async create(
    data: Prisma.parametros_medicionCreateInput,
  ): Promise<ParametroMedicionConRelaciones> {
    return this.prisma.parametros_medicion.create({
      data,
      include: INCLUDE_RELATIONS_DETAIL,
    }) as Promise<ParametroMedicionConRelaciones>;
  }

  /**
   * Buscar parámetro por ID
   * @param id_parametro_medicion - ID del parámetro
   * @returns Parámetro con relaciones o null
   */
  async findById(
    id_parametro_medicion: number,
  ): Promise<ParametroMedicionConRelaciones | null> {
    return this.prisma.parametros_medicion.findUnique({
      where: { id_parametro_medicion },
      include: INCLUDE_RELATIONS_DETAIL,
    }) as Promise<ParametroMedicionConRelaciones | null>;
  }

  /**
   * Buscar parámetro por código (normalizado UPPER)
   * @param codigo_parametro - Código único del parámetro
   * @returns Parámetro con relaciones o null
   */
  async findByCodigo(
    codigo_parametro: string,
  ): Promise<ParametroMedicionConRelaciones | null> {
    return this.prisma.parametros_medicion.findUnique({
      where: { codigo_parametro },
      include: INCLUDE_RELATIONS_DETAIL,
    }) as Promise<ParametroMedicionConRelaciones | null>;
  }

  /**
   * Listar parámetros con filtros opcionales
   * @param filters - Filtros opcionales (activo, categoria, tipoEquipoId, esCriticoSeguridad, esObligatorio)
   * @param page - Página (default: 1)
   * @param limit - Registros por página (default: 10)
   * @returns Array de parámetros con relaciones reducidas
   */
  async findAll(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
    esCriticoSeguridad?: boolean;
    esObligatorio?: boolean;
    page?: number;
    limit?: number;
  }): Promise<any[]> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.parametros_medicionWhereInput = {};

    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }

    if (filters?.categoria) {
      where.categoria = filters.categoria as any;
    }

    if (filters?.tipoEquipoId !== undefined) {
      where.id_tipo_equipo = filters.tipoEquipoId;
    }

    if (filters?.esCriticoSeguridad !== undefined) {
      where.es_critico_seguridad = filters.esCriticoSeguridad;
    }

    if (filters?.esObligatorio !== undefined) {
      where.es_obligatorio = filters.esObligatorio;
    }

    return this.prisma.parametros_medicion.findMany({
      where,
      skip,
      take: limit,
      include: INCLUDE_RELATIONS_LIST,
      orderBy: [
        { categoria: 'asc' },
        { codigo_parametro: 'asc' },
      ],
    });
  }

  /**
   * Obtener solo parámetros activos
   * @returns Array de parámetros activos ordenados por categoría
   */
  async findActivos(): Promise<any[]> {
    return this.prisma.parametros_medicion.findMany({
      where: { activo: true },
      include: INCLUDE_RELATIONS_LIST,
      orderBy: [
        { categoria: 'asc' },
        { codigo_parametro: 'asc' },
      ],
    });
  }

  /**
   * Obtener parámetros por tipo de equipo
   * @param tipoEquipoId - ID del tipo de equipo
   * @returns Array de parámetros del tipo de equipo
   */
  async findByTipoEquipo(tipoEquipoId: number): Promise<any[]> {
    return this.prisma.parametros_medicion.findMany({
      where: {
        id_tipo_equipo: tipoEquipoId,
        activo: true,
      },
      include: INCLUDE_RELATIONS_LIST,
      orderBy: [
        { categoria: 'asc' },
        { es_obligatorio: 'desc' }, // Obligatorios primero
        { codigo_parametro: 'asc' },
      ],
    });
  }

  /**
   * Actualizar parámetro existente
   * @param id_parametro_medicion - ID del parámetro
   * @param data - Datos a actualizar
   * @returns Parámetro actualizado con relaciones
   */
  async update(
    id_parametro_medicion: number,
    data: Prisma.parametros_medicionUpdateInput,
  ): Promise<ParametroMedicionConRelaciones> {
    return this.prisma.parametros_medicion.update({
      where: { id_parametro_medicion },
      data,
      include: INCLUDE_RELATIONS_DETAIL,
    }) as Promise<ParametroMedicionConRelaciones>;
  }

  /**
   * Soft delete: marcar como inactivo
   * @param id_parametro_medicion - ID del parámetro
   * @returns Parámetro con activo=false
   */
  async softDelete(
    id_parametro_medicion: number,
  ): Promise<ParametroMedicionConRelaciones> {
    return this.prisma.parametros_medicion.update({
      where: { id_parametro_medicion },
      data: { activo: false },
      include: INCLUDE_RELATIONS_DETAIL,
    }) as Promise<ParametroMedicionConRelaciones>;
  }

  /**
   * Hard delete: eliminación física (solo para testing/cleanup)
   * @param id_parametro_medicion - ID del parámetro
   * @returns Parámetro eliminado
   */
  async hardDelete(
    id_parametro_medicion: number,
  ): Promise<parametros_medicion> {
    return this.prisma.parametros_medicion.delete({
      where: { id_parametro_medicion },
    });
  }

  /**
   * Contar parámetros con filtros opcionales
   * @param filters - Filtros opcionales
   * @returns Total de registros que cumplen filtros
   */
  async count(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
    esCriticoSeguridad?: boolean;
    esObligatorio?: boolean;
  }): Promise<number> {
    const where: Prisma.parametros_medicionWhereInput = {};

    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }

    if (filters?.categoria) {
      where.categoria = filters.categoria as any;
    }

    if (filters?.tipoEquipoId !== undefined) {
      where.id_tipo_equipo = filters.tipoEquipoId;
    }

    if (filters?.esCriticoSeguridad !== undefined) {
      where.es_critico_seguridad = filters.esCriticoSeguridad;
    }

    if (filters?.esObligatorio !== undefined) {
      where.es_obligatorio = filters.esObligatorio;
    }

    return this.prisma.parametros_medicion.count({ where });
  }
}
