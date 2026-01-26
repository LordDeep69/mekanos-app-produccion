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
  tipoServicioDetallado?: string; // Ej: "Preventivo Tipo A - Generador"
  clienteNombre: string;
  clienteDireccion?: string;
  clienteCiudad?: string;
  equipoNombre?: string;
  equipoMarca?: string;
  equipoSerie?: string;
  equipoUbicacion?: string;
  fechaServicio: string;
  horaServicio?: string;
  tecnicoNombre: string;
  tecnicoCargo?: string;
  duracionServicio?: string;
  estadoServicio?: string;
  mensajePersonalizado?: string;
}

@Injectable()
export class EmailTemplatesService {
  /**
   * Genera el template HTML empresarial superior para email de informe de mantenimiento
   */
  generateInformeMantenimientoTemplate(data: InformeEmailData): string {
    const mensaje = data.mensajePersonalizado ||
      `Adjunto encontrará el informe técnico detallado del servicio realizado a su equipo.`;

    const tipoServicioCompleto = data.tipoServicioDetallado || data.tipoServicio;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Mantenimiento - ${data.ordenNumero}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 30px 20px;">
        <table role="presentation" style="width: 650px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(36, 70, 115, 0.12);">
          
          <!-- Header Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #244673 0%, #3290A6 100%); padding: 35px 40px; text-align: center; position: relative;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px; font-weight: 700; letter-spacing: 1px;">
                MEKANOS S.A.S
              </h1>
              <p style="color: #9EC23D; margin: 0; font-size: 15px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                INFORME TÉCNICO DE SERVICIO
              </p>
            </td>
          </tr>

          <!-- Tipo de Mantenimiento Destacado -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-bottom: 3px solid #56A672;">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 50px; vertical-align: top;">
                    <div style="width: 40px; height: 40px; background-color: #9EC23D; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 24px;">📋</span>
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 15px;">
                    <h2 style="color: #244673; margin: 0 0 5px 0; font-size: 22px; font-weight: 700;">
                      ${tipoServicioCompleto}
                    </h2>
                    <p style="color: #64748b; margin: 0; font-size: 14px;">
                      Estimado(a) <strong style="color: #244673;">${data.clienteNombre}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 35px 40px;">
              <p style="color: #475569; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                ${mensaje}
              </p>

              <!-- Resumen del Servicio - Diseño Mejorado -->
              <div style="background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%); border: 2px solid #e2e8f0; border-radius: 10px; padding: 25px; margin: 25px 0;">
                <div style="background-color: #244673; color: white; padding: 10px 15px; margin: -25px -25px 20px -25px; border-radius: 8px 8px 0 0;">
                  <h3 style="margin: 0; font-size: 17px; font-weight: 600; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">📊</span> Resumen del Servicio
                  </h3>
                </div>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; width: 45%; border-bottom: 1px solid #e2e8f0;">
                      <strong>Orden No.</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                      ${data.ordenNumero}
                    </td>
                  </tr>
                  ${data.equipoNombre ? `
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Equipo</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                      ${data.equipoNombre}
                    </td>
                  </tr>
                  ` : ''}
                  ${data.equipoMarca ? `
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Marca / Serie</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      ${data.equipoMarca}${data.equipoSerie ? ` - ${data.equipoSerie}` : ''}
                    </td>
                  </tr>
                  ` : ''}
                  ${data.equipoUbicacion ? `
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Ubicación</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      ${data.equipoUbicacion}
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Tipo de Servicio</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="background-color: #9EC23D; color: #244673; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; display: inline-block;">
                        ${data.tipoServicio}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Fecha de Servicio</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                      ${data.fechaServicio}${data.horaServicio ? ` - ${data.horaServicio}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Técnico Responsable</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                      ${data.tecnicoNombre}${data.tecnicoCargo ? ` - ${data.tecnicoCargo}` : ''}
                    </td>
                  </tr>
                  ${data.duracionServicio ? `
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      <strong>Duración</strong>
                    </td>
                    <td style="padding: 12px 0; color: #244673; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                      ${data.duracionServicio}
                    </td>
                  </tr>
                  ` : ''}
                  ${data.estadoServicio ? `
                  <tr>
                    <td style="padding: 12px 0; color: #64748b; font-size: 14px;">
                      <strong>Estado</strong>
                    </td>
                    <td style="padding: 12px 0;">
                      <span style="background-color: #56A672; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
                        ✓ ${data.estadoServicio}
                      </span>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              ${data.clienteDireccion || data.clienteCiudad ? `
              <!-- Información del Cliente -->
              <div style="background-color: #f8fafc; border-left: 4px solid #3290A6; padding: 15px 20px; margin: 25px 0; border-radius: 6px;">
                <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.6;">
                  <strong style="color: #244673;">Cliente:</strong> ${data.clienteNombre}<br>
                  ${data.clienteDireccion ? `<strong style="color: #244673;">Dirección:</strong> ${data.clienteDireccion}<br>` : ''}
                  ${data.clienteCiudad ? `<strong style="color: #244673;">Ciudad:</strong> ${data.clienteCiudad}` : ''}
                </p>
              </div>
              ` : ''}

              <!-- Nota sobre PDF Adjunto -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3290A6; border-radius: 10px; padding: 20px; margin: 30px 0; text-align: center;">
                <div style="font-size: 36px; margin-bottom: 10px;">📎</div>
                <p style="color: #244673; margin: 0; font-size: 15px; font-weight: 600; line-height: 1.6;">
                  El informe técnico completo se encuentra adjunto en formato PDF
                </p>
                <p style="color: #64748b; margin: 8px 0 0 0; font-size: 13px;">
                  Incluye actividades realizadas, mediciones, evidencias fotográficas y firmas digitales
                </p>
              </div>

              <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 14px; text-align: center;">
                Gracias por confiar en <strong style="color: #244673;">MEKANOS S.A.S</strong> para el mantenimiento de sus equipos industriales
              </p>
            </td>
          </tr>

          <!-- Footer Corporativo -->
          <tr>
            <td style="background-color: #244673; padding: 30px 40px; text-align: center;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0; font-weight: 700; letter-spacing: 0.5px;">
                MEKANOS S.A.S
              </p>
              <p style="color: #9EC23D; font-size: 13px; margin: 0 0 18px 0; line-height: 1.6; font-weight: 500;">
                Mantenimiento y Reparación de Equipos Industriales<br>
                Cartagena de Indias, Colombia
              </p>
              <div style="margin: 18px 0; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.15); border-bottom: 1px solid rgba(255,255,255,0.15);">
                <p style="color: #ffffff; font-size: 13px; margin: 0; line-height: 1.8;">
                  📞 <strong>315-7083350</strong> | ✉️ <strong>mekanossas4@gmail.com</strong>
                </p>
              </div>
              <p style="color: #9EC23D; font-size: 11px; margin: 15px 0 0 0; opacity: 0.9;">
                © ${new Date().getFullYear()} MEKANOS S.A.S - Todos los derechos reservados
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
}
