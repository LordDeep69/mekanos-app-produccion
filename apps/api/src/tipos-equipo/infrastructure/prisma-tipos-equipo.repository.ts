import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { tipos_equipo } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
    ActualizarTipoEquipoData,
    CrearTipoEquipoData,
    ITiposEquipoRepository,
    TipoEquipoEntity,
    TiposEquipoFilters,
} from '../domain/tipos-equipo.repository.interface';

@Injectable()
export class PrismaTiposEquipoRepository implements ITiposEquipoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper para convertir Prisma tipos_equipo a TipoEquipoEntity
   * Convierte Decimal a number para compatibilidad de tipos
   */
  private toEntity(tipo: tipos_equipo): TipoEquipoEntity {
    return {
      id_tipo_equipo: tipo.id_tipo_equipo,
      codigo_tipo: tipo.codigo_tipo,
      nombre_tipo: tipo.nombre_tipo,
      descripcion: tipo.descripcion ?? undefined,
      categoria: tipo.categoria,
      tiene_motor: tipo.tiene_motor ?? false,
      tiene_generador: tipo.tiene_generador ?? false,
      tiene_bomba: tipo.tiene_bomba ?? false,
      requiere_horometro: tipo.requiere_horometro ?? false,
      permite_mantenimiento_tipo_a: tipo.permite_mantenimiento_tipo_a ?? false,
      permite_mantenimiento_tipo_b: tipo.permite_mantenimiento_tipo_b ?? false,
      intervalo_tipo_a_dias: tipo.intervalo_tipo_a_dias ?? undefined,
      intervalo_tipo_a_horas: tipo.intervalo_tipo_a_horas ? Number(tipo.intervalo_tipo_a_horas) : undefined,
      intervalo_tipo_b_dias: tipo.intervalo_tipo_b_dias ?? undefined,
      intervalo_tipo_b_horas: tipo.intervalo_tipo_b_horas ? Number(tipo.intervalo_tipo_b_horas) : undefined,
      criterio_intervalo: tipo.criterio_intervalo ?? undefined,
      formato_ficha_tecnica: tipo.formato_ficha_tecnica,
      formato_mantenimiento_tipo_a: tipo.formato_mantenimiento_tipo_a ?? undefined,
      formato_mantenimiento_tipo_b: tipo.formato_mantenimiento_tipo_b ?? undefined,
      orden: tipo.orden ?? 0,
      metadata: tipo.metadata ?? undefined,
      activo: tipo.activo ?? false,
      disponible: tipo.disponible ?? false,
      creado_por: tipo.creado_por ?? undefined,
      fecha_creacion: tipo.fecha_creacion ?? new Date(),
      modificado_por: tipo.modificado_por ?? undefined,
      fecha_modificacion: tipo.fecha_modificacion ?? undefined,
    };
  }

  async crear(data: CrearTipoEquipoData): Promise<TipoEquipoEntity> {
    // Validar código único
    const existe = await this.prisma.tipos_equipo.findUnique({
      where: { codigo_tipo: data.codigo_tipo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un tipo de equipo con código ${data.codigo_tipo}`,
      );
    }

    const tipoEquipo = await this.prisma.tipos_equipo.create({
      data: {
        codigo_tipo: data.codigo_tipo,
        nombre_tipo: data.nombre_tipo,
        descripcion: data.descripcion,
        categoria: data.categoria as any,
        tiene_motor: data.tiene_motor ?? false,
        tiene_generador: data.tiene_generador ?? false,
        tiene_bomba: data.tiene_bomba ?? false,
        requiere_horometro: data.requiere_horometro ?? false,
        permite_mantenimiento_tipo_a: data.permite_mantenimiento_tipo_a ?? true,
        permite_mantenimiento_tipo_b: data.permite_mantenimiento_tipo_b ?? false,
        intervalo_tipo_a_dias: data.intervalo_tipo_a_dias,
        intervalo_tipo_a_horas: data.intervalo_tipo_a_horas,
        intervalo_tipo_b_dias: data.intervalo_tipo_b_dias,
        intervalo_tipo_b_horas: data.intervalo_tipo_b_horas,
        criterio_intervalo: data.criterio_intervalo as any,
        formato_ficha_tecnica: data.formato_ficha_tecnica,
        formato_mantenimiento_tipo_a: data.formato_mantenimiento_tipo_a,
        formato_mantenimiento_tipo_b: data.formato_mantenimiento_tipo_b,
        orden: data.orden ?? 0,
        metadata: data.metadata,
        activo: true,
        disponible: true,
        ...(data.creado_por && { creado_por: data.creado_por }),
        fecha_creacion: new Date(),
      },
    });

    return this.toEntity(tipoEquipo);
  }

  async actualizar(
    id: number,
    data: ActualizarTipoEquipoData,
  ): Promise<TipoEquipoEntity> {
    // Verificar que existe
    const existe = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: id },
    });

    if (!existe) {
      throw new NotFoundException(`Tipo de equipo con ID ${id} no encontrado`);
    }

    const actualizado = await this.prisma.tipos_equipo.update({
      where: { id_tipo_equipo: id },
      data: {
        nombre_tipo: data.nombre_tipo,
        descripcion: data.descripcion,
        tiene_motor: data.tiene_motor,
        tiene_generador: data.tiene_generador,
        tiene_bomba: data.tiene_bomba,
        requiere_horometro: data.requiere_horometro,
        permite_mantenimiento_tipo_a: data.permite_mantenimiento_tipo_a,
        permite_mantenimiento_tipo_b: data.permite_mantenimiento_tipo_b,
        intervalo_tipo_a_dias: data.intervalo_tipo_a_dias,
        intervalo_tipo_a_horas: data.intervalo_tipo_a_horas,
        intervalo_tipo_b_dias: data.intervalo_tipo_b_dias,
        intervalo_tipo_b_horas: data.intervalo_tipo_b_horas,
        criterio_intervalo: data.criterio_intervalo as any,
        formato_ficha_tecnica: data.formato_ficha_tecnica,
        formato_mantenimiento_tipo_a: data.formato_mantenimiento_tipo_a,
        formato_mantenimiento_tipo_b: data.formato_mantenimiento_tipo_b,
        orden: data.orden,
        metadata: data.metadata,
        disponible: data.disponible,
        modificado_por: data.modificado_por,
        fecha_modificacion: new Date(),
      },
    });

    return this.toEntity(actualizado);
  }

  async desactivar(id: number): Promise<TipoEquipoEntity> {
    const existe = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: id },
    });

    if (!existe) {
      throw new NotFoundException(`Tipo de equipo con ID ${id} no encontrado`);
    }

    const desactivado = await this.prisma.tipos_equipo.update({
      where: { id_tipo_equipo: id },
      data: {
        activo: false,
        disponible: false,
        fecha_modificacion: new Date(),
      },
    });

    return this.toEntity(desactivado);
  }

  async findById(id: number): Promise<TipoEquipoEntity | null> {
    const tipoEquipo = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: id },
    });

    return tipoEquipo ? this.toEntity(tipoEquipo) : null;
  }

  async findByCodigo(codigo: string): Promise<TipoEquipoEntity | null> {
    const tipoEquipo = await this.prisma.tipos_equipo.findUnique({
      where: { codigo_tipo: codigo },
    });

    return tipoEquipo ? this.toEntity(tipoEquipo) : null;
  }

  async findAll(filters: TiposEquipoFilters): Promise<{
    data: TipoEquipoEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      categoria,
      activo,
      disponible,
      tiene_motor,
      tiene_generador,
      tiene_bomba,
    } = filters;

    const where: any = {};

    if (categoria) where.categoria = categoria;
    if (activo !== undefined) where.activo = activo;
    if (disponible !== undefined) where.disponible = disponible;
    if (tiene_motor !== undefined) where.tiene_motor = tiene_motor;
    if (tiene_generador !== undefined) where.tiene_generador = tiene_generador;
    if (tiene_bomba !== undefined) where.tiene_bomba = tiene_bomba;

    const [data, total] = await Promise.all([
      this.prisma.tipos_equipo.findMany({
        where,
        orderBy: [{ orden: 'asc' }, { nombre_tipo: 'asc' }],
        skip: (page - 1) * limit,
        take: Math.min(limit, 100), // Max 100 por página
      }),
      this.prisma.tipos_equipo.count({ where }),
    ]);

    return {
      data: data.map(tipo => this.toEntity(tipo)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
