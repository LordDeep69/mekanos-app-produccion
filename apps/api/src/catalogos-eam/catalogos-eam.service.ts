/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Servicio Central de Catálogos EAM (CatalogosEamService)
 * 
 * Gobierna el metamodelo universal de 5 capas:
 * 1. Magnitudes físicas y conversión UoM
 * 2. Diccionario de atributos técnicos
 * 3. Módulos funcionales y asignación de atributos
 * 4. Arquetipos (tipos_equipo) y esquema dinámico para renderers
 * 5. Modelos OEM y kits BOM preconfigurados
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UomConversionService } from '../equipos/services/uom-conversion.service';
import {
  AsignarAtributoModuloDto,
  ConvertirUomDto,
  CreateArquetipoDto,
  CreateAtributoTecnicoDto,
  CreateBomItemDto,
  CreateMagnitudDto,
  CreateModeloEquipoDto,
  CreateModuloTecnicoDto,
  CreatePlanArquetipoDto,
  CreateUnidadMedidaDto,
  UpdateArquetipoDto,
  UpdateAtributoModuloDto,
  UpdateAtributoTecnicoDto,
  UpdateMagnitudDto,
  UpdateModeloEquipoDto,
  UpdateModuloTecnicoDto,
  UpdatePlanArquetipoDto,
  UpdateUnidadMedidaDto,
} from './dto/catalogos-eam.dto';

/**
 * Mapa de Pares Canónicos Históricos (Simetría Fase 3 -> Consolidación Física Fase 6)
 * Primario <- Alias Sincronizado:
 * - 1 (GENERADOR) <-> 3 (GEN)
 * - 2 (BOMBA)     <-> 5 (BOM)
 * - 6 (MOTOR)     <-> 4 (MOT)
 */
const PARES_CANONICOS: Record<number, { primarioId: number; aliasIds: number[]; nombreCanonico: string }> = {
  1: { primarioId: 1, aliasIds: [3], nombreCanonico: 'Generador Eléctrico / Planta de Emergencia' },
  3: { primarioId: 1, aliasIds: [3], nombreCanonico: 'Generador Eléctrico / Planta de Emergencia' },
  2: { primarioId: 2, aliasIds: [5], nombreCanonico: 'Bomba Hidráulica / Sistema de Bombeo' },
  5: { primarioId: 2, aliasIds: [5], nombreCanonico: 'Bomba Hidráulica / Sistema de Bombeo' },
  6: { primarioId: 6, aliasIds: [4], nombreCanonico: 'Motor Industrial (Combustión / Eléctrico)' },
  4: { primarioId: 6, aliasIds: [4], nombreCanonico: 'Motor Industrial (Combustión / Eléctrico)' },
};

const ALIAS_SECUNDARIOS_OCULTOS = new Set<number>([3, 5, 4]);

@Injectable()
export class CatalogosEamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uomService: UomConversionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 0. RESUMEN EJECUTIVO DEL ECOSISTEMA EAM (KPIs)
  // ═══════════════════════════════════════════════════════════════════════════

  async getResumenEjecutivo() {
    const [
      totalMagnitudes,
      totalUnidades,
      totalAtributos,
      totalModulos,
      arquetipos,
      totalModelosOem,
      totalEquiposActivos,
      tiposServicioPreventivos,
    ] = await Promise.all([
      this.prisma.catalogo_magnitudes.count({ where: { activo: true } }),
      this.prisma.unidades_medida.count({ where: { activo: true } }),
      this.prisma.atributos_tecnicos.count({ where: { activo: true } }),
      this.prisma.modulos_tecnicos.count({ where: { activo: true } }),
      this.getArquetipos(),
      this.prisma.modelos_equipo.count({ where: { activo: true } }),
      this.prisma.equipos.count({ where: { activo: true } }),
      this.prisma.tipos_servicio.findMany({
        where: {
          activo: true,
          categoria: { in: ['PREVENTIVO', 'DIAGNOSTICO'] },
          NOT: { codigo_tipo: { contains: 'TEST', mode: 'insensitive' } },
        },
        select: {
          id_tipo_servicio: true,
          codigo_tipo: true,
          nombre_tipo: true,
          categoria: true,
        },
        orderBy: { id_tipo_servicio: 'asc' },
      }),
    ]);

    return {
      magnitudes: totalMagnitudes,
      unidades: totalUnidades,
      atributos: totalAtributos,
      modulos: totalModulos,
      arquetipos: arquetipos.length,
      modelos_oem: totalModelosOem,
      equipos_activos: totalEquiposActivos,
      tipos_servicio_preventivos: tiposServicioPreventivos,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MAGNITUDES FÍSICAS Y UoM
  // ═══════════════════════════════════════════════════════════════════════════

  async getMagnitudes() {
    return this.prisma.catalogo_magnitudes.findMany({
      where: { activo: true },
      include: {
        unidades_medida: {
          where: { activo: true },
          orderBy: { es_unidad_base: 'desc' },
        },
      },
      orderBy: { nombre_magnitud: 'asc' },
    });
  }

  async getMagnitud(codigo: string) {
    const mag = await this.prisma.catalogo_magnitudes.findUnique({
      where: { codigo_magnitud: codigo.toUpperCase() },
      include: {
        unidades_medida: {
          where: { activo: true },
          orderBy: { es_unidad_base: 'desc' },
        },
      },
    });

    if (!mag) {
      throw new NotFoundException(`No se encontró la magnitud física ${codigo}`);
    }
    return mag;
  }

  async createMagnitud(dto: CreateMagnitudDto) {
    const codigo = dto.codigo_magnitud.trim().toUpperCase();
    const existe = await this.prisma.catalogo_magnitudes.findUnique({
      where: { codigo_magnitud: codigo },
    });
    if (existe) {
      throw new ConflictException(`Ya existe la magnitud física con código ${codigo}`);
    }

    return this.prisma.catalogo_magnitudes.create({
      data: {
        codigo_magnitud: codigo,
        nombre_magnitud: dto.nombre_magnitud.trim(),
        descripcion: dto.descripcion?.trim() || null,
        unidad_base_codigo: dto.unidad_base_codigo?.trim().toUpperCase() || null,
        es_sistema: dto.es_sistema ?? false,
        activo: true,
      },
    });
  }

  async updateMagnitud(codigo: string, dto: UpdateMagnitudDto) {
    const mag = await this.prisma.catalogo_magnitudes.findUnique({
      where: { codigo_magnitud: codigo.toUpperCase() },
    });
    if (!mag) {
      throw new NotFoundException(`No se encontró la magnitud física ${codigo}`);
    }

    const data: Prisma.catalogo_magnitudesUpdateInput = {};
    if (dto.nombre_magnitud !== undefined) data.nombre_magnitud = dto.nombre_magnitud.trim();
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.unidad_base_codigo !== undefined) {
      data.unidad_base_codigo = dto.unidad_base_codigo?.trim().toUpperCase() || null;
    }
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.catalogo_magnitudes.update({
      where: { codigo_magnitud: codigo.toUpperCase() },
      data,
    });
  }

  async getUnidades(codigoMagnitud?: string) {
    const where: Prisma.unidades_medidaWhereInput = { activo: true };
    if (codigoMagnitud) {
      where.magnitud = {
        codigo_magnitud: codigoMagnitud.toUpperCase(),
      };
    }

    return this.prisma.unidades_medida.findMany({
      where,
      include: {
        magnitud: true,
      },
      orderBy: [
        { es_unidad_base: 'desc' },
        { nombre: 'asc' },
      ],
    });
  }

  async getUnidad(codigo: string) {
    const unidad = await this.prisma.unidades_medida.findUnique({
      where: { codigo: codigo.toUpperCase() },
      include: { magnitud: true },
    });

    if (!unidad) {
      throw new NotFoundException(`No se encontró la unidad de medida ${codigo}`);
    }
    return unidad;
  }

  async createUnidad(dto: CreateUnidadMedidaDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    const existe = await this.prisma.unidades_medida.findUnique({
      where: { codigo },
    });
    if (existe) {
      throw new ConflictException(`Ya existe la unidad de medida con código ${codigo}`);
    }

    let idMagnitud = dto.id_magnitud;
    let tipoMagnitud = dto.tipo_magnitud?.trim().toUpperCase() || 'CANTIDAD';

    if (!idMagnitud && dto.codigo_magnitud) {
      const mag = await this.prisma.catalogo_magnitudes.findUnique({
        where: { codigo_magnitud: dto.codigo_magnitud.toUpperCase() },
      });
      if (mag) {
        idMagnitud = mag.id_magnitud;
        tipoMagnitud = mag.codigo_magnitud.slice(0, 20);
      }
    } else if (idMagnitud) {
      const mag = await this.prisma.catalogo_magnitudes.findUnique({
        where: { id_magnitud: idMagnitud },
      });
      if (mag) {
        tipoMagnitud = mag.codigo_magnitud.slice(0, 20);
      }
    }

    return this.prisma.unidades_medida.create({
      data: {
        codigo,
        nombre: dto.nombre.trim(),
        simbolo: dto.simbolo.trim(),
        tipo_magnitud: tipoMagnitud,
        id_magnitud: idMagnitud || null,
        factor_a: new Prisma.Decimal(dto.factor_a ?? 1.0),
        factor_b: new Prisma.Decimal(dto.factor_b ?? 0.0),
        es_unidad_base: dto.es_unidad_base ?? false,
        permite_decimales: dto.permite_decimales ?? true,
        activo: true,
      },
      include: { magnitud: true },
    });
  }

  async updateUnidad(codigo: string, dto: UpdateUnidadMedidaDto) {
    const unidad = await this.prisma.unidades_medida.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });
    if (!unidad) {
      throw new NotFoundException(`No se encontró la unidad de medida ${codigo}`);
    }

    const data: Prisma.unidades_medidaUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.simbolo !== undefined) data.simbolo = dto.simbolo.trim();
    if (dto.id_magnitud !== undefined) {
      data.magnitud = dto.id_magnitud
        ? { connect: { id_magnitud: dto.id_magnitud } }
        : { disconnect: true };
    }
    if (dto.factor_a !== undefined) data.factor_a = new Prisma.Decimal(dto.factor_a);
    if (dto.factor_b !== undefined) data.factor_b = new Prisma.Decimal(dto.factor_b);
    if (dto.es_unidad_base !== undefined) data.es_unidad_base = dto.es_unidad_base;
    if (dto.permite_decimales !== undefined) data.permite_decimales = dto.permite_decimales;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.unidades_medida.update({
      where: { codigo: codigo.toUpperCase() },
      data,
      include: { magnitud: true },
    });
  }

  convertirUom(dto: ConvertirUomDto) {
    try {
      const valorDestino = this.uomService.convertir(dto.valor, dto.unidadOrigen, dto.unidadDestino);
      return {
        valorOriginal: dto.valor,
        unidadOrigen: dto.unidadOrigen,
        valorDestino,
        unidadDestino: dto.unidadDestino,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Error en conversión UoM');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DICCIONARIO DE ATRIBUTOS TÉCNICOS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAtributos(params?: { search?: string; codigoMagnitud?: string; tipoControl?: string }) {
    const where: Prisma.atributos_tecnicosWhereInput = { activo: true };

    if (params?.codigoMagnitud) {
      where.magnitud = {
        codigo_magnitud: params.codigoMagnitud.toUpperCase(),
      };
    }
    if (params?.tipoControl) {
      where.tipo_control = params.tipoControl;
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { codigo_atributo: { contains: q, mode: 'insensitive' } },
        { nombre_atributo: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.atributos_tecnicos.findMany({
      where,
      include: {
        magnitud: true,
        unidad_defecto: true,
        _count: {
          select: { modulo_atributos: true },
        },
      },
      orderBy: { nombre_atributo: 'asc' },
    });
  }

  async getAtributo(codigo: string) {
    const attr = await this.prisma.atributos_tecnicos.findUnique({
      where: { codigo_atributo: codigo.toLowerCase() },
      include: {
        magnitud: true,
        unidad_defecto: true,
        modulo_atributos: {
          include: {
            modulo: true,
          },
        },
      },
    });

    if (!attr) {
      throw new NotFoundException(`No se encontró el atributo técnico ${codigo}`);
    }
    return attr;
  }

  async createAtributo(dto: CreateAtributoTecnicoDto) {
    const codigo = dto.codigo_atributo.trim().toLowerCase();

    const existe = await this.prisma.atributos_tecnicos.findUnique({
      where: { codigo_atributo: codigo },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un atributo con el código ${codigo}`);
    }

    // Resolver id_magnitud si se envió codigo_magnitud
    let idMagnitud = dto.id_magnitud;
    if (!idMagnitud && dto.codigo_magnitud) {
      const mag = await this.prisma.catalogo_magnitudes.findUnique({
        where: { codigo_magnitud: dto.codigo_magnitud.toUpperCase() },
      });
      if (mag) idMagnitud = mag.id_magnitud;
    }

    return this.prisma.atributos_tecnicos.create({
      data: {
        codigo_atributo: codigo,
        nombre_atributo: dto.nombre_atributo.trim(),
        descripcion: dto.descripcion?.trim() || null,
        tipo_control: dto.tipo_control.trim().toUpperCase(),
        id_magnitud: idMagnitud || null,
        unidad_defecto_codigo: dto.unidad_defecto_codigo?.trim().toUpperCase() || null,
        rol_semantico: dto.rol_semantico?.trim().toUpperCase() || 'ESTANDAR',
        opciones_json: dto.opciones_json ? (dto.opciones_json as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        validacion_json: dto.validacion_json ? (dto.validacion_json as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        es_sistema: dto.es_sistema ?? false,
      },
    });
  }

  async updateAtributo(codigo: string, dto: UpdateAtributoTecnicoDto) {
    const attr = await this.prisma.atributos_tecnicos.findUnique({
      where: { codigo_atributo: codigo.toLowerCase() },
    });

    if (!attr) {
      throw new NotFoundException(`No se encontró el atributo técnico ${codigo}`);
    }

    const data: Prisma.atributos_tecnicosUpdateInput = {};
    if (dto.nombre_atributo !== undefined) data.nombre_atributo = dto.nombre_atributo.trim();
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.tipo_control !== undefined) data.tipo_control = dto.tipo_control.trim().toUpperCase();
    if (dto.id_magnitud !== undefined) {
      data.magnitud = dto.id_magnitud ? { connect: { id_magnitud: dto.id_magnitud } } : { disconnect: true };
    }
    if (dto.unidad_defecto_codigo !== undefined) {
      data.unidad_defecto = dto.unidad_defecto_codigo ? { connect: { codigo: dto.unidad_defecto_codigo.toUpperCase() } } : { disconnect: true };
    }
    if (dto.rol_semantico !== undefined) data.rol_semantico = dto.rol_semantico.trim().toUpperCase();
    if (dto.opciones_json !== undefined) data.opciones_json = dto.opciones_json as unknown as Prisma.InputJsonValue;
    if (dto.validacion_json !== undefined) data.validacion_json = dto.validacion_json as unknown as Prisma.InputJsonValue;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.atributos_tecnicos.update({
      where: { codigo_atributo: codigo.toLowerCase() },
      data,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MÓDULOS TÉCNICOS FUNCIONALES
  // ═══════════════════════════════════════════════════════════════════════════

  async getModulos() {
    return this.prisma.modulos_tecnicos.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            modulo_atributos: true,
            tipo_equipo_modulos: true,
          },
        },
      },
      orderBy: { id_modulo: 'asc' },
    });
  }

  async getModulo(codigo: string) {
    const mod = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: codigo.toLowerCase() },
      include: {
        modulo_atributos: {
          include: {
            atributo: {
              include: {
                magnitud: true,
                unidad_defecto: true,
              },
            },
          },
          orderBy: [
            { grupo_visual: 'asc' },
            { orden_visual: 'asc' },
          ],
        },
        tipo_equipo_modulos: {
          include: {
            tipo_equipo: true,
          },
        },
      },
    });

    if (!mod) {
      throw new NotFoundException(`No se encontró el módulo técnico ${codigo}`);
    }
    return mod;
  }

  async createModulo(dto: CreateModuloTecnicoDto) {
    const codigo = dto.codigo_modulo.trim().toLowerCase();

    const existe = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: codigo },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un módulo con el código ${codigo}`);
    }

    return this.prisma.modulos_tecnicos.create({
      data: {
        codigo_modulo: codigo,
        nombre_modulo: dto.nombre_modulo.trim(),
        descripcion: dto.descripcion?.trim() || null,
        icono: dto.icono?.trim() || 'settings',
        color_ui: dto.color_ui?.trim() || '#3B82F6',
      },
    });
  }

  async asignarAtributo(codigoModulo: string, dto: AsignarAtributoModuloDto) {
    const mod = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: codigoModulo.toLowerCase() },
    });
    if (!mod) {
      throw new NotFoundException(`No se encontró el módulo ${codigoModulo}`);
    }

    const attr = await this.prisma.atributos_tecnicos.findUnique({
      where: { id_atributo: dto.id_atributo },
    });
    if (!attr) {
      throw new NotFoundException(`No se encontró el atributo con ID ${dto.id_atributo}`);
    }

    return this.prisma.modulo_atributos.upsert({
      where: {
        id_modulo_id_atributo: {
          id_modulo: mod.id_modulo,
          id_atributo: dto.id_atributo,
        },
      },
      create: {
        id_modulo: mod.id_modulo,
        id_atributo: dto.id_atributo,
        grupo_visual: dto.grupo_visual || 'General',
        orden_visual: dto.orden_visual ?? 1,
        obligatorio: dto.obligatorio ?? false,
        es_kpi: dto.es_kpi ?? false,
        es_filtrable: dto.es_filtrable ?? true,
        visible_en_pdf: dto.visible_en_pdf ?? true,
        valor_defecto: dto.valor_defecto || null,
      },
      update: {
        grupo_visual: dto.grupo_visual || 'General',
        orden_visual: dto.orden_visual ?? 1,
        obligatorio: dto.obligatorio ?? false,
        es_kpi: dto.es_kpi ?? false,
        es_filtrable: dto.es_filtrable ?? true,
        visible_en_pdf: dto.visible_en_pdf ?? true,
        valor_defecto: dto.valor_defecto || null,
      },
    });
  }

  async updateModulo(codigo: string, dto: UpdateModuloTecnicoDto) {
    const mod = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: codigo.toLowerCase() },
    });
    if (!mod) {
      throw new NotFoundException(`No se encontró el módulo técnico ${codigo}`);
    }

    const data: Prisma.modulos_tecnicosUpdateInput = {
      fecha_modificacion: new Date(),
    };
    if (dto.nombre_modulo !== undefined) data.nombre_modulo = dto.nombre_modulo.trim();
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.icono !== undefined) data.icono = dto.icono?.trim() || 'settings';
    if (dto.color_ui !== undefined) data.color_ui = dto.color_ui?.trim() || '#3B82F6';
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.modulos_tecnicos.update({
      where: { codigo_modulo: codigo.toLowerCase() },
      data,
    });
  }

  async updateAtributoModulo(
    codigoModulo: string,
    idAtributo: number,
    dto: UpdateAtributoModuloDto,
  ) {
    const mod = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: codigoModulo.toLowerCase() },
    });
    if (!mod) {
      throw new NotFoundException(`No se encontró el módulo ${codigoModulo}`);
    }

    const vinculo = await this.prisma.modulo_atributos.findUnique({
      where: {
        id_modulo_id_atributo: {
          id_modulo: mod.id_modulo,
          id_atributo: idAtributo,
        },
      },
    });
    if (!vinculo) {
      throw new NotFoundException(
        `El atributo #${idAtributo} no está asignado al módulo ${codigoModulo}`,
      );
    }

    const data: Prisma.modulo_atributosUpdateInput = {};
    if (dto.grupo_visual !== undefined) data.grupo_visual = dto.grupo_visual.trim();
    if (dto.orden_visual !== undefined) data.orden_visual = dto.orden_visual;
    if (dto.obligatorio !== undefined) data.obligatorio = dto.obligatorio;
    if (dto.es_kpi !== undefined) data.es_kpi = dto.es_kpi;
    if (dto.es_filtrable !== undefined) data.es_filtrable = dto.es_filtrable;
    if (dto.visible_en_pdf !== undefined) data.visible_en_pdf = dto.visible_en_pdf;
    if (dto.rol_semantico_override !== undefined) {
      data.rol_semantico_override = dto.rol_semantico_override?.trim() || null;
    }
    if (dto.valor_defecto !== undefined) data.valor_defecto = dto.valor_defecto || null;

    return this.prisma.modulo_atributos.update({
      where: {
        id_modulo_id_atributo: {
          id_modulo: mod.id_modulo,
          id_atributo: idAtributo,
        },
      },
      data,
      include: {
        atributo: {
          include: {
            magnitud: true,
            unidad_defecto: true,
          },
        },
      },
    });
  }

  async desasignarAtributo(codigoModulo: string, idAtributo: number) {
    const mod = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: codigoModulo.toLowerCase() },
    });
    if (!mod) {
      throw new NotFoundException(`No se encontró el módulo ${codigoModulo}`);
    }

    return this.prisma.modulo_atributos.deleteMany({
      where: {
        id_modulo: mod.id_modulo,
        id_atributo: idAtributo,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ARQUETIPOS (TIPOS DE EQUIPO) Y ESQUEMA DINÁMICO
  // ═══════════════════════════════════════════════════════════════════════════

  private getIdsSincronizados(idTipoEquipo: number): number[] {
    const par = PARES_CANONICOS[idTipoEquipo];
    if (!par) return [idTipoEquipo];
    return [par.primarioId, ...par.aliasIds];
  }

  async getArquetipos() {
    const todos = await this.prisma.tipos_equipo.findMany({
      where: {
        activo: true,
        NOT: {
          codigo_tipo: { contains: 'TEST', mode: 'insensitive' },
        },
      },
      include: {
        tipo_equipo_modulos: {
          include: {
            modulo: {
              include: {
                _count: {
                  select: { modulo_atributos: true },
                },
              },
            },
          },
          orderBy: { orden_visual: 'asc' },
        },
        tipo_equipo_planes: {
          where: { activo: true },
          include: {
            tipo_servicio: true,
          },
        },
        _count: {
          select: {
            equipos: true,
            modelos_equipo: true,
          },
        },
      },
      orderBy: { orden: 'asc' },
    });

    // Contar equipos activos reales por id_tipo_equipo
    let conteoActivosRaw: Array<{ id_tipo_equipo: number; _count: { id_equipo: number } }> = [];
    if (typeof (this.prisma.equipos as any)?.groupBy === 'function') {
      conteoActivosRaw = (await this.prisma.equipos.groupBy({
        by: ['id_tipo_equipo'],
        where: { activo: true },
        _count: { id_equipo: true },
      })) as any;
    }
    const mapaActivos = new Map<number, number>();
    for (const row of conteoActivosRaw) {
      mapaActivos.set(row.id_tipo_equipo, row._count.id_equipo);
    }

    const mapPorId = new Map<number, (typeof todos)[0]>();
    for (const t of todos) {
      mapPorId.set(t.id_tipo_equipo, t);
    }

    // Deduplicar pares canónicos sumando sus conteos de equipos y modelos OEM
    const resultado: any[] = [];
    for (const t of todos) {
      if (ALIAS_SECUNDARIOS_OCULTOS.has(t.id_tipo_equipo)) {
        continue;
      }

      const par = PARES_CANONICOS[t.id_tipo_equipo];
      if (par) {
        const idsGrupo = [par.primarioId, ...par.aliasIds];
        let totalEquipos = 0;
        let totalEquiposActivos = 0;
        let totalModelos = 0;
        const codigosSincronizados: string[] = [];

        for (const idG of idsGrupo) {
          const itemG = mapPorId.get(idG);
          if (itemG) {
            totalEquipos += itemG._count?.equipos || 0;
            totalEquiposActivos += mapaActivos.has(idG)
              ? (mapaActivos.get(idG) || 0)
              : (itemG._count?.equipos || 0);
            totalModelos += itemG._count?.modelos_equipo || 0;
            codigosSincronizados.push(itemG.codigo_tipo);
          }
        }

        resultado.push({
          ...t,
          nombre_canonico: par.nombreCanonico,
          ids_sincronizados: idsGrupo,
          codigos_sincronizados: codigosSincronizados,
          equipos_activos: totalEquiposActivos,
          _count: {
            equipos: totalEquipos,
            modelos_equipo: totalModelos,
          },
        });
      } else {
        const activos = mapaActivos.has(t.id_tipo_equipo)
          ? (mapaActivos.get(t.id_tipo_equipo) || 0)
          : (t._count?.equipos || 0);
        resultado.push({
          ...t,
          nombre_canonico: t.nombre_tipo,
          ids_sincronizados: [t.id_tipo_equipo],
          codigos_sincronizados: [t.codigo_tipo],
          equipos_activos: activos,
        });
      }
    }

    return resultado;
  }

  async createArquetipo(dto: CreateArquetipoDto) {
    const codigo = dto.codigo_tipo.trim().toUpperCase();
    const existe = await this.prisma.tipos_equipo.findFirst({
      where: { codigo_tipo: codigo },
    });
    if (existe) {
      throw new ConflictException(`Ya existe un arquetipo con el código ${codigo}`);
    }

    return this.prisma.tipos_equipo.create({
      data: {
        codigo_tipo: codigo,
        nombre_tipo: dto.nombre_tipo.trim(),
        categoria: (dto.categoria?.trim().toUpperCase() || 'OTRO') as any,
        descripcion: dto.descripcion?.trim() || null,
        requiere_horometro: dto.requiere_horometro ?? true,
        formato_ficha_tecnica: 'FICHA_UNIVERSAL_EAM',
        icono_ui: dto.icono?.trim() || 'cpu',
        color_hex: dto.color?.trim() || '#3B82F6',
        orden: dto.orden ?? 10,
        usa_plantilla_universal: true,
        activo: true,
      },
    });
  }

  async updateArquetipo(idTipoEquipo: number, dto: UpdateArquetipoDto) {
    const tipo = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: idTipoEquipo },
    });
    if (!tipo) {
      throw new NotFoundException(`No se encontró el arquetipo con ID ${idTipoEquipo}`);
    }

    const data: Prisma.tipos_equipoUpdateInput = {};
    if (dto.nombre_tipo !== undefined) data.nombre_tipo = dto.nombre_tipo.trim();
    if (dto.categoria !== undefined) data.categoria = dto.categoria.trim().toUpperCase() as any;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.requiere_horometro !== undefined) data.requiere_horometro = dto.requiere_horometro;
    if (dto.icono !== undefined) data.icono_ui = dto.icono?.trim();
    if (dto.color !== undefined) data.color_hex = dto.color?.trim();
    if (dto.orden !== undefined) data.orden = dto.orden;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.tipos_equipo.update({
      where: { id_tipo_equipo: idTipoEquipo },
      data,
    });
  }

  /**
   * Genera el contrato JSON de esquema para renderizado dinámico en frontend y app móvil
   */
  async getArquetipoEsquema(idTipoEquipo: number) {
    const tipo = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: idTipoEquipo },
      include: {
        tipo_equipo_modulos: {
          include: {
            modulo: {
              include: {
                modulo_atributos: {
                  include: {
                    atributo: {
                      include: {
                        magnitud: {
                          include: {
                            unidades_medida: {
                              where: { activo: true },
                              orderBy: { es_unidad_base: 'desc' },
                            },
                          },
                        },
                        unidad_defecto: true,
                      },
                    },
                  },
                  orderBy: [
                    { grupo_visual: 'asc' },
                    { orden_visual: 'asc' },
                  ],
                },
              },
            },
          },
          orderBy: { orden_visual: 'asc' },
        },
        tipo_equipo_planes: {
          include: {
            tipo_servicio: true,
          },
        },
      },
    });

    if (!tipo) {
      throw new NotFoundException(`No se encontró el arquetipo con ID ${idTipoEquipo}`);
    }

    // Estructurar árbol para renderizado de componentes UI
    const modulosEstructurados = tipo.tipo_equipo_modulos.map((tem) => {
      const m = tem.modulo;
      const gruposMap = new Map<string, any[]>();

      for (const ma of m.modulo_atributos) {
        const grp = ma.grupo_visual || 'General';
        if (!gruposMap.has(grp)) {
          gruposMap.set(grp, []);
        }

        const attr = ma.atributo;
        gruposMap.get(grp)!.push({
          id_atributo: attr.id_atributo,
          codigo_atributo: attr.codigo_atributo,
          nombre_atributo: attr.nombre_atributo,
          descripcion: attr.descripcion,
          tipo_control: attr.tipo_control,
          rol_semantico: attr.rol_semantico,
          obligatorio: ma.obligatorio,
          es_kpi: ma.es_kpi,
          es_filtrable: ma.es_filtrable,
          visible_en_pdf: ma.visible_en_pdf,
          orden_visual: ma.orden_visual,
          valor_defecto: ma.valor_defecto,
          magnitud: attr.magnitud?.codigo_magnitud || null,
          unidad_defecto: attr.unidad_defecto_codigo || null,
          unidades_disponibles: attr.magnitud?.unidades_medida?.map((u) => ({
            codigo: u.codigo,
            nombre: u.nombre,
            simbolo: u.simbolo,
            es_base: u.es_unidad_base,
          })) || [],
          opciones: attr.opciones_json || [],
        });
      }

      const grupos = Array.from(gruposMap.entries()).map(([nombre, atributos]) => ({
        nombre,
        atributos,
      }));

      return {
        id_modulo: m.id_modulo,
        codigo_modulo: m.codigo_modulo,
        nombre_modulo: m.nombre_modulo,
        descripcion: m.descripcion,
        icono: m.icono,
        color_ui: m.color_ui,
        obligatorio: tem.obligatorio,
        orden_visual: tem.orden_visual,
        etiqueta_local: tem.etiqueta_local,
        grupos,
      };
    });

    return {
      arquetipo: {
        id_tipo_equipo: tipo.id_tipo_equipo,
        codigo_tipo: tipo.codigo_tipo,
        nombre_tipo: tipo.nombre_tipo,
        categoria: tipo.categoria,
        requiere_horometro: tipo.requiere_horometro,
      },
      modulos: modulosEstructurados,
      planes_mantenimiento: tipo.tipo_equipo_planes.map((p) => ({
        id_plan: p.id_plan,
        id_tipo_servicio: p.id_tipo_servicio,
        nombre_servicio: p.tipo_servicio?.nombre_tipo,
        nombre_plan: p.nombre_plan,
        frecuencia_dias: p.frecuencia_dias,
        frecuencia_uso: p.frecuencia_uso ? Number(p.frecuencia_uso) : null,
        criterio_intervalo: p.criterio_intervalo,
      })),
    };
  }

  async vincularModuloArquetipo(idTipoEquipo: number, idModulo: number, obligatorio = true) {
    const idsSincronizados = this.getIdsSincronizados(idTipoEquipo);
    let resultadoPrimario: any = null;

    for (const idTarget of idsSincronizados) {
      const res = await this.prisma.tipo_equipo_modulos.upsert({
        where: {
          id_tipo_equipo_id_modulo: {
            id_tipo_equipo: idTarget,
            id_modulo: idModulo,
          },
        },
        create: {
          id_tipo_equipo: idTarget,
          id_modulo: idModulo,
          obligatorio,
          orden_visual: 1,
        },
        update: {
          obligatorio,
        },
      });
      if (idTarget === idTipoEquipo) {
        resultadoPrimario = res;
      }
    }

    return resultadoPrimario;
  }

  async desvincularModuloArquetipo(idTipoEquipo: number, idModulo: number) {
    const idsSincronizados = this.getIdsSincronizados(idTipoEquipo);
    return this.prisma.tipo_equipo_modulos.deleteMany({
      where: {
        id_tipo_equipo: { in: idsSincronizados },
        id_modulo: idModulo,
      },
    });
  }

  async createPlanArquetipo(idTipoEquipo: number, dto: CreatePlanArquetipoDto) {
    const idsSincronizados = this.getIdsSincronizados(idTipoEquipo);
    let resultadoPrimario: any = null;

    for (const idTarget of idsSincronizados) {
      const res = await this.prisma.tipo_equipo_planes.upsert({
        where: {
          id_tipo_equipo_id_tipo_servicio: {
            id_tipo_equipo: idTarget,
            id_tipo_servicio: dto.id_tipo_servicio,
          },
        },
        create: {
          id_tipo_equipo: idTarget,
          id_tipo_servicio: dto.id_tipo_servicio,
          nombre_plan: dto.nombre_plan.trim(),
          frecuencia_dias: dto.frecuencia_dias ?? 90,
          frecuencia_uso: dto.frecuencia_uso !== undefined ? new Prisma.Decimal(dto.frecuencia_uso) : new Prisma.Decimal(250),
          criterio_intervalo: dto.criterio_intervalo?.trim().toUpperCase() || 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: dto.es_plan_por_defecto ?? true,
          activo: true,
        },
        update: {
          nombre_plan: dto.nombre_plan.trim(),
          frecuencia_dias: dto.frecuencia_dias ?? 90,
          frecuencia_uso: dto.frecuencia_uso !== undefined ? new Prisma.Decimal(dto.frecuencia_uso) : new Prisma.Decimal(250),
          criterio_intervalo: dto.criterio_intervalo?.trim().toUpperCase() || 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: dto.es_plan_por_defecto ?? true,
          activo: true,
        },
        include: {
          tipo_servicio: true,
        },
      });
      if (idTarget === idTipoEquipo) {
        resultadoPrimario = res;
      }
    }

    return resultadoPrimario;
  }

  async updatePlanArquetipo(idTipoEquipo: number, idPlan: number, dto: UpdatePlanArquetipoDto) {
    const plan = await this.prisma.tipo_equipo_planes.findUnique({
      where: { id_plan: idPlan },
    });
    if (!plan) {
      throw new NotFoundException(`No se encontró el plan preventivo #${idPlan}`);
    }

    const idsSincronizados = this.getIdsSincronizados(idTipoEquipo);
    const data: Prisma.tipo_equipo_planesUpdateManyMutationInput = {};
    if (dto.nombre_plan !== undefined) data.nombre_plan = dto.nombre_plan.trim();
    if (dto.frecuencia_dias !== undefined) data.frecuencia_dias = dto.frecuencia_dias;
    if (dto.frecuencia_uso !== undefined) {
      data.frecuencia_uso = dto.frecuencia_uso !== null ? new Prisma.Decimal(dto.frecuencia_uso) : null;
    }
    if (dto.criterio_intervalo !== undefined) {
      data.criterio_intervalo = dto.criterio_intervalo.trim().toUpperCase();
    }
    if (dto.es_plan_por_defecto !== undefined) data.es_plan_por_defecto = dto.es_plan_por_defecto;
    if (dto.activo !== undefined) data.activo = dto.activo;

    await this.prisma.tipo_equipo_planes.updateMany({
      where: {
        id_tipo_equipo: { in: idsSincronizados },
        id_tipo_servicio: plan.id_tipo_servicio,
      },
      data,
    });

    return this.prisma.tipo_equipo_planes.findUnique({
      where: { id_plan: idPlan },
      include: { tipo_servicio: true },
    });
  }

  async deletePlanArquetipo(idTipoEquipo: number, idPlan: number) {
    const plan = await this.prisma.tipo_equipo_planes.findUnique({
      where: { id_plan: idPlan },
    });
    if (!plan) {
      throw new NotFoundException(`No se encontró el plan preventivo #${idPlan}`);
    }

    const idsSincronizados = this.getIdsSincronizados(idTipoEquipo);
    return this.prisma.tipo_equipo_planes.deleteMany({
      where: {
        id_tipo_equipo: { in: idsSincronizados },
        id_tipo_servicio: plan.id_tipo_servicio,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MODELOS DE EQUIPO OEM Y KITS BOM
  // ═══════════════════════════════════════════════════════════════════════════

  async getModelos(idTipoEquipo?: number) {
    const where: Prisma.modelos_equipoWhereInput = { activo: true };
    if (idTipoEquipo) {
      where.id_tipo_equipo = idTipoEquipo;
    }

    return this.prisma.modelos_equipo.findMany({
      where,
      include: {
        tipo_equipo: true,
        _count: {
          select: {
            modelos_equipo_bom: true,
          },
        },
      },
      orderBy: [
        { marca: 'asc' },
        { modelo: 'asc' },
      ],
    });
  }

  async getModelo(id: number) {
    const mod = await this.prisma.modelos_equipo.findUnique({
      where: { id_modelo_equipo: id },
      include: {
        tipo_equipo: true,
        modelos_equipo_bom: {
          include: {
            catalogo_componentes: true,
          },
          orderBy: { rol_bom: 'asc' },
        },
      },
    });

    if (!mod) {
      throw new NotFoundException(`No se encontró el modelo de equipo ${id}`);
    }
    return mod;
  }

  async createModelo(dto: CreateModeloEquipoDto) {
    const codigo = dto.codigo_modelo.trim().toUpperCase();

    const existe = await this.prisma.modelos_equipo.findUnique({
      where: { codigo_modelo: codigo },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un modelo con el código ${codigo}`);
    }

    return this.prisma.modelos_equipo.create({
      data: {
        codigo_modelo: codigo,
        marca: dto.marca.trim().toUpperCase(),
        modelo: dto.modelo.trim().toUpperCase(),
        id_tipo_equipo: dto.id_tipo_equipo,
        nombre_comercial: dto.nombre_comercial?.trim() || null,
        especificaciones_base: (dto.especificaciones_base || {}) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updateModelo(id: number, dto: UpdateModeloEquipoDto) {
    const mod = await this.prisma.modelos_equipo.findUnique({
      where: { id_modelo_equipo: id },
    });
    if (!mod) {
      throw new NotFoundException(`No se encontró el modelo de equipo ${id}`);
    }

    const data: Prisma.modelos_equipoUpdateInput = {
      fecha_modificacion: new Date(),
    };
    if (dto.marca !== undefined) data.marca = dto.marca.trim().toUpperCase();
    if (dto.modelo !== undefined) data.modelo = dto.modelo.trim().toUpperCase();
    if (dto.id_tipo_equipo !== undefined) {
      data.tipo_equipo = { connect: { id_tipo_equipo: dto.id_tipo_equipo } };
    }
    if (dto.nombre_comercial !== undefined) data.nombre_comercial = dto.nombre_comercial?.trim() || null;
    if (dto.especificaciones_base !== undefined) {
      data.especificaciones_base = dto.especificaciones_base as unknown as Prisma.InputJsonValue;
    }
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.modelos_equipo.update({
      where: { id_modelo_equipo: id },
      data,
      include: {
        tipo_equipo: true,
        _count: { select: { modelos_equipo_bom: true } },
      },
    });
  }

  async deleteModelo(id: number) {
    const mod = await this.prisma.modelos_equipo.findUnique({
      where: { id_modelo_equipo: id },
    });
    if (!mod) {
      throw new NotFoundException(`No se encontró el modelo de equipo ${id}`);
    }

    return this.prisma.modelos_equipo.update({
      where: { id_modelo_equipo: id },
      data: { activo: false, fecha_modificacion: new Date() },
    });
  }

  async buscarComponentesWms(search?: string) {
    const where: Prisma.catalogo_componentesWhereInput = { activo: true };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { codigo_interno: { contains: q, mode: 'insensitive' } },
        { referencia_fabricante: { contains: q, mode: 'insensitive' } },
        { descripcion_corta: { contains: q, mode: 'insensitive' } },
        { marca: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.catalogo_componentes.findMany({
      where,
      take: 30,
      select: {
        id_componente: true,
        codigo_interno: true,
        referencia_fabricante: true,
        marca: true,
        descripcion_corta: true,
        unidad_medida: true,
        codigo_unidad_medida: true,
        stock_actual: true,
      },
      orderBy: { descripcion_corta: 'asc' },
    });
  }

  async agregarItemBom(idModelo: number, dto: CreateBomItemDto) {
    const modelo = await this.prisma.modelos_equipo.findUnique({
      where: { id_modelo_equipo: idModelo },
    });
    if (!modelo) {
      throw new NotFoundException(`No se encontró el modelo de equipo ${idModelo}`);
    }

    return this.prisma.modelos_equipo_bom.create({
      data: {
        id_modelo_equipo: idModelo,
        id_componente: dto.id_componente,
        cantidad_sugerida: new Prisma.Decimal(dto.cantidad_sugerida),
        rol_bom: dto.rol_bom?.trim().toUpperCase() || 'TITULAR',
        notas: dto.notas?.trim() || null,
      },
    });
  }

  async eliminarItemBom(idBom: number) {
    return this.prisma.modelos_equipo_bom.delete({
      where: { id_modelo_bom: idBom },
    });
  }
}
