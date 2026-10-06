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
import { CreateCategoriaComponenteDto } from './dto/create-categoria-componente.dto';
import { QueryCategoriaDto } from './dto/query-categoria.dto';

export interface CategoriaNodo {
  id_categoria: number;
  codigo_categoria: string;
  nombre: string;
  descripcion: string | null;
  id_padre: number | null;
  nivel: number;
  ruta_jerarquica: string;
  slug_path: string;
  activo: boolean;
  total_articulos: number;
  subcategorias: CategoriaNodo[];
}

@Injectable()
export class CategoriasComponenteService {
  private readonly logger = new Logger(CategoriasComponenteService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la estructura taxonómica completa formateada en un árbol jerárquico recursivo.
   * Agrupa subcategorías dentro de su nodo padre correspondiente y expone la métrica de artículos asociados.
   */
  async getArbol(): Promise<CategoriaNodo[]> {
    const categorias = await this.prisma.categorias_componente.findMany({
      where: { activo: true },
      orderBy: [
        { nivel: 'asc' },
        { nombre: 'asc' },
      ],
      select: {
        id_categoria: true,
        codigo_categoria: true,
        nombre: true,
        descripcion: true,
        id_padre: true,
        nivel: true,
        ruta_jerarquica: true,
        slug_path: true,
        activo: true,
        _count: {
          select: {
            catalogo_componentes: true,
          },
        },
      },
    });

    const mapaNodos = new Map<number, CategoriaNodo>();
    const raices: CategoriaNodo[] = [];

    // 1. Inicializar mapa de nodos
    for (const cat of categorias) {
      mapaNodos.set(cat.id_categoria, {
        id_categoria: cat.id_categoria,
        codigo_categoria: cat.codigo_categoria,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        id_padre: cat.id_padre,
        nivel: cat.nivel,
        ruta_jerarquica: cat.ruta_jerarquica,
        slug_path: cat.slug_path,
        activo: cat.activo,
        total_articulos: cat._count?.catalogo_componentes || 0,
        subcategorias: [],
      });
    }

    // 2. Ensamblar jerarquía recursiva
    for (const cat of categorias) {
      const nodo = mapaNodos.get(cat.id_categoria)!;
      if (cat.id_padre && mapaNodos.has(cat.id_padre)) {
        mapaNodos.get(cat.id_padre)!.subcategorias.push(nodo);
      } else {
        raices.push(nodo);
      }
    }

    return raices;
  }

  /**
   * Listado plano con filtros para búsqueda rápida, autocompletados o tablas administrativas.
   */
  async findAll(query: QueryCategoriaDto) {
    const where: Prisma.categorias_componenteWhereInput = {};

    if (query.activo !== undefined) {
      where.activo = query.activo;
    }

    if (query.id_padre !== undefined) {
      where.id_padre = query.id_padre;
    }

    if (query.nivel !== undefined) {
      where.nivel = query.nivel;
    }

    if (query.q && query.q.trim() !== '') {
      const q = query.q.trim();
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { codigo_categoria: { contains: q, mode: 'insensitive' } },
        { ruta_jerarquica: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.categorias_componente.findMany({
      where,
      orderBy: [
        { ruta_jerarquica: 'asc' },
      ],
      include: {
        _count: {
          select: {
            catalogo_componentes: true,
            subcategorias: true,
          },
        },
      },
    });
  }

  /**
   * Obtener detalle completo de una categoría con su padre y sus subcategorías directas.
   */
  async findOne(id: number) {
    const categoria = await this.prisma.categorias_componente.findUnique({
      where: { id_categoria: id },
      include: {
        categoria_padre: true,
        subcategorias: {
          where: { activo: true },
          orderBy: { nombre: 'asc' },
        },
        _count: {
          select: {
            catalogo_componentes: true,
          },
        },
      },
    });

    if (!categoria) {
      throw new NotFoundException(`La categoría técnica con ID ${id} no existe.`);
    }

    return categoria;
  }

  /**
   * Creación in-context de categoría:
   * Calcula dinámicamente el nivel, ruta_jerarquica y slug_path basándose en el id_padre.
   */
  async create(dto: CreateCategoriaComponenteDto) {
    const nombreSanitizado = dto.nombre.trim();
    if (!nombreSanitizado) {
      throw new BadRequestException('El nombre de la categoría es obligatorio.');
    }

    let nivel = 1;
    let rutaJerarquica = nombreSanitizado.toUpperCase();
    let baseSlug = slugify(nombreSanitizado) || 'cat';
    let slugPath = baseSlug;

    // 1. Si tiene padre asignado, validar existencia y componer jerarquía
    if (dto.id_padre) {
      const padre = await this.prisma.categorias_componente.findUnique({
        where: { id_categoria: dto.id_padre },
      });

      if (!padre) {
        throw new NotFoundException(
          `La categoría padre indicada con ID ${dto.id_padre} no fue encontrada en la base de datos.`,
        );
      }

      // Validar que no exista ya una subcategoría con el mismo nombre bajo el mismo padre
      const duplicadaBajoPadre = await this.prisma.categorias_componente.findFirst({
        where: {
          id_padre: dto.id_padre,
          nombre: { equals: nombreSanitizado, mode: 'insensitive' },
        },
      });

      if (duplicadaBajoPadre) {
        throw new ConflictException(
          `Ya existe la subcategoría '${duplicadaBajoPadre.nombre}' bajo la categoría '${padre.nombre}'.`,
        );
      }

      nivel = padre.nivel + 1;
      rutaJerarquica = `${padre.ruta_jerarquica} / ${nombreSanitizado.toUpperCase()}`;
      slugPath = `${padre.slug_path}/${baseSlug}`;
    } else {
      // Categoría raíz (nivel 1): verificar que no exista otra categoría raíz con el mismo nombre
      const duplicadaRaiz = await this.prisma.categorias_componente.findFirst({
        where: {
          id_padre: null,
          nombre: { equals: nombreSanitizado, mode: 'insensitive' },
        },
      });

      if (duplicadaRaiz) {
        throw new ConflictException(
          `Ya existe una categoría raíz con el nombre '${duplicadaRaiz.nombre}'.`,
        );
      }
    }

    // 2. Resolver código mnemotécnico único
    let codigoCategoria = dto.codigo_categoria?.trim().toUpperCase();

    if (codigoCategoria) {
      const existeCodigo = await this.prisma.categorias_componente.findUnique({
        where: { codigo_categoria: codigoCategoria },
      });
      if (existeCodigo) {
        throw new ConflictException(
          `El código de categoría '${codigoCategoria}' ya está en uso por '${existeCodigo.nombre}'.`,
        );
      }
    } else {
      // Generar código automático seguro (ej: CAT-FILTROS-AIRE)
      const prefijo = dto.id_padre ? 'SUB' : 'CAT';
      const cleanSlug = baseSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 30);
      let candCod = `${prefijo}-${cleanSlug}`;
      let c = 1;
      while (
        await this.prisma.categorias_componente.findUnique({
          where: { codigo_categoria: candCod },
        })
      ) {
        candCod = `${prefijo}-${cleanSlug}-${c}`;
        c++;
      }
      codigoCategoria = candCod;
    }

    this.logger.log(
      `Insertando categoría técnica: ${nombreSanitizado} [${codigoCategoria}] (Ruta: ${rutaJerarquica})`,
    );

    // 3. Inserción atómica en la tabla categorias_componente
    return this.prisma.categorias_componente.create({
      data: {
        codigo_categoria: codigoCategoria,
        nombre: nombreSanitizado,
        descripcion: dto.descripcion?.trim() || null,
        id_padre: dto.id_padre || null,
        nivel,
        ruta_jerarquica: rutaJerarquica,
        slug_path: slugPath,
        activo: true,
      },
      include: {
        categoria_padre: {
          select: {
            id_categoria: true,
            nombre: true,
            ruta_jerarquica: true,
          },
        },
      },
    });
  }

  /**
   * Actualización de categoría técnica existente.
   */
  async update(id: number, dto: Partial<CreateCategoriaComponenteDto>) {
    const actual = await this.findOne(id);

    const data: Prisma.categorias_componenteUpdateInput = {
      fecha_modificacion: new Date(),
    };

    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion?.trim() || null;
    }

    if (dto.activo !== undefined) {
      data.activo = dto.activo;
    }

    if (dto.codigo_categoria !== undefined && dto.codigo_categoria.trim() !== '') {
      data.codigo_categoria = dto.codigo_categoria.trim().toUpperCase();
    }

    if (dto.nombre !== undefined && dto.nombre.trim() !== '') {
      const nombreSanitizado = dto.nombre.trim();
      const idPadre = dto.id_padre !== undefined ? dto.id_padre : actual.id_padre;

      const duplicada = await this.prisma.categorias_componente.findFirst({
        where: {
          id_categoria: { not: id },
          id_padre: idPadre || null,
          nombre: { equals: nombreSanitizado, mode: 'insensitive' },
        },
      });

      if (duplicada) {
        throw new ConflictException(
          `Ya existe otra categoría con el nombre '${nombreSanitizado}' en este mismo nivel jerárquico.`,
        );
      }

      data.nombre = nombreSanitizado;

      // Recalcular ruta jerárquica
      if (idPadre) {
        const padre = await this.prisma.categorias_componente.findUnique({
          where: { id_categoria: idPadre },
        });
        if (padre) {
          data.ruta_jerarquica = `${padre.ruta_jerarquica} / ${nombreSanitizado.toUpperCase()}`;
          data.slug_path = `${padre.slug_path}/${slugify(nombreSanitizado)}`;
        }
      } else {
        data.ruta_jerarquica = nombreSanitizado.toUpperCase();
        data.slug_path = slugify(nombreSanitizado);
      }
    }

    return this.prisma.categorias_componente.update({
      where: { id_categoria: id },
      data,
    });
  }
}
