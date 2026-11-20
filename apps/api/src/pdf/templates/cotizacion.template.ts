/**
 * Template White-Label EAM-CPQ - Cotización Comercial Editorial Prémium
 *
 * Características:
 * - 100% XSS-safe (todo texto de usuario escapado con escapeBrandHtml)
 * - Paginación fluida profesional (sin page-breaks forzados que dejen hojas vacías)
 * - Soporte Multi-Equipo (ficha compacta para 1 activo o tabla de parque para N activos)
 * - 3 tablas estructuradas: Servicios, Repuestos/Suministros y Logística/Viáticos/Pólizas
 *   (los costos indirectos absorbidos con visible_cliente=false nunca se muestran al cliente)
 * - Sección separada de Ítems Opcionales (no sumados al total principal)
 * - Desglose opcional de AIU (Administración, Imprevistos, Utilidad) y régimen dual de IVA
 * - Identidad White-Label (colores, logo, moneda, impuesto y footer de configuracion_organizacion)
 */

import {
  baseStyles,
  buildBrandCssVars,
  escapeBrandHtml,
  formatCurrencyOrg,
  generarFooterCorporativoHtml,
  MEKANOS_COLORS,
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

  // Elaboración
  elaboradoPor: string;
  cargoElaborador?: string;
}

const esc = (v?: string | number | null): string => escapeBrandHtml(v == null ? '' : String(v));

const escMultiline = (v?: string | null): string =>
  escapeBrandHtml(v || '').replace(/\r?\n/g, '<br/>');

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
  SERVICIO_TECNICO: 'SERVICIO TÉCNICO',
  PREVENTIVO: 'MANTENIMIENTO PREVENTIVO',
  CORRECTIVO: 'MANTENIMIENTO CORRECTIVO',
  SUMINISTRO: 'SUMINISTRO DE REPUESTOS',
  SUMINISTRO_INSTALACION: 'SUMINISTRO E INSTALACIÓN',
  PROYECTO: 'PROYECTO DE INGENIERÍA',
  CONTRATO: 'PROPUESTA CONTRACTUAL',
  DIAGNOSTICO: 'DIAGNÓSTICO TÉCNICO',
};

export const generarCotizacionHTML = (datos: DatosCotizacionPDF): string => {
  const baseBrand = resolveOrgBranding(datos.branding);
  const brand: OrgBrandingContext = datos.moneda
    ? { ...baseBrand, codigoMoneda: datos.moneda }
    : baseBrand;

  const equiposList: EquipoCotizacionPDF[] =
    datos.equipos && datos.equipos.length > 0
      ? datos.equipos
      : datos.equipo
        ? [datos.equipo]
        : [];

  const itemsOtros = datos.itemsOtros || [];
  const itemsOpcionales = datos.itemsOpcionales || [];

  return `<!DOCTYPE html>
<html lang="${esc(brand.locale || 'es')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${esc(datos.numeroCotizacion)}</title>
  <style>
    ${buildBrandCssVars(brand)}
    ${baseStyles}
    ${cotizacionStyles}
  </style>
</head>
<body>
  <div class="cot-doc">
    ${generarHeader(datos, brand)}
    ${generarDatosCliente(datos, brand)}
    ${equiposList.length > 0 ? generarSeccionEquipos(equiposList) : ''}
    ${generarDescripcion(datos)}
    ${datos.itemsServicios.length > 0 ? generarTablaServicios(datos.itemsServicios, brand) : ''}
    ${datos.itemsComponentes.length > 0 ? generarTablaComponentes(datos.itemsComponentes, brand) : ''}
    ${itemsOtros.length > 0 ? generarTablaOtros(itemsOtros, brand) : ''}
    ${generarResumenTotales(datos, brand)}
    ${itemsOpcionales.length > 0 ? generarTablaOpcionales(itemsOpcionales, brand) : ''}
    ${generarCondicionesComerciales(datos)}
    ${generarTerminosCondiciones(datos.terminosCondiciones, brand, itemsOtros.length > 0)}
    ${generarFirmas(datos, brand)}
    ${generarFooterCorporativoHtml(brand)}
  </div>
</body>
</html>`;
};

const cotizacionStyles = `
  .cot-doc {
    padding: 0;
  }

  .cot-section {
    margin-bottom: 12px;
  }

  .cot-avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .cot-header-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .cotizacion-badge {
    background: ${MEKANOS_COLORS.primary};
    color: white;
    padding: 2px 9px;
    border-radius: 12px;
    font-size: 8.5px;
    font-weight: bold;
    letter-spacing: 0.4px;
  }

  .tipo-badge {
    background: ${MEKANOS_COLORS.background};
    color: ${MEKANOS_COLORS.primary};
    border: 1px solid ${MEKANOS_COLORS.border};
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }

  .validez-tag {
    background: ${MEKANOS_COLORS.warning};
    color: white;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 8.5px;
    font-weight: bold;
    margin-top: 3px;
    display: inline-block;
  }

  .po-tag {
    background: ${MEKANOS_COLORS.success};
    color: white;
    padding: 2px 7px;
    border-radius: 3px;
    font-size: 8px;
    font-weight: 700;
    margin-top: 3px;
    display: inline-block;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 4px 0;
    font-size: 8.8px;
  }

  .items-table thead {
    display: table-header-group;
  }

  .items-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .items-table th {
    background: ${MEKANOS_COLORS.primary};
    color: white;
    padding: 7px 6px;
    text-align: left;
    font-weight: bold;
    font-size: 8.3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .items-table th.numero { width: 26px; text-align: center; }
  .items-table th.descripcion { width: 44%; }
  .items-table th.cantidad { width: 64px; text-align: center; }
  .items-table th.precio { width: 84px; text-align: right; }
  .items-table th.desc { width: 44px; text-align: center; }
  .items-table th.subtotal { width: 92px; text-align: right; }

  .items-table td {
    padding: 6px;
    border-bottom: 1px solid ${MEKANOS_COLORS.border};
    vertical-align: top;
  }

  .items-table td.numero { text-align: center; font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
  .items-table td.cantidad { text-align: center; white-space: nowrap; }
  .items-table td.precio { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .items-table td.desc { text-align: center; color: ${MEKANOS_COLORS.success}; font-weight: 600; }
  .items-table td.subtotal { text-align: right; font-weight: bold; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .items-table tbody tr:nth-child(even) {
    background: ${MEKANOS_COLORS.background};
  }

  .item-meta {
    display: block;
    font-size: 7.8px;
    color: ${MEKANOS_COLORS.secondary};
    margin-top: 2px;
  }

  .item-pill {
    display: inline-block;
    font-size: 7.3px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #E2E8F0;
    color: #334155;
    font-weight: 600;
    margin-right: 4px;
    text-transform: uppercase;
  }

  .item-pill-exento {
    background: #FEF3C7;
    color: #92400E;
  }

  .table-footer td {
    background: ${MEKANOS_COLORS.background};
    font-weight: bold;
    border-top: 1.5px solid ${MEKANOS_COLORS.primary};
    padding: 7px 6px;
  }

  .opcionales-table th {
    background: #475569;
  }

  .opcionales-note {
    font-size: 8px;
    color: #475569;
    margin: 4px 0 6px 0;
    font-style: italic;
  }

  .totales-wrapper {
    display: flex;
    justify-content: flex-end;
    margin: 10px 0 12px 0;
  }

  .totales-box {
    width: 340px;
    max-width: 100%;
    background: white;
    border: 1.5px solid ${MEKANOS_COLORS.primary};
    border-radius: 6px;
    padding: 10px 14px 0 14px;
    overflow: hidden;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4.5px 0;
    font-size: 9px;
    border-bottom: 1px dashed ${MEKANOS_COLORS.border};
  }

  .total-row.subtotal-strong {
    border-bottom: 1.5px solid ${MEKANOS_COLORS.primary};
    font-weight: 700;
    padding: 5.5px 0;
  }

  .total-row.descuento {
    color: ${MEKANOS_COLORS.success};
  }

  .total-row.aiu-sub {
    font-size: 8.3px;
    color: #475569;
    padding-left: 10px;
  }

  .total-row.iva {
    color: ${MEKANOS_COLORS.secondary};
    font-weight: 600;
  }

  .total-row.final {
    background: ${MEKANOS_COLORS.primary};
    color: white;
    padding: 9px 14px;
    margin: 6px -14px 0 -14px;
    font-size: 12px;
    font-weight: bold;
    border-bottom: none;
  }

  .total-value {
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .condiciones-box {
    background: ${MEKANOS_COLORS.background};
    border: 1px solid ${MEKANOS_COLORS.border};
    border-radius: 6px;
    padding: 10px 12px;
    margin: 6px 0;
  }

  .condiciones-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .condicion-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .condicion-label {
    font-size: 7.5px;
    color: ${MEKANOS_COLORS.secondary};
    text-transform: uppercase;
    font-weight: bold;
    letter-spacing: 0.3px;
  }

  .condicion-value {
    font-size: 9.8px;
    color: ${MEKANOS_COLORS.primary};
    font-weight: bold;
  }

  .terminos-box {
    background: white;
    border: 1px solid ${MEKANOS_COLORS.border};
    border-radius: 6px;
    padding: 10px 12px;
    margin: 6px 0;
  }

  .terminos-content {
    font-size: 8px;
    line-height: 1.5;
    color: ${MEKANOS_COLORS.text};
  }
`;

const generarHeader = (
  datos: DatosCotizacionPDF,
  brand = resolveOrgBranding(datos.branding),
): string => {
  const tipoLabel =
    (datos.tipoCotizacion && TIPO_COT_LABELS[datos.tipoCotizacion]) ||
    datos.tipoCotizacion?.replace(/_/g, ' ') ||
    null;

  return `
  <div class="header">
    <div class="logo-container" style="flex: 0 0 180px;">
      ${renderOrgLogoHtml(brand, 48, 'light')}
    </div>
    <div class="header-title">
      <h1>COTIZACIÓN COMERCIAL</h1>
      <div class="cot-header-meta">
        <span class="cotizacion-badge">Versión ${datos.version}</span>
        ${tipoLabel ? `<span class="tipo-badge">${esc(tipoLabel)}</span>` : ''}
      </div>
    </div>
    <div class="header-order">
      <div class="order-number">${esc(datos.numeroCotizacion)}</div>
      <div style="font-size: 8.5px; color: ${MEKANOS_COLORS.secondary};">
        Emisión: ${esc(datos.fechaCotizacion)}
      </div>
      <div class="validez-tag">
        Válida hasta: ${esc(datos.fechaVencimiento)} (${datos.diasValidez} días)
      </div>
      ${
        datos.ordenCompraCliente
          ? `<div class="po-tag">PO Cliente: ${esc(datos.ordenCompraCliente)}</div>`
          : ''
      }
    </div>
  </div>`;
};

const generarDatosCliente = (
  datos: DatosCotizacionPDF,
  brand: OrgBrandingContext,
): string => `
  <div class="section cot-section cot-avoid-break">
    <div class="section-title">DATOS DEL CLIENTE</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Razón Social / Cliente</span>
        <span class="info-value">${esc(datos.cliente.nombre)}</span>
      </div>
      ${
        datos.cliente.nit
          ? `<div class="info-item">
        <span class="info-label">${esc(brand.tipoIdFiscal || 'NIT')}</span>
        <span class="info-value">${esc(datos.cliente.nit)}</span>
      </div>`
          : ''
      }
      <div class="info-item">
        <span class="info-label">Dirección</span>
        <span class="info-value">${esc(datos.cliente.direccion)}</span>
      </div>
      ${
        datos.cliente.contacto
          ? `<div class="info-item">
        <span class="info-label">Contacto</span>
        <span class="info-value">${esc(datos.cliente.contacto)}</span>
      </div>`
          : ''
      }
      ${
        datos.cliente.telefono
          ? `<div class="info-item">
        <span class="info-label">Teléfono</span>
        <span class="info-value">${esc(datos.cliente.telefono)}</span>
      </div>`
          : ''
      }
      ${
        datos.cliente.email
          ? `<div class="info-item">
        <span class="info-label">Correo Electrónico</span>
        <span class="info-value">${esc(datos.cliente.email)}</span>
      </div>`
          : ''
      }
    </div>
  </div>`;

const generarSeccionEquipos = (equipos: EquipoCotizacionPDF[]): string => {
  if (equipos.length === 1) {
    const eq = equipos[0];
    return `
  <div class="section cot-section cot-avoid-break">
    <div class="section-title">ACTIVO / EQUIPO CUBIERTO</div>
    <div class="info-grid info-grid-4">
      ${
        eq.codigoEquipo
          ? `<div class="info-item"><span class="info-label">Código</span><span class="info-value">${esc(eq.codigoEquipo)}</span></div>`
          : ''
      }
      <div class="info-item">
        <span class="info-label">Clase / Tipo</span>
        <span class="info-value">${esc(eq.tipoEquipo || '-')}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Marca / Modelo</span>
        <span class="info-value">${esc([eq.marca, eq.modelo].filter((x) => x && x !== 'N/A').join(' · ') || eq.nombreEquipo || '-')}</span>
      </div>
      ${
        eq.serie && eq.serie !== 'N/A'
          ? `<div class="info-item"><span class="info-label">N° de Serie</span><span class="info-value">${esc(eq.serie)}</span></div>`
          : ''
      }
      ${
        eq.ubicacion
          ? `<div class="info-item"><span class="info-label">Ubicación</span><span class="info-value">${esc(eq.ubicacion)}</span></div>`
          : ''
      }
    </div>
  </div>`;
  }

  return `
  <div class="section cot-section">
    <div class="section-title">ACTIVOS CUBIERTOS (${equipos.length} EQUIPOS)</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th style="width: 15%;">Código</th>
          <th style="width: 28%;">Equipo / Tipo</th>
          <th style="width: 25%;">Marca / Modelo · Serie</th>
          <th style="width: 26%;">Ubicación / Alcance</th>
        </tr>
      </thead>
      <tbody>
        ${equipos
          .map(
            (eq, idx) => `
        <tr>
          <td class="numero">${idx + 1}</td>
          <td><strong>${esc(eq.codigoEquipo || '-')}</strong></td>
          <td>
            ${esc(eq.nombreEquipo || eq.tipoEquipo)}
            <span class="item-meta">${esc(eq.tipoEquipo)}</span>
          </td>
          <td>
            ${esc([eq.marca, eq.modelo].filter((x) => x && x !== 'N/A').join(' ') || '-')}
            ${eq.serie && eq.serie !== 'N/A' ? `<span class="item-meta">S/N: ${esc(eq.serie)}</span>` : ''}
          </td>
          <td>
            ${esc(eq.ubicacion || '-')}
            ${eq.notasAlcance ? `<span class="item-meta">${esc(eq.notasAlcance)}</span>` : ''}
          </td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
};

const generarDescripcion = (datos: DatosCotizacionPDF): string => `
  <div class="section cot-section cot-avoid-break">
    <div class="section-title">OBJETO DE LA OFERTA: ${esc(datos.asunto.toUpperCase())}</div>
    ${
      datos.descripcionGeneral
        ? `<div class="observaciones-box" style="margin-bottom: 8px;">
      <strong>Descripción General:</strong><br/>
      ${escMultiline(datos.descripcionGeneral)}
    </div>`
        : ''
    }
    ${
      datos.alcanceTrabajo
        ? `<div class="observaciones-box" style="margin-bottom: 8px; border-left: 3px solid ${MEKANOS_COLORS.success};">
      <strong>Alcance Técnico del Trabajo:</strong><br/>
      ${escMultiline(datos.alcanceTrabajo)}
    </div>`
        : ''
    }
    ${
      datos.exclusiones
        ? `<div class="observaciones-box" style="border-left: 3px solid ${MEKANOS_COLORS.danger};">
      <strong>Exclusiones:</strong><br/>
      ${escMultiline(datos.exclusiones)}
    </div>`
        : ''
    }
  </div>`;

const generarTablaServicios = (
  items: ItemServicioPDF[],
  brand = resolveOrgBranding(),
): string => `
  <div class="section cot-section">
    <div class="section-title">1. SERVICIOS TÉCNICOS Y MANO DE OBRA</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th class="descripcion">Descripción del Servicio</th>
          <th class="cantidad">Cant.</th>
          <th class="precio">V. Unitario</th>
          <th class="desc">Desc.</th>
          <th class="subtotal">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td class="numero">${item.orden}</td>
          <td>
            ${esc(item.descripcion)}
            ${
              item.equipoEtiqueta || item.ivaAplicable === false || item.observaciones
                ? `<span class="item-meta">
                    ${item.equipoEtiqueta ? `<span class="item-pill">${esc(item.equipoEtiqueta)}</span>` : ''}
                    ${item.ivaAplicable === false ? `<span class="item-pill item-pill-exento">Exento ${esc(brand.etiquetaImpuesto)}</span>` : ''}
                    ${item.observaciones ? esc(item.observaciones) : ''}
                   </span>`
                : ''
            }
          </td>
          <td class="cantidad">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="precio">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="desc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '-'}</td>
          <td class="subtotal">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="table-footer">
          <td colspan="5" style="text-align: right;">SUBTOTAL SERVICIOS:</td>
          <td class="subtotal">${esc(formatCurrencyOrg(items.reduce((sum, i) => sum + i.subtotal, 0), brand))}</td>
        </tr>
      </tfoot>
    </table>
  </div>`;

const generarTablaComponentes = (
  items: ItemComponentePDF[],
  brand = resolveOrgBranding(),
): string => `
  <div class="section cot-section">
    <div class="section-title">2. REPUESTOS, COMPONENTES E INSUMOS</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th class="descripcion">Descripción / Especificación</th>
          <th class="cantidad">Cant.</th>
          <th class="precio">V. Unitario</th>
          <th class="desc">Desc.</th>
          <th class="subtotal">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td class="numero">${item.orden}</td>
          <td>
            ${esc(item.descripcion)}
            <span class="item-meta">
              ${item.equipoEtiqueta ? `<span class="item-pill">${esc(item.equipoEtiqueta)}</span>` : ''}
              ${item.referencia ? `Ref: ${esc(item.referencia)}` : ''}
              ${item.marca ? `${item.referencia ? ' · ' : ''}Marca: ${esc(item.marca)}` : ''}
              ${item.garantiaMeses ? ` · Garantía: ${item.garantiaMeses} mes(es)` : ''}
              ${item.ivaAplicable === false ? ` <span class="item-pill item-pill-exento">Exento ${esc(brand.etiquetaImpuesto)}</span>` : ''}
            </span>
          </td>
          <td class="cantidad">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="precio">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="desc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '-'}</td>
          <td class="subtotal">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="table-footer">
          <td colspan="5" style="text-align: right;">SUBTOTAL REPUESTOS E INSUMOS:</td>
          <td class="subtotal">${esc(formatCurrencyOrg(items.reduce((sum, i) => sum + i.subtotal, 0), brand))}</td>
        </tr>
      </tfoot>
    </table>
  </div>`;

const generarTablaOtros = (
  items: ItemOtroPDF[],
  brand = resolveOrgBranding(),
): string => `
  <div class="section cot-section">
    <div class="section-title">3. LOGÍSTICA, VIÁTICOS, PÓLIZAS Y OTROS RUBROS</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th class="descripcion">Concepto / Categoría</th>
          <th class="cantidad">Cant.</th>
          <th class="precio">V. Unitario</th>
          <th class="desc">Desc.</th>
          <th class="subtotal">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td class="numero">${item.orden}</td>
          <td>
            <span class="item-pill">${esc(RUBRO_LABELS[item.categoriaRubro] || item.categoriaRubro)}</span>
            ${esc(item.descripcion)}
            ${
              item.detalleCalculo || item.equipoEtiqueta || item.ivaAplicable === false
                ? `<span class="item-meta">
                    ${item.equipoEtiqueta ? `<span class="item-pill">${esc(item.equipoEtiqueta)}</span>` : ''}
                    ${item.detalleCalculo ? esc(item.detalleCalculo) : ''}
                    ${item.ivaAplicable === false ? ` <span class="item-pill item-pill-exento">Exento ${esc(brand.etiquetaImpuesto)}</span>` : ''}
                  </span>`
                : ''
            }
          </td>
          <td class="cantidad">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="precio">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="desc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '-'}</td>
          <td class="subtotal">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="table-footer">
          <td colspan="5" style="text-align: right;">SUBTOTAL LOGÍSTICA Y OTROS:</td>
          <td class="subtotal">${esc(formatCurrencyOrg(items.reduce((sum, i) => sum + i.subtotal, 0), brand))}</td>
        </tr>
      </tfoot>
    </table>
  </div>`;

const generarTablaOpcionales = (
  items: ItemOpcionalPDF[],
  brand = resolveOrgBranding(),
): string => `
  <div class="section cot-section cot-avoid-break">
    <div class="section-title">ÍTEMS OPCIONALES RECOMENDADOS (NO INCLUIDOS EN EL TOTAL)</div>
    <p class="opcionales-note">
      Los siguientes conceptos son opcionales y solo se ejecutarán y facturarán bajo autorización expresa del cliente.
    </p>
    <table class="items-table opcionales-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th class="descripcion">Concepto Opcional</th>
          <th class="cantidad">Cant.</th>
          <th class="precio">V. Unitario</th>
          <th class="subtotal">Subtotal Ref.</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item, idx) => `
        <tr>
          <td class="numero">${idx + 1}</td>
          <td>
            <span class="item-pill">${esc(item.tipo)}</span>
            ${esc(item.descripcion)}
            ${item.referencia ? `<span class="item-meta">Ref: ${esc(item.referencia)}</span>` : ''}
          </td>
          <td class="cantidad">${item.cantidad} ${esc(item.unidad)}</td>
          <td class="precio">${esc(formatCurrencyOrg(item.precioUnitario, brand))}</td>
          <td class="subtotal">${esc(formatCurrencyOrg(item.subtotal, brand))}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;

const generarResumenTotales = (
  datos: DatosCotizacionPDF,
  brand = resolveOrgBranding(datos.branding),
): string => {
  const t = datos.totales;
  const subtotalOtros = t.subtotalOtros || 0;
  const usaAiu = Boolean(t.usaAiu && (t.aiuValorTotal || 0) > 0);
  const etiquetaIva = t.ivaSobreUtilidadAiu && usaAiu
    ? `${brand.etiquetaImpuesto} (${t.ivaPorcentaje}% s/ Utilidad AIU)`
    : `${brand.etiquetaImpuesto} (${t.ivaPorcentaje}%)`;

  return `
  <div class="totales-wrapper cot-avoid-break">
    <div class="totales-box">
      ${
        t.subtotalServicios > 0
          ? `<div class="total-row">
        <span>Subtotal Servicios</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.subtotalServicios, brand))}</span>
      </div>`
          : ''
      }
      ${
        t.subtotalComponentes > 0
          ? `<div class="total-row">
        <span>Subtotal Repuestos e Insumos</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.subtotalComponentes, brand))}</span>
      </div>`
          : ''
      }
      ${
        subtotalOtros > 0
          ? `<div class="total-row">
        <span>Subtotal Logística y Otros</span>
        <span class="total-value">${esc(formatCurrencyOrg(subtotalOtros, brand))}</span>
      </div>`
          : ''
      }
      <div class="total-row subtotal-strong">
        <span>SUBTOTAL COSTOS DIRECTOS</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.subtotalGeneral, brand))}</span>
      </div>
      ${
        t.descuentoPorcentaje > 0
          ? `<div class="total-row descuento">
        <span>Descuento Comercial (${t.descuentoPorcentaje}%)</span>
        <span class="total-value">-${esc(formatCurrencyOrg(t.descuentoValor, brand))}</span>
      </div>
      <div class="total-row">
        <span>Subtotal Neto</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.subtotalConDescuento, brand))}</span>
      </div>`
          : ''
      }
      ${
        usaAiu
          ? `<div class="total-row aiu-sub">
        <span>Administración (${t.aiuAdminPorcentaje || 0}%)</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.aiuAdminValor || 0, brand))}</span>
      </div>
      <div class="total-row aiu-sub">
        <span>Imprevistos (${t.aiuImprevistosPorcentaje || 0}%)</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.aiuImprevistosValor || 0, brand))}</span>
      </div>
      <div class="total-row aiu-sub">
        <span>Utilidad (${t.aiuUtilidadPorcentaje || 0}%)</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.aiuUtilidadValor || 0, brand))}</span>
      </div>
      <div class="total-row">
        <span><strong>Total AIU</strong></span>
        <span class="total-value">${esc(formatCurrencyOrg(t.aiuValorTotal || 0, brand))}</span>
      </div>`
          : ''
      }
      <div class="total-row iva">
        <span>${esc(etiquetaIva)}</span>
        <span class="total-value">${esc(formatCurrencyOrg(t.ivaValor, brand))}</span>
      </div>
      <div class="total-row final">
        <span>TOTAL (${esc(brand.codigoMoneda)})</span>
        <span class="total-value" style="font-size: 14px;">${esc(formatCurrencyOrg(t.totalCotizacion, brand))}</span>
      </div>
    </div>
  </div>`;
};

const generarCondicionesComerciales = (datos: DatosCotizacionPDF): string => `
  <div class="section cot-section cot-avoid-break">
    <div class="section-title">CONDICIONES COMERCIALES</div>
    <div class="condiciones-box">
      <div class="condiciones-grid">
        <div class="condicion-item">
          <span class="condicion-label">Forma de Pago</span>
          <span class="condicion-value">${esc(datos.formaPago)}</span>
        </div>
        <div class="condicion-item">
          <span class="condicion-label">Tiempo Estimado</span>
          <span class="condicion-value">${datos.tiempoEstimadoDias ? `${datos.tiempoEstimadoDias} día(s) hábil(es)` : 'A convenir'}</span>
        </div>
        <div class="condicion-item">
          <span class="condicion-label">Garantía</span>
          <span class="condicion-value">${datos.mesesGarantia} mes(es)</span>
        </div>
        <div class="condicion-item">
          <span class="condicion-label">Validez de Oferta</span>
          <span class="condicion-value">${datos.diasValidez} días calendario</span>
        </div>
      </div>
      ${
        datos.observacionesGarantia
          ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed ${MEKANOS_COLORS.border};">
        <span class="condicion-label">Condiciones de Garantía:</span>
        <p style="font-size: 8.5px; margin: 3px 0 0 0;">${escMultiline(datos.observacionesGarantia)}</p>
      </div>`
          : ''
      }
    </div>
  </div>`;

const generarTerminosCondiciones = (
  terminos: string | undefined,
  brand = resolveOrgBranding(),
  incluyeLogistica = false,
): string => {
  const terminosDefault = [
    `1. Los valores expresados están en ${brand.codigoMoneda} e incluyen el tratamiento tributario de ${brand.etiquetaImpuesto} detallado en el resumen económico.`,
    '2. El plazo de ejecución inicia a partir de la aprobación escrita u Orden de Compra (PO) del cliente y el cumplimiento de las condiciones de pago acordadas.',
    '3. La garantía cubre defectos de fabricación y mano de obra ejecutada; no cubre daños por operación indebida, alteraciones eléctricas externas o falta de mantenimiento preventivo.',
    '4. Cualquier trabajo, repuesto o diagnóstico adicional fuera del alcance descrito será cotizado y aprobado previamente antes de su ejecución.',
    ...(incluyeLogistica
      ? []
      : ['5. Los costos de movilización, transporte o viáticos fuera del área de cobertura estándar se cotizan de forma independiente cuando apliquen.']),
    `${incluyeLogistica ? '5' : '6'}. Los precios y disponibilidad de repuestos están sujetos a confirmación después de la fecha de vencimiento de esta oferta.`,
  ].join('\n');

  return `
  <div class="section cot-section cot-avoid-break">
    <div class="section-title">TÉRMINOS Y CONDICIONES</div>
    <div class="terminos-box">
      <div class="terminos-content">${escMultiline(terminos || terminosDefault)}</div>
    </div>
  </div>`;
};

const generarFirmas = (
  datos: DatosCotizacionPDF,
  brand = resolveOrgBranding(datos.branding),
): string => `
  <div class="firmas-container cot-avoid-break" style="margin-top: 22px;">
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">
        ${esc(datos.elaboradoPor)}<br/>
        <small>${esc(datos.cargoElaborador || 'Asesor Comercial')}</small><br/>
        <small>${esc(brand.nombreComercial)}</small>
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">
        Aceptación y Firma del Cliente<br/>
        <small>Nombre, Cargo y Orden de Compra (PO)</small>
      </div>
    </div>
  </div>`;

export default generarCotizacionHTML;
