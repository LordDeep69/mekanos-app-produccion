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
    /** Tipo de evidencia: ANTES, DURANTE, DESPUES, MEDICION */
    tipo: 'ANTES' | 'DURANTE' | 'DESPUES' | 'MEDICION';
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
    /** Nombre de quien firma */
    nombre?: string;
    /** Cargo de quien firma (para cliente) */
    cargo?: string;
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
            this.logger.log(`   ✓ ${firmasResultado.length} firmas registradas`);

            // ✅ FIX: Vincular firma del cliente a la orden para conteo en sync
            const firmaCliente = firmasResultado.find(f => f.tipo === 'CLIENTE');
            if (firmaCliente) {
                await this.prisma.ordenes_servicio.update({
                    where: { id_orden_servicio: orden.id_orden_servicio },
                    data: {
                        id_firma_cliente: firmaCliente.id,
                        nombre_quien_recibe: dto.firmas.cliente?.nombre || 'Cliente',
                        cargo_quien_recibe: dto.firmas.cliente?.cargo || null,
                    },
                });
                this.logger.log(`   ✓ Firma cliente vinculada a orden`);
            }

            // ========================================================================
            // PASO 3.5: Persistir actividades ejecutadas en BD (para estadísticas)
            // ========================================================================
            this.logger.log('📋 Paso 3.5: Registrando actividades ejecutadas...');
            const actividadesGuardadas = await this.persistirActividades(
                orden.id_orden_servicio,
                dto.actividades,
                dto.usuarioId,
            );
            this.logger.log(`   ✓ ${actividadesGuardadas} actividades registradas`);

            // ========================================================================
            // PASO 3.6: Persistir mediciones en BD (para estadísticas)
            // ========================================================================
            if (dto.mediciones && dto.mediciones.length > 0) {
                this.logger.log('📏 Paso 3.6: Registrando mediciones...');
                const medicionesGuardadas = await this.persistirMediciones(
                    orden.id_orden_servicio,
                    dto.mediciones,
                    dto.usuarioId,
                );
                this.logger.log(`   ✓ ${medicionesGuardadas} mediciones registradas`);
            }

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
                dto.horaEntrada,
                dto.horaSalida,
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
        if (dto.evidencias.length > 100) {
            throw new BadRequestException('Máximo 100 evidencias permitidas');
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
            if (!['ANTES', 'DURANTE', 'DESPUES', 'MEDICION'].includes(ev.tipo)) {
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
                equipo: {
                    include: { tipo_equipo: true },
                },
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
        const dbPromises = datosValidados.map(({ ev, buffer, url, hash, index }) =>
            this.prisma.evidencias_fotograficas.create({
                data: {
                    id_orden_servicio: idOrden,
                    tipo_evidencia: ev.tipo,
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
            }))
        );

        const resultados = await Promise.all(dbPromises);
        this.logger.log(`   ✅ ${resultados.length} evidencias procesadas`);
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
     * Busca primero para manejar el constraint único (id_persona, tipo_firma)
     * Si idPersona es 0, usa el usuarioId como fallback
     */
    private async registrarFirma(firma: FirmaInput, usuarioId: number) {
        const hash = createHash('sha256').update(firma.base64).digest('hex');

        // Si idPersona es 0, usar el usuarioId como fallback (técnico que registra)
        const idPersonaReal = firma.idPersona > 0 ? firma.idPersona : usuarioId;

        // Buscar firma existente
        const firmaExistente = await this.prisma.firmas_digitales.findFirst({
            where: {
                id_persona: idPersonaReal,
                tipo_firma: firma.tipo,
            },
        });

        if (firmaExistente) {
            // Actualizar firma existente
            return this.prisma.firmas_digitales.update({
                where: { id_firma_digital: firmaExistente.id_firma_digital },
                data: {
                    firma_base64: firma.base64,
                    formato_firma: (firma.formato || 'PNG').toUpperCase(),
                    hash_firma: hash,
                    fecha_captura: new Date(),
                    observaciones: `Firma de ${firma.tipo} - Actualizada en finalización`,
                    registrada_por: usuarioId,
                    fecha_registro: new Date(),
                },
            });
        }

        // Crear nueva firma
        return this.prisma.firmas_digitales.create({
            data: {
                id_persona: idPersonaReal,
                tipo_firma: firma.tipo,
                firma_base64: firma.base64,
                formato_firma: (firma.formato || 'PNG').toUpperCase(),
                hash_firma: hash,
                fecha_captura: new Date(),
                es_firma_principal: firma.tipo === 'TECNICO',
                activa: true,
                observaciones: `Firma de ${firma.tipo} - Finalización de orden${firma.idPersona === 0 ? ' (cliente sin registro)' : ''}`,
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
     */
    private determinarTipoInforme(orden: any): TipoInforme {
        // Determinar por tipo de equipo (usar tipo_equipo?.nombre_tipo, no tipo)
        const tipoEquipoNombre = (orden.equipo?.tipo_equipo?.nombre_tipo || '').toLowerCase();
        const tipoServicioCodigo = (orden.tipo_servicio?.codigo || '').toUpperCase();
        const tipoServicioNombre = (orden.tipo_servicio?.nombre_tipo || '').toUpperCase();

        this.logger.log(`🔍 Determinando tipo informe: tipoEquipo="${tipoEquipoNombre}", servicioCodigo="${tipoServicioCodigo}", servicioNombre="${tipoServicioNombre}"`);

        // Si es CORRECTIVO → CORRECTIVO (independiente del equipo)
        if (tipoServicioCodigo.includes('CORRECTIVO') || tipoServicioNombre.includes('CORRECTIVO')) {
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
     */
    private async generarPDFOrden(
        orden: any,
        dto: FinalizarOrdenDto,
        evidencias: Array<{ id: number; tipo: string; url: string }>,
        _firmas: Array<{ id: number; tipo: string }>, // Las firmas se incluyen vía dto.firmas
        tipoInforme: TipoInforme,
    ) {
        // Construir datos para el template

        // Mapear mediciones del array a datosModulo para el PDF
        const datosModuloMapeado = this.mapearMedicionesADatosModulo(dto.mediciones || []);

        // Nombre del técnico (persona natural o nombre completo como fallback)
        const tecnicoPersona = orden.tecnico?.persona;
        const nombreTecnico = tecnicoPersona?.primer_nombre && tecnicoPersona?.primer_apellido
            ? `${tecnicoPersona.primer_nombre} ${tecnicoPersona.primer_apellido}`
            : tecnicoPersona?.nombre_completo || 'N/A';

        const datosPDF = {
            cliente: orden.cliente?.persona?.razon_social || orden.cliente?.persona?.nombre_completo || 'N/A',
            direccion: orden.cliente?.persona?.direccion_principal || orden.cliente?.persona?.ciudad || 'N/A',
            marcaEquipo: orden.equipo?.nombre_equipo || 'N/A',
            serieEquipo: orden.equipo?.numero_serie_equipo || 'N/A',
            tipoEquipo: (orden.equipo as any)?.tipo_equipo?.nombre_tipo || 'GENERADOR',
            fecha: new Date().toLocaleDateString('es-CO'),
            tecnico: nombreTecnico,
            horaEntrada: dto.horaEntrada,
            horaSalida: dto.horaSalida,
            tipoServicio: orden.tipo_servicio?.nombre || 'PREVENTIVO',
            numeroOrden: orden.numero_orden,
            datosModulo: { ...datosModuloMapeado, ...(dto.datosModulo || {}) },
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
            // Las evidencias están en el mismo orden que dto.evidencias
            evidencias: evidencias.map((e, index) => ({
                url: e.url,
                caption: dto.evidencias[index]?.descripcion
                    ? `${e.tipo}: ${dto.evidencias[index].descripcion}`
                    : `Evidencia ${e.tipo}`,
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
     * Guarda URL base en BD (la URL requiere autenticación pero el PDF se envía por email)
     */
    private async subirPDFaR2(
        buffer: Buffer,
        numeroOrden: string,
    ): Promise<{ url: string; key: string }> {
        const timestamp = Date.now();
        const filename = `${numeroOrden}/informe_${timestamp}.pdf`;

        // Subir el archivo y obtener URL base
        const url = await this.r2Service.uploadPDF(buffer, filename);

        this.logger.log(`📎 PDF subido a R2: ${filename}`);

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
     * Envía email con el informe adjunto al cliente
     * 
     * Usa el email_principal del cliente registrado en la BD.
     * Para pruebas, actualizar el email de los clientes a lorddeep3@gmail.com
     */
    private async enviarEmailInforme(
        orden: any,
        pdfResult: any,
        emailAdicional?: string,
    ): Promise<{ enviado: boolean; destinatario: string; messageId?: string }> {
        const EMAIL_FALLBACK = 'notificaciones@mekanos.com';

        // Usar email real del cliente
        const emailCliente = orden.cliente?.persona?.email_principal || EMAIL_FALLBACK;

        // Incluir email adicional si se proporciona
        const destinatarios = [emailCliente];
        if (emailAdicional && emailAdicional !== emailCliente) {
            destinatarios.push(emailAdicional);
        }

        this.logger.log(`📧 Email destino: ${destinatarios.join(', ')}`);

        if (destinatarios.length === 0) {
            this.logger.warn('⚠️ No hay destinatarios de email configurados');
            return { enviado: false, destinatario: 'ninguno' };
        }

        try {
            // Preparar datos para el email
            const tipoEquipoNombre = orden.equipo?.tipo_equipo?.nombre_tipo || '';
            const equipoNombre = orden.equipo?.nombre_equipo || '';
            const equipoDesc = equipoNombre || tipoEquipoNombre || 'Equipo';

            const emailData: OrdenEmailData = {
                ordenNumero: orden.numero_orden,
                clienteNombre: orden.cliente?.persona?.razon_social || orden.cliente?.persona?.nombre_completo || 'Cliente',
                equipoDescripcion: equipoDesc,
                tipoMantenimiento: orden.tipo_servicio?.nombre_tipo || orden.tipo_servicio?.codigo_tipo || 'PREVENTIVO',
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
        horaEntrada?: string,
        horaSalida?: string,
    ): Promise<void> {
        // Obtener ID del estado COMPLETADA
        const estadoCompletada = await this.prisma.estados_orden.findFirst({
            where: { codigo_estado: 'COMPLETADA' },
        });

        if (!estadoCompletada) {
            throw new InternalServerErrorException('Estado COMPLETADA no encontrado');
        }

        //  FIX: Calcular fechas reales usando horas de entrada/salida
        // IMPORTANTE: Guardar las horas TAL CUAL vienen del móvil (hora local Colombia)
        // No hacer conversión a UTC porque Drift en el móvil pierde la info de zona horaria
        const hoy = new Date();
        let fechaInicioReal: Date | undefined;
        let fechaFinReal: Date = hoy;

        if (horaEntrada) {
            const [horasE, minutosE] = horaEntrada.split(':').map(Number);
            // Crear fecha SIN conversión UTC - guardar la hora local tal cual
            fechaInicioReal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), horasE, minutosE, 0, 0);
        }

        if (horaSalida) {
            const [horasS, minutosS] = horaSalida.split(':').map(Number);
            fechaFinReal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), horasS, minutosS, 0, 0);
        }

        // Calcular duración en minutos
        let duracionMinutos: number | undefined;
        if (fechaInicioReal) {
            const diffMs = fechaFinReal.getTime() - fechaInicioReal.getTime();
            // Si la diferencia es negativa (hora entrada > hora salida), 
            // puede ser cruce de medianoche - agregar 24 horas
            if (diffMs < 0) {
                // Ajustar: si es cruce de medianoche, sumar 24h
                const diffAjustado = diffMs + (24 * 60 * 60 * 1000);
                duracionMinutos = Math.round(diffAjustado / 60000);
                this.logger.log(`   ⏰ Duración ajustada por cruce de medianoche: ${duracionMinutos} min`);
            } else {
                duracionMinutos = Math.round(diffMs / 60000);
            }
            // Validación final: duración debe ser positiva y razonable (max 24h)
            if (duracionMinutos < 0 || duracionMinutos > 1440) {
                this.logger.warn(`   ⚠️ Duración inválida (${duracionMinutos} min), usando null`);
                duracionMinutos = undefined;
            }
        }

        // Actualizar orden
        await this.prisma.ordenes_servicio.update({
            where: { id_orden_servicio: idOrden },
            data: {
                id_estado_actual: estadoCompletada.id_estado,
                fecha_inicio_real: fechaInicioReal,
                fecha_fin_real: fechaFinReal,
                duracion_minutos: duracionMinutos,
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

    /**
     * Persiste las actividades ejecutadas en BD para estadísticas y trazabilidad
     * ✅ OPTIMIZADO: Precarga catálogo + batch insert con createMany
     */
    private async persistirActividades(
        idOrden: number,
        actividades: ActividadInput[],
        usuarioId: number,
    ): Promise<number> {
        if (actividades.length === 0) return 0;

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
     */
    private async persistirMediciones(
        idOrden: number,
        mediciones: MedicionInput[],
        usuarioId: number,
    ): Promise<number> {
        if (mediciones.length === 0) return 0;

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
     * Mapea resultado a estado de actividad (enum del schema)
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
