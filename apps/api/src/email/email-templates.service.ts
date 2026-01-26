import { Injectable } from '@nestjs/common';

/**
 * ============================================================================
 * EMAIL TEMPLATES SERVICE - MEKANOS S.A.S
 * ============================================================================
 * Servicio para generar templates HTML profesionales para emails.
 * 
 * COLORES CORPORATIVOS MEKANOS:
 * - #F2F2F2 (Blanco)
 * - #244673 (Azul Oscuro)
 * - #3290A6 (Azul Claro)
 * - #56A672 (Verde)
 * - #9EC23D (Verde Claro)
 * ============================================================================
 */

export interface InformeEmailData {
    ordenNumero: string;
    tipoServicio: string;
    clienteNombre: string;
    fechaServicio: string;
    tecnicoNombre: string;
    equipoNombre?: string;
    mensajePersonalizado?: string;
}

@Injectable()
export class EmailTemplatesService {
    /**
     * Genera el template HTML para email de informe de mantenimiento
     */
    generateInformeMantenimientoTemplate(data: InformeEmailData): string {
        const mensaje = data.mensajePersonalizado ||
            `Adjunto encontrará el informe técnico detallado del servicio realizado a su equipo.`;

        return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Mantenimiento</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #244673 0%, #3290A6 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                MEKANOS SAS
              </h1>
              <p style="color: #9EC23D; margin: 10px 0 0 0; font-size: 14px; font-weight: 600;">
                INFORME TÉCNICO DE SERVICIO
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background-color: #fff; border-left: 4px solid #56A672; padding: 15px; margin: 0 0 25px 0;">
                <h2 style="color: #244673; margin: 0 0 5px 0; font-size: 20px;">
                  📋 ${data.tipoServicio}
                </h2>
                <p style="color: #64748b; margin: 0; font-size: 14px;">
                  Estimado(a) <strong>${data.clienteNombre}</strong>
                </p>
              </div>

              <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                ${mensaje}
              </p>

              <!-- Resumen del Servicio -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #244673; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #3290A6; padding-bottom: 8px;">
                  📊 Resumen del Servicio
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 40%;">
                      <strong>Órdenes No.</strong>
                    </td>
                    <td style="padding: 8px 0; color: #244673; font-size: 14px; font-weight: 600;">
                      ${data.ordenNumero}
                    </td>
                  </tr>
                  ${data.equipoNombre ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                      <strong>Equipo</strong>
                    </td>
                    <td style="padding: 8px 0; color: #244673; font-size: 14px;">
                      ${data.equipoNombre}
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                      <strong>Tipo de Servicio</strong>
                    </td>
                    <td style="padding: 8px 0; color: #244673; font-size: 14px;">
                      <span style="background-color: #9EC23D; color: #244673; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                        ${data.tipoServicio}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                      <strong>Fecha de Servicio</strong>
                    </td>
                    <td style="padding: 8px 0; color: #244673; font-size: 14px;">
                      ${data.fechaServicio}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                      <strong>Técnico Responsable</strong>
                    </td>
                    <td style="padding: 8px 0; color: #244673; font-size: 14px;">
                      ${data.tecnicoNombre}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Nota sobre PDF -->
              <div style="background-color: #eff6ff; border: 1px solid #3290A6; border-radius: 8px; padding: 15px; margin: 25px 0;">
                <p style="color: #244673; margin: 0; font-size: 13px; line-height: 1.6;">
                  📎 <strong>El informe técnico completo se encuentra adjunto en formato PDF.</strong>
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #475569; line-height: 1.6; margin: 0;">
                Gracias por confiar en <strong style="color: #244673;">MEKANOS S.A.S</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #244673; padding: 25px 30px; text-align: center;">
              <p style="color: #ffffff; font-size: 16px; margin: 0 0 8px 0; font-weight: bold;">
                MEKANOS SAS
              </p>
              <p style="color: #9EC23D; font-size: 12px; margin: 0 0 15px 0; line-height: 1.5;">
                Cartagena de Indias, Colombia<br>
                📞 315-7083350 | ✉️ mekanossas4@gmail.com
              </p>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="color: #9EC23D; font-size: 11px; margin: 0;">
                  © ${new Date().getFullYear()} MEKANOS S.A.S - Todos los derechos reservados
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
}
