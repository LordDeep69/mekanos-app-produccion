/**
 * Template MEKANOS - Cotización Comercial
 *
 * Diseño profesional para cotizaciones con:
 * - Header con datos empresa y número cotización
 * - Datos del cliente y equipo
 * - Tabla de servicios con precios
 * - Tabla de componentes/repuestos
 * - Cálculo de totales (subtotales, descuentos, IVA, total)
 * - Términos y condiciones
 * - Pie de página con datos de contacto
 */

import { baseStyles, MEKANOS_COLORS } from './mekanos-base.template';

export interface DatosCotizacionPDF {
  // Identificación
  numeroCotizacion: string;
  fechaCotizacion: string;
  fechaVencimiento: string;
  diasValidez: number;
  version: number;

  // Cliente
  cliente: {
    nombre: string;
    nit?: string;
    direccion: string;
    telefono?: string;
    email?: string;
    contacto?: string;
  };

  // Equipo (opcional)
  equipo?: {
    tipoEquipo: string;
    marca: string;
    modelo?: string;
    serie?: string;
    ubicacion?: string;
  };

  // Descripción general
  asunto: string;
  descripcionGeneral?: string;
  alcanceTrabajo?: string;
  exclusiones?: string;

  // Items de servicios
  itemsServicios: ItemServicioPDF[];

  // Items de componentes
  itemsComponentes: ItemComponentePDF[];

  // Totales
  totales: {
    subtotalServicios: number;
    subtotalComponentes: number;
    subtotalGeneral: number;
    descuentoPorcentaje: number;
    descuentoValor: number;
    subtotalConDescuento: number;
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

export interface ItemServicioPDF {
  orden: number;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
}

export interface ItemComponentePDF {
  orden: number;
  descripcion: string;
  referencia?: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
}

export const generarCotizacionHTML = (datos: DatosCotizacionPDF): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${datos.numeroCotizacion}</title>
  <style>
    ${baseStyles}
    ${cotizacionStyles}
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    ${generarHeader(datos)}
    
    <!-- DATOS DEL CLIENTE -->
    ${generarDatosCliente(datos)}
    
    <!-- EQUIPO (si aplica) -->
    ${datos.equipo ? generarDatosEquipo(datos.equipo) : ''}
    
    <!-- DESCRIPCIÓN DEL TRABAJO -->
    ${generarDescripcion(datos)}
    
    <!-- TABLA DE SERVICIOS -->
    ${datos.itemsServicios.length > 0 ? generarTablaServicios(datos.itemsServicios) : ''}
    
    <!-- TABLA DE COMPONENTES -->
    ${datos.itemsComponentes.length > 0 ? generarTablaComponentes(datos.itemsComponentes) : ''}
  </div>
  
  <div class="page page-break">
    <!-- RESUMEN DE TOTALES -->
    ${generarResumenTotales(datos.totales)}
    
    <!-- CONDICIONES COMERCIALES -->
    ${generarCondicionesComerciales(datos)}
    
    <!-- TÉRMINOS Y CONDICIONES -->
    ${generarTerminosCondiciones(datos.terminosCondiciones)}
    
    <!-- FIRMAS -->
    ${generarFirmas(datos)}
    
    <!-- FOOTER -->
    ${generarFooter()}
  </div>
</body>
</html>
`;
};

const cotizacionStyles = `
  .cotizacion-badge {
    background: ${MEKANOS_COLORS.primary};
    color: white;
    padding: 4px 12px;
    border-radius: 15px;
    font-size: 10px;
    font-weight: bold;
  }
  
  .validez-tag {
    background: ${MEKANOS_COLORS.warning};
    color: white;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: bold;
  }
  
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 9px;
  }
  
  .items-table th {
    background: ${MEKANOS_COLORS.primary};
    color: white;
    padding: 8px 6px;
    text-align: left;
    font-weight: bold;
  }
  
  .items-table th.numero { width: 30px; text-align: center; }
  .items-table th.descripcion { width: 40%; }
  .items-table th.cantidad { width: 50px; text-align: center; }
  .items-table th.precio { width: 80px; text-align: right; }
  .items-table th.desc { width: 50px; text-align: center; }
  .items-table th.subtotal { width: 90px; text-align: right; }
  
  .items-table td {
    padding: 6px;
    border-bottom: 1px solid ${MEKANOS_COLORS.border};
  }
  
  .items-table td.numero { text-align: center; font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
  .items-table td.cantidad { text-align: center; }
  .items-table td.precio { text-align: right; }
  .items-table td.desc { text-align: center; color: ${MEKANOS_COLORS.success}; }
  .items-table td.subtotal { text-align: right; font-weight: bold; }
  
  .items-table tr:nth-child(even) {
    background: ${MEKANOS_COLORS.background};
  }
  
  .table-footer {
    background: ${MEKANOS_COLORS.background};
    font-weight: bold;
  }
  
  .totales-box {
    background: white;
    border: 2px solid ${MEKANOS_COLORS.primary};
    border-radius: 8px;
    padding: 15px;
    margin: 15px 0;
  }
  
  .totales-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px 20px;
  }
  
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px dashed ${MEKANOS_COLORS.border};
  }
  
  .total-row.subtotal {
    color: ${MEKANOS_COLORS.text};
  }
  
  .total-row.descuento {
    color: ${MEKANOS_COLORS.success};
  }
  
  .total-row.iva {
    color: ${MEKANOS_COLORS.secondary};
  }
  
  .total-row.final {
    background: ${MEKANOS_COLORS.primary};
    color: white;
    padding: 10px;
    margin: 10px -15px -15px -15px;
    border-radius: 0 0 6px 6px;
    font-size: 14px;
    font-weight: bold;
    border-bottom: none;
  }
  
  .total-label {
    font-weight: 500;
  }
  
  .total-value {
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }
  
  .condiciones-box {
    background: ${MEKANOS_COLORS.background};
    border-radius: 8px;
    padding: 12px;
    margin: 10px 0;
  }
  
  .condiciones-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .condicion-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .condicion-label {
    font-size: 8px;
    color: ${MEKANOS_COLORS.secondary};
    text-transform: uppercase;
    font-weight: bold;
  }
  
  .condicion-value {
    font-size: 11px;
    color: ${MEKANOS_COLORS.primary};
    font-weight: bold;
  }
  
  .terminos-box {
    background: white;
    border: 1px solid ${MEKANOS_COLORS.border};
    border-radius: 8px;
    padding: 12px;
    margin: 10px 0;
  }
  
  .terminos-content {
    font-size: 8px;
    line-height: 1.5;
    color: ${MEKANOS_COLORS.text};
    white-space: pre-line;
  }
`;

const generarHeader = (datos: DatosCotizacionPDF): string => `
  <div class="header">
    <div class="logo-container">
      <svg class="logo" viewBox="0 0 120 50">
        <rect width="120" height="50" fill="${MEKANOS_COLORS.primary}"/>
        <text x="60" y="25" fill="white" font-size="16" font-weight="bold" text-anchor="middle">MEKANOS</text>
        <text x="60" y="40" fill="${MEKANOS_COLORS.highlight}" font-size="8" text-anchor="middle">S.A.S</text>
      </svg>
    </div>
    <div class="header-title">
      <h1>COTIZACIÓN COMERCIAL</h1>
      <span class="cotizacion-badge">v${datos.version}</span>
    </div>
    <div class="header-order">
      <div class="order-number">${datos.numeroCotizacion}</div>
      <div style="font-size: 9px; color: ${MEKANOS_COLORS.secondary};">
        Fecha: ${datos.fechaCotizacion}
      </div>
      <div class="validez-tag">
        Válida hasta: ${datos.fechaVencimiento} (${datos.diasValidez} días)
      </div>
    </div>
  </div>
`;

const generarDatosCliente = (datos: DatosCotizacionPDF): string => `
  <div class="section">
    <div class="section-title">📋 DATOS DEL CLIENTE</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Razón Social</span>
        <span class="info-value">${datos.cliente.nombre}</span>
      </div>
      ${
        datos.cliente.nit
          ? `
      <div class="info-item">
        <span class="info-label">NIT</span>
        <span class="info-value">${datos.cliente.nit}</span>
      </div>
      `
          : ''
      }
      <div class="info-item">
        <span class="info-label">Dirección</span>
        <span class="info-value">${datos.cliente.direccion}</span>
      </div>
      ${
        datos.cliente.contacto
          ? `
      <div class="info-item">
        <span class="info-label">Contacto</span>
        <span class="info-value">${datos.cliente.contacto}</span>
      </div>
      `
          : ''
      }
    </div>
    <div class="info-grid info-grid-4" style="margin-top: 8px;">
      ${
        datos.cliente.telefono
          ? `
      <div class="info-item">
        <span class="info-label">Teléfono</span>
        <span class="info-value">${datos.cliente.telefono}</span>
      </div>
      `
          : ''
      }
      ${
        datos.cliente.email
          ? `
      <div class="info-item">
        <span class="info-label">Email</span>
        <span class="info-value">${datos.cliente.email}</span>
      </div>
      `
          : ''
      }
    </div>
  </div>
`;

const generarDatosEquipo = (equipo: DatosCotizacionPDF['equipo']): string => `
  <div class="section">
    <div class="section-title">⚙️ EQUIPO</div>
    <div class="info-grid info-grid-4">
      <div class="info-item">
        <span class="info-label">Tipo</span>
        <span class="info-value">${equipo?.tipoEquipo || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Marca</span>
        <span class="info-value">${equipo?.marca || '-'}</span>
      </div>
      ${
        equipo?.modelo
          ? `
      <div class="info-item">
        <span class="info-label">Modelo</span>
        <span class="info-value">${equipo.modelo}</span>
      </div>
      `
          : ''
      }
      ${
        equipo?.serie
          ? `
      <div class="info-item">
        <span class="info-label">Serie</span>
        <span class="info-value">${equipo.serie}</span>
      </div>
      `
          : ''
      }
    </div>
  </div>
`;

const generarDescripcion = (datos: DatosCotizacionPDF): string => `
  <div class="section">
    <div class="section-title">📝 ${datos.asunto.toUpperCase()}</div>
    ${
      datos.descripcionGeneral
        ? `
    <div class="observaciones-box" style="margin-bottom: 10px;">
      <strong>Descripción:</strong><br/>
      ${datos.descripcionGeneral}
    </div>
    `
        : ''
    }
    ${
      datos.alcanceTrabajo
        ? `
    <div class="observaciones-box" style="margin-bottom: 10px; border-left: 3px solid ${MEKANOS_COLORS.success};">
      <strong>✅ Alcance del Trabajo:</strong><br/>
      ${datos.alcanceTrabajo}
    </div>
    `
        : ''
    }
    ${
      datos.exclusiones
        ? `
    <div class="observaciones-box" style="border-left: 3px solid ${MEKANOS_COLORS.danger};">
      <strong>❌ Exclusiones:</strong><br/>
      ${datos.exclusiones}
    </div>
    `
        : ''
    }
  </div>
`;

const generarTablaServicios = (items: ItemServicioPDF[]): string => `
  <div class="section">
    <div class="section-title">🔧 SERVICIOS</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th class="descripcion">Descripción del Servicio</th>
          <th class="cantidad">Cant.</th>
          <th class="precio">P. Unitario</th>
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
          <td>${item.descripcion}</td>
          <td class="cantidad">${item.cantidad} ${item.unidad}</td>
          <td class="precio">$${formatNumber(item.precioUnitario)}</td>
          <td class="desc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '-'}</td>
          <td class="subtotal">$${formatNumber(item.subtotal)}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="table-footer">
          <td colspan="5" style="text-align: right;">SUBTOTAL SERVICIOS:</td>
          <td class="subtotal">$${formatNumber(items.reduce((sum, i) => sum + i.subtotal, 0))}</td>
        </tr>
      </tfoot>
    </table>
  </div>
`;

const generarTablaComponentes = (items: ItemComponentePDF[]): string => `
  <div class="section">
    <div class="section-title">📦 COMPONENTES / REPUESTOS</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="numero">#</th>
          <th class="descripcion">Descripción</th>
          <th class="cantidad">Cant.</th>
          <th class="precio">P. Unitario</th>
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
            ${item.descripcion}
            ${item.referencia ? `<br/><small style="color: ${MEKANOS_COLORS.secondary};">Ref: ${item.referencia}</small>` : ''}
          </td>
          <td class="cantidad">${item.cantidad} ${item.unidad}</td>
          <td class="precio">$${formatNumber(item.precioUnitario)}</td>
          <td class="desc">${item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '-'}</td>
          <td class="subtotal">$${formatNumber(item.subtotal)}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="table-footer">
          <td colspan="5" style="text-align: right;">SUBTOTAL COMPONENTES:</td>
          <td class="subtotal">$${formatNumber(items.reduce((sum, i) => sum + i.subtotal, 0))}</td>
        </tr>
      </tfoot>
    </table>
  </div>
`;

const generarResumenTotales = (totales: DatosCotizacionPDF['totales']): string => `
  <div class="section">
    <div class="section-title">💰 RESUMEN DE COSTOS</div>
    <div class="totales-box">
      <div class="total-row subtotal">
        <span class="total-label">Subtotal Servicios</span>
        <span class="total-value">$${formatNumber(totales.subtotalServicios)}</span>
      </div>
      <div class="total-row subtotal">
        <span class="total-label">Subtotal Componentes</span>
        <span class="total-value">$${formatNumber(totales.subtotalComponentes)}</span>
      </div>
      <div class="total-row subtotal" style="border-bottom: 2px solid ${MEKANOS_COLORS.primary};">
        <span class="total-label" style="font-weight: bold;">SUBTOTAL GENERAL</span>
        <span class="total-value">$${formatNumber(totales.subtotalGeneral)}</span>
      </div>
      ${
        totales.descuentoPorcentaje > 0
          ? `
      <div class="total-row descuento">
        <span class="total-label">Descuento (${totales.descuentoPorcentaje}%)</span>
        <span class="total-value">-$${formatNumber(totales.descuentoValor)}</span>
      </div>
      <div class="total-row subtotal">
        <span class="total-label">Subtotal con Descuento</span>
        <span class="total-value">$${formatNumber(totales.subtotalConDescuento)}</span>
      </div>
      `
          : ''
      }
      <div class="total-row iva">
        <span class="total-label">IVA (${totales.ivaPorcentaje}%)</span>
        <span class="total-value">$${formatNumber(totales.ivaValor)}</span>
      </div>
      <div class="total-row final">
        <span class="total-label">TOTAL COTIZACIÓN</span>
        <span class="total-value" style="font-size: 16px;">$${formatNumber(totales.totalCotizacion)}</span>
      </div>
    </div>
  </div>
`;

const generarCondicionesComerciales = (datos: DatosCotizacionPDF): string => `
  <div class="section">
    <div class="section-title">📋 CONDICIONES COMERCIALES</div>
    <div class="condiciones-box">
      <div class="condiciones-grid">
        <div class="condicion-item">
          <span class="condicion-label">Forma de Pago</span>
          <span class="condicion-value">${datos.formaPago}</span>
        </div>
        ${
          datos.tiempoEstimadoDias
            ? `
        <div class="condicion-item">
          <span class="condicion-label">Tiempo Estimado</span>
          <span class="condicion-value">${datos.tiempoEstimadoDias} días hábiles</span>
        </div>
        `
            : ''
        }
        <div class="condicion-item">
          <span class="condicion-label">Garantía</span>
          <span class="condicion-value">${datos.mesesGarantia} meses</span>
        </div>
        <div class="condicion-item">
          <span class="condicion-label">Validez Cotización</span>
          <span class="condicion-value">${datos.diasValidez} días</span>
        </div>
      </div>
      ${
        datos.observacionesGarantia
          ? `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed ${MEKANOS_COLORS.border};">
        <span class="condicion-label">Observaciones de Garantía:</span>
        <p style="font-size: 9px; margin: 5px 0 0 0;">${datos.observacionesGarantia}</p>
      </div>
      `
          : ''
      }
    </div>
  </div>
`;

const generarTerminosCondiciones = (terminos?: string): string => {
  const terminosDefault = `
1. Los precios incluyen IVA según se indica en el resumen de costos.
2. El tiempo de entrega comienza a partir de la aprobación de la cotización y el recibo del anticipo acordado.
3. La garantía cubre defectos de fabricación y mano de obra, no incluye daños por mal uso o negligencia.
4. Los trabajos adicionales no contemplados en esta cotización serán facturados por separado.
5. La cotización no incluye gastos de transporte fuera del área metropolitana.
6. Los precios están sujetos a cambios sin previo aviso después de la fecha de vencimiento.
`;

  return `
  <div class="section">
    <div class="section-title">📜 TÉRMINOS Y CONDICIONES</div>
    <div class="terminos-box">
      <div class="terminos-content">${terminos || terminosDefault}</div>
    </div>
  </div>
`;
};

const generarFirmas = (datos: DatosCotizacionPDF): string => `
  <div class="firmas-container" style="margin-top: 30px;">
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">
        ${datos.elaboradoPor}<br/>
        <small>${datos.cargoElaborador || 'Asesor Comercial'}</small><br/>
        <small>MEKANOS S.A.S</small>
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">
        Firma y Sello Cliente<br/>
        <small>Aceptación de la Cotización</small>
      </div>
    </div>
  </div>
`;

const generarFooter = (): string => `
  <div class="footer">
    <strong>MEKANOS S.A.S</strong> - NIT: 900.123.456-7<br/>
    BARRIO LIBANO CRA 49C #31-35 DIAG. AL SENA - Cartagena, Colombia<br/>
    TEL: 6359384 | CEL: 315-7083350 | E-MAIL: mekanossas2@gmail.com
  </div>
`;

// Utility: Formatear números con separadores de miles
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export default generarCotizacionHTML;
