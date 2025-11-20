import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { tipos_componente } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
    ActualizarTipoComponenteData,
    CrearTipoComponenteData,
    ITiposComponenteRepository,
    TipoComponenteEntity,
    TiposComponenteFilters,
} from '../domain/tipos-componente.repository.interface';

@Injectable()
export class PrismaTiposComponenteRepository
  implements ITiposComponenteRepository
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper para convertir Prisma tipos_componente a TipoComponenteEntity
   */
  private toEntity(tipo: tipos_componente): TipoComponenteEntity {
    return {
      id_tipo_componente: tipo.id_tipo_componente,
      codigo_tipo: tipo.codigo_tipo,
      nombre_componente: tipo.nombre_componente,
      categoria: tipo.categoria,
      subcategoria: tipo.subcategoria ?? undefined,
      es_consumible: tipo.es_consumible ?? true,
      es_inventariable: tipo.es_inventariable ?? true,
      aplica_a: tipo.aplica_a,
      descripcion: tipo.descripcion ?? undefined,
      activo: tipo.activo ?? true,
      creado_por: tipo.creado_por ?? undefined,
      fecha_creacion: tipo.fecha_creacion ?? new Date(),
    };
  }

  async crear(data: CrearTipoComponenteData): Promise<TipoComponenteEntity> {
    // Validar código único
    const existe = await this.prisma.tipos_componente.findUnique({
      where: { codigo_tipo: data.codigo_tipo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un tipo de componente con código ${data.codigo_tipo}`,
      );
    }

    const tipoComponente = await this.prisma.tipos_componente.create({
      data: {
        codigo_tipo: data.codigo_tipo,
        nombre_componente: data.nombre_componente,
        categoria: data.categoria as any,
        subcategoria: data.subcategoria,
        es_consumible: data.es_consumible ?? true,
        es_inventariable: data.es_inventariable ?? true,
        aplica_a: data.aplica_a as any,
        descripcion: data.descripcion,
        activo: true,
        creado_por: data.creado_por,
        fecha_creacion: new Date(),
      },
    });

    return this.toEntity(tipoComponente);
  }

  async actualizar(
    id: number,
    data: ActualizarTipoComponenteData,
  ): Promise<TipoComponenteEntity> {
    // Verificar que existe
    const existe = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: id },
    });

    if (!existe) {
      throw new NotFoundException(
        `Tipo de componente con ID ${id} no encontrado`,
      );
    }

    // Si se actualiza el código, verificar que no exista otro con el mismo código
    if (data.codigo_tipo && data.codigo_tipo !== existe.codigo_tipo) {
      const codigoExiste = await this.prisma.tipos_componente.findUnique({
        where: { codigo_tipo: data.codigo_tipo },
      });

      if (codigoExiste) {
        throw new ConflictException(
          `Ya existe un tipo de componente con código ${data.codigo_tipo}`,
        );
      }
    }

    const actualizado = await this.prisma.tipos_componente.update({
      where: { id_tipo_componente: id },
      data: {
        codigo_tipo: data.codigo_tipo,
        nombre_componente: data.nombre_componente,
        categoria: data.categoria as any,
        subcategoria: data.subcategoria,
        es_consumible: data.es_consumible,
        es_inventariable: data.es_inventariable,
        aplica_a: data.aplica_a as any,
        descripcion: data.descripcion,
        activo: data.activo,
      },
    });

    return this.toEntity(actualizado);
  }

  async desactivar(id: number): Promise<TipoComponenteEntity> {
    const existe = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: id },
    });

    if (!existe) {
      throw new NotFoundException(
        `Tipo de componente con ID ${id} no encontrado`,
      );
    }

    const desactivado = await this.prisma.tipos_componente.update({
      where: { id_tipo_componente: id },
      data: {
        activo: false,
      },
    });

    return this.toEntity(desactivado);
  }

  async findById(id: number): Promise<TipoComponenteEntity | null> {
    const tipoComponente = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: id },
    });

    return tipoComponente ? this.toEntity(tipoComponente) : null;
  }

  async findByCodigo(codigo: string): Promise<TipoComponenteEntity | null> {
    const tipoComponente = await this.prisma.tipos_componente.findUnique({
      where: { codigo_tipo: codigo },
    });

    return tipoComponente ? this.toEntity(tipoComponente) : null;
  }

  async findAll(filters: TiposComponenteFilters): Promise<{
    data: TipoComponenteEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 50, ...whereFilters } = filters;

    // Construir where clause dinámicamente
    const where: any = {};

    if (whereFilters.categoria !== undefined) {
      where.categoria = whereFilters.categoria;
    }

    if (whereFilters.aplica_a !== undefined) {
      where.aplica_a = whereFilters.aplica_a;
    }

    if (whereFilters.es_consumible !== undefined) {
      where.es_consumible = whereFilters.es_consumible;
    }

    if (whereFilters.es_inventariable !== undefined) {
      where.es_inventariable = whereFilters.es_inventariable;
    }

    if (whereFilters.activo !== undefined) {
      where.activo = whereFilters.activo;
    }

    // Ejecutar query con paginación
    const [data, total] = await Promise.all([
      this.prisma.tipos_componente.findMany({
        where,
        orderBy: { nombre_componente: 'asc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100), // Max 100 por página
      }),
      this.prisma.tipos_componente.count({ where }),
    ]);

    return {
      data: data.map((tipo) => this.toEntity(tipo)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
