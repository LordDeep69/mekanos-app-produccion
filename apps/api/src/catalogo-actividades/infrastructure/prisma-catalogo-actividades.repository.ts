import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { catalogo_actividades, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  PropagarActividadBancoDto,
  ReordenarActividadesLoteDto,
  VincularActividadesLoteDto,
} from '../application/dto/fase59-actividades.dto';
import {
  CatalogoActividadesFilterParams,
  CatalogoActividadesRepository,
} from '../domain/catalogo-actividades.repository.interface';

@Injectable()
export class PrismaCatalogoActividadesRepository implements CatalogoActividadesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly INCLUDE_RELATIONS_LIST = {
    tipos_servicio: {
      select: {
        id_tipo_servicio: true,
        codigo_tipo: true,
        nombre_tipo: true,
        id_tipo_equipo: true,
        categoria: true,
        tipos_equipo: {
          select: {
            id_tipo_equipo: true,
            codigo_tipo: true,
            nombre_tipo: true,
          },
        },
      },
    },
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        codigo_tipo: true,
        nombre_tipo: true,
      },
    },
    catalogo_sistemas: {
      select: {
        id_sistema: true,
        codigo_sistema: true,
        nombre_sistema: true,
        aplica_a: true,
        orden_visualizacion: true,
        id_modulo: true,
      },
    },
    parametros_medicion: {
      select: {
        id_parametro_medicion: true,
        codigo_parametro: true,
        nombre_parametro: true,
        unidad_medida: true,
        valor_minimo_normal: true,
        valor_maximo_normal: true,
        valor_minimo_critico: true,
        valor_maximo_critico: true,
        valor_ideal: true,
        id_tipo_equipo: true,
      },
    },
  };

  private readonly INCLUDE_RELATIONS_DETAIL = {
    ...this.INCLUDE_RELATIONS_LIST,
    tipos_componente: {
      select: {
        id_tipo_componente: true,
        codigo_tipo: true,
        nombre_componente: true,
      },
    },
  };

  async create(data: any): Promise<catalogo_actividades> {
    return this.prisma.catalogo_actividades.create({
      data,
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async update(id: number, data: any): Promise<catalogo_actividades> {
    return this.prisma.catalogo_actividades.update({
      where: { id_actividad_catalogo: id },
      data: {
        ...data,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async softDelete(id: number, modificadoPor: number): Promise<catalogo_actividades> {
    return this.prisma.catalogo_actividades.update({
      where: { id_actividad_catalogo: id },
      data: {
        activo: false,
        modificado_por: modificadoPor,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async findAll(skip = 0, take = 10): Promise<{ data: catalogo_actividades[]; total: number }> {
    return this.findFiltered({ skip, take, activo: 'all' });
  }

  async findActive(skip = 0, take = 10): Promise<{ data: catalogo_actividades[]; total: number }> {
    return this.findFiltered({ skip, take, activo: true });
  }

  async findFiltered(
    params: CatalogoActividadesFilterParams,
  ): Promise<{ data: catalogo_actividades[]; total: number }> {
    const skip = params.skip ?? 0;
    const take = params.take ?? 500;
    const where: Prisma.catalogo_actividadesWhereInput = {};

    if (params.activo === true || params.activo === false) {
      where.activo = params.activo;
    }

    if (params.soloPlantillas) {
      where.id_tipo_servicio = null;
    } else if (params.tipoServicioId) {
      where.id_tipo_servicio = params.tipoServicioId;
    }

    if (params.sistemaId) {
      where.id_sistema = params.sistemaId;
    }

    if (params.tipoActividad) {
      where.tipo_actividad = params.tipoActividad as any;
    }

    if (params.tipoEquipoId) {
      where.OR = [
        { id_tipo_equipo: params.tipoEquipoId },
        { tipos_servicio: { id_tipo_equipo: params.tipoEquipoId } },
      ];
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const searchConditions: Prisma.catalogo_actividadesWhereInput[] = [
        { descripcion_actividad: { contains: q, mode: 'insensitive' } },
        { codigo_actividad: { contains: q, mode: 'insensitive' } },
        { catalogo_sistemas: { nombre_sistema: { contains: q, mode: 'insensitive' } } },
        { parametros_medicion: { nombre_parametro: { contains: q, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.catalogo_actividades.findMany({
        where,
        skip,
        take,
        include: this.INCLUDE_RELATIONS_LIST,
        orderBy: [
          { id_tipo_servicio: 'asc' },
          { orden_ejecucion: 'asc' },
          { id_actividad_catalogo: 'asc' },
        ],
      }),
      this.prisma.catalogo_actividades.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<catalogo_actividades | null> {
    return this.prisma.catalogo_actividades.findUnique({
      where: { id_actividad_catalogo: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async findByCodigo(codigo: string): Promise<catalogo_actividades | null> {
    return this.prisma.catalogo_actividades.findFirst({
      where: { codigo_actividad: codigo },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async existsTipoServicio(id: number): Promise<boolean> {
    const count = await this.prisma.tipos_servicio.count({
      where: { id_tipo_servicio: id },
    });
    return count > 0;
  }

  async existsTipoEquipo(id: number): Promise<boolean> {
    const count = await this.prisma.tipos_equipo.count({
      where: { id_tipo_equipo: id },
    });
    return count > 0;
  }

  async existsSistema(id: number): Promise<boolean> {
    const count = await this.prisma.catalogo_sistemas.count({
      where: { id_sistema: id },
    });
    return count > 0;
  }

  async existsParametroMedicion(id: number): Promise<boolean> {
    const count = await this.prisma.parametros_medicion.count({
      where: { id_parametro_medicion: id },
    });
    return count > 0;
  }

  async existsTipoComponente(id: number): Promise<boolean> {
    const count = await this.prisma.tipos_componente.count({
      where: { id_tipo_componente: id },
    });
    return count > 0;
  }

  async getMaxOrdenPorServicio(idTipoServicio?: number | null): Promise<number> {
    if (!idTipoServicio) return 0;
    const agg = await this.prisma.catalogo_actividades.aggregate({
      where: { id_tipo_servicio: idTipoServicio, activo: true },
      _max: { orden_ejecucion: true },
    });
    return agg._max.orden_ejecucion ?? 0;
  }

  async vincularLote(dto: VincularActividadesLoteDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const [templates, servicios, existingCodesRaw, allSistemas] = await Promise.all([
        tx.catalogo_actividades.findMany({
          where: { id_actividad_catalogo: { in: dto.actividadIds } },
          include: { catalogo_sistemas: true },
        }),
        tx.tipos_servicio.findMany({
          where: { id_tipo_servicio: { in: dto.tipoServicioIds } },
          include: { tipos_equipo: true },
        }),
        tx.catalogo_actividades.findMany({
          select: { codigo_actividad: true },
        }),
        tx.catalogo_sistemas.findMany({
          where: { activo: true },
        }),
      ]);

      if (templates.length === 0) {
        throw new NotFoundException('No se encontraron actividades válidas en el Banco Universal');
      }
      if (servicios.length === 0) {
        throw new NotFoundException('No se encontraron Tipos de Servicio destino válidos');
      }

      const usedCodes = new Set(existingCodesRaw.map((c) => c.codigo_actividad.toUpperCase()));
      const existingInTargets = await tx.catalogo_actividades.findMany({
        where: { id_tipo_servicio: { in: dto.tipoServicioIds }, activo: true },
        select: {
          id_tipo_servicio: true,
          descripcion_actividad: true,
          id_plantilla_origen: true,
          orden_ejecucion: true,
        },
      });

      const created: catalogo_actividades[] = [];
      let skippedCount = 0;

      for (const servicio of servicios) {
        const serviceItems = existingInTargets.filter(
          (e) => e.id_tipo_servicio === servicio.id_tipo_servicio,
        );
        const existingDescSet = new Set(
          serviceItems.map((e) => e.descripcion_actividad.trim().toLowerCase()),
        );
        const existingOriginSet = new Set(
          serviceItems
            .map((e) => e.id_plantilla_origen)
            .filter((x): x is number => typeof x === 'number'),
        );
        let currentMaxOrden = serviceItems.reduce(
          (max, e) => (e.orden_ejecucion > max ? e.orden_ejecucion : max),
          0,
        );

        const serviceEquipCode = servicio.tipos_equipo?.codigo_tipo?.toUpperCase() ?? null;

        for (const tpl of templates) {
          const originId = tpl.id_plantilla_origen ?? tpl.id_actividad_catalogo;
          const descNorm = tpl.descripcion_actividad.trim().toLowerCase();

          if (existingDescSet.has(descNorm) || existingOriginSet.has(originId)) {
            skippedCount += 1;
            continue;
          }

          let resolvedSistemaId: number | null = dto.overrideSistemaId ?? null;
          if (!resolvedSistemaId && tpl.catalogo_sistemas) {
            const tplAplica = (tpl.catalogo_sistemas.aplica_a || []).map((a) => a.toUpperCase());
            if (tplAplica.length === 0 || (serviceEquipCode && tplAplica.includes(serviceEquipCode))) {
              resolvedSistemaId = tpl.id_sistema;
            } else if (serviceEquipCode) {
              const matchingTargetSys = allSistemas.find((s) => {
                const sAplica = (s.aplica_a || []).map((a) => a.toUpperCase());
                if (!sAplica.includes(serviceEquipCode)) return false;
                if (tpl.catalogo_sistemas?.id_modulo && s.id_modulo === tpl.catalogo_sistemas.id_modulo) {
                  return true;
                }
                return (
                  s.nombre_sistema.trim().toLowerCase() ===
                  tpl.catalogo_sistemas!.nombre_sistema.trim().toLowerCase()
                );
              });
              resolvedSistemaId = matchingTargetSys?.id_sistema ?? null;
            }
          }

          currentMaxOrden += 1;
          const svcTag = servicio.codigo_tipo
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_')
            .slice(0, 12);
          const tplBase = tpl.codigo_actividad
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_')
            .slice(0, 32);
          let candidate = `${tplBase}_${svcTag}`.slice(0, 50);
          let suffix = 2;
          while (usedCodes.has(candidate)) {
            const tag = `_${suffix}`;
            candidate = `${tplBase.slice(0, 50 - svcTag.length - tag.length - 1)}_${svcTag}${tag}`;
            suffix += 1;
          }
          usedCodes.add(candidate);

          const inserted = await tx.catalogo_actividades.create({
            data: {
              codigo_actividad: candidate,
              descripcion_actividad: tpl.descripcion_actividad,
              id_tipo_servicio: servicio.id_tipo_servicio,
              id_sistema: resolvedSistemaId,
              id_tipo_equipo: servicio.id_tipo_equipo ?? tpl.id_tipo_equipo ?? null,
              id_plantilla_origen: originId,
              tipo_actividad: tpl.tipo_actividad,
              orden_ejecucion: currentMaxOrden,
              es_obligatoria: tpl.es_obligatoria ?? true,
              tiempo_estimado_minutos: tpl.tiempo_estimado_minutos,
              id_parametro_medicion: tpl.id_parametro_medicion,
              id_tipo_componente: tpl.id_tipo_componente,
              instrucciones: tpl.instrucciones,
              precauciones: tpl.precauciones,
              activo: true,
              observaciones: tpl.observaciones,
              naturaleza_personalizada: tpl.naturaleza_personalizada ?? null,
              tipo_control_input: tpl.tipo_control_input ?? 'ESCALA_ESTADO',
              config_input_json: tpl.config_input_json ?? undefined,
              rol_semantico: tpl.rol_semantico ?? null,
              creado_por: dto.creadoPor ?? userId,
            },
            include: this.INCLUDE_RELATIONS_DETAIL,
          });

          created.push(inserted);
          existingDescSet.add(descNorm);
          existingOriginSet.add(originId);
        }
      }

      return {
        createdCount: created.length,
        skippedCount,
        created,
      };
    });
  }

  async reordenarLote(dto: ReordenarActividadesLoteDto, userId: number) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debe enviar al menos un ítem para reordenar');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.catalogo_actividades.update({
          where: { id_actividad_catalogo: item.idActividadCatalogo },
          data: {
            orden_ejecucion: item.ordenEjecucion,
            ...(item.idSistema !== undefined ? { id_sistema: item.idSistema } : {}),
            modificado_por: dto.modificadoPor ?? userId,
            fecha_modificacion: new Date(),
          },
        }),
      ),
    );

    return { updatedCount: dto.items.length };
  }

  async propagarCambios(dto: PropagarActividadBancoDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const origin = await tx.catalogo_actividades.findUnique({
        where: { id_actividad_catalogo: dto.idActividadOrigen },
      });
      if (!origin) {
        throw new NotFoundException(`Actividad origen ${dto.idActividadOrigen} no encontrada`);
      }

      const rootId = origin.id_plantilla_origen ?? origin.id_actividad_catalogo;
      const sharedUpdateData: Prisma.catalogo_actividadesUncheckedUpdateInput = {
        modificado_por: dto.modificadoPor ?? userId,
        fecha_modificacion: new Date(),
      };

      if (dto.descripcionActividad !== undefined) {
        sharedUpdateData.descripcion_actividad = dto.descripcionActividad.trim();
      }
      if (dto.tipoActividad !== undefined) {
        sharedUpdateData.tipo_actividad = dto.tipoActividad as any;
      }
      if (dto.idTipoEquipo !== undefined) {
        sharedUpdateData.id_tipo_equipo = dto.idTipoEquipo;
      }
      if (dto.idParametroMedicion !== undefined) {
        sharedUpdateData.id_parametro_medicion = dto.idParametroMedicion;
      }
      if (dto.esObligatoria !== undefined) {
        sharedUpdateData.es_obligatoria = dto.esObligatoria;
      }
      if (dto.tiempoEstimadoMinutos !== undefined) {
        sharedUpdateData.tiempo_estimado_minutos = dto.tiempoEstimadoMinutos;
      }
      if (dto.instrucciones !== undefined) {
        sharedUpdateData.instrucciones = dto.instrucciones;
      }
      if (dto.precauciones !== undefined) {
        sharedUpdateData.precauciones = dto.precauciones;
      }
      if (dto.observaciones !== undefined) {
        sharedUpdateData.observaciones = dto.observaciones;
      }
      if (dto.naturalezaPersonalizada !== undefined) {
        sharedUpdateData.naturaleza_personalizada = dto.naturalezaPersonalizada;
      }
      if (dto.tipoControlInput !== undefined) {
        sharedUpdateData.tipo_control_input = dto.tipoControlInput;
      }
      if (dto.configInputJson !== undefined) {
        sharedUpdateData.config_input_json =
          dto.configInputJson === null ? Prisma.JsonNull : dto.configInputJson;
      }
      if (dto.rolSemantico !== undefined) {
        sharedUpdateData.rol_semantico = dto.rolSemantico;
      }
      if (dto.activo !== undefined) {
        sharedUpdateData.activo = dto.activo;
      }

      const updatedOrigin = await tx.catalogo_actividades.update({
        where: { id_actividad_catalogo: origin.id_actividad_catalogo },
        data: {
          ...sharedUpdateData,
          ...(dto.idSistema !== undefined ? { id_sistema: dto.idSistema } : {}),
        },
        include: this.INCLUDE_RELATIONS_DETAIL,
      });

      const propagarHijas = dto.propagarAHijas !== false;
      const propagarLegacy = dto.propagarLegacyPorNombre !== false;

      const linkedTargets: {
        id_actividad_catalogo: number;
        id_tipo_servicio: number | null;
        id_tipo_equipo: number | null;
      }[] = [];

      if (propagarHijas) {
        const directChildren = await tx.catalogo_actividades.findMany({
          where: {
            id_actividad_catalogo: { not: origin.id_actividad_catalogo },
            OR: [
              { id_plantilla_origen: origin.id_actividad_catalogo },
              { id_plantilla_origen: rootId },
              ...(origin.id_plantilla_origen
                ? [{ id_actividad_catalogo: origin.id_plantilla_origen }]
                : []),
            ],
          },
          select: {
            id_actividad_catalogo: true,
            id_tipo_servicio: true,
            id_tipo_equipo: true,
          },
        });
        linkedTargets.push(...directChildren);
      }

      if (propagarLegacy) {
        const legacySiblings = await tx.catalogo_actividades.findMany({
          where: {
            id_actividad_catalogo: {
              notIn: [
                origin.id_actividad_catalogo,
                ...linkedTargets.map((t) => t.id_actividad_catalogo),
              ],
            },
            id_plantilla_origen: null,
            tipo_actividad: origin.tipo_actividad,
            descripcion_actividad: {
              equals: origin.descripcion_actividad,
              mode: 'insensitive',
            },
          },
          select: {
            id_actividad_catalogo: true,
            id_tipo_servicio: true,
            id_tipo_equipo: true,
          },
        });
        linkedTargets.push(...legacySiblings);
      }

      const affectedServiceIds = new Set<number>();
      for (const target of linkedTargets) {
        const canSyncSistema =
          dto.idSistema !== undefined &&
          (dto.idTipoEquipo === target.id_tipo_equipo ||
            origin.id_tipo_equipo === target.id_tipo_equipo ||
            target.id_tipo_equipo === null);

        await tx.catalogo_actividades.update({
          where: { id_actividad_catalogo: target.id_actividad_catalogo },
          data: {
            ...sharedUpdateData,
            ...(canSyncSistema ? { id_sistema: dto.idSistema } : {}),
            ...(origin.id_tipo_servicio === null ? { id_plantilla_origen: origin.id_actividad_catalogo } : {}),
          },
        });
        if (target.id_tipo_servicio) {
          affectedServiceIds.add(target.id_tipo_servicio);
        }
      }

      return {
        origin: updatedOrigin,
        propagatedCount: linkedTargets.length,
        affectedServiceIds: Array.from(affectedServiceIds),
      };
    });
  }
}
