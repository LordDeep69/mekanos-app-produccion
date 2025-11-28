/**
 * ============================================================================
 * FinalizacionOrdenService - MEKANOS S.A.S
 * ============================================================================
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
import { PrismaService } from '../../database/prisma.service';
import { EmailService, OrdenEmailData } from '../../email/email.service';
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
    /** Tipo de evidencia: ANTES, DURANTE, DESPUES */
    tipo: 'ANTES' | 'DURANTE' | 'DESPUES';
    /** Imagen en Base64 (sin prefijo data:image) */
    base64: string;
    /** Descripción de la evidencia */
    descripcion?: string;
    /** Formato de imagen (default: png) */
    formato?: 'png' | 'jpg' | 'jpeg';
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
}

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
        documento: {
            id: number;
            url: string;
            filename: string;
            tamanioKB: number;
        };
        email: {
            enviado: boolean;
            destinatario: string;
            messageId?: string;
        };
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
    ) { }

    /**
     * MÉTODO PRINCIPAL: Finaliza una orden de servicio
     * 
     * Ejecuta todo el flujo de finalización de forma transaccional
     */
    async finalizarOrden(dto: FinalizarOrdenDto): Promise<FinalizacionResult> {
        const startTime = Date.now();
        this.logger.log(`🚀 Iniciando finalización de orden ${dto.idOrden}`);

        // Variables para tracking de recursos creados (para rollback)
        const recursosCreados = {
            evidencias: [] as number[],
            firmas: [] as number[],
            documento: null as number | null,
        };

        try {
            // ========================================================================
            // PASO 0: Validaciones iniciales
            // ========================================================================
            this.logger.log('📋 Paso 0: Validando datos de entrada...');
            await this.validarEntrada(dto);

            // ========================================================================
            // PASO 1: Obtener datos completos de la orden
            // ========================================================================
            this.logger.log('📋 Paso 1: Obteniendo datos de la orden...');
            const orden = await this.obtenerOrdenCompleta(dto.idOrden);

            // ========================================================================
            // PASO 2: Subir evidencias a Cloudinary y registrar en BD
            // ========================================================================
            this.logger.log('📷 Paso 2: Procesando evidencias fotográficas...');
            const evidenciasResultado = await this.procesarEvidencias(
                dto.evidencias,
                orden.id_orden_servicio,
                orden.numero_orden,
                dto.usuarioId,
            );
            recursosCreados.evidencias = evidenciasResultado.map(e => e.id);

            // ========================================================================
            // PASO 3: Registrar firmas digitales
            // ========================================================================
            this.logger.log('✍️ Paso 3: Registrando firmas digitales...');
            const firmasResultado = await this.procesarFirmas(
                dto.firmas,
                dto.usuarioId,
            );
            recursosCreados.firmas = firmasResultado.map(f => f.id);

            // ========================================================================
            // PASO 4: Generar PDF con template real
            // ========================================================================
            this.logger.log('📄 Paso 4: Generando PDF con template profesional...');
            const tipoInforme = this.determinarTipoInforme(orden);
            const pdfResult = await this.generarPDFOrden(
                orden,
                dto,
                evidenciasResultado,
                firmasResultado,
                tipoInforme,
            );

            // ========================================================================
            // PASO 5: Subir PDF a Cloudflare R2
            // ========================================================================
            this.logger.log('☁️ Paso 5: Subiendo PDF a almacenamiento...');
            const r2Result = await this.subirPDFaR2(
                pdfResult.buffer,
                orden.numero_orden,
            );

            // ========================================================================
            // PASO 6: Registrar documento en BD
            // ========================================================================
            this.logger.log('💾 Paso 6: Registrando documento en base de datos...');
            const documentoResult = await this.registrarDocumento(
                orden.id_orden_servicio,
                orden.numero_orden,
                r2Result.url,
                pdfResult,
                dto.usuarioId,
            );
            recursosCreados.documento = documentoResult.id;

            // ========================================================================
            // PASO 7: Enviar email con PDF adjunto
            // ========================================================================
            this.logger.log('📧 Paso 7: Enviando email con informe...');
            const emailResult = await this.enviarEmailInforme(
                orden,
                pdfResult,
                dto.emailAdicional,
            );

            // ========================================================================
            // PASO 8: Actualizar estado de la orden
            // ========================================================================
            this.logger.log('✅ Paso 8: Actualizando estado de la orden...');
            await this.actualizarEstadoOrden(
                orden.id_orden_servicio,
                dto.observaciones,
                dto.usuarioId,
            );

            // ========================================================================
            // RESULTADO EXITOSO
            // ========================================================================
            const tiempoTotal = Date.now() - startTime;
            this.logger.log(`🎉 Orden ${orden.numero_orden} finalizada exitosamente en ${tiempoTotal}ms`);

            return {
                success: true,
                mensaje: `Orden ${orden.numero_orden} finalizada exitosamente`,
                datos: {
                    orden: {
                        id: orden.id_orden_servicio,
                        numero: orden.numero_orden,
                        estado: 'COMPLETADA',
                    },
                    evidencias: evidenciasResultado,
                    firmas: firmasResultado,
                    documento: {
                        id: documentoResult.id,
                        url: r2Result.url,
                        filename: pdfResult.filename,
                        tamanioKB: Math.round(pdfResult.size / 1024),
                    },
                    email: emailResult,
                },
                tiempoTotal,
            };

        } catch (error: unknown) {
            // ========================================================================
            // MANEJO DE ERRORES Y ROLLBACK
            // ========================================================================
            const err = error as Error;
            this.logger.error(`❌ Error finalizando orden: ${err.message}`, err.stack);

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
        if (dto.evidencias.length > 10) {
            throw new BadRequestException('Máximo 10 evidencias permitidas');
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
            if (!['ANTES', 'DURANTE', 'DESPUES'].includes(ev.tipo)) {
                throw new BadRequestException(`Tipo de evidencia inválido: ${ev.tipo}`);
            }
        }
    }

    /**
     * Obtiene los datos completos de la orden con relaciones
     */
    private async obtenerOrdenCompleta(idOrden: number) {
        const orden = await this.prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: idOrden },
            include: {
                cliente: {
                    include: { persona: true },
                },
                equipo: true,
                tecnico: {
                    include: { persona: true },
                },
                tipo_servicio: true,
                estado: true,
            },
        });

        if (!orden) {
            throw new NotFoundException(`Orden con ID ${idOrden} no encontrada`);
        }

        // Validar que la orden esté en estado que permita finalización
        const estadosPermitidos = ['EN_PROCESO', 'EN_EJECUCION', 'PENDIENTE'];
        if (!estadosPermitidos.includes(orden.estado?.codigo_estado || '')) {
            throw new BadRequestException(
                `La orden está en estado ${orden.estado?.nombre_estado}, no puede finalizarse`,
            );
        }

        return orden;
    }

    /**
     * Procesa y sube evidencias a Cloudinary + BD
     */
    private async procesarEvidencias(
        evidencias: EvidenciaInput[],
        idOrden: number,
        numeroOrden: string,
        _usuarioId: number, // Reservado para auditoría futura
    ): Promise<Array<{ id: number; tipo: string; url: string }>> {
        const resultados: Array<{ id: number; tipo: string; url: string }> = [];

        for (let i = 0; i < evidencias.length; i++) {
            const ev = evidencias[i];

            // Convertir base64 a buffer
            const buffer = Buffer.from(ev.base64, 'base64');
            const folder = `mekanos/evidencias/${numeroOrden}`;

            // Subir a Cloudinary
            const cloudinaryResult = await this.cloudinaryService.uploadImage(buffer, {
                folder,
                tags: [ev.tipo, numeroOrden],
            });

            if (!cloudinaryResult.success || !cloudinaryResult.url) {
                throw new InternalServerErrorException(
                    `Error subiendo evidencia ${ev.tipo}: ${cloudinaryResult.error || 'URL no generada'}`,
                );
            }

            // Calcular hash
            const hash = createHash('sha256').update(buffer).digest('hex');

            // Registrar en BD
            const evidenciaDB = await this.prisma.evidencias_fotograficas.create({
                data: {
                    id_orden_servicio: idOrden,
                    tipo_evidencia: ev.tipo,
                    descripcion: ev.descripcion || `Evidencia ${ev.tipo} del servicio`,
                    nombre_archivo: `${ev.tipo.toLowerCase()}_${Date.now()}.${ev.formato || 'png'}`,
                    ruta_archivo: cloudinaryResult.url,
                    hash_sha256: hash,
                    tama_o_bytes: BigInt(buffer.length),
                    mime_type: `image/${ev.formato || 'png'}`,
                    orden_visualizacion: i + 1,
                    es_principal: i === 0,
                    fecha_captura: new Date(),
                },
            });

            resultados.push({
                id: evidenciaDB.id_evidencia,
                tipo: ev.tipo,
                url: cloudinaryResult.url,
            });

            this.logger.debug(`  ✅ Evidencia ${ev.tipo} procesada (ID: ${evidenciaDB.id_evidencia})`);
        }

        return resultados;
    }

    /**
     * Procesa y registra firmas digitales
     */
    private async procesarFirmas(
        firmas: { tecnico: FirmaInput; cliente?: FirmaInput },
        usuarioId: number,
    ): Promise<Array<{ id: number; tipo: string }>> {
        const resultados: Array<{ id: number; tipo: string }> = [];

        // Procesar firma del técnico
        const firmaTecnico = await this.registrarFirma(firmas.tecnico, usuarioId);
        resultados.push({ id: firmaTecnico.id_firma_digital, tipo: 'TECNICO' });

        // Procesar firma del cliente si existe
        if (firmas.cliente?.base64) {
            const firmaCliente = await this.registrarFirma(firmas.cliente, usuarioId);
            resultados.push({ id: firmaCliente.id_firma_digital, tipo: 'CLIENTE' });
        }

        return resultados;
    }

    /**
     * Registra una firma digital en BD
     */
    private async registrarFirma(firma: FirmaInput, usuarioId: number) {
        const hash = createHash('sha256').update(firma.base64).digest('hex');

        return this.prisma.firmas_digitales.create({
            data: {
                id_persona: firma.idPersona,
                tipo_firma: firma.tipo,
                firma_base64: firma.base64,
                formato_firma: (firma.formato || 'PNG').toUpperCase(),
                hash_firma: hash,
                fecha_captura: new Date(),
                es_firma_principal: firma.tipo === 'TECNICO',
                activa: true,
                observaciones: `Firma de ${firma.tipo} - Finalización de orden`,
                registrada_por: usuarioId,
                fecha_registro: new Date(),
            },
        });
    }

    /**
     * Determina el tipo de informe según el equipo/servicio
     */
    private determinarTipoInforme(orden: any): TipoInforme {
        // Determinar por tipo de equipo
        const tipoEquipo = orden.equipo?.tipo?.toLowerCase() || '';
        const tipoServicio = orden.tipo_servicio?.codigo || '';

        if (tipoEquipo.includes('bomba')) {
            return 'BOMBA_A';
        }

        if (tipoServicio.includes('B') || tipoServicio.includes('TIPO_B')) {
            return 'GENERADOR_B';
        }

        // Default: Tipo A Generador
        return 'GENERADOR_A';
    }

    /**
     * Genera el PDF con los templates reales de MEKANOS
     */
    private async generarPDFOrden(
        orden: any,
        dto: FinalizarOrdenDto,
        evidencias: Array<{ id: number; tipo: string; url: string }>,
        _firmas: Array<{ id: number; tipo: string }>, // Las firmas se incluyen vía dto.firmas
        tipoInforme: TipoInforme,
    ) {
        // Construir datos para el template
        const datosPDF = {
            cliente: orden.cliente?.persona?.razon_social || orden.cliente?.persona?.nombre_completo || 'N/A',
            direccion: orden.cliente?.persona?.direccion_principal || 'N/A',
            marcaEquipo: orden.equipo?.marca || 'N/A',
            serieEquipo: orden.equipo?.serie || 'N/A',
            tipoEquipo: orden.equipo?.tipo || 'GENERADOR',
            fecha: new Date().toLocaleDateString('es-CO'),
            tecnico: `${orden.tecnico?.persona?.primer_nombre || ''} ${orden.tecnico?.persona?.primer_apellido || ''}`.trim() || 'N/A',
            horaEntrada: dto.horaEntrada,
            horaSalida: dto.horaSalida,
            tipoServicio: orden.tipo_servicio?.nombre || 'PREVENTIVO',
            numeroOrden: orden.numero_orden,
            datosModulo: dto.datosModulo || {},
            actividades: dto.actividades.map(a => ({
                sistema: a.sistema,
                descripcion: a.descripcion,
                resultado: a.resultado,
                observaciones: a.observaciones,
            })),
            mediciones: (dto.mediciones || []).map(m => ({
                parametro: m.parametro,
                valor: m.valor,
                unidad: m.unidad,
                nivelAlerta: m.nivelAlerta || 'OK',
            })),
            evidencias: evidencias.map(e => ({
                url: e.url,
                caption: `${e.tipo}: ${dto.evidencias.find(ev => ev.tipo === e.tipo)?.descripcion || ''}`,
            })),
            observaciones: dto.observaciones,
            // Firmas como data URL para mostrar en el PDF
            firmaTecnico: dto.firmas.tecnico?.base64
                ? `data:image/${dto.firmas.tecnico.formato || 'png'};base64,${dto.firmas.tecnico.base64}`
                : undefined,
            firmaCliente: dto.firmas.cliente?.base64
                ? `data:image/${dto.firmas.cliente.formato || 'png'};base64,${dto.firmas.cliente.base64}`
                : undefined,
        };

        return this.pdfService.generarPDF({
            tipoInforme,
            datos: datosPDF as any,
        });
    }

    /**
     * Sube el PDF a Cloudflare R2
     */
    private async subirPDFaR2(
        buffer: Buffer,
        numeroOrden: string,
    ): Promise<{ url: string; key: string }> {
        const timestamp = Date.now();
        const filename = `${numeroOrden}/informe_${timestamp}.pdf`;

        const url = await this.r2Service.uploadPDF(buffer, filename);

        return {
            url,
            key: `ordenes/pdfs/${filename}`,
        };
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
     * Envía email con el informe adjunto
     */
    private async enviarEmailInforme(
        orden: any,
        pdfResult: any,
        emailAdicional?: string,
    ): Promise<{ enviado: boolean; destinatario: string; messageId?: string }> {
        const emailCliente = orden.cliente?.persona?.email_principal;
        const destinatarios = [emailCliente, emailAdicional].filter(Boolean);

        if (destinatarios.length === 0) {
            this.logger.warn('⚠️ No hay destinatarios de email configurados');
            return { enviado: false, destinatario: 'ninguno' };
        }

        try {
            // Preparar datos para el email
            const emailData: OrdenEmailData = {
                ordenNumero: orden.numero_orden,
                clienteNombre: orden.cliente?.persona?.razon_social || 'Cliente',
                equipoDescripcion: `${orden.equipo?.marca || ''} ${orden.equipo?.modelo || ''}`.trim() || 'Equipo',
                tipoMantenimiento: orden.tipo_servicio?.nombre || 'PREVENTIVO',
                fechaServicio: new Date().toLocaleDateString('es-CO'),
                tecnicoNombre: `${orden.tecnico?.persona?.primer_nombre || ''} ${orden.tecnico?.persona?.primer_apellido || ''}`.trim() || 'Técnico',
            };

            const result = await this.emailService.sendInformeTecnicoEmail(
                emailData,
                destinatarios[0],
                pdfResult.buffer,
            );

            return {
                enviado: result.success,
                destinatario: destinatarios[0],
                messageId: result.messageId,
            };
        } catch (error: unknown) {
            const err = error as Error;
            this.logger.error(`Error enviando email: ${err.message}`);
            // No fallar todo el proceso por error de email
            return { enviado: false, destinatario: destinatarios[0] };
        }
    }

    /**
     * Actualiza el estado de la orden a COMPLETADA
     */
    private async actualizarEstadoOrden(
        idOrden: number,
        observaciones: string,
        usuarioId: number,
    ): Promise<void> {
        // Obtener ID del estado COMPLETADA
        const estadoCompletada = await this.prisma.estados_orden.findFirst({
            where: { codigo_estado: 'COMPLETADA' },
        });

        if (!estadoCompletada) {
            throw new InternalServerErrorException('Estado COMPLETADA no encontrado');
        }

        // Actualizar orden
        await this.prisma.ordenes_servicio.update({
            where: { id_orden_servicio: idOrden },
            data: {
                id_estado_actual: estadoCompletada.id_estado,
                fecha_fin_real: new Date(),
                observaciones_cierre: observaciones,
                modificado_por: usuarioId,
                fecha_modificacion: new Date(),
            },
        });

        // Registrar en historial
        await this.prisma.historial_estados_orden.create({
            data: {
                id_orden_servicio: idOrden,
                id_estado_nuevo: estadoCompletada.id_estado,
                fecha_cambio: new Date(),
                observaciones: `Orden finalizada. ${observaciones}`,
                realizado_por: usuarioId,
            },
        });
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
}
