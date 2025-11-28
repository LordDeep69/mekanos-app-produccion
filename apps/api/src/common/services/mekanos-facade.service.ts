/**
 * ============================================================================
 * MEKANOS FACADE SERVICE - Fachada Unificada de Servicios
 * ============================================================================
 * 
 * Este servicio encapsula TODOS los servicios principales de MEKANOS
 * para ofrecer una API simple y consistente desde cualquier parte del sistema.
 * 
 * VENTAJAS:
 * 1. No preocuparse por nombres de campos - solo pasar los datos necesarios
 * 2. Validación automática de parámetros
 * 3. Tipado fuerte con TypeScript
 * 4. Un solo punto de inyección para múltiples servicios
 * 5. Manejo de errores centralizado
 * 
 * SERVICIOS ENCAPSULADOS:
 * - NumeracionService: Generación de códigos automáticos
 * - PdfService: Generación de PDFs profesionales
 * - EmailService: Envío de emails con templates
 * - CloudinaryService: Subida de imágenes a CDN
 * - R2StorageService: Almacenamiento de archivos en la nube
 * - SyncService: Sincronización móvil offline-first
 * 
 * @author MEKANOS S.A.S - Sistema de Gestión
 * @version 2.0.0
 * @since 2025-11-27
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

// ============================================================================
// INTERFACES SIMPLIFICADAS PARA USO FÁCIL
// ============================================================================

/**
 * Opciones simples para generar PDF de una orden
 */
export interface GenerarPdfOrdenInput {
  /** ID de la orden de servicio */
  idOrden: number | string;
  /** Tipo de informe a generar */
  tipo?: 'GENERADOR_A' | 'GENERADOR_B' | 'BOMBA_A' | 'COTIZACION';
  /** Si guardar el PDF en la nube automáticamente */
  guardarEnNube?: boolean;
}

/**
 * Resultado de generación de PDF
 */
export interface GenerarPdfResult {
  /** Si fue exitoso */
  success: boolean;
  /** Buffer del PDF generado */
  buffer?: Buffer;
  /** Nombre del archivo */
  filename?: string;
  /** Tamaño en bytes */
  size?: number;
  /** URL pública si se guardó en la nube */
  url?: string;
  /** Mensaje de error si falló */
  error?: string;
}

/**
 * Opciones simples para enviar email
 */
export interface EnviarEmailInput {
  /** Email(s) destinatario(s) */
  para: string | string[];
  /** Asunto del email */
  asunto: string;
  /** Tipo de template a usar */
  template?: 'ORDEN_COMPLETADA' | 'INFORME_TECNICO' | 'COTIZACION' | 'PERSONALIZADO';
  /** Datos para el template */
  datos?: Record<string, any>;
  /** Contenido HTML personalizado (si template = PERSONALIZADO) */
  contenidoHtml?: string;
  /** Archivos adjuntos */
  adjuntos?: Array<{
    nombre: string;
    contenido: Buffer;
    tipo?: string;
  }>;
  /** Emails en copia */
  copia?: string | string[];
  /** Emails en copia oculta */
  copiaOculta?: string | string[];
}

/**
 * Resultado de envío de email
 */
export interface EnviarEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Opciones para subir imagen
 */
export interface SubirImagenInput {
  /** Buffer de la imagen */
  imagen: Buffer;
  /** Carpeta destino (ej: 'ordenes', 'equipos', 'evidencias') */
  carpeta: string;
  /** Nombre del archivo (opcional, se genera automáticamente si no se proporciona) */
  nombre?: string;
}

/**
 * Resultado de subida de imagen
 */
export interface SubirImagenResult {
  success: boolean;
  /** URL pública de la imagen */
  url?: string;
  /** ID público para referencia */
  publicId?: string;
  /** Dimensiones */
  ancho?: number;
  alto?: number;
  error?: string;
}

/**
 * Opciones para subir archivo PDF a la nube
 */
export interface SubirPdfInput {
  /** Buffer del PDF */
  pdf: Buffer;
  /** Nombre del archivo */
  nombre: string;
  /** Carpeta destino (opcional) */
  carpeta?: string;
}

/**
 * Resultado de subida de PDF
 */
export interface SubirPdfResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Tipos de documento para numeración
 */
export type TipoDocumento = 
  | 'ORDEN_SERVICIO'
  | 'COTIZACION'
  | 'INFORME'
  | 'CONTRATO'
  | 'REMISION'
  | 'ORDEN_COMPRA'
  | 'FACTURA'
  | 'RECEPCION';

/**
 * Resultado de generación de número
 */
export interface GenerarNumeroResult {
  /** Si fue exitoso */
  success: boolean;
  /** Código completo formateado (ej: ORD-2025-00001) */
  codigo?: string;
  /** Solo el número secuencial */
  secuencial?: number;
  /** Año del código */
  anio?: number;
  error?: string;
}

/**
 * Opciones para workflow de órdenes
 */
export interface CambiarEstadoOrdenInput {
  /** ID de la orden */
  idOrden: number | string;
  /** Nuevo estado */
  nuevoEstado: 'PENDIENTE' | 'PROGRAMADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA' | 'EN_ESPERA';
  /** ID del usuario que hace el cambio */
  idUsuario: number;
  /** Motivo del cambio (opcional) */
  motivo?: string;
  /** Observaciones adicionales (opcional) */
  observaciones?: string;
}

/**
 * Resultado de cambio de estado
 */
export interface CambiarEstadoResult {
  success: boolean;
  estadoAnterior?: string;
  estadoNuevo?: string;
  error?: string;
}

// ============================================================================
// MEKANOS FACADE SERVICE
// ============================================================================

@Injectable()
export class MekanosFacadeService implements OnModuleInit {
  private readonly logger = new Logger(MekanosFacadeService.name);
  
  // Referencias a servicios (lazy loading)
  private _numeracionService: any = null;
  private _pdfService: any = null;
  private _emailService: any = null;
  private _cloudinaryService: any = null;
  private _r2StorageService: any = null;
  private _prisma: any = null;

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.logger.log('🚀 MekanosFacadeService inicializado - Fachada unificada lista');
  }

  // ============================================================================
  // LAZY LOADING DE SERVICIOS
  // ============================================================================

  private async getNumeracionService() {
    if (!this._numeracionService) {
      try {
        const { NumeracionService } = await import('./numeracion.service');
        this._numeracionService = this.moduleRef.get(NumeracionService, { strict: false });
      } catch (e) {
        this.logger.warn('NumeracionService no disponible');
      }
    }
    return this._numeracionService;
  }

  private async getPdfService() {
    if (!this._pdfService) {
      try {
        const { PdfService } = await import('../../pdf/pdf.service');
        this._pdfService = this.moduleRef.get(PdfService, { strict: false });
      } catch (e) {
        this.logger.warn('PdfService no disponible');
      }
    }
    return this._pdfService;
  }

  private async getEmailService() {
    if (!this._emailService) {
      try {
        const { EmailService } = await import('../../email/email.service');
        this._emailService = this.moduleRef.get(EmailService, { strict: false });
      } catch (e) {
        this.logger.warn('EmailService no disponible');
      }
    }
    return this._emailService;
  }

  private async getCloudinaryService() {
    if (!this._cloudinaryService) {
      try {
        const { CloudinaryService } = await import('../../cloudinary/cloudinary.service');
        this._cloudinaryService = this.moduleRef.get(CloudinaryService, { strict: false });
      } catch (e) {
        this.logger.warn('CloudinaryService no disponible');
      }
    }
    return this._cloudinaryService;
  }

  private async getR2StorageService() {
    if (!this._r2StorageService) {
      try {
        const { R2StorageService } = await import('../../storage/r2-storage.service');
        this._r2StorageService = this.moduleRef.get(R2StorageService, { strict: false });
      } catch (e) {
        this.logger.warn('R2StorageService no disponible');
      }
    }
    return this._r2StorageService;
  }

  private async getPrisma() {
    if (!this._prisma) {
      try {
        const { PrismaService } = await import('@mekanos/database');
        this._prisma = this.moduleRef.get(PrismaService, { strict: false });
      } catch (e) {
        this.logger.warn('PrismaService no disponible');
      }
    }
    return this._prisma;
  }

  // ============================================================================
  // MÉTODOS DE NUMERACIÓN AUTOMÁTICA
  // ============================================================================

  /**
   * Genera un número secuencial único para cualquier tipo de documento
   * 
   * @example
   * // Generar número de orden de servicio
   * const resultado = await facade.generarNumero('ORDEN_SERVICIO');
   * console.log(resultado.codigo); // 'ORD-2025-00001'
   * 
   * @example
   * // Generar número de cotización
   * const resultado = await facade.generarNumero('COTIZACION');
   * console.log(resultado.codigo); // 'COT-2025-00001'
   */
  async generarNumero(tipo: TipoDocumento): Promise<GenerarNumeroResult> {
    try {
      const service = await this.getNumeracionService();
      if (!service) {
        return { success: false, error: 'NumeracionService no disponible' };
      }

      // Mapear tipo amigable a enum interno
      const tipoMap: Record<TipoDocumento, string> = {
        'ORDEN_SERVICIO': 'ORD',
        'COTIZACION': 'COT',
        'INFORME': 'INF',
        'CONTRATO': 'CONT',
        'REMISION': 'REM',
        'ORDEN_COMPRA': 'OC',
        'FACTURA': 'FAC',
        'RECEPCION': 'REC',
      };

      const result = await service.generateNumber(tipoMap[tipo]);
      
      return {
        success: true,
        codigo: result.code,
        secuencial: result.sequence,
        anio: result.year,
      };
    } catch (error) {
      this.logger.error(`Error generando número ${tipo}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // MÉTODOS DE GENERACIÓN DE PDF
  // ============================================================================

  /**
   * Genera un PDF profesional de una orden de servicio
   * 
   * @example
   * // Generar PDF de orden tipo A
   * const resultado = await facade.generarPdfOrden({ idOrden: 123 });
   * if (resultado.success) {
   *   console.log('PDF generado:', resultado.filename);
   *   // resultado.buffer contiene el PDF
   * }
   * 
   * @example
   * // Generar y guardar en la nube automáticamente
   * const resultado = await facade.generarPdfOrden({
   *   idOrden: 123,
   *   tipo: 'GENERADOR_B',
   *   guardarEnNube: true
   * });
   * console.log('URL del PDF:', resultado.url);
   */
  async generarPdfOrden(input: GenerarPdfOrdenInput): Promise<GenerarPdfResult> {
    try {
      const pdfService = await this.getPdfService();
      const prisma = await this.getPrisma();
      
      if (!pdfService) {
        return { success: false, error: 'PdfService no disponible' };
      }
      if (!prisma) {
        return { success: false, error: 'Base de datos no disponible' };
      }

      // Obtener datos de la orden
      const idOrden = typeof input.idOrden === 'string' ? input.idOrden : input.idOrden.toString();
      
      const orden = await prisma.ordenes_servicio.findUnique({
        where: { id: idOrden },
        include: {
          equipo: { include: { tipo_equipo: true } },
          cliente: true,
          estado: true,
          tecnico_asignado: { include: { persona: true } },
          actividades_ejecutadas: { include: { actividad_catalogo: true } },
          mediciones: { include: { parametro: true } },
        },
      });

      if (!orden) {
        return { success: false, error: `Orden ${input.idOrden} no encontrada` };
      }

      // Mapear datos para el PDF
      const datosOrden = this.mapearDatosOrdenParaPdf(orden);
      
      // Generar PDF
      const tipo = input.tipo || 'GENERADOR_A';
      const resultado = await pdfService.generarPDF({
        tipoInforme: tipo,
        datos: datosOrden,
      });

      let url: string | undefined;

      // Guardar en la nube si se solicitó
      if (input.guardarEnNube) {
        const r2Service = await this.getR2StorageService();
        if (r2Service) {
          url = await r2Service.uploadPDF(resultado.buffer, resultado.filename);
        }
      }

      return {
        success: true,
        buffer: resultado.buffer,
        filename: resultado.filename,
        size: resultado.size,
        url,
      };
    } catch (error) {
      this.logger.error(`Error generando PDF: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mapea datos de orden Prisma al formato esperado por el PDF
   */
  private mapearDatosOrdenParaPdf(orden: any): any {
    return {
      numeroOrden: orden.numero_orden,
      estado: orden.estado?.nombre_estado || 'N/A',
      prioridad: orden.prioridad || 'NORMAL',
      // Cliente
      clienteNombre: orden.cliente?.nombre_comercial || orden.cliente?.razon_social || 'N/A',
      clienteNit: orden.cliente?.nit || 'N/A',
      clienteDireccion: orden.cliente?.direccion || 'N/A',
      // Equipo
      equipoCodigo: orden.equipo?.codigo_interno || 'N/A',
      equipoNombre: orden.equipo?.nombre_equipo || 'N/A',
      equipoMarca: orden.equipo?.marca || 'N/A',
      equipoModelo: orden.equipo?.modelo || 'N/A',
      equipoSerie: orden.equipo?.numero_serie || 'N/A',
      tipoEquipo: orden.equipo?.tipo_equipo?.nombre || 'N/A',
      // Fechas
      fechaCreacion: orden.fecha_creacion,
      fechaProgramada: orden.fecha_programada,
      fechaInicio: orden.fecha_inicio_real,
      fechaFin: orden.fecha_fin_real,
      // Técnico
      tecnicoNombre: orden.tecnico_asignado?.persona 
        ? `${orden.tecnico_asignado.persona.nombres} ${orden.tecnico_asignado.persona.apellidos}`
        : 'Sin asignar',
      // Actividades
      actividades: (orden.actividades_ejecutadas || []).map((act: any) => ({
        nombre: act.actividad_catalogo?.nombre_actividad || 'Actividad',
        estado: act.estado_actividad,
        observaciones: act.observaciones,
      })),
      // Mediciones
      mediciones: (orden.mediciones || []).map((med: any) => ({
        parametro: med.parametro?.nombre_parametro || 'Parámetro',
        valor: med.valor_numerico ?? med.valor_texto ?? 'N/A',
        unidad: med.parametro?.unidad_medida || '',
        nivel: med.nivel_alerta,
      })),
      // Observaciones
      trabajoRealizado: orden.trabajo_realizado,
      observaciones: orden.observaciones_cierre,
    };
  }

  // ============================================================================
  // MÉTODOS DE EMAIL
  // ============================================================================

  /**
   * Envía un email con template profesional MEKANOS
   * 
   * @example
   * // Enviar notificación de orden completada
   * const resultado = await facade.enviarEmail({
   *   para: 'cliente@empresa.com',
   *   asunto: 'Orden de servicio completada',
   *   template: 'ORDEN_COMPLETADA',
   *   datos: { numeroOrden: 'ORD-2025-00001' }
   * });
   * 
   * @example
   * // Enviar email personalizado con adjunto
   * const resultado = await facade.enviarEmail({
   *   para: ['gerente@empresa.com', 'soporte@empresa.com'],
   *   asunto: 'Informe técnico adjunto',
   *   template: 'PERSONALIZADO',
   *   contenidoHtml: '<h1>Informe</h1><p>Ver adjunto...</p>',
   *   adjuntos: [{
   *     nombre: 'informe.pdf',
   *     contenido: pdfBuffer,
   *     tipo: 'application/pdf'
   *   }]
   * });
   */
  async enviarEmail(input: EnviarEmailInput): Promise<EnviarEmailResult> {
    try {
      const emailService = await this.getEmailService();
      
      if (!emailService) {
        return { success: false, error: 'EmailService no disponible' };
      }

      // Construir contenido HTML según template
      let html: string;
      
      if (input.template === 'PERSONALIZADO' && input.contenidoHtml) {
        html = input.contenidoHtml;
      } else if (input.template === 'ORDEN_COMPLETADA' && input.datos?.numeroOrden) {
        // Usar método existente del servicio
        const result = await emailService.sendOrdenCompletadaEmail(
          input.datos.numeroOrden,
          typeof input.para === 'string' ? input.para : input.para[0],
          input.datos.pdfUrl || '',
          input.adjuntos?.[0]?.contenido
        );
        return result;
      } else {
        // Email genérico con template básico
        html = this.construirHtmlBasico(input.asunto, input.datos);
      }

      // Mapear adjuntos al formato del servicio
      const attachments = input.adjuntos?.map(adj => ({
        filename: adj.nombre,
        content: adj.contenido,
        contentType: adj.tipo || 'application/octet-stream',
      }));

      const result = await emailService.sendEmail({
        to: input.para,
        subject: input.asunto,
        html,
        attachments,
        cc: input.copia,
        bcc: input.copiaOculta,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Construye HTML básico para emails sin template específico
   */
  private construirHtmlBasico(titulo: string, datos?: Record<string, any>): string {
    const MEKANOS_BLUE = '#244673';
    const MEKANOS_LIGHT = '#3290A6';
    
    let contenidoDatos = '';
    if (datos) {
      contenidoDatos = Object.entries(datos)
        .map(([key, value]) => `<p><strong>${this.formatearCampo(key)}:</strong> ${value}</p>`)
        .join('');
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, ${MEKANOS_BLUE} 0%, ${MEKANOS_LIGHT} 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">MEKANOS S.A.S</h1>
      <p style="color: #9EC23D; margin: 10px 0 0;">Mantenimiento Industrial Profesional</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: ${MEKANOS_BLUE}; margin-top: 0;">${titulo}</h2>
      ${contenidoDatos}
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin-bottom: 0;">
        Este es un mensaje automático del sistema MEKANOS.<br>
        Por favor no responda a este correo.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Formatea nombre de campo para mostrar en email
   */
  private formatearCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  }

  // ============================================================================
  // MÉTODOS DE ALMACENAMIENTO DE IMÁGENES
  // ============================================================================

  /**
   * Sube una imagen a Cloudinary CDN
   * 
   * @example
   * // Subir evidencia fotográfica
   * const resultado = await facade.subirImagen({
   *   imagen: bufferImagen,
   *   carpeta: 'evidencias/ordenes/123'
   * });
   * console.log('URL de imagen:', resultado.url);
   */
  async subirImagen(input: SubirImagenInput): Promise<SubirImagenResult> {
    try {
      const cloudinaryService = await this.getCloudinaryService();
      
      if (!cloudinaryService) {
        return { success: false, error: 'CloudinaryService no disponible' };
      }

      const result = await cloudinaryService.uploadImage(input.imagen, input.carpeta);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        ancho: result.width,
        alto: result.height,
      };
    } catch (error) {
      this.logger.error(`Error subiendo imagen: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // MÉTODOS DE ALMACENAMIENTO DE PDFs
  // ============================================================================

  /**
   * Sube un PDF a Cloudflare R2
   * 
   * @example
   * // Subir PDF de orden
   * const resultado = await facade.subirPdf({
   *   pdf: pdfBuffer,
   *   nombre: 'MEKANOS_Orden_ORD-2025-00001.pdf'
   * });
   * console.log('URL del PDF:', resultado.url);
   */
  async subirPdf(input: SubirPdfInput): Promise<SubirPdfResult> {
    try {
      const r2Service = await this.getR2StorageService();
      
      if (!r2Service) {
        return { success: false, error: 'R2StorageService no disponible' };
      }

      const filename = input.carpeta 
        ? `${input.carpeta}/${input.nombre}` 
        : input.nombre;

      const url = await r2Service.uploadPDF(input.pdf, filename);

      return {
        success: true,
        url,
      };
    } catch (error) {
      this.logger.error(`Error subiendo PDF: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // MÉTODOS DE WORKFLOW DE ÓRDENES
  // ============================================================================

  /**
   * Cambia el estado de una orden siguiendo el workflow FSM
   * 
   * @example
   * // Marcar orden como completada
   * const resultado = await facade.cambiarEstadoOrden({
   *   idOrden: 123,
   *   nuevoEstado: 'COMPLETADA',
   *   idUsuario: 1,
   *   observaciones: 'Trabajo finalizado correctamente'
   * });
   */
  async cambiarEstadoOrden(input: CambiarEstadoOrdenInput): Promise<CambiarEstadoResult> {
    try {
      const prisma = await this.getPrisma();
      
      if (!prisma) {
        return { success: false, error: 'Base de datos no disponible' };
      }

      const idOrden = typeof input.idOrden === 'string' ? input.idOrden : input.idOrden.toString();

      // Obtener orden actual
      const orden = await prisma.ordenes_servicio.findUnique({
        where: { id: idOrden },
        include: { estado: true },
      });

      if (!orden) {
        return { success: false, error: `Orden ${input.idOrden} no encontrada` };
      }

      const estadoActual = orden.estado?.codigo_estado;

      // Validar transición FSM
      const { validarTransicion } = await import('../../ordenes/domain/workflow-estados');
      try {
        validarTransicion(estadoActual, input.nuevoEstado);
      } catch (e) {
        return { success: false, error: e.message };
      }

      // Obtener nuevo estado
      const nuevoEstadoDB = await prisma.estados_orden.findFirst({
        where: { codigo_estado: input.nuevoEstado },
      });

      if (!nuevoEstadoDB) {
        return { success: false, error: `Estado ${input.nuevoEstado} no existe` };
      }

      // Preparar datos de actualización
      const updateData: any = {
        id_estado_actual: nuevoEstadoDB.id_estado,
        fecha_cambio_estado: new Date(),
        modificado_por: input.idUsuario,
        fecha_modificacion: new Date(),
      };

      // Campos específicos por estado
      if (input.nuevoEstado === 'EN_PROCESO') {
        updateData.fecha_inicio_real = new Date();
      }
      if (input.nuevoEstado === 'COMPLETADA') {
        updateData.fecha_fin_real = new Date();
        updateData.observaciones_cierre = input.observaciones;
      }

      // Ejecutar transacción
      await prisma.$transaction([
        prisma.ordenes_servicio.update({
          where: { id: idOrden },
          data: updateData,
        }),
        prisma.historial_estados_orden.create({
          data: {
            id_orden_servicio: orden.id_orden_servicio,
            id_estado_anterior: orden.id_estado_actual,
            id_estado_nuevo: nuevoEstadoDB.id_estado,
            motivo_cambio: input.motivo,
            observaciones: input.observaciones,
            fecha_cambio: new Date(),
            realizado_por: input.idUsuario,
          },
        }),
      ]);

      this.logger.log(`✅ Orden ${idOrden}: ${estadoActual} → ${input.nuevoEstado}`);

      return {
        success: true,
        estadoAnterior: estadoActual,
        estadoNuevo: input.nuevoEstado,
      };
    } catch (error) {
      this.logger.error(`Error cambiando estado: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Verifica si todos los servicios están disponibles
   */
  async verificarServicios(): Promise<{
    numeracion: boolean;
    pdf: boolean;
    email: boolean;
    cloudinary: boolean;
    r2: boolean;
    database: boolean;
  }> {
    return {
      numeracion: !!(await this.getNumeracionService()),
      pdf: !!(await this.getPdfService()),
      email: !!(await this.getEmailService()),
      cloudinary: !!(await this.getCloudinaryService()),
      r2: !!(await this.getR2StorageService()),
      database: !!(await this.getPrisma()),
    };
  }

  /**
   * Genera un PDF de orden, lo sube a la nube y envía por email
   * Todo en una sola llamada
   * 
   * @example
   * const resultado = await facade.generarYEnviarOrdenCompleta({
   *   idOrden: 123,
   *   emailDestinatario: 'cliente@empresa.com',
   *   tipoInforme: 'GENERADOR_A'
   * });
   */
  async generarYEnviarOrdenCompleta(input: {
    idOrden: number | string;
    emailDestinatario: string;
    tipoInforme?: 'GENERADOR_A' | 'GENERADOR_B' | 'BOMBA_A';
    copiaEmails?: string[];
  }): Promise<{
    success: boolean;
    pdfUrl?: string;
    emailMessageId?: string;
    error?: string;
  }> {
    try {
      // 1. Generar PDF
      const pdfResult = await this.generarPdfOrden({
        idOrden: input.idOrden,
        tipo: input.tipoInforme || 'GENERADOR_A',
        guardarEnNube: true,
      });

      if (!pdfResult.success) {
        return { success: false, error: `Error generando PDF: ${pdfResult.error}` };
      }

      // 2. Enviar email
      const emailResult = await this.enviarEmail({
        para: input.emailDestinatario,
        asunto: `Orden de Servicio Completada - ${pdfResult.filename}`,
        template: 'ORDEN_COMPLETADA',
        datos: {
          numeroOrden: pdfResult.filename?.replace('MEKANOS_', '').replace('.pdf', ''),
          pdfUrl: pdfResult.url,
        },
        adjuntos: pdfResult.buffer ? [{
          nombre: pdfResult.filename!,
          contenido: pdfResult.buffer,
          tipo: 'application/pdf',
        }] : undefined,
        copia: input.copiaEmails,
      });

      if (!emailResult.success) {
        return { 
          success: false, 
          pdfUrl: pdfResult.url,
          error: `PDF generado pero error enviando email: ${emailResult.error}` 
        };
      }

      return {
        success: true,
        pdfUrl: pdfResult.url,
        emailMessageId: emailResult.messageId,
      };
    } catch (error) {
      this.logger.error(`Error en generarYEnviarOrdenCompleta: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
