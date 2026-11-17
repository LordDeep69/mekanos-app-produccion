import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ActualizarTipoComponenteData,
  CrearTipoComponenteData,
  ITiposComponenteRepository,
  TipoComponenteEntity,
  TiposComponenteFilters,
} from '../domain/tipos-componente.repository.interface';

const TIPO_COMPONENTE_INCLUDE = {
  tipos_componente_tipo_equipo: {
    include: {
      tipos_equipo: {
        select: {
          id_tipo_equipo: true,
          codigo_tipo: true,
          nombre_tipo: true,
        },
      },
    },
  },
} satisfies Prisma.tipos_componenteInclude;

type TipoComponenteWithRel = Prisma.tipos_componenteGetPayload<{
  include: typeof TIPO_COMPONENTE_INCLUDE;
}>;

@Injectable()
export class PrismaTiposComponenteRepository implements ITiposComponenteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(tipo: TipoComponenteWithRel): TipoComponenteEntity {
    const relaciones = tipo.tipos_componente_tipo_equipo ?? [];
    return {
      id_tipo_componente: tipo.id_tipo_componente,
      codigo_tipo: tipo.codigo_tipo,
      nombre_componente: tipo.nombre_componente,
      categoria: tipo.categoria,
      subcategoria: tipo.subcategoria ?? undefined,
      es_consumible: tipo.es_consumible ?? true,
      es_inventariable: tipo.es_inventariable ?? true,
      aplica_a: tipo.aplica_a ?? null,
      aplica_todos_tipos: tipo.aplica_todos_tipos ?? true,
      tipos_equipo_ids: relaciones.map((r) => r.id_tipo_equipo),
      tipos_equipo: relaciones.map((r) => r.tipos_equipo),
      descripcion: tipo.descripcion ?? undefined,
      activo: tipo.activo ?? true,
      creado_por: tipo.creado_por ?? undefined,
      fecha_creacion: tipo.fecha_creacion ?? new Date(),
    };
  }

  private async resolveLegacyAplicaTipoIds(
    tx: Prisma.TransactionClient,
    aplicaA?: string,
  ): Promise<number[]> {
    if (!aplicaA || aplicaA === 'AMBOS') return [];
    const codigos =
      aplicaA === 'GENERADOR' ? ['GENERADOR', 'GEN', 'MOTOR', 'MOT'] : ['BOMBA', 'BOM'];
    const tipos = await tx.tipos_equipo.findMany({
      where: { codigo_tipo: { in: codigos } },
      select: { id_tipo_equipo: true },
    });
    return tipos.map((t) => t.id_tipo_equipo);
  }

  private async validateTiposEquipoIds(
    tx: Prisma.TransactionClient,
    ids: number[],
  ): Promise<number[]> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return [];
    const encontrados = await tx.tipos_equipo.findMany({
      where: { id_tipo_equipo: { in: uniqueIds } },
      select: { id_tipo_equipo: true },
    });
    if (encontrados.length !== uniqueIds.length) {
      throw new BadRequestException('Uno o más id_tipo_equipo especificados no existen.');
    }
    return uniqueIds;
  }

  async crear(data: CrearTipoComponenteData): Promise<TipoComponenteEntity> {
    const existe = await this.prisma.tipos_componente.findFirst({
      where: { codigo_tipo: data.codigo_tipo },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un tipo de componente con código ${data.codigo_tipo}`);
    }

    const creado = await this.prisma.$transaction(async (tx) => {
      const explicitIds =
        data.tipos_equipo_ids !== undefined
          ? await this.validateTiposEquipoIds(tx, data.tipos_equipo_ids)
          : data.aplica_a && data.aplica_a !== 'AMBOS'
            ? await this.resolveLegacyAplicaTipoIds(tx, data.aplica_a)
            : [];

      const aplicaTodos =
        data.aplica_todos_tipos !== undefined
          ? data.aplica_todos_tipos
          : explicitIds.length > 0
            ? false
            : data.aplica_a === 'GENERADOR' || data.aplica_a === 'BOMBA'
              ? false
              : true;

      return tx.tipos_componente.create({
        data: {
          codigo_tipo: data.codigo_tipo,
          nombre_componente: data.nombre_componente,
          categoria: data.categoria as any,
          subcategoria: data.subcategoria,
          es_consumible: data.es_consumible ?? true,
          es_inventariable: data.es_inventariable ?? true,
          aplica_a: (data.aplica_a as any) ?? null,
          aplica_todos_tipos: aplicaTodos,
          descripcion: data.descripcion,
          activo: true,
          creado_por: data.creado_por,
          fecha_creacion: new Date(),
          ...(explicitIds.length > 0
            ? {
                tipos_componente_tipo_equipo: {
                  create: explicitIds.map((id_tipo_equipo) => ({ id_tipo_equipo })),
                },
              }
            : {}),
        },
        include: TIPO_COMPONENTE_INCLUDE,
      });
    });

    return this.toEntity(creado);
  }

  async actualizar(id: number, data: ActualizarTipoComponenteData): Promise<TipoComponenteEntity> {
    const existe = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: id },
    });

    if (!existe) {
      throw new NotFoundException(`Tipo de componente con ID ${id} no encontrado`);
    }

    if (data.codigo_tipo && data.codigo_tipo !== existe.codigo_tipo) {
      const codigoExiste = await this.prisma.tipos_componente.findFirst({
        where: { codigo_tipo: data.codigo_tipo },
      });

      if (codigoExiste) {
        throw new ConflictException(
          `Ya existe un tipo de componente con código ${data.codigo_tipo}`,
        );
      }
    }

    const actualizado = await this.prisma.$transaction(async (tx) => {
      let nextAplicaTodos = data.aplica_todos_tipos;

      if (data.tipos_equipo_ids !== undefined) {
        const validIds = await this.validateTiposEquipoIds(tx, data.tipos_equipo_ids);
        await tx.tipos_componente_tipo_equipo.deleteMany({
          where: { id_tipo_componente: id },
        });
        if (validIds.length > 0) {
          await tx.tipos_componente_tipo_equipo.createMany({
            data: validIds.map((id_tipo_equipo) => ({
              id_tipo_componente: id,
              id_tipo_equipo,
            })),
            skipDuplicates: true,
          });
          if (nextAplicaTodos === undefined) {
            nextAplicaTodos = false;
          }
        }
      }

      return tx.tipos_componente.update({
        where: { id_tipo_componente: id },
        data: {
          codigo_tipo: data.codigo_tipo,
          nombre_componente: data.nombre_componente,
          categoria: data.categoria as any,
          subcategoria: data.subcategoria,
          es_consumible: data.es_consumible,
          es_inventariable: data.es_inventariable,
          ...(data.aplica_a !== undefined ? { aplica_a: data.aplica_a as any } : {}),
          ...(nextAplicaTodos !== undefined ? { aplica_todos_tipos: nextAplicaTodos } : {}),
          descripcion: data.descripcion,
          activo: data.activo,
        },
        include: TIPO_COMPONENTE_INCLUDE,
      });
    });

    return this.toEntity(actualizado);
  }

  async desactivar(id: number): Promise<TipoComponenteEntity> {
    const existe = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: id },
    });

    if (!existe) {
      throw new NotFoundException(`Tipo de componente con ID ${id} no encontrado`);
    }

    const desactivado = await this.prisma.tipos_componente.update({
      where: { id_tipo_componente: id },
      data: {
        activo: false,
      },
      include: TIPO_COMPONENTE_INCLUDE,
    });

    return this.toEntity(desactivado);
  }

  async findById(id: number): Promise<TipoComponenteEntity | null> {
    const tipoComponente = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: id },
      include: TIPO_COMPONENTE_INCLUDE,
    });

    return tipoComponente ? this.toEntity(tipoComponente) : null;
  }

  async findByCodigo(codigo: string): Promise<TipoComponenteEntity | null> {
    const tipoComponente = await this.prisma.tipos_componente.findFirst({
      where: { codigo_tipo: codigo },
      include: TIPO_COMPONENTE_INCLUDE,
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
    const where: Prisma.tipos_componenteWhereInput = {};

    if (whereFilters.categoria !== undefined) {
      where.categoria = whereFilters.categoria as any;
    }

    if (whereFilters.aplica_a !== undefined) {
      where.aplica_a = whereFilters.aplica_a as any;
    }

    if (whereFilters.id_tipo_equipo !== undefined) {
      where.OR = [
        { aplica_todos_tipos: true },
        {
          tipos_componente_tipo_equipo: {
            some: { id_tipo_equipo: whereFilters.id_tipo_equipo },
          },
        },
      ];
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

    const [data, total] = await Promise.all([
      this.prisma.tipos_componente.findMany({
        where,
        include: TIPO_COMPONENTE_INCLUDE,
        orderBy: { nombre_componente: 'asc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
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
