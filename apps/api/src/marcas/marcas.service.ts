import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { slugify } from '../common/utils/slug.util';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { QueryMarcaDto } from './dto/query-marca.dto';
import { FusionarMarcasDto } from './dto/fusionar-marcas.dto';

const MARCAS_ESTANDAR_OEM: Array<{
  nombre: string;
  pais_origen?: string;
  descripcion?: string;
}> = [
  // Generación Eléctrica y Fuerza Motriz
  { nombre: 'CUMMINS', pais_origen: 'Estados Unidos', descripcion: 'Fabricante de motores diésel, gas y generadores' },
  { nombre: 'PERKINS', pais_origen: 'Reino Unido', descripcion: 'Motores diésel industriales y agrícolas' },
  { nombre: 'CATERPILLAR', pais_origen: 'Estados Unidos', descripcion: 'Maquinaria pesada, motores y grupos electrógenos' },
  { nombre: 'DOOSAN', pais_origen: 'Corea del Sur', descripcion: 'Equipos industriales, motores y generadores' },
  { nombre: 'VOLVO PENTA', pais_origen: 'Suecia', descripcion: 'Motores marinos e industriales de combustión' },
  { nombre: 'DEUTZ', pais_origen: 'Alemania', descripcion: 'Motores diésel refrigerados por aire y agua' },
  { nombre: 'JOHN DEERE', pais_origen: 'Estados Unidos', descripcion: 'Motores diésel industriales y maquinaria pesada' },
  { nombre: 'KOHLER', pais_origen: 'Estados Unidos', descripcion: 'Grupos electrógenos y motores industriales' },
  { nombre: 'SDMO', pais_origen: 'Francia', descripcion: 'Grupos electrógenos y plantas de energía' },
  // Generadores Eléctricos / Alternadores
  { nombre: 'STAMFORD', pais_origen: 'Reino Unido', descripcion: 'Alternadores síncronos industriales' },
  { nombre: 'MARATHON', pais_origen: 'Estados Unidos', descripcion: 'Generadores eléctricos y alternadores' },
  { nombre: 'LEROY SOMER', pais_origen: 'Francia', descripcion: 'Alternadores y motores eléctricos industriales' },
  // Bombeo e Hidráulica
  { nombre: 'GOULDS', pais_origen: 'Estados Unidos', descripcion: 'Bombas centrífugas industriales y sumergibles' },
  { nombre: 'PEDROLLO', pais_origen: 'Italia', descripcion: 'Bombas eléctricas de agua y sistemas de presión' },
  { nombre: 'BARNES', pais_origen: 'Colombia / EE.UU.', descripcion: 'Bombas autocebantes, sumergibles y de achique' },
  { nombre: 'KSB', pais_origen: 'Alemania', descripcion: 'Bombas centrífugas y válvulas de proceso' },
  { nombre: 'GRUNDFOS', pais_origen: 'Dinamarca', descripcion: 'Sistemas avanzados de bombeo e hidroflo' },
  // Motores Eléctricos y Automatización
  { nombre: 'WEG', pais_origen: 'Brasil', descripcion: 'Motores eléctricos, variadores y transformadores' },
  { nombre: 'SIEMENS', pais_origen: 'Alemania', descripcion: 'Automatización industrial, motores y control' },
  { nombre: 'BALDOR', pais_origen: 'Estados Unidos', descripcion: 'Motores eléctricos industriales y reductores (ABB)' },
  { nombre: 'ABB', pais_origen: 'Suiza', descripcion: 'Electrificación, robótica, variadores y potencia' },
  { nombre: 'SCHNEIDER ELECTRIC', pais_origen: 'Francia', descripcion: 'Distribución eléctrica, arrancadores y protecciones' },
  // Climatización, Refrigeración y HVAC
  { nombre: 'TRANE', pais_origen: 'Estados Unidos', descripcion: 'Sistemas HVAC, chillers y unidades manejadoras' },
  { nombre: 'CARRIER', pais_origen: 'Estados Unidos', descripcion: 'Climatización industrial, chillers y refrigeración' },
  { nombre: 'YORK', pais_origen: 'Estados Unidos', descripcion: 'Chillers centrífugos, rooftop y climatización (JCI)' },
  { nombre: 'DAIKIN', pais_origen: 'Japón', descripcion: 'Sistemas VRF, chillers y bombas de calor' },
  // Transporte Vertical, Elevación y Carga
  { nombre: 'OTIS', pais_origen: 'Estados Unidos', descripcion: 'Ascensores de pasajeros, montacargas y escaleras mecánicas' },
  { nombre: 'SCHINDLER', pais_origen: 'Suiza', descripcion: 'Ascensores, escaleras mecánicas y pasillos rodantes' },
  { nombre: 'KONE', pais_origen: 'Finlandia', descripcion: 'Ascensores y puertas automáticas eco-eficientes' },
  { nombre: 'MITSUBISHI', pais_origen: 'Japón', descripcion: 'Ascensores de alta velocidad y tracción' },
  { nombre: 'THYSSENKRUPP', pais_origen: 'Alemania', descripcion: 'Sistemas de elevación y movilidad urbana (TK Elevator)' },
  // Aire Comprimido y Neumática
  { nombre: 'KAESER', pais_origen: 'Alemania', descripcion: 'Compresores de tornillo y tratamiento de aire' },
  { nombre: 'INGERSOLL RAND', pais_origen: 'Estados Unidos', descripcion: 'Compresores industriales y herramientas neumáticas' },
  { nombre: 'ATLAS COPCO', pais_origen: 'Suecia', descripcion: 'Compresores de aire, generadores de nitrógeno y vacío' },
  { nombre: 'SULLAIR', pais_origen: 'Estados Unidos', descripcion: 'Compresores de tornillo rotativo estacionarios y portátiles' },
];

@Injectable()
export class MarcasService implements OnModuleInit {
  private readonly logger = new Logger(MarcasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedMarcasEstandar();
    } catch (err: any) {
      this.logger.warn(`No se pudo sincronizar el banco maestro de marcas OEM en arranque: ${err?.message || err}`);
    }
  }

  /**
   * Sincronización idempotente del banco maestro de marcas industriales OEM y marcas existentes en modelos.
   */
  async seedMarcasEstandar() {
    const existentes = await this.prisma.marcas.findMany({
      select: { nombre: true, slug: true },
    });
    const nombresSet = new Set(existentes.map((e) => e.nombre.toUpperCase().trim()));
    const slugsSet = new Set(existentes.map((e) => e.slug.toLowerCase().trim()));

    let creadas = 0;

    // 1. Sembrar marcas estándar OEM
    for (const item of MARCAS_ESTANDAR_OEM) {
      const nombreNorm = item.nombre.toUpperCase().trim();
      if (!nombresSet.has(nombreNorm)) {
        let baseSlug = slugify(nombreNorm) || 'marca';
        let slugFinal = baseSlug;
        let count = 1;
        while (slugsSet.has(slugFinal)) {
          slugFinal = `${baseSlug}-${count++}`;
        }
        await this.prisma.marcas.create({
          data: {
            nombre: nombreNorm,
            slug: slugFinal,
            descripcion: item.descripcion || null,
            pais_origen: item.pais_origen || null,
            es_fabricante_oem: true,
            activo: true,
          },
        });
        nombresSet.add(nombreNorm);
        slugsSet.add(slugFinal);
        creadas++;
      }
    }

    // 2. Sembrar marcas adicionales que ya existan en modelos_equipo
    try {
      const distinctModelos = await this.prisma.modelos_equipo.findMany({
        select: { marca: true },
        distinct: ['marca'],
      });
      for (const m of distinctModelos) {
        if (!m.marca || !m.marca.trim()) continue;
        const nombreNorm = m.marca.toUpperCase().trim();
        if (!nombresSet.has(nombreNorm)) {
          let baseSlug = slugify(nombreNorm) || 'marca';
          let slugFinal = baseSlug;
          let count = 1;
          while (slugsSet.has(slugFinal)) {
            slugFinal = `${baseSlug}-${count++}`;
          }
          await this.prisma.marcas.create({
            data: {
              nombre: nombreNorm,
              slug: slugFinal,
              descripcion: 'Marca sincronizada automáticamente desde catálogo de modelos OEM',
              es_fabricante_oem: true,
              activo: true,
            },
          });
          nombresSet.add(nombreNorm);
          slugsSet.add(slugFinal);
          creadas++;
        }
      }
    } catch {
      // Ignorar si la tabla no está accesible
    }

    if (creadas > 0) {
      this.logger.log(`Catálogo Maestro de Marcas inicializado: ${creadas} nuevas marcas OEM sembradas.`);
    }
  }

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
      this.logger.log(`Marca ya existente detectada: '${existente.nombre}' (ID: ${existente.id_marca}). Retornando registro existente.`);
      return {
        id_marca: existente.id_marca,
        nombre: existente.nombre,
        slug: existente.slug,
        descripcion: existente.descripcion,
        pais_origen: existente.pais_origen,
        sitio_web: existente.sitio_web,
        logo_url: existente.logo_url,
        es_fabricante_oem: existente.es_fabricante_oem,
        activo: existente.activo,
        fecha_creacion: existente.fecha_creacion,
      };
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
