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
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigParametrosService } from '../../config-parametros/config-parametros.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService, OrdenEmailData } from '../../email/email.service';
import { buildInformeFilename } from '../../pdf/pdf-naming.helper';
import { PdfService, TipoInforme } from '../../pdf/pdf.service';
import { CloudinaryService } from '../../storage/cloudinary.service';
import { R2StorageService } from '../../storage/r2-storage.service';

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
    resultado: 'B' | 'M' | 'C' | 'N/A';
    /** Observaciones adicionales */
    observaciones?: string;
    /** ID del orden-equipo (para multi-equipos, opcional para backward compatibility) */
    idOrdenEquipo?: number;
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
    | 'validando'           // Paso 0: Validando datos
    | 'obteniendo_orden'    // Paso 1: Obteniendo datos de la orden
    | 'limpieza_residuales' // Paso 1.5: Limpieza de residuales de intentos fallidos
    | 'evidencias'          // Paso 2: Subiendo evidencias a Cloudinary
    | 'firmas'              // Paso 3: Registrando firmas digitales
    | 'actividades'         // Paso 3.5: Registrando actividades
    | 'mediciones'          // Paso 3.6: Registrando mediciones
    | 'generando_pdf'       // Paso 4: Generando PDF
    | 'subiendo_pdf'        // Paso 5: Subiendo PDF a R2
    | 'registrando_doc'     // Paso 6: Registrando documento en BD
    | 'enviando_email'      // Paso 7: Enviando email
    | 'actualizando_estado' // Paso 8: Actualizando estado
    | 'completado'          // Finalizado exitosamente
    | 'error';              // Error en el proceso

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
    ) { }

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
                            id_usuario: dto.usuarioId
                        }
                    }
                },
                select: { id_empleado: true }
            });
            idEmpleadoTecnico = emp?.id_empleado || null;

            if (idEmpleadoTecnico) {
                this.logger.log(`   ✅ Identidad resuelta: usuarioId=${dto.usuarioId} -> idEmpleado=${idEmpleadoTecnico}`);
            } else {
                this.logger.warn(`   ⚠️ No se encontró registro de empleado para usuarioId=${dto.usuarioId}. Se usará fallback.`);
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

        // Variables para tracking de recursos creados (para rollback)
        const recursosCreados = {
            evidencias: [] as number[],
            firmas: [] as number[],
            documento: null as number | null,
        };

        try {
            // ========================================================================
            // PASO 0: Validaciones iniciales + Precarga de datos comunes
            // ========================================================================
            emitProgress('validando', 'in_progress', 'Validando datos de entrada...', 5);
            this.logger.log('📋 Paso 0: Validando datos de entrada...');
            await this.validarEntrada(dto);
            emitProgress('validando', 'completed', 'Datos validados correctamente', 10);

            // ========================================================================
            // PASO 1: Obtener datos completos de la orden + Estado COMPLETADA (en paralelo)
            // ✅ OPTIMIZACIÓN 31-DIC-2025: Precargar estado COMPLETADA aquí evita query posterior
            // ========================================================================
            emitProgress('obteniendo_orden', 'in_progress', 'Obteniendo datos de la orden...', 12);
            this.logger.log('📋 Paso 1: Obteniendo datos de la orden...');

            const [orden, estadoCompletada] = await Promise.all([
                this.obtenerOrdenCompleta(dto.idOrden),
                this.prisma.estados_orden.findFirst({ where: { codigo_estado: 'COMPLETADA' } }),
            ]);

            if (!estadoCompletada) {
                throw new InternalServerErrorException('Estado COMPLETADA no encontrado en BD');
            }

            emitProgress('obteniendo_orden', 'completed', `Orden ${orden.numero_orden} cargada`, 15);

            // ========================================================================
            // PASO 1.5: LIMPIEZA / ROLLBACK - Eliminar datos anteriores antes de re-insertar
            // ✅ FIX 10-FEB-2026: Limpia evidencias huérfanas de intentos fallidos
            // ✅ FIX 26-FEB-2026: También hace rollback completo para re-subida de COMPLETADA
            // ========================================================================
            const estadoActual = orden.id_estado_actual;
            const esYaCompletada = estadoActual === estadoCompletada.id_estado;

            // ✅ FIX 26-FEB-2026: SIEMPRE ejecutar limpieza
            // - Para !esYaCompletada: limpia residuales de intentos fallidos
            // - Para esYaCompletada: hace rollback de datos anteriores para re-subida
            {
                const motivo = esYaCompletada ? 'rollback para re-subida' : 'limpieza de residuales';
                emitProgress('limpieza_residuales', 'in_progress', esYaCompletada ? 'Preparando re-subida (rollback)...' : 'Verificando evidencias residuales...', 16);
                this.logger.log(`🧹 Paso 1.5: ${motivo}...`);

                try {
                    // Contar evidencias existentes para esta orden
                    const evidenciasExistentes = await this.prisma.evidencias_fotograficas.count({
                        where: { id_orden_servicio: orden.id_orden_servicio },
                    });

                    if (evidenciasExistentes > 0) {
                        this.logger.warn(`   ⚠️ Encontradas ${evidenciasExistentes} evidencias residuales de intentos anteriores`);

                        // Eliminar TODAS las evidencias existentes para esta orden
                        // (son residuales porque la orden aún no está COMPLETADA)
                        const deleteResult = await this.prisma.evidencias_fotograficas.deleteMany({
                            where: { id_orden_servicio: orden.id_orden_servicio },
                        });
                        this.logger.log(`   🗑️ Eliminadas ${deleteResult.count} evidencias residuales`);
                    }

                    // También limpiar firmas residuales vinculadas a la orden
                    // (firmas huérfanas de intentos fallidos)
                    const firmaResidualTecnico = orden.id_firma_tecnico;
                    const firmaResidualCliente = orden.id_firma_cliente;

                    if (firmaResidualTecnico || firmaResidualCliente) {
                        this.logger.log(`   🧹 Desvinculando firmas residuales de la orden...`);
                        await this.prisma.ordenes_servicio.update({
                            where: { id_orden_servicio: orden.id_orden_servicio },
                            data: {
                                id_firma_tecnico: null,
                                id_firma_cliente: null,
                            },
                        });

                        for (const firmaId of [firmaResidualTecnico, firmaResidualCliente].filter(Boolean)) {
                            await this.prisma.firmas_digitales.delete({
                                where: { id_firma_digital: firmaId! },
                            }).catch(() => {
                                // Ignorar si ya fue eliminada
                            });
                        }
                        this.logger.log(`   ✅ Firmas residuales limpiadas`);
                    }

                    // Limpiar actividades ejecutadas residuales
                    const actividadesResExist = await this.prisma.actividades_ejecutadas.count({
                        where: { id_orden_servicio: orden.id_orden_servicio },
                    });
                    if (actividadesResExist > 0) {
                        // Primero eliminar componentes_usados y evidencias vinculadas a actividades
                        await this.prisma.componentes_usados.deleteMany({
                            where: { id_orden_servicio: orden.id_orden_servicio },
                        });
                        await this.prisma.actividades_ejecutadas.deleteMany({
                            where: { id_orden_servicio: orden.id_orden_servicio },
                        });
                        this.logger.log(`   🗑️ Eliminadas ${actividadesResExist} actividades residuales`);
                    }

                    // Limpiar mediciones residuales
                    const medicionesResExist = await this.prisma.mediciones_servicio.count({
                        where: { id_orden_servicio: orden.id_orden_servicio },
                    });
                    if (medicionesResExist > 0) {
                        await this.prisma.mediciones_servicio.deleteMany({
                            where: { id_orden_servicio: orden.id_orden_servicio },
                        });
                        this.logger.log(`   🗑️ Eliminadas ${medicionesResExist} mediciones residuales`);
                    }

                    const totalResidual = evidenciasExistentes + actividadesResExist + medicionesResExist;
                    emitProgress('limpieza_residuales', 'completed', `Limpieza completada (${totalResidual} registros residuales eliminados)`, 17);
                } catch (cleanupError) {
                    // La limpieza es best-effort, no debe bloquear la finalización
                    this.logger.warn(`   ⚠️ Error en limpieza de residuales (continuando): ${cleanupError}`);
                    emitProgress('limpieza_residuales', 'completed', 'Limpieza omitida (no crítico)', 17);
                }
            }

            // ========================================================================
            // PASO 2: Subir evidencias a Cloudinary y registrar en BD
            // ========================================================================
            emitProgress('evidencias', 'in_progress', `Subiendo ${dto.evidencias.length} evidencias...`, 18);
            this.logger.log('📷 Paso 2: Procesando evidencias fotográficas...');
            const evidenciasResultado = await this.procesarEvidencias(
                dto.evidencias,
                orden.id_orden_servicio,
                orden.numero_orden,
                dto.usuarioId,
            );
            recursosCreados.evidencias = evidenciasResultado.map(e => e.id);
            emitProgress('evidencias', 'completed', `${evidenciasResultado.length} evidencias subidas`, 35);

            // ========================================================================
            // PASO 3: Registrar firmas digitales
            // ========================================================================
            emitProgress('firmas', 'in_progress', 'Registrando firmas digitales...', 38);
            this.logger.log('✍️ Paso 3: Registrando firmas digitales...');
            const firmasResultado = await this.procesarFirmas(
                dto.firmas,
                dto.usuarioId,
                orden,
            );
            recursosCreados.firmas = firmasResultado.map(f => f.id);
            this.logger.log(`   ✓ ${firmasResultado.length} firmas registradas`);
            emitProgress('firmas', 'completed', `${firmasResultado.length} firmas registradas`, 45);

            // ✅ FIX 05-ENE-2026: Vincular AMBAS firmas a la orden para trazabilidad completa
            const firmaTecnico = firmasResultado.find(f => f.tipo === 'TECNICO');
            const firmaCliente = firmasResultado.find(f => f.tipo === 'CLIENTE');

            await this.prisma.ordenes_servicio.update({
                where: { id_orden_servicio: orden.id_orden_servicio },
                data: {
                    // Firma del técnico (NUEVA - evita mezclar firmas entre órdenes)
                    id_firma_tecnico: firmaTecnico?.id || null,
                    // Firma del cliente
                    id_firma_cliente: firmaCliente?.id || null,
                    // ✅ FIX 02-FEB-2026: Usar nuevos campos nombreFirmante/cargoFirmante
                    nombre_quien_recibe: dto.firmas.cliente?.nombreFirmante || 'Cliente',
                    cargo_quien_recibe: dto.firmas.cliente?.cargoFirmante || null,
                },
            });
            this.logger.log(`   ✓ Firmas vinculadas a orden (técnico: ${firmaTecnico?.id}, cliente: ${firmaCliente?.id})`);


            // ========================================================================
            // PASO 3.5: Persistir actividades ejecutadas en BD (para estadísticas)
            // ========================================================================
            emitProgress('actividades', 'in_progress', 'Registrando actividades ejecutadas...', 48);
            this.logger.log('📋 Paso 3.5: Registrando actividades ejecutadas...');
            const actividadesGuardadas = await this.persistirActividades(
                orden.id_orden_servicio,
                dto.actividades,
                idEmpleadoTecnico || dto.usuarioId, // Usar id_empleado resuelto
            );
            this.logger.log(`   ✓ ${actividadesGuardadas} actividades registradas`);
            emitProgress('actividades', 'completed', `${actividadesGuardadas} actividades registradas`, 52);

            // ========================================================================
            // PASO 3.6: Persistir mediciones en BD (para estadísticas)
            // ========================================================================
            if (dto.mediciones && dto.mediciones.length > 0) {
                emitProgress('mediciones', 'in_progress', `Registrando ${dto.mediciones.length} mediciones...`, 54);
                this.logger.log('📏 Paso 3.6: Registrando mediciones...');
                const medicionesGuardadas = await this.persistirMediciones(
                    orden.id_orden_servicio,
                    dto.mediciones,
                    idEmpleadoTecnico || dto.usuarioId, // Usar id_empleado resuelto
                );
                this.logger.log(`   ✓ ${medicionesGuardadas} mediciones registradas`);
                emitProgress('mediciones', 'completed', `${medicionesGuardadas} mediciones registradas`, 58);
            }

            // Mapear mediciones del array a datosModulo (necesario para horómetro)
            const datosModuloMapeado = this.mapearMedicionesADatosModulo(dto.mediciones || []);

            // ========================================================================
            // MODO DE FINALIZACIÓN: COMPLETO vs SOLO_DATOS
            // ========================================================================
            const modoCompleto = dto.modo !== 'SOLO_DATOS';

            // Variables para resultados (pueden ser null en modo SOLO_DATOS)
            let pdfResult: { buffer: Buffer; filename: string; size: number } | null = null;
            let r2Result: { url: string } | null = null;
            let emailResult: { enviado: boolean; destinatario: string; messageId?: string } = { enviado: false, destinatario: '' };
            let documentoResult: { id: number } | null = null;

            if (modoCompleto) {
                // ========================================================================
                // PASO 4: Generar PDF con template real (SOLO EN MODO COMPLETO)
                // ========================================================================
                emitProgress('generando_pdf', 'in_progress', 'Generando informe PDF...', 60);
                this.logger.log('📄 Paso 4: Generando PDF con template profesional...');

                const tipoInforme = this.determinarTipoInforme(orden);
                pdfResult = await this.generarPDFOrden(
                    orden,
                    dto,
                    evidenciasResultado,
                    firmasResultado,
                    tipoInforme,
                    datosModuloMapeado,
                );
                emitProgress('generando_pdf', 'completed', `PDF generado (${Math.round(pdfResult.size / 1024)} KB)`, 72);

                // ========================================================================
                // PASO 5+7: Subir PDF a R2 + Enviar email EN PARALELO (SOLO EN MODO COMPLETO)
                // ========================================================================
                emitProgress('subiendo_pdf', 'in_progress', 'Subiendo PDF y enviando email en paralelo...', 74);
                this.logger.log('⚡ [PERF] Pasos 5+7: Subiendo PDF a R2 + Enviando email EN PARALELO...');

                // ✅ FIX 29-ABR-2026: Calcular nombre de descarga canónico una sola vez
                //    para mantener consistencia entre R2 (Content-Disposition) y email (filename adjunto).
                const downloadFilename = this.calcularDownloadFilename(orden);

                const startParallel = Date.now();
                const [r2Res, emailRes] = await Promise.all([
                    this.subirPDFaR2(pdfResult.buffer, orden.numero_orden, downloadFilename),
                    this.enviarEmailInforme(orden, pdfResult, dto.emailAdicional, downloadFilename),
                ]);
                r2Result = r2Res;
                emailResult = emailRes;

                const parallelTime = Date.now() - startParallel;
                this.logger.log(`⚡ [PERF] R2 + Email completados en ${parallelTime}ms (paralelo)`);

                emitProgress('subiendo_pdf', 'completed', 'PDF almacenado en la nube', 80);
                emitProgress('enviando_email', 'completed', emailResult.enviado ? 'Email enviado' : 'Email no enviado (sin destinatario)', 85);

                // ========================================================================
                // PASO 6: Registrar documento en BD (SOLO EN MODO COMPLETO)
                // ========================================================================
                emitProgress('registrando_doc', 'in_progress', 'Registrando documento en base de datos...', 87);
                this.logger.log('💾 Paso 6: Registrando documento en base de datos...');
                documentoResult = await this.registrarDocumento(
                    orden.id_orden_servicio,
                    orden.numero_orden,
                    r2Result.url,
                    pdfResult,
                    dto.usuarioId,
                );
                recursosCreados.documento = documentoResult.id;
                emitProgress('registrando_doc', 'completed', 'Documento registrado', 90);
            } else {
                // MODO SOLO_DATOS: Skip PDF, R2 y Email
                this.logger.log('📋 Modo SOLO_DATOS: Saltando generación de PDF y envío de email');
                emitProgress('generando_pdf', 'completed', 'PDF se generará desde Admin Portal', 72);
                emitProgress('subiendo_pdf', 'completed', 'Omitido (modo solo datos)', 80);
                emitProgress('enviando_email', 'completed', 'Email se enviará desde Admin Portal', 85);
                emitProgress('registrando_doc', 'completed', 'Documento se registrará desde Admin Portal', 90);
            }

            // ========================================================================
            // PASO 7.5: Registrar lectura de horómetro (si existe) - SIEMPRE
            // ========================================================================
            if (dto.datosModulo?.horasTrabajo || datosModuloMapeado.horasTrabajo) {
                const horas = dto.datosModulo?.horasTrabajo || datosModuloMapeado.horasTrabajo;
                emitProgress('actualizando_estado', 'in_progress', `Registrando lectura de horómetro: ${horas}h...`, 93);
                this.logger.log(`⏳ Paso 7.5: Registrando lectura de horómetro (${horas}h)...`);
                await this.persistirHorometro(
                    orden.id_orden_servicio,
                    orden.id_equipo,
                    horas!,
                    dto.usuarioId,
                );
            }

            // ========================================================================
            // PASO 8: Actualizar estado de la orden - SIEMPRE
            // ========================================================================
            emitProgress('actualizando_estado', 'in_progress', 'Actualizando estado de la orden...', 94);
            this.logger.log('✅ Paso 8: Actualizando estado de la orden...');
            await this.actualizarEstadoOrden(
                orden.id_orden_servicio,
                estadoCompletada.id_estado,
                dto.observaciones,
                dto.usuarioId,
                dto.horaEntrada,
                dto.horaSalida,
            );
            emitProgress('actualizando_estado', 'completed', 'Estado actualizado a COMPLETADA', 98);

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
                    documento: documentoResult ? {
                        id: documentoResult.id,
                        url: r2Result?.url || '',
                        filename: pdfResult?.filename || '',
                        tamanioKB: pdfResult ? Math.round(pdfResult.size / 1024) : 0,
                    } : null,
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

            // Intentar rollback de recursos creados
            await this.rollback(recursosCreados);

            // Re-lanzar error con contexto
            if (error instanceof BadRequestException ||
                error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException(
                `Error al finalizar orden: ${err.message}`,
            );
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
                    include: { tipos_equipo: true },
                },
                empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
                    include: {
                        persona: {
                            include: {
                                usuarios: {
                                    select: { id_usuario: true }
                                }
                            }
                        }
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

        // Validar que la orden esté en estado que permita finalización
        // ✅ FIX 26-FEB-2026: Agregar COMPLETADA para permitir re-subida desde mobile
        const estadosPermitidos = ['EN_PROCESO', 'EN_EJECUCION', 'PENDIENTE', 'COMPLETADA'];
        if (!estadosPermitidos.includes(orden.estados_orden?.codigo_estado || '')) {
            throw new BadRequestException(
                `La orden está en estado ${orden.estados_orden?.nombre_estado}, no puede finalizarse`,
            );
        }

        return orden;
    }

    /**
     * Procesa y sube evidencias a Cloudinary + BD
     * ✅ OPTIMIZADO: Subida paralela a Cloudinary con Promise.all
     */
    private async procesarEvidencias(
        evidencias: EvidenciaInput[],
        idOrden: number,
        numeroOrden: string,
        _usuarioId: number, // Reservado para auditoría futura
    ): Promise<Array<{ id: number; tipo: string; url: string }>> {
        if (evidencias.length === 0) return [];

        const folder = `mekanos/evidencias/${numeroOrden}`;

        // PASO 1: Subir TODAS las imágenes a Cloudinary EN PARALELO
        this.logger.log(`   📤 Subiendo ${evidencias.length} evidencias en paralelo...`);
        const startUpload = Date.now();

        const uploadPromises = evidencias.map(async (ev) => {
            const buffer = Buffer.from(ev.base64, 'base64');
            const result = await this.cloudinaryService.uploadImage(buffer, {
                folder,
                tags: [ev.tipo, numeroOrden],
            });
            return { ev, buffer, result };
        });

        const uploadResults = await Promise.all(uploadPromises);
        const uploadTime = Date.now() - startUpload;
        this.logger.log(`   ⚡ Subida paralela completada en ${uploadTime}ms`);

        // PASO 2: Validar resultados de Cloudinary
        const ahora = new Date();
        const datosValidados: Array<{
            ev: EvidenciaInput;
            buffer: Buffer;
            url: string;
            hash: string;
            index: number;
        }> = [];

        for (let i = 0; i < uploadResults.length; i++) {
            const { ev, buffer, result: cloudinaryResult } = uploadResults[i];

            if (!cloudinaryResult.success || !cloudinaryResult.url) {
                throw new InternalServerErrorException(
                    `Error subiendo evidencia ${ev.tipo}: ${cloudinaryResult.error || 'URL no generada'}`,
                );
            }

            const hash = createHash('sha256').update(buffer).digest('hex');
            datosValidados.push({ ev, buffer, url: cloudinaryResult.url, hash, index: i });
        }

        // PASO 3: Registrar en BD EN PARALELO (necesitamos IDs individuales)
        // ✅ DEFENSE-IN-DEPTH 07-FEB-2026: Detectar fotos generales no clasificadas
        // Mobile sync_upload_service añade prefijo "ANTES: " / "DURANTE: " / "DESPUES: " a descripciones de fotos generales
        // Si el mobile no fue reconstruido, el tipo llega como ANTES/DURANTE/DESPUES en vez de GENERAL
        const GENERAL_PREFIX_RE = /^(ANTES|DURANTE|DESPUES):\s/i;
        const RECLASSIFIABLE_TYPES = ['ANTES', 'DURANTE', 'DESPUES'];

        const dbPromises = datosValidados.map(({ ev, buffer, url, hash, index }) => {
            let tipoFinal = ev.tipo;
            if (RECLASSIFIABLE_TYPES.includes(ev.tipo?.toUpperCase()) && GENERAL_PREFIX_RE.test(ev.descripcion || '')) {
                this.logger.log(`   📸 Reclasificando evidencia ${ev.tipo} → GENERAL (prefijo detectado en descripción)`);
                tipoFinal = 'GENERAL';
            }
            return this.prisma.evidencias_fotograficas.create({
                data: {
                    id_orden_servicio: idOrden,
                    id_orden_equipo: ev.idOrdenEquipo || null, // Multi-equipos: opcional
                    tipo_evidencia: tipoFinal,
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
            }).then(evidenciaDB => ({
                id: evidenciaDB.id_evidencia,
                tipo: ev.tipo,
                url,
            }));
        });

        const resultados = await Promise.all(dbPromises);
        this.logger.log(`   ✅ ${resultados.length} evidencias procesadas`);
        return resultados;
    }

    /**
     * Procesa y registra firmas digitales
     * ✅ OPTIMIZACIÓN 06-ENE-2026: Procesamiento PARALELO con Promise.all()
     */
    private async procesarFirmas(
        firmas: { tecnico: FirmaInput; cliente?: FirmaInput },
        usuarioId: number,
        orden: any,
    ): Promise<Array<{ id: number; tipo: string }>> {
        const startTime = Date.now();
        this.logger.log(`⚡ [PERF] Procesando firmas EN PARALELO...`);

        // Construir array de promesas para procesamiento paralelo
        const firmaPromises: Promise<{ id: number; tipo: string }>[] = [
            // Firma del técnico (siempre requerida)
            this.registrarFirma(firmas.tecnico, usuarioId, orden).then(f => ({
                id: f.id_firma_digital,
                tipo: 'TECNICO',
            })),
        ];

        // Agregar firma del cliente si existe
        if (firmas.cliente?.base64) {
            firmaPromises.push(
                this.registrarFirma(firmas.cliente, usuarioId, orden).then(f => ({
                    id: f.id_firma_digital,
                    tipo: 'CLIENTE',
                })),
            );
        }

        // Ejecutar TODAS las firmas en paralelo
        const resultados = await Promise.all(firmaPromises);

        const elapsed = Date.now() - startTime;
        this.logger.log(`⚡ [PERF] ${resultados.length} firmas procesadas en ${elapsed}ms`);

        return resultados;
    }

    /**
     * Registra una firma digital en BD
     * Busca primero para manejar el constraint único (id_persona, tipo_firma)
     * ✅ FIX 28-DIC-2025: Mapeo robusto de id_usuario -> id_persona para evitar FK error
     */
    private async registrarFirma(firma: FirmaInput, usuarioId: number, orden: any) {
        const hash = createHash('sha256').update(firma.base64).digest('hex');

        this.logger.log(`🔍 Registrando firma [${firma.tipo}]: idPersona recibida=${firma.idPersona}, usuarioId=${usuarioId}`);

        let idPersonaReal: number | null = null;

        if (firma.tipo === 'TECNICO') {
            // 1. Intentar obtener desde el técnico asignado a la orden (vía empleados)
            idPersonaReal = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_persona;

            // 2. Si no, intentar resolver el idPersona que mandó el móvil (que suele ser el id_usuario)
            if (!idPersonaReal && firma.idPersona > 0) {
                const u = await this.prisma.usuarios.findUnique({
                    where: { id_usuario: firma.idPersona },
                    select: { id_persona: true }
                });
                if (u?.id_persona) {
                    idPersonaReal = u.id_persona;
                    this.logger.log(`   💡 id_persona resuelto desde idPersona del móvil (id_usuario=${firma.idPersona}) -> ${idPersonaReal}`);
                }
            }

            // 3. Fallback: usar el usuarioId del contexto de finalización (quien registra)
            if (!idPersonaReal) {
                const u = await this.prisma.usuarios.findUnique({
                    where: { id_usuario: usuarioId },
                    select: { id_persona: true }
                });
                if (u?.id_persona) {
                    idPersonaReal = u.id_persona;
                    this.logger.log(`   💡 id_persona resuelto desde usuarioId del contexto (${usuarioId}) -> ${idPersonaReal}`);
                }
            }
        } else {
            // Para CLIENTE
            // 1. Usar ID que viene del móvil si es > 0
            if (firma.idPersona && firma.idPersona > 0) {
                idPersonaReal = firma.idPersona;
            }

            // 2. Fallback: usar la persona del cliente vinculado a la orden
            if (!idPersonaReal) {
                idPersonaReal = orden.clientes?.id_persona;
                if (idPersonaReal) {
                    this.logger.log(`   💡 id_persona resuelto desde cliente de la orden -> ${idPersonaReal}`);
                }
            }
        }

        // Si después de todo no hay id_persona, no podemos continuar con esta firma
        if (!idPersonaReal) {
            this.logger.error(`❌ ERROR: No se pudo determinar un id_persona válido para la firma ${firma.tipo}`);
            throw new BadRequestException(
                `No se pudo determinar la identidad de la persona para la firma del ${firma.tipo.toLowerCase()}. ` +
                `Asegúrese de que el ${firma.tipo === 'TECNICO' ? 'técnico' : 'cliente'} tenga un registro de persona asociado.`
            );
        }

        // ✅ FIX 05-ENE-2026: SIEMPRE crear nueva firma para cada orden
        // Antes: Hacía upsert por (id_persona, tipo_firma) causando que todas las
        // órdenes del mismo técnico compartieran la misma firma (sobrescribiéndose)
        // Ahora: Cada finalización crea una firma nueva y única para esa orden

        this.logger.log(`   🆕 Creando nueva firma para persona ${idPersonaReal} (orden específica)`);

        return this.prisma.firmas_digitales.create({
            data: {
                id_persona: idPersonaReal,
                tipo_firma: firma.tipo,
                firma_base64: firma.base64,
                formato_firma: (firma.formato || 'PNG').toUpperCase(),
                hash_firma: hash,
                fecha_captura: new Date(),
                es_firma_principal: false, // Solo la primera firma del técnico es principal
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
    private mapearMedicionesADatosModulo(mediciones: Array<{ parametro: string; valor: number; unidad: string }>): {
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
            const valor = m.valor;

            // Mapeo flexible por palabras clave
            if (param.includes('rpm') || param.includes('velocidad')) {
                datosModulo.rpm = valor;
            } else if (param.includes('presi') && param.includes('aceite')) {
                datosModulo.presionAceite = valor;
            } else if (param.includes('temp') && (param.includes('refrig') || param.includes('refrigerante'))) {
                datosModulo.temperaturaRefrigerante = valor;
            } else if (param.includes('bater') || param.includes('carga')) {
                datosModulo.cargaBateria = valor;
            } else if (param.includes('hora') && param.includes('trabajo')) {
                datosModulo.horasTrabajo = valor;
            } else if (param.includes('voltaje') || (param.includes('volt') && !param.includes('bater'))) {
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
     * ✅ FIX 15-DIC-2025: Corregidos nombres de propiedades según schema Prisma
     */
    private determinarTipoInforme(orden: any): TipoInforme {
        // Extraer relaciones con nombres correctos de Prisma
        const equipo = orden.equipos;
        const tipoServicio = orden.tipos_servicio;

        // Determinar por tipo de equipo (usar tipos_equipo?.nombre_tipo)
        const tipoEquipoNombre = (equipo?.tipos_equipo?.nombre_tipo || '').toLowerCase();
        const tipoServicioCodigo = (tipoServicio?.codigo || '').toUpperCase();
        const tipoServicioNombre = (tipoServicio?.nombre_tipo || '').toUpperCase();

        this.logger.log(`🔍 Determinando tipo informe: tipoEquipo="${tipoEquipoNombre}", servicioCodigo="${tipoServicioCodigo}", servicioNombre="${tipoServicioNombre}"`);

        // Si es CORRECTIVO → CORRECTIVO (independiente del equipo)
        // ✅ Compatible con CORRECTIVO (antiguo) y GEN_CORR/BOM_CORR (nuevos)
        if (tipoServicioCodigo.includes('CORR') || tipoServicioNombre.includes('CORRECTIVO')) {
            this.logger.log(`📋 Tipo informe seleccionado: CORRECTIVO`);
            return 'CORRECTIVO';
        }

        // Si es bomba → BOMBA_A
        if (tipoEquipoNombre.includes('bomba')) {
            this.logger.log(`📋 Tipo informe seleccionado: BOMBA_A`);
            return 'BOMBA_A';
        }

        // Si es Tipo B → GENERADOR_B
        if (tipoServicioCodigo.includes('TIPO_B') || tipoServicioCodigo.includes('_B') ||
            tipoServicioNombre.includes('TIPO B') || tipoServicioNombre.includes('B')) {
            this.logger.log(`📋 Tipo informe seleccionado: GENERADOR_B`);
            return 'GENERADOR_B';
        }

        // Default: Tipo A Generador
        this.logger.log(`📋 Tipo informe seleccionado: GENERADOR_A (default)`);
        return 'GENERADOR_A';
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
        const nombreTecnico = tecnicoPersona?.primer_nombre && tecnicoPersona?.primer_apellido
            ? `${tecnicoPersona.primer_nombre} ${tecnicoPersona.primer_apellido}`
            : tecnicoPersona?.nombre_completo || 'N/A';

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
            this.logger.log(`📋 Construyendo datos multi-equipo para PDF (${dto.actividadesPorEquipo.length} equipos)`);

            actividadesPorEquipo = dto.actividadesPorEquipo.map((eq, index) => ({
                equipo: {
                    idOrdenEquipo: eq.idOrdenEquipo,
                    ordenSecuencia: index + 1,
                    nombreSistema: eq.nombreEquipo,
                    codigoEquipo: eq.codigoEquipo,
                    nombreEquipo: eq.nombreEquipo,
                    estado: 'COMPLETADO',
                },
                actividades: eq.actividades.map(a => ({
                    sistema: a.sistema,
                    descripcion: a.descripcion,
                    resultado: a.resultado,
                    observaciones: a.observaciones,
                })),
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

            this.logger.log(`⚠️ FALLBACK MULTI-EQUIPO: Distribuyendo ${actividadesPlanas.length} actividades entre ${numEquipos} equipos`);

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
                    nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
                    codigoEquipo: oe.equipos?.codigo_equipo,
                    nombreEquipo: oe.equipos?.nombre_equipo,
                    estado: 'COMPLETADO',
                },
                actividades: Array.from(actividadesUnicas.entries()).map(([descripcion, acts]) => {
                    const actEquipo = acts[equipoIndex] || acts[0];
                    return {
                        sistema: actEquipo.sistema,
                        descripcion: descripcion,
                        resultado: actEquipo.resultado,
                        observaciones: actEquipo.observaciones,
                    };
                }),
            }));

            this.logger.log(`✅ FALLBACK completado: ${actividadesUnicas.size} actividades únicas x ${numEquipos} equipos`);
            for (const eq of actividadesPorEquipo) {
                this.logger.log(`   📋 ${eq.equipo.nombreSistema}: ${eq.actividades.length} actividades`);
            }
        }

        if (dto.esMultiEquipo && dto.medicionesPorEquipo) {
            medicionesPorEquipo = dto.medicionesPorEquipo.map((eq, index) => ({
                equipo: {
                    idOrdenEquipo: eq.idOrdenEquipo,
                    ordenSecuencia: index + 1,
                    nombreSistema: eq.nombreEquipo,
                    nombreEquipo: eq.nombreEquipo,
                    estado: 'COMPLETADO',
                },
                mediciones: eq.mediciones.map(m => ({
                    parametro: m.parametro,
                    valor: m.valor,
                    unidad: m.unidad,
                    nivelAlerta: m.nivelAlerta || 'OK',
                })),
            }));

            for (const eq of medicionesPorEquipo) {
                this.logger.log(`   📏 ${eq.equipo.nombreSistema}: ${eq.mediciones.length} mediciones`);
            }
        } else if (orden.ordenes_equipos && orden.ordenes_equipos.length > 1 && dto.mediciones && dto.mediciones.length > 0) {
            // ✅ FIX 16-DIC-2025: FALLBACK para mediciones cuando Flutter no envía estructura multi-equipo
            const numEquipos = orden.ordenes_equipos.length;
            const medicionesPlanas = dto.mediciones;

            this.logger.log(`⚠️ FALLBACK MEDICIONES: Distribuyendo ${medicionesPlanas.length} mediciones entre ${numEquipos} equipos`);

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
                    nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
                    nombreEquipo: oe.equipos?.nombre_equipo,
                    estado: 'COMPLETADO',
                },
                mediciones: Array.from(medicionesUnicas.entries()).map(([parametro, meds]) => {
                    const medEquipo = meds[equipoIndex] || meds[0];
                    return {
                        parametro: parametro,
                        valor: medEquipo.valor,
                        unidad: medEquipo.unidad,
                        nivelAlerta: medEquipo.nivelAlerta || 'OK',
                    };
                }),
            }));

            this.logger.log(`✅ FALLBACK MEDICIONES completado: ${medicionesUnicas.size} parámetros únicos x ${numEquipos} equipos`);
        }

        // ✅ FIX 16-DIC-2025: Detectar multi-equipo desde FALLBACK o DTO
        const esMultiEquipo = dto.esMultiEquipo || (orden.ordenes_equipos && orden.ordenes_equipos.length > 1);

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
            const evidenciasConEquipo = dto.evidencias.filter(e => e.idOrdenEquipo != null && e.idOrdenEquipo > 0);
            const usarIdOrdenEquipoDelMovil = evidenciasConEquipo.length > 0;

            if (usarIdOrdenEquipoDelMovil) {
                // ✅ MODO CORRECTO: Usar idOrdenEquipo que viene del móvil
                this.logger.log(`📷 MODO PRECISO: Agrupando ${evidencias.length} evidencias por idOrdenEquipo del móvil`);

                // Crear mapa de idOrdenEquipo -> evidencias (combinando dto y resultados subidos)
                const evidenciasPorIdEquipo = new Map<number, Array<{ url: string; caption?: string; momento?: string }>>();

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
                    const ordenMomento = { 'ANTES': 1, 'DURANTE': 2, 'DESPUES': 3, 'MEDICION': 4, 'GENERAL': 5 };
                    evidenciasDelEquipo.sort((a, b) => {
                        const ordenA = ordenMomento[a.momento as keyof typeof ordenMomento] || 2;
                        const ordenB = ordenMomento[b.momento as keyof typeof ordenMomento] || 2;
                        return ordenA - ordenB;
                    });

                    return {
                        equipo: {
                            idOrdenEquipo: idOrdenEquipo,
                            ordenSecuencia: oe.orden_secuencia || equipoIndex + 1,
                            nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
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
                    eq.evidencias.forEach(e => {
                        if (e.momento && porMomento.hasOwnProperty(e.momento)) {
                            porMomento[e.momento as keyof typeof porMomento]++;
                        }
                    });
                    this.logger.log(`   📷 ${eq.equipo.nombreSistema}: ${eq.evidencias.length} evidencias (A:${porMomento.ANTES}, D:${porMomento.DURANTE}, Ds:${porMomento.DESPUES})`);
                }
            } else {
                // ⚠️ FALLBACK: Distribuir por índice (legacy, cuando móvil no envía idOrdenEquipo)
                this.logger.log(`⚠️ FALLBACK EVIDENCIAS: Distribuyendo evidencias entre ${numEquipos} equipos (sin idOrdenEquipo)`);

                // Agrupar evidencias por momento
                const evidenciasPorMomento: { [key: string]: Array<{ url: string; descripcion?: string }> } = {
                    'ANTES': [],
                    'DURANTE': [],
                    'DESPUES': [],
                    'MEDICION': [],
                    'GENERAL': [],
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

                this.logger.log(`   📷 ANTES: ${evidenciasPorMomento['ANTES'].length}, DURANTE: ${evidenciasPorMomento['DURANTE'].length}, DESPUES: ${evidenciasPorMomento['DESPUES'].length}`);

                evidenciasPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => {
                    const evidenciasEquipo: Array<{ url: string; caption?: string; momento?: string }> = [];

                    for (const momento of ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL']) {
                        const evidenciasMomento = evidenciasPorMomento[momento] || [];
                        const evidenciasParaEquipo = evidenciasMomento.filter((_, i) => i % numEquipos === equipoIndex);
                        evidenciasEquipo.push(...evidenciasParaEquipo.map(ev => ({
                            url: ev.url,
                            caption: ev.descripcion ? `${momento}: ${ev.descripcion}` : `${momento}:`,
                            momento: momento,
                        })));
                    }

                    return {
                        equipo: {
                            idOrdenEquipo: oe.id_orden_equipo,
                            ordenSecuencia: oe.orden_secuencia || equipoIndex + 1,
                            nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || `Equipo ${equipoIndex + 1}`,
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
                const unidades = await this.configParametrosService.obtenerTodasLasUnidades(equipo.id_equipo);
                configUnidades = unidades as Record<string, string>;
                this.logger.log(`📐 Unidades personalizadas para equipo ${equipo.id_equipo}: ${JSON.stringify(configUnidades)}`);
            } catch (e) {
                this.logger.warn(`⚠️ No se pudieron obtener unidades personalizadas: ${e}`);
            }
        }

        const datosPDF = {
            cliente: cliente?.persona?.nombre_comercial || cliente?.persona?.nombre_completo || cliente?.persona?.razon_social || 'N/A',
            direccion: cliente?.persona?.direccion_principal || cliente?.persona?.ciudad || 'N/A',
            marcaEquipo: equipo?.nombre_equipo || 'N/A',
            serieEquipo: equipo?.numero_serie_equipo || 'N/A',
            tipoEquipo: (equipo as any)?.tipos_equipo?.nombre_tipo || 'GENERADOR',
            fecha: new Date().toLocaleDateString('es-CO'),
            tecnico: nombreTecnico,
            horaEntrada: dto.horaEntrada,
            horaSalida: dto.horaSalida,
            tipoServicio: tipoServicio?.nombre || 'PREVENTIVO',
            numeroOrden: orden.numero_orden,
            datosModulo: { ...datosModuloMapeado, ...(dto.datosModulo || {}) },
            // ✅ FLEXIBILIZACIÓN PARÁMETROS: Unidades personalizadas para PDF
            configUnidades,
            // Actividades flat (para backward compatibility)
            actividades: dto.actividades.map(a => ({
                sistema: a.sistema,
                descripcion: a.descripcion,
                resultado: a.resultado,
                observaciones: a.observaciones,
            })),
            // Mediciones flat (para backward compatibility)
            mediciones: (dto.mediciones || []).map(m => ({
                parametro: m.parametro,
                valor: m.valor,
                unidad: m.unidad,
                nivelAlerta: m.nivelAlerta || 'OK',
            })),
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
            diagnostico: dto.razonFalla ? {
                descripcion: dto.razonFalla,
                causaRaiz: dto.razonFalla,
                sistemasAfectados: [],
            } : undefined,
            problemaReportado: dto.razonFalla ? {
                descripcion: dto.razonFalla,
                fechaReporte: new Date().toISOString(),
            } : undefined,
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
            nombreCliente: (dto.firmas.cliente?.nombreFirmante && dto.firmas.cliente.nombreFirmante !== 'Cliente')
                ? dto.firmas.cliente.nombreFirmante
                : cliente?.persona?.nombre_comercial
                || `${cliente?.persona?.primer_nombre || ''} ${cliente?.persona?.primer_apellido || ''}`.trim()
                || cliente?.persona?.razon_social
                || dto.firmas.cliente?.nombreFirmante
                || undefined,
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

        this.logger.log(`📎 PDF subido a R2: ${filename}${downloadFilename ? ` (download: ${downloadFilename})` : ''}`);

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
        const fechaServicio = orden.fecha_fin_real
            || orden.fecha_inicio_real
            || orden.fecha_programada
            || new Date();

        const nombreCliente = persona?.nombre_comercial
            || persona?.razon_social
            || persona?.nombre_completo
            || (persona ? [persona.primer_nombre, persona.primer_apellido].filter(Boolean).join(' ') : null)
            || 'CLIENTE';

        return buildInformeFilename({
            fechaServicio,
            codigoTipoServicio: tipoServicio?.codigo_tipo,
            nombreTipoServicio: tipoServicio?.nombre_tipo,
            codigoTipoEquipo: tipoEquipo?.codigo_tipo,
            nombreTipoEquipo: tipoEquipo?.nombre_tipo,
            nombreCliente,
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
    ): Promise<{ id: number }> {
        const hash = createHash('sha256').update(pdfResult.buffer).digest('hex');

        const documento = await this.prisma.documentos_generados.create({
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
                herramienta_generacion: 'MEKANOS-FINALIZACION-SERVICE',
            },
        });

        return { id: documento.id_documento };
    }

    /**
     * Envía email con el informe adjunto al cliente
     * 
     * Usa el email_principal del cliente registrado en la BD.
     * Para pruebas, actualizar el email de los clientes a lorddeep3@gmail.com
     * ✅ FIX 15-DIC-2025: Corregidos nombres de propiedades según schema Prisma
     */
    private async enviarEmailInforme(
        orden: any,
        pdfResult: any,
        emailAdicional?: string,
        downloadFilename?: string,
    ): Promise<{ enviado: boolean; destinatario: string; messageId?: string }> {
        const EMAIL_FALLBACK = 'notificaciones@mekanos.com';

        // Extraer relaciones con nombres correctos de Prisma
        const cliente = orden.clientes;
        const equipo = orden.equipos;
        const tipoServicio = orden.tipos_servicio;
        const tecnicoEmpleado = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;

        // Usar email real del cliente
        const emailCliente = cliente?.persona?.email_principal || EMAIL_FALLBACK;

        // ✅ 24-FEB-2026: MULTI-EMAIL - Recopilar TODOS los correos del cliente
        const destinatarios: string[] = [emailCliente];

        // Agregar emails_notificacion del cliente (separados por ';;')
        if (cliente?.emails_notificacion) {
            const emailsExtra = cliente.emails_notificacion
                .split(';;')
                .map((e: string) => e.trim())
                .filter((e: string) => e.length > 0 && e.includes('@'));
            for (const extra of emailsExtra) {
                if (!destinatarios.includes(extra)) {
                    destinatarios.push(extra);
                }
            }
        }

        // ✅ FIX 28-FEB-2026: Para sedes, también incluir emails_notificacion del cliente principal
        if (cliente?.cliente_principal?.emails_notificacion) {
            const emailsPrincipal = cliente.cliente_principal.emails_notificacion
                .split(';;')
                .map((e: string) => e.trim())
                .filter((e: string) => e.length > 0 && e.includes('@'));
            for (const extra of emailsPrincipal) {
                if (!destinatarios.includes(extra)) {
                    destinatarios.push(extra);
                }
            }
        }

        // Incluir email adicional si se proporciona
        if (emailAdicional && !destinatarios.includes(emailAdicional)) {
            destinatarios.push(emailAdicional);
        }

        this.logger.log(`📧 Email destino (${destinatarios.length} destinatarios): ${destinatarios.join(', ')}`);

        if (destinatarios.length === 0) {
            this.logger.warn('⚠️ No hay destinatarios de email configurados');
            return { enviado: false, destinatario: 'ninguno' };
        }

        try {
            // Preparar datos para el email
            const tipoEquipoNombre = equipo?.tipos_equipo?.nombre_tipo || '';
            const equipoNombre = equipo?.nombre_equipo || '';
            const equipoDesc = equipoNombre || tipoEquipoNombre || 'Equipo';

            const emailData: OrdenEmailData = {
                ordenNumero: orden.numero_orden,
                clienteNombre: cliente?.persona?.nombre_comercial || cliente?.persona?.nombre_completo || cliente?.persona?.razon_social || 'Cliente',
                equipoDescripcion: equipoDesc,
                tipoMantenimiento: tipoServicio?.nombre_tipo || tipoServicio?.codigo_tipo || 'PREVENTIVO',
                fechaServicio: new Date().toLocaleDateString('es-CO'),
                tecnicoNombre: `${tecnicoEmpleado?.persona?.primer_nombre || ''} ${tecnicoEmpleado?.persona?.primer_apellido || ''}`.trim() || 'Técnico',
            };

            // ✅ FIX 28-FEB-2026: Usar cuenta email del cliente con fallback al principal para sedes
            const idCuentaEmailCliente = cliente?.id_cuenta_email_remitente
                || cliente?.cliente_principal?.id_cuenta_email_remitente
                || null;

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
        idEstadoCompletada: number, // ✅ Ahora recibe el ID precargado
        observaciones: string,
        usuarioId: number,
        horaEntrada?: string,
        horaSalida?: string,
    ): Promise<void> {
        // 🔧 FIX 20-DIC-2025: Obtener la orden para usar fecha_inicio_real existente
        // Esto evita violar el constraint chk_os_fecha_fin_posterior cuando la orden
        // fue iniciada en un día diferente al que se finaliza
        const ordenExistente = await this.prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: idOrden },
            select: { fecha_inicio_real: true },
        });

        // Usar fecha_inicio_real existente como base, o fecha actual si no existe
        const fechaBase = ordenExistente?.fecha_inicio_real
            ? new Date(ordenExistente.fecha_inicio_real)
            : new Date();

        this.logger.log(`   📅 Fecha base para cálculo: ${fechaBase.toISOString()} (existente: ${!!ordenExistente?.fecha_inicio_real})`);

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

            if (isNaN(horas) || isNaN(minutos) || horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
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
                fechaInicioReal = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate(), parsed.horas, parsed.minutos, 0, 0);
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
                fechaFinReal = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate(), parsed.horas, parsed.minutos, 0, 0);
            } else {
                this.logger.warn(`   ⚠️ horaSalida inválida: "${horaSalida}", usando hora actual`);
                fechaFinReal = new Date();
            }

            // 🔧 FIX: Si hora de salida es menor que hora de entrada, es cruce de medianoche
            // Debemos agregar un día a la fecha de fin
            if (fechaInicioReal && fechaFinReal < fechaInicioReal) {
                fechaFinReal = new Date(fechaFinReal.getTime() + 24 * 60 * 60 * 1000);
                this.logger.log(`   ⏰ Cruce de medianoche detectado, fecha_fin_real ajustada al día siguiente`);
            }
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

        await this.prisma.$transaction([
            // 1. Actualizar orden
            this.prisma.ordenes_servicio.update({
                where: { id_orden_servicio: idOrden },
                data: {
                    id_estado_actual: idEstadoCompletada, // ✅ Usar parámetro precargado
                    fecha_inicio_real: fechaInicioReal,
                    fecha_fin_real: fechaFinReal,
                    duracion_minutos: duracionMinutos,
                    observaciones_cierre: observaciones,
                    modificado_por: usuarioId,
                    fecha_modificacion: fechaModificacionValue,
                },
            }),
            // 2. Registrar en historial (en la misma transacción)
            this.prisma.historial_estados_orden.create({
                data: {
                    id_orden_servicio: idOrden,
                    id_estado_nuevo: idEstadoCompletada, // ✅ Usar parámetro precargado
                    fecha_cambio: new Date(),
                    observaciones: `Orden finalizada. ${observaciones}`,
                    realizado_por: usuarioId,
                },
            }),
        ]);
    }

    /**
     * Intenta hacer rollback de recursos creados en caso de error
     */
    private async rollback(recursos: {
        evidencias: number[];
        firmas: number[];
        documento: number | null;
    }): Promise<void> {
        this.logger.warn('⚠️ Iniciando rollback de recursos creados...');

        try {
            // Eliminar documento
            if (recursos.documento) {
                await this.prisma.documentos_generados.delete({
                    where: { id_documento: recursos.documento },
                }).catch(() => { });
            }

            // Eliminar firmas
            for (const id of recursos.firmas) {
                await this.prisma.firmas_digitales.delete({
                    where: { id_firma_digital: id },
                }).catch(() => { });
            }

            // Eliminar evidencias
            for (const id of recursos.evidencias) {
                await this.prisma.evidencias_fotograficas.delete({
                    where: { id_evidencia: id },
                }).catch(() => { });
            }

            this.logger.log('✅ Rollback completado');
        } catch (error: unknown) {
            const err = error as Error;
            this.logger.error(`Error en rollback: ${err.message}`);
        }
    }

    /**
     * Persiste las actividades ejecutadas en BD para estadísticas y trazabilidad
     * ✅ OPTIMIZADO: Precarga catálogo + batch insert con createMany
     * ✅ FIX 26-ENE-2026: Idempotencia real - verificar si ya existen registros
     */
    private async persistirActividades(
        idOrden: number,
        actividades: ActividadInput[],
        usuarioId: number,
    ): Promise<number> {
        if (actividades.length === 0) return 0;

        // ✅ IDEMPOTENCIA: Verificar si ya hay actividades para esta orden
        const actividadesExistentes = await this.prisma.actividades_ejecutadas.count({
            where: { id_orden_servicio: idOrden },
        });

        if (actividadesExistentes > 0) {
            this.logger.warn(`⚠️ IDEMPOTENCIA: Ya existen ${actividadesExistentes} actividades para orden ${idOrden}. Saltando inserción.`);
            return 0; // No insertar duplicados
        }

        // PASO 1: Precargar TODO el catálogo en UNA sola query
        const catalogoCompleto = await this.prisma.catalogo_actividades.findMany({
            select: { id_actividad_catalogo: true, descripcion_actividad: true },
        });

        // Crear mapa para búsqueda O(1)
        const catalogoMap = new Map<string, number>();
        for (const cat of catalogoCompleto) {
            // Indexar por los primeros 50 chars en minúsculas para matching
            const key = cat.descripcion_actividad.substring(0, 50).toLowerCase();
            catalogoMap.set(key, cat.id_actividad_catalogo);
        }

        // PASO 2: Preparar datos para batch insert
        const ahora = new Date();
        const datosParaInsertar = actividades.map((act) => {
            const keyBusqueda = act.descripcion.substring(0, 50).toLowerCase();
            const idCatalogo = catalogoMap.get(keyBusqueda) || null;

            return {
                id_orden_servicio: idOrden,
                id_orden_equipo: act.idOrdenEquipo || null, // Multi-equipos: opcional
                id_actividad_catalogo: idCatalogo,
                descripcion_manual: idCatalogo ? null : act.descripcion,
                sistema: act.sistema || 'GENERAL',
                estado: this.mapResultadoAEstado(act.resultado),
                ejecutada: true,
                fecha_ejecucion: ahora,
                ejecutada_por: usuarioId,
                observaciones: act.observaciones || null,
            };
        });

        // PASO 3: Batch insert con createMany
        const resultado = await this.prisma.actividades_ejecutadas.createMany({
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
    ): Promise<number> {
        if (mediciones.length === 0) return 0;

        // ✅ IDEMPOTENCIA: Verificar si ya hay mediciones para esta orden
        const medicionesExistentes = await this.prisma.mediciones_servicio.count({
            where: { id_orden_servicio: idOrden },
        });

        if (medicionesExistentes > 0) {
            this.logger.warn(`⚠️ IDEMPOTENCIA: Ya existen ${medicionesExistentes} mediciones para orden ${idOrden}. Saltando inserción.`);
            return 0; // No insertar duplicados
        }

        // PASO 1: Precargar TODOS los parámetros en UNA sola query
        const parametrosCompletos = await this.prisma.parametros_medicion.findMany({
            select: { id_parametro_medicion: true, nombre_parametro: true, unidad_medida: true },
        });

        // Crear mapas para búsqueda O(1) - exacta y parcial
        const parametroMapExacto = new Map<string, { id: number; unidad: string }>();
        const parametroMapParcial = new Map<string, { id: number; unidad: string }>();

        for (const p of parametrosCompletos) {
            const nombreLower = p.nombre_parametro.toLowerCase();
            parametroMapExacto.set(nombreLower, { id: p.id_parametro_medicion, unidad: p.unidad_medida });
            // También indexar primeros 20 chars para matching parcial
            const nombreCorto = nombreLower.substring(0, 20);
            parametroMapParcial.set(nombreCorto, { id: p.id_parametro_medicion, unidad: p.unidad_medida });
        }

        // PASO 2: Preparar datos para batch insert
        const ahora = new Date();
        const datosParaInsertar: Array<{
            id_orden_servicio: number;
            id_orden_equipo: number | null;
            id_parametro_medicion: number;
            valor_numerico: number;
            unidad_medida: string;
            fecha_medicion: Date;
            medido_por: number;
        }> = [];

        for (const med of mediciones) {
            const nombreLower = med.parametro.toLowerCase();
            const nombreCorto = nombreLower.substring(0, 20);

            // Buscar primero exacto, luego parcial
            let parametro = parametroMapExacto.get(nombreLower) || parametroMapParcial.get(nombreCorto);

            if (!parametro) {
                this.logger.warn(`   ⚠️ Parámetro NO encontrado: "${med.parametro}"`);
                continue;
            }

            datosParaInsertar.push({
                id_orden_servicio: idOrden,
                id_orden_equipo: med.idOrdenEquipo || null, // Multi-equipos: opcional
                id_parametro_medicion: parametro.id,
                valor_numerico: med.valor,
                unidad_medida: med.unidad || parametro.unidad,
                fecha_medicion: ahora,
                medido_por: usuarioId,
            });
        }

        if (datosParaInsertar.length === 0) return 0;

        // PASO 3: Batch insert con createMany
        const resultado = await this.prisma.mediciones_servicio.createMany({
            data: datosParaInsertar,
            skipDuplicates: true,
        });

        return resultado.count;
    }

    /**
     * Registra la lectura del horómetro en la tabla lecturas_horometro
     * ROBUSTEZ: Valida que la lectura no sea inferior a la anterior
     */
    private async persistirHorometro(
        idOrden: number,
        idEquipo: number,
        horas: number,
        usuarioId: number,
    ): Promise<void> {
        try {
            // 1. Obtener la última lectura para este equipo
            const ultimaLectura = await this.prisma.lecturas_horometro.findFirst({
                where: { id_equipo: idEquipo },
                orderBy: { fecha_lectura: 'desc' },
            });

            // 2. Validación Zero Trust: Evitar horómetro en reversa
            if (ultimaLectura && Number(ultimaLectura.horas_lectura) > horas) {
                this.logger.warn(`⚠️ Intento de registrar horómetro menor al actual (${horas} < ${ultimaLectura.horas_lectura}). Se ignorará para mantener integridad.`);
                return;
            }

            // 3. Registrar nueva lectura
            await this.prisma.lecturas_horometro.create({
                data: {
                    id_equipo: idEquipo,
                    id_orden_servicio: idOrden,
                    horas_lectura: horas,
                    fecha_lectura: new Date(),
                    tipo_lectura: 'MANTENIMIENTO',
                    registrado_por: usuarioId,
                    observaciones: `Registrado automáticamente al finalizar orden ${idOrden}`,
                },
            });

            this.logger.log(`   ✅ Horómetro registrado: ${horas}h (Equipo ID: ${idEquipo})`);
        } catch (error: unknown) {
            const err = error as Error;
            this.logger.error(`❌ Error persistiendo horómetro: ${err.message}`);
            // No fallar la finalización si falla el horómetro (non-critical path)
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
}
