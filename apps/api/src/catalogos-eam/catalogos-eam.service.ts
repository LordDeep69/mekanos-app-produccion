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
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UomConversionService } from '../equipos/services/uom-conversion.service';
import { BANCO_UNIVERSAL_QUDT } from './data/banco-qudt.data';
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
  CreateTipoServicioEamDto,
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
const PARES_CANONICOS: Record<
  number,
  { primarioId: number; aliasIds: number[]; nombreCanonico: string }
> = {
  1: { primarioId: 1, aliasIds: [3], nombreCanonico: 'Generador Eléctrico / Planta de Emergencia' },
  3: { primarioId: 1, aliasIds: [3], nombreCanonico: 'Generador Eléctrico / Planta de Emergencia' },
  2: { primarioId: 2, aliasIds: [5], nombreCanonico: 'Bomba Hidráulica / Sistema de Bombeo' },
  5: { primarioId: 2, aliasIds: [5], nombreCanonico: 'Bomba Hidráulica / Sistema de Bombeo' },
  6: { primarioId: 6, aliasIds: [4], nombreCanonico: 'Motor Industrial' },
  4: { primarioId: 6, aliasIds: [4], nombreCanonico: 'Motor Industrial' },
};

const ALIAS_SECUNDARIOS_OCULTOS = new Set<number>([3, 5, 4]);

const MAPA_CATEGORIAS_HUMANAS: Record<string, string> = {
  CLIMATIZACION: 'Climatización, Refrigeración y HVAC',
  ENERGIA: 'Generación de Energía y Respaldo Eléctrico',
  HIDRAULICA: 'Bombeo, Redes Hidráulicas y Presión',
  COMPRESION: 'Aire Comprimido y Sistemas Neumáticos',
  OTRO: 'Otra Maquinaria Industrial',
};

function resolverCategoriaHumana(t: { categoria?: any; metadata?: any }): string {
  const meta = t.metadata as Record<string, any> | null;
  if (meta?.macro_categoria && typeof meta.macro_categoria === 'string') {
    return meta.macro_categoria;
  }
  const rawCat = (t.categoria || 'OTRO').toString().toUpperCase();
  return MAPA_CATEGORIAS_HUMANAS[rawCat] || rawCat;
}

function mapearCategoriaDbEnum(
  catString?: string,
): 'ENERGIA' | 'HIDRAULICA' | 'CLIMATIZACION' | 'COMPRESION' | 'OTRO' {
  if (!catString) return 'OTRO';
  const c = catString.toUpperCase();
  if (
    c.includes('ENERGIA') ||
    c.includes('GENERACION') ||
    c.includes('ELECTRICO') ||
    c.includes('SUBESTACION') ||
    c.includes('TRANSFORMACION')
  ) {
    return 'ENERGIA';
  }
  if (
    c.includes('HIDRAULICA') ||
    c.includes('BOMBEO') ||
    c.includes('PRESION') ||
    c.includes('REDES')
  ) {
    return 'HIDRAULICA';
  }
  if (
    c.includes('CLIMATIZACION') ||
    c.includes('REFRIGERACION') ||
    c.includes('HVAC') ||
    c.includes('CHILLER')
  ) {
    return 'CLIMATIZACION';
  }
  if (c.includes('COMPRESION') || c.includes('NEUMATICA') || c.includes('AIRE COMPRIMIDO')) {
    return 'COMPRESION';
  }
  return 'OTRO';
}

@Injectable()
export class CatalogosEamService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uomService: UomConversionService,
  ) {}

  async onModuleInit() {
    this.syncAllModulosToSistemas().catch(() => {
      // Non-blocking startup sync between EAM Parts (modulos_tecnicos) and Checklist Subsystems (catalogo_sistemas)
    });
  }

  /**
   * Salvaguarda 2 (Fase 5.9): Auto-Sincronización EAM Partes (modulos_tecnicos) <-> catalogo_sistemas
   * Evita crear subsistemas dos veces y vincula partes de arquetipos universales (ej. ELEV, HVAC)
   * sin alterar subsistemas históricos del Golden Master (GEN, BOM).
   */
  async syncAllModulosToSistemas() {
    if (!this.prisma?.tipo_equipo_modulos?.findMany || !this.prisma?.catalogo_sistemas?.findMany) {
      return;
    }

    try {
      const [vinculos, sistemas] = await Promise.all([
        this.prisma.tipo_equipo_modulos.findMany({
          include: {
            tipo_equipo: true,
            modulo: true,
          },
          orderBy: { orden_visual: 'asc' },
        }),
        this.prisma.catalogo_sistemas.findMany(),
      ]);

      const LEGACY_PROTECTED_CODES = new Set([
        'GEN',
        'GENERADOR',
        'BOM',
        'BOMBA',
        'MOT',
        'MOTOR',
        'COMP',
        'COMPRESOR',
      ]);

      for (const vinc of vinculos) {
        if (!vinc.modulo?.activo || !vinc.tipo_equipo?.activo) continue;
        const eqCode = vinc.tipo_equipo.codigo_tipo.trim().toUpperCase();
        if (LEGACY_PROTECTED_CODES.has(eqCode)) continue;

        await this.ensureSistemaForModuloAndEquipo(
          vinc.modulo,
          eqCode,
          vinc.orden_visual ?? 1,
          sistemas,
        );
      }
    } catch {
      // Ignore in test mocks or partial environments
    }
  }

  private async ensureSistemaForModuloAndEquipo(
    modulo: {
      id_modulo: number;
      codigo_modulo: string;
      nombre_modulo: string;
      descripcion?: string | null;
      icono?: string | null;
      color_ui?: string | null;
    },
    eqCode: string,
    ordenVisual = 1,
    cachedSistemas?: any[],
  ) {
    if (!this.prisma?.catalogo_sistemas?.findMany) return null;
    const sistemas = cachedSistemas ?? (await this.prisma.catalogo_sistemas.findMany());

    const normTokens = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !['sistema', 'parte', 'control', 'para'].includes(w));

    const modTokens = normTokens(modulo.nombre_modulo);

    // 1. Buscar por id_modulo exacto o coincidencia semántica en el mismo tipo de equipo
    let match = sistemas.find((s) => s.id_modulo === modulo.id_modulo);
    if (!match) {
      match = sistemas.find((s) => {
        const aplica = (s.aplica_a || []).map((a: string) => a.toUpperCase());
        const sameName =
          s.nombre_sistema.trim().toLowerCase() === modulo.nombre_modulo.trim().toLowerCase();
        if (sameName) return true;
        if (!aplica.includes(eqCode) || s.id_modulo != null) return false;
        const sysTokens = normTokens(s.nombre_sistema);
        const overlap = modTokens.filter((t) => sysTokens.includes(t));
        return overlap.length >= 1;
      });
    }

    if (match) {
      const currentAplica: string[] = Array.isArray(match.aplica_a) ? match.aplica_a : [];
      const nextAplica = Array.from(
        new Set([...currentAplica.map((c) => c.toUpperCase()), eqCode]),
      );
      const needsUpdate =
        match.id_modulo !== modulo.id_modulo ||
        nextAplica.length !== currentAplica.length ||
        !match.activo;

      if (needsUpdate) {
        const updated = await this.prisma.catalogo_sistemas.update({
          where: { id_sistema: match.id_sistema },
          data: {
            id_modulo: match.id_modulo ?? modulo.id_modulo,
            aplica_a: nextAplica,
            activo: true,
          },
        });
        Object.assign(match, updated);
      }
      return match;
    }

    // 2. Crear nuevo registro en catalogo_sistemas
    const rawCode = `SIS_${modulo.codigo_modulo.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`.slice(
      0,
      50,
    );
    const created = await this.prisma.catalogo_sistemas.create({
      data: {
        codigo_sistema: rawCode,
        nombre_sistema: modulo.nombre_modulo.trim().slice(0, 100),
        descripcion:
          modulo.descripcion || `Subsistema sincronizado desde parte EAM (${modulo.codigo_modulo})`,
        aplica_a: [eqCode],
        orden_visualizacion: ordenVisual,
        icono: modulo.icono || 'layers',
        color_hex: (modulo.color_ui || '#3B82F6').slice(0, 7),
        id_modulo: modulo.id_modulo,
        activo: true,
      },
    });
    if (cachedSistemas) cachedSistemas.push(created);
    return created;
  }

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
          NOT: { codigo_tipo: { contains: 'TEST', mode: 'insensitive' } },
        },
        select: {
          id_tipo_servicio: true,
          codigo_tipo: true,
          nombre_tipo: true,
          categoria: true,
          id_tipo_equipo: true,
          aplica_a: true,
          descripcion: true,
          color_hex: true,
          duracion_estimada_horas: true,
          tipos_equipo: {
            select: {
              id_tipo_equipo: true,
              codigo_tipo: true,
              nombre_tipo: true,
            },
          },
        },
        orderBy: [{ id_tipo_equipo: 'asc' }, { nombre_tipo: 'asc' }],
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

  async getBancoMagnitudes() {
    const dbMags = await this.prisma.catalogo_magnitudes.findMany({
      select: { id_magnitud: true, codigo_magnitud: true, activo: true },
    });
    const dbMap = new Map(dbMags.map((m) => [m.codigo_magnitud, m]));

    return BANCO_UNIVERSAL_QUDT.map((preset) => {
      const enDb = dbMap.get(preset.codigo_magnitud);
      return {
        ...preset,
        id_magnitud: enDb?.id_magnitud,
        en_db: !!enDb,
        activo: enDb ? enDb.activo : false,
      };
    });
  }

  async activarMagnitudBanco(codigoMagnitud: string) {
    const cod = codigoMagnitud.trim().toUpperCase();
    const preset = BANCO_UNIVERSAL_QUDT.find((p) => p.codigo_magnitud === cod);
    if (!preset) {
      throw new NotFoundException(`No existe la magnitud "${cod}" en el Banco Canónico`);
    }

    const existe = await this.prisma.catalogo_magnitudes.findUnique({
      where: { codigo_magnitud: preset.codigo_magnitud },
      include: { unidades_medida: true },
    });

    if (existe) {
      // Reactivar magnitud y sincronizar unidades
      return this.prisma.$transaction(async (tx) => {
        await tx.catalogo_magnitudes.update({
          where: { id_magnitud: existe.id_magnitud },
          data: { activo: true },
        });

        await tx.unidades_medida.updateMany({
          where: { id_magnitud: existe.id_magnitud },
          data: { activo: true },
        });

        for (const u of preset.unidades) {
          const uExiste = await tx.unidades_medida.findUnique({
            where: { codigo: u.codigo },
          });
          if (!uExiste) {
            await tx.unidades_medida.create({
              data: {
                codigo: u.codigo,
                nombre: u.nombre,
                simbolo: u.simbolo,
                tipo_magnitud: preset.codigo_magnitud,
                id_magnitud: existe.id_magnitud,
                factor_a: new Prisma.Decimal(u.factor_a),
                factor_b: new Prisma.Decimal(u.factor_b ?? 0.0),
                es_unidad_base: u.es_unidad_base,
                permite_decimales: u.permite_decimales ?? true,
                activo: true,
              },
            });
          }
        }
        return tx.catalogo_magnitudes.findUnique({
          where: { id_magnitud: existe.id_magnitud },
          include: {
            unidades_medida: {
              where: { activo: true },
              orderBy: { es_unidad_base: 'desc' },
            },
          },
        });
      });
    }

    // Transacción atómica: Magnitud + todas sus Unidades estándar
    return this.prisma.$transaction(async (tx) => {
      const mag = await tx.catalogo_magnitudes.create({
        data: {
          codigo_magnitud: preset.codigo_magnitud,
          nombre_magnitud: preset.nombre_magnitud,
          descripcion: preset.descripcion,
          unidad_base_codigo: preset.unidad_base_codigo,
          es_sistema: true,
          activo: true,
        },
      });

      for (const u of preset.unidades) {
        await tx.unidades_medida.upsert({
          where: { codigo: u.codigo },
          create: {
            codigo: u.codigo,
            nombre: u.nombre,
            simbolo: u.simbolo,
            tipo_magnitud: preset.codigo_magnitud,
            id_magnitud: mag.id_magnitud,
            factor_a: new Prisma.Decimal(u.factor_a),
            factor_b: new Prisma.Decimal(u.factor_b ?? 0.0),
            es_unidad_base: u.es_unidad_base,
            permite_decimales: u.permite_decimales ?? true,
            activo: true,
          },
          update: {
            id_magnitud: mag.id_magnitud,
            factor_a: new Prisma.Decimal(u.factor_a),
            factor_b: new Prisma.Decimal(u.factor_b ?? 0.0),
            es_unidad_base: u.es_unidad_base,
            permite_decimales: u.permite_decimales ?? true,
            activo: true,
          },
        });
      }

      return tx.catalogo_magnitudes.findUnique({
        where: { id_magnitud: mag.id_magnitud },
        include: {
          unidades_medida: {
            where: { activo: true },
            orderBy: { es_unidad_base: 'desc' },
          },
        },
      });
    });
  }

  async setActivoDisciplina(categoria: string, activo: boolean) {
    const presetCodigos = BANCO_UNIVERSAL_QUDT.filter((p) => p.categoria === categoria).map(
      (p) => p.codigo_magnitud,
    );

    if (presetCodigos.length === 0) {
      throw new NotFoundException(`No se encontraron magnitudes para la disciplina ${categoria}`);
    }

    await this.prisma.catalogo_magnitudes.updateMany({
      where: { codigo_magnitud: { in: presetCodigos } },
      data: { activo },
    });

    await this.prisma.unidades_medida.updateMany({
      where: { tipo_magnitud: { in: presetCodigos } },
      data: { activo },
    });

    if (this.uomService) {
      await this.uomService.recargarDesdeBD();
    }

    return {
      ok: true,
      categoria,
      activo,
      afectadas: presetCodigos.length,
      message: `Disciplina ${categoria} ${activo ? 'activada' : 'ocultada'} exitosamente (${presetCodigos.length} magnitudes)`,
    };
  }

  async reactivarTodasMagnitudes() {
    await this.prisma.catalogo_magnitudes.updateMany({
      data: { activo: true },
    });
    await this.prisma.unidades_medida.updateMany({
      data: { activo: true },
    });
    if (this.uomService) {
      await this.uomService.recargarDesdeBD();
    }
    return {
      ok: true,
      message: 'Todas las magnitudes y unidades han sido reactivadas exitosamente',
    };
  }

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

    const unidadBaseCod =
      dto.unidad_base?.codigo?.trim().toUpperCase() ||
      dto.unidad_base_codigo?.trim().toUpperCase() ||
      null;

    return this.prisma.$transaction(async (tx) => {
      const mag = await tx.catalogo_magnitudes.create({
        data: {
          codigo_magnitud: codigo,
          nombre_magnitud: dto.nombre_magnitud.trim(),
          descripcion: dto.descripcion?.trim() || null,
          unidad_base_codigo: unidadBaseCod,
          es_sistema: dto.es_sistema ?? false,
          activo: true,
        },
      });

      if (dto.unidad_base) {
        const uCod = dto.unidad_base.codigo.trim().toUpperCase();
        await tx.unidades_medida.upsert({
          where: { codigo: uCod },
          create: {
            codigo: uCod,
            nombre: dto.unidad_base.nombre.trim(),
            simbolo: dto.unidad_base.simbolo.trim(),
            tipo_magnitud: codigo.slice(0, 20),
            id_magnitud: mag.id_magnitud,
            factor_a: new Prisma.Decimal(1.0),
            factor_b: new Prisma.Decimal(0.0),
            es_unidad_base: true,
            permite_decimales: dto.unidad_base.permite_decimales ?? true,
            activo: true,
          },
          update: {
            nombre: dto.unidad_base.nombre.trim(),
            simbolo: dto.unidad_base.simbolo.trim(),
            id_magnitud: mag.id_magnitud,
            factor_a: new Prisma.Decimal(1.0),
            factor_b: new Prisma.Decimal(0.0),
            es_unidad_base: true,
            permite_decimales: dto.unidad_base.permite_decimales ?? true,
            activo: true,
          },
        });
      }

      return tx.catalogo_magnitudes.findUnique({
        where: { id_magnitud: mag.id_magnitud },
        include: {
          unidades_medida: {
            where: { activo: true },
            orderBy: { es_unidad_base: 'desc' },
          },
        },
      });
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

  async deleteMagnitud(codigo: string) {
    const cod = codigo.toUpperCase();
    const mag = await this.prisma.catalogo_magnitudes.findUnique({
      where: { codigo_magnitud: cod },
      include: {
        unidades_medida: { where: { activo: true } },
      },
    });

    if (!mag) {
      throw new NotFoundException(`No se encontró la magnitud física con código "${codigo}"`);
    }

    // Verificar si hay atributos técnicos vinculados
    const atributosVinculados = await this.prisma.atributos_tecnicos.count({
      where: {
        id_magnitud: mag.id_magnitud,
        activo: true,
      },
    });

    if (atributosVinculados > 0) {
      throw new BadRequestException(
        `No es posible eliminar la magnitud "${mag.nombre_magnitud}" porque está vinculada a ${atributosVinculados} campo(s) técnico(s) activo(s). Desvincule o reasigne dichos campos antes de eliminar.`,
      );
    }

    // Desactivar unidades asociadas
    await this.prisma.unidades_medida.updateMany({
      where: { id_magnitud: mag.id_magnitud },
      data: { activo: false },
    });

    // Intentar eliminación limpia si no hay históricos, de lo contrario soft-delete
    try {
      await this.prisma.catalogo_magnitudes.delete({
        where: { codigo_magnitud: cod },
      });
    } catch {
      await this.prisma.catalogo_magnitudes.update({
        where: { codigo_magnitud: cod },
        data: { activo: false },
      });
    }

    return {
      success: true,
      message: `Magnitud "${mag.nombre_magnitud}" eliminada exitosamente.`,
    };
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
      orderBy: [{ es_unidad_base: 'desc' }, { nombre: 'asc' }],
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

    let factorA = dto.factor_a ?? 1.0;
    let factorB = dto.factor_b ?? 0.0;
    if (dto.es_unidad_base) {
      factorA = 1.0;
      factorB = 0.0;
    }

    if (dto.es_unidad_base && idMagnitud) {
      await this.prisma.unidades_medida.updateMany({
        where: { id_magnitud: idMagnitud },
        data: { es_unidad_base: false },
      });
      await this.prisma.catalogo_magnitudes.update({
        where: { id_magnitud: idMagnitud },
        data: { unidad_base_codigo: codigo },
      });
    }

    return this.prisma.unidades_medida.create({
      data: {
        codigo,
        nombre: dto.nombre.trim(),
        simbolo: dto.simbolo.trim(),
        tipo_magnitud: tipoMagnitud,
        id_magnitud: idMagnitud || null,
        factor_a: new Prisma.Decimal(factorA),
        factor_b: new Prisma.Decimal(factorB),
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

    const esUnidadBase =
      dto.es_unidad_base !== undefined ? dto.es_unidad_base : unidad.es_unidad_base;

    if (esUnidadBase) {
      data.factor_a = new Prisma.Decimal(1.0);
      data.factor_b = new Prisma.Decimal(0.0);
      data.es_unidad_base = true;

      const targetMagId = dto.id_magnitud !== undefined ? dto.id_magnitud : unidad.id_magnitud;
      if (targetMagId) {
        await this.prisma.unidades_medida.updateMany({
          where: { id_magnitud: targetMagId, NOT: { codigo: codigo.toUpperCase() } },
          data: { es_unidad_base: false },
        });
        await this.prisma.catalogo_magnitudes.update({
          where: { id_magnitud: targetMagId },
          data: { unidad_base_codigo: codigo.toUpperCase() },
        });
      }
    } else {
      if (dto.factor_a !== undefined) data.factor_a = new Prisma.Decimal(dto.factor_a);
      if (dto.factor_b !== undefined) data.factor_b = new Prisma.Decimal(dto.factor_b);
      if (dto.es_unidad_base !== undefined) data.es_unidad_base = dto.es_unidad_base;
    }

    if (dto.permite_decimales !== undefined) data.permite_decimales = dto.permite_decimales;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.unidades_medida.update({
      where: { codigo: codigo.toUpperCase() },
      data,
      include: { magnitud: true },
    });
  }

  async deleteUnidad(codigo: string) {
    const cod = codigo.toUpperCase();
    const unidad = await this.prisma.unidades_medida.findUnique({
      where: { codigo: cod },
      include: {
        magnitud: true,
        _count: {
          select: {
            atributos_tecnicos: true,
            parametros_medicion: true,
            catalogo_componentes: true,
          },
        },
      },
    });

    if (!unidad) {
      throw new NotFoundException(`No se encontró la unidad de medida con código "${codigo}"`);
    }

    if (unidad.es_unidad_base) {
      // Verificar si hay otras unidades activas en la misma magnitud
      const otrasUnidades = await this.prisma.unidades_medida.count({
        where: {
          id_magnitud: unidad.id_magnitud,
          codigo: { not: cod },
          activo: true,
        },
      });
      if (otrasUnidades > 0) {
        throw new BadRequestException(
          `No se puede eliminar la unidad principal "${unidad.nombre}" (${unidad.simbolo}) porque la magnitud "${unidad.magnitud?.nombre_magnitud || ''}" aún tiene otras unidades activas. Establezca otra unidad como principal primero.`,
        );
      }
    }

    const totalUsos =
      unidad._count.atributos_tecnicos +
      unidad._count.parametros_medicion +
      unidad._count.catalogo_componentes;

    if (totalUsos > 0) {
      // Soft-delete para proteger integridad referencial de históricos
      await this.prisma.unidades_medida.update({
        where: { codigo: cod },
        data: { activo: false },
      });
    } else {
      // Intentar eliminación física limpia
      try {
        await this.prisma.unidades_medida.delete({
          where: { codigo: cod },
        });
      } catch {
        await this.prisma.unidades_medida.update({
          where: { codigo: cod },
          data: { activo: false },
        });
      }
    }

    return {
      success: true,
      message: `Unidad de medida "${unidad.nombre}" (${unidad.simbolo}) eliminada exitosamente.`,
    };
  }

  async convertirUom(dto: ConvertirUomDto) {
    try {
      const origCod = dto.unidadOrigen.trim().toUpperCase();
      const destCod = dto.unidadDestino.trim().toUpperCase();

      if (origCod === destCod) {
        return {
          valorOriginal: dto.valor,
          unidadOrigen: dto.unidadOrigen,
          valorDestino: dto.valor,
          unidadDestino: dto.unidadDestino,
        };
      }

      // Buscar ambas unidades directamente en PostgreSQL (dinámicas / creadas en vivo)
      const [uOrig, uDest] = await Promise.all([
        this.prisma.unidades_medida.findFirst({
          where: {
            OR: [
              { codigo: { equals: origCod, mode: 'insensitive' } },
              { simbolo: { equals: dto.unidadOrigen.trim(), mode: 'insensitive' } },
            ],
            activo: true,
          },
          include: { magnitud: true },
        }),
        this.prisma.unidades_medida.findFirst({
          where: {
            OR: [
              { codigo: { equals: destCod, mode: 'insensitive' } },
              { simbolo: { equals: dto.unidadDestino.trim(), mode: 'insensitive' } },
            ],
            activo: true,
          },
          include: { magnitud: true },
        }),
      ]);

      if (uOrig && uDest) {
        // Validar compatibilidad dimensional
        const magOrig = uOrig.id_magnitud ?? uOrig.tipo_magnitud;
        const magDest = uDest.id_magnitud ?? uDest.tipo_magnitud;

        if (magOrig !== magDest) {
          throw new BadRequestException(
            `Incompatibilidad dimensional: No se puede convertir ${uOrig.nombre} (${uOrig.simbolo}) a ${uDest.nombre} (${uDest.simbolo}) porque pertenecen a magnitudes diferentes.`,
          );
        }

        const factorA_orig = Number(uOrig.factor_a) || 1.0;
        const factorB_orig = Number(uOrig.factor_b) || 0.0;
        const factorA_dest = Number(uDest.factor_a) || 1.0;
        const factorB_dest = Number(uDest.factor_b) || 0.0;

        if (factorA_dest === 0) {
          throw new BadRequestException(
            `El factor de conversión de la unidad destino (${uDest.simbolo}) no puede ser cero.`,
          );
        }

        // 1. Transformar origen a unidad canónica base: y = a_orig * x + b_orig
        const valorBase = factorA_orig * dto.valor + factorB_orig;
        // 2. Transformar base a destino: x_dest = (valorBase - b_dest) / a_dest
        const valorDestino = (valorBase - factorB_dest) / factorA_dest;

        return {
          valorOriginal: dto.valor,
          unidadOrigen: dto.unidadOrigen,
          valorDestino,
          unidadDestino: dto.unidadDestino,
        };
      }

      // Fallback a motor estático UomConversionService
      const valorDestino = this.uomService.convertir(
        dto.valor,
        dto.unidadOrigen,
        dto.unidadDestino,
      );
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
        modulo_atributos: {
          select: {
            id_modulo: true,
            grupo_visual: true,
            obligatorio: true,
            es_kpi: true,
            modulo: {
              select: {
                id_modulo: true,
                codigo_modulo: true,
                nombre_modulo: true,
                color_ui: true,
              },
            },
          },
        },
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
        opciones_json: dto.opciones_json
          ? (dto.opciones_json as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        validacion_json: dto.validacion_json
          ? (dto.validacion_json as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
      data.magnitud = dto.id_magnitud
        ? { connect: { id_magnitud: dto.id_magnitud } }
        : { disconnect: true };
    }
    if (dto.unidad_defecto_codigo !== undefined) {
      data.unidad_defecto = dto.unidad_defecto_codigo
        ? { connect: { codigo: dto.unidad_defecto_codigo.toUpperCase() } }
        : { disconnect: true };
    }
    if (dto.rol_semantico !== undefined)
      data.rol_semantico = dto.rol_semantico.trim().toUpperCase();
    if (dto.opciones_json !== undefined)
      data.opciones_json = dto.opciones_json as unknown as Prisma.InputJsonValue;
    if (dto.validacion_json !== undefined)
      data.validacion_json = dto.validacion_json as unknown as Prisma.InputJsonValue;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.atributos_tecnicos.update({
      where: { codigo_atributo: codigo.toLowerCase() },
      data,
    });
  }

  async deleteAtributo(codigo: string) {
    const cod = codigo.toLowerCase().trim();
    const attr = await this.prisma.atributos_tecnicos.findUnique({
      where: { codigo_atributo: cod },
      include: {
        _count: {
          select: {
            modulo_atributos: true,
          },
        },
      },
    });

    if (!attr) {
      throw new NotFoundException(`No se encontró el atributo técnico con código "${codigo}"`);
    }

    if (attr._count.modulo_atributos > 0) {
      throw new BadRequestException(
        `No se puede eliminar el campo técnico "${attr.nombre_atributo}" porque está asignado a ${attr._count.modulo_atributos} parte(s)/subsistema(s). Quítelo de las partes técnicas antes de eliminar.`,
      );
    }

    try {
      await this.prisma.atributos_tecnicos.delete({
        where: { codigo_atributo: cod },
      });
    } catch {
      await this.prisma.atributos_tecnicos.update({
        where: { codigo_atributo: cod },
        data: { activo: false },
      });
    }

    return {
      success: true,
      message: `Campo técnico "${attr.nombre_atributo}" eliminado exitosamente.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MÓDULOS TÉCNICOS FUNCIONALES
  // ═══════════════════════════════════════════════════════════════════════════

  async getModulos() {
    return this.prisma.modulos_tecnicos.findMany({
      where: { activo: true },
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
          orderBy: [{ grupo_visual: 'asc' }, { orden_visual: 'asc' }],
        },
        tipo_equipo_modulos: {
          include: {
            tipo_equipo: true,
          },
        },
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
          orderBy: [{ grupo_visual: 'asc' }, { orden_visual: 'asc' }],
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

    const updatedMod = await this.prisma.modulos_tecnicos.update({
      where: { codigo_modulo: codigo.toLowerCase() },
      data,
    });

    if (this.prisma?.catalogo_sistemas?.updateMany && dto.nombre_modulo !== undefined) {
      await this.prisma.catalogo_sistemas
        .updateMany({
          where: { id_modulo: mod.id_modulo },
          data: {
            nombre_sistema: dto.nombre_modulo.trim().slice(0, 100),
            ...(dto.descripcion !== undefined
              ? { descripcion: dto.descripcion?.trim() || null }
              : {}),
          },
        })
        .catch(() => {});
    }

    return updatedMod;
  }

  async deleteModulo(codigo: string) {
    const cod = codigo.toLowerCase().trim();
    const mod = await this.prisma.modulos_tecnicos.findUnique({
      where: { codigo_modulo: cod },
      include: {
        _count: {
          select: {
            tipo_equipo_modulos: true,
            modulo_atributos: true,
          },
        },
      },
    });

    if (!mod) {
      throw new NotFoundException(`No se encontró la parte/subsistema con código "${codigo}"`);
    }

    if (mod._count.tipo_equipo_modulos > 0) {
      throw new BadRequestException(
        `No se puede eliminar la parte/subsistema "${mod.nombre_modulo}" porque está vinculada a ${mod._count.tipo_equipo_modulos} tipo(s) de equipo. Desvincúlela de los tipos de equipo antes de eliminar.`,
      );
    }

    // Desvincular atributos internos de la parte
    await this.prisma.modulo_atributos.deleteMany({
      where: { id_modulo: mod.id_modulo },
    });

    try {
      await this.prisma.modulos_tecnicos.delete({
        where: { codigo_modulo: cod },
      });
    } catch {
      await this.prisma.modulos_tecnicos.update({
        where: { codigo_modulo: cod },
        data: { activo: false },
      });
    }

    return {
      success: true,
      message: `Parte/subsistema "${mod.nombre_modulo}" eliminada exitosamente.`,
    };
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
      const categoriaHumana = resolverCategoriaHumana(t);

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
              ? mapaActivos.get(idG) || 0
              : itemG._count?.equipos || 0;
            totalModelos += itemG._count?.modelos_equipo || 0;
            codigosSincronizados.push(itemG.codigo_tipo);
          }
        }

        resultado.push({
          ...t,
          categoria: categoriaHumana,
          unidad_uso: t.unidad_uso || 'HORAS',
          etiqueta_contador:
            t.etiqueta_contador || (t.unidad_uso === 'CICLOS' ? 'Ciclos de Viaje' : 'Horómetro'),
          prefijo_codigo: t.prefijo_codigo || t.codigo_tipo,
          nombre_canonico: par.nombreCanonico,
          codigo_corto:
            t.id_tipo_equipo === 1 || t.id_tipo_equipo === 3
              ? 'GEN'
              : t.id_tipo_equipo === 2 || t.id_tipo_equipo === 5
                ? 'BOM'
                : 'MOT',
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
          ? mapaActivos.get(t.id_tipo_equipo) || 0
          : t._count?.equipos || 0;
        const nombreLimpio =
          t.codigo_tipo === 'COMP' ? 'Compresor de Aire Industrial' : t.nombre_tipo;
        resultado.push({
          ...t,
          categoria: categoriaHumana,
          unidad_uso: t.unidad_uso || 'HORAS',
          etiqueta_contador:
            t.etiqueta_contador || (t.unidad_uso === 'CICLOS' ? 'Ciclos de Viaje' : 'Horómetro'),
          prefijo_codigo: t.prefijo_codigo || t.codigo_tipo,
          nombre_canonico: nombreLimpio,
          codigo_corto: t.codigo_tipo,
          ids_sincronizados: [t.id_tipo_equipo],
          codigos_sincronizados: [t.codigo_tipo],
          equipos_activos: activos,
        });
      }
    }

    resultado.sort((a, b) => (b.equipos_activos ?? 0) - (a.equipos_activos ?? 0));
    return resultado;
  }

  async getArquetipoById(idTipoEquipo: number) {
    const t = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: idTipoEquipo },
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
    });

    if (!t) {
      throw new NotFoundException(`Arquetipo con ID ${idTipoEquipo} no encontrado`);
    }

    const categoriaHumana = resolverCategoriaHumana(t);
    return {
      ...t,
      categoria: categoriaHumana,
      unidad_uso: t.unidad_uso || 'HORAS',
      etiqueta_contador:
        t.etiqueta_contador || (t.unidad_uso === 'CICLOS' ? 'Ciclos de Viaje' : 'Horómetro'),
      prefijo_codigo: t.prefijo_codigo || t.codigo_tipo,
      nombre_canonico: t.nombre_tipo,
      codigo_corto: t.codigo_tipo,
    };
  }

  async createArquetipo(dto: CreateArquetipoDto) {
    const codigo = dto.codigo_tipo.trim().toUpperCase();
    const existe = await this.prisma.tipos_equipo.findFirst({
      where: { codigo_tipo: codigo },
    });
    if (existe) {
      throw new ConflictException(`Ya existe un arquetipo con el código ${codigo}`);
    }

    const categoriaEnum = mapearCategoriaDbEnum(dto.categoria);
    const prefijo = (dto.prefijo_codigo || codigo).trim().toUpperCase();
    const macroCategoria =
      dto.categoria?.trim() ||
      MAPA_CATEGORIAS_HUMANAS[categoriaEnum] ||
      'Otra Maquinaria Industrial';

    return this.prisma.tipos_equipo.create({
      data: {
        codigo_tipo: codigo,
        prefijo_codigo: prefijo.slice(0, 20),
        nombre_tipo: dto.nombre_tipo.trim(),
        categoria: categoriaEnum,
        descripcion: dto.descripcion?.trim() || null,
        requiere_horometro: dto.requiere_horometro ?? true,
        unidad_uso: dto.unidad_uso?.trim() || 'HORAS',
        etiqueta_contador: dto.etiqueta_contador?.trim() || 'Horómetro',
        formato_ficha_tecnica: 'FICHA_UNIVERSAL_EAM',
        icono_ui: dto.icono?.trim() || 'cpu',
        color_hex: dto.color?.trim() || '#3B82F6',
        orden: dto.orden ?? 10,
        usa_plantilla_universal: true,
        activo: true,
        metadata: {
          macro_categoria: macroCategoria,
        },
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
    if (dto.codigo_tipo !== undefined) {
      const code = dto.codigo_tipo.trim().toUpperCase();
      data.codigo_tipo = code;
      data.prefijo_codigo = code.length <= 20 ? code : code.slice(0, 20);
    } else if (dto.codigo_corto !== undefined) {
      const code = dto.codigo_corto.trim().toUpperCase();
      data.codigo_tipo = code;
      data.prefijo_codigo = code.length <= 20 ? code : code.slice(0, 20);
    }
    if (dto.prefijo_codigo !== undefined) {
      data.prefijo_codigo = dto.prefijo_codigo.trim().toUpperCase().slice(0, 20);
    }
    if (dto.nombre_tipo !== undefined) {
      data.nombre_tipo = dto.nombre_tipo.trim();
    }
    if (dto.categoria !== undefined) {
      data.categoria = mapearCategoriaDbEnum(dto.categoria);
      const metaActual = (tipo.metadata as Record<string, any>) || {};
      data.metadata = {
        ...metaActual,
        macro_categoria: dto.categoria.trim(),
      };
    }
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() || null;
    if (dto.requiere_horometro !== undefined) data.requiere_horometro = dto.requiere_horometro;
    if (dto.unidad_uso !== undefined) data.unidad_uso = dto.unidad_uso.trim();
    if (dto.etiqueta_contador !== undefined) data.etiqueta_contador = dto.etiqueta_contador.trim();
    if (dto.icono !== undefined) data.icono_ui = dto.icono?.trim();
    if (dto.color !== undefined) data.color_hex = dto.color?.trim();
    if (dto.orden !== undefined) data.orden = dto.orden;
    if (dto.activo !== undefined) data.activo = dto.activo;

    return this.prisma.tipos_equipo.update({
      where: { id_tipo_equipo: idTipoEquipo },
      data,
    });
  }

  async deleteArquetipo(idTipoEquipo: number) {
    const tipo = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo: idTipoEquipo },
      include: {
        _count: {
          select: {
            equipos: true,
            modelos_equipo: true,
          },
        },
      },
    });

    if (!tipo) {
      throw new NotFoundException(`No se encontró el tipo de equipo con ID ${idTipoEquipo}`);
    }

    if (tipo._count.equipos > 0) {
      throw new ConflictException(
        `No se puede eliminar el tipo de equipo "${tipo.nombre_tipo}" porque tiene ${tipo._count.equipos} equipos activos registrados. Desactívelo o reasigne los equipos primero.`,
      );
    }

    if (tipo._count.modelos_equipo > 0) {
      throw new ConflictException(
        `No se puede eliminar el tipo de equipo "${tipo.nombre_tipo}" porque tiene ${tipo._count.modelos_equipo} modelos de fábrica asociados. Elimine o reasigne los modelos primero.`,
      );
    }

    // Limpieza de relaciones intermedias antes de eliminar
    await this.prisma.tipo_equipo_modulos.deleteMany({
      where: { id_tipo_equipo: idTipoEquipo },
    });

    await this.prisma.tipo_equipo_planes.deleteMany({
      where: { id_tipo_equipo: idTipoEquipo },
    });

    return this.prisma.tipos_equipo.delete({
      where: { id_tipo_equipo: idTipoEquipo },
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
                  orderBy: [{ grupo_visual: 'asc' }, { orden_visual: 'asc' }],
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
          unidades_disponibles:
            attr.magnitud?.unidades_medida?.map((u) => ({
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

    const macroCategoria = resolverCategoriaHumana(tipo);
    return {
      arquetipo: {
        id_tipo_equipo: tipo.id_tipo_equipo,
        codigo_tipo: tipo.codigo_tipo,
        nombre_tipo: tipo.nombre_tipo,
        categoria: macroCategoria,
        requiere_horometro: tipo.requiere_horometro,
        unidad_uso: tipo.unidad_uso || 'HORAS',
        etiqueta_contador:
          tipo.etiqueta_contador ||
          (tipo.unidad_uso === 'CICLOS' ? 'Ciclos de Viaje' : 'Horómetro'),
        prefijo_codigo: tipo.prefijo_codigo || tipo.codigo_tipo,
        formato_ficha_tecnica: tipo.formato_ficha_tecnica,
        usa_plantilla_universal: tipo.usa_plantilla_universal,
        metadata: tipo.metadata,
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

    // Auto-sincronizar Parte EAM hacia catalogo_sistemas para que aparezca de inmediato en el Fast-Protocol Builder
    if (this.prisma?.tipos_equipo?.findUnique && this.prisma?.modulos_tecnicos?.findUnique) {
      Promise.all([
        this.prisma.tipos_equipo.findUnique({ where: { id_tipo_equipo: idTipoEquipo } }),
        this.prisma.modulos_tecnicos.findUnique({ where: { id_modulo: idModulo } }),
      ])
        .then(([arq, mod]) => {
          if (arq && mod) {
            return this.ensureSistemaForModuloAndEquipo(
              mod,
              arq.codigo_tipo.trim().toUpperCase(),
              1,
            );
          }
          return null;
        })
        .catch(() => {});
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
          frecuencia_uso:
            dto.frecuencia_uso !== undefined
              ? new Prisma.Decimal(dto.frecuencia_uso)
              : new Prisma.Decimal(250),
          criterio_intervalo:
            dto.criterio_intervalo?.trim().toUpperCase() || 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: dto.es_plan_por_defecto ?? true,
          activo: true,
        },
        update: {
          nombre_plan: dto.nombre_plan.trim(),
          frecuencia_dias: dto.frecuencia_dias ?? 90,
          frecuencia_uso:
            dto.frecuencia_uso !== undefined
              ? new Prisma.Decimal(dto.frecuencia_uso)
              : new Prisma.Decimal(250),
          criterio_intervalo:
            dto.criterio_intervalo?.trim().toUpperCase() || 'LO_QUE_OCURRA_PRIMERO',
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
      data.frecuencia_uso =
        dto.frecuencia_uso !== null ? new Prisma.Decimal(dto.frecuencia_uso) : null;
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

  async getTiposServicioEam(_idTipoEquipo?: number) {
    const where: Prisma.tipos_servicioWhereInput = {
      activo: true,
      NOT: { codigo_tipo: { contains: 'TEST', mode: 'insensitive' } },
    };

    return this.prisma.tipos_servicio.findMany({
      where,
      select: {
        id_tipo_servicio: true,
        codigo_tipo: true,
        nombre_tipo: true,
        categoria: true,
        id_tipo_equipo: true,
        aplica_a: true,
        descripcion: true,
        duracion_estimada_horas: true,
        color_hex: true,
        tipos_equipo: {
          select: {
            id_tipo_equipo: true,
            codigo_tipo: true,
            nombre_tipo: true,
          },
        },
      },
      orderBy: [{ id_tipo_equipo: 'asc' }, { nombre_tipo: 'asc' }],
    });
  }

  async createTipoServicioEam(dto: CreateTipoServicioEamDto) {
    const codigo = dto.codigo_tipo.trim().toUpperCase();
    let aplicaACalculado: string[] = [];
    if (dto.id_tipo_equipo) {
      const arq = await this.prisma.tipos_equipo.findUnique({
        where: { id_tipo_equipo: Number(dto.id_tipo_equipo) },
        select: { codigo_tipo: true },
      });
      if (arq?.codigo_tipo) {
        const codArq = arq.codigo_tipo.trim().toUpperCase();
        if (codArq === 'GEN' || codArq === 'GENERADOR') aplicaACalculado = ['GEN', 'GENERADOR'];
        else if (codArq === 'BOM' || codArq === 'BOMBA') aplicaACalculado = ['BOM', 'BOMBA'];
        else if (codArq === 'MOT' || codArq === 'MOTOR') aplicaACalculado = ['MOT', 'MOTOR'];
        else aplicaACalculado = [codArq];
      }
    }

    const existing = await this.prisma.tipos_servicio.findFirst({
      where: { codigo_tipo: codigo },
    });
    if (existing) {
      if (!existing.activo) {
        return this.prisma.tipos_servicio.update({
          where: { id_tipo_servicio: existing.id_tipo_servicio },
          data: {
            activo: true,
            nombre_tipo: dto.nombre_tipo.trim(),
            categoria: dto.categoria as any,
            id_tipo_equipo: dto.id_tipo_equipo || existing.id_tipo_equipo,
            aplica_a: aplicaACalculado.length > 0 ? aplicaACalculado : existing.aplica_a,
            descripcion: dto.descripcion?.trim() || existing.descripcion,
          },
        });
      }
      throw new ConflictException(`Ya existe un tipo de servicio con el código '${codigo}'`);
    }

    return this.prisma.tipos_servicio.create({
      data: {
        codigo_tipo: codigo,
        nombre_tipo: dto.nombre_tipo.trim(),
        descripcion: dto.descripcion?.trim() || null,
        categoria: dto.categoria as any,
        id_tipo_equipo: dto.id_tipo_equipo || null,
        aplica_a: aplicaACalculado,
        tiene_checklist: true,
        tiene_plantilla_informe: true,
        requiere_mediciones: true,
        duracion_estimada_horas: dto.duracion_estimada_horas
          ? new Prisma.Decimal(dto.duracion_estimada_horas)
          : new Prisma.Decimal(2),
        color_hex: dto.color_hex || '#0284c7',
        activo: true,
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
        modelos_equipo_bom: {
          include: {
            catalogo_componentes: true,
          },
          orderBy: { rol_bom: 'asc' },
        },
        _count: {
          select: {
            modelos_equipo_bom: true,
          },
        },
      },
      orderBy: [{ marca: 'asc' }, { modelo: 'asc' }],
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
        especificaciones_base: (dto.especificaciones_base ||
          {}) as unknown as Prisma.InputJsonValue,
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
    if (dto.nombre_comercial !== undefined)
      data.nombre_comercial = dto.nombre_comercial?.trim() || null;
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
