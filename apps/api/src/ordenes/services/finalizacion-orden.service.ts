/**
 * ============================================================================
 * FinalizacionOrdenService - MEKANOS S.A.S
 * ============================================================================
 * Rebuild 07-FEB-2026: Prisma Client regenerado con GENERAL en tipo_evidencia_enum
 *
 * SERVICIO ORQUESTADOR PRINCIPAL
 *
 * Este servicio coordina TODO el flujo de finalización de una orden de servicio:
 *
 * 1. Subir evidencias fotográficas a Cloudinary
 * 2. Registrar evidencias en Base de Datos
 * 3. Registrar firmas digitales (técnico y cliente)
 * 4. Generar PDF con template REAL según tipo de equipo/servicio
 * 5. Subir PDF a Cloudflare R2
 * 6. Registrar documento generado en BD
 * 7. Enviar email al cliente con PDF adjunto
 * 8. Actualizar estado de la orden a COMPLETADA
 *
 * CARACTERÍSTICAS:
 * - Transaccional: Si algo falla, hace rollback
 * - Idempotente: Se puede reintentar sin duplicar datos
 * - Trazable: Logs detallados en cada paso
 * - Robusto: Manejo de errores completo
 *
 * ============================================================================
 */

import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { ConfigParametrosService } from '../../config-parametros/config-parametros.service';
import { ConfiguracionOrganizacionService } from '../../configuracion-organizacion/configuracion-organizacion.service';
import {
  evaluarValorContraRangos,
  extraerConfigEquipoDeOrden,
  resolverParametroConConfig,
} from '../../config-parametros/parametros-override.helper';
import { PrismaService } from '../../database/prisma.service';
import { EmailService, OrdenEmailData } from '../../email/email.service';
import { EquipoSpecsReader } from '../../equipos/services/equipo-specs.reader';
import {
  DEFAULT_ORG_BRANDING,
  OrgBrandingContext,
  buildOrgBranding,
  formatDateOrg,
} from '../../pdf/org-branding.types';
import { PdfAssemblerService } from '../../pdf/pdf-assembler.service';
import { buildInformeFilename } from '../../pdf/pdf-naming.helper';
import { PdfService, TipoInforme } from '../../pdf/pdf.service';
import { CloudinaryService, UploadResult } from '../../storage/cloudinary.service';
import { R2StorageService } from '../../storage/r2-storage.service';
import { PendienteFinalizacionDto } from '../dto/finalizar-orden-completo.dto';
import { crearMetadataObservacionesCierre } from '../domain/observaciones-cierre-audit';

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

/**
 * Evidencia fotográfica enviada desde el frontend
 */
export interface EvidenciaInput {
  /** Tipo de evidencia: ANTES, DURANTE, DESPUES, MEDICION, GENERAL */
  tipo: 'ANTES' | 'DURANTE' | 'DESPUES' | 'MEDICION' | 'GENERAL';
  /** Imagen en Base64 (sin prefijo data:image) */
  base64: string;
  /** Descripción de la evidencia */
  descripcion?: string;
  /** Formato de imagen (default: png) */
  formato?: 'png' | 'jpg' | 'jpeg';
  /** ID del orden-equipo (para multi-equipos, opcional para backward compatibility) */
  idOrdenEquipo?: number;
}

/**
 * Firma digital enviada desde el frontend
 */
export interface FirmaInput {
  /** Tipo de firma */
  tipo: 'TECNICO' | 'CLIENTE';
  /** Firma en Base64 (sin prefijo data:image) */
  base64: string;
  /** ID de la persona que firma */
  idPersona: number;
  /** Nombre de quien firma */
  nombre?: string;
  /** Cargo de quien firma (para cliente) */
  cargo?: string;
  /** ✅ FIX 06-FEB-2026: Nombre del firmante (campo explícito del mobile) */
  nombreFirmante?: string;
  /** ✅ FIX 06-FEB-2026: Cargo del firmante (campo explícito del mobile) */
  cargoFirmante?: string;
  /** Formato de imagen (default: png) */
  formato?: 'png' | 'jpg' | 'jpeg';
}

/**
 * Actividad ejecutada durante el servicio
 */
export interface ActividadInput {
  /** Sistema al que pertenece */
  sistema: string;
  /** Descripción de la actividad */
  descripcion: string;
  /** Resultado: B=Bueno, M=Malo, C=Corregido, N/A=No Aplica */
  resultado: 'B' | 'R' | 'M' | 'C' | 'N/A' | string;
  /** Observaciones adicionales */
  observaciones?: string;
  /** ID del orden-equipo (para multi-equipos, opcional para backward compatibility) */
  idOrdenEquipo?: number;
  /** Fase 6: ID exacto del catálogo (trazabilidad; evita adivinar por descripción) */
  idActividadCatalogo?: number | null;
  /** Fase 6: Respuesta declarativa (opción elegida, sub-inputs, etc.) */
  respuestaJson?: any;
}

/**
 * Medición realizada durante el servicio
 */
export interface MedicionInput {
  /** Nombre del parámetro */
  parametro: string;
  /** Valor medido */
  valor: number;
  /** Unidad de medida */
  unidad: string;
  /** Nivel de alerta: OK, WARNING, CRITICAL */
  nivelAlerta?: 'OK' | 'WARNING' | 'CRITICAL';
  /** ID del orden-equipo (para multi-equipos, opcional para backward compatibility) */
  idOrdenEquipo?: number;
  /** Observaciones específicas de la medición */
  observaciones?: string;
}

/**
 * ✅ MULTI-EQUIPOS: Actividades agrupadas por equipo
 */
export interface ActividadesPorEquipoInput {
  /** ID del registro en ordenes_equipos */
  idOrdenEquipo: number;
  /** Nombre del equipo para display */
  nombreEquipo: string;
  /** Código del equipo (opcional) */
  codigoEquipo?: string;
  /** Actividades de este equipo */
  actividades: ActividadInput[];
}

/**
 * ✅ MULTI-EQUIPOS: Mediciones agrupadas por equipo
 */
export interface MedicionesPorEquipoInput {
  /** ID del registro en ordenes_equipos */
  idOrdenEquipo: number;
  /** Nombre del equipo para display */
  nombreEquipo: string;
  /** Mediciones de este equipo */
  mediciones: MedicionInput[];
}

/**
 * DTO completo para finalizar una orden
 */
export interface FinalizarOrdenDto {
  /** ID de la orden de servicio */
  idOrden: number;

  /** Evidencias fotográficas (mínimo 1, máximo 10) */
  evidencias: EvidenciaInput[];

  /** Firmas digitales (técnico obligatorio, cliente opcional) */
  firmas: {
    tecnico: FirmaInput;
    cliente?: FirmaInput;
  };

  /** Actividades ejecutadas */
  actividades: ActividadInput[];

  /** Mediciones realizadas (opcional) */
  mediciones?: MedicionInput[];

  /** ✅ MULTI-EQUIPOS: Actividades agrupadas por equipo */
  actividadesPorEquipo?: ActividadesPorEquipoInput[];

  /** ✅ MULTI-EQUIPOS: Mediciones agrupadas por equipo */
  medicionesPorEquipo?: MedicionesPorEquipoInput[];

  /** ✅ MULTI-EQUIPOS: Flag indicador */
  esMultiEquipo?: boolean;

  /** Razón de la falla (solo para correctivos) */
  razonFalla?: string;

  /** Observaciones generales del servicio */
  observaciones: string;

  /** Datos del módulo de control (para generadores) */
  datosModulo?: {
    rpm?: number;
    presionAceite?: number;
    temperaturaRefrigerante?: number;
    cargaBateria?: number;
    horasTrabajo?: number;
    voltaje?: number;
    frecuencia?: number;
    corriente?: number;
  };

  /** Hora de entrada al sitio */
  horaEntrada: string;

  /** Hora de salida del sitio */
  horaSalida: string;

  /** Email adicional para enviar copia (opcional) */
  emailAdicional?: string;

  /** ID del usuario que finaliza (técnico) */
  usuarioId: number;

  /** ✅ PENDIENTES TÉCNICOS: Pendientes registrados por el técnico */
  pendientes?: PendienteFinalizacionDto[];

  /**
   * Modo de finalización:
   * - 'COMPLETO': Genera PDF y envía email (flujo tradicional)
   * - 'SOLO_DATOS': Solo sube datos, sin PDF ni email (Admin genera desde portal)
   */
  modo?: 'COMPLETO' | 'SOLO_DATOS';
}

/**
 * ============================================================================
 * EVENTOS DE PROGRESO PARA STREAMING EN TIEMPO REAL
 * ============================================================================
 *
 * Estos eventos se emiten al cliente durante el proceso de finalización
 * para mostrar el progreso en tiempo real en la app móvil.
 */

/**
 * Pasos del proceso de finalización
 */
export type FinalizacionStep =
  | 'validando' // Paso 0: Validando datos
  | 'obteniendo_orden' // Paso 1: Obteniendo datos de la orden
  | 'limpieza_residuales' // Paso 1.5: Limpieza de residuales de intentos fallidos
  | 'evidencias' // Paso 2: Subiendo evidencias a Cloudinary
  | 'firmas' // Paso 3: Registrando firmas digitales
  | 'actividades' // Paso 3.5: Registrando actividades
  | 'mediciones' // Paso 3.6: Registrando mediciones
  | 'pendientes' // Paso 3.7: Registrando pendientes técnicos
  | 'generando_pdf' // Paso 4: Generando PDF
  | 'subiendo_pdf' // Paso 5: Subiendo PDF a R2
  | 'registrando_doc' // Paso 6: Registrando documento en BD
  | 'enviando_email' // Paso 7: Enviando email
  | 'actualizando_estado' // Paso 8: Actualizando estado
  | 'completado' // Finalizado exitosamente
  | 'error'; // Error en el proceso

/**
 * Estado del paso
 */
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

/**
 * Evento de progreso emitido durante la finalización
 */
export interface ProgressEvent {
  /** Paso actual del proceso */
  step: FinalizacionStep;
  /** Estado del paso */
  status: StepStatus;
  /** Mensaje descriptivo */
  message: string;
  /** Porcentaje de progreso total (0-100) */
  progress: number;
  /** Datos adicionales opcionales */
  data?: Record<string, unknown>;
  /** Timestamp del evento */
  timestamp: number;
}

/**
 * Tipo para el callback de progreso
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Resultado de la finalización
 */
export interface FinalizacionResult {
  success: boolean;
  mensaje: string;
  datos: {
    orden: {
      id: number;
      numero: string;
      estado: string;
    };
    evidencias: Array<{
      id: number;
      tipo: string;
      url: string;
    }>;
    firmas: Array<{
      id: number;
      tipo: string;
    }>;
    /** Null si modo='SOLO_DATOS' (PDF se genera desde Admin Portal) */
    documento: {
      id: number;
      url: string;
      filename: string;
      tamanioKB: number;
    } | null;
    email: {
      enviado: boolean;
      destinatario: string;
      messageId?: string;
    };
    /** Modo usado: 'COMPLETO' o 'SOLO_DATOS' */
    modo?: 'COMPLETO' | 'SOLO_DATOS';
  };
  tiempoTotal: number;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

@Injectable()
export class FinalizacionOrdenService {
  private readonly logger = new Logger(FinalizacionOrdenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly r2Service: R2StorageService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly configParametrosService: ConfigParametrosService,
    @Optional() private readonly configOrgService?: ConfiguracionOrganizacionService,
    @Optional() private readonly pdfAssembler?: PdfAssemblerService,
  ) {}

  /**
   * MÉTODO PRINCIPAL: Finaliza una orden de servicio
   *
   * Ejecuta todo el flujo de finalización de forma transaccional
   *
   * @param dto Datos para finalizar la orden
   * @param onProgress Callback opcional para emitir eventos de progreso en tiempo real
   */
  async finalizarOrden(
    dto: FinalizarOrdenDto,
    onProgress?: ProgressCallback,
    user?: { id?: number; idEmpleado?: number | null; esAdmin?: boolean },
  ): Promise<FinalizacionResult> {
    const startTime = Date.now();
    this.logger.log(`🚀 Iniciando finalización de orden ${dto.idOrden}`);

    // 🔍 RESOLUCIÓN DE IDENTIDAD: Obtener id_empleado del técnico
    // El mobile envía usuarioId (PK de tabla usuarios), pero actividades y mediciones
    // requieren id_empleado (PK de tabla empleados).
    let idEmpleadoTecnico: number | null = null;
    try {
      const emp = await this.prisma.empleados.findFirst({
        where: {
          persona: {
            usuarios: {
              id_usuario: dto.usuarioId,
            },
          },
        },
        select: { id_empleado: true },
      });
      idEmpleadoTecnico = emp?.id_empleado || null;

      if (idEmpleadoTecnico) {
        this.logger.log(
          `   ✅ Identidad resuelta: usuarioId=${dto.usuarioId} -> idEmpleado=${idEmpleadoTecnico}`,
        );
      } else {
        this.logger.warn(
          `   ⚠️ No se encontró registro de empleado para usuarioId=${dto.usuarioId}. Se usará fallback.`,
        );
      }
    } catch (err) {
      this.logger.error(`   ❌ Error resolviendo identidad del técnico: ${err}`);
    }

    // Helper para emitir progreso
    const emitProgress = (
      step: FinalizacionStep,
      status: StepStatus,
      message: string,
      progress: number,
      data?: Record<string, unknown>,
    ) => {
      if (onProgress) {
        onProgress({
          step,
          status,
          message,
          progress,
          data,
          timestamp: Date.now(),
        });
      }
    };

    // Variables para tracking de progreso/contexto
    let evidenciasResultado: Array<{ id: number; tipo: string; url: string }> = [];
    let firmasResultado: Array<{ id: number; tipo: string }> = [];
    let documentoResult: { id: number } | null = null;

    try {
      // ========================================================================
      // PASO 0: Validaciones iniciales (Zero DB Writes)
      // ========================================================================
      emitProgress('validando', 'in_progress', 'Validando datos de entrada...', 5);
      this.logger.log('📋 Paso 0: Validando datos de entrada...');
      await this.validarEntrada(dto);
      emitProgress('validando', 'completed', 'Datos validados correctamente', 10);

      // ========================================================================
      // PASO 1: Cargar datos completos + Config Tenant + Estado COMPLETADA
      // ========================================================================
      emitProgress('obteniendo_orden', 'in_progress', 'Obteniendo datos de la orden...', 12);
      this.logger.log('📋 Paso 1: Obteniendo datos de la orden...');

      const [orden, estadoCompletada, configOrg] = await Promise.all([
        this.obtenerOrdenCompleta(dto.idOrden),
        this.prisma.estados_orden.findFirst({ where: { codigo_estado: 'COMPLETADA' } }),
        this.configOrgService?.getContext().catch(() => null),
      ]);

      if (!estadoCompletada) {
        throw new InternalServerErrorException('Estado COMPLETADA no encontrado en BD');
      }

      const codigoEstadoActual = orden.estados_orden?.codigo_estado || '';
      const esResubidaAutorizada =
        codigoEstadoActual === 'COMPLETADA' && orden.edicion_tecnico_habilitada === true;

      if (
        (codigoEstadoActual === 'COMPLETADA' || codigoEstadoActual === 'APROBADA') &&
        !esResubidaAutorizada
      ) {
        this.logger.log(
          `✅ [IDEMPOTENCIA] Orden ${orden.numero_orden} (ID ${orden.id_orden_servicio}) ya se encuentra en estado ${codigoEstadoActual}. Retornando éxito idempotente.`,
        );

        emitProgress('validando', 'completed', 'Orden verificada en el servidor', 30);
        emitProgress(
          'actualizando_estado',
          'completed',
          `La orden ya se encuentra ${codigoEstadoActual.toLowerCase()}`,
          90,
        );
        emitProgress(
          'completado',
          'completed',
          `La orden ${orden.numero_orden} ya se encuentra ${codigoEstadoActual.toLowerCase()} en el servidor`,
          100,
          {
            tiempoTotal: Date.now() - startTime,
            ordenId: orden.id_orden_servicio,
            numeroOrden: orden.numero_orden,
            numeroVisitaCaso: (orden as any).numero_visita_caso || 1,
            tipoVisita: (orden as any).tipo_visita || 'INICIAL',
            numeroOrdenPadre: (orden as any).orden_padre?.numero_orden || undefined,
            modo: dto.modo || 'COMPLETO',
          },
        );

        return {
          success: true,
          mensaje: `La orden ${orden.numero_orden} ya se encuentra ${codigoEstadoActual.toLowerCase()} en el servidor`,
          datos: {
            orden: {
              id: orden.id_orden_servicio,
              numero: orden.numero_orden,
              estado: codigoEstadoActual,
            },
            evidencias: [],
            firmas: [],
            documento: null,
            email: {
              enviado: false,
              destinatario: '',
            },
            modo: dto.modo || 'COMPLETO',
          },
          tiempoTotal: Date.now() - startTime,
        };
      }

      // Resolver posible reasignación en memoria (se audita y persiste dentro de la transacción atómica)
      let reasignacionTecnico: { tecnicoOriginalId: number; tecnicoEjecutorId: number } | undefined;
      if (
        user &&
        !user.esAdmin &&
        orden.id_tecnico_asignado != null &&
        user.idEmpleado != null &&
        orden.id_tecnico_asignado !== user.idEmpleado
      ) {
        this.logger.warn(
          `⚠️ Orden ${orden.numero_orden} asignada al técnico #${orden.id_tecnico_asignado}, finalizada por técnico #${user.idEmpleado}. Se auditará reasignación en transacción atómica.`,
        );
        reasignacionTecnico = {
          tecnicoOriginalId: orden.id_tecnico_asignado,
          tecnicoEjecutorId: user.idEmpleado,
        };
        orden.id_tecnico_asignado = user.idEmpleado;
        if (typeof this.prisma.empleados?.findUnique === 'function') {
          const empEjecutor = await this.prisma.empleados
            .findUnique({
              where: { id_empleado: user.idEmpleado },
              include: {
                persona: {
                  include: {
                    usuarios: { select: { id_usuario: true } },
                  },
                },
              },
            })
            .catch(() => null);
          if (empEjecutor) {
            orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados = empEjecutor as any;
          }
        }
      }

      const esYaCompletada = orden.id_estado_actual === estadoCompletada.id_estado;
      emitProgress('obteniendo_orden', 'completed', `Orden ${orden.numero_orden} cargada`, 15);

      // Validar resolución de identidades de firmas ANTES de subir binarios o escribir BD
      const [idPersonaFirmaTecnico, idPersonaFirmaCliente] = await Promise.all([
        this.resolverIdPersonaFirma(dto.firmas.tecnico, dto.usuarioId, orden),
        dto.firmas.cliente?.base64
          ? this.resolverIdPersonaFirma(dto.firmas.cliente, dto.usuarioId, orden)
          : Promise.resolve(null),
      ]);

      // ========================================================================
      // FASE A (ZERO DB MUTATION): Subir evidencias a la nube, generar PDF y subir PDF a R2
      // Si cualquier paso externo falla aquí, la BD permanece 100% intacta sin borrados previos.
      // ========================================================================
      emitProgress(
        'evidencias',
        'in_progress',
        `Subiendo ${dto.evidencias.length} evidencias...`,
        18,
      );
      this.logger.log('📷 Fase A.1: Subiendo evidencias fotográficas a almacenamiento...');
      const storagePrefijo = configOrg?.storage_prefijo_raiz || 'eam-media';
      const evidenciasSubidas = await this.subirEvidenciasCloud(
        dto.evidencias,
        orden.numero_orden,
        storagePrefijo,
        (subidas, total) => {
          const progreso = 18 + Math.round((subidas / total) * 17);
          emitProgress(
            'evidencias',
            'in_progress',
            `Subiendo evidencias (${subidas}/${total})...`,
            progreso,
          );
        },
      );
      const evidenciasPreviewPdf = evidenciasSubidas.map((ev, index) => ({
        id: index + 1,
        tipo: ev.tipoFinal,
        url: ev.url,
      }));
      emitProgress('evidencias', 'completed', `${evidenciasSubidas.length} evidencias subidas`, 35);

      // Mapear mediciones del array a datosModulo para cálculo de PDF + contador
      const datosModuloMapeado = this.mapearMedicionesADatosModulo(dto.mediciones || []);
      const modoCompleto = dto.modo !== 'SOLO_DATOS';

      let pdfResult: { buffer: Buffer; filename: string; size: number } | null = null;
      let r2Result: { url: string; key: string } | null = null;
      let downloadFilename: string | undefined;

      if (modoCompleto) {
        emitProgress('generando_pdf', 'in_progress', 'Generando informe PDF...', 55);
        this.logger.log('📄 Fase A.2: Generando PDF con template profesional (pre-commit)...');

        const tipoInforme = this.determinarTipoInforme(orden);
        pdfResult = await this.generarPDFOrden(
          orden,
          dto,
          evidenciasPreviewPdf,
          [],
          tipoInforme,
          datosModuloMapeado,
        );
        emitProgress(
          'generando_pdf',
          'completed',
          `PDF generado (${Math.round(pdfResult.size / 1024)} KB)`,
          68,
        );

        emitProgress(
          'subiendo_pdf',
          'in_progress',
          'Subiendo informe PDF a almacenamiento seguro...',
          72,
        );
        downloadFilename = this.calcularDownloadFilename(orden);
        r2Result = await this.subirPDFaR2(pdfResult.buffer, orden.numero_orden, downloadFilename);
        emitProgress('subiendo_pdf', 'completed', 'PDF almacenado en la nube', 80);
      } else {
        this.logger.log('📋 Modo SOLO_DATOS: Saltando generación de PDF y almacenamiento R2');
        emitProgress('generando_pdf', 'completed', 'PDF se generará desde Admin Portal', 68);
        emitProgress('subiendo_pdf', 'completed', 'Omitido (modo solo datos)', 80);
      }

      // ========================================================================
      // FASE B (ATÓMICA EN BASE DE DATOS): Todo dentro de UNA sola $transaction
      // ========================================================================
      emitProgress(
        'limpieza_residuales',
        'in_progress',
        'Consolidando registros en base de datos...',
        82,
      );
      this.logger.log('🔒 Fase B: Ejecutando commit atómico integral en PostgreSQL...');

      const commitOutcome = await this.prisma.$transaction(
        async (tx) => {
          // 1. Limpieza de residuales previos (segura dentro de tx: si algo falla, se revierte)
          await this.limpiarDatosPreviosOrden(orden, tx);

          // 2. Persistir evidencias ya subidas
          emitProgress('actividades', 'in_progress', 'Persistiendo evidencias y firmas...', 85);
          const evDb = await this.persistirEvidenciasDb(
            tx,
            evidenciasSubidas,
            orden.id_orden_servicio,
          );

          // 3. Registrar firmas digitales y vincular orden
          const frmDb = await this.procesarFirmas(
            dto.firmas,
            dto.usuarioId,
            orden,
            {
              tecnico: idPersonaFirmaTecnico,
              cliente: idPersonaFirmaCliente ?? undefined,
            },
            tx,
          );
          const firmaTecnico = frmDb.find((f) => f.tipo === 'TECNICO');
          const firmaCliente = frmDb.find((f) => f.tipo === 'CLIENTE');

          await tx.ordenes_servicio.update({
            where: { id_orden_servicio: orden.id_orden_servicio },
            data: {
              ...(reasignacionTecnico
                ? { id_tecnico_asignado: reasignacionTecnico.tecnicoEjecutorId }
                : {}),
              id_firma_tecnico: firmaTecnico?.id || null,
              id_firma_cliente: firmaCliente?.id || null,
              nombre_quien_recibe: dto.firmas.cliente?.nombreFirmante || 'Cliente',
              cargo_quien_recibe: dto.firmas.cliente?.cargoFirmante || null,
            },
          });

          // 4. Actividades ejecutadas (con trazabilidad multi-equipo 1:1 verificada)
          const actividadesNormalizadas = this.resolverActividadesParaPersistir(orden, dto);
          await this.persistirActividades(
            orden.id_orden_servicio,
            actividadesNormalizadas,
            idEmpleadoTecnico || dto.usuarioId,
            tx,
            orden.id_tipo_servicio,
          );

          // 5. Mediciones (con trazabilidad multi-equipo 1:1 verificada)
          const medicionesNormalizadas = this.resolverMedicionesParaPersistir(orden, dto);
          if (medicionesNormalizadas.length > 0) {
            await this.persistirMediciones(
              orden.id_orden_servicio,
              medicionesNormalizadas,
              idEmpleadoTecnico || dto.usuarioId,
              tx,
            );
          }

          // 6. Pendientes técnicos
          if (dto.pendientes && dto.pendientes.length > 0) {
            await this.persistirPendientes(orden, dto.pendientes, idEmpleadoTecnico, tx);
          }

          // 7. Contadores metrológicos en hoja de vida (horas_actuales + lectura_uso_actual)
          await this.sincronizarContadoresHojaDeVida(orden, dto, datosModuloMapeado, tx);

          // 8. Registrar documento generado (si modoCompleto)
          let docDb: { id: number } | null = null;
          if (modoCompleto && r2Result && pdfResult) {
            docDb = await this.registrarDocumento(
              orden.id_orden_servicio,
              orden.numero_orden,
              r2Result.url,
              pdfResult,
              dto.usuarioId,
              configOrg?.nombre_comercial,
              tx,
            );
          }

          // 9. Actualizar estado de orden a COMPLETADA e historial auditado
          await this.actualizarEstadoOrden(
            orden.id_orden_servicio,
            estadoCompletada.id_estado,
            dto.observaciones,
            dto.usuarioId,
            dto.horaEntrada,
            dto.horaSalida,
            esYaCompletada,
            reasignacionTecnico,
            tx,
          );

          return {
            evidencias: evDb,
            firmas: frmDb,
            documento: docDb,
          };
        },
        { timeout: 30000 },
      );

      evidenciasResultado = commitOutcome.evidencias;
      firmasResultado = commitOutcome.firmas;
      documentoResult = commitOutcome.documento;

      emitProgress('actividades', 'completed', 'Registros persistidos atómicamente', 90);
      emitProgress('actualizando_estado', 'completed', 'Estado actualizado a COMPLETADA', 94);

      // ========================================================================
      // FASE C (POST-COMMIT NO BLOQUEANTE): Notificación Email con Informe Adjunto
      // ========================================================================
      let emailResult: { enviado: boolean; destinatario: string; messageId?: string } = {
        enviado: false,
        destinatario: '',
      };

      if (modoCompleto && pdfResult) {
        emitProgress('enviando_email', 'in_progress', 'Enviando informe por email...', 96);
        emailResult = await this.enviarEmailInforme(
          orden,
          pdfResult,
          dto.emailAdicional,
          downloadFilename,
        );
        emitProgress(
          'enviando_email',
          'completed',
          emailResult.enviado ? 'Email enviado' : 'Email no enviado (sin destinatario)',
          98,
        );
      } else {
        emitProgress('enviando_email', 'completed', 'Email se enviará desde Admin Portal', 98);
      }

      // ========================================================================
      // RESULTADO EXITOSO
      // ========================================================================
      const tiempoTotal = Date.now() - startTime;
      const mensajeFinal = modoCompleto
        ? `Orden ${orden.numero_orden} finalizada exitosamente`
        : `Orden ${orden.numero_orden} datos sincronizados (PDF pendiente desde Admin)`;
      this.logger.log(`🎉 ${mensajeFinal} en ${tiempoTotal}ms`);

      emitProgress('completado', 'completed', mensajeFinal, 100, {
        tiempoTotal,
        ordenId: orden.id_orden_servicio,
        numeroOrden: orden.numero_orden,
        numeroVisitaCaso: (orden as any).numero_visita_caso || 1,
        tipoVisita: (orden as any).tipo_visita || 'INICIAL',
        numeroOrdenPadre: (orden as any).orden_padre?.numero_orden || undefined,
        modo: dto.modo || 'COMPLETO',
      });

      return {
        success: true,
        mensaje: mensajeFinal,
        datos: {
          orden: {
            id: orden.id_orden_servicio,
            numero: orden.numero_orden,
            estado: 'COMPLETADA',
          },
          evidencias: evidenciasResultado,
          firmas: firmasResultado,
          documento: documentoResult
            ? {
                id: documentoResult.id,
                url: r2Result?.url || '',
                filename: pdfResult?.filename || '',
                tamanioKB: pdfResult ? Math.round(pdfResult.size / 1024) : 0,
              }
            : null,
          email: emailResult,
          modo: dto.modo || 'COMPLETO',
        },
        tiempoTotal,
      };
    } catch (error: unknown) {
      // ========================================================================
      // MANEJO DE ERRORES Y ROLLBACK
      // ========================================================================
      const err = error as Error;
      this.logger.error(`❌ Error finalizando orden: ${err.message}`, err.stack);

      // Emitir evento de error
      emitProgress('error', 'error', `Error: ${err.message}`, 0, {
        errorMessage: err.message,
        errorStack: err.stack,
      });

      // Re-lanzar errores HTTP de Nest TAL CUAL (400, 403, 404, etc.).
      // ✅ 19-OCT-2026: antes solo se preservaban 400/404; el 403 del
      // guard de edición técnica se convertía en 500 y el móvil no podía
      // distinguir un permiso revocado de una falla del servidor.
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(`Error al finalizar orden: ${err.message}`);
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Valida los datos de entrada
   */
  private async validarEntrada(dto: FinalizarOrdenDto): Promise<void> {
    // Validar evidencias
    if (!dto.evidencias || dto.evidencias.length === 0) {
      throw new BadRequestException('Debe incluir al menos una evidencia fotográfica');
    }
    if (dto.evidencias.length > 150) {
      throw new BadRequestException('Máximo 150 evidencias permitidas');
    }

    // Validar firma del técnico
    if (!dto.firmas?.tecnico?.base64) {
      throw new BadRequestException('La firma del técnico es obligatoria');
    }

    // Validar actividades
    if (!dto.actividades || dto.actividades.length === 0) {
      throw new BadRequestException('Debe incluir al menos una actividad ejecutada');
    }

    // Validar horas
    if (!dto.horaEntrada || !dto.horaSalida) {
      throw new BadRequestException('Las horas de entrada y salida son obligatorias');
    }

    // Validar cada evidencia
    for (const ev of dto.evidencias) {
      if (!ev.base64) {
        throw new BadRequestException(`Evidencia ${ev.tipo} sin imagen`);
      }
      if (!['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'].includes(ev.tipo)) {
        throw new BadRequestException(`Tipo de evidencia inválido: ${ev.tipo}`);
      }
    }
  }

  /**
   * Obtiene los datos completos de la orden con relaciones
   * ✅ FIX 15-DIC-2025: Corregidos nombres de relaciones según schema.prisma
   * ✅ FIX 16-DIC-2025: Agregado ordenes_equipos para soporte multi-equipo
   */
  private async obtenerOrdenCompleta(idOrden: number) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      include: {
        clientes: {
          include: {
            persona: true,
            // ✅ FIX 28-FEB-2026: Incluir cliente_principal para heredar emails_notificacion
            cliente_principal: {
              select: {
                emails_notificacion: true,
                id_cuenta_email_remitente: true,
              },
            },
          },
        },
        equipos: {
          include: {
            tipos_equipo: {
              include: {
                tipo_equipo_modulos: {
                  include: {
                    modulo: {
                      include: {
                        modulo_atributos: {
                          include: {
                            atributo: {
                              include: { unidad_defecto: true },
                            },
                          },
                          orderBy: [{ grupo_visual: 'asc' }, { orden_visual: 'asc' }],
                        },
                      },
                    },
                  },
                  orderBy: { orden_visual: 'asc' },
                },
              },
            },
            equipos_atributos_filtro: true,
            equipos_generador: true,
            equipos_motor: true,
            equipos_bomba: true,
          },
        },
        ordenes_pendientes: {
          orderBy: { id_orden_pendiente: 'asc' },
        },
        sedes_cliente: true,
        orden_padre: { select: { numero_orden: true } },
        componentes_usados: {
          include: {
            catalogo_componentes: true,
            ubicaciones_bodega: true,
            lotes_componentes: true,
          },
          orderBy: { id_componente_usado: 'asc' },
        },
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          include: {
            persona: {
              include: {
                usuarios: {
                  select: { id_usuario: true },
                },
              },
            },
          },
        },
        tipos_servicio: true,
        estados_orden: true,
        // ✅ MULTI-EQUIPOS: Incluir equipos de la orden
        ordenes_equipos: {
          include: {
            equipos: {
              include: { tipos_equipo: true },
            },
          },
          orderBy: { orden_secuencia: 'asc' },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden con ID ${idOrden} no encontrada`);
    }

    // Validar que la orden esté en estado que permita finalización o verificación idempotente.
    const estadosPermitidos = [
      'EN_PROCESO',
      'EN_EJECUCION',
      'PENDIENTE',
      'PROGRAMADA',
      'ASIGNADA',
      'EN_ESPERA_REPUESTO',
    ];
    const codigoEstado = orden.estados_orden?.codigo_estado || '';
    const esResubidaAutorizada =
      codigoEstado === 'COMPLETADA' && orden.edicion_tecnico_habilitada === true;
    const esYaCompletada = codigoEstado === 'COMPLETADA' || codigoEstado === 'APROBADA';

    if (!estadosPermitidos.includes(codigoEstado) && !esResubidaAutorizada && !esYaCompletada) {
      throw new BadRequestException(
        `La orden está en estado ${orden.estados_orden?.nombre_estado || codigoEstado}, no puede finalizarse`,
      );
    }

    return orden;
  }

  /**
   * Limpia datos previos residuales de una orden dentro de la transacción atómica (Fase B).
   * Preserva repuestos despachados desde WMS (componentes_usados con movimiento).
   */
  private async limpiarDatosPreviosOrden(orden: any, tx: Prisma.TransactionClient): Promise<void> {
    const idOrden = orden.id_orden_servicio;

    await tx.evidencias_fotograficas.deleteMany({
      where: { id_orden_servicio: idOrden },
    });

    const firmaResidualTecnico = orden.id_firma_tecnico;
    const firmaResidualCliente = orden.id_firma_cliente;
    if (firmaResidualTecnico || firmaResidualCliente) {
      await tx.ordenes_servicio.update({
        where: { id_orden_servicio: idOrden },
        data: {
          id_firma_tecnico: null,
          id_firma_cliente: null,
        },
      });
      const residuales = Array.from(
        new Set([firmaResidualTecnico, firmaResidualCliente].filter(Boolean) as number[]),
      );
      for (const firmaId of residuales) {
        const [otrasOrdenesRef, cotizacionesRef] = await Promise.all([
          typeof tx.ordenes_servicio?.count === 'function'
            ? tx.ordenes_servicio.count({
                where: {
                  id_orden_servicio: { not: idOrden },
                  OR: [{ id_firma_tecnico: firmaId }, { id_firma_cliente: firmaId }],
                },
              })
            : Promise.resolve(0),
          typeof tx.cotizaciones?.count === 'function'
            ? tx.cotizaciones.count({
                where: {
                  OR: [{ id_firma_asesor: firmaId }, { id_firma_cliente: firmaId }],
                },
              })
            : Promise.resolve(0),
        ]);
        if (otrasOrdenesRef === 0 && cotizacionesRef === 0) {
          await tx.firmas_digitales
            .delete({ where: { id_firma_digital: firmaId } })
            .catch(() => {});
        }
      }
    }

    await tx.componentes_usados.updateMany({
      where: {
        id_orden_servicio: idOrden,
        id_actividad_ejecutada: { not: null },
      },
      data: { id_actividad_ejecutada: null },
    });
    await tx.actividades_ejecutadas.deleteMany({
      where: { id_orden_servicio: idOrden },
    });
    await tx.mediciones_servicio.deleteMany({
      where: { id_orden_servicio: idOrden },
    });
    await tx.ordenes_pendientes.deleteMany({
      where: { id_orden_servicio: idOrden },
    });

    const lecturasResExist = await tx.lecturas_horometro.findMany({
      where: { id_orden_servicio: idOrden },
      select: {
        id_equipo: true,
        horas_lectura: true,
        horas_transcurridas: true,
      },
    });
    if (lecturasResExist.length > 0) {
      await tx.lecturas_horometro.deleteMany({
        where: { id_orden_servicio: idOrden },
      });
      const equiposAfectados = Array.from(new Set(lecturasResExist.map((l) => l.id_equipo)));
      for (const idEq of equiposAfectados) {
        const ultimaRestante = await tx.lecturas_horometro.findFirst({
          where: { id_equipo: idEq },
          orderBy: [{ fecha_lectura: 'desc' }, { id_lectura: 'desc' }],
        });
        const borradaEq = lecturasResExist.find((l) => l.id_equipo === idEq);
        const valorRestaurado = ultimaRestante
          ? Number(ultimaRestante.horas_lectura)
          : borradaEq?.horas_transcurridas != null
            ? Math.max(0, Number(borradaEq.horas_lectura) - Number(borradaEq.horas_transcurridas))
            : null;
        if (valorRestaurado != null && Number.isFinite(valorRestaurado)) {
          const eqActualizado = await tx.equipos.update({
            where: { id_equipo: idEq },
            data: {
              horas_actuales: valorRestaurado,
              lectura_uso_actual: valorRestaurado,
              ...(ultimaRestante
                ? {
                    fecha_ultima_lectura_horas: ultimaRestante.fecha_lectura,
                    fecha_ultima_lectura_uso: ultimaRestante.fecha_lectura,
                  }
                : {}),
            },
          });
          if (orden.equipos && orden.equipos.id_equipo === idEq) {
            orden.equipos.horas_actuales = eqActualizado.horas_actuales;
            orden.equipos.lectura_uso_actual = eqActualizado.lectura_uso_actual;
          }
        }
      }
    }
  }

  /**
   * Fase A: Sube evidencias fotográficas a almacenamiento en la nube SIN escribir BD todavía.
   */
  private async subirEvidenciasCloud(
    evidencias: EvidenciaInput[],
    numeroOrden: string,
    storagePrefijo: string,
    onBatchProgress?: (subidas: number, total: number) => void,
  ): Promise<
    Array<{
      ev: EvidenciaInput;
      buffer: Buffer;
      url: string;
      hash: string;
      index: number;
      tipoFinal: string;
    }>
  > {
    if (evidencias.length === 0) return [];

    const cleanPrefix = (storagePrefijo || 'eam-media').replace(/^\/+|\/+$/g, '');
    const folder = `${cleanPrefix}/evidencias/${numeroOrden}`;

    this.logger.log(`   📤 Subiendo ${evidencias.length} evidencias a ${folder} (cupo=3)...`);
    const startUpload = Date.now();

    const MAX_CONCURRENCY = 3;
    const uploadResults: Array<{ ev: EvidenciaInput; buffer: Buffer; result: UploadResult }> = [];
    let idx = 0;

    while (idx < evidencias.length) {
      const batch = evidencias.slice(idx, idx + MAX_CONCURRENCY);
      const batchPromises = batch.map(async (ev) => {
        const buffer = Buffer.from(ev.base64, 'base64');
        const result = await this.cloudinaryService.uploadImage(buffer, {
          folder,
          tags: [ev.tipo, numeroOrden],
        });
        return { ev, buffer, result };
      });
      const batchResults = await Promise.all(batchPromises);
      for (const r of batchResults) {
        uploadResults.push(r);
      }
      idx += MAX_CONCURRENCY;
      onBatchProgress?.(Math.min(idx, evidencias.length), evidencias.length);
    }

    const uploadTime = Date.now() - startUpload;
    this.logger.log(
      `   ⚡ Subida completada en ${uploadTime}ms (${uploadResults.length} archivos)`,
    );

    const GENERAL_PREFIX_RE = /^(ANTES|DURANTE|DESPUES):\s/i;
    const RECLASSIFIABLE_TYPES = ['ANTES', 'DURANTE', 'DESPUES'];
    const datosValidados: Array<{
      ev: EvidenciaInput;
      buffer: Buffer;
      url: string;
      hash: string;
      index: number;
      tipoFinal: string;
    }> = [];

    for (let i = 0; i < uploadResults.length; i++) {
      const { ev, buffer, result: cloudinaryResult } = uploadResults[i];
      if (!cloudinaryResult.success || !cloudinaryResult.url) {
        throw new InternalServerErrorException(
          `Fallo al subir evidencia ${ev.tipo}: ${cloudinaryResult.error || 'URL no generada'}`,
        );
      }

      let tipoFinal: string = ev.tipo;
      if (
        RECLASSIFIABLE_TYPES.includes(ev.tipo?.toUpperCase()) &&
        GENERAL_PREFIX_RE.test(ev.descripcion || '')
      ) {
        tipoFinal = 'GENERAL';
      }

      const hash = createHash('sha256').update(buffer).digest('hex');
      datosValidados.push({ ev, buffer, url: cloudinaryResult.url, hash, index: i, tipoFinal });
    }

    return datosValidados;
  }

  /**
   * Fase B: Registra las evidencias previamente subidas dentro de la transacción atómica.
   */
  private async persistirEvidenciasDb(
    tx: Prisma.TransactionClient,
    datosValidados: Array<{
      ev: EvidenciaInput;
      buffer: Buffer;
      url: string;
      hash: string;
      index: number;
      tipoFinal: string;
    }>,
    idOrden: number,
  ): Promise<Array<{ id: number; tipo: string; url: string }>> {
    if (datosValidados.length === 0) return [];

    const ahora = new Date();
    const DB_CONCURRENCY = 5;
    const resultados: Array<{ id: number; tipo: string; url: string }> = [];
    let dbIdx = 0;

    while (dbIdx < datosValidados.length) {
      const dbBatch = datosValidados.slice(dbIdx, dbIdx + DB_CONCURRENCY);
      const dbBatchPromises = dbBatch.map(({ ev, buffer, url, hash, index, tipoFinal }) =>
        tx.evidencias_fotograficas
          .create({
            data: {
              id_orden_servicio: idOrden,
              id_orden_equipo: ev.idOrdenEquipo || null,
              tipo_evidencia: tipoFinal as any,
              descripcion: ev.descripcion || `Evidencia ${ev.tipo} del servicio`,
              nombre_archivo: `${ev.tipo.toLowerCase()}_${ahora.getTime()}_${index}.${ev.formato || 'png'}`,
              ruta_archivo: url,
              hash_sha256: hash,
              tama_o_bytes: BigInt(buffer.length),
              mime_type: `image/${ev.formato || 'png'}`,
              orden_visualizacion: index + 1,
              es_principal: index === 0,
              fecha_captura: ahora,
            },
          })
          .then((evidenciaDB) => ({
            id: evidenciaDB.id_evidencia,
            tipo: ev.tipo,
            url,
          })),
      );

      const batchResults = await Promise.all(dbBatchPromises);
      for (const r of batchResults) {
        resultados.push(r);
      }
      dbIdx += DB_CONCURRENCY;
    }

    this.logger.log(`   ✅ ${resultados.length} evidencias persistidas en BD`);
    return resultados;
  }

  /**
   * Resuelve el id_persona válido para una firma sin escribir BD (pre-commit).
   */
  private async resolverIdPersonaFirma(
    firma: FirmaInput,
    usuarioId: number,
    orden: any,
  ): Promise<number> {
    let idPersonaReal: number | null = null;

    if (firma.tipo === 'TECNICO') {
      idPersonaReal = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_persona;

      if (!idPersonaReal && firma.idPersona > 0) {
        const u = await this.prisma.usuarios.findUnique({
          where: { id_usuario: firma.idPersona },
          select: { id_persona: true },
        });
        if (u?.id_persona) idPersonaReal = u.id_persona;
      }

      if (!idPersonaReal) {
        const u = await this.prisma.usuarios.findUnique({
          where: { id_usuario: usuarioId },
          select: { id_persona: true },
        });
        if (u?.id_persona) idPersonaReal = u.id_persona;
      }
    } else {
      if (firma.idPersona && firma.idPersona > 0) {
        idPersonaReal = firma.idPersona;
      }
      if (!idPersonaReal) {
        idPersonaReal = orden.clientes?.id_persona;
      }
    }

    if (!idPersonaReal) {
      throw new BadRequestException(
        `No se pudo determinar la identidad de la persona para la firma del ${firma.tipo.toLowerCase()}.`,
      );
    }
    return idPersonaReal;
  }

  /**
   * Procesa y registra firmas digitales dentro de la transacción atómica.
   */
  private async procesarFirmas(
    firmas: { tecnico: FirmaInput; cliente?: FirmaInput },
    usuarioId: number,
    orden: any,
    personasResueltas: { tecnico: number; cliente?: number },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Array<{ id: number; tipo: string }>> {
    const startTime = Date.now();
    const firmaPromises: Promise<{ id: number; tipo: string }>[] = [
      this.registrarFirma(firmas.tecnico, usuarioId, orden, personasResueltas.tecnico, tx).then(
        (f) => ({
          id: f.id_firma_digital,
          tipo: 'TECNICO',
        }),
      ),
    ];

    if (firmas.cliente?.base64 && personasResueltas.cliente) {
      firmaPromises.push(
        this.registrarFirma(firmas.cliente, usuarioId, orden, personasResueltas.cliente, tx).then(
          (f) => ({
            id: f.id_firma_digital,
            tipo: 'CLIENTE',
          }),
        ),
      );
    }

    const resultados = await Promise.all(firmaPromises);
    const elapsed = Date.now() - startTime;
    this.logger.log(`⚡ [PERF] ${resultados.length} firmas procesadas en ${elapsed}ms`);
    return resultados;
  }

  private async registrarFirma(
    firma: FirmaInput,
    usuarioId: number,
    orden: any,
    idPersonaReal: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const hash = createHash('sha256').update(firma.base64).digest('hex');
    return tx.firmas_digitales.create({
      data: {
        id_persona: idPersonaReal,
        tipo_firma: firma.tipo,
        firma_base64: firma.base64,
        formato_firma: (firma.formato || 'PNG').toUpperCase(),
        hash_firma: hash,
        fecha_captura: new Date(),
        es_firma_principal: false,
        activa: true,
        observaciones: `Firma de ${firma.tipo} - Orden ${orden.numero_orden}`,
        registrada_por: usuarioId,
        fecha_registro: new Date(),
      },
    });
  }

  /**
   * Mapea el array de mediciones del mobile al objeto datosModulo para el PDF
   * Busca por nombre de parámetro y asigna al campo correspondiente
   */
  private mapearMedicionesADatosModulo(
    mediciones: Array<{ parametro: string; valor: number; unidad: string }>,
  ): {
    rpm?: number;
    presionAceite?: number;
    temperaturaRefrigerante?: number;
    cargaBateria?: number;
    horasTrabajo?: number;
    voltaje?: number;
    frecuencia?: number;
    corriente?: number;
  } {
    const datosModulo: any = {};

    for (const m of mediciones) {
      const param = m.parametro?.toLowerCase() || '';
      const valor = typeof m.valor === 'number' ? m.valor : parseFloat(String(m.valor));
      if (isNaN(valor)) continue;

      // Mapeo flexible por palabras clave
      if (param.includes('rpm') || param.includes('velocidad')) {
        datosModulo.rpm = valor;
      } else if (param.includes('presi') && param.includes('aceite')) {
        datosModulo.presionAceite = valor;
      } else if (
        param.includes('temp') &&
        (param.includes('refrig') || param.includes('refrigerante'))
      ) {
        datosModulo.temperaturaRefrigerante = valor;
      } else if (param.includes('bater') || param.includes('carga')) {
        datosModulo.cargaBateria = valor;
      } else if (this.esParametroHorometro(param)) {
        datosModulo.horasTrabajo = valor;
      } else if (
        param.includes('voltaje') ||
        (param.includes('volt') && !param.includes('bater'))
      ) {
        datosModulo.voltaje = valor;
      } else if (param.includes('frecuencia') || param.includes('hz')) {
        datosModulo.frecuencia = valor;
      } else if (param.includes('corriente') || param.includes('amper')) {
        datosModulo.corriente = valor;
      }
    }

    return datosModulo;
  }

  /**
   * Determina el tipo de informe según el equipo/servicio
   * ✅ FIX 15-DIC-2025 / EAM FASE 5: Corregidos nombres de propiedades según schema Prisma
   * y dispatch basado en tipos_servicio.categoria (enum canónico)
   */
  private determinarTipoInforme(orden: any): TipoInforme {
    if (this.pdfAssembler) {
      return this.pdfAssembler.determinarTipoInformeDesdeOrden(orden).tipoInforme;
    }

    const equipo = orden.equipos;
    const tipoServicio = orden.tipos_servicio;
    const tipoEquipoNombre = (equipo?.tipos_equipo?.nombre_tipo || '').toUpperCase();
    const tipoServicioCodigo = (
      tipoServicio?.codigo_tipo ||
      tipoServicio?.codigo ||
      ''
    ).toUpperCase();
    const tipoServicioNombre = (tipoServicio?.nombre_tipo || '').toUpperCase();
    const categoriaServicio = (tipoServicio?.categoria || '').toUpperCase();

    if (
      categoriaServicio === 'CORRECTIVO' ||
      categoriaServicio === 'EMERGENCIA' ||
      categoriaServicio === 'DIAGNOSTICO' ||
      tipoServicioCodigo.includes('CORR') ||
      tipoServicioNombre.includes('CORRECTIVO')
    ) {
      return 'CORRECTIVO';
    }

    if (typeof (this.pdfService as any)?.determinarTipoInforme === 'function') {
      const esB =
        tipoServicioCodigo.includes('TIPO_B') ||
        tipoServicioCodigo.includes('_B') ||
        tipoServicioNombre.includes('TIPO B');
      return this.pdfService.determinarTipoInforme(
        tipoEquipoNombre || 'EQUIPO',
        esB ? 'PREVENTIVO_B' : 'PREVENTIVO_A',
        {
          usaPlantillaUniversal: equipo?.tipos_equipo?.usa_plantilla_universal ?? true,
          formatoDocumento: tipoServicio?.formato_documento ?? null,
          categoriaServicio: tipoServicio?.categoria ?? null,
        },
      );
    }

    return 'UNIVERSAL_EAM';
  }

  private async resolveOrgBrandingSafe(): Promise<OrgBrandingContext> {
    if (this.pdfAssembler) {
      return this.pdfAssembler.resolveBranding();
    }
    if (typeof (this.pdfService as any)?.resolveBranding === 'function') {
      return (this.pdfService as any).resolveBranding();
    }
    if (typeof (this.configOrgService as any)?.getContext === 'function') {
      const ctx = await this.configOrgService!.getContext().catch(() => null);
      if (ctx) return buildOrgBranding(ctx);
    }
    return DEFAULT_ORG_BRANDING;
  }

  /**
   * Genera el PDF con los templates reales de MEKANOS
   * ✅ MULTI-EQUIPOS: Soporta estructura agrupada por equipo
   */
  private async generarPDFOrden(
    orden: any,
    dto: FinalizarOrdenDto,
    evidencias: Array<{ id: number; tipo: string; url: string }>,
    _firmas: Array<{ id: number; tipo: string }>, // Las firmas se incluyen vía dto.firmas
    tipoInforme: TipoInforme,
    datosModuloMapeado: any,
  ) {
    // Construir datos para el template

    // ✅ FIX 15-DIC-2025: Corregidos nombres de propiedades según schema Prisma
    // Las relaciones tienen nombres largos generados por Prisma
    const tecnicoEmpleado = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;
    const cliente = orden.clientes;
    const equipo = orden.equipos;
    const tipoServicio = orden.tipos_servicio;

    // Nombre del técnico (persona natural o nombre completo como fallback)
    const tecnicoPersona = tecnicoEmpleado?.persona;
    const nombreTecnico =
      tecnicoPersona?.primer_nombre && tecnicoPersona?.primer_apellido
        ? `${tecnicoPersona.primer_nombre} ${tecnicoPersona.primer_apellido}`
        : tecnicoPersona?.nombre_completo || 'N/A';

    // Cargar catálogo por IDs para enriquecer PDF (Fase 6: tipoActividad, rolSemantico, etc.)
    const allPdfCatIds = Array.from(
      new Set(
        [
          ...(dto.actividades || []).map((a) => a.idActividadCatalogo),
          ...(dto.actividadesPorEquipo || []).flatMap((g) =>
            g.actividades.map((a) => a.idActividadCatalogo),
          ),
        ].filter((id): id is number => id != null && Number.isFinite(Number(id))),
      ),
    );
    const catMetaMap = new Map<number, any>();
    if (allPdfCatIds.length > 0) {
      const cats = await this.prisma.catalogo_actividades.findMany({
        where: { id_actividad_catalogo: { in: allPdfCatIds } },
        select: {
          id_actividad_catalogo: true,
          tipo_actividad: true,
          id_parametro_medicion: true,
          tipo_control_input: true,
          config_input_json: true,
          rol_semantico: true,
          naturaleza_personalizada: true,
        },
      });
      for (const c of cats) catMetaMap.set(c.id_actividad_catalogo, c);
    }

    const enrichActForPdf = (a: ActividadInput) => {
      const meta =
        a.idActividadCatalogo != null ? catMetaMap.get(Number(a.idActividadCatalogo)) : undefined;
      let respuestaJson = a.respuestaJson;
      if (typeof respuestaJson === 'string') {
        try {
          respuestaJson = JSON.parse(respuestaJson);
        } catch {
          /* keep raw */
        }
      }
      return {
        sistema: a.sistema,
        descripcion: a.descripcion,
        resultado: a.resultado,
        observaciones: a.observaciones,
        tipoActividad: meta?.tipo_actividad,
        idParametroMedicion: meta?.id_parametro_medicion ?? undefined,
        tipoControlInput: meta?.tipo_control_input,
        configInputJson: meta?.config_input_json,
        rolSemantico: meta?.rol_semantico,
        naturalezaPersonalizada: meta?.naturaleza_personalizada,
        respuestaJson,
      };
    };

    // ✅ MULTI-EQUIPOS: Construir estructura para PDF multi-equipo
    // La estructura debe coincidir con ActividadesPorEquipoPDF que espera:
    // { equipo: EquipoOrdenPDF, actividades: ActividadPDF[] }
    let actividadesPorEquipo: Array<{
      equipo: {
        idOrdenEquipo: number;
        ordenSecuencia: number;
        nombreSistema?: string;
        codigoEquipo?: string;
        nombreEquipo?: string;
        estado: string;
      };
      actividades: Array<{
        sistema: string;
        descripcion: string;
        resultado: string;
        observaciones?: string;
        tipoActividad?: string;
        idParametroMedicion?: number | null;
        tipoControlInput?: string;
        configInputJson?: any;
        rolSemantico?: string | null;
        naturalezaPersonalizada?: string | null;
        respuestaJson?: any;
      }>;
    }> = [];

    let medicionesPorEquipo: Array<{
      equipo: {
        idOrdenEquipo: number;
        ordenSecuencia: number;
        nombreSistema?: string;
        codigoEquipo?: string;
        nombreEquipo?: string;
        estado: string;
      };
      mediciones: Array<{
        parametro: string;
        valor: number;
        unidad: string;
        nivelAlerta: string;
      }>;
    }> = [];

    if (dto.esMultiEquipo && dto.actividadesPorEquipo) {
      this.logger.log(
        `📋 Construyendo datos multi-equipo para PDF (${dto.actividadesPorEquipo.length} equipos)`,
      );

      actividadesPorEquipo = dto.actividadesPorEquipo.map((eq, index) => ({
        equipo: {
          idOrdenEquipo: eq.idOrdenEquipo,
          ordenSecuencia: index + 1,
          nombreSistema: eq.nombreEquipo,
          codigoEquipo: eq.codigoEquipo,
          nombreEquipo: eq.nombreEquipo,
          estado: 'COMPLETADO',
        },
        actividades: eq.actividades.map((a) => enrichActForPdf(a)),
      }));

      // Log para debugging
      for (const eq of actividadesPorEquipo) {
        this.logger.log(`   📋 ${eq.equipo.nombreSistema}: ${eq.actividades.length} actividades`);
      }
    } else if (orden.ordenes_equipos && orden.ordenes_equipos.length > 1) {
      // ✅ FIX 16-DIC-2025: FALLBACK para cuando Flutter no envía estructura multi-equipo
      // Detectamos multi-equipo desde la BD y distribuimos las actividades
      const numEquipos = orden.ordenes_equipos.length;
      const actividadesPlanas = dto.actividades;

      this.logger.log(
        `⚠️ FALLBACK MULTI-EQUIPO: Distribuyendo ${actividadesPlanas.length} actividades entre ${numEquipos} equipos`,
      );

      // Agrupar actividades por descripción (cada descripción aparece N veces, una por equipo)
      const actividadesUnicas = new Map<string, typeof actividadesPlanas>();
      for (const act of actividadesPlanas) {
        const key = act.descripcion;
        if (!actividadesUnicas.has(key)) {
          actividadesUnicas.set(key, []);
        }
        actividadesUnicas.get(key)!.push(act);
      }

      actividadesPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => ({
        equipo: {
          idOrdenEquipo: oe.id_orden_equipo,
          ordenSecuencia: oe.orden_secuencia || equipoIndex + 1,
          nombreSistema:
            oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
          codigoEquipo: oe.equipos?.codigo_equipo,
          nombreEquipo: oe.equipos?.nombre_equipo,
          estado: 'COMPLETADO',
        },
        actividades: Array.from(actividadesUnicas.entries()).map(([descripcion, acts]) => {
          const actEquipo = acts[equipoIndex] || acts[0];
          return enrichActForPdf({ ...actEquipo, descripcion });
        }),
      }));

      this.logger.log(
        `✅ FALLBACK completado: ${actividadesUnicas.size} actividades únicas x ${numEquipos} equipos`,
      );
      for (const eq of actividadesPorEquipo) {
        this.logger.log(`   📋 ${eq.equipo.nombreSistema}: ${eq.actividades.length} actividades`);
      }
    }

    const parametrosCatalogo = await this.prisma.parametros_medicion.findMany({
      where: { activo: true },
    });
    const normNombreParam = (v: unknown) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    const paramById = new Map<number, any>(
      parametrosCatalogo.map((p) => [p.id_parametro_medicion, p]),
    );
    const paramByNombreLower = new Map<string, any>(
      parametrosCatalogo.map((p) => [normNombreParam(p.nombre_parametro), p]),
    );
    const mapMedicionParaPdf = (m: any, idOrdenEquipo?: number | null) => {
      const param =
        (m?.idParametroMedicion != null
          ? paramById.get(Number(m.idParametroMedicion))
          : undefined) ||
        (m?.parametro ? paramByNombreLower.get(normNombreParam(m.parametro)) : undefined);
      const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(orden, idOrdenEquipo);
      const resolved = resolverParametroConConfig(param, configEquipo, configPlantilla);
      const valorNum = Number(m.valor) || 0;
      const unidad = resolved.esPersonalizado
        ? resolved.unidadMedida
        : (m.unidad && String(m.unidad).trim()) || resolved.unidadMedida || '';
      const ev = param ? evaluarValorContraRangos(valorNum, resolved, unidad, 'OK') : null;
      const alertaFinal =
        ev &&
        (resolved.esPersonalizado ||
          ev.nivelAlerta === 'CRITICO' ||
          ev.nivelAlerta === 'ADVERTENCIA')
          ? ev.nivelAlerta
          : m.nivelAlerta || 'OK';
      const estado =
        alertaFinal === 'CRITICO' || alertaFinal === 'CRITICAL'
          ? 'CRITICO'
          : alertaFinal === 'ADVERTENCIA' || alertaFinal === 'WARNING'
            ? 'ALERTA'
            : 'NORMAL';
      return {
        parametro: m.parametro,
        valor: m.valor,
        unidad,
        nivelAlerta: alertaFinal,
        rangoMin: resolved.minNormal,
        rangoMax: resolved.maxNormal,
        estado,
      };
    };

    if (dto.esMultiEquipo && dto.medicionesPorEquipo) {
      medicionesPorEquipo = dto.medicionesPorEquipo.map((eq, index) => ({
        equipo: {
          idOrdenEquipo: eq.idOrdenEquipo,
          ordenSecuencia: index + 1,
          nombreSistema: eq.nombreEquipo,
          nombreEquipo: eq.nombreEquipo,
          estado: 'COMPLETADO',
        },
        mediciones: eq.mediciones.map((m) => mapMedicionParaPdf(m, eq.idOrdenEquipo)),
      }));

      for (const eq of medicionesPorEquipo) {
        this.logger.log(`   📏 ${eq.equipo.nombreSistema}: ${eq.mediciones.length} mediciones`);
      }
    } else if (
      orden.ordenes_equipos &&
      orden.ordenes_equipos.length > 1 &&
      dto.mediciones &&
      dto.mediciones.length > 0
    ) {
      // ✅ FIX 16-DIC-2025: FALLBACK para mediciones cuando Flutter no envía estructura multi-equipo
      const numEquipos = orden.ordenes_equipos.length;
      const medicionesPlanas = dto.mediciones;

      this.logger.log(
        `⚠️ FALLBACK MEDICIONES: Distribuyendo ${medicionesPlanas.length} mediciones entre ${numEquipos} equipos`,
      );

      // Agrupar mediciones por parámetro
      const medicionesUnicas = new Map<string, typeof medicionesPlanas>();
      for (const med of medicionesPlanas) {
        const key = med.parametro;
        if (!medicionesUnicas.has(key)) {
          medicionesUnicas.set(key, []);
        }
        medicionesUnicas.get(key)!.push(med);
      }

      medicionesPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => ({
        equipo: {
          idOrdenEquipo: oe.id_orden_equipo,
          ordenSecuencia: oe.orden_secuencia || equipoIndex + 1,
          nombreSistema:
            oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
          nombreEquipo: oe.equipos?.nombre_equipo,
          estado: 'COMPLETADO',
        },
        mediciones: Array.from(medicionesUnicas.entries()).map(([parametro, meds]) => {
          const medEquipo = meds[equipoIndex] || meds[0];
          return mapMedicionParaPdf({ ...medEquipo, parametro }, oe.id_orden_equipo);
        }),
      }));

      this.logger.log(
        `✅ FALLBACK MEDICIONES completado: ${medicionesUnicas.size} parámetros únicos x ${numEquipos} equipos`,
      );
    }

    // ✅ FIX 16-DIC-2025: Detectar multi-equipo desde FALLBACK o DTO
    const esMultiEquipo =
      dto.esMultiEquipo || (orden.ordenes_equipos && orden.ordenes_equipos.length > 1);

    // ✅ FIX 16-DIC-2025: Construir evidenciasPorEquipo si es multi-equipo
    let evidenciasPorEquipo: Array<{
      equipo: {
        idOrdenEquipo: number;
        ordenSecuencia: number;
        nombreSistema?: string;
        codigoEquipo?: string;
        nombreEquipo?: string;
        estado: string;
      };
      evidencias: Array<{
        url: string;
        caption?: string;
        momento?: string;
      }>;
    }> = [];

    if (esMultiEquipo && orden.ordenes_equipos && orden.ordenes_equipos.length > 1) {
      const numEquipos = orden.ordenes_equipos.length;

      // ✅ FIX 16-DIC-2025: Verificar si las evidencias ya tienen idOrdenEquipo del móvil
      const evidenciasConEquipo = dto.evidencias.filter(
        (e) => e.idOrdenEquipo != null && e.idOrdenEquipo > 0,
      );
      const usarIdOrdenEquipoDelMovil = evidenciasConEquipo.length > 0;

      if (usarIdOrdenEquipoDelMovil) {
        // ✅ MODO CORRECTO: Usar idOrdenEquipo que viene del móvil
        this.logger.log(
          `📷 MODO PRECISO: Agrupando ${evidencias.length} evidencias por idOrdenEquipo del móvil`,
        );

        // Crear mapa de idOrdenEquipo -> evidencias (combinando dto y resultados subidos)
        const evidenciasPorIdEquipo = new Map<
          number,
          Array<{ url: string; caption?: string; momento?: string }>
        >();

        for (let i = 0; i < evidencias.length; i++) {
          const evSubida = evidencias[i]; // Contiene url y tipo
          const evOriginal = dto.evidencias[i]; // Contiene idOrdenEquipo y descripcion

          if (!evOriginal) continue;

          const idEquipo = evOriginal.idOrdenEquipo || 0;
          const momento = evSubida.tipo || 'DURANTE';
          // ✅ Preservar descripción de actividad (siempre con prefijo TIPO:)
          const caption = evOriginal.descripcion
            ? `${momento}: ${evOriginal.descripcion}`
            : `${momento}:`;

          if (!evidenciasPorIdEquipo.has(idEquipo)) {
            evidenciasPorIdEquipo.set(idEquipo, []);
          }
          evidenciasPorIdEquipo.get(idEquipo)!.push({
            url: evSubida.url,
            caption: caption,
            momento: momento,
          });
        }

        // Construir estructura por equipo
        evidenciasPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => {
          const idOrdenEquipo = oe.id_orden_equipo;
          const evidenciasDelEquipo = evidenciasPorIdEquipo.get(idOrdenEquipo) || [];

          // Ordenar evidencias: ANTES primero, luego DURANTE, DESPUES, MEDICION, GENERAL al final
          const ordenMomento = { ANTES: 1, DURANTE: 2, DESPUES: 3, MEDICION: 4, GENERAL: 5 };
          evidenciasDelEquipo.sort((a, b) => {
            const ordenA = ordenMomento[a.momento as keyof typeof ordenMomento] || 2;
            const ordenB = ordenMomento[b.momento as keyof typeof ordenMomento] || 2;
            return ordenA - ordenB;
          });

          return {
            equipo: {
              idOrdenEquipo: idOrdenEquipo,
              ordenSecuencia: oe.orden_secuencia || equipoIndex + 1,
              nombreSistema:
                oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
              codigoEquipo: oe.equipos?.codigo_equipo,
              nombreEquipo: oe.equipos?.nombre_equipo,
              estado: 'COMPLETADO',
            },
            evidencias: evidenciasDelEquipo,
          };
        });

        this.logger.log(`✅ EVIDENCIAS agrupadas por idOrdenEquipo`);
        for (const eq of evidenciasPorEquipo) {
          const porMomento = { ANTES: 0, DURANTE: 0, DESPUES: 0 };
          eq.evidencias.forEach((e) => {
            if (e.momento && Object.prototype.hasOwnProperty.call(porMomento, e.momento)) {
              porMomento[e.momento as keyof typeof porMomento]++;
            }
          });
          this.logger.log(
            `   📷 ${eq.equipo.nombreSistema}: ${eq.evidencias.length} evidencias (A:${porMomento.ANTES}, D:${porMomento.DURANTE}, Ds:${porMomento.DESPUES})`,
          );
        }
      } else {
        // ⚠️ FALLBACK: Distribuir por índice (legacy, cuando móvil no envía idOrdenEquipo)
        this.logger.log(
          `⚠️ FALLBACK EVIDENCIAS: Distribuyendo evidencias entre ${numEquipos} equipos (sin idOrdenEquipo)`,
        );

        // Agrupar evidencias por momento
        const evidenciasPorMomento: {
          [key: string]: Array<{ url: string; descripcion?: string }>;
        } = {
          ANTES: [],
          DURANTE: [],
          DESPUES: [],
          MEDICION: [],
          GENERAL: [],
        };

        for (let i = 0; i < evidencias.length; i++) {
          const evSubida = evidencias[i];
          const evOriginal = dto.evidencias[i];
          const momento = evSubida.tipo || 'DURANTE';
          if (!evidenciasPorMomento[momento]) {
            evidenciasPorMomento[momento] = [];
          }
          evidenciasPorMomento[momento].push({
            url: evSubida.url,
            descripcion: evOriginal?.descripcion,
          });
        }

        this.logger.log(
          `   📷 ANTES: ${evidenciasPorMomento['ANTES'].length}, DURANTE: ${evidenciasPorMomento['DURANTE'].length}, DESPUES: ${evidenciasPorMomento['DESPUES'].length}`,
        );

        evidenciasPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => {
          const evidenciasEquipo: Array<{ url: string; caption?: string; momento?: string }> = [];

          for (const momento of ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL']) {
            const evidenciasMomento = evidenciasPorMomento[momento] || [];
            const evidenciasParaEquipo = evidenciasMomento.filter(
              (_, i) => i % numEquipos === equipoIndex,
            );
            evidenciasEquipo.push(
              ...evidenciasParaEquipo.map((ev) => ({
                url: ev.url,
                caption: ev.descripcion ? `${momento}: ${ev.descripcion}` : `${momento}:`,
                momento: momento,
              })),
            );
          }

          return {
            equipo: {
              idOrdenEquipo: oe.id_orden_equipo,
              ordenSecuencia: oe.orden_secuencia || equipoIndex + 1,
              nombreSistema:
                oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
              codigoEquipo: oe.equipos?.codigo_equipo,
              nombreEquipo: oe.equipos?.nombre_equipo,
              estado: 'COMPLETADO',
            },
            evidencias: evidenciasEquipo,
          };
        });

        this.logger.log(`✅ FALLBACK EVIDENCIAS completado`);
        for (const eq of evidenciasPorEquipo) {
          this.logger.log(`   📷 ${eq.equipo.nombreSistema}: ${eq.evidencias.length} evidencias`);
        }
      }
    }

    // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Obtener unidades personalizadas del equipo
    let configUnidades: Record<string, string> | undefined;
    if (equipo?.id_equipo) {
      try {
        const unidades = await this.configParametrosService.obtenerTodasLasUnidades(
          equipo.id_equipo,
        );
        configUnidades = unidades as Record<string, string>;
        this.logger.log(
          `📐 Unidades personalizadas para equipo ${equipo.id_equipo}: ${JSON.stringify(configUnidades)}`,
        );
      } catch (e) {
        this.logger.warn(`⚠️ No se pudieron obtener unidades personalizadas: ${e}`);
      }
    }

    const contadorDesdeActividad = (() => {
      const todasActs = [
        ...(dto.actividades || []),
        ...(dto.actividadesPorEquipo || []).flatMap((g) => g.actividades || []),
      ];
      for (const act of todasActs) {
        const meta =
          act.idActividadCatalogo != null
            ? catMetaMap.get(Number(act.idActividadCatalogo))
            : undefined;
        const esContador =
          meta?.rol_semantico === 'LECTURA_CONTADOR_ACTIVO' ||
          meta?.tipo_control_input === 'LECTURA_CONTADOR';
        if (esContador) {
          const val = this.extraerHorasDeActividad(act);
          if (val != null && val > 0) return val;
        }
      }
      for (const act of todasActs) {
        const val = this.extraerHorasDeObservacion(act.observaciones);
        if (val != null && val > 0) return val;
      }
      return undefined;
    })();

    const contadorIntervencion =
      dto.datosModulo?.horasTrabajo ??
      datosModuloMapeado.horasTrabajo ??
      orden.horometro_final ??
      contadorDesdeActividad ??
      orden.horometro_inicial;

    const brand = await this.resolveOrgBrandingSafe();
    const contadorNum = contadorIntervencion != null ? Number(contadorIntervencion) : undefined;

    const datosPDF = {
      branding: brand,
      cliente:
        cliente?.persona?.nombre_comercial ||
        cliente?.persona?.nombre_completo ||
        cliente?.persona?.razon_social ||
        'N/A',
      direccion:
        orden.sedes_cliente?.direccion_sede ||
        cliente?.persona?.direccion_principal ||
        cliente?.persona?.ciudad ||
        'N/A',
      marcaEquipo: orden.equipos
        ? EquipoSpecsReader.getMarca(orden.equipos)
        : equipo?.nombre_equipo || 'N/A',
      serieEquipo: orden.equipos
        ? EquipoSpecsReader.getSerie(orden.equipos)
        : equipo?.numero_serie_equipo || 'N/A',
      tipoEquipo:
        (equipo as any)?.tipos_equipo?.nombre_tipo ||
        orden.equipos?.tipos_equipo?.nombre_tipo ||
        'EQUIPO',
      fecha: this.pdfAssembler
        ? this.pdfAssembler.formatearFechaConBrand(orden.fecha_inicio_real || new Date(), brand)
        : formatDateOrg(orden.fecha_inicio_real || new Date(), brand),
      tecnico: nombreTecnico,
      horaEntrada: dto.horaEntrada,
      horaSalida: dto.horaSalida,
      tipoServicio: tipoServicio?.nombre_tipo || tipoServicio?.nombre || 'PREVENTIVO',
      numeroOrden: orden.numero_orden,
      datosModulo: { ...datosModuloMapeado, ...(dto.datosModulo || {}) },
      repuestosDetallados: this.pdfAssembler
        ? this.pdfAssembler.extraerRepuestosDetallados(orden)
        : (orden.componentes_usados || []).map((cu: any) => ({
            sku: cu.catalogo_componentes?.codigo_interno || cu.referencia_manual || '',
            descripcion:
              cu.descripcion ||
              cu.catalogo_componentes?.descripcion_corta ||
              cu.catalogo_componentes?.nombre ||
              'Repuesto',
            marca: cu.catalogo_componentes?.marca || cu.marca_manual || '',
            modelo: cu.catalogo_componentes?.modelo || '',
            cantidad: Number(cu.cantidad ?? 1),
            unidad: cu.unidad || cu.catalogo_componentes?.unidad_medida || 'UND',
            origen: (cu.origen_componente as any) || 'BODEGA',
            lote: cu.lotes_componentes?.codigo_lote || undefined,
            ubicacionBodega: cu.ubicaciones_bodega?.codigo_ubicacion || undefined,
            estadoRetirado: cu.estado_componente_retirado || undefined,
            observaciones: cu.observaciones || undefined,
          })),
      equipoDetalle: this.pdfAssembler
        ? this.pdfAssembler.extraerEquipoDetallado(
            orden,
            { ...datosModuloMapeado, ...(dto.datosModulo || {}) },
            undefined,
            brand,
            contadorNum,
          )
        : orden.equipos
          ? {
              codigoEquipo: orden.equipos.codigo_equipo || 'S/C',
              nombreEquipo: orden.equipos.nombre_equipo || undefined,
              tipoEquipo: orden.equipos.tipos_equipo?.nombre_tipo || 'EQUIPO',
              tipoEquipoNombre: orden.equipos.tipos_equipo?.nombre_tipo || 'EQUIPO',
              marca: EquipoSpecsReader.getMarca(orden.equipos),
              modelo: EquipoSpecsReader.getModelo(orden.equipos),
              serie: EquipoSpecsReader.getSerie(orden.equipos),
              ubicacion: orden.equipos.ubicacion_texto || undefined,
              sede: orden.sedes_cliente?.nombre_sede || undefined,
              cliente:
                cliente?.persona?.razon_social ||
                cliente?.persona?.nombre_comercial ||
                cliente?.persona?.nombre_completo ||
                'N/A',
              clienteNit: cliente?.persona?.numero_identificacion
                ? `${cliente.persona.tipo_identificacion || brand.tipoIdFiscal}: ${cliente.persona.numero_identificacion}`
                : undefined,
              direccion:
                orden.sedes_cliente?.direccion_sede ||
                cliente?.persona?.direccion_principal ||
                'N/A',
              ciudad:
                orden.sedes_cliente?.ciudad_sede ||
                cliente?.persona?.ciudad ||
                brand.ciudadDefecto ||
                undefined,
              potenciaKva: orden.equipos.equipos_generador?.potencia_kva
                ? Number(orden.equipos.equipos_generador.potencia_kva)
                : undefined,
              potenciaKw: orden.equipos.equipos_generador?.potencia_kw
                ? Number(orden.equipos.equipos_generador.potencia_kw)
                : orden.equipos.equipos_motor?.potencia_kw
                  ? Number(orden.equipos.equipos_motor.potencia_kw)
                  : undefined,
              potenciaHp: orden.equipos.equipos_motor?.potencia_hp
                ? Number(orden.equipos.equipos_motor.potencia_hp)
                : orden.equipos.equipos_bomba?.potencia_hidraulica_kw
                  ? Number(orden.equipos.equipos_bomba.potencia_hidraulica_kw)
                  : undefined,
              voltaje: orden.equipos.equipos_generador?.voltaje_salida || undefined,
              frecuencia: orden.equipos.equipos_generador?.frecuencia_hz
                ? `${orden.equipos.equipos_generador.frecuencia_hz} Hz`
                : undefined,
              fases: orden.equipos.equipos_generador?.numero_fases
                ? `${orden.equipos.equipos_generador.numero_fases}F`
                : undefined,
              rpm: orden.equipos.equipos_motor?.velocidad_nominal_rpm
                ? `${orden.equipos.equipos_motor.velocidad_nominal_rpm} RPM`
                : undefined,
              tipoBomba: orden.equipos.equipos_bomba?.tipo_bomba || undefined,
              caudalGpm: orden.equipos.equipos_bomba?.caudal_maximo_m3h
                ? `${orden.equipos.equipos_bomba.caudal_maximo_m3h} m³/h`
                : undefined,
              presionPsi: orden.equipos.equipos_bomba?.altura_presion_trabajo_m
                ? `${orden.equipos.equipos_bomba.altura_presion_trabajo_m} m`
                : undefined,
              horometroIntervencion: contadorNum,
              horometroAcumulado:
                Math.max(
                  Number(orden.equipos.lectura_uso_actual ?? orden.equipos.horas_actuales ?? 0),
                  contadorNum ?? 0,
                ) || undefined,
              unidadUso: orden.equipos.tipos_equipo?.unidad_uso || undefined,
              etiquetaContador: orden.equipos.tipos_equipo?.etiqueta_contador || undefined,
              requiereHorometro: orden.equipos.tipos_equipo?.requiere_horometro ?? undefined,
            }
          : undefined,
      placaUniversal: orden.equipos
        ? EquipoSpecsReader.getPlacaUniversal(orden.equipos)
        : undefined,
      pendientes: Array.isArray(dto.pendientes)
        ? dto.pendientes.map((p: any) => ({
            descripcion: p.descripcion,
            prioridad: p.prioridad,
            estado: 'PENDIENTE',
            observaciones: p.observaciones || undefined,
          }))
        : (orden as any).ordenes_pendientes?.length > 0
          ? (orden as any).ordenes_pendientes.map((p: any) => ({
              descripcion: p.descripcion,
              prioridad: p.prioridad,
              estado: p.estado,
              observaciones: p.observaciones || p.notas_resolucion || undefined,
            }))
          : undefined,
      // ✅ FLEXIBILIZACIÓN PARÁMETROS: Unidades personalizadas para PDF
      configUnidades,
      // Actividades flat (para backward compatibility)
      actividades: dto.actividades.map((a) => enrichActForPdf(a)),
      // Mediciones flat (para backward compatibility)
      mediciones: (dto.mediciones || []).map((m) => mapMedicionParaPdf(m, m.idOrdenEquipo ?? null)),
      // ✅ MULTI-EQUIPOS: Estructura agrupada por equipo
      esMultiEquipo: esMultiEquipo,
      actividadesPorEquipo,
      medicionesPorEquipo,
      evidenciasPorEquipo, // ✅ FIX 16-DIC-2025: Agregar evidencias por equipo
      // Las evidencias están en el mismo orden que dto.evidencias
      evidencias: evidencias.map((e, index) => ({
        url: e.url,
        caption: dto.evidencias[index]?.descripcion
          ? `${e.tipo}: ${dto.evidencias[index].descripcion}`
          : `${e.tipo}:`,
      })),
      observaciones: dto.observaciones,
      // ✅ NUEVO: Razón de falla para correctivos (opcional)
      // Se pasa al template como parte del diagnóstico
      diagnostico: dto.razonFalla
        ? {
            descripcion: dto.razonFalla,
            causaRaiz: dto.razonFalla,
            sistemasAfectados: [],
          }
        : undefined,
      problemaReportado: dto.razonFalla
        ? {
            descripcion: dto.razonFalla,
            fechaReporte: new Date().toISOString(),
          }
        : undefined,
      // Firmas como data URL para mostrar en el PDF
      firmaTecnico: dto.firmas.tecnico?.base64
        ? `data:image/${dto.firmas.tecnico.formato || 'png'};base64,${dto.firmas.tecnico.base64}`
        : undefined,
      firmaCliente: dto.firmas.cliente?.base64
        ? `data:image/${dto.firmas.cliente.formato || 'png'};base64,${dto.firmas.cliente.base64}`
        : undefined,
      // ✅ FIX 05-ENE-2026: Datos del firmante para mostrar nombre/cargo en el PDF
      nombreTecnico: nombreTecnico,
      cargoTecnico: 'Técnico Responsable',
      // ✅ FIX 06-FEB-2026: Cadena robusta de fallback para nombre/cargo del cliente
      // 1. nombreFirmante explícito del mobile (si no es genérico)
      // 2. Nombre de la persona del cliente vinculado a la orden
      // 3. Fallback genérico
      nombreCliente:
        dto.firmas.cliente?.nombreFirmante && dto.firmas.cliente.nombreFirmante !== 'Cliente'
          ? dto.firmas.cliente.nombreFirmante
          : cliente?.persona?.nombre_comercial ||
            `${cliente?.persona?.primer_nombre || ''} ${cliente?.persona?.primer_apellido || ''}`.trim() ||
            cliente?.persona?.razon_social ||
            dto.firmas.cliente?.nombreFirmante ||
            undefined,
      cargoCliente: dto.firmas.cliente?.cargoFirmante || 'Cliente / Autorizador',
    };

    return this.pdfService.generarPDF({
      tipoInforme,
      datos: datosPDF as any,
    });
  }

  /**
   * Sube el PDF a Cloudflare R2
   * Guarda URL base en BD (la URL requiere autenticación pero el PDF se envía por email)
   *
   * ✅ FIX 29-ABR-2026: Recibe `downloadFilename` (nombre canónico) que se persiste
   *     como Content-Disposition en R2 para que al descargar el PDF el navegador
   *     sugiera el nombre legible (`INFORME - DDMM-YY - SERVICIO EQUIPO - CLIENTE - YYYY.pdf`).
   */
  private async subirPDFaR2(
    buffer: Buffer,
    numeroOrden: string,
    downloadFilename?: string,
  ): Promise<{ url: string; key: string }> {
    const timestamp = Date.now();
    const filename = `${numeroOrden}/informe_${timestamp}.pdf`;

    const url = await this.r2Service.uploadPDF(buffer, filename, { downloadFilename });

    this.logger.log(
      `📎 PDF subido a R2: ${filename}${downloadFilename ? ` (download: ${downloadFilename})` : ''}`,
    );

    return {
      url,
      key: `ordenes/pdfs/${filename}`,
    };
  }

  /**
   * Calcula el nombre canónico de descarga del informe a partir de la orden.
   * Centraliza la lógica para que R2 (Content-Disposition) y el email adjunto
   * usen exactamente el mismo nombre.
   */
  private calcularDownloadFilename(orden: any): string {
    const cliente = orden.clientes;
    const persona = cliente?.persona;
    const tipoServicio = orden.tipos_servicio;
    const equipo = orden.equipos;
    const tipoEquipo = equipo?.tipos_equipo;

    // Preferir fecha real de fin → fecha real de inicio → programada → ahora
    const fechaServicio =
      orden.fecha_fin_real || orden.fecha_inicio_real || orden.fecha_programada || new Date();

    const nombreCliente =
      persona?.nombre_comercial ||
      persona?.razon_social ||
      persona?.nombre_completo ||
      (persona
        ? [persona.primer_nombre, persona.primer_apellido].filter(Boolean).join(' ')
        : null) ||
      'CLIENTE';

    return buildInformeFilename({
      fechaServicio,
      codigoTipoServicio: tipoServicio?.codigo_tipo,
      nombreTipoServicio: tipoServicio?.nombre_tipo,
      codigoTipoEquipo: tipoEquipo?.codigo_tipo,
      nombreTipoEquipo: tipoEquipo?.nombre_tipo,
      nombreCliente,
      nombreEquipo: equipo?.nombre_equipo,
      numeroOrden: orden.numero_orden,
    });
  }

  /**
   * Registra el documento generado en BD
   */
  private async registrarDocumento(
    idOrden: number,
    numeroOrden: string,
    url: string,
    pdfResult: any,
    usuarioId: number,
    nombreEmpresa?: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<{ id: number }> {
    const hash = createHash('sha256').update(pdfResult.buffer).digest('hex');
    const orgTag = (nombreEmpresa || 'EAM')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .slice(0, 20);

    const documento = await tx.documentos_generados.create({
      data: {
        tipo_documento: 'INFORME_SERVICIO',
        id_referencia: idOrden,
        numero_documento: `INF-${numeroOrden}-${Date.now()}`,
        ruta_archivo: url,
        hash_sha256: hash,
        tama_o_bytes: BigInt(pdfResult.size),
        mime_type: 'application/pdf',
        fecha_generacion: new Date(),
        generado_por: usuarioId,
        herramienta_generacion: `${orgTag}-FINALIZACION-SERVICE`,
      },
    });

    return { id: documento.id_documento };
  }

  private async enviarEmailInforme(
    orden: any,
    pdfResult: any,
    emailAdicional?: string,
    downloadFilename?: string,
  ): Promise<{ enviado: boolean; destinatario: string; messageId?: string }> {
    const cliente = orden.clientes;
    const equipo = orden.equipos;
    const tipoServicio = orden.tipos_servicio;
    const tecnicoEmpleado = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;

    const destinatarios: string[] = [];
    const emailCliente = cliente?.persona?.email_principal?.trim();
    if (emailCliente && emailCliente.includes('@')) {
      destinatarios.push(emailCliente);
    }

    if (cliente?.emails_notificacion) {
      const emailsExtra = cliente.emails_notificacion
        .split(';;')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0 && e.includes('@'));
      for (const extra of emailsExtra) {
        if (!destinatarios.includes(extra)) destinatarios.push(extra);
      }
    }

    if (cliente?.cliente_principal?.emails_notificacion) {
      const emailsPrincipal = cliente.cliente_principal.emails_notificacion
        .split(';;')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0 && e.includes('@'));
      for (const extra of emailsPrincipal) {
        if (!destinatarios.includes(extra)) destinatarios.push(extra);
      }
    }

    if (emailAdicional && emailAdicional.includes('@') && !destinatarios.includes(emailAdicional)) {
      destinatarios.push(emailAdicional);
    }

    this.logger.log(
      `📧 Email destino (${destinatarios.length} destinatarios): ${destinatarios.join(', ') || 'ninguno'}`,
    );

    if (destinatarios.length === 0) {
      this.logger.warn('⚠️ No hay destinatarios de email configurados para este cliente');
      return { enviado: false, destinatario: 'ninguno' };
    }

    try {
      // Preparar datos para el email
      const tipoEquipoNombre = equipo?.tipos_equipo?.nombre_tipo || '';
      const equipoNombre = equipo?.nombre_equipo || '';
      const equipoDesc = equipoNombre || tipoEquipoNombre || 'Equipo';

      const brand = await this.resolveOrgBrandingSafe();
      const emailData: OrdenEmailData = {
        branding: brand,
        ordenNumero: orden.numero_orden,
        clienteNombre:
          cliente?.persona?.nombre_comercial ||
          cliente?.persona?.nombre_completo ||
          cliente?.persona?.razon_social ||
          'Cliente',
        equipoDescripcion: equipoDesc,
        tipoMantenimiento: tipoServicio?.nombre_tipo || tipoServicio?.codigo_tipo || 'PREVENTIVO',
        fechaServicio: formatDateOrg(orden.fecha_inicio_real || new Date(), brand),
        tecnicoNombre:
          `${tecnicoEmpleado?.persona?.primer_nombre || ''} ${tecnicoEmpleado?.persona?.primer_apellido || ''}`.trim() ||
          'Técnico',
      };

      // ✅ FIX 28-FEB-2026: Usar cuenta email del cliente con fallback al principal para sedes
      const idCuentaEmailCliente =
        cliente?.id_cuenta_email_remitente ||
        cliente?.cliente_principal?.id_cuenta_email_remitente ||
        null;

      // ✅ 24-FEB-2026: Enviar a TODOS los destinatarios
      // ✅ FIX 29-ABR-2026: Pasar filename canónico para que el adjunto del email
      //    use el mismo nombre legible que la descarga desde R2/Portal.
      const result = await this.emailService.sendInformeTecnicoEmail(
        emailData,
        destinatarios,
        pdfResult.buffer,
        idCuentaEmailCliente,
        downloadFilename,
      );

      return {
        enviado: result.success,
        destinatario: destinatarios.join(', '),
        messageId: result.messageId,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error enviando email: ${err.message}`);
      return { enviado: false, destinatario: destinatarios.join(', ') };
    }
  }

  /**
   * Actualiza el estado de la orden a COMPLETADA
   * ✅ OPTIMIZACIÓN 31-DIC-2025: Recibe idEstado precargado para evitar query adicional
   */
  private async actualizarEstadoOrden(
    idOrden: number,
    idEstadoCompletada: number,
    observaciones: string,
    usuarioId: number,
    horaEntrada?: string,
    horaSalida?: string,
    esResubida: boolean = false,
    reasignacionTecnico?: { tecnicoOriginalId: number; tecnicoEjecutorId: number },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const ordenExistente = await tx.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      select: {
        id_estado_actual: true,
        fecha_inicio_real: true,
        fecha_fin_real: true,
        duracion_minutos: true,
        observaciones_cierre: true,
      },
    });

    // Usar fecha_inicio_real existente como base, o fecha actual si no existe
    const fechaBase = ordenExistente?.fecha_inicio_real
      ? new Date(ordenExistente.fecha_inicio_real)
      : new Date();

    this.logger.log(
      `   📅 Fecha base para cálculo: ${fechaBase.toISOString()} (existente: ${!!ordenExistente?.fecha_inicio_real})`,
    );

    let fechaInicioReal: Date | undefined;
    let fechaFinReal: Date = new Date();

    // ✅ FIX 07-FEB-2026: Helper robusto para parsear hora en múltiples formatos
    // Soporta: "HH:mm", "H:mm", "HH:mm a.m.", "HH:mm AM", "HH:mm p. m.", etc.
    const parsearHora = (horaStr: string): { horas: number; minutos: number } | null => {
      if (!horaStr) return null;
      const limpio = horaStr.trim();

      // Detectar AM/PM (español e inglés)
      const esAM = /a\.?\s?m\.?$/i.test(limpio);
      const esPM = /p\.?\s?m\.?$/i.test(limpio);
      // Remover AM/PM para parsear solo los números
      const soloNumeros = limpio.replace(/\s*(a\.?\s?m\.?|p\.?\s?m\.?)\s*$/i, '').trim();

      const partes = soloNumeros.split(':');
      if (partes.length < 2) return null;

      let horas = parseInt(partes[0], 10);
      const minutos = parseInt(partes[1], 10);

      if (
        isNaN(horas) ||
        isNaN(minutos) ||
        horas < 0 ||
        horas > 23 ||
        minutos < 0 ||
        minutos > 59
      ) {
        // Intentar formato más laxo (e.g., "1:37 p. m.")
        if (isNaN(horas) || isNaN(minutos)) return null;
      }

      // Convertir 12h a 24h si hay AM/PM
      if (esAM || esPM) {
        if (horas === 12) horas = esAM ? 0 : 12;
        else if (esPM) horas += 12;
      }

      if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
      return { horas, minutos };
    };

    if (horaEntrada) {
      const parsed = parsearHora(horaEntrada);
      if (parsed) {
        fechaInicioReal = new Date(
          fechaBase.getFullYear(),
          fechaBase.getMonth(),
          fechaBase.getDate(),
          parsed.horas,
          parsed.minutos,
          0,
          0,
        );
      } else {
        this.logger.warn(`   ⚠️ horaEntrada inválida: "${horaEntrada}", usando hora actual`);
        fechaInicioReal = new Date();
      }
    } else if (ordenExistente?.fecha_inicio_real) {
      // Si no viene horaEntrada, mantener la existente
      fechaInicioReal = new Date(ordenExistente.fecha_inicio_real);
    }

    if (horaSalida) {
      const parsed = parsearHora(horaSalida);
      if (parsed) {
        fechaFinReal = new Date(
          fechaBase.getFullYear(),
          fechaBase.getMonth(),
          fechaBase.getDate(),
          parsed.horas,
          parsed.minutos,
          0,
          0,
        );
      } else {
        this.logger.warn(`   ⚠️ horaSalida inválida: "${horaSalida}", usando hora actual`);
        fechaFinReal = new Date();
      }

      // 🔧 FIX: Si hora de salida es menor que hora de entrada, es cruce de medianoche
      // Debemos agregar un día a la fecha de fin
      if (fechaInicioReal && fechaFinReal < fechaInicioReal) {
        fechaFinReal = new Date(fechaFinReal.getTime() + 24 * 60 * 60 * 1000);
        this.logger.log(
          `   ⏰ Cruce de medianoche detectado, fecha_fin_real ajustada al día siguiente`,
        );
      }
    }

    // ✅ 19-OCT-2026: una resubida corrige datos, NO el tiempo del servicio.
    // Si existen fechas originales, se conservan para no alterar la duración
    // histórica ni el PDF, aunque un cliente antiguo envíe horas nuevas.
    if (
      esResubida &&
      ordenExistente?.fecha_inicio_real != null &&
      ordenExistente?.fecha_fin_real != null
    ) {
      fechaInicioReal = new Date(ordenExistente.fecha_inicio_real);
      fechaFinReal = new Date(ordenExistente.fecha_fin_real);
      this.logger.log('🔁 Resubida: conservando fechas originales del servicio');
    }

    // Log para debugging
    this.logger.log(`   📅 Fechas calculadas:`);
    this.logger.log(`      - fecha_inicio_real: ${fechaInicioReal?.toISOString() ?? 'null'}`);
    this.logger.log(`      - fecha_fin_real: ${fechaFinReal.toISOString()}`);

    // Calcular duración en minutos
    let duracionMinutos: number | undefined;
    if (fechaInicioReal) {
      const diffMs = fechaFinReal.getTime() - fechaInicioReal.getTime();
      duracionMinutos = Math.round(diffMs / 60000);

      // Validación final: duración debe ser positiva y razonable (max 24h)
      if (duracionMinutos < 0 || duracionMinutos > 1440) {
        this.logger.warn(`   ⚠️ Duración inválida (${duracionMinutos} min), usando null`);
        duracionMinutos = undefined;
      }
    }

    // ✅ OPTIMIZACIÓN 31-DIC-2025: Usar transacción para update + historial en una sola operación
    // Eliminado query de verificación (diagnóstico) que añadía ~2-3s innecesarios
    const fechaModificacionValue = new Date();

    await tx.ordenes_servicio.update({
      where: { id_orden_servicio: idOrden },
      data: {
        id_estado_actual: idEstadoCompletada,
        fecha_inicio_real: fechaInicioReal,
        fecha_fin_real: fechaFinReal,
        duracion_minutos: duracionMinutos,
        observaciones_cierre: observaciones,
        modificado_por: usuarioId,
        fecha_modificacion: fechaModificacionValue,
      },
    });

    await tx.historial_estados_orden.create({
      data: {
        id_orden_servicio: idOrden,
        id_estado_anterior: esResubida
          ? idEstadoCompletada
          : (ordenExistente?.id_estado_actual ?? undefined),
        id_estado_nuevo: idEstadoCompletada,
        accion: esResubida ? 'RESUBIDA_TECNICO' : 'FINALIZAR',
        motivo_cambio: esResubida
          ? 'Corrección autorizada por el administrador'
          : 'Finalización de orden de servicio',
        fecha_cambio: fechaModificacionValue,
        observaciones: esResubida
          ? `Orden corregida y resubida. ${observaciones}`
          : `Orden finalizada. ${observaciones}`,
        realizado_por: usuarioId,
        metadata: crearMetadataObservacionesCierre({
          origen: 'FINALIZACION_MOVIL',
          anterior: ordenExistente?.observaciones_cierre,
          nueva: observaciones,
          extra: {
            evento: esResubida ? 'RESUBIDA_TECNICO' : 'FINALIZACION_TECNICO',
            ...(reasignacionTecnico
              ? {
                  reasignado_desde_tecnico_id: reasignacionTecnico.tecnicoOriginalId,
                  ejecutado_por_tecnico_id: reasignacionTecnico.tecnicoEjecutorId,
                }
              : {}),
          },
        }) as any,
      },
    });
  }

  /**
   * Resuelve y normaliza las actividades con su `idOrdenEquipo` verificado contra `orden.ordenes_equipos`.
   * Prioriza `dto.actividadesPorEquipo` (agrupación explícita del cliente) para garantizar
   * trazabilidad 1:1 en órdenes multi-equipo sin depender del orden de inserción en SQLite.
   */
  private resolverActividadesParaPersistir(orden: any, dto: FinalizarOrdenDto): ActividadInput[] {
    const ordenEquipos: any[] = Array.isArray(orden.ordenes_equipos) ? orden.ordenes_equipos : [];
    const validIds = new Set<number>(ordenEquipos.map((oe) => oe.id_orden_equipo));
    const secuenciaPorId = new Map<number, number>(
      ordenEquipos.map((oe, idx) => [oe.id_orden_equipo, oe.orden_secuencia ?? idx + 1]),
    );
    const unicoEquipoId = ordenEquipos.length === 1 ? ordenEquipos[0].id_orden_equipo : undefined;

    const validarId = (id?: number | null): number | undefined => {
      if (id != null && validIds.has(id)) return id;
      return unicoEquipoId;
    };

    if (dto.actividadesPorEquipo && dto.actividadesPorEquipo.length > 0) {
      const gruposOrdenados = [...dto.actividadesPorEquipo].sort(
        (a, b) =>
          (secuenciaPorId.get(a.idOrdenEquipo) ?? 9999) -
          (secuenciaPorId.get(b.idOrdenEquipo) ?? 9999),
      );
      const resultado: ActividadInput[] = [];
      for (const grupo of gruposOrdenados) {
        const idEqGrupo = validarId(grupo.idOrdenEquipo);
        for (const act of grupo.actividades || []) {
          resultado.push({
            ...act,
            idOrdenEquipo: validarId(act.idOrdenEquipo) ?? idEqGrupo,
          });
        }
      }
      if (resultado.length > 0) {
        return resultado;
      }
    }

    return (dto.actividades || []).map((act) => ({
      ...act,
      idOrdenEquipo: validarId(act.idOrdenEquipo),
    }));
  }

  /**
   * Resuelve y normaliza las mediciones con su `idOrdenEquipo` verificado contra `orden.ordenes_equipos`.
   * Agnóstico al tipo de activo y al tipo de parámetro medido (horómetro, presión, temperatura, UoM universal, etc.).
   */
  private resolverMedicionesParaPersistir(orden: any, dto: FinalizarOrdenDto): MedicionInput[] {
    const ordenEquipos: any[] = Array.isArray(orden.ordenes_equipos) ? orden.ordenes_equipos : [];
    const validIds = new Set<number>(ordenEquipos.map((oe) => oe.id_orden_equipo));
    const secuenciaPorId = new Map<number, number>(
      ordenEquipos.map((oe, idx) => [oe.id_orden_equipo, oe.orden_secuencia ?? idx + 1]),
    );
    const unicoEquipoId = ordenEquipos.length === 1 ? ordenEquipos[0].id_orden_equipo : undefined;

    const validarId = (id?: number | null): number | undefined => {
      if (id != null && validIds.has(id)) return id;
      return unicoEquipoId;
    };

    if (dto.medicionesPorEquipo && dto.medicionesPorEquipo.length > 0) {
      const gruposOrdenados = [...dto.medicionesPorEquipo].sort(
        (a, b) =>
          (secuenciaPorId.get(a.idOrdenEquipo) ?? 9999) -
          (secuenciaPorId.get(b.idOrdenEquipo) ?? 9999),
      );
      const resultado: MedicionInput[] = [];
      for (const grupo of gruposOrdenados) {
        const idEqGrupo = validarId(grupo.idOrdenEquipo);
        for (const med of grupo.mediciones || []) {
          resultado.push({
            ...med,
            idOrdenEquipo: validarId(med.idOrdenEquipo) ?? idEqGrupo,
          });
        }
      }
      if (resultado.length > 0) {
        return resultado;
      }
    }

    return (dto.mediciones || []).map((med) => ({
      ...med,
      idOrdenEquipo: validarId(med.idOrdenEquipo),
    }));
  }

  private mapNivelAlertaMedicion(nivel?: string): 'OK' | 'ADVERTENCIA' | 'CRITICO' {
    const norm = (nivel || 'OK').toUpperCase().trim();
    if (norm === 'CRITICAL' || norm === 'CRITICO') return 'CRITICO';
    if (norm === 'WARNING' || norm === 'ADVERTENCIA') return 'ADVERTENCIA';
    return 'OK';
  }

  private async persistirActividades(
    idOrden: number,
    actividades: ActividadInput[],
    usuarioId: number,
    tx: Prisma.TransactionClient = this.prisma,
    idTipoServicio?: number | null,
  ): Promise<number> {
    if (actividades.length === 0) return 0;

    // ✅ IDEMPOTENCIA: Verificar si ya hay actividades para esta orden
    const actividadesExistentes = await tx.actividades_ejecutadas.count({
      where: { id_orden_servicio: idOrden },
    });

    if (actividadesExistentes > 0) {
      this.logger.warn(
        `⚠️ IDEMPOTENCIA: Ya existen ${actividadesExistentes} actividades para orden ${idOrden}. Saltando inserción.`,
      );
      return 0; // No insertar duplicados
    }

    // PASO 1: Precargar catálogo en UNA sola query (priorizando el tipo de servicio de la orden)
    const catalogoCompleto = await tx.catalogo_actividades.findMany({
      select: {
        id_actividad_catalogo: true,
        descripcion_actividad: true,
        id_tipo_servicio: true,
      },
    });

    // Crear mapas para búsqueda O(1) (solo fallback legacy cuando no viene idActividadCatalogo Fase 6)
    const idsCatalogoValidos = new Set<number>();
    const catalogoServicioExacto = new Map<string, number>();
    const catalogoServicioPrefijo = new Map<string, number>();
    const catalogoGlobalExacto = new Map<string, number>();
    const catalogoGlobalPrefijo = new Map<string, number>();

    for (const cat of catalogoCompleto) {
      idsCatalogoValidos.add(cat.id_actividad_catalogo);
      const exactKey = cat.descripcion_actividad.trim().toLowerCase();
      const prefixKey = exactKey.substring(0, 50);
      catalogoGlobalExacto.set(exactKey, cat.id_actividad_catalogo);
      catalogoGlobalPrefijo.set(prefixKey, cat.id_actividad_catalogo);
      if (idTipoServicio && cat.id_tipo_servicio === idTipoServicio) {
        catalogoServicioExacto.set(exactKey, cat.id_actividad_catalogo);
        catalogoServicioPrefijo.set(prefixKey, cat.id_actividad_catalogo);
      }
    }

    // PASO 2: Preparar datos para batch insert con orden_secuencia independiente por equipo
    const ahora = new Date();
    const secuenciaPorEquipo = new Map<string, number>();
    const datosParaInsertar = actividades.map((act) => {
      // Fase 6: trazabilidad exacta por idActividadCatalogo; fallback legacy por descripción
      let idCatalogo: number | null = null;
      if (
        act.idActividadCatalogo != null &&
        idsCatalogoValidos.has(Number(act.idActividadCatalogo))
      ) {
        idCatalogo = Number(act.idActividadCatalogo);
      } else {
        const exactKey = act.descripcion.trim().toLowerCase();
        const prefixKey = exactKey.substring(0, 50);
        idCatalogo =
          catalogoServicioExacto.get(exactKey) ||
          catalogoServicioPrefijo.get(prefixKey) ||
          catalogoGlobalExacto.get(exactKey) ||
          catalogoGlobalPrefijo.get(prefixKey) ||
          null;
      }

      let respuestaJson: any = undefined;
      if (act.respuestaJson != null) {
        if (typeof act.respuestaJson === 'string') {
          try {
            respuestaJson = JSON.parse(act.respuestaJson);
          } catch {
            respuestaJson = { valor: act.respuestaJson };
          }
        } else {
          respuestaJson = act.respuestaJson;
        }
      }

      const equipoKey = act.idOrdenEquipo != null ? String(act.idOrdenEquipo) : 'NONE';
      const nextSeq = (secuenciaPorEquipo.get(equipoKey) || 0) + 1;
      secuenciaPorEquipo.set(equipoKey, nextSeq);

      return {
        id_orden_servicio: idOrden,
        id_orden_equipo: act.idOrdenEquipo ?? null,
        id_actividad_catalogo: idCatalogo,
        descripcion_manual: idCatalogo ? null : act.descripcion,
        sistema: act.sistema || 'GENERAL',
        orden_secuencia: nextSeq,
        estado: this.mapResultadoAEstado(act.resultado),
        ejecutada: true,
        fecha_ejecucion: ahora,
        ejecutada_por: usuarioId,
        observaciones: act.observaciones?.trim() ? act.observaciones.trim() : null,
        ...(respuestaJson !== undefined ? { respuesta_json: respuestaJson } : {}),
      };
    });

    // PASO 3: Batch insert con createMany
    const resultado = await tx.actividades_ejecutadas.createMany({
      data: datosParaInsertar,
      skipDuplicates: true,
    });

    return resultado.count;
  }

  /**
   * Persiste las mediciones en BD para estadísticas y trazabilidad
   * ✅ OPTIMIZADO: Precarga parámetros + batch insert con createMany
   * ✅ FIX 26-ENE-2026: Idempotencia real - verificar si ya existen registros
   */
  private async persistirMediciones(
    idOrden: number,
    mediciones: MedicionInput[],
    usuarioId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    if (mediciones.length === 0) return 0;

    // ✅ IDEMPOTENCIA: Verificar si ya hay mediciones para esta orden
    const medicionesExistentes = await tx.mediciones_servicio.count({
      where: { id_orden_servicio: idOrden },
    });

    if (medicionesExistentes > 0) {
      this.logger.warn(
        `⚠️ IDEMPOTENCIA: Ya existen ${medicionesExistentes} mediciones para orden ${idOrden}. Saltando inserción.`,
      );
      return 0; // No insertar duplicados
    }

    // PASO 1: Precargar TODOS los parámetros y contexto de equipo de la orden
    const [parametrosCompletos, ordenContext] = await Promise.all([
      tx.parametros_medicion.findMany(),
      tx.ordenes_servicio?.findUnique
        ? tx.ordenes_servicio.findUnique({
            where: { id_orden_servicio: idOrden },
            select: {
              equipos: { select: { config_parametros: true, plantillas_parametros: true } },
              ordenes_equipos: {
                select: {
                  id_orden_equipo: true,
                  equipos: { select: { config_parametros: true, plantillas_parametros: true } },
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    // Crear mapas para búsqueda O(1) - exacta y parcial
    const parametroMapExacto = new Map<string, any>();
    const parametroMapParcial = new Map<string, any>();

    for (const p of parametrosCompletos) {
      const nombreLower = p.nombre_parametro.trim().toLowerCase();
      parametroMapExacto.set(nombreLower, p);
      // También indexar primeros 20 chars para matching parcial
      const nombreCorto = nombreLower.substring(0, 20);
      parametroMapParcial.set(nombreCorto, p);
    }

    // PASO 2: Preparar datos para batch insert con evaluación contra overrides del equipo
    const ahora = new Date();
    const datosParaInsertar: Array<{
      id_orden_servicio: number;
      id_orden_equipo: number | null;
      id_parametro_medicion: number;
      valor_numerico: number;
      unidad_medida: string;
      fuera_de_rango: boolean;
      nivel_alerta: any;
      mensaje_alerta: string;
      observaciones: string | null;
      fecha_medicion: Date;
      medido_por: number;
    }> = [];

    for (const med of mediciones) {
      const nombreLower = med.parametro.trim().toLowerCase();
      const nombreCorto = nombreLower.substring(0, 20);

      // Buscar primero exacto, luego parcial
      const parametro = parametroMapExacto.get(nombreLower) || parametroMapParcial.get(nombreCorto);

      if (!parametro) {
        this.logger.warn(`   ⚠️ Parámetro NO encontrado: "${med.parametro}"`);
        continue;
      }

      const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(
        ordenContext,
        med.idOrdenEquipo ?? null,
      );
      const resolved = resolverParametroConConfig(parametro, configEquipo, configPlantilla);
      const unidadFinal = resolved.esPersonalizado
        ? resolved.unidadMedida
        : med.unidad || resolved.unidadMedida || parametro.unidad_medida;
      const ev = evaluarValorContraRangos(Number(med.valor), resolved, unidadFinal, 'OK');
      const tieneRangoConfigurado =
        resolved.minNormal !== undefined ||
        resolved.maxNormal !== undefined ||
        resolved.minCritico !== undefined ||
        resolved.maxCritico !== undefined;
      const nivelAlertaFinal =
        !tieneRangoConfigurado && med.nivelAlerta
          ? this.mapNivelAlertaMedicion(med.nivelAlerta)
          : ev.nivelAlerta;
      const fueraDeRangoFinal =
        !tieneRangoConfigurado && med.nivelAlerta ? nivelAlertaFinal !== 'OK' : ev.fueraDeRango;

      datosParaInsertar.push({
        id_orden_servicio: idOrden,
        id_orden_equipo: med.idOrdenEquipo ?? null,
        id_parametro_medicion: parametro.id_parametro_medicion,
        valor_numerico: med.valor,
        unidad_medida: unidadFinal,
        fuera_de_rango: fueraDeRangoFinal,
        nivel_alerta: nivelAlertaFinal,
        mensaje_alerta: ev.mensajeAlerta,
        observaciones: med.observaciones?.trim() ? med.observaciones.trim() : null,
        fecha_medicion: ahora,
        medido_por: usuarioId,
      });
    }

    if (datosParaInsertar.length === 0) return 0;

    // PASO 3: Batch insert con createMany
    const resultado = await tx.mediciones_servicio.createMany({
      data: datosParaInsertar,
      skipDuplicates: true,
    });

    return resultado.count;
  }

  /**
   * Registra la lectura del horómetro en la tabla lecturas_horometro
   * ROBUSTEZ: Valida que la lectura no sea inferior a la anterior
   */
  /**
   * Evalúa si un parámetro corresponde a lectura de contador de uso
   * (horómetro, ciclos, odómetro/kilometraje o UPM).
   */
  private esParametroHorometro(param?: string): boolean {
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

  private resolverMetricaUsoBackend(
    tipoEquipo?: {
      unidad_uso?: string | null;
      etiqueta_contador?: string | null;
      requiere_horometro?: boolean | null;
    } | null,
  ): {
    unidadUso: string;
    label: string;
    sufijo: string;
    maxDiario: number;
    minMargen: number;
    sinPrevioMax: number;
  } {
    const rawUnitOriginal = (tipoEquipo?.unidad_uso || 'HORAS').trim();
    const rawUnit = rawUnitOriginal.toUpperCase();
    const rawEtiqueta = tipoEquipo?.etiqueta_contador?.trim() || '';
    const etiqLower = rawEtiqueta.toLowerCase();

    if (
      tipoEquipo?.requiere_horometro === false ||
      rawUnit === 'CAL' ||
      rawEtiqueta.toUpperCase() === 'N/A'
    ) {
      return {
        unidadUso: 'CAL',
        label:
          rawEtiqueta && rawEtiqueta.toUpperCase() !== 'N/A'
            ? rawEtiqueta
            : 'Contador de Calendario',
        sufijo: '',
        maxDiario: 100000,
        minMargen: 100000,
        sinPrevioMax: 50000000,
      };
    }
    if (rawUnit === 'CICLOS' || etiqLower.includes('ciclo')) {
      return {
        unidadUso: 'CICLOS',
        label: rawEtiqueta || 'Ciclos de Viaje',
        sufijo: 'ciclos',
        maxDiario: 10000,
        minMargen: 250000,
        sinPrevioMax: 10000000,
      };
    }
    if (
      rawUnit === 'KM_ODO' ||
      rawUnit === 'KM' ||
      etiqLower.includes('odómetro') ||
      etiqLower.includes('odometro') ||
      etiqLower.includes('kilometr')
    ) {
      return {
        unidadUso: 'KM_ODO',
        label: rawEtiqueta || 'Kilometraje (Odómetro)',
        sufijo: 'km',
        maxDiario: 2500,
        minMargen: 5000,
        sinPrevioMax: 2000000,
      };
    }
    if (rawUnit === 'UPM' || rawUnit === 'UNIDADES' || etiqLower.includes('upm')) {
      return {
        unidadUso: 'UPM',
        label: rawEtiqueta || 'Unidades Producidas',
        sufijo: 'uds',
        maxDiario: 100000,
        minMargen: 100000,
        sinPrevioMax: 50000000,
      };
    }
    if (rawUnit !== '' && rawUnit !== 'HORAS' && rawUnit !== 'HRS' && rawUnit !== 'H') {
      return {
        unidadUso: rawUnit,
        label: rawEtiqueta || rawUnitOriginal || rawUnit,
        sufijo: rawUnitOriginal.toLowerCase() || rawUnit.toLowerCase(),
        maxDiario: 100000,
        minMargen: 250000,
        sinPrevioMax: 50000000,
      };
    }
    return {
      unidadUso: 'HORAS',
      label: rawEtiqueta || 'Horómetro',
      sufijo: 'h',
      maxDiario: 24,
      minMargen: 250,
      sinPrevioMax: 5000,
    };
  }

  /**
   * Extrae valor numérico de uso desde observaciones de checklist (ej: "HORAS: 276", "CICLOS: 15120")
   */
  private extraerHorasDeActividad(act: ActividadInput): number | null {
    if (act.respuestaJson != null) {
      let parsed = act.respuestaJson;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          /* ignore */
        }
      }
      const rawVal =
        typeof parsed === 'object' ? (parsed?.valor ?? parsed?.lectura ?? parsed?.horas) : parsed;
      if (rawVal != null) {
        let rawStr = String(rawVal).trim();
        if (/^\d{1,3}(\.\d{3})+$/.test(rawStr)) {
          rawStr = rawStr.replace(/\./g, '');
        } else {
          rawStr = rawStr.replace(',', '.');
        }
        const n = parseFloat(rawStr);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return this.extraerHorasDeObservacion(act.observaciones, true);
  }

  private extraerHorasDeObservacion(obs?: string, permitirCualquierPrefijo = false): number | null {
    if (!obs) return null;
    const regex = permitirCualquierPrefijo
      ? /(?:[A-ZÁÉÍÓÚÑ0-9_]{2,25}|Lectura registrada)\s*:\s*([\d.,]+)/i
      : /(?:HORAS|HOROMETRO|HORÓMETRO|CICLOS|KM|UPM|CONTADOR|Lectura registrada)\s*:\s*([\d.,]+)/i;
    const match = obs.match(regex);
    if (match && match[1]) {
      let raw = match[1].trim();
      if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
        raw = raw.replace(/\./g, '');
      } else {
        raw = raw.replace(',', '.');
      }
      const val = parseFloat(raw);
      return isNaN(val) ? null : val;
    }
    return null;
  }

  private async sincronizarContadoresHojaDeVida(
    orden: any,
    dto: FinalizarOrdenDto,
    datosModuloMapeado: { horasTrabajo?: number },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const contadoresCatalogo = await tx.catalogo_actividades.findMany({
      where: {
        OR: [
          { rol_semantico: 'LECTURA_CONTADOR_ACTIVO' },
          { tipo_control_input: 'LECTURA_CONTADOR' },
        ],
      },
      select: { id_actividad_catalogo: true },
    });
    const idsContadorActivo = new Set(contadoresCatalogo.map((c) => c.id_actividad_catalogo));

    const equiposSincronizados = new Set<number>();

    const actualizarMemoriaEquipo = (idEq: number, horas: number) => {
      if (orden.equipos && orden.equipos.id_equipo === idEq) {
        const prev = Number(orden.equipos.lectura_uso_actual ?? orden.equipos.horas_actuales ?? 0);
        if (horas >= prev) {
          orden.equipos.horas_actuales = horas;
          orden.equipos.lectura_uso_actual = horas;
        }
      }
    };

    const extraerDeActividades = (acts?: ActividadInput[]): number | null => {
      if (!acts || acts.length === 0) return null;
      if (idsContadorActivo.size > 0) {
        for (const act of acts) {
          if (
            act.idActividadCatalogo != null &&
            idsContadorActivo.has(Number(act.idActividadCatalogo))
          ) {
            const h = this.extraerHorasDeActividad(act);
            if (h != null && h > 0) return h;
          }
        }
      }
      for (const act of acts) {
        const h = this.extraerHorasDeObservacion(act.observaciones);
        if (h != null && h > 0) return h;
      }
      return null;
    };

    if (orden.ordenes_equipos && orden.ordenes_equipos.length > 0) {
      for (const oe of orden.ordenes_equipos) {
        if (!oe.id_equipo) continue;
        let horasEquipo: number | null = null;

        const grupoAct = dto.actividadesPorEquipo?.find(
          (g) => g.idOrdenEquipo === oe.id_orden_equipo,
        );
        const actsEq =
          grupoAct?.actividades ||
          (orden.ordenes_equipos.length === 1 ? dto.actividades : []) ||
          [];
        horasEquipo = extraerDeActividades(actsEq);

        if (horasEquipo == null && dto.medicionesPorEquipo) {
          const grupo = dto.medicionesPorEquipo.find((g) => g.idOrdenEquipo === oe.id_orden_equipo);
          const med = grupo?.mediciones?.find((m) => this.esParametroHorometro(m.parametro));
          if (med && med.valor != null) {
            const v = typeof med.valor === 'number' ? med.valor : parseFloat(String(med.valor));
            if (!isNaN(v) && v > 0) horasEquipo = v;
          }
        }

        if (horasEquipo == null && dto.mediciones) {
          const med = dto.mediciones.find(
            (m) => m.idOrdenEquipo === oe.id_orden_equipo && this.esParametroHorometro(m.parametro),
          );
          if (med && med.valor != null) {
            const v = typeof med.valor === 'number' ? med.valor : parseFloat(String(med.valor));
            if (!isNaN(v) && v > 0) horasEquipo = v;
          }
        }

        if (horasEquipo == null && orden.ordenes_equipos.length === 1) {
          const vGeneral = dto.datosModulo?.horasTrabajo || datosModuloMapeado.horasTrabajo;
          if (vGeneral != null) {
            const v = typeof vGeneral === 'number' ? vGeneral : parseFloat(String(vGeneral));
            if (!isNaN(v) && v > 0) horasEquipo = v;
          }
        }

        if (horasEquipo != null && horasEquipo > 0) {
          await this.persistirHorometro(
            orden.id_orden_servicio,
            oe.id_equipo,
            horasEquipo,
            dto.usuarioId,
            tx,
          );
          actualizarMemoriaEquipo(oe.id_equipo, horasEquipo);
          equiposSincronizados.add(oe.id_equipo);
        }
      }
    }

    const idEquipoPrincipal =
      orden.id_equipo ||
      (orden.ordenes_equipos?.length === 1 ? orden.ordenes_equipos[0].id_equipo : null);
    if (idEquipoPrincipal && !equiposSincronizados.has(idEquipoPrincipal)) {
      let horasPrincipal: number | null = null;
      const vGeneral = dto.datosModulo?.horasTrabajo || datosModuloMapeado.horasTrabajo;
      if (vGeneral != null) {
        const v = typeof vGeneral === 'number' ? vGeneral : parseFloat(String(vGeneral));
        if (!isNaN(v) && v > 0) horasPrincipal = v;
      }
      if (horasPrincipal == null) {
        horasPrincipal = extraerDeActividades(dto.actividades);
      }
      if (horasPrincipal != null && horasPrincipal > 0) {
        await this.persistirHorometro(
          orden.id_orden_servicio,
          idEquipoPrincipal,
          horasPrincipal,
          dto.usuarioId,
          tx,
        );
        actualizarMemoriaEquipo(idEquipoPrincipal, horasPrincipal);
      }
    }
  }

  private async persistirHorometro(
    idOrden: number,
    idEquipo: number,
    horas: number,
    usuarioId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    try {
      const [equipo, ultimaLectura] = await Promise.all([
        tx.equipos.findUnique({
          where: { id_equipo: idEquipo },
          select: {
            id_equipo: true,
            horas_actuales: true,
            lectura_uso_actual: true,
            codigo_equipo: true,
            tipos_equipo: {
              select: {
                unidad_uso: true,
                etiqueta_contador: true,
                requiere_horometro: true,
              },
            },
          },
        }),
        tx.lecturas_horometro.findFirst({
          where: { id_equipo: idEquipo },
          orderBy: { fecha_lectura: 'desc' },
        }),
      ]);

      const metrica = this.resolverMetricaUsoBackend(equipo?.tipos_equipo);
      const sufStr = metrica.sufijo ? ` ${metrica.sufijo}` : '';

      const rawEquipoUso = equipo?.lectura_uso_actual ?? equipo?.horas_actuales;
      const horasActuales = rawEquipoUso ? Number(rawEquipoUso) : 0;
      const ultimaHoras = ultimaLectura ? Number(ultimaLectura.horas_lectura) : 0;
      const referenciaHoras = Math.max(horasActuales, ultimaHoras);

      if (referenciaHoras > 0 && horas < referenciaHoras) {
        this.logger.warn(
          `⚠️ Intento de registrar lectura de ${metrica.label} menor al actual (${horas}${sufStr} < ${referenciaHoras}${sufStr}) en equipo ${equipo?.codigo_equipo || idEquipo}. Se mantendrá el acumulado mayor en la hoja de vida.`,
        );
        await tx.lecturas_horometro.create({
          data: {
            id_equipo: idEquipo,
            id_orden_servicio: idOrden,
            horas_lectura: horas,
            fecha_lectura: new Date(),
            tipo_lectura: 'MANTENIMIENTO',
            horas_transcurridas: 0,
            dias_transcurridos: null,
            registrado_por: usuarioId,
            observaciones: `Lectura de campo (${horas}${sufStr}) menor al acumulado (${referenciaHoras}${sufStr}). Registrado como referencia de campo sin alterar ${metrica.label} del equipo.`,
          },
        });
        return;
      }

      const valorBasePrevio = ultimaLectura
        ? Number(ultimaLectura.horas_lectura)
        : horasActuales > 0
          ? horasActuales
          : null;
      const horasTranscurridas =
        valorBasePrevio != null ? Math.max(0, horas - valorBasePrevio) : null;
      const diasTranscurridos = ultimaLectura
        ? Math.floor(
            (new Date().getTime() - new Date(ultimaLectura.fecha_lectura).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      const diasPositivos = Math.max(0, diasTranscurridos ?? 0);
      const limiteFisicoHoras =
        diasTranscurridos != null
          ? Math.max(metrica.minMargen, (diasPositivos + 3) * metrica.maxDiario)
          : metrica.sinPrevioMax;

      const esSaltoAnomalo = horasTranscurridas != null && horasTranscurridas > limiteFisicoHoras;
      if (esSaltoAnomalo) {
        this.logger.warn(
          `⚠️ Salto amplio de ${metrica.label} (+${horasTranscurridas}${sufStr} en ${diasTranscurridos} días, límite referencial [${metrica.unidadUso}]: ${limiteFisicoHoras}${sufStr}) en equipo ${equipo?.codigo_equipo || idEquipo}. Se registra con nota de auditoría.`,
        );
      }

      const ahora = new Date();
      await tx.lecturas_horometro.create({
        data: {
          id_equipo: idEquipo,
          id_orden_servicio: idOrden,
          horas_lectura: horas,
          fecha_lectura: ahora,
          tipo_lectura: 'MANTENIMIENTO',
          horas_transcurridas: horasTranscurridas,
          dias_transcurridos: diasTranscurridos,
          registrado_por: usuarioId,
          observaciones: esSaltoAnomalo
            ? `⚠️ ALERTA OUTLIER AUDITADA: Incremento de ${horasTranscurridas}${sufStr} en ${diasTranscurridos} días supera el límite referencial (${limiteFisicoHoras}${sufStr} para ${metrica.unidadUso}). Acumulado actualizado automáticamente al finalizar orden #${idOrden}.`
            : `Registrado automáticamente al finalizar orden #${idOrden}`,
        },
      });

      await tx.equipos.update({
        where: { id_equipo: idEquipo },
        data: {
          horas_actuales: horas,
          lectura_uso_actual: horas,
          fecha_ultima_lectura_horas: ahora,
          fecha_ultima_lectura_uso: ahora,
        },
      });

      this.logger.log(
        `   ✅ ${metrica.label} registrado y sincronizado en Hoja de Vida: ${horas}${sufStr} (Equipo: ${equipo?.codigo_equipo || idEquipo})`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error persistiendo lectura de uso: ${err.message}`);
    }
  }

  /**
   * Mapea resultado a estado de actividad
   * B=Bueno, M=Malo, C=Corregido, NA=NoAplica, R=Regular, etc.
   */
  private mapResultadoAEstado(resultado: string): 'B' | 'M' | 'C' | 'NA' | 'R' {
    const r = resultado.toUpperCase();
    if (r === 'BUENO' || r === 'B' || r === 'OK') return 'B';
    if (r === 'MALO' || r === 'M' || r === 'DEFICIENTE') return 'M';
    if (r === 'CORREGIDO' || r === 'C' || r === 'REPARADO') return 'C';
    if (r === 'N/A' || r === 'NA' || r === 'NO APLICA' || r === 'NO_APLICA') return 'NA';
    if (r === 'REGULAR' || r === 'R') return 'R';
    return 'B'; // Default
  }

  /**
   * Persiste los pendientes técnicos registrados durante la orden de servicio
   * Soporta items de catálogo y manuales/personalizados con vinculación a equipos
   */
  private async persistirPendientes(
    orden: any,
    pendientes: PendienteFinalizacionDto[],
    idEmpleadoTecnico: number | null,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    if (!pendientes || pendientes.length === 0) return 0;

    // Idempotencia: Verificar si ya existen pendientes para esta orden
    const pendientesExistentes = await tx.ordenes_pendientes.count({
      where: { id_orden_servicio: orden.id_orden_servicio },
    });

    if (pendientesExistentes > 0) {
      this.logger.warn(
        `⚠️ IDEMPOTENCIA: Ya existen ${pendientesExistentes} pendientes para orden ${orden.id_orden_servicio}. Saltando inserción.`,
      );
      return 0;
    }

    const ahora = new Date();
    const PRIORIDADES_VALIDAS = ['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'] as const;

    const datosParaInsertar = pendientes.map((p) => {
      // Resolver id_equipo:
      let idEquipo = p.idEquipo;
      if (!idEquipo && p.idOrdenEquipo && orden.ordenes_equipos) {
        const ordenEq = orden.ordenes_equipos.find(
          (oe: any) => oe.id_orden_equipo === p.idOrdenEquipo,
        );
        if (ordenEq?.id_equipo) {
          idEquipo = ordenEq.id_equipo;
        }
      }
      if (!idEquipo) {
        idEquipo = orden.id_equipo;
      }

      // Normalizar origen: CATALOGO, MANUAL o PERSONALIZADO
      let origenVal: 'CATALOGO' | 'MANUAL' | 'PERSONALIZADO' = 'CATALOGO';
      if (p.origen === 'PERSONALIZADO') {
        origenVal = 'PERSONALIZADO';
      } else if (p.origen === 'MANUAL') {
        origenVal = 'MANUAL';
      } else if (p.idPendienteCatalogo) {
        origenVal = 'CATALOGO';
      } else {
        origenVal = 'MANUAL';
      }

      // Normalizar prioridad
      let prioridadVal: 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA' = 'NORMAL';
      if (p.prioridad && PRIORIDADES_VALIDAS.includes(p.prioridad.toUpperCase() as any)) {
        prioridadVal = p.prioridad.toUpperCase() as any;
      } else if (p.prioridad?.toUpperCase() === 'MEDIA' || p.prioridad?.toUpperCase() === 'BAJA') {
        prioridadVal = 'NORMAL';
      }

      return {
        id_orden_servicio: orden.id_orden_servicio,
        id_cliente: orden.id_cliente,
        id_equipo: idEquipo,
        id_orden_equipo: p.idOrdenEquipo || null,
        id_pendiente_catalogo: p.idPendienteCatalogo || null,
        descripcion: p.descripcion.trim(),
        origen: origenVal as any,
        prioridad: prioridadVal,
        estado: 'PENDIENTE' as const,
        observaciones: p.observaciones?.trim() || null,
        creado_por: idEmpleadoTecnico || null,
        fecha_creacion: ahora,
      };
    });

    const resultado = await tx.ordenes_pendientes.createMany({
      data: datosParaInsertar,
      skipDuplicates: true,
    });

    return resultado.count;
  }
}
