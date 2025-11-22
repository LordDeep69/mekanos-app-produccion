import { PrismaService } from '@mekanos/database';
import { Injectable } from '@nestjs/common';
import { Prisma, catalogo_servicios } from '@prisma/client';

export type CatalogoServicioConRelaciones = Prisma.catalogo_serviciosGetPayload<{
  include: typeof PrismaCatalogoServiciosRepository.prototype.INCLUDE_RELATIONS_DETAIL;
}>;

@Injectable()
export class PrismaCatalogoServiciosRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ CRITICAL: Usar campos REALES de personas (primer_nombre, primer_apellido, nombre_completo)
  // Aprendizaje tabla 1: NO usar "nombre" ni "apellido" (no existen en schema)
  readonly INCLUDE_RELATIONS_DETAIL = {
    tipo_servicio: {
      select: {
        id_tipo_servicio: true,
        codigo_tipo: true,
        nombre_tipo: true,
        categoria: true,
      },
    },
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        nombre_tipo: true,
      },
    },
    usuarios_catalogo_servicios_creado_porTousuarios: {
      select: {
        id_usuario: true,
        persona: {
          select: {
            id_persona: true,
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true,
          },
        },
      },
    },
    usuarios_catalogo_servicios_modificado_porTousuarios: {
      select: {
        id_usuario: true,
        persona: {
          select: {
            id_persona: true,
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true,
          },
        },
      },
    },
  } as const;

  readonly INCLUDE_RELATIONS_LIST = {
    tipo_servicio: {
      select: {
        id_tipo_servicio: true,
        codigo_tipo: true,
        nombre_tipo: true,
      },
    },
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        nombre_tipo: true,
      },
    },
  } as const;

  async create(data: Prisma.catalogo_serviciosCreateInput): Promise<CatalogoServicioConRelaciones> {
    return this.prisma.catalogo_servicios.create({
      data,
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async findById(id: number): Promise<CatalogoServicioConRelaciones | null> {
    return this.prisma.catalogo_servicios.findUnique({
      where: { id_servicio: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async findByCodigo(codigo: string): Promise<catalogo_servicios | null> {
    return this.prisma.catalogo_servicios.findUnique({
      where: { codigo_servicio: codigo.toUpperCase().trim() },
    });
  }

  async findAll(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoServicioId?: number;
    tipoEquipoId?: number;
  }): Promise<any[]> {  // Temporal: any para evitar conflicto tipo con INCLUDE_RELATIONS_LIST
    const where: Prisma.catalogo_serviciosWhereInput = {};

    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }
    if (filters?.categoria) {
      where.categoria = filters.categoria as any;
    }
    if (filters?.tipoServicioId) {
      where.id_tipo_servicio = filters.tipoServicioId;
    }
    if (filters?.tipoEquipoId) {
      where.id_tipo_equipo = filters.tipoEquipoId;
    }

    return this.prisma.catalogo_servicios.findMany({
      where,
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: [
        { categoria: 'asc' },
        { nombre_servicio: 'asc' },
      ],
    });
  }

  async findByTipoServicio(tipoServicioId: number): Promise<any[]> {  // Temporal: any
    return this.prisma.catalogo_servicios.findMany({
      where: { id_tipo_servicio: tipoServicioId },
      include: this.INCLUDE_RELATIONS_LIST,
    });
  }

  async update(
    id: number,
    data: Prisma.catalogo_serviciosUpdateInput,
  ): Promise<CatalogoServicioConRelaciones> {
    return this.prisma.catalogo_servicios.update({
      where: { id_servicio: id },
      data,
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async softDelete(id: number): Promise<CatalogoServicioConRelaciones> {
    return this.prisma.catalogo_servicios.update({
      where: { id_servicio: id },
      data: {
        activo: false,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async count(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoServicioId?: number;
  }): Promise<number> {
    const where: Prisma.catalogo_serviciosWhereInput = {};

    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }
    if (filters?.categoria) {
      where.categoria = filters.categoria as any;
    }
    if (filters?.tipoServicioId) {
      where.id_tipo_servicio = filters.tipoServicioId;
    }

    return this.prisma.catalogo_servicios.count({ where });
  }
}
