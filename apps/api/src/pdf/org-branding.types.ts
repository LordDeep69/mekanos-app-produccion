/**
 * Contrato White-Label de Identidad Visual, Fiscal y Regional para Documentos PDF y Emails.
 * Reemplaza por completo las constantes corporativas hardcoded (colores, logos en disco,
 * NIT, ciudad, teléfonos, correos y locales fijos).
 */

import type { ConfiguracionOrganizacionContext } from '../configuracion-organizacion/configuracion-organizacion.service';

export interface OrgBrandingPalette {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  highlight: string;
  warning: string;
  danger: string;
  white: string;
  text: string;
  mutedText: string;
  border: string;
}

export interface OrgBrandingContext {
  nombreComercial: string;
  razonSocial: string;
  tipoIdFiscal: string;
  numeroIdFiscal: string | null;
  eslogan: string | null;
  sitioWeb: string | null;
  emailContacto: string | null;
  telefonoPrincipal: string | null;
  telefonoSoporte: string | null;
  direccionLinea1: string | null;
  ciudadDefecto: string;
  departamentoDefecto: string | null;
  paisDefecto: string;
  codigoPaisIso: string;
  logoUrl: string | null;
  logoClaroUrl: string | null;
  isotipoUrl: string | null;
  zonaHoraria: string;
  locale: string;
  codigoMoneda: string;
  simboloMoneda: string;
  decimalesMoneda: number;
  etiquetaImpuesto: string;
  tasaImpuestoDefecto: number;
  textoPiePdf: string | null;
  textoDisclaimerRepuestosCliente: string | null;
  garantiaMesesDefecto: number;
  validezCotizacionDiasDefecto: number;
  colores: OrgBrandingPalette;
}

export const DEFAULT_BRAND_PALETTE: OrgBrandingPalette = {
  background: '#F4F6F9',
  primary: '#1E40AF',
  secondary: '#0F172A',
  accent: '#0EA5E9',
  success: '#16A34A',
  highlight: '#0EA5E9',
  warning: '#D97706',
  danger: '#DC2626',
  white: '#FFFFFF',
  text: '#1E293B',
  mutedText: '#64748B',
  border: '#CBD5E1',
};

export const DEFAULT_ORG_BRANDING: OrgBrandingContext = {
  nombreComercial: 'Mi Organización',
  razonSocial: 'Mi Organización S.A.',
  tipoIdFiscal: 'NIT',
  numeroIdFiscal: null,
  eslogan: null,
  sitioWeb: null,
  emailContacto: null,
  telefonoPrincipal: null,
  telefonoSoporte: null,
  direccionLinea1: null,
  ciudadDefecto: '',
  departamentoDefecto: null,
  paisDefecto: '',
  codigoPaisIso: 'CO',
  logoUrl: null,
  logoClaroUrl: null,
  isotipoUrl: null,
  zonaHoraria: 'America/Bogota',
  locale: 'es-CO',
  codigoMoneda: 'USD',
  simboloMoneda: '$',
  decimalesMoneda: 2,
  etiquetaImpuesto: 'IVA',
  tasaImpuestoDefecto: 19,
  textoPiePdf: null,
  textoDisclaimerRepuestosCliente: null,
  garantiaMesesDefecto: 3,
  validezCotizacionDiasDefecto: 30,
  colores: { ...DEFAULT_BRAND_PALETTE },
};

export function buildOrgBranding(
  org?: Partial<ConfiguracionOrganizacionContext> | null,
  resolvedLogoUri?: string | null,
): OrgBrandingContext {
  if (!org) {
    return {
      ...DEFAULT_ORG_BRANDING,
      colores: { ...DEFAULT_BRAND_PALETTE },
    };
  }

  return {
    nombreComercial: org.nombre_comercial?.trim() || DEFAULT_ORG_BRANDING.nombreComercial,
    razonSocial:
      org.razon_social?.trim() || org.nombre_comercial?.trim() || DEFAULT_ORG_BRANDING.razonSocial,
    tipoIdFiscal: org.tipo_id_fiscal?.trim() || DEFAULT_ORG_BRANDING.tipoIdFiscal,
    numeroIdFiscal: org.numero_id_fiscal?.trim() || null,
    eslogan: org.eslogan?.trim() || null,
    sitioWeb: org.sitio_web?.trim() || null,
    emailContacto: org.email_contacto?.trim() || null,
    telefonoPrincipal: org.telefono_principal?.trim() || null,
    telefonoSoporte: org.telefono_soporte?.trim() || null,
    direccionLinea1: org.direccion_linea1?.trim() || null,
    ciudadDefecto: org.ciudad_defecto?.trim() || '',
    departamentoDefecto: org.departamento_defecto?.trim() || null,
    paisDefecto: org.pais_defecto?.trim() || '',
    codigoPaisIso: org.codigo_pais_iso?.trim() || 'CO',
    logoUrl:
      resolvedLogoUri !== undefined ? resolvedLogoUri : org.logo_principal_url?.trim() || null,
    logoClaroUrl: org.logo_claro_url?.trim() || null,
    isotipoUrl: org.isotipo_url?.trim() || null,
    zonaHoraria: org.zona_horaria?.trim() || DEFAULT_ORG_BRANDING.zonaHoraria,
    locale: org.locale?.trim() || DEFAULT_ORG_BRANDING.locale,
    codigoMoneda: org.codigo_moneda?.trim() || DEFAULT_ORG_BRANDING.codigoMoneda,
    simboloMoneda: org.simbolo_moneda?.trim() || DEFAULT_ORG_BRANDING.simboloMoneda,
    decimalesMoneda:
      typeof org.decimales_moneda === 'number' && Number.isFinite(org.decimales_moneda)
        ? org.decimales_moneda
        : DEFAULT_ORG_BRANDING.decimalesMoneda,
    etiquetaImpuesto: org.etiqueta_impuesto?.trim() || DEFAULT_ORG_BRANDING.etiquetaImpuesto,
    tasaImpuestoDefecto:
      typeof org.tasa_impuesto_defecto === 'number' && Number.isFinite(org.tasa_impuesto_defecto)
        ? org.tasa_impuesto_defecto
        : DEFAULT_ORG_BRANDING.tasaImpuestoDefecto,
    textoPiePdf: org.texto_pie_pdf?.trim() || null,
    textoDisclaimerRepuestosCliente: org.texto_disclaimer_repuestos_cliente?.trim() || null,
    garantiaMesesDefecto:
      typeof org.garantia_meses_defecto === 'number' ? org.garantia_meses_defecto : 3,
    validezCotizacionDiasDefecto:
      typeof org.validez_cotizacion_dias_defecto === 'number'
        ? org.validez_cotizacion_dias_defecto
        : 30,
    colores: {
      ...DEFAULT_BRAND_PALETTE,
      primary: org.color_primario || DEFAULT_BRAND_PALETTE.primary,
      secondary: org.color_secundario || DEFAULT_BRAND_PALETTE.secondary,
      accent: org.color_acento || DEFAULT_BRAND_PALETTE.accent,
      highlight: org.color_acento || DEFAULT_BRAND_PALETTE.highlight,
      success: org.color_exito || DEFAULT_BRAND_PALETTE.success,
      warning: org.color_alerta || DEFAULT_BRAND_PALETTE.warning,
      danger: org.color_peligro || DEFAULT_BRAND_PALETTE.danger,
    },
  };
}

export function resolveOrgBranding(
  branding?: Partial<OrgBrandingContext> | null,
): OrgBrandingContext {
  if (!branding) {
    return {
      ...DEFAULT_ORG_BRANDING,
      colores: { ...DEFAULT_BRAND_PALETTE },
    };
  }
  return {
    ...DEFAULT_ORG_BRANDING,
    ...branding,
    colores: {
      ...DEFAULT_BRAND_PALETTE,
      ...(branding.colores || {}),
    },
  };
}

export function escapeBrandHtml(raw: string | null | undefined): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sanitiza HTML enriquecido (p.ej. Tiptap en observaciones_cierre) con enfoque Zero-Trust:
 * 1. Escapa TODOS los caracteres HTML peligrosos primero (neutralizando <script>, <img>,
 *    event handlers on*, atributos arbitrarios y URLs javascript:).
 * 2. Restaura únicamente una lista blanca estricta de etiquetas de formato SIN atributos
 *    (<p>, <br>, <strong>, <b>, <em>, <i>, <u>, <ul>, <ol>, <li>, <hr>, <h3>, <h4>).
 * 3. Elimina etiquetas vacías residuales (<p></p>, <h3></h3>, <h4></h4>).
 */
export function sanitizeRichTextHtml(raw: string | null | undefined): string {
  const escaped = escapeBrandHtml(raw);
  return escaped
    .replace(
      /&lt;(\/?)(p|strong|b|em|i|u|ul|ol|li|h3|h4)&gt;/gi,
      (_, slash: string, tag: string) => `<${slash}${tag.toLowerCase()}>`,
    )
    .replace(/&lt;(br|hr)\s*\/?&gt;/gi, (_, tag: string) => `<${tag.toLowerCase()} />`)
    .replace(/<(h3|h4|p)>\s*<\/\1>/gi, '')
    .trim();
}

/**
 * Renderiza el logo oficial de la organización o, si no existe URL/DataURI configurada,
 * un monograma vectorial limpio generado con el nombre comercial y paleta de la instancia.
 */
export function renderOrgLogoHtml(
  branding?: Partial<OrgBrandingContext> | null,
  heightPx = 48,
  variant: 'light' | 'dark' = 'light',
): string {
  const brand = resolveOrgBranding(branding);
  const src = variant === 'dark' ? brand.logoClaroUrl || brand.logoUrl : brand.logoUrl;

  if (src) {
    return `<img src="${escapeBrandHtml(src)}" alt="${escapeBrandHtml(brand.nombreComercial)}" style="height: ${heightPx}px; width: auto; max-width: 190px; object-fit: contain; display: block;" />`;
  }

  const words = brand.nombreComercial.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : brand.nombreComercial.slice(0, 2).toUpperCase();

  const textColor = variant === 'dark' ? '#FFFFFF' : brand.colores.primary;
  const subColor = variant === 'dark' ? 'rgba(255,255,255,0.85)' : brand.colores.mutedText;
  const badgeBg = variant === 'dark' ? 'rgba(255,255,255,0.18)' : brand.colores.primary;

  return `
    <div style="display: inline-flex; align-items: center; gap: 10px;">
      <div style="width: ${heightPx}px; height: ${heightPx}px; border-radius: 8px; background: ${badgeBg}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${Math.round(heightPx * 0.42)}px; letter-spacing: 0.5px; flex-shrink: 0;">
        ${escapeBrandHtml(initials)}
      </div>
      <div style="line-height: 1.15; text-align: left;">
        <div style="font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: 0.3px;">
          ${escapeBrandHtml(brand.nombreComercial)}
        </div>
        ${
          brand.eslogan
            ? `<div style="font-size: 8px; font-weight: 600; color: ${subColor}; margin-top: 2px;">${escapeBrandHtml(brand.eslogan)}</div>`
            : ''
        }
      </div>
    </div>
  `.trim();
}

/**
 * Pie corporativo unificado 100% gobernado por ConfiguracionOrganizacion.
 */
export function generarFooterCorporativoHtml(
  branding?: Partial<OrgBrandingContext> | null,
  extraSubline?: string,
): string {
  const brand = resolveOrgBranding(branding);
  const partesFiscales = [
    `<strong>${escapeBrandHtml(brand.razonSocial || brand.nombreComercial)}</strong>`,
    brand.numeroIdFiscal
      ? `${escapeBrandHtml(brand.tipoIdFiscal || 'NIT')}: ${escapeBrandHtml(brand.numeroIdFiscal)}`
      : null,
    brand.direccionLinea1 ? escapeBrandHtml(brand.direccionLinea1) : null,
    [brand.ciudadDefecto, brand.paisDefecto].filter(Boolean).map(escapeBrandHtml).join(', ') ||
      null,
  ].filter(Boolean);

  const partesContacto = [
    brand.telefonoPrincipal ? `Tel: ${escapeBrandHtml(brand.telefonoPrincipal)}` : null,
    brand.telefonoSoporte ? `Soporte: ${escapeBrandHtml(brand.telefonoSoporte)}` : null,
    brand.emailContacto ? escapeBrandHtml(brand.emailContacto) : null,
    brand.sitioWeb ? escapeBrandHtml(brand.sitioWeb) : null,
  ].filter(Boolean);

  const piePersonalizado = brand.textoPiePdf || extraSubline || null;

  return `
    <div class="footer" style="margin-top: 16px; padding-top: 10px; border-top: 1px solid ${brand.colores.border}; text-align: center; font-size: 8px; color: ${brand.colores.mutedText}; line-height: 1.45;">
      <div>${partesFiscales.join(' · ')}</div>
      ${partesContacto.length > 0 ? `<div style="margin-top: 2px;">${partesContacto.join(' · ')}</div>` : ''}
      ${piePersonalizado ? `<div style="margin-top: 3px; font-style: italic;">${escapeBrandHtml(piePersonalizado)}</div>` : ''}
    </div>
  `.trim();
}

export function formatNumberOrg(
  value: number,
  branding?: Partial<OrgBrandingContext> | null,
  fractionDigits?: number,
): string {
  const brand = resolveOrgBranding(branding);
  const num = Number(value);
  const safeNum = Number.isFinite(num) ? num : 0;
  const digits = typeof fractionDigits === 'number' ? fractionDigits : brand.decimalesMoneda;
  try {
    return safeNum.toLocaleString(brand.locale || 'es-CO', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  } catch {
    return safeNum.toFixed(digits);
  }
}

export function formatCurrencyOrg(
  value: number,
  branding?: Partial<OrgBrandingContext> | null,
): string {
  const brand = resolveOrgBranding(branding);
  const num = Number(value);
  const safeNum = Number.isFinite(num) ? num : 0;
  try {
    return new Intl.NumberFormat(brand.locale || 'es-CO', {
      style: 'currency',
      currency: brand.codigoMoneda || 'USD',
      minimumFractionDigits: brand.decimalesMoneda,
      maximumFractionDigits: brand.decimalesMoneda,
    }).format(safeNum);
  } catch {
    return `${brand.simboloMoneda} ${formatNumberOrg(safeNum, brand)}`;
  }
}

export function formatDateOrg(
  date: Date | string | null | undefined,
  branding?: Partial<OrgBrandingContext> | null,
): string {
  if (!date) return 'N/A';
  const parsed = date instanceof Date ? date : new Date(date);
  if (isNaN(parsed.getTime())) return 'N/A';
  const brand = resolveOrgBranding(branding);
  try {
    return parsed.toLocaleDateString(brand.locale || 'es-CO', {
      timeZone: brand.zonaHoraria || undefined,
    });
  } catch {
    return parsed.toLocaleDateString('es-CO');
  }
}

/**
 * Formatea fechas calendario puras (`@db.Date` / `YYYY-MM-DD`) sin desplazamiento por zona horaria.
 * Evita el desfase de -1 día al formatear `2026-11-22T00:00:00.000Z` en zonas UTC-5.
 */
export function formatCalendarDateOrg(
  date: Date | string | null | undefined,
  branding?: Partial<OrgBrandingContext> | null,
): string {
  if (!date) return 'N/A';

  let year: number;
  let month: number;
  let day: number;

  if (typeof date === 'string') {
    const match = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return 'N/A';
      year = parsed.getUTCFullYear();
      month = parsed.getUTCMonth() + 1;
      day = parsed.getUTCDate();
    }
  } else {
    if (isNaN(date.getTime())) return 'N/A';
    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  }

  const neutralUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const brand = resolveOrgBranding(branding);
  try {
    return new Intl.DateTimeFormat(brand.locale || 'es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(neutralUtc);
  } catch {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
}
