import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { slugify } from '../common/utils/slug.util';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { QueryMarcaDto } from './dto/query-marca.dto';
import { FusionarMarcasDto } from './dto/fusionar-marcas.dto';

@Injectable()
export class MarcasService {
  private readonly logger = new Logger(MarcasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Búsqueda rápida optimizada para Comboboxes y selectores de catálogo.
   * Retorna una proyección completa ordenada por relevancia (OEM primero, luego alfabético).
   */
  async findAll(query: QueryMarcaDto) {
    const where: Prisma.marcasWhereInput = {};

    if (query.activo !== undefined) {
      where.activo = query.activo;
    }

    if (query.es_fabricante_oem !== undefined) {
      where.es_fabricante_oem = query.es_fabricante_oem;
    }

    if (query.q && query.q.trim() !== '') {
      const q = query.q.trim();
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = query.limit || 100;

    return this.prisma.marcas.findMany({
      where,
      take,
      select: {
        id_marca: true,
        nombre: true,
        slug: true,
        descripcion: true,
        es_fabricante_oem: true,
        pais_origen: true,
        sitio_web: true,
        logo_url: true,
        activo: true,
        fecha_creacion: true,
        fecha_modificacion: true,
        _count: {
          select: {
            catalogo_componentes: true,
            articulos_proveedores: true,
          },
        },
      },
      orderBy: [
        { es_fabricante_oem: 'desc' },
        { nombre: 'asc' },
      ],
    });
  }

  /**
   * Obtener detalle completo de una marca por su ID.
   */
  async findOne(id: number) {
    const marca = await this.prisma.marcas.findUnique({
      where: { id_marca: id },
      include: {
        _count: {
          select: {
            catalogo_componentes: true,
            articulos_proveedores: true,
          },
        },
      },
    });

    if (!marca) {
      throw new NotFoundException(`La marca con ID ${id} no existe en el sistema.`);
    }

    return marca;
  }

  /**
   * Creación al vuelo con sanitización y verificación de unicidad case-insensitive.
   */
  async create(dto: CreateMarcaDto) {
    const nombreSanitizado = dto.nombre.trim();
    if (!nombreSanitizado) {
      throw new BadRequestException('El nombre de la marca no puede estar vacío.');
    }

    // 1. Verificación estricta de unicidad case-insensitive
    const existente = await this.prisma.marcas.findFirst({
      where: {
        nombre: {
          equals: nombreSanitizado,
          mode: 'insensitive',
        },
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una marca registrada con el nombre '${existente.nombre}' (ID: ${existente.id_marca}).`,
      );
    }

    // 2. Generación o validación de slug único
    const baseSlug = dto.slug?.trim() ? slugify(dto.slug.trim()) : slugify(nombreSanitizado) || 'marca';
    let slugFinal = baseSlug;
    let contador = 1;

    while (
      await this.prisma.marcas.findUnique({
        where: { slug: slugFinal },
      })
    ) {
      slugFinal = `${baseSlug}-${contador}`;
      contador++;
    }

    this.logger.log(`Registrando nueva marca: ${nombreSanitizado.toUpperCase()} (slug: ${slugFinal})`);

    // 3. Inserción con mayúsculas industriales normalizadas
    return this.prisma.marcas.create({
      data: {
        nombre: nombreSanitizado.toUpperCase(),
        slug: slugFinal,
        descripcion: dto.descripcion?.trim() || null,
        pais_origen: dto.pais_origen?.trim() || null,
        sitio_web: dto.sitio_web?.trim() || null,
        logo_url: dto.logo_url?.trim() || null,
        es_fabricante_oem: dto.es_fabricante_oem ?? false,
        activo: dto.activo ?? true,
      },
      select: {
        id_marca: true,
        nombre: true,
        slug: true,
        descripcion: true,
        pais_origen: true,
        sitio_web: true,
        logo_url: true,
        es_fabricante_oem: true,
        activo: true,
        fecha_creacion: true,
      },
    });
  }

  /**
   * Actualización de marca existente con verificación de duplicados.
   */
  async update(id: number, dto: Partial<CreateMarcaDto>) {
    await this.findOne(id);

    const data: Prisma.marcasUpdateInput = {
      fecha_modificacion: new Date(),
    };

    if (dto.nombre !== undefined) {
      const nombreSanitizado = dto.nombre.trim();
      if (!nombreSanitizado) {
        throw new BadRequestException('El nombre de la marca no puede estar vacío.');
      }

      const duplicada = await this.prisma.marcas.findFirst({
        where: {
          id_marca: { not: id },
          nombre: { equals: nombreSanitizado, mode: 'insensitive' },
        },
      });

      if (duplicada) {
        throw new ConflictException(
          `Ya existe otra marca con el nombre '${duplicada.nombre}' (ID: ${duplicada.id_marca}).`,
        );
      }

      data.nombre = nombreSanitizado.toUpperCase();
    }

    if (dto.slug !== undefined) {
      const slugSanitizado = slugify(dto.slug.trim());
      if (slugSanitizado) {
        const duplicadoSlug = await this.prisma.marcas.findFirst({
          where: {
            id_marca: { not: id },
            slug: slugSanitizado,
          },
        });
        if (duplicadoSlug) {
          throw new ConflictException(`Ya existe una marca con el slug '${slugSanitizado}'.`);
        }
        data.slug = slugSanitizado;
      }
    }

    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.pais_origen !== undefined) data.pais_origen = dto.pais_origen?.trim() || null;
    if (dto.sitio_web !== undefined) data.sitio_web = dto.sitio_web?.trim() || null;
    if (dto.logo_url !== undefined) data.logo_url = dto.logo_url?.trim() || null;
    if (dto.es_fabricante_oem !== undefined) data.es_fabricante_oem = dto.es_fabricante_oem;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.marcas.update({
      where: { id_marca: id },
      data,
    });
  }

  /**
   * Fusión atómica de marcas (Merge Brands):
   * Migra todos los repuestos (catalogo_componentes) y artículos de proveedores (articulos_proveedores)
   * de la marca origen a la marca destino de forma transaccional, y desactiva o elimina la marca origen.
   */
  async fusionar(dto: FusionarMarcasDto) {
    const { id_marca_origen, id_marca_destino, eliminar_origen = true } = dto;

    if (id_marca_origen === id_marca_destino) {
      throw new BadRequestException('La marca origen y la marca destino deben ser diferentes.');
    }

    const [marcaOrigen, marcaDestino] = await Promise.all([
      this.prisma.marcas.findUnique({
        where: { id_marca: id_marca_origen },
        include: {
          _count: {
            select: {
              catalogo_componentes: true,
              articulos_proveedores: true,
            },
          },
        },
      }),
      this.prisma.marcas.findUnique({
        where: { id_marca: id_marca_destino },
      }),
    ]);

    if (!marcaOrigen) {
      throw new NotFoundException(`La marca origen con ID ${id_marca_origen} no existe.`);
    }

    if (!marcaDestino) {
      throw new NotFoundException(`La marca destino con ID ${id_marca_destino} no existe.`);
    }

    const res = await this.prisma.$transaction(async (tx) => {
      // 1. Migrar catalogo_componentes (id_marca y nombre de marca desnormalizado)
      const articulosActualizados = await tx.catalogo_componentes.updateMany({
        where: { id_marca: id_marca_origen },
        data: {
          id_marca: id_marca_destino,
          marca: marcaDestino.nombre,
        },
      });

      // 2. Migrar articulos_proveedores (id_marca_ofrecida y marca_ofrecida desnormalizado)
      const proveedoresActualizados = await tx.articulos_proveedores.updateMany({
        where: { id_marca_ofrecida: id_marca_origen },
        data: {
          id_marca_ofrecida: id_marca_destino,
          marca_ofrecida: marcaDestino.nombre,
        },
      });

      // 3. Eliminar o desactivar la marca origen
      if (eliminar_origen) {
        await tx.marcas.delete({
          where: { id_marca: id_marca_origen },
        });
      } else {
        await tx.marcas.update({
          where: { id_marca: id_marca_origen },
          data: {
            activo: false,
            descripcion: marcaOrigen.descripcion
              ? `${marcaOrigen.descripcion} [Fusionada en ${marcaDestino.nombre}]`
              : `[Fusionada en ${marcaDestino.nombre}]`,
          },
        });
      }

      return {
        articulos_migrados: articulosActualizados.count,
        proveedores_migrados: proveedoresActualizados.count,
      };
    });

    this.logger.log(
      `Fusión completada con éxito: '${marcaOrigen.nombre}' (ID ${id_marca_origen}) transferida a '${marcaDestino.nombre}' (ID ${id_marca_destino}). Repuestos migrados: ${res.articulos_migrados}`,
    );

    return {
      success: true,
      mensaje: `Fusión completada. Se migraron ${res.articulos_migrados} repuesto(s) de "${marcaOrigen.nombre}" a "${marcaDestino.nombre}".`,
      marca_destino: marcaDestino,
      articulos_migrados: res.articulos_migrados,
      proveedores_migrados: res.proveedores_migrados,
      origen_eliminado: eliminar_origen,
    };
  }
}
