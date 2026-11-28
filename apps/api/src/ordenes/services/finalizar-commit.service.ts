import { PrismaService } from '@mekanos/database';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { crearMetadataObservacionesCierre } from '../domain/observaciones-cierre-audit';
import { FinalizarCommitDto } from '../dto/finalizar-commit.dto';
import { OrdenRealtimeBusService } from './orden-realtime-bus.service';
import { SyncDeltaActor } from './sync-delta.service';

export interface MissingManifestItems {
  actividades: string[];
  mediciones: string[];
  evidencias: string[];
  pendientes: string[];
  firmas: string[];
}

export interface FinalizarCommitResponse {
  success: true;
  alreadyCompleted: boolean;
  esResubida: boolean;
  orderId: number;
  numeroOrden: string;
  estadoCodigo: string;
  executionSyncVersion: number;
  serverTimestamp: string;
  resumen?: {
    actividades: number;
    mediciones: number;
    evidencias: number;
    pendientes: number;
  };
}

interface LockedOrdenRow {
  id_orden_servicio: number;
  id_estado_actual: number;
  edicion_tecnico_habilitada: boolean;
  id_tecnico_asignado: number | null;
  numero_orden: string;
  execution_sync_version: number;
  fecha_inicio_real: Date | null;
  fecha_fin_real: Date | null;
  observaciones_cierre: string | null;
  observaciones_tecnico: string | null;
  id_firma_tecnico: number | null;
  id_firma_cliente: number | null;
  id_equipo: number;
  metadata: unknown;
  codigo_estado: string | null;
  es_estado_final: boolean | null;
}

/**
 * Servicio de Cierre Final Armónico (Fase 3 · `POST /api/ordenes/:id/finalizar-commit`).
 *
 * Garantías Zero-Trust e Integridad:
 * 1. Bloqueo pesimista a nivel de fila `SELECT ... FROM ordenes_servicio ... FOR UPDATE OF o`
 *    para eliminar condiciones de carrera por doble clic o reintentos concurrentes.
 * 2. Validación de manifiesto de `clientUuids` contra PostgreSQL (`deleted_at IS NULL`):
 *    si falta cualquier registro delta, responde HTTP 409 `INCOMPLETE_MANIFEST` con el
 *    listado exacto `missingClientUuids` SIN cerrar la orden.
 * 3. CERO `deleteMany` destructivo: preserva 100% de actividades, mediciones, evidencias,
 *    lecturas históricas y pendientes gestionados desde Portal Admin.
 * 4. Cierre atómico de `ordenes_servicio` (`COMPLETADA`), `ordenes_equipos` (`COMPLETADO`),
 *    actualización monotónica de horómetros/contadores de uso, `historial_estados_orden`,
 *    revocación de `edicion_tecnico_habilitada` en resubidas y emisión SSE `order_finalized`.
 */
@Injectable()
export class FinalizarCommitService {
  private readonly logger = new Logger(FinalizarCommitService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeBus?: OrdenRealtimeBusService,
  ) {}

  private uniqueNonEmpty(list?: string[]): string[] {
    if (!Array.isArray(list) || list.length === 0) return [];
    return Array.from(
      new Set(list.map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v.length > 0)),
    );
  }

  private async resolveEmpleadoId(
    tx: Prisma.TransactionClient,
    actor: SyncDeltaActor,
  ): Promise<number | null> {
    if (actor.idEmpleado != null) return actor.idEmpleado;
    if (!actor.id) return null;
    const emp = await tx.empleados
      .findFirst({
        where: { persona: { usuarios: { id_usuario: actor.id } } },
        select: { id_empleado: true },
      })
      .catch(() => null);
    return emp?.id_empleado ?? null;
  }

  private parsearHora(horaStr?: string): { horas: number; minutos: number } | null {
    if (!horaStr) return null;
    const limpio = horaStr.trim();
    if (!limpio) return null;

    const esAM = /a\.?\s?m\.?$/i.test(limpio);
    const esPM = /p\.?\s?m\.?$/i.test(limpio);
    const soloNumeros = limpio.replace(/\s*(a\.?\s?m\.?|p\.?\s?m\.?)\s*$/i, '').trim();
    const partes = soloNumeros.split(':');
    if (partes.length < 2) return null;

    let horas = parseInt(partes[0], 10);
    const minutos = parseInt(partes[1], 10);
    if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;

    if (esAM || esPM) {
      if (horas === 12) horas = esAM ? 0 : 12;
      else if (esPM) horas += 12;
    }

    if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
    return { horas, minutos };
  }

  private esParametroHorometro(param?: string | null): boolean {
    if (!param) return false;
    const p = param
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (
      p.includes('horometro') ||
      p.includes('horo') ||
      p.includes('gen_horometro') ||
      p.includes('ciclo') ||
      p.includes('odometr') ||
      p.includes('kilometr') ||
      p.includes('contador') ||
      (p.includes('hora') &&
        (p.includes('trabaj') ||
          p.includes('operac') ||
          p.includes('motor') ||
          p.includes('actual') ||
          p.includes('acumul') ||
          p.includes('servicio')))
    );
  }

  private extraerNumeroLectura(rawVal: unknown): number | null {
    if (rawVal == null) return null;
    if (typeof rawVal === 'number') {
      return Number.isFinite(rawVal) && rawVal > 0 ? rawVal : null;
    }
    let rawStr = String(rawVal).trim();
    if (!rawStr) return null;
    if (/^\d{1,3}(\.\d{3})+$/.test(rawStr)) {
      rawStr = rawStr.replace(/\./g, '');
    } else {
      rawStr = rawStr.replace(',', '.');
    }
    const n = parseFloat(rawStr);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private extraerLecturaDeActividad(act: {
    respuesta_json?: unknown;
    observaciones?: string | null;
  }): number | null {
    if (act.respuesta_json != null) {
      let parsed: any = act.respuesta_json;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // conservar string plano
        }
      }
      const rawVal =
        typeof parsed === 'object' && parsed !== null
          ? (parsed.valor ?? parsed.lectura ?? parsed.horas)
          : parsed;
      const fromJson = this.extraerNumeroLectura(rawVal);
      if (fromJson != null) return fromJson;
    }

    if (act.observaciones) {
      const regex =
        /(?:HORAS|HOROMETRO|HORÓMETRO|CICLOS|KM|UPM|CONTADOR|Lectura registrada)\s*:\s*([\d.,]+)/i;
      const match = act.observaciones.match(regex);
      if (match?.[1]) {
        return this.extraerNumeroLectura(match[1]);
      }
    }
    return null;
  }

  private async sincronizarHorometrosMonotonico(
    tx: Prisma.TransactionClient,
    orderId: number,
    idEquipoPrincipal: number,
    usuarioId: number,
    now: Date,
  ): Promise<void> {
    const [ordenesEquipos, actividadesActivas, medicionesActivas] = await Promise.all([
      tx.ordenes_equipos.findMany({
        where: { id_orden_servicio: orderId },
        select: { id_orden_equipo: true, id_equipo: true },
      }),
      tx.actividades_ejecutadas.findMany({
        where: { id_orden_servicio: orderId, deleted_at: null },
        select: {
          id_orden_equipo: true,
          observaciones: true,
          respuesta_json: true,
          catalogo_actividades: {
            select: { rol_semantico: true, tipo_control_input: true },
          },
        },
      }),
      tx.mediciones_servicio.findMany({
        where: { id_orden_servicio: orderId, deleted_at: null },
        select: {
          id_orden_equipo: true,
          valor_numerico: true,
          parametros_medicion: {
            select: { nombre_parametro: true, codigo_parametro: true },
          },
        },
      }),
    ]);

    const targets: Array<{ idOrdenEquipo: number | null; idEquipo: number }> =
      ordenesEquipos.length > 0
        ? ordenesEquipos.map((oe) => ({
            idOrdenEquipo: oe.id_orden_equipo,
            idEquipo: oe.id_equipo,
          }))
        : [{ idOrdenEquipo: null, idEquipo: idEquipoPrincipal }];

    const equiposProcesados = new Set<number>();

    for (const target of targets) {
      if (!target.idEquipo || equiposProcesados.has(target.idEquipo)) continue;

      const actsEq = actividadesActivas.filter((a) =>
        target.idOrdenEquipo != null
          ? a.id_orden_equipo === target.idOrdenEquipo ||
            (targets.length === 1 && a.id_orden_equipo == null)
          : true,
      );

      let lectura: number | null = null;
      // 1) Priorizar actividades declarativas con rol semántico / control de contador
      for (const a of actsEq) {
        const esContador =
          a.catalogo_actividades?.rol_semantico === 'LECTURA_CONTADOR_ACTIVO' ||
          a.catalogo_actividades?.tipo_control_input === 'LECTURA_CONTADOR';
        if (esContador) {
          const val = this.extraerLecturaDeActividad(a);
          if (val != null) {
            lectura = val;
            break;
          }
        }
      }

      // 2) Fallback: medición de horómetro/contador del equipo
      if (lectura == null) {
        const medsEq = medicionesActivas.filter((m) =>
          target.idOrdenEquipo != null
            ? m.id_orden_equipo === target.idOrdenEquipo ||
              (targets.length === 1 && m.id_orden_equipo == null)
            : true,
        );
        for (const m of medsEq) {
          if (
            this.esParametroHorometro(m.parametros_medicion?.nombre_parametro) ||
            this.esParametroHorometro(m.parametros_medicion?.codigo_parametro)
          ) {
            const val = this.extraerNumeroLectura(
              m.valor_numerico != null ? Number(m.valor_numerico) : null,
            );
            if (val != null) {
              lectura = val;
              break;
            }
          }
        }
      }

      if (lectura == null || lectura <= 0) continue;
      equiposProcesados.add(target.idEquipo);

      const [equipo, ultimaLectura, lecturaMismaOrden] = await Promise.all([
        tx.equipos.findUnique({
          where: { id_equipo: target.idEquipo },
          select: {
            id_equipo: true,
            horas_actuales: true,
            lectura_uso_actual: true,
          },
        }),
        tx.lecturas_horometro.findFirst({
          where: { id_equipo: target.idEquipo },
          orderBy: { fecha_lectura: 'desc' },
          select: { horas_lectura: true, fecha_lectura: true },
        }),
        tx.lecturas_horometro.findFirst({
          where: { id_equipo: target.idEquipo, id_orden_servicio: orderId },
          orderBy: { fecha_lectura: 'desc' },
          select: { id_lectura: true, horas_lectura: true },
        }),
      ]);

      // Idempotencia: si esta misma orden ya registró exactamente el mismo valor, no duplicar fila
      if (lecturaMismaOrden && Number(lecturaMismaOrden.horas_lectura) === lectura) {
        continue;
      }

      const rawEquipoUso = equipo?.lectura_uso_actual ?? equipo?.horas_actuales;
      const horasActuales = rawEquipoUso != null ? Number(rawEquipoUso) : 0;
      const ultimaHoras = ultimaLectura ? Number(ultimaLectura.horas_lectura) : 0;
      const referenciaHoras = Math.max(horasActuales, ultimaHoras);

      if (referenciaHoras > 0 && lectura < referenciaHoras) {
        // Anti-rollback: registrar auditoría sin reducir el contador maestro del equipo
        await tx.lecturas_horometro.create({
          data: {
            id_equipo: target.idEquipo,
            id_orden_servicio: orderId,
            horas_lectura: lectura,
            fecha_lectura: now,
            tipo_lectura: 'MANTENIMIENTO',
            horas_transcurridas: 0,
            dias_transcurridos: null,
            registrado_por: usuarioId,
            observaciones: `Lectura de campo (${lectura}) menor al acumulado (${referenciaHoras}). Registrada como referencia sin retroceder hoja de vida.`,
          },
        });
        continue;
      }

      const valorBasePrevio = ultimaLectura
        ? Number(ultimaLectura.horas_lectura)
        : horasActuales > 0
          ? horasActuales
          : null;
      const horasTranscurridas =
        valorBasePrevio != null ? Math.max(0, lectura - valorBasePrevio) : null;
      const diasTranscurridos = ultimaLectura
        ? Math.floor(
            (now.getTime() - new Date(ultimaLectura.fecha_lectura).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      await tx.lecturas_horometro.create({
        data: {
          id_equipo: target.idEquipo,
          id_orden_servicio: orderId,
          horas_lectura: lectura,
          fecha_lectura: now,
          tipo_lectura: 'MANTENIMIENTO',
          horas_transcurridas: horasTranscurridas,
          dias_transcurridos: diasTranscurridos,
          registrado_por: usuarioId,
          observaciones: `Registrado automáticamente en cierre armónico orden #${orderId}`,
        },
      });

      await tx.equipos.update({
        where: { id_equipo: target.idEquipo },
        data: {
          horas_actuales: lectura,
          lectura_uso_actual: lectura,
          fecha_ultima_lectura_horas: now,
          fecha_ultima_lectura_uso: now,
        },
      });
    }
  }

  /**
   * Consolida y cierra una orden de servicio cuyos deltas ya fueron sincronizados.
   */
  async finalizarCommit(
    orderId: number,
    dto: FinalizarCommitDto,
    actor: SyncDeltaActor,
  ): Promise<FinalizarCommitResponse> {
    const now = new Date();

    const txResult = await this.prisma.$transaction(
      async (tx) => {
        // =====================================================================
        // 1. BLOQUEO PESIMISTA `FOR UPDATE OF o` (Anti doble clic / TOCTOU)
        // =====================================================================
        const lockedRows = await tx.$queryRaw<LockedOrdenRow[]>(Prisma.sql`
          SELECT
            o.id_orden_servicio,
            o.id_estado_actual,
            o.edicion_tecnico_habilitada,
            o.id_tecnico_asignado,
            o.numero_orden,
            o.execution_sync_version,
            o.fecha_inicio_real,
            o.fecha_fin_real,
            o.observaciones_cierre,
            o.observaciones_tecnico,
            o.id_firma_tecnico,
            o.id_firma_cliente,
            o.id_equipo,
            o.metadata,
            e.codigo_estado,
            e.es_estado_final
          FROM ordenes_servicio o
          LEFT JOIN estados_orden e ON e.id_estado = o.id_estado_actual
          WHERE o.id_orden_servicio = ${orderId}
          FOR UPDATE OF o
        `);

        const locked = lockedRows[0];
        if (!locked) {
          throw new NotFoundException(`Orden de servicio #${orderId} no encontrada`);
        }

        // =====================================================================
        // 2. AUTORIZACIÓN ZERO-TRUST + IDEMPOTENCIA EN ESTADO FINAL
        // =====================================================================
        const idEmpleadoTecnico = await this.resolveEmpleadoId(tx, actor);
        if (
          !actor.esAdmin &&
          locked.id_tecnico_asignado != null &&
          idEmpleadoTecnico != null &&
          locked.id_tecnico_asignado !== idEmpleadoTecnico
        ) {
          throw new ForbiddenException(
            `La orden ${locked.numero_orden} está asignada a otro técnico y no puede finalizarse desde esta cuenta.`,
          );
        }

        const codigoEstado = (locked.codigo_estado || '').toUpperCase();
        if (codigoEstado === 'CANCELADA') {
          throw new ConflictException(
            `La orden ${locked.numero_orden} está CANCELADA y no puede finalizarse.`,
          );
        }

        const esResubidaAutorizada =
          codigoEstado === 'COMPLETADA' && locked.edicion_tecnico_habilitada === true;

        if (codigoEstado === 'COMPLETADA' && !esResubidaAutorizada) {
          if (dto.esResubida === true) {
            throw new ForbiddenException(
              `La orden ${locked.numero_orden} ya está COMPLETADA y no tiene autorización vigente para edición técnica.`,
            );
          }

          // Idempotencia pura: doble clic o reintento de red tras commit exitoso previo
          this.logger.log(
            `✅ [FINALIZAR-COMMIT] Orden ${locked.numero_orden} (#${orderId}) ya COMPLETADA -> retorno idempotente`,
          );
          return {
            alreadyCompleted: true,
            esResubida: false,
            numeroOrden: locked.numero_orden,
            executionSyncVersion: locked.execution_sync_version ?? 0,
            resumen: undefined,
          };
        }

        if (locked.es_estado_final === true && !esResubidaAutorizada) {
          throw new ConflictException(
            `La orden ${locked.numero_orden} está en estado final (${codigoEstado}) y no puede finalizarse.`,
          );
        }

        // =====================================================================
        // 3. VALIDACIÓN DE MANIFIESTO DE `clientUuids` (Cero pérdida silenciosa)
        // =====================================================================
        const manifest = dto.manifest;
        const actUuids = this.uniqueNonEmpty(manifest?.actividadesUuids);
        const medUuids = this.uniqueNonEmpty(manifest?.medicionesUuids);
        const evUuids = this.uniqueNonEmpty(manifest?.evidenciasUuids);
        const pendUuids = this.uniqueNonEmpty(manifest?.pendientesUuids);
        const firmasTipos = this.uniqueNonEmpty(manifest?.firmasTipos).map((t) => t.toUpperCase());

        const [foundActs, foundMeds, foundEvs, foundPends] = await Promise.all([
          actUuids.length > 0
            ? tx.actividades_ejecutadas.findMany({
                where: {
                  id_orden_servicio: orderId,
                  deleted_at: null,
                  client_uuid: { in: actUuids },
                },
                select: { client_uuid: true },
              })
            : Promise.resolve([]),
          medUuids.length > 0
            ? tx.mediciones_servicio.findMany({
                where: {
                  id_orden_servicio: orderId,
                  deleted_at: null,
                  client_uuid: { in: medUuids },
                },
                select: { client_uuid: true },
              })
            : Promise.resolve([]),
          evUuids.length > 0
            ? tx.evidencias_fotograficas.findMany({
                where: {
                  id_orden_servicio: orderId,
                  deleted_at: null,
                  client_uuid: { in: evUuids },
                },
                select: { client_uuid: true },
              })
            : Promise.resolve([]),
          pendUuids.length > 0
            ? tx.ordenes_pendientes.findMany({
                where: {
                  id_orden_servicio: orderId,
                  deleted_at: null,
                  client_uuid: { in: pendUuids },
                },
                select: { client_uuid: true },
              })
            : Promise.resolve([]),
        ]);

        const actSet = new Set(foundActs.map((r) => r.client_uuid).filter(Boolean) as string[]);
        const medSet = new Set(foundMeds.map((r) => r.client_uuid).filter(Boolean) as string[]);
        const evSet = new Set(foundEvs.map((r) => r.client_uuid).filter(Boolean) as string[]);
        const pendSet = new Set(foundPends.map((r) => r.client_uuid).filter(Boolean) as string[]);

        const missingFirmas: string[] = [];
        if (firmasTipos.includes('TECNICO') && locked.id_firma_tecnico == null) {
          missingFirmas.push('TECNICO');
        }
        if (firmasTipos.includes('CLIENTE') && locked.id_firma_cliente == null) {
          missingFirmas.push('CLIENTE');
        }

        const missingClientUuids: MissingManifestItems = {
          actividades: actUuids.filter((u) => !actSet.has(u)),
          mediciones: medUuids.filter((u) => !medSet.has(u)),
          evidencias: evUuids.filter((u) => !evSet.has(u)),
          pendientes: pendUuids.filter((u) => !pendSet.has(u)),
          firmas: missingFirmas,
        };

        const hasMissing =
          missingClientUuids.actividades.length > 0 ||
          missingClientUuids.mediciones.length > 0 ||
          missingClientUuids.evidencias.length > 0 ||
          missingClientUuids.pendientes.length > 0 ||
          missingClientUuids.firmas.length > 0;

        if (hasMissing) {
          this.logger.warn(
            `⚠️ [FINALIZAR-COMMIT] Manifiesto incompleto OS ${locked.numero_orden} (#${orderId}): ` +
              `acts=${missingClientUuids.actividades.length}, meds=${missingClientUuids.mediciones.length}, ` +
              `evs=${missingClientUuids.evidencias.length}, pends=${missingClientUuids.pendientes.length}, ` +
              `firmas=${missingClientUuids.firmas.length}`,
          );
          throw new ConflictException({
            statusCode: 409,
            code: 'INCOMPLETE_MANIFEST',
            message:
              'Faltan registros delta por sincronizar antes de finalizar la orden. Reintenta el drenado incremental.',
            missingClientUuids,
          });
        }

        // =====================================================================
        // 4. CONSOLIDACIÓN NO DESTRUCTIVA (PROHIBIDO `deleteMany`!)
        // =====================================================================
        const estadoCompletada = await tx.estados_orden.findFirst({
          where: { codigo_estado: 'COMPLETADA' },
          select: { id_estado: true },
        });
        if (!estadoCompletada) {
          throw new InternalServerErrorException('Estado COMPLETADA no encontrado en catálogo');
        }

        const fechaBase = locked.fecha_inicio_real ? new Date(locked.fecha_inicio_real) : now;
        let fechaInicioReal: Date | undefined = locked.fecha_inicio_real
          ? new Date(locked.fecha_inicio_real)
          : undefined;
        let fechaFinReal: Date = now;

        if (dto.horaEntrada) {
          const parsedIn = this.parsearHora(dto.horaEntrada);
          if (parsedIn) {
            fechaInicioReal = new Date(
              fechaBase.getFullYear(),
              fechaBase.getMonth(),
              fechaBase.getDate(),
              parsedIn.horas,
              parsedIn.minutos,
              0,
              0,
            );
          }
        }
        if (dto.horaSalida) {
          const parsedOut = this.parsearHora(dto.horaSalida);
          if (parsedOut) {
            fechaFinReal = new Date(
              fechaBase.getFullYear(),
              fechaBase.getMonth(),
              fechaBase.getDate(),
              parsedOut.horas,
              parsedOut.minutos,
              0,
              0,
            );
            if (fechaInicioReal && fechaFinReal < fechaInicioReal) {
              fechaFinReal = new Date(fechaFinReal.getTime() + 24 * 60 * 60 * 1000);
            }
          }
        }

        // En resubida autorizada, preservar tiempos originales históricos del servicio
        if (
          esResubidaAutorizada &&
          locked.fecha_inicio_real != null &&
          locked.fecha_fin_real != null
        ) {
          fechaInicioReal = new Date(locked.fecha_inicio_real);
          fechaFinReal = new Date(locked.fecha_fin_real);
        }

        let duracionMinutos: number | undefined;
        if (fechaInicioReal) {
          const diffMin = Math.round((fechaFinReal.getTime() - fechaInicioReal.getTime()) / 60000);
          if (diffMin >= 0 && diffMin <= 1440) {
            duracionMinutos = diffMin;
          }
        }

        const observacionesFinal =
          dto.observaciones !== undefined
            ? dto.observaciones
            : (locked.observaciones_cierre ??
              locked.observaciones_tecnico ??
              'Servicio completado.');

        const metadataActual =
          locked.metadata && typeof locked.metadata === 'object' && !Array.isArray(locked.metadata)
            ? { ...(locked.metadata as Record<string, unknown>) }
            : {};
        if (dto.horaEntrada) metadataActual.hora_entrada = dto.horaEntrada;
        if (dto.horaSalida) metadataActual.hora_salida = dto.horaSalida;
        if (dto.razonFalla !== undefined) metadataActual.razon_falla = dto.razonFalla;
        metadataActual.finalizacion_v2 = true;
        if (dto.deviceId) metadataActual.finalizacion_device_id = dto.deviceId;

        const updatedOrden = await tx.ordenes_servicio.update({
          where: { id_orden_servicio: orderId },
          data: {
            id_estado_actual: estadoCompletada.id_estado,
            fecha_cambio_estado: now,
            fecha_inicio_real: fechaInicioReal,
            fecha_fin_real: fechaFinReal,
            duracion_minutos: duracionMinutos,
            observaciones_cierre: observacionesFinal,
            ...(dto.observaciones !== undefined
              ? { observaciones_tecnico: dto.observaciones }
              : {}),
            // Revocar permiso temporal de edición tras completar la resubida
            edicion_tecnico_habilitada: false,
            ultima_actividad_tecnico_at: now,
            execution_sync_version: { increment: 1 },
            modificado_por: actor.id,
            fecha_modificacion: now,
            metadata: metadataActual as any,
          },
          select: { execution_sync_version: true },
        });

        // Cerrar equipos de la orden sin destruir registros
        await tx.ordenes_equipos.updateMany({
          where: { id_orden_servicio: orderId },
          data: {
            estado: 'COMPLETADO',
            ...(esResubidaAutorizada ? {} : { fecha_fin: now }),
          },
        });

        // Sincronizar contadores / horómetros de manera estrictamente monotónica (sin deleteMany)
        await this.sincronizarHorometrosMonotonico(tx, orderId, locked.id_equipo, actor.id, now);

        // Registrar trazabilidad en historial_estados_orden
        await tx.historial_estados_orden.create({
          data: {
            id_orden_servicio: orderId,
            id_estado_anterior: locked.id_estado_actual,
            id_estado_nuevo: estadoCompletada.id_estado,
            accion: esResubidaAutorizada ? 'RESUBIDA_TECNICO' : 'FINALIZAR',
            motivo_cambio: esResubidaAutorizada
              ? 'Corrección autorizada por el administrador (Cierre Armónico v2)'
              : 'Finalización armónica de orden de servicio (v2)',
            observaciones: esResubidaAutorizada
              ? `Orden corregida y resubida. ${observacionesFinal}`
              : `Orden finalizada. ${observacionesFinal}`,
            fecha_cambio: now,
            realizado_por: actor.id,
            metadata: crearMetadataObservacionesCierre({
              origen: 'FINALIZACION_MOVIL',
              anterior: locked.observaciones_cierre,
              nueva: observacionesFinal,
              extra: {
                evento: esResubidaAutorizada ? 'RESUBIDA_TECNICO' : 'FINALIZACION_TECNICO',
                pipeline: 'FINALIZAR_COMMIT_V2',
                device_id: dto.deviceId ?? null,
              },
            }) as any,
          },
        });

        // Contar totales activos reales para respuesta
        const [totalActs, totalMeds, totalEvs, totalPends] = await Promise.all([
          tx.actividades_ejecutadas.count({
            where: { id_orden_servicio: orderId, deleted_at: null },
          }),
          tx.mediciones_servicio.count({
            where: { id_orden_servicio: orderId, deleted_at: null },
          }),
          tx.evidencias_fotograficas.count({
            where: { id_orden_servicio: orderId, deleted_at: null },
          }),
          tx.ordenes_pendientes.count({
            where: { id_orden_servicio: orderId, deleted_at: null },
          }),
        ]);

        return {
          alreadyCompleted: false,
          esResubida: esResubidaAutorizada,
          numeroOrden: locked.numero_orden,
          executionSyncVersion: updatedOrden.execution_sync_version,
          resumen: {
            actividades: totalActs,
            mediciones: totalMeds,
            evidencias: totalEvs,
            pendientes: totalPends,
          },
        };
      },
      { timeout: 25000, maxWait: 10000 },
    );

    if (!txResult.alreadyCompleted && this.realtimeBus) {
      this.realtimeBus.emitOrdenEvent({
        type: 'order_finalized',
        orderId,
        numeroOrden: txResult.numeroOrden,
        executionSyncVersion: txResult.executionSyncVersion,
        sections: [
          'orden',
          'actividades',
          'mediciones',
          'evidencias',
          'pendientes',
          'firmas',
          'progreso',
        ],
        timestamp: now.toISOString(),
        source: 'MOBILE_DELTA',
      });
    }

    this.logger.log(
      `✅ [FINALIZAR-COMMIT] OS ${txResult.numeroOrden} (#${orderId}) cerrada · ` +
        `alreadyCompleted=${txResult.alreadyCompleted} · esResubida=${txResult.esResubida} · v=${txResult.executionSyncVersion}`,
    );

    return {
      success: true,
      alreadyCompleted: txResult.alreadyCompleted,
      esResubida: txResult.esResubida,
      orderId,
      numeroOrden: txResult.numeroOrden,
      estadoCodigo: 'COMPLETADA',
      executionSyncVersion: txResult.executionSyncVersion,
      serverTimestamp: now.toISOString(),
      ...(txResult.resumen ? { resumen: txResult.resumen } : {}),
    };
  }
}
