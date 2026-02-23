import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * PrismaEquipoRepository - Implementación con Prisma Client real
 * 
 * Reemplaza MockEquipoRepository para trabajar con schema Supabase real
 */
@Injectable()
export class PrismaEquipoRepository {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Guardar equipo (crear o actualizar)
   * ✅ 23-FEB-2026: Expandido con TODOS los campos de la tabla equipos
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
    criticidad_justificacion?: string | null;
    fecha_instalacion?: Date | null;
    fecha_inicio_servicio_mekanos?: Date | null;
    en_garantia?: boolean;
    fecha_inicio_garantia?: Date | null;
    fecha_fin_garantia?: Date | null;
    proveedor_garantia?: string | null;
    estado_pintura?: string | null;
    requiere_pintura?: boolean;
    tipo_contrato?: string | null;
    intervalo_tipo_a_dias_override?: number | null;
    intervalo_tipo_a_horas_override?: number | null;
    intervalo_tipo_b_dias_override?: number | null;
    intervalo_tipo_b_horas_override?: number | null;
    criterio_intervalo_override?: string | null;
    observaciones_generales?: string | null;
    configuracion_especial?: string | null;
    config_parametros?: Record<string, any>;
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
          criticidad_justificacion: data.criticidad_justificacion,
          fecha_instalacion: data.fecha_instalacion,
          fecha_inicio_servicio_mekanos: data.fecha_inicio_servicio_mekanos,
          en_garantia: data.en_garantia,
          fecha_inicio_garantia: data.fecha_inicio_garantia,
          fecha_fin_garantia: data.fecha_fin_garantia,
          proveedor_garantia: data.proveedor_garantia,
          estado_pintura: data.estado_pintura as any,
          requiere_pintura: data.requiere_pintura,
          tipo_contrato: data.tipo_contrato as any,
          intervalo_tipo_a_dias_override: data.intervalo_tipo_a_dias_override,
          intervalo_tipo_a_horas_override: data.intervalo_tipo_a_horas_override,
          intervalo_tipo_b_dias_override: data.intervalo_tipo_b_dias_override,
          intervalo_tipo_b_horas_override: data.intervalo_tipo_b_horas_override,
          criterio_intervalo_override: data.criterio_intervalo_override as any,
          observaciones_generales: data.observaciones_generales,
          configuracion_especial: data.configuracion_especial,
          config_parametros: data.config_parametros || undefined,
          modificado_por: data.modificado_por,
          fecha_modificacion: new Date(),
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
          clientes: {
            include: {
              persona: true,
            },
          },
          sedes_cliente: true,
          tipos_equipo: true,
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
        clientes: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
        tipos_equipo: true,
      },
    });
  }

  /**
   * Buscar equipos con filtros
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtrar por clientes asignados al asesor
   */
  async findAll(filters?: {
    id_cliente?: number;
    id_sede?: number;
    id_tipo_equipo?: number;
    estado_equipo?: string;
    activo?: boolean;
    skip?: number;
    take?: number;
    idAsesorAsignado?: number; // ✅ MULTI-ASESOR
  }) {
    const where: any = {};

    if (filters?.id_cliente) where.id_cliente = filters.id_cliente;
    if (filters?.id_sede) where.id_sede = filters.id_sede;
    if (filters?.id_tipo_equipo) where.id_tipo_equipo = filters.id_tipo_equipo;
    if (filters?.estado_equipo) where.estado_equipo = filters.estado_equipo;
    if (filters?.activo !== undefined) where.activo = filters.activo;

    // ✅ MULTI-ASESOR: Filtrar equipos por clientes asignados al asesor
    if (filters?.idAsesorAsignado) {
      where.clientes = {
        id_asesor_asignado: filters.idAsesorAsignado,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.equipos.findMany({
        where,
        include: {
          clientes: {
            include: {
              persona: true,
            },
          },
          sedes_cliente: {
            select: { id_sede: true, nombre_sede: true },
          },
          tipos_equipo: {
            select: {
              id_tipo_equipo: true,
              nombre_tipo: true,
              codigo_tipo: true
            },
          },
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
