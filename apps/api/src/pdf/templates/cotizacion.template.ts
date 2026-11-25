/**
 * Template White-Label EAM-CPQ - Cotización Comercial Editorial Ejecutivo Minimalista
 *
 * Filosofía visual (Regla del 5% de Color Acento):
 * - Inspirado en propuestas corporativas modernas (Stripe / Ingeniería Prémium)
 * - Barra superior fina de 4px + acentos verticales de 3px + fila TOTAL con color primario White-Label
 * - Tipografía clara, números tabulares, cabeceras neutras (#F1F5F9), sin efecto cebra ni parches estridentes
 * - Márgenes uniformes (14mm laterales, 14mm sup., 18mm inf.) con padding completo en cada bloque
 * - Bloque de cierre balanceado en 2 columnas (55% Condiciones & Términos / 45% Resumen Económico)
 * - 100% XSS-safe (todo texto de usuario escapado con escapeBrandHtml)
 * - Marca de agua antifuga diagonal en cada página cuando gobernanza CPQ está activa y el estado no está autorizado
 */

import {
  buildBrandCssVars,
  escapeBrandHtml,
  formatCurrencyOrg,
  OrgBrandingContext,
  renderOrgLogoHtml,
  resolveOrgBranding,
} from './mekanos-base.template';

export interface EquipoCotizacionPDF {
  codigoEquipo?: string;
  nombreEquipo?: string;
  tipoEquipo: string;
  marca: string;
  modelo?: string;
  serie?: string;
  ubicacion?: string;
  notasAlcance?: string;
}

export interface ItemServicioPDF {
  orden: number;
  descripcion: string;
  equipoEtiqueta?: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
  ivaAplicable?: boolean;
  observaciones?: string;
}

export interface ItemComponentePDF {
  orden: number;
  descripcion: string;
  referencia?: string;
  marca?: string;
  equipoEtiqueta?: string;
  garantiaMeses?: number;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
  ivaAplicable?: boolean;
}

export interface ItemOtroPDF {
  orden: number;
  categoriaRubro: string;
  descripcion: string;
  detalleCalculo?: string;
  equipoEtiqueta?: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
  ivaAplicable?: boolean;
}

export interface ItemOpcionalPDF {
  tipo: 'SERVICIO' | 'REPUESTO' | 'OTRO';
  descripcion: string;
  referencia?: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface DatosCotizacionPDF {
  branding?: OrgBrandingContext;
  // Identificación
  numeroCotizacion: string;
  tipoCotizacion?: string;
  moneda?: string;
  fechaCotizacion: string;
  fechaVencimiento: string;
  diasValidez: number;
  version: number;
  ordenCompraCliente?: string;

  // Gobernanza y estado documental
  estadoCodigo?: string;
  mostrarMarcaAguaBorrador?: boolean;
  textoMarcaAgua?: string;

  // Presentación comercial PDF (false = Suma Alzada compacta 1 pág. | true = Detallado Licitación)
  mostrarDesglosePrecios?: boolean;

  // Destinatario comercial ("Atención a / Representante") editable por cotización
  atencionANombre?: string;
  atencionACargo?: string;

  // Cliente
  cliente: {
    nombre: string;
    nit?: string;
    direccion: string;
    telefono?: string;
    email?: string;
    contacto?: string;
  };

  // Equipo único (legacy compatible) y lista multi-equipo (N:M)
  equipo?: EquipoCotizacionPDF;
  equipos?: EquipoCotizacionPDF[];

  // Descripción general
  asunto: string;
  descripcionGeneral?: string;
  alcanceTrabajo?: string;
  exclusiones?: string;

  // Ítems principales (visibles al cliente y no opcionales)
  itemsServicios: ItemServicioPDF[];
  itemsComponentes: ItemComponentePDF[];
  itemsOtros?: ItemOtroPDF[];

  // Ítems opcionales (no incluidos en total principal)
  itemsOpcionales?: ItemOpcionalPDF[];

  // Totales
  totales: {
    subtotalServicios: number;
    subtotalComponentes: number;
    subtotalOtros?: number;
    subtotalGeneral: number;
    subtotalOpcionales?: number;
    descuentoPorcentaje: number;
    descuentoValor: number;
    subtotalConDescuento: number;
    usaAiu?: boolean;
    aiuAdminPorcentaje?: number;
    aiuAdminValor?: number;
    aiuImprevistosPorcentaje?: number;
    aiuImprevistosValor?: number;
    aiuUtilidadPorcentaje?: number;
    aiuUtilidadValor?: number;
    aiuValorTotal?: number;
    ivaSobreUtilidadAiu?: boolean;
    ivaPorcentaje: number;
    ivaValor: number;
    totalCotizacion: number;
  };

  // Condiciones comerciales
  formaPago: string;
  tiempoEstimadoDias?: number;
  mesesGarantia: number;
  observacionesGarantia?: string;
  terminosCondiciones?: string;

  // Elaboración y Firmas Digitales opcionales
  elaboradoPor: string;
  cargoElaborador?: string;
  firmaAsesorDataUri?: string;
  firmaClienteDataUri?: string;
}

const esc = (v?: string | number | null): string => escapeBrandHtml(v == null ? '' : String(v));

const escMultiline = (v?: string | null): string =>
  escapeBrandHtml(v || '').replace(/\r?\n/g, '<br/>');

const formatDiasHabiles = (n: number): string => (n === 1 ? '1 día hábil' : `${n} días hábiles`);

const formatMeses = (n: number): string => (n === 1 ? '1 mes' : `${n} meses`);

const formatDiasCalendario = (n: number): string =>
  n === 1 ? '1 día calendario' : `${n} días calendario`;

const RUBRO_LABELS: Record<string, string> = {
  TRANSPORTE: 'Transporte / Movilización',
  VIATICOS: 'Viáticos / Estadía',
  POLIZA: 'Póliza / Garantía',
  ALQUILER: 'Alquiler / Izaje',
  DISPOSICION_AMBIENTAL: 'Disposición Ambiental',
  SUBCONTRATO: 'Subcontrato Especializado',
  OTRO: 'Rubro Adicional',
};

const TIPO_COT_LABELS: Record<string, string> = {
  SERVICIO_TECNICO: 'Servicio Técnico',
  PREVENTIVO: 'Mantenimiento Preventivo',
  CORRECTIVO: 'Mantenimiento Correctivo',
  SUMINISTRO: 'Suministro de Repuestos',
  SUMINISTRO_INSTALACION: 'Suministro e Instalación',
  PROYECTO: 'Proyecto de Ingeniería',
  CONTRATO: 'Propuesta Contractual',
  DIAGNOSTICO: 'Diagnóstico Técnico',
};

const formatTipoLabel = (raw?: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (TIPO_COT_LABELS[trimmed]) return TIPO_COT_LABELS[trimmed];
  if (/^[A-Z0-9_]+$/.test(trimmed)) {
    return trimmed
      .split('_')
      .filter(Boolean)
      .map((w) => w[0] + w.slice(1).toLowerCase())
      .join(' ');
  }
  return trimmed;
};

export const generarCotizacionHTML = (datos: DatosCotizacionPDF): string => {
  const baseBrand = resolveOrgBranding(datos.branding);
  const brand: OrgBrandingContext = datos.moneda
    ? { ...baseBrand, codigoMoneda: datos.moneda }
    : baseBrand;

  const equiposList: EquipoCotizacionPDF[] =
    datos.equipos && datos.equipos.length > 0 ? datos.equipos : datos.equipo ? [datos.equipo] : [];

  const itemsOtros = datos.itemsOtros || [];
  const itemsOpcionales = datos.itemsOpcionales || [];
  const mostrarDesglose = Boolean(datos.mostrarDesglosePrecios);

  const watermarkHtml = datos.mostrarMarcaAguaBorrador
    ? `<div class="gov-watermark-layer" aria-hidden="true"><span class="gov-watermark-text">${esc(datos.textoMarcaAgua || 'BORRADOR — PENDIENTE DE APROBACIÓN')}</span></div>`
    : '';

  const firmasHtml = generarFirmasSobrias(datos, brand);
  let bodyContentHtml = '';

  if (!mostrarDesglose) {
    // ═══════════════════════════════════════════════════════════════════════
    // LAYOUT A (POR DEFECTO): MODO EJECUTIVO "SUMA ALZADA" (1 PÁGINA)
    // ═══════════════════════════════════════════════════════════════════════
    const condicionesHtml = generarCondicionesAnchoCompleto(datos);
    const terminosHtml = generarTerminosAnchoCompleto(datos, brand, itemsOtros.length > 0);
    const cierreAntihuerfanosHtml =
      itemsOpcionales.length > 0
        ? `
      ${condicionesHtml}
      ${terminosHtml}
      <div class="closing-keep-together">
        ${generarSeccionOpcionalesSumaAlzada(itemsOpcionales, brand)}
        ${firmasHtml}
      </div>`
        : `
      ${condicionesHtml}
      <div class="closing-keep-together">
        ${terminosHtml}
        ${firmasHtml}
      </div>`;

    bodyContentHtml = `
      ${generarTablaAlcanceSumaAlzada(datos, itemsOtros)}
      ${generarBandaTotalesSumaAlzada(datos, brand)}
      ${cierreAntihuerfanosHtml}
    `;
  } else {
    // ═══════════════════════════════════════════════════════════════════════
    // LAYOUT B: MODO DETALLADO LICITACIÓN (DESGLOSE POR RUBRO + RESUMEN)
    // ═══════════════════════════════════════════════════════════════════════
    let secIdx = 0;
    const serviciosHtml =
      datos.itemsServicios.length > 0
        ? generarTablaServicios(datos.itemsServicios, brand, ++secIdx)
        : '';
    const componentesHtml =
      datos.itemsComponentes.length > 0
        ? generarTablaComponentes(datos.itemsComponentes, brand, ++secIdx)
        : '';
    const otrosHtml = itemsOtros.length > 0 ? generarTablaOtros(itemsOtros, brand, ++secIdx) : '';
    const cierreBalanceadoHtml = generarBloqueCierreBalanceado(datos, brand, itemsOtros.length > 0);

    const cierreAntihuerfanosHtml =
      itemsOpcionales.length > 0
        ? `
      ${cierreBalanceadoHtml}
      <div class="closing-keep-together">
        ${generarSeccionOpcionales(itemsOpcionales, brand)}
        ${firmasHtml}
      </div>`
        : `
      <div class="closing-keep-together">
        ${cierreBalanceadoHtml}
        ${firmasHtml}
      </div>`;

    bodyContentHtml = `
      ${serviciosHtml}
      ${componentesHtml}
      ${otrosHtml}
      ${cierreAntihuerfanosHtml}
    `;
  }

  return `<!DOCTYPE html>
<html lang="${esc(brand.locale || 'es')}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${esc(datos.numeroCotizacion)}</title>
  <style>
    ${buildBrandCssVars(brand)}
    ${editorialStyles}
  </style>
</head>
<body>
  ${watermarkHtml}
  <div class="doc-shell${mostrarDesglose ? '' : ' mode-compact'}">
    <div class="top-accent-bar"></div>
    ${generarHeaderEditorial(datos, brand)}
    ${generarBloqueClienteYEquipos(datos, equiposList, brand)}
    ${generarObjetoOferta(datos)}
    ${bodyContentHtml}
  </div>
</body>
</html>`;
};

const editorialStyles = `
  @page {
    size: A4;
    margin: 14mm 14mm 18mm 14mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #0F172A;
    background: #FFFFFF;
    font-size: 8.8px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Marca de agua diagonal de gobernanza antifuga (centrada limpiamente en cada hoja en Chromium print) */
  .gov-watermark-layer {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    pointer-events: none;
    z-index: 9999;
    user-select: none;
  }

  .gov-watermark-text {
    transform: rotate(-34deg);
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 3px;
    color: #DC2626;
    opacity: 0.085;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .doc-shell {
    position: relative;
    z-index: 1;
    width: 100%;
  }

  .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* 1. Barra superior de acento (4px White-Label) */
  .top-accent-bar {
    width: 100%;
    height: 4px;
    background: var(--brand-primary);
    border-radius: 2px;
    margin-bottom: 14px;
  }

  /* 2. Membrete Corporativo 2 columnas */
  .ed-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid #E2E8F0;
    margin-bottom: 12px;
  }

  .ed-brand-col {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1 1 56%;
    min-width: 0;
  }

  .ed-logo-wrap {
    flex: 0 0 auto;
    max-width: 128px;
    max-height: 48px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .ed-logo-wrap img {
    max-height: 48px !important;
    max-width: 128px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain;
    border-radius: 5px;
    display: block;
  }

  .ed-company-info {
    min-width: 0;
  }

  .ed-company-name {
    font-size: 12px;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.25;
    margin-bottom: 2px;
  }

  .ed-company-meta {
    font-size: 8px;
    color: #475569;
    line-height: 1.45;
  }

  .ed-doc-col {
    flex: 0 0 42%;
    text-align: right;
  }

  .ed-doc-kicker {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #64748B;
    margin-bottom: 2px;
  }

  .ed-doc-number {
    font-size: 16px;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.2px;
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
    margin-bottom: 5px;
  }

  .ed-badges {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  .ed-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7.5px;
    font-weight: 600;
    background: #F1F5F9;
    color: #334155;
    border: 1px solid #E2E8F0;
  }

  .ed-badge-gov {
    background: #FEF2F2;
    color: #991B1B;
    border: 1px solid #FECACA;
    font-weight: 700;
    letter-spacing: 0.3px;
  }

  .ed-badge-po {
    background: #ECFDF5;
    color: #065F46;
    border: 1px solid #A7F3D0;
    font-weight: 700;
  }

  .ed-dates {
    font-size: 8px;
    color: #475569;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }

  .ed-dates strong {
    color: #0F172A;
    font-weight: 600;
  }

  /* 3. Tarjetas Cliente y Equipo */
  .ed-cards-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .ed-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 10px 12px;
  }

  .ed-card-kicker {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: #64748B;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #E2E8F0;
  }

  .ed-card-title {
    font-size: 10px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 4px;
    line-height: 1.3;
  }

  .ed-atencion-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 6px;
    padding: 3.5px 7px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-left: 2.5px solid var(--brand-primary);
    border-radius: 3px;
    line-height: 1.35;
  }

  .ed-atencion-label {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #64748B;
  }

  .ed-atencion-name {
    font-size: 8.5px;
    font-weight: 700;
    color: #0F172A;
  }

  .ed-atencion-cargo {
    font-size: 8px;
    font-weight: 500;
    color: #475569;
  }

  .ed-kv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 10px;
  }

  .ed-kv-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px 12px;
  }

  .ed-kv {
    min-width: 0;
  }

  .ed-kv-full {
    grid-column: 1 / -1;
  }

  .ed-k {
    display: block;
    font-size: 7px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748B;
  }

  .ed-v {
    display: block;
    font-size: 8.4px;
    color: #0F172A;
    font-weight: 500;
    word-break: break-word;
  }

  .ed-v-strong {
    font-weight: 700;
  }

  .ed-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }

  /* 4. Objeto de la Oferta */
  .ed-objeto {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 3px solid var(--brand-primary);
    border-radius: 0 6px 6px 0;
    padding: 9px 12px;
    margin-bottom: 12px;
  }

  .ed-objeto-kicker {
    font-size: 7.2px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #64748B;
    margin-bottom: 2px;
  }

  .ed-objeto-asunto {
    font-size: 10.5px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.35;
  }

  .ed-objeto-desc {
    margin-top: 6px;
    font-size: 8.3px;
    color: #334155;
    line-height: 1.45;
  }

  .ed-alcance-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #E2E8F0;
  }

  .ed-alcance-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 8px;
    color: #334155;
    line-height: 1.45;
  }

  .ed-alcance-box.incluido {
    border-left: 2.5px solid #10B981;
  }

  .ed-alcance-box.exclusiones {
    border-left: 2.5px solid #F43F5E;
  }

  .ed-alcance-label {
    font-size: 7.4px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 5px;
    display: block;
  }

  .ed-alcance-list {
    display: flex;
    flex-direction: column;
    gap: 3.5px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ed-alcance-item {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    padding: 2.5px 5px;
    border-radius: 3px;
    font-size: 7.9px;
    line-height: 1.35;
    color: #1E293B;
    break-inside: avoid;
  }

  .ed-alcance-box.incluido .ed-alcance-item {
    background: #F0FDF4;
    border: 1px solid #DCFCE7;
  }

  .ed-alcance-box.exclusiones .ed-alcance-item {
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
  }

  .ed-alcance-ico {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .ed-alcance-ico.incluido {
    background: #D1FAE5;
    color: #059669;
  }

  .ed-alcance-ico.exclusiones {
    background: #FFE4E6;
    color: #E11D48;
  }

  .ed-alcance-text {
    flex: 1;
    min-width: 0;
  }

  .mode-compact .ed-alcance-list {
    gap: 3px;
  }

  .mode-compact .ed-alcance-item {
    padding: 3.5px 8px;
    font-size: 7.5px;
    line-height: 1.28;
  }

  /* 5. Títulos de sección y tablas elegantes */
  .ed-section {
    margin-bottom: 12px;
  }

  .ed-sec-heading {
    font-size: 10.2px;
    font-weight: 700;
    color: #0F172A;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    border-left: 3px solid var(--brand-primary);
    padding-left: 8px;
    margin: 0 0 6px 0;
    line-height: 1.3;
  }

  .ed-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
  }

  .ed-table thead {
    display: table-header-group;
  }

  .ed-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .ed-table th {
    background: #F1F5F9;
    color: #334155;
    border-top: 1px solid #E2E8F0;
    border-bottom: 1.2px solid #CBD5E1;
    padding: 6.5px 8px;
    text-align: left;
    font-size: 7.6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .ed-table th.col-num { width: 28px; text-align: center; }
  .ed-table th.col-desc { width: 46%; }
  .ed-table th.col-qty { width: 70px; text-align: center; }
  .ed-table th.col-price { width: 88px; text-align: right; }
  .ed-table th.col-disc { width: 46px; text-align: center; }
  .ed-table th.col-sub { width: 96px; text-align: right; }

  .ed-table td {
    padding: 7px 8px;
    border-bottom: 1px solid #E2E8F0;
    vertical-align: top;
    color: #0F172A;
  }

  .ed-table td.col-num {
    text-align: center;
    color: #64748B;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .ed-table td.col-qty {
    text-align: center;
    white-space: nowrap;
    color: #334155;
    font-variant-numeric: tabular-nums;
  }

  .ed-table td.col-price {
    text-align: right;
    white-space: nowrap;
    color: #334155;
    font-variant-numeric: tabular-nums;
  }

  .ed-table td.col-disc {
    text-align: center;
    white-space: nowrap;
    color: #059669;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .ed-table td.col-sub {
    text-align: right;
    white-space: nowrap;
    font-weight: 700;
    color: #0F172A;
    font-variant-numeric: tabular-nums;
  }

  .ed-table tfoot {
    display: table-row-group;
  }

  .ed-table tfoot td,
  .ed-table tr.ed-subtotal-row td {
    background: #F8FAFC;
    border-top: 1px solid #CBD5E1;
    border-bottom: 1px solid #E2E8F0;
    padding: 6.5px 8px;
    font-size: 8.3px;
    font-weight: 700;
    color: #334155;
  }

  .ed-item-title {
    font-weight: 600;
    color: #0F172A;
  }

  .ed-item-meta {
    display: block;
    font-size: 7.6px;
    color: #64748B;
    margin-top: 2px;
    line-height: 1.4;
  }

  .ed-pill {
    display: inline-block;
    font-size: 7px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
    font-weight: 600;
    margin-right: 4px;
    text-transform: uppercase;
    letter-spacing: 0.25px;
  }

  .ed-pill-exento {
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #FDE68A;
  }

  /* 6. Bloque de Cierre Balanceado (55% Izquierda / 45% Derecha) */
  .ed-closing-grid {
    display: grid;
    grid-template-columns: 55% 1fr;
    gap: 12px;
    align-items: start;
    margin-top: 14px;
    margin-bottom: 12px;
  }

  .ed-closing-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .ed-cond-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 10px 12px;
  }

  .ed-cond-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px 12px;
  }

  .ed-cond-val {
    font-size: 8.8px;
    font-weight: 700;
    color: #0F172A;
    margin-top: 1px;
  }

  .ed-terms-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 10px 12px;
  }

  .ed-terms-text {
    font-size: 7.7px;
    line-height: 1.5;
    color: #475569;
  }

  /* Resumen Económico (Derecha 45% — Único fondo primario sólido en fila TOTAL) */
  .ed-totals-card {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    overflow: hidden;
  }

  .ed-totals-head {
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    padding: 7px 12px;
    font-size: 7.8px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: #334155;
  }

  .ed-totals-body {
    padding: 6px 12px 2px 12px;
  }

  .ed-trow {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 4.5px 0;
    font-size: 8.6px;
    color: #334155;
    border-bottom: 1px solid #F1F5F9;
  }

  .ed-trow:last-child {
    border-bottom: none;
  }

  .ed-trow.strong {
    border-top: 1px solid #CBD5E1;
    border-bottom: 1px solid #CBD5E1;
    margin-top: 2px;
    padding: 5.5px 0;
    font-weight: 700;
    color: #0F172A;
  }

  .ed-trow.discount {
    color: #059669;
    font-weight: 600;
  }

  .ed-trow.sub-indent {
    font-size: 8px;
    color: #64748B;
    padding: 3px 0 3px 10px;
    border-bottom: 1px dashed #F1F5F9;
  }

  .ed-trow.tax {
    font-weight: 600;
    color: #0F172A;
    padding-bottom: 6px;
  }

  .ed-tval {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .ed-trow.strong .ed-tval,
  .ed-trow.tax .ed-tval {
    font-weight: 700;
  }

  .ed-total-final {
    background: var(--brand-primary);
    color: #FFFFFF;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .ed-total-final-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .ed-total-final-value {
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* 7. Ítems Opcionales (borde punteado suave, padding interno completo 12px) */
  .ed-opcionales-card {
    border: 1px dashed #CBD5E1;
    border-radius: 6px;
    background: #FAFBFD;
    padding: 12px;
    margin-top: 12px;
    margin-bottom: 12px;
  }

  .ed-opcionales-title {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #334155;
    margin-bottom: 4px;
  }

  .ed-opcionales-note {
    font-size: 8px;
    color: #64748B;
    margin-bottom: 8px;
    line-height: 1.45;
  }

  /* Contenedor antihuérfanos: último bloque previo + firmas siempre viajan juntos */
  .closing-keep-together {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* 8. Firmas Sobrias con Dimensionamiento Adaptativo y Líneas 100% Colineales */
  .ed-firmas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 36px;
    margin-top: 22px;
    padding: 0 8px;
  }

  .ed-firma-col {
    text-align: center;
  }

  /* Caso A: Ninguna firma digital adjunta -> espacio compacto idéntico en ambas columnas */
  .ed-firma-space.is-physical {
    height: 26px;
    border-bottom: 1px solid #94A3B8;
    margin-bottom: 5px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  /* Caso B: Al menos una firma digital adjunta -> altura fija idéntica en ambas columnas para líneas colineales */
  .ed-firma-space.has-digital {
    height: 46px;
    border-bottom: 1px solid #94A3B8;
    margin-bottom: 6px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .ed-firma-img {
    width: auto;
    height: auto;
    max-width: 185px;
    max-height: 44px;
    object-fit: contain;
    mix-blend-mode: multiply;
    margin-bottom: -2px;
    display: block;
  }

  .ed-firma-name {
    font-size: 9px;
    font-weight: 700;
    color: #0F172A;
    text-transform: uppercase;
    letter-spacing: 0.25px;
  }

  .ed-firma-sub {
    font-size: 7.8px;
    color: #64748B;
    margin-top: 1px;
  }

  /* ═════════════════════════════════════════════════════════════════════════
     LAYOUT A (POR DEFECTO): MODO EJECUTIVO "SUMA ALZADA" (1 PÁGINA)
     ═════════════════════════════════════════════════════════════════════════ */
  .mode-compact .top-accent-bar {
    margin-bottom: 7px;
  }

  .mode-compact .ed-header {
    padding-bottom: 7px;
    margin-bottom: 7px;
  }

  .mode-compact .ed-cards-2col {
    margin-bottom: 7px;
  }

  .mode-compact .ed-card {
    padding: 6.5px 10px;
  }

  .mode-compact .ed-objeto {
    padding: 6px 10px;
    margin-bottom: 7px;
  }

  .mode-compact .ed-alcance-grid {
    margin-top: 5px;
    padding-top: 5px;
    gap: 6px;
  }

  .mode-compact .ed-alcance-box {
    padding: 5px 7px;
  }

  .mode-compact .ed-section {
    margin-bottom: 7px;
  }

  .mode-compact .ed-sec-heading {
    margin-bottom: 4.5px;
  }

  .mode-compact .ed-table th {
    padding: 4.5px 7px;
  }

  .mode-compact .ed-table td {
    padding: 4.5px 7px;
  }

  .mode-compact .sa-totals-band {
    margin-top: 6px;
    margin-bottom: 7px;
  }

  .mode-compact .sa-cond-strip {
    padding: 6px 10px;
    margin-bottom: 7px;
  }

  .mode-compact .sa-terms-strip {
    padding: 6px 10px;
    margin-bottom: 7px;
  }

  .mode-compact .sa-terms-text {
    font-size: 8px;
    line-height: 1.38;
  }

  .mode-compact .sa-opcionales-card {
    padding: 6.5px 9px;
    margin-top: 6px;
    margin-bottom: 6px;
  }

  .mode-compact .ed-firmas {
    margin-top: 10px;
  }

  .mode-compact .ed-firma-space.has-digital {
    height: 46px;
  }

  .sa-table th.sa-col-num { width: 32px; text-align: center; }
  .sa-table th.sa-col-desc { width: auto; }
  .sa-table th.sa-col-qty { width: 92px; text-align: right; }

  .sa-table td.sa-col-num {
    text-align: center;
    color: #64748B;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .sa-table td.sa-col-qty {
    text-align: right;
    white-space: nowrap;
    color: #334155;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .sa-type-tag {
    display: inline-block;
    font-size: 7.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    padding: 1.5px 6px;
    border-radius: 3.5px;
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
    margin-left: 8px;
    vertical-align: middle;
  }

  .sa-desc-meta {
    display: block;
    font-size: 7.4px;
    color: #64748B;
    margin-top: 1.5px;
    line-height: 1.35;
  }

  /* Banda Ejecutiva Horizontal de Totales (ancho completo 100%, balanceada de extremo a extremo) */
  .sa-totals-band {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    width: 100%;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    overflow: hidden;
    background: #F8FAFC;
    margin-top: 8px;
    margin-bottom: 10px;
  }

  .sa-band-intro {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 8px 14px;
    min-width: 0;
  }

  .sa-band-intro-title {
    font-size: 7.6px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #1E293B;
    line-height: 1.25;
  }

  .sa-band-intro-sub {
    font-size: 7.1px;
    color: #64748B;
    margin-top: 2px;
    line-height: 1.3;
  }

  .sa-band-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    padding: 7px 12px;
    border-left: 1px solid #E2E8F0;
    flex: 0 0 auto;
    min-width: 0;
  }

  .sa-band-label {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    color: #64748B;
    white-space: nowrap;
  }

  .sa-band-value {
    font-size: 10px;
    font-weight: 700;
    color: #0F172A;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    margin-top: 1px;
  }

  .sa-band-value.discount {
    color: #059669;
  }

  .sa-band-sub {
    font-size: 6.9px;
    color: #64748B;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    margin-top: 1px;
  }

  .sa-band-total {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    background: var(--brand-primary);
    color: #FFFFFF;
    padding: 8px 16px;
    min-width: 165px;
  }

  .sa-band-total-label {
    font-size: 7.4px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.65px;
    opacity: 0.92;
    white-space: nowrap;
  }

  .sa-band-total-value {
    font-size: 14.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    line-height: 1.15;
    margin-top: 2px;
  }

  /* Tira horizontal de Condiciones Comerciales (4 columnas) + Términos a ancho completo */
  .sa-cond-strip {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }

  .sa-cond-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .sa-terms-strip {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 9px;
  }

  .sa-terms-text {
    font-size: 8.5px;
    line-height: 1.48;
    color: #334155;
  }

  /* Ítems Opcionales Compactos (Suma Alzada) */
  .sa-opcionales-card {
    border: 1px dashed #CBD5E1;
    border-radius: 6px;
    background: #FAFBFD;
    padding: 9px 11px;
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .sa-opcionales-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 5px;
  }

  .sa-opcionales-title {
    font-size: 8.6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #334155;
  }

  .sa-opcionales-hint {
    font-size: 7.4px;
    color: #64748B;
    font-style: italic;
  }
`;

const generarHeaderEditorial = (datos: DatosCotizacionPDF, brand: OrgBrandingContext): string => {
  const tipoLabel = formatTipoLabel(datos.tipoCotizacion);

  const lineaFiscal = [
    brand.numeroIdFiscal
      ? `${esc(brand.tipoIdFiscal || 'NIT')}: ${esc(brand.numeroIdFiscal)}`
      : null,
    brand.direccionLinea1 ? esc(brand.direccionLinea1) : null,
    [brand.ciudadDefecto, brand.paisDefecto].filter(Boolean).map(esc).join(', ') || null,
  ]
    .filter(Boolean)
    .join(' · ');

  const lineaContacto = [
    brand.telefonoPrincipal ? `Tel: ${esc(brand.telefonoPrincipal)}` : null,
    brand.emailContacto ? esc(brand.emailContacto) : null,
    brand.sitioWeb ? esc(brand.sitioWeb) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const logoHtml = brand.logoUrl ? renderOrgLogoHtml(brand, 48, 'light') : '';

  return `
  <header class="ed-header avoid-break">
    <div class="ed-brand-col">
      ${logoHtml ? `<div class="ed-logo-wrap">${logoHtml}</div>` : ''}
      <div class="ed-company-info">
        <div class="ed-company-name">${esc(brand.razonSocial || brand.nombreComercial)}</div>
        ${
          brand.nombreComercial &&
          brand.razonSocial &&
          !brand.razonSocial.toLowerCase().includes(brand.nombreComercial.toLowerCase())
            ? `<div class="ed-company-meta" style="font-weight: 600; color: #334155;">${esc(brand.nombreComercial)}</div>`
            : ''
        }
        ${lineaFiscal ? `<div class="ed-company-meta">${lineaFiscal}</div>` : ''}
        ${lineaContacto ? `<div class="ed-company-meta">${lineaContacto}</div>` : ''}
      </div>
    </div>

    <div class="ed-doc-col">
      <div class="ed-doc-kicker">Cotización Comercial</div>
      <div class="ed-doc-number">${esc(datos.numeroCotizacion)}</div>
      <div class="ed-badges">
        <span class="ed-badge">Versión ${datos.version}</span>
        ${tipoLabel ? `<span class="ed-badge">${esc(tipoLabel)}</span>` : ''}
        ${
          datos.mostrarMarcaAguaBorrador
            ? `<span class="ed-badge ed-badge-gov">BORRADOR · SIN APROBACIÓN</span>`
            : ''
        }
        ${
          datos.ordenCompraCliente
            ? `<span class="ed-badge ed-badge-po">PO: ${esc(datos.ordenCompraCliente)}</span>`
            : ''
        }
      </div>
      <div class="ed-dates">
        <div>Emisión: <strong>${esc(datos.fechaCotizacion)}</strong></div>
        <div>Válida hasta: <strong>${esc(datos.fechaVencimiento)}</strong> (${datos.diasValidez} días)</div>
      </div>
    </div>
  </header>`;
};

const generarTarjetaClienteContenido = (
  datos: DatosCotizacionPDF,
  brand: OrgBrandingContext,
  horizontal = false,
): string => {
  const atencionNombre = datos.atencionANombre?.trim() || '';
  const atencionCargo = datos.atencionACargo?.trim() || '';

  return `
  <div class="ed-card-kicker">Cliente</div>
  <div class="ed-card-title">${esc(datos.cliente.nombre)}</div>
  ${
    atencionNombre
      ? `<div class="ed-atencion-row">
    <span class="ed-atencion-label">Atención a:</span>
    <span class="ed-atencion-name">${esc(atencionNombre)}</span>
    ${atencionCargo ? `<span class="ed-atencion-cargo">· ${esc(atencionCargo)}</span>` : ''}
  </div>`
      : ''
  }
  <div class="${horizontal ? 'ed-kv-grid-3' : 'ed-kv-grid'}">
    ${
      datos.cliente.nit
        ? `<div class="ed-kv">
      <span class="ed-k">${esc(brand.tipoIdFiscal || 'NIT')}</span>
      <span class="ed-v ed-mono">${esc(datos.cliente.nit)}</span>
    </div>`
        : ''
    }
    <div class="ed-kv">
      <span class="ed-k">Dirección</span>
      <span class="ed-v">${esc(datos.cliente.direccion)}</span>
    </div>
    ${
      datos.cliente.telefono
        ? `<div class="ed-kv">
      <span class="ed-k">Teléfono</span>
      <span class="ed-v">${esc(datos.cliente.telefono)}</span>
    </div>`
        : ''
    }
    ${
      datos.cliente.email
        ? `<div class="ed-kv${horizontal ? '' : ' ed-kv-full'}">
      <span class="ed-k">Correo Electrónico</span>
      <span class="ed-v">${esc(datos.cliente.email)}</span>
    </div>`
        : ''
    }
  </div>`;
};

const generarBloqueClienteYEquipos = (
  datos: DatosCotizacionPDF,
  equipos: EquipoCotizacionPDF[],
  brand: OrgBrandingContext,
): string => {
  // 1 solo equipo: 2 tarjetas lado a lado (50% / 50%)
  if (equipos.length === 1) {
    const eq = equipos[0];
    const marcaModelo =
      [eq.marca, eq.modelo].filter((x) => x && x !== 'N/A').join(' · ') || eq.nombreEquipo || '-';
    return `
  <div class="ed-cards-2col avoid-break">
    <div class="ed-card">
      ${generarTarjetaClienteContenido(datos, brand, false)}
    </div>
    <div class="ed-card">
      <div class="ed-card-kicker">Activo / Equipo Cubierto</div>
      <div class="ed-card-title">
        ${eq.codigoEquipo ? `<span class="ed-mono">${esc(eq.codigoEquipo)}</span>` : ''}${eq.codigoEquipo && eq.nombreEquipo ? ' · ' : ''}${esc(eq.nombreEquipo || eq.tipoEquipo)}
      </div>
      <div class="ed-kv-grid">
        <div class="ed-kv">
          <span class="ed-k">Clase / Tipo</span>
          <span class="ed-v">${esc(eq.tipoEquipo || '-')}</span>
        </div>
        <div class="ed-kv">
          <span class="ed-k">Marca / Modelo</span>
          <span class="ed-v">${esc(marcaModelo)}</span>
        </div>
        ${
          eq.serie && eq.serie !== 'N/A'
            ? `<div class="ed-kv">
          <span class="ed-k">N° de Serie</span>
          <span class="ed-v ed-mono">${esc(eq.serie)}</span>
        </div>`
            : ''
        }
        ${
          eq.ubicacion
            ? `<div class="ed-kv">
          <span class="ed-k">Ubicación</span>
          <span class="ed-v">${esc(eq.ubicacion)}</span>
        </div>`
            : ''
        }
      </div>
    </div>
  </div>`;
  }

  // 0 equipos: solo tarjeta cliente compacta horizontal
  if (equipos.length === 0) {
    return `
  <div class="ed-section avoid-break">
    <div class="ed-card">
      ${generarTarjetaClienteContenido(datos, brand, true)}
    </div>
  </div>`;
  }

  // 2 o más equipos (Multi-Equipo): tarjeta cliente arriba + tabla ligera de parque debajo
  return `
  <div class="ed-section avoid-break">
    <div class="ed-card">
      ${generarTarjetaClienteContenido(datos, brand, true)}
    </div>
  </div>
  <div class="ed-section">
    <div class="ed-sec-heading">Parque de Equipos Cubiertos (${equipos.length} activos)</div>
    <table class="ed-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th style="width: 16%;">Código</th>
          <th style="width: 28%;">Equipo / Clase</th>
          <th style="width: 26%;">Marca / Modelo · Serie</th>
          <th style="width: 24%;">Ubicación / Alcance</th>
        </tr>
      </thead>
      <tbody>
        ${equipos
          .map(
            (eq, idx) => `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="ed-mono ed-v-strong">${esc(eq.codigoEquipo || '-')}</td>
          <td>
            <span class="ed-item-title">${esc(eq.nombreEquipo || eq.tipoEquipo)}</span>
            <span class="ed-item-meta">${esc(eq.tipoEquipo)}</span>
          </td>
          <td>
            ${esc([eq.marca, eq.modelo].filter((x) => x && x !== 'N/A').join(' ') || '-')}
            ${eq.serie && eq.serie !== 'N/A' ? `<span class="ed-item-meta ed-mono">S/N: ${esc(eq.serie)}</span>` : ''}
          </td>
          <td>
            ${esc(eq.ubicacion || '-')}
            ${eq.notasAlcance ? `<span class="ed-item-meta">${esc(eq.notasAlcance)}</span>` : ''}
          </td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
};

const parseAlcanceLineas = (texto?: string): string[] => {
  if (!texto) return [];
  const prefixRe = /^(?:[-•*–—·✓✔✕✖✗▪▸►]+|\d+[.)])\s+/;
  return String(texto)
    .split(/\r?\n/)
    .map((line) => {
      let clean = line.trim();
      while (prefixRe.test(clean)) {
        clean = clean.replace(prefixRe, '').trim();
      }
      return clean;
    })
    .filter(Boolean);
};

const SVG_CHECK_MICRO = `<svg width="7" height="7" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.2 6.2L4.8 8.8L9.8 3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_CROSS_MICRO = `<svg width="7" height="7" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

const generarListaAlcanceHtml = (items: string[], tipo: 'incluido' | 'exclusiones'): string => {
  const ico = tipo === 'incluido' ? SVG_CHECK_MICRO : SVG_CROSS_MICRO;
  return `<ul class="ed-alcance-list">
    ${items
      .map(
        (item) => `<li class="ed-alcance-item">
          <span class="ed-alcance-ico ${tipo}">${ico}</span>
          <span class="ed-alcance-text">${esc(item)}</span>
        </li>`,
      )
      .join('')}
  </ul>`;
};

const generarObjetoOferta = (datos: DatosCotizacionPDF): string => {
  const alcanceItems = parseAlcanceLineas(datos.alcanceTrabajo);
  const exclusionesItems = parseAlcanceLineas(datos.exclusiones);
  const tieneAlcance = alcanceItems.length > 0;
  const tieneExclusiones = exclusionesItems.length > 0;

  return `
  <div class="ed-objeto avoid-break">
    <div class="ed-objeto-kicker">Objeto de la Oferta</div>
    <div class="ed-objeto-asunto">${esc(datos.asunto)}</div>
    ${
      datos.descripcionGeneral?.trim()
        ? `<div class="ed-objeto-desc">${escMultiline(datos.descripcionGeneral)}</div>`
        : ''
    }
    ${
      tieneAlcance || tieneExclusiones
        ? `<div class="ed-alcance-grid" style="${tieneAlcance && tieneExclusiones ? '' : 'grid-template-columns: 1fr;'}">
      ${
        tieneAlcance
          ? `<div class="ed-alcance-box incluido">
        <span class="ed-alcance-label" style="color: #065F46;">Alcance Técnico Incluido</span>
        ${generarListaAlcanceHtml(alcanceItems, 'incluido')}
      </div>`
          : ''
      }
      ${
        tieneExclusiones
          ? `<div class="ed-alcance-box exclusiones">
        <span class="ed-alcance-label" style="color: #9F1239;">Exclusiones</span>
        ${generarListaAlcanceHtml(exclusionesItems, 'exclusiones')}
      </div>`
          : ''
      }
    </div>`
        : ''
    }
  </div>`;
};

const generarTablaServicios = (
  items: ItemServicioPDF[],
  brand: OrgBrandingContext,
  secNum: number,
): string => `
  <div class="ed-section">
    <div class="ed-sec-heading">${secNum}. Servicios Técnicos y Mano de Obra</div>
    <table class="ed-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-desc">Descripción del Servicio</th>
          <th class="col-qty">Cant.</th>
          <th class="col-price">V. Unitario</th>
          <th class="col-disc">Desc.</th>
          <th class="col-sub">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td class="col-num">${item.orden}</td>
          <td>
            <span class="ed-item-title">${esc(item.descripcion)}</span>
            ${
              item.equipoEtiqueta || item.ivaAplicable === false || item.observaciones
                ? `<span class="ed-item-meta">
                    ${item.equipoEtiqueta ? `<span class="ed-pill">${esc(item.equipoEtiqueta)}</span>` : ''}
                    ${item.ivaAplicable === false ? `<span class="ed-pill ed-pill-exento">Exento ${esc(brand.etiquetaImpuesto)}</span>` : ''}
                    ${item.observaciones ? esc(item.observaciones) : ''}
                  </span>`
                : ''
            }
          </td>
          <td class="col-qty">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="col-price">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="col-disc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '—'}</td>
          <td class="col-sub">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
        <tr class="ed-subtotal-row avoid-break">
          <td colspan="5" style="text-align: right;">Subtotal Servicios</td>
          <td class="col-sub">${esc(
            formatCurrencyOrg(
              items.reduce((sum, i) => sum + i.subtotal, 0),
              brand,
            ),
          )}</td>
        </tr>
      </tbody>
    </table>
  </div>`;

const generarTablaComponentes = (
  items: ItemComponentePDF[],
  brand: OrgBrandingContext,
  secNum: number,
): string => `
  <div class="ed-section">
    <div class="ed-sec-heading">${secNum}. Repuestos, Componentes e Insumos</div>
    <table class="ed-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-desc">Descripción / Especificación</th>
          <th class="col-qty">Cant.</th>
          <th class="col-price">V. Unitario</th>
          <th class="col-disc">Desc.</th>
          <th class="col-sub">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const metaParts = [
              item.referencia ? `Ref: ${esc(item.referencia)}` : null,
              item.marca ? `Marca: ${esc(item.marca)}` : null,
              item.garantiaMeses ? `Garantía: ${formatMeses(item.garantiaMeses)}` : null,
            ].filter(Boolean);
            const hasMeta =
              Boolean(item.equipoEtiqueta) || metaParts.length > 0 || item.ivaAplicable === false;
            return `
        <tr>
          <td class="col-num">${item.orden}</td>
          <td>
            <span class="ed-item-title">${esc(item.descripcion)}</span>
            ${
              hasMeta
                ? `<span class="ed-item-meta">
                    ${item.equipoEtiqueta ? `<span class="ed-pill">${esc(item.equipoEtiqueta)}</span>` : ''}
                    ${metaParts.join(' · ')}
                    ${item.ivaAplicable === false ? ` <span class="ed-pill ed-pill-exento">Exento ${esc(brand.etiquetaImpuesto)}</span>` : ''}
                  </span>`
                : ''
            }
          </td>
          <td class="col-qty">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="col-price">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="col-disc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '—'}</td>
          <td class="col-sub">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`;
          })
          .join('')}
        <tr class="ed-subtotal-row avoid-break">
          <td colspan="5" style="text-align: right;">Subtotal Repuestos e Insumos</td>
          <td class="col-sub">${esc(
            formatCurrencyOrg(
              items.reduce((sum, i) => sum + i.subtotal, 0),
              brand,
            ),
          )}</td>
        </tr>
      </tbody>
    </table>
  </div>`;

const generarTablaOtros = (
  items: ItemOtroPDF[],
  brand: OrgBrandingContext,
  secNum: number,
): string => `
  <div class="ed-section">
    <div class="ed-sec-heading">${secNum}. Logística, Viáticos, Pólizas y Otros Rubros</div>
    <table class="ed-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-desc">Concepto / Categoría</th>
          <th class="col-qty">Cant.</th>
          <th class="col-price">V. Unitario</th>
          <th class="col-disc">Desc.</th>
          <th class="col-sub">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td class="col-num">${item.orden}</td>
          <td>
            <span class="ed-pill">${esc(RUBRO_LABELS[item.categoriaRubro] || item.categoriaRubro)}</span>
            <span class="ed-item-title">${esc(item.descripcion)}</span>
            ${
              item.detalleCalculo || item.equipoEtiqueta || item.ivaAplicable === false
                ? `<span class="ed-item-meta">
                    ${item.equipoEtiqueta ? `<span class="ed-pill">${esc(item.equipoEtiqueta)}</span>` : ''}
                    ${item.detalleCalculo ? esc(item.detalleCalculo) : ''}
                    ${item.ivaAplicable === false ? ` <span class="ed-pill ed-pill-exento">Exento ${esc(brand.etiquetaImpuesto)}</span>` : ''}
                  </span>`
                : ''
            }
          </td>
          <td class="col-qty">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="col-price">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="col-disc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '—'}</td>
          <td class="col-sub">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
        <tr class="ed-subtotal-row avoid-break">
          <td colspan="5" style="text-align: right;">Subtotal Logística y Otros</td>
          <td class="col-sub">${esc(
            formatCurrencyOrg(
              items.reduce((sum, i) => sum + i.subtotal, 0),
              brand,
            ),
          )}</td>
        </tr>
      </tbody>
    </table>
  </div>`;

const generarBloqueCierreBalanceado = (
  datos: DatosCotizacionPDF,
  brand: OrgBrandingContext,
  incluyeLogistica: boolean,
): string => {
  const t = datos.totales;
  const subtotalOtros = t.subtotalOtros || 0;
  const usaAiu = Boolean(t.usaAiu && (t.aiuValorTotal || 0) > 0);
  const etiquetaIva =
    t.ivaSobreUtilidadAiu && usaAiu
      ? `${brand.etiquetaImpuesto} (${t.ivaPorcentaje}% s/ Utilidad AIU)`
      : `${brand.etiquetaImpuesto} (${t.ivaPorcentaje}%)`;

  const terminosDefault = [
    `1. Valores expresados en ${brand.codigoMoneda} con el tratamiento tributario de ${brand.etiquetaImpuesto} detallado en el resumen económico.`,
    '2. El plazo de ejecución inicia tras la aprobación escrita u Orden de Compra (PO) y el cumplimiento de las condiciones de pago.',
    '3. La garantía cubre defectos de fabricación y mano de obra ejecutada; excluye operación indebida o alteraciones externas.',
    '4. Todo trabajo o repuesto adicional fuera del alcance descrito se cotizará y aprobará previamente.',
    ...(incluyeLogistica
      ? []
      : [
          '5. Movilización, transporte o viáticos fuera del área estándar se cotizan de forma independiente cuando apliquen.',
        ]),
    `${incluyeLogistica ? '5' : '6'}. Precios y disponibilidad de repuestos sujetos a confirmación después del vencimiento de esta oferta.`,
  ].join('\n');

  return `
  <div class="ed-closing-grid avoid-break">
    <!-- Columna Izquierda (55%): Condiciones Comerciales + Términos -->
    <div class="ed-closing-left">
      <div class="ed-cond-card">
        <div class="ed-card-kicker">Condiciones Comerciales</div>
        <div class="ed-cond-grid">
          <div>
            <span class="ed-k">Forma de Pago</span>
            <div class="ed-cond-val">${esc(datos.formaPago)}</div>
          </div>
          <div>
            <span class="ed-k">Tiempo Estimado</span>
            <div class="ed-cond-val">${datos.tiempoEstimadoDias ? formatDiasHabiles(datos.tiempoEstimadoDias) : 'A convenir'}</div>
          </div>
          <div>
            <span class="ed-k">Garantía</span>
            <div class="ed-cond-val">${formatMeses(datos.mesesGarantia)}</div>
          </div>
          <div>
            <span class="ed-k">Validez de Oferta</span>
            <div class="ed-cond-val">${formatDiasCalendario(datos.diasValidez)}</div>
          </div>
        </div>
        ${
          datos.observacionesGarantia?.trim()
            ? `<div style="margin-top: 7px; padding-top: 6px; border-top: 1px dashed #CBD5E1;">
          <span class="ed-k">Observaciones de Garantía</span>
          <div style="font-size: 8px; color: #334155; margin-top: 2px;">${escMultiline(datos.observacionesGarantia)}</div>
        </div>`
            : ''
        }
      </div>

      <div class="ed-terms-card">
        <div class="ed-card-kicker">Términos y Condiciones</div>
        <div class="ed-terms-text">${escMultiline(datos.terminosCondiciones?.trim() || terminosDefault)}</div>
      </div>
    </div>

    <!-- Columna Derecha (45%): Resumen Económico -->
    <div class="ed-totals-card">
      <div class="ed-totals-head">Resumen Económico</div>
      <div class="ed-totals-body">
        ${
          t.subtotalServicios > 0
            ? `<div class="ed-trow">
          <span>Subtotal Servicios</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.subtotalServicios, brand))}</span>
        </div>`
            : ''
        }
        ${
          t.subtotalComponentes > 0
            ? `<div class="ed-trow">
          <span>Subtotal Repuestos e Insumos</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.subtotalComponentes, brand))}</span>
        </div>`
            : ''
        }
        ${
          subtotalOtros > 0
            ? `<div class="ed-trow">
          <span>Subtotal Logística y Otros</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(subtotalOtros, brand))}</span>
        </div>`
            : ''
        }
        <div class="ed-trow strong">
          <span>SUBTOTAL GENERAL</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.subtotalGeneral, brand))}</span>
        </div>
        ${
          t.descuentoPorcentaje > 0
            ? `<div class="ed-trow discount">
          <span>Descuento Comercial (${t.descuentoPorcentaje}%)</span>
          <span class="ed-tval">-${esc(formatCurrencyOrg(t.descuentoValor, brand))}</span>
        </div>
        <div class="ed-trow">
          <span>Subtotal Neto</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.subtotalConDescuento, brand))}</span>
        </div>`
            : ''
        }
        ${
          usaAiu
            ? `<div class="ed-trow sub-indent">
          <span>Administración (${t.aiuAdminPorcentaje || 0}%)</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.aiuAdminValor || 0, brand))}</span>
        </div>
        <div class="ed-trow sub-indent">
          <span>Imprevistos (${t.aiuImprevistosPorcentaje || 0}%)</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.aiuImprevistosValor || 0, brand))}</span>
        </div>
        <div class="ed-trow sub-indent">
          <span>Utilidad (${t.aiuUtilidadPorcentaje || 0}%)</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.aiuUtilidadValor || 0, brand))}</span>
        </div>
        <div class="ed-trow">
          <span style="font-weight: 700; color: #0F172A;">Total AIU</span>
          <span class="ed-tval" style="font-weight: 700; color: #0F172A;">${esc(formatCurrencyOrg(t.aiuValorTotal || 0, brand))}</span>
        </div>`
            : ''
        }
        <div class="ed-trow tax">
          <span>${esc(etiquetaIva)}</span>
          <span class="ed-tval">${esc(formatCurrencyOrg(t.ivaValor, brand))}</span>
        </div>
      </div>
      <div class="ed-total-final">
        <span class="ed-total-final-label">Total (${esc(brand.codigoMoneda)})</span>
        <span class="ed-total-final-value">${esc(formatCurrencyOrg(t.totalCotizacion, brand))}</span>
      </div>
    </div>
  </div>`;
};

const generarSeccionOpcionales = (items: ItemOpcionalPDF[], brand: OrgBrandingContext): string => `
  <div class="ed-opcionales-card avoid-break">
    <div class="ed-opcionales-title">Ítems Opcionales Recomendados (No incluidos en el total)</div>
    <p class="ed-opcionales-note">
      Los siguientes conceptos son opcionales y únicamente se ejecutarán y facturarán bajo autorización expresa del cliente.
    </p>
    <table class="ed-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-desc">Concepto Opcional</th>
          <th class="col-qty">Cant.</th>
          <th class="col-price">V. Unitario</th>
          <th class="col-sub">Subtotal Ref.</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item, idx) => `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td>
            <span class="ed-pill">${esc(item.tipo)}</span>
            <span class="ed-item-title">${esc(item.descripcion)}</span>
            ${item.referencia ? `<span class="ed-item-meta">Ref: ${esc(item.referencia)}</span>` : ''}
          </td>
          <td class="col-qty">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="col-price">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="col-sub">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;

const generarTablaAlcanceSumaAlzada = (
  datos: DatosCotizacionPDF,
  itemsOtros: ItemOtroPDF[],
): string => {
  type AlcanceRow = {
    tipoTag: string;
    descripcion: string;
    meta?: string;
    cantidadTexto: string;
  };

  const rows: AlcanceRow[] = [];

  for (const s of datos.itemsServicios) {
    const metaParts = [
      s.equipoEtiqueta ? `Equipo: ${s.equipoEtiqueta}` : null,
      s.observaciones?.trim() || null,
    ].filter(Boolean);
    rows.push({
      tipoTag: 'Servicio',
      descripcion: s.descripcion,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      cantidadTexto: `${s.cantidad} ${s.unidad}`,
    });
  }

  for (const c of datos.itemsComponentes) {
    const metaParts = [
      c.equipoEtiqueta ? `Equipo: ${c.equipoEtiqueta}` : null,
      c.referencia ? `Ref: ${c.referencia}` : null,
      c.marca ? `Marca: ${c.marca}` : null,
      c.garantiaMeses ? `Garantía: ${formatMeses(c.garantiaMeses)}` : null,
    ].filter(Boolean);
    rows.push({
      tipoTag: 'Suministro',
      descripcion: c.descripcion,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      cantidadTexto: `${c.cantidad} ${c.unidad}`,
    });
  }

  for (const o of itemsOtros) {
    const rubroTag =
      o.categoriaRubro === 'POLIZA'
        ? 'Póliza'
        : o.categoriaRubro === 'VIATICOS'
          ? 'Viáticos'
          : o.categoriaRubro === 'ALQUILER'
            ? 'Alquiler'
            : o.categoriaRubro === 'DISPOSICION_AMBIENTAL'
              ? 'Ambiental'
              : 'Logística';
    const metaParts = [
      o.equipoEtiqueta ? `Equipo: ${o.equipoEtiqueta}` : null,
      o.detalleCalculo?.trim() || null,
    ].filter(Boolean);
    rows.push({
      tipoTag: rubroTag,
      descripcion: o.descripcion,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      cantidadTexto: `${o.cantidad} ${o.unidad}`,
    });
  }

  if (rows.length === 0) return '';

  return `
  <div class="ed-section">
    <div class="ed-sec-heading">Alcance del Suministro y Servicio</div>
    <table class="ed-table sa-table">
      <thead>
        <tr>
          <th class="sa-col-num">#</th>
          <th class="sa-col-desc">Descripción / Alcance Técnico</th>
          <th class="sa-col-qty">Cant.</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r, idx) => `
        <tr>
          <td class="sa-col-num">${idx + 1}</td>
          <td>
            <span class="ed-item-title">${esc(r.descripcion)}</span>
            <span class="sa-type-tag">${esc(r.tipoTag)}</span>
            ${r.meta ? `<span class="sa-desc-meta">${esc(r.meta)}</span>` : ''}
          </td>
          <td class="sa-col-qty">${esc(r.cantidadTexto)}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
};

const generarBandaTotalesSumaAlzada = (
  datos: DatosCotizacionPDF,
  brand: OrgBrandingContext,
): string => {
  const t = datos.totales;
  const usaAiu = Boolean(t.usaAiu && (t.aiuValorTotal || 0) > 0);
  const tieneDesc = t.descuentoPorcentaje > 0 && t.descuentoValor > 0;
  const etiquetaIva =
    t.ivaSobreUtilidadAiu && usaAiu
      ? `${brand.etiquetaImpuesto} (${t.ivaPorcentaje}% s/ Util.)`
      : `${brand.etiquetaImpuesto} (${t.ivaPorcentaje}%)`;

  const celdas: string[] = [];

  if (usaAiu) {
    // Modo Suma Alzada con AIU (norma tributaria colombiana: compacto y sin subtotales por categoría)
    celdas.push(`
      <div class="sa-band-cell">
        <span class="sa-band-label">${tieneDesc ? 'Subtotal Neto' : 'Subtotal'}</span>
        <span class="sa-band-value">${esc(formatCurrencyOrg(t.subtotalConDescuento, brand))}</span>
        ${
          tieneDesc
            ? `<span class="sa-band-sub">Bruto ${esc(formatCurrencyOrg(t.subtotalGeneral, brand))} · Desc. ${t.descuentoPorcentaje}%</span>`
            : ''
        }
      </div>`);
    celdas.push(`
      <div class="sa-band-cell">
        <span class="sa-band-label">AIU (${t.aiuAdminPorcentaje || 0}/${t.aiuImprevistosPorcentaje || 0}/${t.aiuUtilidadPorcentaje || 0}%)</span>
        <span class="sa-band-value">${esc(formatCurrencyOrg(t.aiuValorTotal || 0, brand))}</span>
        <span class="sa-band-sub">A ${esc(formatCurrencyOrg(t.aiuAdminValor || 0, brand))} · I ${esc(formatCurrencyOrg(t.aiuImprevistosValor || 0, brand))} · U ${esc(formatCurrencyOrg(t.aiuUtilidadValor || 0, brand))}</span>
      </div>`);
  } else {
    // Modo Suma Alzada Estándar (sin AIU)
    if (tieneDesc) {
      celdas.push(`
        <div class="sa-band-cell">
          <span class="sa-band-label">Subtotal Bruto</span>
          <span class="sa-band-value">${esc(formatCurrencyOrg(t.subtotalGeneral, brand))}</span>
        </div>`);
      celdas.push(`
        <div class="sa-band-cell">
          <span class="sa-band-label">Desc. (${t.descuentoPorcentaje}%)</span>
          <span class="sa-band-value discount">-${esc(formatCurrencyOrg(t.descuentoValor, brand))}</span>
        </div>`);
      celdas.push(`
        <div class="sa-band-cell">
          <span class="sa-band-label">Subtotal Neto</span>
          <span class="sa-band-value">${esc(formatCurrencyOrg(t.subtotalConDescuento, brand))}</span>
        </div>`);
    } else {
      celdas.push(`
        <div class="sa-band-cell">
          <span class="sa-band-label">Subtotal</span>
          <span class="sa-band-value">${esc(formatCurrencyOrg(t.subtotalGeneral, brand))}</span>
        </div>`);
    }
  }

  celdas.push(`
    <div class="sa-band-cell">
      <span class="sa-band-label">${esc(etiquetaIva)}</span>
      <span class="sa-band-value">${esc(formatCurrencyOrg(t.ivaValor, brand))}</span>
    </div>`);

  return `
  <div class="sa-totals-band avoid-break">
    <div class="sa-band-intro">
      <span class="sa-band-intro-title">Resumen de Inversión</span>
      <span class="sa-band-intro-sub">Suma Alzada · Valores en ${esc(brand.codigoMoneda)}</span>
    </div>
    ${celdas.join('')}
    <div class="sa-band-total">
      <span class="sa-band-total-label">Total Oferta (${esc(brand.codigoMoneda)})</span>
      <span class="sa-band-total-value">${esc(formatCurrencyOrg(t.totalCotizacion, brand))}</span>
    </div>
  </div>`;
};

const generarCondicionesAnchoCompleto = (datos: DatosCotizacionPDF): string => `
  <div class="sa-cond-strip avoid-break">
    <div class="ed-card-kicker" style="margin-bottom: 5px; padding-bottom: 3px;">Condiciones Comerciales</div>
    <div class="sa-cond-row">
      <div>
        <span class="ed-k">Forma de Pago</span>
        <div class="ed-cond-val">${esc(datos.formaPago)}</div>
      </div>
      <div>
        <span class="ed-k">Tiempo Estimado</span>
        <div class="ed-cond-val">${datos.tiempoEstimadoDias ? formatDiasHabiles(datos.tiempoEstimadoDias) : 'A convenir'}</div>
      </div>
      <div>
        <span class="ed-k">Garantía</span>
        <div class="ed-cond-val">${formatMeses(datos.mesesGarantia)}</div>
      </div>
      <div>
        <span class="ed-k">Validez de Oferta</span>
        <div class="ed-cond-val">${formatDiasCalendario(datos.diasValidez)}</div>
      </div>
    </div>
    ${
      datos.observacionesGarantia?.trim()
        ? `<div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #CBD5E1; font-size: 7.6px; color: #334155;">
      <strong>Observaciones de Garantía:</strong> ${escMultiline(datos.observacionesGarantia)}
    </div>`
        : ''
    }
  </div>`;

const generarTerminosAnchoCompleto = (
  datos: DatosCotizacionPDF,
  brand: OrgBrandingContext,
  incluyeLogistica: boolean,
): string => {
  const terminosDefault = [
    `1. Valores expresados en ${brand.codigoMoneda} con el tratamiento tributario de ${brand.etiquetaImpuesto} indicado.`,
    '2. El plazo de ejecución inicia tras la aprobación escrita u Orden de Compra (PO) y el cumplimiento de la forma de pago.',
    '3. La garantía cubre defectos de fabricación y mano de obra ejecutada; excluye operación indebida o alteraciones externas.',
    '4. Todo trabajo o repuesto adicional fuera del alcance descrito se cotizará y aprobará previamente.',
    ...(incluyeLogistica
      ? []
      : [
          '5. Movilización, transporte o viáticos fuera del área estándar se cotizan de forma independiente cuando apliquen.',
        ]),
    `${incluyeLogistica ? '5' : '6'}. Precios y disponibilidad sujetos a confirmación posterior al vencimiento de esta oferta.`,
  ].join('\n');

  return `
  <div class="sa-terms-strip avoid-break">
    <div class="ed-card-kicker" style="margin-bottom: 4px; padding-bottom: 3px;">Términos y Condiciones</div>
    <div class="sa-terms-text">${escMultiline(datos.terminosCondiciones?.trim() || terminosDefault)}</div>
  </div>`;
};

const generarSeccionOpcionalesSumaAlzada = (
  items: ItemOpcionalPDF[],
  brand: OrgBrandingContext,
): string => `
  <div class="sa-opcionales-card avoid-break">
    <div class="sa-opcionales-head">
      <span class="sa-opcionales-title">Ítems Opcionales Recomendados (No incluidos en el total)</span>
      <span class="sa-opcionales-hint">Sujetos a autorización expresa del cliente</span>
    </div>
    <table class="ed-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th style="width: auto;">Concepto Opcional</th>
          <th style="width: 82px; text-align: right;">Cant.</th>
          <th style="width: 112px; text-align: right;">Valor Adicional</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item, idx) => `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td>
            <span class="ed-item-title">${esc(item.descripcion)}</span>
            <span class="sa-type-tag">${esc(item.tipo === 'REPUESTO' ? 'Suministro' : item.tipo === 'SERVICIO' ? 'Servicio' : 'Adicional')}</span>
            ${item.referencia ? `<span class="sa-desc-meta">Ref: ${esc(item.referencia)}</span>` : ''}
          </td>
          <td style="text-align: right; white-space: nowrap; color: #334155;">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="col-sub">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;

const renderFirmaImgHtml = (dataUri?: string, alt = 'Firma digital'): string => {
  const clean = dataUri?.trim();
  if (!clean || !/^data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s]+$/.test(clean)) {
    return '';
  }
  return `<img class="ed-firma-img" src="${esc(clean)}" alt="${esc(alt)}" />`;
};

const generarFirmasSobrias = (datos: DatosCotizacionPDF, brand: OrgBrandingContext): string => {
  const atencionNombre = datos.atencionANombre?.trim() || '';
  const atencionCargo = datos.atencionACargo?.trim() || '';
  const firmaAsesorHtml = renderFirmaImgHtml(datos.firmaAsesorDataUri, 'Firma del Asesor Emisor');
  const firmaClienteHtml = renderFirmaImgHtml(
    datos.firmaClienteDataUri,
    'Firma de Aceptación del Cliente',
  );
  const anySignatureAttached = Boolean(firmaAsesorHtml || firmaClienteHtml);
  const spaceClass = anySignatureAttached
    ? 'ed-firma-space has-digital'
    : 'ed-firma-space is-physical';

  return `
  <div class="ed-firmas avoid-break">
    <div class="ed-firma-col">
      <div class="${spaceClass}">${firmaAsesorHtml}</div>
      <div class="ed-firma-name">${esc(datos.elaboradoPor)}</div>
      <div class="ed-firma-sub">${esc(datos.cargoElaborador || 'Asesor Comercial')} · ${esc(brand.nombreComercial)}</div>
    </div>
    <div class="ed-firma-col">
      <div class="${spaceClass}">${firmaClienteHtml}</div>
      <div class="ed-firma-name">Aceptación y Firma del Cliente</div>
      ${
        atencionNombre
          ? `<div class="ed-firma-sub" style="color: #334155; font-weight: 600;">${esc(atencionNombre)}${atencionCargo ? ` · ${esc(atencionCargo)}` : ''}</div>
      <div class="ed-firma-sub">Firma autorizada y Orden de Compra (PO)</div>`
          : `<div class="ed-firma-sub">Nombre, Cargo y Orden de Compra (PO)</div>`
      }
    </div>
  </div>`;
};

export default generarCotizacionHTML;
