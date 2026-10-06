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

@Injectable()
export class MarcasService {
  private readonly logger = new Logger(MarcasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Búsqueda rápida optimizada para Comboboxes y selectores de catálogo.
   * Retorna una proyección ligera ordenada por relevancia (OEM primero, luego alfabético).
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

    const take = query.limit || 20;

    return this.prisma.marcas.findMany({
      where,
      take,
      select: {
        id_marca: true,
        nombre: true,
        slug: true,
        es_fabricante_oem: true,
        pais_origen: true,
        logo_url: true,
        activo: true,
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

    // 2. Generación automática y blindaje de slug único
    const baseSlug = slugify(nombreSanitizado) || 'marca';
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
        activo: true,
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

    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.pais_origen !== undefined) data.pais_origen = dto.pais_origen?.trim() || null;
    if (dto.sitio_web !== undefined) data.sitio_web = dto.sitio_web?.trim() || null;
    if (dto.logo_url !== undefined) data.logo_url = dto.logo_url?.trim() || null;
    if (dto.es_fabricante_oem !== undefined) data.es_fabricante_oem = dto.es_fabricante_oem;

    return this.prisma.marcas.update({
      where: { id_marca: id },
      data,
    });
  }
}
