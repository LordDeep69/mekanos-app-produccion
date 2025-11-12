import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * EmailService
 * Servicio para envío de emails con Resend.com
 */
@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY no configurado - Emails no se enviarán');
    } else {
      this.resend = new Resend(apiKey);
    }

    this.fromEmail = process.env.EMAIL_FROM || 'notificaciones@mekanos.com';
  }

  /**
   * Envía email de orden completada con PDF adjunto
   * @param ordenNumero - Número de la orden
   * @param clienteEmail - Email del cliente
   * @param pdfUrl - URL del PDF en R2
   */
  async sendOrdenCompletadaEmail(
    ordenNumero: string,
    clienteEmail: string,
    pdfUrl: string
  ): Promise<void> {
    if (!this.resend) {
      console.log(`📧 [MOCK] Email enviado a ${clienteEmail} - Orden ${ordenNumero}`);
      console.log(`   PDF: ${pdfUrl}`);
      return;
    }

    const htmlContent = this.buildOrdenCompletadaTemplate(ordenNumero, pdfUrl);

    try {
      const result = await this.resend!.emails.send({
        from: this.fromEmail,
        to: clienteEmail,
        subject: `Orden de Servicio ${ordenNumero} - Completada ✅`,
        html: htmlContent
      });

      console.log(`✅ Email enviado exitosamente - ID: ${result.data?.id}`);

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  /**
   * Construye el HTML del email de orden completada
   */
  private buildOrdenCompletadaTemplate(ordenNumero: string, pdfUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orden Completada</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                MEKANOS S.A.S
              </h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">
                Mantenimiento Industrial Profesional
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">
                ✅ Orden de Servicio Completada
              </h2>

              <p style="color: #475569; line-height: 1.6; margin: 0 0 15px 0;">
                Estimado cliente,
              </p>

              <p style="color: #475569; line-height: 1.6; margin: 0 0 15px 0;">
                Le informamos que la orden de servicio <strong style="color: #2563eb;">${ordenNumero}</strong> 
                ha sido completada exitosamente por nuestro equipo técnico.
              </p>

              <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <p style="color: #475569; margin: 0; font-size: 14px;">
                  <strong>📄 Informe Técnico Disponible</strong><br>
                  Su informe técnico detallado está listo para descarga.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${pdfUrl}" 
                       style="background-color: #2563eb; 
                              color: #ffffff; 
                              padding: 14px 32px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              display: inline-block;
                              font-weight: bold;
                              font-size: 16px;">
                      📥 Descargar Informe PDF
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 25px 0 0 0;">
                💡 <em>El enlace de descarga estará disponible por 7 días. 
                Si necesita una copia adicional, no dude en contactarnos.</em>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #475569; line-height: 1.6; margin: 0;">
                Gracias por confiar en <strong>MEKANOS S.A.S</strong> para el mantenimiento 
                de sus equipos industriales.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
                <strong>MEKANOS S.A.S</strong>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                Mantenimiento y Reparación de Equipos Industriales<br>
                Cartagena de Indias, Colombia<br>
                📞 Tel: 315-7083350 | ✉️ mekanossas2@gmail.com
              </p>

              <div style="margin-top: 15px;">
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
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
   * Envía email de orden programada (futuro)
   */
  async sendOrdenProgramadaEmail(
    ordenNumero: string,
    clienteEmail: string,
    _fechaProgramada: Date
  ): Promise<void> {
    // TODO: Implementar cuando se necesite
    console.log(`📧 [TODO] Email de orden programada: ${ordenNumero} para ${clienteEmail}`);
  }

  /**
   * Envía email de orden asignada a técnico (futuro)
   */
  async sendOrdenAsignadaEmail(
    ordenNumero: string,
    tecnicoEmail: string
  ): Promise<void> {
    // TODO: Implementar cuando se necesite
    console.log(`📧 [TODO] Email de orden asignada: ${ordenNumero} para técnico ${tecnicoEmail}`);
  }

  /**
   * Verifica la configuración del servicio
   */
  isConfigured(): boolean {
    return this.resend !== null;
  }
}
