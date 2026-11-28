import { PrismaService } from '@mekanos/database';
import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { estado_actividad_enum } from '@prisma/client';
import {
  extraerConfigEquipoDeOrden,
  resolverParametroConConfig,
} from '../../config-parametros/parametros-override.helper';
import { OrdenRealtimeBusService } from './orden-realtime-bus.service';

export interface ActividadCompletaItem {
  id_actividad_ejecutada: number | null;
  virtual_key: string;
  estado_registro: 'SIN_REGISTRO' | 'REGISTRADA';
  id_orden_servicio: number;
  id_orden_equipo: number | null;
  id_actividad_catalogo: number | null;
  id_orden_actividad_plan: number | null;
  descripcion_manual: string | null;
  sistema: string | null;
  orden_secuencia: number;
  estado: string | null;
  ejecutada: boolean;
  observaciones: string | null;
  respuesta_json: unknown;
  fecha_ejecucion: Date | string | null;
  fecha_registro: Date | string | null;
  es_obligatoria: boolean;
  es_manual: boolean;
  evidencias_count: number;
  client_uuid: string | null;
  sync_version: number;
  catalogo_actividades: any;
  empleados?: any;
}

export interface ActividadesCompletasResponse {
  success: true;
  data: ActividadCompletaItem[];
  resumen: {
    total_plan: number;
    registradas: number;
    sin_registro: number;
    manuales: number;
    porcentaje: number;
    fuente_plan: 'PLAN_ORDEN' | 'CATALOGO_SERVICIO' | 'SOLO_EJECUTADAS';
    total_equipos: number;
  };
}

export interface UpsertActividadAdminDto {
  id_actividad_catalogo?: number | null;
  id_orden_equipo?: number | null;
  descripcion_manual?: string | null;
  sistema?: string | null;
  orden_secuencia?: number | null;
  estado?: string | null;
  observaciones?: string | null;
  ejecutada?: boolean;
  respuestaJson?: Record<string, unknown> | null;
}

const VALID_ESTADOS_ACTIVIDAD = new Set<string>(Object.values(estado_actividad_enum));

/**
 * Servicio Espejo Vivo de Ordenes (Fase 2).
 *
 * Resuelve las 2 proyecciones completas para Portal Admin desde ASIGNADA y EN_PROCESO:
 * 1. `getActividadesCompletas`: cruce multi-equipo `(ordenes_equipos × plan/catálogo)` LEFT JOIN
 *    `actividades_ejecutadas (deleted_at IS NULL)` con estado explícito `SIN_REGISTRO` vs `REGISTRADA`.
 * 2. `getMedicionesCompletas`: tracking independiente por `id_orden_equipo` con overrides propios
 *    de cada equipo (elimina el bug del `Set` plano global entre equipos).
 */
@Injectable()
export class OrdenesEspejoService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeBus?: OrdenRealtimeBusService,
  ) {}

  private isMedicionCatalogo(
    cat?: { tipo_actividad?: string | null; id_parametro_medicion?: number | null } | null,
  ): boolean {
    return cat?.tipo_actividad === 'MEDICION' && cat?.id_parametro_medicion != null;
  }

  private enrichParametroMedicionConEquipo(
    parametro: any,
    orden: any,
    idOrdenEquipo?: number | null,
  ) {
    if (!parametro) return parametro;
    const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(orden, idOrdenEquipo);
    const resolved = resolverParametroConConfig(parametro, configEquipo, configPlantilla);
    return {
      ...parametro,
      unidad_medida: resolved.unidadMedida || parametro.unidad_medida,
      valor_minimo_normal:
        resolved.minNormal !== undefined ? resolved.minNormal : parametro.valor_minimo_normal,
      valor_maximo_normal:
        resolved.maxNormal !== undefined ? resolved.maxNormal : parametro.valor_maximo_normal,
      valor_minimo_critico:
        resolved.minCritico !== undefined ? resolved.minCritico : parametro.valor_minimo_critico,
      valor_maximo_critico:
        resolved.maxCritico !== undefined ? resolved.maxCritico : parametro.valor_maximo_critico,
      valor_ideal: resolved.valorIdeal !== undefined ? resolved.valorIdeal : parametro.valor_ideal,
      es_personalizado_equipo: resolved.esPersonalizado,
      origen_config: resolved.origen,
      rango_catalogo: {
        unidad_medida: resolved.unidadCatalogo,
        valor_minimo_normal: resolved.minNormalCatalogo ?? null,
        valor_maximo_normal: resolved.maxNormalCatalogo ?? null,
        valor_minimo_critico: resolved.minCriticoCatalogo ?? null,
        valor_maximo_critico: resolved.maxCriticoCatalogo ?? null,
      },
    };
  }

  /**
   * GET /api/ordenes/:id/actividades-completas
   * Proyecta 100% del plan esperado (por equipo en multi-equipo) unido con `actividades_ejecutadas`
   * activas (`deleted_at IS NULL`), marcando con `estado_registro: 'SIN_REGISTRO'` lo aún no tocado.
   */
  async getActividadesCompletas(idOrden: number): Promise<ActividadesCompletasResponse> {
    const [orden, ejecutadas, evidenciasAct] = await Promise.all([
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: idOrden },
        select: {
          id_orden_servicio: true,
          id_tipo_servicio: true,
          equipos: {
            select: {
              id_equipo: true,
              id_tipo_equipo: true,
              codigo_equipo: true,
              nombre_equipo: true,
            },
          },
          ordenes_equipos: {
            orderBy: [{ orden_secuencia: 'asc' }, { id_orden_equipo: 'asc' }],
            select: {
              id_orden_equipo: true,
              id_equipo: true,
              orden_secuencia: true,
              nombre_sistema: true,
              equipos: {
                select: {
                  id_equipo: true,
                  id_tipo_equipo: true,
                  codigo_equipo: true,
                  nombre_equipo: true,
                },
              },
            },
          },
          ordenes_actividades_plan: {
            orderBy: [{ orden_secuencia: 'asc' }, { id_orden_actividad_plan: 'asc' }],
            include: {
              catalogo_actividades: {
                include: { catalogo_sistemas: true },
              },
            },
          },
        },
      }),
      this.prisma.actividades_ejecutadas.findMany({
        where: { id_orden_servicio: idOrden, deleted_at: null },
        include: {
          catalogo_actividades: {
            include: { catalogo_sistemas: true },
          },
          empleados: { include: { persona: true } },
        },
        orderBy: [{ orden_secuencia: 'asc' }, { id_actividad_ejecutada: 'asc' }],
      }),
      this.prisma.evidencias_fotograficas.findMany({
        where: {
          id_orden_servicio: idOrden,
          deleted_at: null,
          id_actividad_ejecutada: { not: null },
        },
        select: { id_actividad_ejecutada: true },
      }),
    ]);

    if (!orden) {
      throw new NotFoundException(`Orden #${idOrden} no encontrada`);
    }

    const evidenciasPorActividad = new Map<number, number>();
    for (const ev of evidenciasAct) {
      if (ev.id_actividad_ejecutada != null) {
        evidenciasPorActividad.set(
          ev.id_actividad_ejecutada,
          (evidenciasPorActividad.get(ev.id_actividad_ejecutada) || 0) + 1,
        );
      }
    }

    // 1. Resolver plantilla base del plan (plan sembrado -> fallback catálogo por tipo_servicio)
    type PlanTemplate = {
      id_orden_actividad_plan: number | null;
      id_actividad_catalogo: number;
      orden_secuencia: number;
      es_obligatoria: boolean;
      catalogo_actividades: any;
    };

    let fuentePlan: 'PLAN_ORDEN' | 'CATALOGO_SERVICIO' | 'SOLO_EJECUTADAS' = 'SOLO_EJECUTADAS';
    let plantillasBase: PlanTemplate[] = [];

    const planChecklist = (orden.ordenes_actividades_plan || []).filter(
      (p) => p.catalogo_actividades && !this.isMedicionCatalogo(p.catalogo_actividades),
    );

    if (planChecklist.length > 0) {
      fuentePlan = 'PLAN_ORDEN';
      plantillasBase = planChecklist.map((p, idx) => ({
        id_orden_actividad_plan: p.id_orden_actividad_plan,
        id_actividad_catalogo: p.id_actividad_catalogo,
        orden_secuencia: p.orden_secuencia ?? idx + 1,
        es_obligatoria: p.es_obligatoria ?? true,
        catalogo_actividades: p.catalogo_actividades,
      }));
    } else if (orden.id_tipo_servicio) {
      const catalogoActs = await this.prisma.catalogo_actividades.findMany({
        where: {
          id_tipo_servicio: orden.id_tipo_servicio,
          activo: true,
        },
        include: { catalogo_sistemas: true },
        orderBy: [{ orden_ejecucion: 'asc' }, { id_actividad_catalogo: 'asc' }],
      });
      const catalogoChecklist = catalogoActs.filter((c) => !this.isMedicionCatalogo(c));
      if (catalogoChecklist.length > 0) {
        fuentePlan = 'CATALOGO_SERVICIO';
        plantillasBase = catalogoChecklist.map((c, idx) => ({
          id_orden_actividad_plan: null,
          id_actividad_catalogo: c.id_actividad_catalogo,
          orden_secuencia: c.orden_ejecucion ?? idx + 1,
          es_obligatoria: c.es_obligatoria ?? true,
          catalogo_actividades: c,
        }));
      }
    }

    // 2. Definir slots de equipo (multi-equipo real o slot único legacy)
    const equiposOrdenados = orden.ordenes_equipos || [];
    const slots: Array<{ idOrdenEquipo: number | null; idTipoEquipo: number | null }> =
      equiposOrdenados.length > 0
        ? equiposOrdenados.map((oe) => ({
            idOrdenEquipo: oe.id_orden_equipo,
            idTipoEquipo: oe.equipos?.id_tipo_equipo ?? null,
          }))
        : [
            {
              idOrdenEquipo: null,
              idTipoEquipo: orden.equipos?.id_tipo_equipo ?? null,
            },
          ];

    const esOrdenUnicoSlot = slots.length === 1;
    const consumedExecIds = new Set<number>();

    const toItemFromExec = (
      exec: any,
      slotIdOrdenEquipo: number | null,
      planMatch?: PlanTemplate,
      esManual = false,
    ): ActividadCompletaItem => {
      const tieneContenido =
        exec.ejecutada === true ||
        exec.estado != null ||
        Boolean(exec.observaciones && String(exec.observaciones).trim().length > 0) ||
        exec.respuesta_json != null;

      const sistemaNombre =
        exec.sistema ||
        exec.catalogo_actividades?.catalogo_sistemas?.nombre_sistema ||
        planMatch?.catalogo_actividades?.catalogo_sistemas?.nombre_sistema ||
        'GENERAL';

      return {
        id_actividad_ejecutada: exec.id_actividad_ejecutada,
        virtual_key: `exec-${exec.id_actividad_ejecutada}`,
        estado_registro: tieneContenido ? 'REGISTRADA' : 'SIN_REGISTRO',
        id_orden_servicio: idOrden,
        id_orden_equipo: exec.id_orden_equipo ?? slotIdOrdenEquipo,
        id_actividad_catalogo:
          exec.id_actividad_catalogo ?? planMatch?.id_actividad_catalogo ?? null,
        id_orden_actividad_plan: planMatch?.id_orden_actividad_plan ?? null,
        descripcion_manual: exec.descripcion_manual ?? null,
        sistema: sistemaNombre,
        orden_secuencia: exec.orden_secuencia ?? planMatch?.orden_secuencia ?? 9999,
        estado: exec.estado ?? null,
        ejecutada: Boolean(exec.ejecutada || exec.estado != null),
        observaciones: exec.observaciones ?? null,
        respuesta_json: exec.respuesta_json ?? null,
        fecha_ejecucion: exec.fecha_ejecucion ?? null,
        fecha_registro: exec.fecha_registro ?? null,
        es_obligatoria: planMatch?.es_obligatoria ?? true,
        es_manual: esManual,
        evidencias_count: evidenciasPorActividad.get(exec.id_actividad_ejecutada) ?? 0,
        client_uuid: exec.client_uuid ?? null,
        sync_version: exec.sync_version ?? 1,
        catalogo_actividades: exec.catalogo_actividades ?? planMatch?.catalogo_actividades ?? null,
        empleados: exec.empleados ?? undefined,
      };
    };

    const items: ActividadCompletaItem[] = [];
    let totalPlan = 0;
    let manuales = 0;

    for (const slot of slots) {
      // Si la fuente es catálogo genérico y el equipo tiene tipo específico, priorizar compatibles
      let plantillasSlot = plantillasBase;
      if (fuentePlan === 'CATALOGO_SERVICIO' && slot.idTipoEquipo != null) {
        const compatibles = plantillasBase.filter(
          (p) =>
            p.catalogo_actividades?.id_tipo_equipo == null ||
            p.catalogo_actividades.id_tipo_equipo === slot.idTipoEquipo,
        );
        if (compatibles.length > 0) {
          plantillasSlot = compatibles;
        }
      }

      // Candidatas ejecutadas pertenecientes a este equipo
      const execsSlot = ejecutadas.filter((e) => {
        if (consumedExecIds.has(e.id_actividad_ejecutada)) return false;
        if (slot.idOrdenEquipo != null) {
          return (
            e.id_orden_equipo === slot.idOrdenEquipo ||
            (esOrdenUnicoSlot && e.id_orden_equipo == null)
          );
        }
        return e.id_orden_equipo == null;
      });

      for (const planItem of plantillasSlot) {
        totalPlan++;
        const match = execsSlot.find(
          (e) =>
            !consumedExecIds.has(e.id_actividad_ejecutada) &&
            e.id_actividad_catalogo === planItem.id_actividad_catalogo,
        );

        if (match) {
          consumedExecIds.add(match.id_actividad_ejecutada);
          items.push(toItemFromExec(match, slot.idOrdenEquipo, planItem, false));
        } else {
          const sistemaNombre =
            planItem.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL';
          items.push({
            id_actividad_ejecutada: null,
            virtual_key: `plan-${slot.idOrdenEquipo ?? 0}-${planItem.id_actividad_catalogo}`,
            estado_registro: 'SIN_REGISTRO',
            id_orden_servicio: idOrden,
            id_orden_equipo: slot.idOrdenEquipo,
            id_actividad_catalogo: planItem.id_actividad_catalogo,
            id_orden_actividad_plan: planItem.id_orden_actividad_plan,
            descripcion_manual: null,
            sistema: sistemaNombre,
            orden_secuencia: planItem.orden_secuencia,
            estado: null,
            ejecutada: false,
            observaciones: null,
            respuesta_json: null,
            fecha_ejecucion: null,
            fecha_registro: null,
            es_obligatoria: planItem.es_obligatoria,
            es_manual: false,
            evidencias_count: 0,
            client_uuid: null,
            sync_version: 0,
            catalogo_actividades: planItem.catalogo_actividades,
          });
        }
      }

      // Agregar actividades extra/manuales del slot no cubiertas por el plan
      for (const extra of execsSlot) {
        if (consumedExecIds.has(extra.id_actividad_ejecutada)) continue;
        consumedExecIds.add(extra.id_actividad_ejecutada);
        manuales++;
        items.push(toItemFromExec(extra, slot.idOrdenEquipo, undefined, true));
      }
    }

    // Cualquier actividad histórica huérfana (ej. id_orden_equipo null en multi-equipo legacy)
    for (const orphan of ejecutadas) {
      if (consumedExecIds.has(orphan.id_actividad_ejecutada)) continue;
      consumedExecIds.add(orphan.id_actividad_ejecutada);
      manuales++;
      items.push(toItemFromExec(orphan, orphan.id_orden_equipo ?? null, undefined, true));
    }

    const registradas = items.filter((it) => it.estado_registro === 'REGISTRADA').length;
    const sinRegistro = items.length - registradas;
    const porcentaje = items.length > 0 ? Math.round((registradas / items.length) * 100) : 0;

    return {
      success: true,
      data: items,
      resumen: {
        total_plan: totalPlan,
        registradas,
        sin_registro: sinRegistro,
        manuales,
        porcentaje,
        fuente_plan: fuentePlan,
        total_equipos: slots.length,
      },
    };
  }

  /**
   * POST /api/ordenes/:id/actividades
   * Permite al Portal Admin registrar directamente un ítem que estaba en estado `SIN_REGISTRO`
   * de forma idempotente por `(id_orden_servicio, id_orden_equipo, id_actividad_catalogo)`.
   */
  async upsertActividadDesdeAdmin(
    idOrden: number,
    dto: UpsertActividadAdminDto,
    userId: number,
  ): Promise<{ success: true; data: any }> {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        id_tecnico_asignado: true,
        ordenes_equipos: { select: { id_orden_equipo: true } },
      },
    });
    if (!orden) {
      throw new NotFoundException(`Orden #${idOrden} no encontrada`);
    }

    const idOrdenEquipo = dto.id_orden_equipo ?? null;
    if (idOrdenEquipo != null) {
      const validIds = new Set(orden.ordenes_equipos.map((oe) => oe.id_orden_equipo));
      if (!validIds.has(idOrdenEquipo)) {
        throw new BadRequestException(
          `id_orden_equipo=${idOrdenEquipo} no pertenece a la orden #${idOrden}`,
        );
      }
    }

    let estadoNorm: estado_actividad_enum | null = null;
    if (dto.estado != null && String(dto.estado).trim() !== '') {
      const upper = String(dto.estado).trim().toUpperCase();
      if (upper === 'N/A') {
        estadoNorm = estado_actividad_enum.NA;
      } else if (VALID_ESTADOS_ACTIVIDAD.has(upper)) {
        estadoNorm = upper as estado_actividad_enum;
      } else {
        throw new BadRequestException(`Estado de actividad inválido: ${dto.estado}`);
      }
    }

    const existing =
      dto.id_actividad_catalogo != null
        ? await this.prisma.actividades_ejecutadas.findFirst({
            where: {
              id_orden_servicio: idOrden,
              id_orden_equipo: idOrdenEquipo,
              id_actividad_catalogo: dto.id_actividad_catalogo,
              deleted_at: null,
            },
          })
        : null;

    const now = new Date();
    const record = existing
      ? await this.prisma.actividades_ejecutadas.update({
          where: { id_actividad_ejecutada: existing.id_actividad_ejecutada },
          data: {
            estado: estadoNorm !== null ? estadoNorm : dto.estado === null ? null : existing.estado,
            observaciones:
              dto.observaciones !== undefined ? dto.observaciones : existing.observaciones,
            ejecutada:
              dto.ejecutada !== undefined
                ? dto.ejecutada
                : estadoNorm !== null || existing.ejecutada,
            respuesta_json:
              dto.respuestaJson !== undefined
                ? (dto.respuestaJson as any)
                : existing.respuesta_json,
            fecha_ejecucion: now,
            sync_version: existing.sync_version + 1,
          },
          include: { catalogo_actividades: true },
        })
      : await this.prisma.actividades_ejecutadas.create({
          data: {
            id_orden_servicio: idOrden,
            id_orden_equipo: idOrdenEquipo,
            id_actividad_catalogo: dto.id_actividad_catalogo ?? null,
            descripcion_manual: dto.descripcion_manual ?? null,
            sistema: dto.sistema ?? null,
            orden_secuencia: dto.orden_secuencia ?? null,
            estado: estadoNorm,
            observaciones: dto.observaciones ?? null,
            ejecutada: dto.ejecutada ?? estadoNorm !== null,
            ejecutada_por: orden.id_tecnico_asignado ?? null,
            fecha_ejecucion: now,
            fecha_registro: now,
            respuesta_json: (dto.respuestaJson as any) ?? undefined,
            sync_version: 1,
          },
          include: { catalogo_actividades: true },
        });

    this.realtimeBus?.emitOrdenEvent({
      type: 'order_updated',
      orderId: idOrden,
      numeroOrden: orden.numero_orden,
      sections: ['actividades', 'progreso'],
      changedIds: { actividades: [record.id_actividad_ejecutada] },
      timestamp: now.toISOString(),
      source: 'ADMIN_ACTION',
    });

    // Evitar unused param warning si el caller pasa userId para futura auditoría
    void userId;

    return { success: true, data: record };
  }

  /**
   * GET /api/ordenes/:id/mediciones-completas (FIX MULTI-EQUIPO)
   * Trackea cada parámetro independientemente por `(id_orden_equipo, id_parametro_medicion)`,
   * enriquece cada parámetro sin medir con los rangos/overrides propios de ESE equipo, y
   * devuelve `por_equipo` + `parametros_sin_medir` (retrocompatible).
   */
  async getMedicionesCompletas(idOrden: number) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      select: {
        id_orden_servicio: true,
        id_tipo_servicio: true,
        equipos: {
          select: {
            id_equipo: true,
            codigo_equipo: true,
            nombre_equipo: true,
            id_tipo_equipo: true,
            config_parametros: true,
            plantillas_parametros: true,
          },
        },
        ordenes_equipos: {
          orderBy: [{ orden_secuencia: 'asc' }, { id_orden_equipo: 'asc' }],
          select: {
            id_orden_equipo: true,
            orden_secuencia: true,
            nombre_sistema: true,
            equipos: {
              select: {
                id_equipo: true,
                codigo_equipo: true,
                nombre_equipo: true,
                id_tipo_equipo: true,
                config_parametros: true,
                plantillas_parametros: true,
              },
            },
          },
        },
        ordenes_actividades_plan: {
          select: {
            catalogo_actividades: {
              select: {
                tipo_actividad: true,
                id_parametro_medicion: true,
                id_tipo_equipo: true,
                descripcion_actividad: true,
              },
            },
          },
        },
      },
    });

    if (!orden) {
      return { success: false, data: [], parametros_sin_medir: [], por_equipo: [] };
    }

    // 1. Mediciones registradas activas (excluir tombstones deleted_at != null)
    const mediciones = await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: idOrden, deleted_at: null },
      include: { parametros_medicion: true },
      orderBy: [{ id_orden_equipo: 'asc' }, { id_medicion: 'asc' }],
    });

    // 2. Construir slots de equipo
    const equiposOrdenados = orden.ordenes_equipos || [];
    const slots =
      equiposOrdenados.length > 0
        ? equiposOrdenados.map((oe) => ({
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            equipoLabel:
              oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${oe.orden_secuencia || 1}`,
            codigoEquipo: oe.equipos?.codigo_equipo || '',
            idTipoEquipo: oe.equipos?.id_tipo_equipo ?? null,
          }))
        : [
            {
              idOrdenEquipo: null as number | null,
              ordenSecuencia: 1,
              equipoLabel: orden.equipos?.nombre_equipo || 'Equipo Principal',
              codigoEquipo: orden.equipos?.codigo_equipo || '',
              idTipoEquipo: orden.equipos?.id_tipo_equipo ?? null,
            },
          ];

    const esUnicoSlot = slots.length === 1;

    // 3. Claves compuestas medidas: `${id_orden_equipo ?? 0}:${id_parametro_medicion}`
    const medidosKeys = new Set<string>();
    for (const m of mediciones) {
      medidosKeys.add(`${m.id_orden_equipo ?? 0}:${m.id_parametro_medicion}`);
      // Compatibilidad: orden de 1 equipo con fila legacy sin id_orden_equipo
      if (esUnicoSlot && m.id_orden_equipo == null && slots[0].idOrdenEquipo != null) {
        medidosKeys.add(`${slots[0].idOrdenEquipo}:${m.id_parametro_medicion}`);
      }
    }

    // 4. Recolectar fuentes de parámetros esperados
    const idsDesdePlan = new Set<number>();
    for (const planItem of orden.ordenes_actividades_plan || []) {
      const act = planItem.catalogo_actividades;
      if (act?.tipo_actividad === 'MEDICION' && act.id_parametro_medicion) {
        idsDesdePlan.add(act.id_parametro_medicion);
      }
    }

    const idsDesdeServicio = new Set<number>();
    if (orden.id_tipo_servicio) {
      const actsCatalogo = await this.prisma.catalogo_actividades.findMany({
        where: {
          id_tipo_servicio: orden.id_tipo_servicio,
          tipo_actividad: 'MEDICION',
          id_parametro_medicion: { not: null },
          activo: true,
        },
        select: { id_parametro_medicion: true },
      });
      for (const act of actsCatalogo) {
        if (act.id_parametro_medicion) {
          idsDesdeServicio.add(act.id_parametro_medicion);
        }
      }
    }

    const tiposEquipoIds = new Set<number>();
    for (const slot of slots) {
      if (slot.idTipoEquipo != null) tiposEquipoIds.add(slot.idTipoEquipo);
    }

    const idsFromPlans = new Set<number>([...idsDesdePlan, ...idsDesdeServicio]);

    const [parametrosPorTipo, parametrosDelPlan] = await Promise.all([
      tiposEquipoIds.size > 0
        ? this.prisma.parametros_medicion.findMany({
            where: {
              id_tipo_equipo: { in: Array.from(tiposEquipoIds) },
              activo: true,
            },
          })
        : Promise.resolve([]),
      idsFromPlans.size > 0
        ? this.prisma.parametros_medicion.findMany({
            where: {
              id_parametro_medicion: { in: Array.from(idsFromPlans) },
              activo: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const medicionesEnriquecidas = mediciones.map((m) => ({
      ...m,
      parametros_medicion: this.enrichParametroMedicionConEquipo(
        m.parametros_medicion,
        orden,
        m.id_orden_equipo,
      ),
    }));

    // 5. Proyectar parámetros esperados y faltantes POR CADA EQUIPO independientemente
    const parametrosSinMedir: any[] = [];
    const porEquipo: Array<{
      id_orden_equipo: number | null;
      orden_secuencia: number;
      equipo_label: string;
      codigo_equipo: string;
      mediciones: any[];
      parametros_sin_medir: any[];
      total_esperados: number;
      total_registrados: number;
    }> = [];

    let totalEsperadosGlobal = 0;

    for (const slot of slots) {
      const mapaSlot = new Map<number, any>();

      // Parámetros propios del tipo de equipo de ESTE slot
      for (const p of parametrosPorTipo) {
        if (slot.idTipoEquipo != null && p.id_tipo_equipo === slot.idTipoEquipo) {
          mapaSlot.set(p.id_parametro_medicion, p);
        }
      }

      // Parámetros del plan / tipo de servicio compatibles con ESTE slot
      for (const p of parametrosDelPlan) {
        if (
          p.id_tipo_equipo == null ||
          slot.idTipoEquipo == null ||
          p.id_tipo_equipo === slot.idTipoEquipo
        ) {
          mapaSlot.set(p.id_parametro_medicion, p);
        }
      }

      const medsSlot = medicionesEnriquecidas.filter((m) =>
        slot.idOrdenEquipo != null
          ? m.id_orden_equipo === slot.idOrdenEquipo || (esUnicoSlot && m.id_orden_equipo == null)
          : m.id_orden_equipo == null,
      );

      const sinMedirSlot = Array.from(mapaSlot.values())
        .filter((p) => !medidosKeys.has(`${slot.idOrdenEquipo ?? 0}:${p.id_parametro_medicion}`))
        .sort((a, b) => (a.nombre_parametro || '').localeCompare(b.nombre_parametro || ''))
        .map((p) => ({
          ...this.enrichParametroMedicionConEquipo(p, orden, slot.idOrdenEquipo),
          id_orden_equipo: slot.idOrdenEquipo,
          equipo_label: slot.equipoLabel,
          codigo_equipo: slot.codigoEquipo,
          orden_secuencia: slot.ordenSecuencia,
        }));

      parametrosSinMedir.push(...sinMedirSlot);

      const esperadosSlot = Math.max(mapaSlot.size, medsSlot.length + sinMedirSlot.length);
      totalEsperadosGlobal += esperadosSlot;

      porEquipo.push({
        id_orden_equipo: slot.idOrdenEquipo,
        orden_secuencia: slot.ordenSecuencia,
        equipo_label: slot.equipoLabel,
        codigo_equipo: slot.codigoEquipo,
        mediciones: medsSlot,
        parametros_sin_medir: sinMedirSlot,
        total_esperados: esperadosSlot,
        total_registrados: medsSlot.length,
      });
    }

    return {
      success: true,
      data: medicionesEnriquecidas,
      parametros_sin_medir: parametrosSinMedir,
      por_equipo: porEquipo,
      _debug: {
        total_equipos: slots.length,
        total_parametros_disponibles: totalEsperadosGlobal,
        total_medidos: medicionesEnriquecidas.length,
        total_sin_medir: parametrosSinMedir.length,
        fuentes: {
          plan_actividades: idsDesdePlan.size,
          catalogo_servicio: idsDesdeServicio.size,
          tipos_equipo: parametrosPorTipo.length,
        },
      },
    };
  }
}
