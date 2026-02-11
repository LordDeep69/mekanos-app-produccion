import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { PrismaService } from '../database/prisma.service';

/**
 * ============================================================================
 * EMAIL SERVICE - MEKANOS S.A.S
 * ============================================================================
 * Servicio profesional de envío de emails.
 * 
 * PRIORIDAD DE PROVEEDORES:
 * 1. Gmail API (OAuth2 via HTTPS) - Para Render/Vercel (puertos bloqueados)
 * 2. SMTP (Nodemailer) - Para servidores con puertos abiertos (Plan Pro)
 * 3. Mock Mode - Si ninguno está configurado
 * 
 * CONFIGURACIÓN GMAIL API (Principal):
 * - GMAIL_CLIENT_ID: OAuth2 Client ID de Google Cloud
 * - GMAIL_CLIENT_SECRET: OAuth2 Client Secret
 * - GMAIL_REFRESH_TOKEN: Refresh Token obtenido via OAuth2
 * - EMAIL_FROM: Email remitente (debe coincidir con cuenta OAuth)
 * 
 * CONFIGURACIÓN SMTP (Alternativa):
 * - EMAIL_SMTP_HOST: smtp.gmail.com
 * - EMAIL_SMTP_PORT: 587
 * - EMAIL_SMTP_USER: usuario@gmail.com
 * - EMAIL_SMTP_PASS: App Password de Gmail
 * 
 * COLORES CORPORATIVOS MEKANOS:
 * - #F2F2F2 (Blanco)
 * - #244673 (Azul Oscuro)
 * - #3290A6 (Azul Claro)
 * - #56A672 (Verde)
 * - #9EC23D (Verde Claro)
 * ============================================================================
 */

// Colores corporativos MEKANOS
const MEKANOS_COLORS = {
  white: '#F2F2F2',
  blueDark: '#244673',
  blueLight: '#3290A6',
  green: '#56A672',
  greenLight: '#9EC23D'
};

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
  idCuentaEmail?: number; // ✅ MULTI-EMAIL: ID de cuenta específica
}

export interface OrdenEmailData {
  ordenNumero: string;
  clienteNombre: string;
  equipoDescripcion: string;
  tipoMantenimiento: string;
  fechaServicio: string;
  tecnicoNombre: string;
  observaciones?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private gmailOAuth2Client: any = null;
  private fromEmail: string;
  private isConfigured = false;
  private provider: 'gmail-api' | 'smtp' | 'mock' = 'mock';

  constructor(private readonly prisma: PrismaService) {
    this.fromEmail = process.env.EMAIL_FROM || 'mekanossas4@gmail.com';
  }

  async onModuleInit() {
    this.logger.log('🔧 [EmailService] Iniciando configuración...');
    await this.initializeEmailProvider();
  }

  /**
   * Inicializa el proveedor de email (Gmail API > SMTP > Mock)
   * ✅ FIX 23-ENE-2026: Gmail API como método principal (HTTPS, no SMTP)
   */
  private async initializeEmailProvider(): Promise<void> {
    // =======================================================================
    // PASO 1: Intentar Gmail API (OAuth2 via HTTPS - funciona en Render)
    // =======================================================================
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    this.logger.log(`📋 [EmailService] Verificando proveedores de email...`);
    this.logger.log(`   GMAIL_CLIENT_ID: ${clientId ? `✅ Configurado (${clientId.substring(0, 20)}...)` : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   GMAIL_CLIENT_SECRET: ${clientSecret ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   GMAIL_REFRESH_TOKEN: ${refreshToken ? `✅ Configurado (${refreshToken.substring(0, 20)}...)` : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   FROM: ${this.fromEmail}`);

    if (clientId && clientSecret && refreshToken) {
      try {
        this.logger.log('🔌 [EmailService] Creando cliente OAuth2 para Gmail API...');
        const OAuth2 = google.auth.OAuth2;
        this.gmailOAuth2Client = new OAuth2(
          clientId,
          clientSecret,
          'https://developers.google.com/oauthplayground' // Redirect URI
        );
        this.gmailOAuth2Client.setCredentials({ refresh_token: refreshToken });

        this.logger.log('🔍 [EmailService] Verificando access token...');
        // Verificar que podemos obtener access token
        const { token } = await this.gmailOAuth2Client.getAccessToken();
        if (token) {
          this.isConfigured = true;
          this.provider = 'gmail-api';
          this.logger.log('✅ [EmailService] Gmail API inicializado correctamente');
          this.logger.log(`   📧 Proveedor: Gmail API (OAuth2 HTTPS)`);
          this.logger.log(`   📧 Remitente: ${this.fromEmail}`);
          return; // Éxito con Gmail API, no intentar SMTP
        } else {
          this.logger.warn('⚠️ [EmailService] No se pudo obtener access token (token es null)');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'N/A';
        this.logger.error(`❌ Error inicializando Gmail API: ${errorMsg}`);
        this.logger.error(`   Stack: ${errorStack}`);
        this.gmailOAuth2Client = null;
      }
    } else {
      this.logger.warn('⚠️ [EmailService] Credenciales Gmail API incompletas, saltando...');
    }

    // =======================================================================
    // PASO 2: Intentar SMTP (Nodemailer - alternativa para Plan Pro)
    // =======================================================================
    const host = process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
    const user = process.env.EMAIL_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_SMTP_PASS || process.env.SMTP_PASS;

    this.logger.log(`📋 [EmailService] Verificando credenciales SMTP (alternativa)...`);
    this.logger.log(`   HOST: ${host}`);
    this.logger.log(`   PORT: ${port}`);
    this.logger.log(`   USER: ${user ? `${user.substring(0, 5)}...${user.includes('@') ? '@' + user.split('@')[1] : ''}` : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   PASS: ${pass ? `✅ Configurado (${pass.length} caracteres)` : '❌ NO CONFIGURADO'}`);

    if (!user || !pass) {
      this.logger.warn('⚠️ Credenciales SMTP no configuradas');
      this.logger.warn('⚠️ Modo MOCK activado - Los emails NO se enviarán');
      this.logger.warn('   💡 Recomendación: Configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET y GMAIL_REFRESH_TOKEN');
      return;
    }

    try {
      this.logger.log('🔌 [EmailService] Creando transporter SMTP...');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
      });

      this.logger.log('🔍 [EmailService] Verificando conexión SMTP...');
      await this.transporter.verify();

      this.isConfigured = true;
      this.provider = 'smtp';
      this.logger.log('✅ Servicio de Email SMTP inicializado correctamente');
      this.logger.log(`   📧 Remitente: ${this.fromEmail}`);
      this.logger.log(`   📡 SMTP: ${host}:${port}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error inicializando SMTP: ${errorMsg}`);
      this.logger.warn('⚠️ SMTP falló - Render bloquea puertos SMTP en plan gratuito');
      this.logger.warn('   💡 Solución: Configure Gmail API (OAuth2) para enviar emails via HTTPS');
      this.transporter = null;
      this.isConfigured = false;
      this.provider = 'mock';
    }
  }

  /**
   * =========================================================================
   * ENVÍO DE EMAILS DESDE CUENTA ESPECÍFICA (MULTI-EMAIL)
   * =========================================================================
   * Si se proporciona idCuentaEmail, usa las credenciales de esa cuenta.
   * Si no, usa la cuenta por defecto configurada en variables de entorno.
   */
  async sendEmailFromAccount(
    options: SendEmailOptions,
    idCuentaEmail?: number,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // ✅ MULTI-EMAIL HABILITADO: Buscar credenciales de la cuenta específica
    if (idCuentaEmail) {
      try {
        const cuenta = await this.prisma.cuentas_email.findUnique({
          where: { id_cuenta_email: idCuentaEmail },
        });

        if (cuenta && cuenta.activa && cuenta.gmail_client_id && cuenta.gmail_client_secret && cuenta.gmail_refresh_token) {
          this.logger.log(`📧 [MULTI-EMAIL] Usando cuenta: ${cuenta.email} (ID: ${idCuentaEmail})`);
          return this.sendEmailWithCredentials(options, {
            email: cuenta.email,
            clientId: cuenta.gmail_client_id,
            clientSecret: cuenta.gmail_client_secret,
            refreshToken: cuenta.gmail_refresh_token,
          });
        } else if (cuenta && !cuenta.activa) {
          this.logger.warn(`⚠️ [MULTI-EMAIL] Cuenta ${cuenta.email} (ID: ${idCuentaEmail}) está INACTIVA, usando cuenta por defecto`);
        } else if (cuenta) {
          this.logger.warn(`⚠️ [MULTI-EMAIL] Cuenta ${cuenta.email} (ID: ${idCuentaEmail}) sin credenciales Gmail API completas, usando cuenta por defecto`);
        } else {
          this.logger.warn(`⚠️ [MULTI-EMAIL] Cuenta ID: ${idCuentaEmail} NO encontrada en BD, usando cuenta por defecto`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ [MULTI-EMAIL] Error consultando cuenta ${idCuentaEmail}: ${errorMsg}`);
        this.logger.warn(`   Fallback a cuenta por defecto`);
      }
    }

    // Fallback a la cuenta por defecto
    return this.sendEmail(options);
  }

  /**
   * Envía email usando credenciales específicas (Gmail API)
   */
  private async sendEmailWithCredentials(
    options: SendEmailOptions,
    credentials: { email: string; clientId: string; clientSecret: string; refreshToken: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        'https://developers.google.com/oauthplayground',
      );
      oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      const boundary = `boundary_${Date.now()}`;

      let emailContent = [
        `From: MEKANOS S.A.S <${credentials.email}>`,
        `To: ${toAddresses}`,
        options.cc ? `Cc: ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}` : '',
        options.bcc ? `Bcc: ${Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc}` : '',
        `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
      ].filter(Boolean);

      if (options.attachments && options.attachments.length > 0) {
        emailContent.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`);
        emailContent.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '');
        emailContent.push(Buffer.from(options.html).toString('base64'));

        for (const att of options.attachments) {
          emailContent.push(`--${boundary}`);
          emailContent.push(`Content-Type: ${att.contentType || 'application/pdf'}; name="${att.filename}"`);
          emailContent.push('Content-Transfer-Encoding: base64');
          emailContent.push(`Content-Disposition: attachment; filename="${att.filename}"`, '');
          emailContent.push(att.content.toString('base64'));
        }
        emailContent.push(`--${boundary}--`);
      } else {
        emailContent.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '');
        emailContent.push(Buffer.from(options.html).toString('base64'));
      }

      const rawEmail = Buffer.from(emailContent.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawEmail },
      });

      this.logger.log(`✅ [Gmail API - ${credentials.email}] Email enviado - ID: ${response.data.id}`);
      return { success: true, messageId: response.data.id || undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ [Gmail API - Multi] Error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * =========================================================================
   * ENVÍO DE EMAILS GENÉRICO
   * =========================================================================
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // =========================================================================
    // PROVEEDOR 1: Gmail API (OAuth2 via HTTPS)
    // =========================================================================
    if (this.gmailOAuth2Client) {
      try {
        this.logger.log(`📧 [Gmail API] Enviando email a ${options.to}...`);

        const gmail = google.gmail({ version: 'v1', auth: this.gmailOAuth2Client });

        // Construir email en formato RFC 2822
        const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        const boundary = `boundary_${Date.now()}`;

        let emailContent = [
          `From: MEKANOS S.A.S <${this.fromEmail}>`,
          `To: ${toAddresses}`,
          options.cc ? `Cc: ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}` : '',
          options.bcc ? `Bcc: ${Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc}` : '',
          `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
          'MIME-Version: 1.0',
        ].filter(Boolean);

        if (options.attachments && options.attachments.length > 0) {
          // Email con adjuntos (multipart/mixed)
          emailContent.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`);
          emailContent.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '');
          emailContent.push(Buffer.from(options.html).toString('base64'));

          for (const att of options.attachments) {
            emailContent.push(`--${boundary}`);
            emailContent.push(`Content-Type: ${att.contentType || 'application/pdf'}; name="${att.filename}"`);
            emailContent.push('Content-Transfer-Encoding: base64');
            emailContent.push(`Content-Disposition: attachment; filename="${att.filename}"`, '');
            emailContent.push(att.content.toString('base64'));
          }
          emailContent.push(`--${boundary}--`);
        } else {
          // Email sin adjuntos
          emailContent.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '');
          emailContent.push(Buffer.from(options.html).toString('base64'));
        }

        const rawEmail = Buffer.from(emailContent.join('\r\n'))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawEmail },
        });

        this.logger.log(`✅ [Gmail API] Email enviado - ID: ${response.data.id}`);
        this.logger.log(`   📨 Destinatario: ${options.to}`);
        this.logger.log(`   📋 Asunto: ${options.subject}`);
        this.logger.log(`   📎 Adjuntos: ${options.attachments?.length || 0}`);
        this.logger.log(`   📤 El email aparecerá en tu carpeta "Enviados" de Gmail`);

        return { success: true, messageId: response.data.id || undefined };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`❌ [Gmail API] Error enviando email: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    }

    // =========================================================================
    // PROVEEDOR 2: SMTP (Nodemailer) - Alternativa para Plan Pro
    // =========================================================================
    if (this.transporter) {
      try {
        this.logger.log(`📧 [SMTP] Enviando email a ${options.to}...`);
        const mailOptions = {
          from: { name: 'MEKANOS S.A.S', address: this.fromEmail },
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || 'application/pdf'
          }))
        };

        const result = await this.transporter.sendMail(mailOptions);
        this.logger.log(`✅ [SMTP] Email enviado - ID: ${result.messageId}`);
        this.logger.log(`   📨 Destinatario: ${options.to}`);
        this.logger.log(`   📋 Asunto: ${options.subject}`);
        this.logger.log(`   📎 Adjuntos: ${options.attachments?.length || 0}`);

        return { success: true, messageId: result.messageId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`❌ [SMTP] Error enviando email: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    }

    // =========================================================================
    // FALLBACK: Mock Mode (NO envía emails reales)
    // =========================================================================
    this.logger.warn(`📧 [MOCK] Email NO enviado a ${options.to}`);
    this.logger.warn(`   Asunto: ${options.subject}`);
    this.logger.warn(`   ⚠️ Configure RESEND_API_KEY para enviar emails reales`);
    if (options.attachments?.length) {
      this.logger.warn(`   Adjuntos: ${options.attachments.map(a => a.filename).join(', ')}`);
    }
    return { success: true, messageId: 'mock-' + Date.now() };
  }

  /**
   * =========================================================================
   * ENVÍO DE ORDEN COMPLETADA CON PDF
   * =========================================================================
   */
  async sendOrdenCompletadaEmail(
    ordenNumero: string,
    clienteEmail: string,
    pdfUrl: string,
    pdfBuffer?: Buffer
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {

    const htmlContent = this.buildOrdenCompletadaTemplate(ordenNumero, pdfUrl);

    const attachments: EmailAttachment[] = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `Orden_${ordenNumero.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    return this.sendEmail({
      to: clienteEmail,
      subject: `✅ Orden de Servicio ${ordenNumero} - Completada | MEKANOS S.A.S`,
      html: htmlContent,
      attachments
    });
  }

  /**
   * =========================================================================
   * ENVÍO DE ORDEN CON INFORME TÉCNICO DETALLADO
   * =========================================================================
   */
  async sendInformeTecnicoEmail(
    data: OrdenEmailData,
    clienteEmail: string,
    pdfBuffer: Buffer,
    idCuentaEmail?: number, // ✅ MULTI-EMAIL: Cuenta específica del cliente
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {

    const htmlContent = this.buildInformeTecnicoTemplate(data);

    const emailOptions: SendEmailOptions = {
      to: clienteEmail,
      subject: `📋 Informe Técnico ${data.ordenNumero} - ${data.tipoMantenimiento} | MEKANOS S.A.S`,
      html: htmlContent,
      attachments: [{
        filename: `Informe_Tecnico_${data.ordenNumero.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    // ✅ MULTI-EMAIL: Si hay cuenta específica, usarla
    if (idCuentaEmail) {
      this.logger.log(`📧 [MULTI-EMAIL] Enviando informe desde cuenta ID: ${idCuentaEmail}`);
      return this.sendEmailFromAccount(emailOptions, idCuentaEmail);
    }

    return this.sendEmail(emailOptions);
  }

  /**
   * =========================================================================
   * ENVÍO DE EMAIL DE PRUEBA
   * =========================================================================
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const htmlContent = this.buildTestEmailTemplate();

    return this.sendEmail({
      to,
      subject: '🧪 Email de Prueba - MEKANOS S.A.S',
      html: htmlContent
    });
  }

  /**
   * =========================================================================
   * TEMPLATE: ORDEN COMPLETADA
   * =========================================================================
   */
  private buildOrdenCompletadaTemplate(ordenNumero: string, pdfUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orden Completada - MEKANOS</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: ${MEKANOS_COLORS.white};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(36, 70, 115, 0.15);">
          
          <!-- Header con Logo MEKANOS -->
          <tr>
            <td style="background: linear-gradient(135deg, ${MEKANOS_COLORS.blueDark} 0%, ${MEKANOS_COLORS.blueLight} 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">
                MEKANOS S.A.S
              </h1>
              <p style="color: ${MEKANOS_COLORS.greenLight}; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Mantenimiento Industrial Profesional
              </p>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 40px 35px;">
              
              <!-- Badge de Estado -->
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="background: linear-gradient(135deg, ${MEKANOS_COLORS.green} 0%, ${MEKANOS_COLORS.greenLight} 100%); color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                  ✓ Servicio Completado
                </span>
              </div>

              <h2 style="color: ${MEKANOS_COLORS.blueDark}; margin: 0 0 20px 0; font-size: 24px; text-align: center;">
                Orden de Servicio ${ordenNumero}
              </h2>

              <p style="color: #475569; line-height: 1.8; margin: 0 0 15px 0; font-size: 15px;">
                Estimado cliente,
              </p>

              <p style="color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-size: 15px;">
                Le informamos que la orden de servicio <strong style="color: ${MEKANOS_COLORS.blueLight};">${ordenNumero}</strong> 
                ha sido completada exitosamente por nuestro equipo técnico especializado.
              </p>

              <!-- Info Box -->
              <div style="background: linear-gradient(135deg, ${MEKANOS_COLORS.white} 0%, #e8f4f8 100%); border-left: 4px solid ${MEKANOS_COLORS.blueLight}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="color: ${MEKANOS_COLORS.blueDark}; margin: 0; font-size: 14px;">
                  <strong>📄 Informe Técnico Disponible</strong><br><br>
                  Su informe técnico detallado con todas las mediciones, observaciones 
                  y recomendaciones está listo para su descarga.
                </p>
              </div>

              <!-- Botón de Descarga -->
              <table role="presentation" style="margin: 30px auto;">
                <tr>
                  <td align="center">
                    <a href="${pdfUrl}" 
                       style="background: linear-gradient(135deg, ${MEKANOS_COLORS.green} 0%, ${MEKANOS_COLORS.greenLight} 100%); 
                              color: #ffffff; 
                              padding: 16px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              display: inline-block;
                              font-weight: bold;
                              font-size: 16px;
                              box-shadow: 0 4px 15px rgba(86, 166, 114, 0.4);
                              transition: all 0.3s ease;">
                      📥 Descargar Informe PDF
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                💡 <em>Si el archivo viene adjunto en este correo, puede descargarlo directamente.</em>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #475569; line-height: 1.6; margin: 0; text-align: center;">
                Gracias por confiar en <strong style="color: ${MEKANOS_COLORS.blueDark};">MEKANOS S.A.S</strong> para el mantenimiento 
                de sus equipos industriales.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${MEKANOS_COLORS.blueDark}; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #ffffff; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
                MEKANOS S.A.S
              </p>
              <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; line-height: 1.8;">
                Mantenimiento y Reparación de Equipos Industriales<br>
                Cartagena de Indias, Colombia<br>
                📞 315-7083350 | ✉️ mekanossas2@gmail.com
              </p>

              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">
                  © ${new Date().getFullYear()} MEKANOS S.A.S. Todos los derechos reservados.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * =========================================================================
   * TEMPLATE: INFORME TÉCNICO DETALLADO
   * =========================================================================
   */
  private buildInformeTecnicoTemplate(data: OrdenEmailData): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Técnico - MEKANOS</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: ${MEKANOS_COLORS.white};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(36, 70, 115, 0.15);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${MEKANOS_COLORS.blueDark} 0%, ${MEKANOS_COLORS.blueLight} 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">
                MEKANOS S.A.S
              </h1>
              <p style="color: ${MEKANOS_COLORS.greenLight}; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Informe Técnico de Servicio
              </p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 35px;">
              
              <h2 style="color: ${MEKANOS_COLORS.blueDark}; margin: 0 0 25px 0; font-size: 22px;">
                📋 ${data.tipoMantenimiento}
              </h2>

              <p style="color: #475569; line-height: 1.8; font-size: 15px; margin-bottom: 25px;">
                Estimado(a) <strong>${data.clienteNombre}</strong>,
              </p>

              <p style="color: #475569; line-height: 1.8; font-size: 15px; margin-bottom: 20px;">
                Adjunto encontrará el informe técnico detallado del servicio realizado a su equipo.
              </p>

              <!-- Resumen del Servicio -->
              <div style="background: ${MEKANOS_COLORS.white}; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 25px 0;">
                <div style="background: ${MEKANOS_COLORS.blueDark}; color: white; padding: 12px 20px; font-weight: bold;">
                  📊 Resumen del Servicio
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 40%;">Orden No.</td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: ${MEKANOS_COLORS.blueDark}; font-weight: bold;">${data.ordenNumero}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Equipo</td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${data.equipoDescripcion}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Tipo de Servicio</td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${data.tipoMantenimiento}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Fecha de Servicio</td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${data.fechaServicio}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; color: #64748b;">Técnico Responsable</td>
                    <td style="padding: 12px 20px; color: #1e293b;">${data.tecnicoNombre}</td>
                  </tr>
                </table>
              </div>

              ${data.observaciones ? `
              <!-- Observaciones -->
              <div style="background: linear-gradient(135deg, #fff8e6 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>⚠️ Observaciones Importantes:</strong><br><br>
                  ${data.observaciones}
                </p>
              </div>
              ` : ''}

              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                📎 <em>El informe técnico completo se encuentra adjunto en formato PDF.</em>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #475569; line-height: 1.6; margin: 0; text-align: center;">
                Gracias por confiar en <strong style="color: ${MEKANOS_COLORS.blueDark};">MEKANOS S.A.S</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${MEKANOS_COLORS.blueDark}; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #ffffff; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
                MEKANOS S.A.S
              </p>
              <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; line-height: 1.8;">
                Cartagena de Indias, Colombia<br>
                📞 315-7083350 | ✉️ mekanossas2@gmail.com
              </p>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">
                  © ${new Date().getFullYear()} MEKANOS S.A.S. Todos los derechos reservados.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * =========================================================================
   * TEMPLATE: EMAIL DE PRUEBA
   * =========================================================================
   */
  private buildTestEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email de Prueba - MEKANOS</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: ${MEKANOS_COLORS.white};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(36, 70, 115, 0.15);">
          
          <tr>
            <td style="background: linear-gradient(135deg, ${MEKANOS_COLORS.blueDark} 0%, ${MEKANOS_COLORS.blueLight} 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                🧪 MEKANOS S.A.S
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 35px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
              
              <h2 style="color: ${MEKANOS_COLORS.green}; margin: 0 0 20px 0; font-size: 24px;">
                ¡Configuración Exitosa!
              </h2>

              <p style="color: #475569; line-height: 1.8; font-size: 15px;">
                El servicio de correo electrónico está funcionando correctamente.
              </p>

              <div style="background: ${MEKANOS_COLORS.white}; border: 2px dashed ${MEKANOS_COLORS.blueLight}; padding: 20px; margin: 25px 0; border-radius: 8px;">
                <p style="color: ${MEKANOS_COLORS.blueDark}; margin: 0; font-size: 14px;">
                  <strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-CO', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Bogota'
    })}
                </p>
              </div>

              <p style="color: #64748b; font-size: 13px;">
                Este es un email de prueba automático del sistema MEKANOS.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: ${MEKANOS_COLORS.blueDark}; padding: 25px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0;">
                MEKANOS S.A.S | Cartagena, Colombia
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Verifica si el servicio está configurado
   * ✅ FIX 22-ENE-2026: Actualizado para Gmail API
   */
  checkConfiguration(): {
    configured: boolean;
    provider: string;
    from: string;
    gmailApi: {
      configured: boolean;
      clientIdPrefix: string | null;
    };
    smtp: {
      host: string;
      port: number;
      user: string | null;
      passConfigured: boolean;
    };
  } {
    const user = process.env.EMAIL_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_SMTP_PASS || process.env.SMTP_PASS;
    const gmailClientId = process.env.GMAIL_CLIENT_ID;

    const providerName = this.provider === 'gmail-api'
      ? 'Gmail API (OAuth2 HTTPS)'
      : this.provider === 'smtp'
        ? 'Nodemailer (SMTP)'
        : 'Mock Mode (NO envía emails)';

    return {
      configured: this.isConfigured,
      provider: providerName,
      from: this.fromEmail,
      gmailApi: {
        configured: !!this.gmailOAuth2Client,
        clientIdPrefix: gmailClientId ? `${gmailClientId.substring(0, 15)}...` : null,
      },
      smtp: {
        host: process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '587', 10),
        user: user ? `${user.substring(0, 5)}...` : null,
        passConfigured: !!pass
      }
    };
  }

}
