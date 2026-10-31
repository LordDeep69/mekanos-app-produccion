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
  CreateAtributoTecnicoDto,
  CreateBomItemDto,
  CreateModeloEquipoDto,
  CreateModuloTecnicoDto,
  UpdateAtributoTecnicoDto,
} from './dto/catalogos-eam.dto';

@Injectable()
export class CatalogosEamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uomService: UomConversionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MAGNITUDES FÍSICAS Y UoM
  // ═══════════════════════════════════════════════════════════════════════════

  async getMagnitudes() {
    return this.prisma.catalogo_magnitudes.findMany({
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

  async getArquetipos() {
    return this.prisma.tipos_equipo.findMany({
      where: { activo: true },
      include: {
        tipo_equipo_modulos: {
          include: {
            modulo: true,
          },
          orderBy: { orden_visual: 'asc' },
        },
        tipo_equipo_planes: {
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
    return this.prisma.tipo_equipo_modulos.upsert({
      where: {
        id_tipo_equipo_id_modulo: {
          id_tipo_equipo: idTipoEquipo,
          id_modulo: idModulo,
        },
      },
      create: {
        id_tipo_equipo: idTipoEquipo,
        id_modulo: idModulo,
        obligatorio,
        orden_visual: 1,
      },
      update: {
        obligatorio,
      },
    });
  }

  async desvincularModuloArquetipo(idTipoEquipo: number, idModulo: number) {
    return this.prisma.tipo_equipo_modulos.deleteMany({
      where: {
        id_tipo_equipo: idTipoEquipo,
        id_modulo: idModulo,
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
