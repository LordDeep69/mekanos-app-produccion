import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * PrismaEquipoRepository - Implementación con Prisma Client real
 * 
 * Reemplaza MockEquipoRepository para trabajar con schema Supabase real
 */
@Injectable()
export class PrismaEquipoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guardar equipo (crear o actualizar)
   */
  async save(data: {
    id_equipo?: number;
    codigo_equipo: string;
    id_cliente: number;
    id_tipo_equipo: number;
    ubicacion_texto: string;
    id_sede?: number | null;
    nombre_equipo?: string | null;
    numero_serie_equipo?: string | null;
    estado_equipo?: string;
    criticidad?: string;
    creado_por: number;
    modificado_por?: number | null;
  }) {
    if (data.id_equipo) {
      // Update
      return this.prisma.equipos.update({
        where: { id_equipo: data.id_equipo },
        data: {
          codigo_equipo: data.codigo_equipo,
          id_cliente: data.id_cliente,
          id_tipo_equipo: data.id_tipo_equipo,
          ubicacion_texto: data.ubicacion_texto,
          id_sede: data.id_sede,
          nombre_equipo: data.nombre_equipo,
          numero_serie_equipo: data.numero_serie_equipo,
          estado_equipo: data.estado_equipo as any,
          criticidad: data.criticidad as any,
          modificado_por: data.modificado_por,
          fecha_modificacion: new Date(),
        },
        include: {
          cliente: {
            include: {
              persona: true,
            },
          },
          sede: true,
          tipo_equipo: true,
          usuario_creador: {
            include: {
              persona: true,
            },
          },
        },
      });
    } else {
      // Create
      return this.prisma.equipos.create({
        data: {
          codigo_equipo: data.codigo_equipo,
          id_cliente: data.id_cliente,
          id_tipo_equipo: data.id_tipo_equipo,
          ubicacion_texto: data.ubicacion_texto,
          id_sede: data.id_sede,
          nombre_equipo: data.nombre_equipo,
          numero_serie_equipo: data.numero_serie_equipo,
          estado_equipo: (data.estado_equipo as any) || 'OPERATIVO',
          criticidad: (data.criticidad as any) || 'MEDIA',
          creado_por: data.creado_por,
        },
        include: {
          cliente: {
            include: {
              persona: true,
            },
          },
          sede: true,
          tipo_equipo: true,
          usuario_creador: {
            include: {
              persona: true,
            },
          },
        },
      });
    }
  }

  /**
   * Buscar equipo por ID
   */
  async findById(id_equipo: number) {
    return this.prisma.equipos.findUnique({
      where: { id_equipo },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
        sede: true,
        tipo_equipo: true,
        usuario_creador: {
          include: {
            persona: true,
          },
        },
        usuario_modificador: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  /**
   * Buscar equipos con filtros
   */
  async findAll(filters?: {
    id_cliente?: number;
    id_sede?: number;
    id_tipo_equipo?: number;
    estado_equipo?: string;
    activo?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};

    if (filters?.id_cliente) where.id_cliente = filters.id_cliente;
    if (filters?.id_sede) where.id_sede = filters.id_sede;
    if (filters?.id_tipo_equipo) where.id_tipo_equipo = filters.id_tipo_equipo;
    if (filters?.estado_equipo) where.estado_equipo = filters.estado_equipo;
    if (filters?.activo !== undefined) where.activo = filters.activo;

    const [items, total] = await Promise.all([
      this.prisma.equipos.findMany({
        where,
        include: {
          cliente: {
            include: {
              persona: true,
            },
          },
          sede: true,
          tipo_equipo: true,
        },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { codigo_equipo: 'asc' },
      }),
      this.prisma.equipos.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Verificar si existe equipo por código
   */
  async existsByCodigo(codigo_equipo: string): Promise<boolean> {
    const count = await this.prisma.equipos.count({
      where: { codigo_equipo },
    });
    return count > 0;
  }

  /**
   * Eliminar equipo (soft delete)
   */
  async delete(id_equipo: number, modificado_por: number) {
    return this.prisma.equipos.update({
      where: { id_equipo },
      data: {
        activo: false,
        fecha_baja: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
    });
  }

  /**
   * Eliminar equipo físicamente (hard delete)
   */
  async hardDelete(id_equipo: number) {
    return this.prisma.equipos.delete({
      where: { id_equipo },
    });
  }
}
