import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PdfService } from '../pdf/pdf.service';
import {
  EnviarEmailResponseDto,
  EnviarInformeTecnicoDto,
  EnviarOrdenCompletadaDto,
  EnviarTestEmailDto,
} from './dto';
import { EmailService, OrdenEmailData } from './email.service';

/**
 * ============================================================================
 * EMAIL CONTROLLER - MEKANOS S.A.S
 * ============================================================================
 * Controlador para gestión y pruebas de envío de emails.
 * 
 * ENDPOINTS:
 * - GET  /email/status      - Estado del servicio de email
 * - POST /email/test        - Enviar email de prueba
 * - POST /email/orden       - Enviar email de orden con PDF
 * - POST /email/orden-simple- Enviar email de orden con link
 * - POST /email/informe     - Enviar informe técnico con PDF adjunto
 * 
 * VALIDACIÓN:
 * Todos los DTOs usan class-validator para validación automática
 * ============================================================================
 */

@Controller('email')
@ApiTags('Email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService
  ) { }

  /**
   * =========================================================================
   * GET /email/status - Estado del servicio
   * =========================================================================
   */
  @Get('status')
  @ApiOperation({
    summary: 'Estado del servicio de email',
    description: 'Verifica si el servicio de email está configurado correctamente'
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del servicio',
    schema: {
      type: 'object',
      properties: {
        configured: { type: 'boolean', example: true },
        provider: { type: 'string', example: 'Nodemailer (SMTP)' },
        from: { type: 'string', example: 'mekanossas2@gmail.com' }
      }
    }
  })
  getStatus() {
    return this.emailService.checkConfiguration();
  }

  /**
   * =========================================================================
   * GET /email/debug - Diagnóstico directo de variables de entorno
   * =========================================================================
   * ✅ FIX 22-ENE-2026: Endpoint para debugging de variables SMTP
   */
  @Get('debug')
  @ApiOperation({
    summary: 'Diagnóstico de variables SMTP',
    description: 'Muestra el estado de las variables de entorno SMTP directamente'
  })
  getDebug() {
    const emailSmtpUser = process.env.EMAIL_SMTP_USER;
    const emailSmtpPass = process.env.EMAIL_SMTP_PASS;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const effectiveUser = emailSmtpUser || smtpUser;
    const effectivePass = emailSmtpPass || smtpPass;

    return {
      timestamp: new Date().toISOString(),
      variables: {
        EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || '(not set)',
        EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT || '(not set)',
        EMAIL_SMTP_USER: emailSmtpUser ? `${emailSmtpUser.substring(0, 5)}...` : '(not set)',
        EMAIL_SMTP_PASS: emailSmtpPass ? `✅ set (${emailSmtpPass.length} chars)` : '(not set)',
        SMTP_HOST: process.env.SMTP_HOST || '(not set)',
        SMTP_PORT: process.env.SMTP_PORT || '(not set)',
        SMTP_USER: smtpUser ? `${smtpUser.substring(0, 5)}...` : '(not set)',
        SMTP_PASS: smtpPass ? `✅ set (${smtpPass.length} chars)` : '(not set)',
        EMAIL_FROM: process.env.EMAIL_FROM || '(not set)',
      },
      effective: {
        user: effectiveUser ? `${effectiveUser.substring(0, 5)}...@${effectiveUser.split('@')[1] || '?'}` : '❌ NONE',
        pass: effectivePass ? `✅ (${effectivePass.length} chars)` : '❌ NONE',
        willUseMock: !effectiveUser || !effectivePass,
      },
      serviceState: this.emailService.checkConfiguration(),
    };
  }

  /**
   * =========================================================================
   * POST /email/test - Enviar email de prueba
   * =========================================================================
   */
  @Post('test')
  @ApiOperation({
    summary: 'Enviar email de prueba',
    description: 'Envía un email de prueba para verificar la configuración SMTP'
  })
  @ApiBody({ type: EnviarTestEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado',
    type: EnviarEmailResponseDto
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async sendTestEmail(@Body() dto: EnviarTestEmailDto): Promise<EnviarEmailResponseDto> {
    return this.emailService.sendTestEmail(dto.to);
  }

  /**
   * =========================================================================
   * POST /email/orden - Enviar email de orden completada (con link)
   * =========================================================================
   */
  @Post('orden')
  @ApiOperation({
    summary: 'Enviar email de orden completada',
    description: 'Envía email de notificación de orden completada con enlace al PDF'
  })
  @ApiBody({ type: EnviarOrdenCompletadaDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado',
    type: EnviarEmailResponseDto
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async sendOrdenEmail(@Body() dto: EnviarOrdenCompletadaDto): Promise<EnviarEmailResponseDto> {
    try {
      // Decodificar PDF si viene en Base64
      let pdfBuffer: Buffer | undefined;
      if (dto.pdfBase64) {
        pdfBuffer = Buffer.from(dto.pdfBase64, 'base64');
      }

      const result = await this.emailService.sendOrdenCompletadaEmail(
        dto.numeroOrden,
        dto.clienteEmail,
        dto.pdfUrl || '',
        pdfBuffer
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * =========================================================================
   * POST /email/informe - Enviar informe técnico con PDF adjunto
   * =========================================================================
   */
  @Post('informe')
  @ApiOperation({
    summary: 'Enviar informe técnico con PDF adjunto',
    description: 'Envía email con informe técnico detallado y PDF adjunto'
  })
  @ApiBody({ type: EnviarInformeTecnicoDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado con PDF adjunto',
    type: EnviarEmailResponseDto
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async sendInformeTecnico(@Body() dto: EnviarInformeTecnicoDto): Promise<EnviarEmailResponseDto> {
    try {
      // Decodificar PDF de Base64
      const pdfBuffer = Buffer.from(dto.pdfBase64, 'base64');

      // Preparar datos para el email
      const emailData: OrdenEmailData = {
        ordenNumero: dto.ordenNumero,
        clienteNombre: dto.clienteNombre,
        equipoDescripcion: dto.equipoDescripcion,
        tipoMantenimiento: dto.tipoMantenimiento,
        fechaServicio: dto.fechaServicio,
        tecnicoNombre: dto.tecnicoNombre,
        observaciones: dto.observaciones
      };

      const result = await this.emailService.sendInformeTecnicoEmail(
        emailData,
        dto.clienteEmail,
        pdfBuffer
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * =========================================================================
   * POST /email/orden-simple - Enviar email simple con URL de PDF (Legacy)
   * =========================================================================
   */
  @Post('orden-simple')
  @ApiOperation({
    summary: 'Enviar email de orden con enlace a PDF (Legacy)',
    description: 'Envía email de orden completada con enlace para descargar el PDF. Use POST /email/orden en su lugar.'
  })
  @ApiBody({ type: EnviarOrdenCompletadaDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado',
    type: EnviarEmailResponseDto
  })
  async sendOrdenSimpleEmail(@Body() dto: EnviarOrdenCompletadaDto): Promise<EnviarEmailResponseDto> {
    return this.emailService.sendOrdenCompletadaEmail(
      dto.numeroOrden,
      dto.clienteEmail,
      dto.pdfUrl || ''
    );
  }
}
