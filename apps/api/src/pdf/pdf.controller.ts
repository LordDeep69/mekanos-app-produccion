/**
 * PDF Controller - Motor Documental White-Label EAM
 *
 * Endpoints protegidos por JWT + RBAC (@Permisos):
 * - GET /ordenes/:id/pdf - Genera PDF de una orden específica
 * - GET /cotizaciones/:id/pdf - Genera PDF de una cotización comercial
 * - GET /pdf/prueba - Genera PDF técnico de prueba
 * - GET /pdf/cotizacion/prueba - Genera PDF de cotización de prueba
 * - POST /ordenes/:id/pdf/regenerar - Regenera PDF y opcionalmente lo envía por email
 * - POST /ordenes/:id/pdf/enviar - Envía email reutilizando PDF existente en R2
 */

import { PrismaService } from '@mekanos/database';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { createHash } from 'crypto';
import { Response } from 'express';
import { Permisos } from '../auth/decorators/permisos.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailTemplatesService } from '../email/email-templates.service';
import { EmailService } from '../email/email.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { formatDateOrg } from './org-branding.types';
import { PdfAssemblerService } from './pdf-assembler.service';
import { buildInformeFilename } from './pdf-naming.helper';
import { PdfService, TipoInforme } from './pdf.service';

class RegenerarPdfDto {
  @ApiProperty({
    description: 'Email del destinatario (opcional, usa email del cliente si no se especifica)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  emailDestino?: string;

  @ApiProperty({ description: 'Enviar email después de regenerar', default: false })
  @IsOptional()
  @IsBoolean()
  enviarEmail?: boolean;

  @ApiProperty({ description: 'Asunto personalizado del email', required: false })
  @IsOptional()
  @IsString()
  asuntoEmail?: string;

  @ApiProperty({ description: 'Mensaje personalizado para el email', required: false })
  @IsOptional()
  @IsString()
  mensajeEmail?: string;

  @ApiProperty({ description: 'Guardar PDF en R2 y registrar en BD', default: true })
  @IsOptional()
  @IsBoolean()
  guardarEnR2?: boolean;

  @ApiProperty({ description: 'Forzar regeneración aunque exista PDF en BD', default: false })
  @IsOptional()
  @IsBoolean()
  forzarRegeneracion?: boolean;
}

export class ArchivoAdjuntoDto {
  @ApiProperty({ description: 'Nombre del archivo adjunto' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Contenido del archivo en base64' })
  @IsString()
  contentBase64: string;

  @ApiProperty({ description: 'MIME type del archivo', required: false })
  @IsOptional()
  @IsString()
  contentType?: string;
}

class EnviarPdfExistenteDto {
  @ApiProperty({ description: 'Email del destinatario', required: true })
  @IsEmail()
  emailDestino: string;

  @ApiProperty({ description: 'Asunto personalizado del email', required: false })
  @IsOptional()
  @IsString()
  asuntoEmail?: string;

  @ApiProperty({ description: 'Mensaje personalizado para el email', required: false })
  @IsOptional()
  @IsString()
  mensajeEmail?: string;

  @ApiProperty({ description: 'Forzar regeneración aunque exista PDF', default: false })
  @IsOptional()
  @IsBoolean()
  forzarRegeneracion?: boolean;

  @ApiProperty({ description: 'Emails adicionales en CC', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailsCc?: string[];

  @ApiProperty({
    description: 'Archivos adicionales adjuntos (base64)',
    required: false,
    type: [ArchivoAdjuntoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchivoAdjuntoDto)
  archivosAdicionales?: ArchivoAdjuntoDto[];
}

@ApiTags('PDF')
@Controller()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
export class PdfController {
  private readonly logger = new Logger(PdfController.name);
  private readonly cotizacionPdfCache = new Map<
    number,
    { stamp: string; buffer: Buffer; filename: string; cachedAt: number }
  >();
  private readonly COT_PDF_CACHE_TTL_MS = 5 * 60_000;
  private readonly COT_PDF_CACHE_MAX = 15;

  constructor(
    private readonly pdfService: PdfService,
    private readonly pdfAssembler: PdfAssemblerService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailTemplates: EmailTemplatesService,
    private readonly r2Service: R2StorageService,
  ) {}

  @Get('ordenes/:id/pdf')
  @Permisos('INFORMES_READ')
  @ApiOperation({
    summary: 'Generar PDF de orden de servicio',
    description: 'Genera un PDF corporativo con el informe de mantenimiento',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', type: String })
  @ApiQuery({
    name: 'tipo',
    description: 'Tipo de informe (GENERADOR_A, GENERADOR_B, BOMBA_A, UNIVERSAL_EAM, CORRECTIVO)',
    required: false,
    enum: ['GENERADOR_A', 'GENERADOR_B', 'BOMBA_A', 'UNIVERSAL_EAM', 'CORRECTIVO'],
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async generarPdfOrden(
    @Param('id') id: string,
    @Query('tipo') tipoParam: TipoInforme | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    this.logger.log(
      `Generando PDF para orden ${idNumerico}, tipo solicitado: ${tipoParam || 'AUTO-DETECTAR'}`,
    );

    const { datosOrden, tipoInforme } = await this.pdfAssembler.assembleOrdenPdf(
      idNumerico,
      tipoParam,
    );
    const resultado = await this.pdfService.generarPDF({
      tipoInforme,
      datos: datosOrden,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(HttpStatus.OK).send(resultado.buffer);

    setImmediate(async () => {
      try {
        await this.prisma.documentos_generados.updateMany({
          where: {
            id_referencia: idNumerico,
            tipo_documento: 'INFORME_SERVICIO',
          },
          data: {
            veces_descargado: { increment: 1 },
            fecha_ultima_descarga: new Date(),
          },
        });
      } catch (err) {
        this.logger.warn(`No se pudo registrar descarga para orden ${idNumerico}: ${err}`);
      }
    });
  }

  @Get('cotizaciones/:id/pdf')
  @Permisos('COTIZACIONES_READ')
  @ApiOperation({
    summary: 'Generar PDF de cotización',
    description: 'Genera un PDF corporativo con la cotización comercial',
  })
  @ApiParam({ name: 'id', description: 'ID de la cotización', type: String })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async generarPdfCotizacion(
    @Param('id') id: string,
    @Query('refresh') refresh: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de cotización inválido: ${id}`);
    }

    const forceRefresh = refresh === '1' || refresh === 'true';

    const buildCotPdfStamp = (
      meta: {
        fecha_modificacion?: Date | string | null;
        version?: number | null;
        id_estado?: number | null;
        total_cotizacion?: any;
        mostrar_desglose_precios?: boolean | null;
        atencion_a_nombre?: string | null;
        atencion_a_cargo?: string | null;
        id_firma_asesor?: number | null;
        id_firma_cliente?: number | null;
      },
      orgMeta: {
        enable_cpq_governance?: boolean | null;
        fecha_modificacion?: Date | string | null;
        color_primario?: string | null;
        texto_pie_pdf?: string | null;
      } | null,
    ) => {
      const cotTs = meta.fecha_modificacion ? new Date(meta.fecha_modificacion).getTime() : 0;
      const orgTs = orgMeta?.fecha_modificacion
        ? new Date(orgMeta.fecha_modificacion).getTime()
        : 0;
      const pieHash = orgMeta?.texto_pie_pdf
        ? createHash('sha1').update(orgMeta.texto_pie_pdf).digest('hex').slice(0, 8)
        : '0';
      return [
        cotTs,
        meta.version || 1,
        meta.id_estado || 0,
        meta.total_cotizacion?.toString() || '0',
        `desg:${meta.mostrar_desglose_precios ? 1 : 0}`,
        `fa:${meta.id_firma_asesor || 0}`,
        `fc:${meta.id_firma_cliente || 0}`,
        `at:${meta.atencion_a_nombre || ''}|${meta.atencion_a_cargo || ''}`,
        `gov:${orgMeta?.enable_cpq_governance ? 1 : 0}`,
        `org:${orgTs}`,
        `clr:${orgMeta?.color_primario || ''}`,
        `pie:${pieHash}`,
      ].join('-');
    };

    const applyNoCachePdfHeaders = () => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    };

    // Verificación rápida de huella para reutilizar PDF si la cotización o la configuración no cambiaron
    if (!forceRefresh) {
      const cached = this.cotizacionPdfCache.get(idNumerico);
      if (cached && Date.now() - cached.cachedAt < this.COT_PDF_CACHE_TTL_MS) {
        const [meta, orgMeta] = await Promise.all([
          this.prisma.cotizaciones.findUnique({
            where: { id_cotizacion: idNumerico },
            select: {
              fecha_modificacion: true,
              version: true,
              id_estado: true,
              total_cotizacion: true,
              mostrar_desglose_precios: true,
              atencion_a_nombre: true,
              atencion_a_cargo: true,
              id_firma_asesor: true,
              id_firma_cliente: true,
            },
          }),
          this.prisma.configuracion_organizacion
            .findUnique({
              where: { id_configuracion: 1 },
              select: {
                enable_cpq_governance: true,
                fecha_modificacion: true,
                color_primario: true,
                texto_pie_pdf: true,
              },
            })
            .catch(() => null),
        ]);
        if (!meta) {
          this.cotizacionPdfCache.delete(idNumerico);
          throw new NotFoundException(`Cotización #${idNumerico} no encontrada`);
        }
        const stamp = buildCotPdfStamp(meta, orgMeta);
        if (cached.stamp === stamp) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${cached.filename}"`);
          res.setHeader('Content-Length', cached.buffer.length);
          applyNoCachePdfHeaders();
          res.setHeader('X-PDF-Cache', 'HIT');
          res.status(HttpStatus.OK).send(cached.buffer);
          return;
        }
      }
    }

    const [{ cotizacion, datosCotizacion }, orgMetaPost] = await Promise.all([
      this.pdfAssembler.assembleCotizacionPdf(idNumerico),
      this.prisma.configuracion_organizacion
        .findUnique({
          where: { id_configuracion: 1 },
          select: {
            enable_cpq_governance: true,
            fecha_modificacion: true,
            color_primario: true,
            texto_pie_pdf: true,
          },
        })
        .catch(() => null),
    ]);
    const resultado = await this.pdfService.generarPDFCotizacion(datosCotizacion);

    const stamp = buildCotPdfStamp(cotizacion || {}, orgMetaPost);
    if (this.cotizacionPdfCache.size >= this.COT_PDF_CACHE_MAX) {
      const oldestKey = this.cotizacionPdfCache.keys().next().value;
      if (oldestKey !== undefined) this.cotizacionPdfCache.delete(oldestKey);
    }
    this.cotizacionPdfCache.set(idNumerico, {
      stamp,
      buffer: resultado.buffer,
      filename: resultado.filename,
      cachedAt: Date.now(),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    applyNoCachePdfHeaders();
    res.setHeader('X-PDF-Cache', 'MISS');
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  @Get('pdf/cotizacion/prueba')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({
    summary: 'Generar PDF de cotización de prueba',
    description: 'Genera una cotización comercial de ejemplo con el branding configurado',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de cotización de prueba generado',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  async generarPdfCotizacionPrueba(@Res() res: Response): Promise<void> {
    const resultado = await this.pdfService.generarPDFCotizacionPrueba();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  @Get('pdf/prueba')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({
    summary: 'Generar PDF de prueba',
    description: 'Genera un PDF de ejemplo con datos ficticios y branding de la organización',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de prueba generado',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  async generarPdfPrueba(@Res() res: Response): Promise<void> {
    const resultado = await this.pdfService.generarPDFPrueba();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  @Post('ordenes/:id/pdf/regenerar')
  @Permisos('INFORMES_CREATE')
  @ApiOperation({
    summary: 'Regenerar PDF de orden y enviar por email',
    description:
      'Regenera el PDF con los datos actualizados de la orden y opcionalmente lo envía por email',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', type: String })
  @ApiBody({ type: RegenerarPdfDto })
  @ApiResponse({
    status: 200,
    description: 'PDF regenerado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        pdfUrl: { type: 'string' },
        emailEnviado: { type: 'boolean' },
        filename: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async regenerarPdfOrden(
    @Param('id') id: string,
    @Body() dto: RegenerarPdfDto,
  ): Promise<{
    success: boolean;
    message: string;
    pdfUrl?: string;
    emailEnviado?: boolean;
    filename?: string;
    pdfBase64?: string;
    usoPdfExistente?: boolean;
    idDocumento?: number;
  }> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    if (!dto.forzarRegeneracion) {
      const pdfExistente = await this.prisma.documentos_generados.findFirst({
        where: {
          tipo_documento: 'INFORME_SERVICIO',
          id_referencia: idNumerico,
        },
        orderBy: { fecha_generacion: 'desc' },
      });

      if (pdfExistente?.ruta_archivo) {
        const ordenContexto = await this.pdfAssembler.buildInformeFilenameContext(idNumerico);
        const filenameCanonico = ordenContexto
          ? buildInformeFilename(ordenContexto)
          : `Informe_${id}.pdf`;

        if (dto.enviarEmail && dto.emailDestino) {
          try {
            const response = await fetch(pdfExistente.ruta_archivo);
            if (response.ok) {
              const pdfBuffer = Buffer.from(await response.arrayBuffer());
              const resultado = await this.emailService.sendEmail({
                to: dto.emailDestino,
                subject:
                  dto.asuntoEmail ||
                  `Informe de Mantenimiento - ${ordenContexto?.numeroOrden || id}`,
                html: '<p>Adjunto encontrará el informe técnico de servicio.</p>',
                attachments: [
                  {
                    filename: filenameCanonico,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                  },
                ],
              });

              return {
                success: true,
                message: 'PDF existente enviado por email',
                pdfUrl: pdfExistente.ruta_archivo,
                emailEnviado: resultado.success,
                filename: filenameCanonico,
                usoPdfExistente: true,
              };
            }
          } catch (error) {
            this.logger.warn(`Error descargando PDF existente, regenerando: ${error}`);
          }
        } else {
          return {
            success: true,
            message: 'PDF existente disponible (use forzarRegeneracion=true para regenerar)',
            pdfUrl: pdfExistente.ruta_archivo,
            emailEnviado: false,
            filename: filenameCanonico,
            usoPdfExistente: true,
          };
        }
      }
    }

    const { orden, datosOrden, tipoInforme, branding, emailContext, downloadFilename } =
      await this.pdfAssembler.assembleOrdenPdf(idNumerico);

    const resultado = await this.pdfService.generarPDF({
      tipoInforme,
      datos: datosOrden,
    });

    let urlPdf: string | undefined;
    let idDocumentoFinal: number | undefined;

    if (dto.guardarEnR2 !== false) {
      try {
        const timestamp = Date.now();
        const r2Filename = `${orden.numero_orden}/informe_${timestamp}.pdf`;
        urlPdf = await this.r2Service.uploadPDF(resultado.buffer, r2Filename, { downloadFilename });

        const hash = createHash('sha256').update(resultado.buffer).digest('hex');
        const documentoExistente = await this.prisma.documentos_generados.findFirst({
          where: {
            tipo_documento: 'INFORME_SERVICIO',
            id_referencia: idNumerico,
          },
          orderBy: { fecha_generacion: 'desc' },
        });

        if (documentoExistente) {
          await this.prisma.documentos_generados.update({
            where: { id_documento: documentoExistente.id_documento },
            data: {
              ruta_archivo: urlPdf,
              hash_sha256: hash,
              tama_o_bytes: BigInt(resultado.size),
              fecha_generacion: new Date(),
              herramienta_generacion: 'EAM-PDF-CONTROLLER-REGENERAR',
            },
          });
          idDocumentoFinal = documentoExistente.id_documento;
        } else {
          const docNuevo = await this.prisma.documentos_generados.create({
            data: {
              tipo_documento: 'INFORME_SERVICIO',
              id_referencia: idNumerico,
              numero_documento: `INF-${orden.numero_orden}-${timestamp}`,
              ruta_archivo: urlPdf,
              hash_sha256: hash,
              tama_o_bytes: BigInt(resultado.size),
              mime_type: 'application/pdf',
              fecha_generacion: new Date(),
              generado_por: 1,
              herramienta_generacion: 'EAM-PDF-CONTROLLER-REGENERAR',
            },
          });
          idDocumentoFinal = docNuevo.id_documento;
        }
      } catch (error) {
        this.logger.error(`Error subiendo PDF a R2: ${error}`);
      }
    }

    const clienteEmailsArray = Array.from(
      new Set(
        [...(dto.emailDestino ? [dto.emailDestino] : []), ...emailContext.clienteEmails].filter(
          (e) => Boolean(e && e.includes('@')),
        ),
      ),
    );
    const clienteEmail = clienteEmailsArray.length > 0 ? clienteEmailsArray.join(', ') : null;

    let emailEnviado = false;
    if (dto.enviarEmail && clienteEmail) {
      const asunto =
        dto.asuntoEmail ||
        `Informe de Mantenimiento - ${orden.numero_orden} | ${branding.nombreComercial}`;
      try {
        const mensaje =
          dto.mensajeEmail ||
          `Adjunto encontrará el informe de mantenimiento de la orden ${orden.numero_orden}.`;

        const htmlTemplate = this.emailTemplates.generateInformeMantenimientoTemplate({
          branding,
          ordenNumero: orden.numero_orden,
          tipoServicio: emailContext.tipoServicioNombre,
          tipoServicioDetallado: emailContext.tipoServicioDetallado,
          clienteNombre: emailContext.clienteNombre,
          clienteDireccion: emailContext.clienteDireccion,
          clienteCiudad: emailContext.ciudad || branding.ciudadDefecto || undefined,
          equipoNombre: emailContext.marcaEquipo,
          equipoMarca: emailContext.marcaEquipo,
          equipoSerie: emailContext.serieEquipo,
          equipoUbicacion: emailContext.clienteDireccion,
          fechaServicio: emailContext.fechaServicio,
          tecnicoNombre: datosOrden.tecnico,
          tecnicoCargo: 'Técnico Especializado',
          estadoServicio: 'COMPLETADO',
          mensajePersonalizado: mensaje,
        });

        const idCuentaEmailRegen =
          orden.clientes?.id_cuenta_email_remitente ||
          orden.clientes?.cliente_principal?.id_cuenta_email_remitente ||
          undefined;

        const regenEmailResult = await this.emailService.sendEmailFromAccount(
          {
            to: clienteEmailsArray,
            subject: asunto,
            html: htmlTemplate,
            attachments: [
              {
                filename: resultado.filename,
                content: resultado.buffer,
                contentType: 'application/pdf',
              },
            ],
          },
          idCuentaEmailRegen,
        );

        emailEnviado = regenEmailResult.success;

        await this.registrarHistorialEmailSafe({
          idOrden: idNumerico,
          to: clienteEmail,
          asunto,
          estado: emailEnviado ? 'EXITOSO' : 'FALLIDO',
          messageId: regenEmailResult.messageId || null,
          error: emailEnviado ? null : regenEmailResult.error || 'Error desconocido',
          urlPdf: urlPdf || null,
          origen: 'ADMIN_PORTAL_REGENERAR',
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error enviando email de regeneración: ${errorMsg}`);
        await this.registrarHistorialEmailSafe({
          idOrden: idNumerico,
          to: clienteEmail || dto.emailDestino || 'desconocido',
          asunto,
          estado: 'FALLIDO',
          error: errorMsg,
          origen: 'ADMIN_PORTAL_REGENERAR',
        });
      }
    }

    return {
      success: true,
      message: emailEnviado
        ? `PDF regenerado y enviado a ${clienteEmail}`
        : 'PDF regenerado exitosamente',
      filename: resultado.filename,
      emailEnviado,
      pdfBase64: resultado.buffer.toString('base64'),
      pdfUrl: urlPdf,
      idDocumento: idDocumentoFinal,
    };
  }

  @Post('ordenes/:id/pdf/enviar')
  @Permisos('INFORMES_CREATE')
  @ApiOperation({
    summary: 'Enviar email con PDF existente',
    description:
      'Envía el PDF ya guardado en R2 sin regenerar, ideal para reenvío rápido desde el portal.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', type: String })
  @ApiBody({ type: EnviarPdfExistenteDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        usoPdfExistente: { type: 'boolean' },
        urlPdf: { type: 'string' },
      },
    },
  })
  async enviarPdfExistente(
    @Param('id') id: string,
    @Body() dto: EnviarPdfExistenteDto,
  ): Promise<{
    success: boolean;
    message: string;
    usoPdfExistente: boolean;
    urlPdf?: string;
    error?: string;
  }> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idNumerico },
      include: {
        clientes: {
          include: {
            persona: true,
            cliente_principal: {
              select: { emails_notificacion: true, id_cuenta_email_remitente: true },
            },
          },
        },
        tipos_servicio: true,
        equipos: { include: { tipos_equipo: true } },
        sedes_cliente: true,
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          include: { persona: true },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    let pdfBuffer: Buffer | null = null;
    let urlPdf: string | null = null;
    let filename = `Informe_${orden.numero_orden}.pdf`;

    if (!dto.forzarRegeneracion) {
      const documento = await this.prisma.documentos_generados.findFirst({
        where: {
          id_referencia: idNumerico,
          tipo_documento: 'INFORME_SERVICIO',
        },
        orderBy: { fecha_generacion: 'desc' },
      });

      if (documento?.ruta_archivo) {
        urlPdf = documento.ruta_archivo;
        try {
          const response = await fetch(urlPdf);
          if (response.ok) {
            pdfBuffer = Buffer.from(await response.arrayBuffer());
            filename = urlPdf.split('/').pop() || filename;
          }
        } catch (error) {
          this.logger.warn(`Error descargando PDF existente de R2: ${error}`);
        }
      }
    }

    if (!pdfBuffer) {
      const regenerarResult = await this.regenerarPdfOrden(id, {
        emailDestino: dto.emailDestino,
        enviarEmail: true,
        asuntoEmail: dto.asuntoEmail,
        mensajeEmail: dto.mensajeEmail,
      });

      return {
        success: regenerarResult.success,
        message: regenerarResult.message,
        usoPdfExistente: false,
        urlPdf: regenerarResult.pdfUrl,
        error: regenerarResult.success ? undefined : 'Error regenerando PDF',
      };
    }

    const branding = await this.pdfAssembler.resolveBranding();
    const tecnico = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
    const tecnicoNombre = tecnico
      ? `${tecnico.primer_nombre || ''} ${tecnico.primer_apellido || ''}`.trim() || 'Técnico'
      : 'Técnico';
    const fechaServicio = formatDateOrg(
      orden.fecha_inicio_real || orden.fecha_programada || new Date(),
      branding,
    );

    const asunto =
      dto.asuntoEmail ||
      `Informe de Mantenimiento - ${orden.numero_orden} | ${branding.nombreComercial}`;
    const mensaje =
      dto.mensajeEmail ||
      `Adjunto encontrará el informe de mantenimiento de la orden ${orden.numero_orden}.`;

    try {
      const clientePersona = orden.clientes?.persona;
      const clienteNombreBase =
        clientePersona?.nombre_comercial ||
        clientePersona?.razon_social ||
        dto.emailDestino.split('@')[0];
      const clienteNombreCompleto = orden.clientes?.nombre_sede
        ? `${clienteNombreBase} - ${orden.clientes.nombre_sede}`
        : clienteNombreBase;
      const clienteDireccion =
        orden.sedes_cliente?.direccion_sede ?? clientePersona?.direccion_principal ?? undefined;
      const clienteCiudad =
        orden.sedes_cliente?.ciudad_sede ??
        clientePersona?.ciudad ??
        branding.ciudadDefecto ??
        undefined;

      const tipoServicioNombre = orden.tipos_servicio?.nombre_tipo || 'Mantenimiento';
      const codigoTipo = (orden.tipos_servicio?.codigo_tipo || '').toUpperCase();
      let tipoServicioCompleto = tipoServicioNombre;
      if (codigoTipo.includes('PREVENTIVO_A') || codigoTipo.includes('PREV_A')) {
        tipoServicioCompleto = 'Mantenimiento Preventivo Tipo A';
      } else if (codigoTipo.includes('PREVENTIVO_B') || codigoTipo.includes('PREV_B')) {
        tipoServicioCompleto = 'Mantenimiento Preventivo Tipo B';
      } else if (codigoTipo.includes('CORRECTIVO') || codigoTipo.includes('CORR')) {
        tipoServicioCompleto = 'Mantenimiento Correctivo';
      }

      const htmlTemplate = this.emailTemplates.generateInformeMantenimientoTemplate({
        branding,
        ordenNumero: orden.numero_orden,
        tipoServicio: tipoServicioNombre,
        tipoServicioDetallado: tipoServicioCompleto,
        clienteNombre: clienteNombreCompleto,
        clienteDireccion,
        clienteCiudad: clienteCiudad || undefined,
        equipoNombre: orden.equipos?.nombre_equipo ?? undefined,
        equipoMarca: orden.equipos?.nombre_equipo ?? undefined,
        equipoSerie: orden.equipos?.numero_serie_equipo ?? undefined,
        equipoUbicacion: clienteDireccion,
        fechaServicio,
        tecnicoNombre,
        tecnicoCargo: 'Técnico Especializado',
        estadoServicio: 'COMPLETADO',
        mensajePersonalizado: mensaje,
      });

      const ccEmails = dto.emailsCc?.filter((e) => e && e.includes('@')) || [];
      const autoAddCc = (emailsStr?: string | null) => {
        if (!emailsStr) return;
        for (const extra of emailsStr.split(';;').map((e) => e.trim())) {
          if (extra.includes('@') && extra !== dto.emailDestino && !ccEmails.includes(extra)) {
            ccEmails.push(extra);
          }
        }
      };
      autoAddCc(orden.clientes?.emails_notificacion);
      autoAddCc(orden.clientes?.cliente_principal?.emails_notificacion);

      const attachments: { filename: string; content: Buffer; contentType: string }[] = [
        { filename, content: pdfBuffer, contentType: 'application/pdf' },
      ];

      if (dto.archivosAdicionales?.length) {
        for (const archivo of dto.archivosAdicionales) {
          try {
            attachments.push({
              filename: archivo.filename,
              content: Buffer.from(archivo.contentBase64, 'base64'),
              contentType: archivo.contentType || 'application/octet-stream',
            });
          } catch (err) {
            this.logger.warn(`Error procesando adjunto ${archivo.filename}: ${err}`);
          }
        }
      }

      const idCuentaEmailCliente =
        orden.clientes?.id_cuenta_email_remitente ||
        orden.clientes?.cliente_principal?.id_cuenta_email_remitente ||
        undefined;

      const emailResult = await this.emailService.sendEmailFromAccount(
        {
          to: dto.emailDestino,
          subject: asunto,
          html: htmlTemplate,
          attachments,
          ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
        },
        idCuentaEmailCliente,
      );

      const allDestinatarios = [dto.emailDestino, ...ccEmails];
      await this.registrarHistorialEmailSafe({
        idOrden: idNumerico,
        to: dto.emailDestino,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : null,
        asunto,
        estado: emailResult.success ? 'EXITOSO' : 'FALLIDO',
        messageId: emailResult.messageId || null,
        error: emailResult.success ? null : emailResult.error || 'Error desconocido',
        urlPdf: urlPdf || null,
        origen: 'ADMIN_PORTAL',
      });

      if (emailResult.success) {
        return {
          success: true,
          message: `Email enviado a ${allDestinatarios.join(', ')} (PDF existente, sin regenerar)`,
          usoPdfExistente: true,
          urlPdf: urlPdf || undefined,
        };
      }

      return {
        success: false,
        message: 'Error enviando email',
        usoPdfExistente: true,
        error: emailResult.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error enviando PDF existente: ${errorMsg}`);
      await this.registrarHistorialEmailSafe({
        idOrden: idNumerico,
        to: dto.emailDestino,
        asunto,
        estado: 'FALLIDO',
        error: errorMsg,
        origen: 'ADMIN_PORTAL',
      });

      return {
        success: false,
        message: 'Error enviando email',
        usoPdfExistente: true,
        error: errorMsg,
      };
    }
  }

  private async registrarHistorialEmailSafe(params: {
    idOrden: number;
    to: string;
    cc?: string | null;
    asunto: string;
    estado: 'EXITOSO' | 'FALLIDO';
    messageId?: string | null;
    error?: string | null;
    urlPdf?: string | null;
    origen: string;
  }) {
    try {
      await this.prisma.historial_emails_enviados.create({
        data: {
          id_orden_servicio: params.idOrden,
          destinatario_to: params.to,
          destinatarios_cc: params.cc ?? null,
          asunto: params.asunto,
          estado_envio: params.estado,
          message_id: params.messageId ?? null,
          mensaje_error: params.error ?? null,
          url_pdf_enviado: params.urlPdf ?? null,
          origen_envio: params.origen,
        },
      });
    } catch (histErr) {
      this.logger.warn(`Error registrando historial de email: ${histErr}`);
    }
  }
}
