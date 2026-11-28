import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  estado_actividad_enum,
  nivel_alerta_enum,
  origen_pendiente_enum,
  prioridad_enum,
  tipo_evidencia_enum,
  tipo_firma_digital_enum,
} from '@prisma/client';
import { createHash } from 'crypto';
import {
  evaluarValorContraRangos,
  extraerConfigEquipoDeOrden,
  resolverParametroConConfig,
} from '../../config-parametros/parametros-override.helper';
import { CloudinaryAccount } from '../../storage/cloudinary.service';
import { MediaUploadStrategyService } from '../../storage/media-upload-strategy.service';
import { PrepareEvidenciasUploadDto, SyncDeltaDto } from '../dto/sync-delta.dto';
import { OrdenRealtimeBusService, OrdenRealtimeSection } from './orden-realtime-bus.service';

export interface SyncDeltaActor {
  id: number;
  idEmpleado?: number | null;
  esAdmin?: boolean;
}

export type DeltaAckStatus = 'APPLIED' | 'STALE_IGNORED' | 'DELETED' | 'SKIPPED';

export interface SyncDeltaAck {
  entityType: 'ORDEN' | 'ACTIVIDAD' | 'PENDIENTE' | 'MEDICION' | 'EVIDENCIA' | 'FIRMA';
  clientUuid: string;
  serverId: number | null;
  acceptedVersion: number;
  status: DeltaAckStatus;
  reason?: string;
}

export interface SyncDeltaResponse {
  success: true;
  orderId: number;
  numeroOrden: string;
  executionSyncVersion: number;
  serverTimestamp: string;
  sectionsUpdated: string[];
  acks: SyncDeltaAck[];
}

export interface PreparedEvidenciaUploadResponseItem {
  clientUuid: string;
  hashSha256: string;
  alreadyUploaded: boolean;
  provider: 'CLOUDINARY' | 'R2';
  strategy: 'CLOUDINARY_MULTIPART' | 'R2_PUT' | 'ALREADY_UPLOADED';
  uploadUrl?: string;
  storageKey?: string;
  publicUrl?: string;
  existingEvidenciaId?: number;
  expiresAt?: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
}

const VALID_ESTADOS_ACTIVIDAD = new Set<string>(Object.values(estado_actividad_enum));
const VALID_TIPOS_EVIDENCIA = new Set<string>(Object.values(tipo_evidencia_enum));
const VALID_PRIORIDADES = new Set<string>(Object.values(prioridad_enum));
const VALID_ORIGENES_PENDIENTE = new Set<string>(Object.values(origen_pendiente_enum));

/**
 * Servicio Motor de Sincronización Delta Idempotente + Media Directa Firmada (Fase 1).
 *
 * Blindajes aplicados:
 * 1. Validación estricta de propiedad del técnico, estado editable y pertenencia de `idOrdenEquipo` (0% IDOR).
 * 2. Orden transaccional estricto:
 *      ordenPatch -> actividades & pendientes -> mediciones -> evidenciasMeta -> firmas
 *    resolviendo `actividadClientUuid -> id_actividad_ejecutada` en la misma transacción.
 * 3. Upsert monotónico: `incoming.syncVersion < existing.sync_version` retorna `STALE_IGNORED`
 *    sin sobreescribir trabajo más reciente.
 * 4. Preserva `valorNumerico === 0` en mediciones y protege pendientes ya gestionados por Admin.
 * 5. `prepareEvidenciasUpload`: deduplicación `SHA-256` + firma Cloudinary Just-In-Time (sin Base64).
 */
@Injectable()
export class SyncDeltaService {
  private readonly logger = new Logger(SyncDeltaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUploadStrategy: MediaUploadStrategyService,
    @Optional() private readonly realtimeBus?: OrdenRealtimeBusService,
  ) {}

  private normalizeEstadoActividad(raw?: string | null): estado_actividad_enum | null {
    if (!raw) return null;
    const upper = raw.trim().toUpperCase();
    if (upper === 'N/A') return estado_actividad_enum.NA;
    if (VALID_ESTADOS_ACTIVIDAD.has(upper)) {
      return upper as estado_actividad_enum;
    }
    return estado_actividad_enum.B;
  }

  private normalizeTipoEvidencia(raw?: string | null): tipo_evidencia_enum {
    if (!raw) return tipo_evidencia_enum.GENERAL;
    const upper = raw.trim().toUpperCase();
    if (upper === 'ACTIVIDAD') return tipo_evidencia_enum.DURANTE;
    if (upper === 'DAÑO' || upper === 'DANO') return tipo_evidencia_enum.DA_O;
    if (VALID_TIPOS_EVIDENCIA.has(upper)) {
      return upper as tipo_evidencia_enum;
    }
    return tipo_evidencia_enum.GENERAL;
  }

  private normalizePrioridad(raw?: string | null): prioridad_enum {
    if (!raw) return prioridad_enum.NORMAL;
    const upper = raw.trim().toUpperCase();
    if (VALID_PRIORIDADES.has(upper)) return upper as prioridad_enum;
    return prioridad_enum.NORMAL;
  }

  private normalizeOrigenPendiente(raw?: string | null): origen_pendiente_enum {
    if (!raw) return origen_pendiente_enum.MANUAL;
    const upper = raw.trim().toUpperCase();
    if (VALID_ORIGENES_PENDIENTE.has(upper)) return upper as origen_pendiente_enum;
    return origen_pendiente_enum.MANUAL;
  }

  private parseOptionalDate(iso?: string | null): Date | null {
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private resolveCloudinaryAccount(orden: any): CloudinaryAccount | undefined {
    const tipoNombre = (
      orden?.equipos?.tipos_equipo?.nombre_tipo ||
      orden?.equipos?.nombre_equipo ||
      ''
    ).toUpperCase();
    if (tipoNombre.includes('BOMBA')) return 'BOMBAS';
    if (tipoNombre.includes('PLANTA') || tipoNombre.includes('GENERADOR')) return 'PLANTAS';
    return undefined;
  }

  private async resolveEmpleadoId(actor: SyncDeltaActor): Promise<number | null> {
    if (actor.idEmpleado != null) return actor.idEmpleado;
    if (!actor.id) return null;
    const emp = await this.prisma.empleados
      .findFirst({
        where: { persona: { usuarios: { id_usuario: actor.id } } },
        select: { id_empleado: true },
      })
      .catch(() => null);
    return emp?.id_empleado ?? null;
  }

  private async loadAndAuthorizeOrder(orderId: number, actor: SyncDeltaActor) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: orderId },
      include: {
        estados_orden: true,
        ordenes_equipos: {
          include: {
            equipos: {
              include: { tipos_equipo: true },
            },
          },
        },
        equipos: {
          include: { tipos_equipo: true },
        },
        clientes: {
          select: { id_cliente: true, id_persona: true },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de servicio #${orderId} no encontrada`);
    }

    const idEmpleadoTecnico = await this.resolveEmpleadoId(actor);
    if (
      !actor.esAdmin &&
      orden.id_tecnico_asignado != null &&
      idEmpleadoTecnico != null &&
      orden.id_tecnico_asignado !== idEmpleadoTecnico
    ) {
      throw new ForbiddenException(
        `La orden ${orden.numero_orden} está asignada a otro técnico y no puede sincronizarse desde esta cuenta.`,
      );
    }

    const codigoEstado = (orden.estados_orden?.codigo_estado || '').toUpperCase();
    if (codigoEstado === 'CANCELADA') {
      throw new ConflictException(`La orden ${orden.numero_orden} está CANCELADA.`);
    }

    const esCompletadaSinPermiso =
      (codigoEstado === 'COMPLETADA' || codigoEstado === 'CERRADA') &&
      orden.edicion_tecnico_habilitada !== true;
    if (esCompletadaSinPermiso) {
      throw new ConflictException(
        `La orden ${orden.numero_orden} ya está ${codigoEstado} y no tiene habilitada la edición técnica.`,
      );
    }

    const validOrdenEquipos = new Set<number>(
      (orden.ordenes_equipos || []).map((oe) => oe.id_orden_equipo),
    );

    return { orden, idEmpleadoTecnico, codigoEstado, validOrdenEquipos };
  }

  private assertOrdenEquipoBelongs(
    idOrdenEquipo: number | null | undefined,
    validOrdenEquipos: Set<number>,
    orderId: number,
  ): number | null {
    if (idOrdenEquipo === undefined || idOrdenEquipo === null) return null;
    if (!validOrdenEquipos.has(idOrdenEquipo)) {
      throw new BadRequestException(
        `idOrdenEquipo=${idOrdenEquipo} no pertenece a la orden de servicio #${orderId}.`,
      );
    }
    return idOrdenEquipo;
  }

  /**
   * Carril 2: `POST /api/ordenes/:id/evidencias/prepare-upload`
   *
   * Verifica deduplicación por `client_uuid` o `(id_orden_servicio, hash_sha256)`.
   * Si la foto ya existe en BD, retorna `alreadyUploaded: true` (0 bytes a transmitir).
   * Si es nueva, emite una firma Just-In-Time fresca vía `MediaUploadStrategyService`
   * (Cloudinary por defecto, R2 opcional).
   */
  async prepareEvidenciasUpload(
    orderId: number,
    dto: PrepareEvidenciasUploadDto,
    actor: SyncDeltaActor,
  ): Promise<{
    success: true;
    orderId: number;
    provider: 'CLOUDINARY' | 'R2';
    items: PreparedEvidenciaUploadResponseItem[];
  }> {
    const { orden, validOrdenEquipos } = await this.loadAndAuthorizeOrder(orderId, actor);
    const activeProvider = this.mediaUploadStrategy.getActiveProvider();
    const cloudinaryAccount = this.resolveCloudinaryAccount(orden);

    const results: PreparedEvidenciaUploadResponseItem[] = [];

    for (const item of dto.items || []) {
      this.assertOrdenEquipoBelongs(item.idOrdenEquipo, validOrdenEquipos, orderId);
      const cleanHash = item.hashSha256.trim().toLowerCase();

      // 1. Dedup por client_uuid o por (id_orden_servicio, hash_sha256) activo
      const existing = await this.prisma.evidencias_fotograficas.findFirst({
        where: {
          id_orden_servicio: orderId,
          deleted_at: null,
          OR: [{ client_uuid: item.clientUuid }, { hash_sha256: cleanHash }],
        },
        select: {
          id_evidencia: true,
          ruta_archivo: true,
          storage_provider: true,
          storage_key: true,
        },
        orderBy: { id_evidencia: 'desc' },
      });

      if (existing && existing.ruta_archivo && existing.ruta_archivo.trim().length > 0) {
        results.push({
          clientUuid: item.clientUuid,
          hashSha256: cleanHash,
          alreadyUploaded: true,
          provider: existing.storage_provider === 'R2' ? 'R2' : 'CLOUDINARY',
          strategy: 'ALREADY_UPLOADED',
          storageKey: existing.storage_key || undefined,
          publicUrl: existing.ruta_archivo,
          existingEvidenciaId: existing.id_evidencia,
        });
        continue;
      }

      // 2. Generar firma criptográfica Just-In-Time (sin Base64 en API)
      const instruction = await this.mediaUploadStrategy.prepareDirectUpload({
        numeroOrden: orden.numero_orden,
        hashSha256: cleanHash,
        mimeType: item.mimeType,
        tipoEvidencia: item.tipoEvidencia,
        cloudinaryAccount,
      });

      results.push({
        clientUuid: item.clientUuid,
        hashSha256: cleanHash,
        alreadyUploaded: instruction.alreadyUploaded,
        provider: instruction.provider,
        strategy: instruction.strategy,
        uploadUrl: instruction.uploadUrl,
        storageKey: instruction.storageKey,
        publicUrl: instruction.publicUrl,
        expiresAt: instruction.expiresAt,
        fields: instruction.fields,
        headers: instruction.headers,
      });
    }

    return {
      success: true,
      orderId,
      provider: activeProvider,
      items: results,
    };
  }

  /**
   * Carril 1: `POST /api/ordenes/:id/sync-delta`
   *
   * Upsert monotónico idempotente transaccional con orden estricto:
   *   1) `ordenPatch`
   *   2) `actividades` y `pendientes`
   *   3) `mediciones`
   *   4) `evidenciasMeta` (resuelve `actividadClientUuid -> id_actividad_ejecutada`)
   *   5) `firmas`
   */
  async syncDelta(
    orderId: number,
    dto: SyncDeltaDto,
    actor: SyncDeltaActor,
  ): Promise<SyncDeltaResponse> {
    const { orden, idEmpleadoTecnico, codigoEstado, validOrdenEquipos } =
      await this.loadAndAuthorizeOrder(orderId, actor);

    const now = new Date();
    const acks: SyncDeltaAck[] = [];
    const sectionsSet = new Set<string>();

    // Validar previamente todos los idOrdenEquipo para fallar rápido antes de abrir tx
    for (const a of dto.actividades || []) {
      this.assertOrdenEquipoBelongs(a.idOrdenEquipo, validOrdenEquipos, orderId);
    }
    for (const p of dto.pendientes || []) {
      this.assertOrdenEquipoBelongs(p.idOrdenEquipo, validOrdenEquipos, orderId);
    }
    for (const m of dto.mediciones || []) {
      this.assertOrdenEquipoBelongs(m.idOrdenEquipo, validOrdenEquipos, orderId);
    }
    for (const e of dto.evidenciasMeta || []) {
      this.assertOrdenEquipoBelongs(e.idOrdenEquipo, validOrdenEquipos, orderId);
    }

    const txResult = await this.prisma.$transaction(
      async (tx) => {
        // Mapa en memoria dentro de la transacción: actividadClientUuid -> id_actividad_ejecutada
        const actividadUuidToServerId = new Map<string, number>();

        // =====================================================================
        // PASO 1: ordenPatch (inicio automático a EN_PROCESO + observaciones/horas)
        // =====================================================================
        const metadataActual =
          orden.metadata && typeof orden.metadata === 'object' && !Array.isArray(orden.metadata)
            ? { ...(orden.metadata as Record<string, unknown>) }
            : {};
        let metadataChanged = false;
        const ordenUpdateData: Record<string, unknown> = {
          ultima_actividad_tecnico_at: now,
          execution_sync_version: { increment: 1 },
        };

        if (dto.ordenPatch) {
          const patch = dto.ordenPatch;

          if (
            patch.iniciarSiAsignada &&
            ['ASIGNADA', 'PROGRAMADA', 'APROBADA'].includes(codigoEstado)
          ) {
            const estadoEnProceso = await tx.estados_orden.findFirst({
              where: { codigo_estado: 'EN_PROCESO' },
              select: { id_estado: true },
            });
            if (estadoEnProceso) {
              ordenUpdateData.id_estado_actual = estadoEnProceso.id_estado;
              ordenUpdateData.fecha_cambio_estado = now;
              if (!orden.fecha_inicio_real) {
                ordenUpdateData.fecha_inicio_real =
                  this.parseOptionalDate(patch.fechaInicioReal) ?? now;
              }
              await tx.historial_estados_orden.create({
                data: {
                  id_orden_servicio: orderId,
                  id_estado_anterior: orden.id_estado_actual,
                  id_estado_nuevo: estadoEnProceso.id_estado,
                  motivo_cambio: 'Inicio de ejecución sincronizado desde app móvil (Delta Sync)',
                  observaciones: dto.deviceId ? `Dispositivo: ${dto.deviceId}` : null,
                  accion: 'INICIAR_EJECUCION',
                  realizado_por: actor.id,
                  fecha_cambio: now,
                },
              });
              sectionsSet.add('estado');
            }
          }

          if (patch.observacionesTecnico !== undefined) {
            ordenUpdateData.observaciones_tecnico = patch.observacionesTecnico;
            sectionsSet.add('observaciones');
          }
          if (patch.trabajoRealizado !== undefined) {
            ordenUpdateData.trabajo_realizado = patch.trabajoRealizado;
            sectionsSet.add('observaciones');
          }
          if (patch.razonFalla !== undefined) {
            metadataActual.razon_falla = patch.razonFalla;
            metadataChanged = true;
            sectionsSet.add('observaciones');
          }
          if (patch.horaEntrada !== undefined) {
            metadataActual.hora_entrada = patch.horaEntrada;
            metadataChanged = true;
            sectionsSet.add('orden');
          }
          if (patch.horaSalida !== undefined) {
            metadataActual.hora_salida = patch.horaSalida;
            metadataChanged = true;
            sectionsSet.add('orden');
          }
          if (metadataChanged) {
            ordenUpdateData.metadata = metadataActual;
          }
        }

        // =====================================================================
        // PASO 2A: actividades (ANTES de evidenciasMeta!)
        // =====================================================================
        if (dto.actividades && dto.actividades.length > 0) {
          sectionsSet.add('actividades');

          for (const item of dto.actividades) {
            const idOrdenEquipo = item.idOrdenEquipo ?? null;
            let existing = await tx.actividades_ejecutadas.findUnique({
              where: { client_uuid: item.clientUuid },
            });

            if (!existing && item.idActividadCatalogo != null) {
              existing = await tx.actividades_ejecutadas.findFirst({
                where: {
                  id_orden_servicio: orderId,
                  id_orden_equipo: idOrdenEquipo,
                  id_actividad_catalogo: item.idActividadCatalogo,
                  deleted_at: null,
                },
                orderBy: { id_actividad_ejecutada: 'desc' },
              });
            }

            // Guarda monotónica
            if (existing && item.syncVersion < existing.sync_version) {
              actividadUuidToServerId.set(item.clientUuid, existing.id_actividad_ejecutada);
              acks.push({
                entityType: 'ACTIVIDAD',
                clientUuid: item.clientUuid,
                serverId: existing.id_actividad_ejecutada,
                acceptedVersion: existing.sync_version,
                status: 'STALE_IGNORED',
              });
              continue;
            }

            if (item.deleted) {
              if (existing) {
                await tx.actividades_ejecutadas.update({
                  where: { id_actividad_ejecutada: existing.id_actividad_ejecutada },
                  data: {
                    deleted_at: now,
                    sync_version: item.syncVersion,
                    updated_by_device_at: now,
                  },
                });
                acks.push({
                  entityType: 'ACTIVIDAD',
                  clientUuid: item.clientUuid,
                  serverId: existing.id_actividad_ejecutada,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              } else {
                acks.push({
                  entityType: 'ACTIVIDAD',
                  clientUuid: item.clientUuid,
                  serverId: null,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              }
              continue;
            }

            const estadoNorm = this.normalizeEstadoActividad(item.estado);
            const fechaEjec = this.parseOptionalDate(item.fechaEjecucion) ?? now;

            if (existing) {
              const updated = await tx.actividades_ejecutadas.update({
                where: { id_actividad_ejecutada: existing.id_actividad_ejecutada },
                data: {
                  client_uuid: existing.client_uuid ?? item.clientUuid,
                  id_orden_equipo: idOrdenEquipo,
                  id_actividad_catalogo:
                    item.idActividadCatalogo !== undefined
                      ? item.idActividadCatalogo
                      : existing.id_actividad_catalogo,
                  descripcion_manual:
                    item.descripcionManual !== undefined
                      ? item.descripcionManual
                      : existing.descripcion_manual,
                  sistema: item.sistema !== undefined ? item.sistema : existing.sistema,
                  orden_secuencia:
                    item.ordenSecuencia !== undefined
                      ? item.ordenSecuencia
                      : existing.orden_secuencia,
                  estado: estadoNorm,
                  observaciones:
                    item.observaciones !== undefined ? item.observaciones : existing.observaciones,
                  respuesta_json:
                    item.respuestaJson !== undefined
                      ? (item.respuestaJson as any)
                      : existing.respuesta_json,
                  ejecutada: estadoNorm !== null || item.respuestaJson != null,
                  fecha_ejecucion: fechaEjec,
                  ejecutada_por: idEmpleadoTecnico ?? existing.ejecutada_por,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? existing.payload_hash,
                  updated_by_device_at: now,
                  deleted_at: null,
                },
              });
              actividadUuidToServerId.set(item.clientUuid, updated.id_actividad_ejecutada);
              acks.push({
                entityType: 'ACTIVIDAD',
                clientUuid: item.clientUuid,
                serverId: updated.id_actividad_ejecutada,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            } else {
              const created = await tx.actividades_ejecutadas.create({
                data: {
                  id_orden_servicio: orderId,
                  id_orden_equipo: idOrdenEquipo,
                  id_actividad_catalogo: item.idActividadCatalogo ?? null,
                  descripcion_manual: item.descripcionManual ?? null,
                  sistema: item.sistema ?? 'GENERAL',
                  orden_secuencia: item.ordenSecuencia ?? null,
                  estado: estadoNorm,
                  observaciones: item.observaciones ?? null,
                  respuesta_json: (item.respuestaJson as any) ?? undefined,
                  ejecutada: estadoNorm !== null || item.respuestaJson != null,
                  fecha_ejecucion: fechaEjec,
                  ejecutada_por: idEmpleadoTecnico,
                  client_uuid: item.clientUuid,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? null,
                  updated_by_device_at: now,
                },
              });
              actividadUuidToServerId.set(item.clientUuid, created.id_actividad_ejecutada);
              acks.push({
                entityType: 'ACTIVIDAD',
                clientUuid: item.clientUuid,
                serverId: created.id_actividad_ejecutada,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            }
          }
        }

        // =====================================================================
        // PASO 2B: pendientes (ANTES de mediciones y evidenciasMeta!)
        // =====================================================================
        if (dto.pendientes && dto.pendientes.length > 0) {
          sectionsSet.add('pendientes');

          for (const item of dto.pendientes) {
            const idOrdenEquipo = item.idOrdenEquipo ?? null;
            const existing = await tx.ordenes_pendientes.findUnique({
              where: { client_uuid: item.clientUuid },
            });

            if (existing && item.syncVersion < existing.sync_version) {
              acks.push({
                entityType: 'PENDIENTE',
                clientUuid: item.clientUuid,
                serverId: existing.id_orden_pendiente,
                acceptedVersion: existing.sync_version,
                status: 'STALE_IGNORED',
              });
              continue;
            }

            if (item.deleted) {
              if (existing) {
                // Proteger pendientes que el Admin ya puso EN_GESTION o RESUELTO
                if (existing.estado !== 'PENDIENTE') {
                  acks.push({
                    entityType: 'PENDIENTE',
                    clientUuid: item.clientUuid,
                    serverId: existing.id_orden_pendiente,
                    acceptedVersion: existing.sync_version,
                    status: 'SKIPPED',
                    reason: `Pendiente ya gestionado por Admin (${existing.estado})`,
                  });
                  continue;
                }
                await tx.ordenes_pendientes.update({
                  where: { id_orden_pendiente: existing.id_orden_pendiente },
                  data: {
                    deleted_at: now,
                    sync_version: item.syncVersion,
                  },
                });
                acks.push({
                  entityType: 'PENDIENTE',
                  clientUuid: item.clientUuid,
                  serverId: existing.id_orden_pendiente,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              } else {
                acks.push({
                  entityType: 'PENDIENTE',
                  clientUuid: item.clientUuid,
                  serverId: null,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              }
              continue;
            }

            const descripcionLimpia = (item.descripcion || '').trim();
            if (!descripcionLimpia && !existing) {
              acks.push({
                entityType: 'PENDIENTE',
                clientUuid: item.clientUuid,
                serverId: null,
                acceptedVersion: item.syncVersion,
                status: 'SKIPPED',
                reason: 'Descripción vacía',
              });
              continue;
            }

            const oeMatch = idOrdenEquipo
              ? orden.ordenes_equipos.find((oe) => oe.id_orden_equipo === idOrdenEquipo)
              : null;
            const idEquipoTarget = item.idEquipo ?? oeMatch?.id_equipo ?? orden.id_equipo;

            if (existing) {
              const updated = await tx.ordenes_pendientes.update({
                where: { id_orden_pendiente: existing.id_orden_pendiente },
                data: {
                  id_orden_equipo: idOrdenEquipo,
                  id_equipo: idEquipoTarget,
                  id_pendiente_catalogo:
                    item.idPendienteCatalogo !== undefined
                      ? item.idPendienteCatalogo
                      : existing.id_pendiente_catalogo,
                  descripcion: descripcionLimpia || existing.descripcion,
                  origen: item.origen
                    ? this.normalizeOrigenPendiente(item.origen)
                    : existing.origen,
                  prioridad: item.prioridad
                    ? this.normalizePrioridad(item.prioridad)
                    : existing.prioridad,
                  observaciones:
                    item.observaciones !== undefined ? item.observaciones : existing.observaciones,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? existing.payload_hash,
                  deleted_at: null,
                },
              });
              acks.push({
                entityType: 'PENDIENTE',
                clientUuid: item.clientUuid,
                serverId: updated.id_orden_pendiente,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            } else {
              const created = await tx.ordenes_pendientes.create({
                data: {
                  id_orden_servicio: orderId,
                  id_cliente: orden.id_cliente,
                  id_equipo: idEquipoTarget,
                  id_orden_equipo: idOrdenEquipo,
                  id_pendiente_catalogo: item.idPendienteCatalogo ?? null,
                  alcance: idOrdenEquipo ? 'EQUIPO' : 'ORDEN',
                  descripcion: descripcionLimpia,
                  origen: this.normalizeOrigenPendiente(item.origen),
                  prioridad: this.normalizePrioridad(item.prioridad),
                  estado: 'PENDIENTE',
                  observaciones: item.observaciones ?? null,
                  creado_por: idEmpleadoTecnico,
                  client_uuid: item.clientUuid,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? null,
                },
              });
              acks.push({
                entityType: 'PENDIENTE',
                clientUuid: item.clientUuid,
                serverId: created.id_orden_pendiente,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            }
          }
        }

        // =====================================================================
        // PASO 3: mediciones (acepta valorNumerico === 0 + rangos por equipo!)
        // =====================================================================
        if (dto.mediciones && dto.mediciones.length > 0) {
          sectionsSet.add('mediciones');

          const paramIds = Array.from(new Set(dto.mediciones.map((m) => m.idParametroMedicion)));
          const parametrosDb = await tx.parametros_medicion.findMany({
            where: { id_parametro_medicion: { in: paramIds } },
          });
          const paramMap = new Map(parametrosDb.map((p) => [p.id_parametro_medicion, p]));

          for (const item of dto.mediciones) {
            const idOrdenEquipo = item.idOrdenEquipo ?? null;
            let existing = await tx.mediciones_servicio.findUnique({
              where: { client_uuid: item.clientUuid },
            });

            if (!existing) {
              existing = await tx.mediciones_servicio.findFirst({
                where: {
                  id_orden_servicio: orderId,
                  id_orden_equipo: idOrdenEquipo,
                  id_parametro_medicion: item.idParametroMedicion,
                  deleted_at: null,
                },
                orderBy: { id_medicion: 'desc' },
              });
            }

            if (existing && item.syncVersion < existing.sync_version) {
              acks.push({
                entityType: 'MEDICION',
                clientUuid: item.clientUuid,
                serverId: existing.id_medicion,
                acceptedVersion: existing.sync_version,
                status: 'STALE_IGNORED',
              });
              continue;
            }

            const sinValor =
              (item.valorNumerico === undefined || item.valorNumerico === null) &&
              (!item.valorTexto || item.valorTexto.trim().length === 0);

            if (item.deleted || sinValor) {
              if (existing) {
                await tx.mediciones_servicio.update({
                  where: { id_medicion: existing.id_medicion },
                  data: {
                    deleted_at: now,
                    sync_version: item.syncVersion,
                  },
                });
                acks.push({
                  entityType: 'MEDICION',
                  clientUuid: item.clientUuid,
                  serverId: existing.id_medicion,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              } else {
                acks.push({
                  entityType: 'MEDICION',
                  clientUuid: item.clientUuid,
                  serverId: null,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              }
              continue;
            }

            const param = paramMap.get(item.idParametroMedicion);
            if (!param) {
              acks.push({
                entityType: 'MEDICION',
                clientUuid: item.clientUuid,
                serverId: existing?.id_medicion ?? null,
                acceptedVersion: item.syncVersion,
                status: 'SKIPPED',
                reason: `Parámetro #${item.idParametroMedicion} no encontrado`,
              });
              continue;
            }

            const configEquipo = extraerConfigEquipoDeOrden(orden, idOrdenEquipo);
            const paramResuelto = resolverParametroConConfig(param, configEquipo);

            let fueraDeRango = false;
            let nivelAlerta: nivel_alerta_enum = nivel_alerta_enum.OK;
            let mensajeAlerta: string | null = null;

            if (item.valorNumerico !== undefined && item.valorNumerico !== null) {
              const evalRes = evaluarValorContraRangos(item.valorNumerico, paramResuelto);
              fueraDeRango = evalRes.fueraDeRango;
              nivelAlerta =
                evalRes.nivelAlerta === 'CRITICO'
                  ? nivel_alerta_enum.CRITICO
                  : evalRes.nivelAlerta === 'ADVERTENCIA'
                    ? nivel_alerta_enum.ADVERTENCIA
                    : nivel_alerta_enum.OK;
              mensajeAlerta = evalRes.mensajeAlerta;
            }

            const fechaMed = this.parseOptionalDate(item.fechaMedicion) ?? now;
            const unidadFinal =
              item.unidadMedida || paramResuelto.unidadMedida || param.unidad_medida;

            if (existing) {
              const updated = await tx.mediciones_servicio.update({
                where: { id_medicion: existing.id_medicion },
                data: {
                  client_uuid: existing.client_uuid ?? item.clientUuid,
                  id_orden_equipo: idOrdenEquipo,
                  valor_numerico:
                    item.valorNumerico !== undefined && item.valorNumerico !== null
                      ? item.valorNumerico
                      : null,
                  valor_texto: item.valorTexto ?? null,
                  unidad_medida: unidadFinal,
                  fuera_de_rango: fueraDeRango,
                  nivel_alerta: nivelAlerta,
                  mensaje_alerta: mensajeAlerta,
                  observaciones:
                    item.observaciones !== undefined ? item.observaciones : existing.observaciones,
                  fecha_medicion: fechaMed,
                  medido_por: idEmpleadoTecnico ?? existing.medido_por,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? existing.payload_hash,
                  deleted_at: null,
                },
              });
              acks.push({
                entityType: 'MEDICION',
                clientUuid: item.clientUuid,
                serverId: updated.id_medicion,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            } else {
              const created = await tx.mediciones_servicio.create({
                data: {
                  id_orden_servicio: orderId,
                  id_orden_equipo: idOrdenEquipo,
                  id_parametro_medicion: item.idParametroMedicion,
                  valor_numerico:
                    item.valorNumerico !== undefined && item.valorNumerico !== null
                      ? item.valorNumerico
                      : null,
                  valor_texto: item.valorTexto ?? null,
                  unidad_medida: unidadFinal,
                  fuera_de_rango: fueraDeRango,
                  nivel_alerta: nivelAlerta,
                  mensaje_alerta: mensajeAlerta,
                  observaciones: item.observaciones ?? null,
                  fecha_medicion: fechaMed,
                  medido_por: idEmpleadoTecnico,
                  client_uuid: item.clientUuid,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? null,
                },
              });
              acks.push({
                entityType: 'MEDICION',
                clientUuid: item.clientUuid,
                serverId: created.id_medicion,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            }
          }
        }

        // =====================================================================
        // PASO 4: evidenciasMeta (DESPUÉS de actividades -> resuelve actividadClientUuid!)
        // =====================================================================
        if (dto.evidenciasMeta && dto.evidenciasMeta.length > 0) {
          sectionsSet.add('evidencias');

          for (const item of dto.evidenciasMeta) {
            const idOrdenEquipo = item.idOrdenEquipo ?? null;
            let resolvedActId: number | null = null;

            if (item.actividadClientUuid) {
              resolvedActId = actividadUuidToServerId.get(item.actividadClientUuid) ?? null;
              if (resolvedActId === null) {
                const actRow = await tx.actividades_ejecutadas.findUnique({
                  where: { client_uuid: item.actividadClientUuid },
                  select: { id_actividad_ejecutada: true, id_orden_servicio: true },
                });
                if (actRow && actRow.id_orden_servicio === orderId) {
                  resolvedActId = actRow.id_actividad_ejecutada;
                }
              }
            } else if (item.idActividadEjecutada != null) {
              const actRow = await tx.actividades_ejecutadas.findFirst({
                where: {
                  id_actividad_ejecutada: item.idActividadEjecutada,
                  id_orden_servicio: orderId,
                },
                select: { id_actividad_ejecutada: true },
              });
              resolvedActId = actRow?.id_actividad_ejecutada ?? null;
            }

            let existing = await tx.evidencias_fotograficas.findUnique({
              where: { client_uuid: item.clientUuid },
            });

            const cleanHash = (item.hashSha256 || '').trim().toLowerCase();
            if (!existing && cleanHash) {
              existing = await tx.evidencias_fotograficas.findFirst({
                where: {
                  id_orden_servicio: orderId,
                  hash_sha256: cleanHash,
                  id_orden_equipo: idOrdenEquipo,
                  id_actividad_ejecutada: resolvedActId,
                  deleted_at: null,
                },
                orderBy: { id_evidencia: 'desc' },
              });
            }

            if (existing && item.syncVersion < existing.sync_version) {
              acks.push({
                entityType: 'EVIDENCIA',
                clientUuid: item.clientUuid,
                serverId: existing.id_evidencia,
                acceptedVersion: existing.sync_version,
                status: 'STALE_IGNORED',
              });
              continue;
            }

            if (item.deleted) {
              if (existing) {
                await tx.evidencias_fotograficas.update({
                  where: { id_evidencia: existing.id_evidencia },
                  data: {
                    deleted_at: now,
                    sync_version: item.syncVersion,
                  },
                });
                acks.push({
                  entityType: 'EVIDENCIA',
                  clientUuid: item.clientUuid,
                  serverId: existing.id_evidencia,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              } else {
                acks.push({
                  entityType: 'EVIDENCIA',
                  clientUuid: item.clientUuid,
                  serverId: null,
                  acceptedVersion: item.syncVersion,
                  status: 'DELETED',
                });
              }
              continue;
            }

            const tipoNorm = this.normalizeTipoEvidencia(item.tipoEvidencia);
            const fechaCap = this.parseOptionalDate(item.fechaCaptura) ?? now;
            const providerNorm =
              (item.storageProvider || '').toUpperCase() === 'R2' ? 'R2' : 'CLOUDINARY';

            if (existing) {
              const updated = await tx.evidencias_fotograficas.update({
                where: { id_evidencia: existing.id_evidencia },
                data: {
                  client_uuid: existing.client_uuid ?? item.clientUuid,
                  id_orden_equipo: idOrdenEquipo,
                  id_actividad_ejecutada: resolvedActId ?? existing.id_actividad_ejecutada,
                  tipo_evidencia: tipoNorm,
                  descripcion:
                    item.descripcion !== undefined ? item.descripcion : existing.descripcion,
                  ruta_archivo: item.publicUrl || existing.ruta_archivo,
                  storage_provider: item.storageProvider ? providerNorm : existing.storage_provider,
                  storage_key: item.storageKey ?? existing.storage_key,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? existing.payload_hash,
                  deleted_at: null,
                },
              });
              acks.push({
                entityType: 'EVIDENCIA',
                clientUuid: item.clientUuid,
                serverId: updated.id_evidencia,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            } else {
              if (!item.publicUrl || !cleanHash) {
                acks.push({
                  entityType: 'EVIDENCIA',
                  clientUuid: item.clientUuid,
                  serverId: null,
                  acceptedVersion: item.syncVersion,
                  status: 'SKIPPED',
                  reason: 'publicUrl y hashSha256 son obligatorios para crear evidencia',
                });
                continue;
              }
              const created = await tx.evidencias_fotograficas.create({
                data: {
                  id_orden_servicio: orderId,
                  id_orden_equipo: idOrdenEquipo,
                  id_actividad_ejecutada: resolvedActId,
                  tipo_evidencia: tipoNorm,
                  descripcion: item.descripcion ?? null,
                  nombre_archivo:
                    item.nombreArchivo ||
                    `OS_${orden.numero_orden}_${tipoNorm}_${cleanHash.slice(0, 8)}.jpg`,
                  ruta_archivo: item.publicUrl,
                  hash_sha256: cleanHash,
                  tama_o_bytes: BigInt(item.tamanoBytes ?? 0),
                  mime_type: item.mimeType || 'image/jpeg',
                  fecha_captura: fechaCap,
                  capturada_por: idEmpleadoTecnico,
                  esta_comprimida: true,
                  client_uuid: item.clientUuid,
                  sync_version: item.syncVersion,
                  payload_hash: item.payloadHash ?? null,
                  storage_provider: providerNorm,
                  storage_key: item.storageKey ?? null,
                },
              });
              acks.push({
                entityType: 'EVIDENCIA',
                clientUuid: item.clientUuid,
                serverId: created.id_evidencia,
                acceptedVersion: item.syncVersion,
                status: 'APPLIED',
              });
            }

            if (resolvedActId != null) {
              await tx.actividades_ejecutadas.update({
                where: { id_actividad_ejecutada: resolvedActId },
                data: { evidencia_capturada: true },
              });
            }
          }
        }

        // =====================================================================
        // PASO 5: firmas (dedup por hash_firma SHA-256 + vínculo en orden)
        // =====================================================================
        if (dto.firmas && dto.firmas.length > 0) {
          sectionsSet.add('firmas');

          const empPersona = idEmpleadoTecnico
            ? await tx.empleados.findUnique({
                where: { id_empleado: idEmpleadoTecnico },
                select: { id_persona: true },
              })
            : null;
          const fallbackPersonaId = empPersona?.id_persona ?? orden.clientes?.id_persona ?? 1;

          for (const item of dto.firmas) {
            const tipoUpper = item.tipoFirma.trim().toUpperCase();
            const tipoEnum =
              tipoUpper === 'CLIENTE'
                ? tipo_firma_digital_enum.CLIENTE
                : tipo_firma_digital_enum.TECNICO;

            if (item.deleted) {
              if (tipoEnum === tipo_firma_digital_enum.CLIENTE) {
                ordenUpdateData.id_firma_cliente = null;
              } else {
                ordenUpdateData.id_firma_tecnico = null;
              }
              acks.push({
                entityType: 'FIRMA',
                clientUuid: item.clientUuid,
                serverId: null,
                acceptedVersion: item.syncVersion,
                status: 'DELETED',
              });
              continue;
            }

            const idPersona =
              tipoEnum === tipo_firma_digital_enum.CLIENTE
                ? (orden.clientes?.id_persona ?? fallbackPersonaId)
                : (empPersona?.id_persona ?? fallbackPersonaId);

            if (tipoEnum === tipo_firma_digital_enum.CLIENTE) {
              if (item.nombreFirmante !== undefined) {
                ordenUpdateData.nombre_quien_recibe = item.nombreFirmante;
              }
              if (item.cargoFirmante !== undefined) {
                ordenUpdateData.cargo_quien_recibe = item.cargoFirmante;
              }
            }

            let firmaId: number | null =
              tipoEnum === tipo_firma_digital_enum.CLIENTE
                ? orden.id_firma_cliente
                : orden.id_firma_tecnico;

            if (item.firmaBase64 && item.firmaBase64.trim().length > 0) {
              const cleanB64 = item.firmaBase64.replace(/^data:image\/[^;]+;base64,/i, '');
              const hashFirma =
                (item.hashSha256 || '').trim().toLowerCase() ||
                createHash('sha256').update(cleanB64).digest('hex');

              const existingFirma = await tx.firmas_digitales.findFirst({
                where: {
                  id_persona: idPersona,
                  tipo_firma: tipoEnum,
                  hash_firma: hashFirma,
                },
                select: { id_firma_digital: true },
              });

              if (existingFirma) {
                firmaId = existingFirma.id_firma_digital;
              } else {
                const createdFirma = await tx.firmas_digitales.create({
                  data: {
                    id_persona: idPersona,
                    tipo_firma: tipoEnum,
                    firma_base64: cleanB64,
                    formato_firma: 'PNG',
                    hash_firma: hashFirma,
                    fecha_captura: now,
                    es_firma_principal: false,
                    activa: true,
                    observaciones: item.nombreFirmante
                      ? `Firmante: ${item.nombreFirmante}${item.cargoFirmante ? ` (${item.cargoFirmante})` : ''}`
                      : null,
                    registrada_por: actor.id,
                  },
                  select: { id_firma_digital: true },
                });
                firmaId = createdFirma.id_firma_digital;
              }

              if (tipoEnum === tipo_firma_digital_enum.CLIENTE) {
                ordenUpdateData.id_firma_cliente = firmaId;
              } else {
                ordenUpdateData.id_firma_tecnico = firmaId;
              }
            }

            acks.push({
              entityType: 'FIRMA',
              clientUuid: item.clientUuid,
              serverId: firmaId,
              acceptedVersion: item.syncVersion,
              status: 'APPLIED',
            });
          }
        }

        // Actualizar cabecera de orden con execution_sync_version y ultima_actividad_tecnico_at
        const updatedOrden = await tx.ordenes_servicio.update({
          where: { id_orden_servicio: orderId },
          data: ordenUpdateData as any,
          select: { execution_sync_version: true },
        });

        return { executionSyncVersion: updatedOrden.execution_sync_version };
      },
      { timeout: 25000, maxWait: 10000 },
    );

    const sectionsUpdated = Array.from(sectionsSet);
    this.logger.log(
      `🔄 [SYNC-DELTA] OS ${orden.numero_orden} (#${orderId}) v=${txResult.executionSyncVersion} · acks=${acks.length} · sections=[${sectionsUpdated.join(',')}]`,
    );

    // Emitir evento SSE `delta_synced` DESPUÉS de confirmar la transacción PostgreSQL
    if (this.realtimeBus) {
      const sseSections = new Set<OrdenRealtimeSection>(['progreso']);
      for (const sec of sectionsUpdated) {
        if (
          sec === 'orden' ||
          sec === 'actividades' ||
          sec === 'mediciones' ||
          sec === 'evidencias' ||
          sec === 'pendientes' ||
          sec === 'firmas'
        ) {
          sseSections.add(sec);
        }
      }

      const appliedAcks = acks.filter((a) => a.status === 'APPLIED' || a.status === 'DELETED');
      const changedIds = {
        actividades: appliedAcks
          .filter((a) => a.entityType === 'ACTIVIDAD' && a.serverId != null)
          .map((a) => a.serverId as number),
        mediciones: appliedAcks
          .filter((a) => a.entityType === 'MEDICION' && a.serverId != null)
          .map((a) => a.serverId as number),
        evidencias: appliedAcks
          .filter((a) => a.entityType === 'EVIDENCIA' && a.serverId != null)
          .map((a) => a.serverId as number),
        pendientes: appliedAcks
          .filter((a) => a.entityType === 'PENDIENTE' && a.serverId != null)
          .map((a) => a.serverId as number),
        actividadClientUuids: appliedAcks
          .filter((a) => a.entityType === 'ACTIVIDAD')
          .map((a) => a.clientUuid),
        medicionClientUuids: appliedAcks
          .filter((a) => a.entityType === 'MEDICION')
          .map((a) => a.clientUuid),
        evidenciaClientUuids: appliedAcks
          .filter((a) => a.entityType === 'EVIDENCIA')
          .map((a) => a.clientUuid),
        pendienteClientUuids: appliedAcks
          .filter((a) => a.entityType === 'PENDIENTE')
          .map((a) => a.clientUuid),
      };

      this.realtimeBus.emitOrdenEvent({
        type: 'delta_synced',
        orderId,
        numeroOrden: orden.numero_orden,
        executionSyncVersion: txResult.executionSyncVersion,
        sections: Array.from(sseSections),
        changedIds,
        timestamp: now.toISOString(),
        source: 'MOBILE_DELTA',
      });
    }

    return {
      success: true,
      orderId,
      numeroOrden: orden.numero_orden,
      executionSyncVersion: txResult.executionSyncVersion,
      serverTimestamp: now.toISOString(),
      sectionsUpdated,
      acks,
    };
  }
}
