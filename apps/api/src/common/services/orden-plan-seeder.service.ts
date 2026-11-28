import { PrismaService } from '@mekanos/database';
import { Injectable, Logger } from '@nestjs/common';

export interface SembrarPlanParams {
  idOrdenServicio: number;
  idTipoServicio: number | null | undefined;
  creadoPor?: number | null;
  origen?: 'ADMIN' | 'TECNICO';
}

export interface ResembrarPlanParams {
  idOrdenServicio: number;
  idTipoServicioAnterior: number | null | undefined;
  idTipoServicioNuevo: number | null | undefined;
  creadoPor?: number | null;
}

/**
 * Servicio unificado de siembra de `ordenes_actividades_plan` (Fase 0).
 *
 * Garantiza que TODA orden de servicio —sin importar por cuál flujo nació
 * (creación manual, CPQ Cotizaciones, Propuesta Correctivo, Cronogramas o save())—
 * nazca con su plan esperado sembrado de forma idempotente, permitiendo que
 * el Portal Admin muestre el 100% del checklist en estado "Sin registro"
 * desde ASIGNADA / EN_PROCESO y que el móvil reciba un plan consistente.
 */
@Injectable()
export class OrdenPlanSeederService {
  private readonly logger = new Logger(OrdenPlanSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Siembra de manera idempotente las actividades activas del catálogo
   * correspondiente a `idTipoServicio` dentro de `ordenes_actividades_plan`.
   *
   * Respeta el índice único `(id_orden_servicio, id_actividad_catalogo)` vía `skipDuplicates: true`.
   */
  async sembrarPlanParaOrden(tx: any, params: SembrarPlanParams): Promise<{ sembradas: number }> {
    const db = tx ?? this.prisma;
    const { idOrdenServicio, idTipoServicio, creadoPor, origen = 'ADMIN' } = params;

    if (!idOrdenServicio || !idTipoServicio) {
      return { sembradas: 0 };
    }

    const actividadesBase = await db.catalogo_actividades.findMany({
      where: {
        id_tipo_servicio: Number(idTipoServicio),
        activo: true,
      },
      orderBy: [{ orden_ejecucion: 'asc' }, { id_actividad_catalogo: 'asc' }],
      select: {
        id_actividad_catalogo: true,
        orden_ejecucion: true,
        es_obligatoria: true,
      },
    });

    if (!actividadesBase || actividadesBase.length === 0) {
      this.logger.debug(
        `[PLAN-SEEDER] Tipo de servicio #${idTipoServicio} sin actividades activas en catálogo para OS #${idOrdenServicio}.`,
      );
      return { sembradas: 0 };
    }

    const result = await db.ordenes_actividades_plan.createMany({
      data: actividadesBase.map((act: any, idx: number) => ({
        id_orden_servicio: idOrdenServicio,
        id_actividad_catalogo: act.id_actividad_catalogo,
        orden_secuencia: act.orden_ejecucion ?? idx + 1,
        origen,
        es_obligatoria: act.es_obligatoria ?? true,
        ...(creadoPor ? { creado_por: creadoPor } : {}),
      })),
      skipDuplicates: true,
    });

    const sembradas = result?.count ?? actividadesBase.length;
    this.logger.log(
      `✅ [PLAN-SEEDER] OS #${idOrdenServicio} (tipoServicio=${idTipoServicio}): ${sembradas} actividades sembradas en plan.`,
    );
    return { sembradas };
  }

  /**
   * Re-siembra el plan de actividades cuando cambia `id_tipo_servicio`,
   * ÚNICAMENTE si la orden aún no tiene actividades ejecutadas ni mediciones activas.
   */
  async resembrarPlanSiCambioTipoServicio(
    tx: any,
    params: ResembrarPlanParams,
  ): Promise<{ resembrada: boolean; sembradas: number; motivo?: string }> {
    const db = tx ?? this.prisma;
    const { idOrdenServicio, idTipoServicioAnterior, idTipoServicioNuevo, creadoPor } = params;

    if (idTipoServicioNuevo === undefined) {
      return { resembrada: false, sembradas: 0, motivo: 'SIN_CAMBIO' };
    }

    const anterior = idTipoServicioAnterior ?? null;
    const nuevo = idTipoServicioNuevo ?? null;
    if (anterior === nuevo) {
      return { resembrada: false, sembradas: 0, motivo: 'SIN_CAMBIO' };
    }

    const [actividadesCount, medicionesCount] = await Promise.all([
      db.actividades_ejecutadas.count({
        where: { id_orden_servicio: idOrdenServicio, deleted_at: null },
      }),
      db.mediciones_servicio.count({
        where: { id_orden_servicio: idOrdenServicio, deleted_at: null },
      }),
    ]);

    if (actividadesCount > 0 || medicionesCount > 0) {
      this.logger.warn(
        `⚠️ [PLAN-SEEDER] OS #${idOrdenServicio} cambió tipo_servicio (${anterior} -> ${nuevo}), pero ya tiene ejecución (${actividadesCount} acts, ${medicionesCount} meds). Se preserva el plan actual.`,
      );
      return { resembrada: false, sembradas: 0, motivo: 'CON_EJECUCION_PREVIA' };
    }

    await db.ordenes_actividades_plan.deleteMany({
      where: { id_orden_servicio: idOrdenServicio },
    });

    if (!nuevo) {
      return { resembrada: true, sembradas: 0, motivo: 'TIPO_SERVICIO_LIMPIADO' };
    }

    const { sembradas } = await this.sembrarPlanParaOrden(db, {
      idOrdenServicio,
      idTipoServicio: nuevo,
      creadoPor,
      origen: 'ADMIN',
    });

    return { resembrada: true, sembradas };
  }
}
