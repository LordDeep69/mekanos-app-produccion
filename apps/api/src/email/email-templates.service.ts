import { Injectable, Optional } from '@nestjs/common';
import { ConfiguracionOrganizacionService } from '../configuracion-organizacion/configuracion-organizacion.service';
import {
  OrgBrandingContext,
  buildOrgBranding,
  escapeBrandHtml,
  resolveOrgBranding,
} from '../pdf/org-branding.types';

export interface InformeEmailData {
  branding?: Partial<OrgBrandingContext>;
  ordenNumero: string;
  tipoServicio: string;
  tipoServicioDetallado?: string;
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
  constructor(
    @Optional() private readonly configOrgService?: ConfiguracionOrganizacionService,
  ) {}

  async resolveBranding(override?: Partial<OrgBrandingContext>): Promise<OrgBrandingContext> {
    const [ctx, logoDataUri] = await Promise.all([
      this.configOrgService?.getContext().catch(() => null),
      this.configOrgService?.resolveLogoDataUri?.().catch(() => null),
    ]);
    return {
      ...buildOrgBranding(ctx, logoDataUri),
      ...(override || {}),
    } as OrgBrandingContext;
  }

  /**
   * Versión asíncrona que garantiza carga de branding desde DB/cache si data.branding fue omitido.
   */
  async generateInformeMantenimientoHtml(data: InformeEmailData): Promise<string> {
    const branding = data.branding
      ? resolveOrgBranding(data.branding)
      : await this.resolveBranding();
    return this.generateInformeMantenimientoTemplate({ ...data, branding });
  }

  /**
   * Genera el template HTML corporativo White-Label para email de informe técnico de servicio.
   */
  generateInformeMantenimientoTemplate(data: InformeEmailData): string {
    const brand = resolveOrgBranding(data.branding);
    const { colores } = brand;
    const mensaje = escapeBrandHtml(
      data.mensajePersonalizado ||
        'Adjunto encontrará el informe técnico detallado del servicio realizado a su equipo.',
    );

    const tipoServicioCompleto = escapeBrandHtml(data.tipoServicioDetallado || data.tipoServicio);
    const orgNombre = escapeBrandHtml(brand.nombreComercial);
    const orgEslogan = brand.eslogan ? escapeBrandHtml(brand.eslogan) : '';
    const ubicacionOrg = [brand.ciudadDefecto, brand.paisDefecto]
      .filter(Boolean)
      .map(escapeBrandHtml)
      .join(', ');
    const telOrg = brand.telefonoPrincipal || brand.telefonoSoporte;
    const emailOrg = brand.emailContacto;
    const contactoLinea = [
      telOrg ? `📞 <strong>${escapeBrandHtml(telOrg)}</strong>` : null,
      emailOrg ? `✉️ <strong>${escapeBrandHtml(emailOrg)}</strong>` : null,
      brand.sitioWeb ? `🌐 <strong>${escapeBrandHtml(brand.sitioWeb)}</strong>` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const logoHeaderHtml = brand.logoClaroUrl || brand.logoUrl
      ? `<div style="margin-bottom: 12px;"><img src="${escapeBrandHtml(brand.logoClaroUrl || brand.logoUrl!)}" alt="${orgNombre}" style="max-height: 48px; max-width: 220px; object-fit: contain;" /></div>`
      : '';

    return `
<!DOCTYPE html>
<html lang="${escapeBrandHtml(brand.locale || 'es')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Mantenimiento - ${escapeBrandHtml(data.ordenNumero)} | ${orgNombre}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${colores.background};">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${colores.background};">
    <tr>
      <td align="center" style="padding: 30px 20px;">
        <table role="presentation" style="width: 650px; max-width: 100%; border-collapse: collapse; background-color: ${colores.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.10);">

          <!-- Header Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colores.primary} 0%, ${colores.secondary} 100%); padding: 35px 40px; text-align: center;">
              ${logoHeaderHtml}
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 30px; font-weight: 700; letter-spacing: 1px;">
                ${orgNombre}
              </h1>
              <p style="color: ${colores.accent}; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                INFORME TÉCNICO DE SERVICIO
              </p>
            </td>
          </tr>

          <!-- Tipo de Servicio -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-bottom: 3px solid ${colores.success};">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 50px; vertical-align: top;">
                    <div style="width: 40px; height: 40px; background-color: ${colores.accent}; border-radius: 8px; text-align: center; line-height: 40px;">
                      <span style="font-size: 22px;">📋</span>
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 15px;">
                    <h2 style="color: ${colores.primary}; margin: 0 0 5px 0; font-size: 22px; font-weight: 700;">
                      ${tipoServicioCompleto}
                    </h2>
                    <p style="color: ${colores.mutedText}; margin: 0; font-size: 14px;">
                      Estimado(a) <strong style="color: ${colores.primary};">${escapeBrandHtml(data.clienteNombre)}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 35px 40px;">
              <p style="color: ${colores.text}; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                ${mensaje}
              </p>

              <!-- Resumen del Servicio -->
              <div style="background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%); border: 2px solid ${colores.border}; border-radius: 10px; padding: 25px; margin: 25px 0;">
                <div style="background-color: ${colores.primary}; color: white; padding: 10px 15px; margin: -25px -25px 20px -25px; border-radius: 8px 8px 0 0;">
                  <h3 style="margin: 0; font-size: 17px; font-weight: 600;">
                    📊 Resumen del Servicio
                  </h3>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; width: 45%; border-bottom: 1px solid ${colores.border};">
                      <strong>Orden No.</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 15px; font-weight: 700; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.ordenNumero)}
                    </td>
                  </tr>
                  ${
                    data.equipoNombre
                      ? `
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Equipo</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 14px; font-weight: 600; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.equipoNombre)}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    data.equipoMarca
                      ? `
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Marca / Serie</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.equipoMarca)}${data.equipoSerie ? ` - ${escapeBrandHtml(data.equipoSerie)}` : ''}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    data.equipoUbicacion
                      ? `
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Ubicación</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.equipoUbicacion)}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Tipo de Servicio</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid ${colores.border};">
                      <span style="background-color: ${colores.accent}; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; display: inline-block;">
                        ${escapeBrandHtml(data.tipoServicio)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Fecha de Servicio</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 14px; font-weight: 600; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.fechaServicio)}${data.horaServicio ? ` - ${escapeBrandHtml(data.horaServicio)}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Técnico Responsable</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 14px; font-weight: 600; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.tecnicoNombre)}${data.tecnicoCargo ? ` - ${escapeBrandHtml(data.tecnicoCargo)}` : ''}
                    </td>
                  </tr>
                  ${
                    data.duracionServicio
                      ? `
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      <strong>Duración</strong>
                    </td>
                    <td style="padding: 12px 0; color: ${colores.primary}; font-size: 14px; border-bottom: 1px solid ${colores.border};">
                      ${escapeBrandHtml(data.duracionServicio)}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    data.estadoServicio
                      ? `
                  <tr>
                    <td style="padding: 12px 0; color: ${colores.mutedText}; font-size: 14px;">
                      <strong>Estado</strong>
                    </td>
                    <td style="padding: 12px 0;">
                      <span style="background-color: ${colores.success}; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
                        ✓ ${escapeBrandHtml(data.estadoServicio)}
                      </span>
                    </td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              ${
                data.clienteDireccion || data.clienteCiudad
                  ? `
              <div style="background-color: #f8fafc; border-left: 4px solid ${colores.accent}; padding: 15px 20px; margin: 25px 0; border-radius: 6px;">
                <p style="color: ${colores.mutedText}; margin: 0; font-size: 13px; line-height: 1.6;">
                  <strong style="color: ${colores.primary};">Cliente:</strong> ${escapeBrandHtml(data.clienteNombre)}<br>
                  ${data.clienteDireccion ? `<strong style="color: ${colores.primary};">Dirección:</strong> ${escapeBrandHtml(data.clienteDireccion)}<br>` : ''}
                  ${data.clienteCiudad ? `<strong style="color: ${colores.primary};">Ciudad:</strong> ${escapeBrandHtml(data.clienteCiudad)}` : ''}
                </p>
              </div>
              `
                  : ''
              }

              <!-- Nota sobre PDF Adjunto -->
              <div style="background-color: #f8fafc; border: 2px solid ${colores.accent}; border-radius: 10px; padding: 20px; margin: 30px 0; text-align: center;">
                <div style="font-size: 32px; margin-bottom: 10px;">📎</div>
                <p style="color: ${colores.primary}; margin: 0; font-size: 15px; font-weight: 600; line-height: 1.6;">
                  El informe técnico completo se encuentra adjunto en formato PDF
                </p>
                <p style="color: ${colores.mutedText}; margin: 8px 0 0 0; font-size: 13px;">
                  Incluye actividades realizadas, mediciones, evidencias fotográficas y firmas digitales
                </p>
              </div>

              <hr style="border: none; border-top: 2px solid ${colores.border}; margin: 30px 0;">

              <p style="color: ${colores.text}; line-height: 1.6; margin: 0; font-size: 14px; text-align: center;">
                Gracias por confiar en <strong style="color: ${colores.primary};">${orgNombre}</strong> para el mantenimiento de sus equipos y activos
              </p>
            </td>
          </tr>

          <!-- Footer Corporativo -->
          <tr>
            <td style="background-color: ${colores.secondary}; padding: 30px 40px; text-align: center;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.5px;">
                ${orgNombre}
              </p>
              ${
                orgEslogan || ubicacionOrg
                  ? `<p style="color: ${colores.accent}; font-size: 13px; margin: 0 0 16px 0; line-height: 1.6; font-weight: 500;">
                ${[orgEslogan, ubicacionOrg].filter(Boolean).join('<br>')}
              </p>`
                  : ''
              }
              ${
                contactoLinea
                  ? `<div style="margin: 16px 0; padding: 14px 0; border-top: 1px solid rgba(255,255,255,0.15); border-bottom: 1px solid rgba(255,255,255,0.15);">
                <p style="color: #ffffff; font-size: 13px; margin: 0; line-height: 1.8;">
                  ${contactoLinea}
                </p>
              </div>`
                  : ''
              }
              <p style="color: rgba(255,255,255,0.75); font-size: 11px; margin: 15px 0 0 0;">
                © ${new Date().getFullYear()} ${orgNombre} - Todos los derechos reservados
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
