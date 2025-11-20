import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { catalogo_sistemas } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
    ActualizarCatalogoSistemaData,
    CatalogoSistemaEntity,
    CatalogoSistemasFilters,
    CrearCatalogoSistemaData,
    ICatalogoSistemasRepository,
} from '../domain/catalogo-sistemas.repository.interface';

@Injectable()
export class PrismaCatalogoSistemasRepository implements ICatalogoSistemasRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Helper para convertir Prisma entity a domain entity
  private toEntity(prismaEntity: catalogo_sistemas): CatalogoSistemaEntity {
    return {
      ...prismaEntity,
      activo: prismaEntity.activo ?? true,
      descripcion: prismaEntity.descripcion ?? undefined,
      icono: prismaEntity.icono ?? undefined,
      color_hex: prismaEntity.color_hex ?? undefined,
      observaciones: prismaEntity.observaciones ?? undefined,
      fecha_creacion: prismaEntity.fecha_creacion ?? new Date(),
    };
  }

  async crear(data: CrearCatalogoSistemaData): Promise<CatalogoSistemaEntity> {
    // Validar código único
    const existe = await this.prisma.catalogo_sistemas.findUnique({
      where: { codigo_sistema: data.codigo_sistema },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un sistema con el código ${data.codigo_sistema}`,
      );
    }

    const sistema = await this.prisma.catalogo_sistemas.create({
      data: {
        ...data,
        activo: true,
      },
    });

    return this.toEntity(sistema);
  }

  async actualizar(
    id: number,
    data: ActualizarCatalogoSistemaData,
  ): Promise<CatalogoSistemaEntity> {
    // Verificar existencia
    const existe = await this.prisma.catalogo_sistemas.findUnique({
      where: { id_sistema: id },
    });

    if (!existe) {
      throw new NotFoundException(`Sistema con id ${id} no encontrado`);
    }

    // Validar código único si se está actualizando
    if (data.codigo_sistema && data.codigo_sistema !== existe.codigo_sistema) {
      const codigoExiste = await this.prisma.catalogo_sistemas.findUnique({
        where: { codigo_sistema: data.codigo_sistema },
      });

      if (codigoExiste) {
        throw new ConflictException(
          `Ya existe un sistema con el código ${data.codigo_sistema}`,
        );
      }
    }

    const sistema = await this.prisma.catalogo_sistemas.update({
      where: { id_sistema: id },
      data,
    });

    return this.toEntity(sistema);
  }

  async desactivar(id: number): Promise<CatalogoSistemaEntity> {
    const sistema = await this.prisma.catalogo_sistemas.update({
      where: { id_sistema: id },
      data: { activo: false },
    });

    return this.toEntity(sistema);
  }

  async findById(id: number): Promise<CatalogoSistemaEntity | null> {
    const sistema = await this.prisma.catalogo_sistemas.findUnique({
      where: { id_sistema: id },
    });

    return sistema ? this.toEntity(sistema) : null;
  }

  async findByCodigo(codigo: string): Promise<CatalogoSistemaEntity | null> {
    const sistema = await this.prisma.catalogo_sistemas.findUnique({
      where: { codigo_sistema: codigo },
    });

    return sistema ? this.toEntity(sistema) : null;
  }

  async findAll(
    filters: CatalogoSistemasFilters,
  ): Promise<{ data: CatalogoSistemaEntity[]; total: number }> {
    const { activo, aplica_a, orden_min, orden_max, page = 1, limit = 10 } = filters;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo;
    }

    // Filtrar por categoría específica en el array aplica_a
    if (aplica_a) {
      where.aplica_a = {
        has: aplica_a,
      };
    }

    // Filtro por rango de orden
    if (orden_min !== undefined || orden_max !== undefined) {
      where.orden_visualizacion = {};
      if (orden_min !== undefined) {
        where.orden_visualizacion.gte = orden_min;
      }
      if (orden_max !== undefined) {
        where.orden_visualizacion.lte = orden_max;
      }
    }

    const [sistemas, total] = await Promise.all([
      this.prisma.catalogo_sistemas.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { orden_visualizacion: 'asc' },
      }),
      this.prisma.catalogo_sistemas.count({ where }),
    ]);

    return {
      data: sistemas.map((s) => this.toEntity(s)),
      total,
    };
  }
}
