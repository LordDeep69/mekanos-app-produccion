/**
 * Template MEKANOS - Orden de Compra
 *
 * Documento para solicitar materiales/repuestos a proveedores.
 *
 * Incluye:
 * - Datos del proveedor
 * - Items solicitados
 * - Condiciones de compra
 * - Tiempos de entrega
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

// Extender colores
const COLORS = {
    ...MEKANOS_COLORS,
    textLight: '#666666',
};

export interface DatosOrdenCompraPDF {
    branding?: OrgBrandingContext;
    // Identificación
    numeroOrdenCompra: string;
    fechaEmision: string;
    fechaEntregaRequerida: string;
    estado: 'BORRADOR' | 'ENVIADA' | 'CONFIRMADA' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA';

    // Proveedor
    proveedor: {
        nombre: string;
        nit: string;
        direccion: string;
        telefono?: string;
        email?: string;
        contacto?: string;
    };

    // Referencia (orden de servicio, cotización, etc.)
    referencia?: {
        tipo: string;
        numero: string;
    };

    // Items
    items: ItemOrdenCompraPDF[];

    // Totales
    totales: {
        subtotal: number;
        descuentoPorcentaje: number;
        descuentoValor: number;
        ivaPorcentaje: number;
        ivaValor: number;
        total: number;
    };

    // Condiciones
    condicionesPago: string;
    lugarEntrega: string;
    instruccionesEspeciales?: string;

    // Aprobación
    solicitadoPor: string;
    aprobadoPor?: string;
    fechaAprobacion?: string;
}

export interface ItemOrdenCompraPDF {
    orden: number;
    codigoProveedor?: string;
    codigoInterno?: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    descuentoPorcentaje: number;
    subtotal: number;
    notas?: string;
}

/**
 * Genera el HTML de la orden de compra
 */
export function generarOrdenCompraHTML(datos: DatosOrdenCompraPDF): string {
    const brand = resolveOrgBranding(datos.branding);
    const formatMoney = (n: number) => formatCurrencyOrg(n, brand);

    const getEstadoStyle = (estado: string) => {
        switch (estado) {
            case 'BORRADOR': return 'background: #e0e0e0; color: #666;';
            case 'ENVIADA': return `background: ${MEKANOS_COLORS.secondary}; color: white;`;
            case 'CONFIRMADA': return `background: ${MEKANOS_COLORS.success}; color: white;`;
            case 'EN_TRANSITO': return `background: ${MEKANOS_COLORS.warning}; color: white;`;
            case 'RECIBIDA': return `background: ${MEKANOS_COLORS.primary}; color: white;`;
            case 'CANCELADA': return `background: ${MEKANOS_COLORS.danger}; color: white;`;
            default: return '';
        }
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de Compra ${datos.numeroOrdenCompra}</title>
    <style>
        ${buildBrandCssVars(brand)}
        ${baseStyles}
        
        .oc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid ${MEKANOS_COLORS.primary};
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        
        .oc-title {
            font-size: 18px;
            font-weight: bold;
            color: ${MEKANOS_COLORS.primary};
        }
        
        .oc-number {
            font-size: 16px;
            font-weight: bold;
            color: ${MEKANOS_COLORS.secondary};
        }
        
        .estado-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            ${getEstadoStyle(datos.estado)}
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-box {
            background: ${MEKANOS_COLORS.background};
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid ${MEKANOS_COLORS.primary};
        }
        
        .info-box h4 {
            font-size: 10px;
            color: ${MEKANOS_COLORS.secondary};
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            margin-bottom: 4px;
        }
        
        .info-label {
            color: ${COLORS.textLight};
        }
        
        .info-value {
            font-weight: 500;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9px;
        }
        
        .items-table th {
            background: ${MEKANOS_COLORS.primary};
            color: white;
            padding: 8px 6px;
            text-align: left;
        }
        
        .items-table td {
            padding: 6px;
            border-bottom: 1px solid ${MEKANOS_COLORS.border};
        }
        
        .items-table tr:nth-child(even) {
            background: ${MEKANOS_COLORS.background};
        }
        
        .totales-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
        }
        
        .totales-box {
            width: 280px;
            background: ${MEKANOS_COLORS.background};
            padding: 15px;
            border-radius: 6px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 10px;
        }
        
        .total-row.final {
            border-top: 2px solid ${MEKANOS_COLORS.primary};
            margin-top: 8px;
            padding-top: 10px;
            font-size: 14px;
            font-weight: bold;
            color: ${MEKANOS_COLORS.primary};
        }
        
        .condiciones-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .condicion-box {
            background: ${MEKANOS_COLORS.background};
            padding: 10px;
            border-radius: 4px;
            text-align: center;
        }
        
        .condicion-label {
            font-size: 8px;
            color: ${COLORS.textLight};
            margin-bottom: 4px;
        }
        
        .condicion-value {
            font-size: 10px;
            font-weight: bold;
            color: ${MEKANOS_COLORS.primary};
        }
        
        .instrucciones-box {
            background: #fffef0;
            border: 1px solid ${MEKANOS_COLORS.warning};
            border-left: 4px solid ${MEKANOS_COLORS.warning};
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 9px;
        }
        
        .firmas-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
        }
        
        .firma-box {
            text-align: center;
        }
        
        .firma-line {
            border-top: 1px solid ${MEKANOS_COLORS.text};
            padding-top: 8px;
            margin-top: 50px;
        }
        
        .footer-oc {
            text-align: center;
            font-size: 7px;
            color: ${COLORS.textLight};
            border-top: 1px solid ${MEKANOS_COLORS.border};
            padding-top: 10px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- HEADER -->
        <div class="oc-header">
            <div>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    ${renderOrgLogoHtml(brand, 48, 'light')}
                    <div style="font-size: 8px; color: ${COLORS.textLight};">
                        ${brand.numeroIdFiscal ? `${escapeBrandHtml(brand.tipoIdFiscal)}: ${escapeBrandHtml(brand.numeroIdFiscal)}` : ''}
                    </div>
                </div>
                <div class="oc-title">ORDEN DE COMPRA</div>
            </div>
            <div style="text-align: right;">
                <div class="oc-number">${datos.numeroOrdenCompra}</div>
                <div style="font-size: 9px; color: ${COLORS.textLight}; margin: 5px 0;">
                    Emisión: ${datos.fechaEmision}
                </div>
                <div style="font-size: 9px; color: ${MEKANOS_COLORS.danger}; font-weight: 500; margin-bottom: 8px;">
                    Entrega requerida: ${datos.fechaEntregaRequerida}
                </div>
                <span class="estado-badge">${datos.estado}</span>
            </div>
        </div>
        
        <!-- INFO PROVEEDOR Y REFERENCIA -->
        <div class="info-grid">
            <div class="info-box">
                <h4>🏢 Proveedor</h4>
                <div class="info-row">
                    <span class="info-label">Razón Social:</span>
                    <span class="info-value">${datos.proveedor.nombre}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">NIT:</span>
                    <span class="info-value">${datos.proveedor.nit}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dirección:</span>
                    <span class="info-value">${datos.proveedor.direccion}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${datos.proveedor.telefono || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${datos.proveedor.email || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Contacto:</span>
                    <span class="info-value">${datos.proveedor.contacto || 'N/A'}</span>
                </div>
            </div>
            
            <div class="info-box">
                <h4>📋 Información de la Orden</h4>
                ${datos.referencia ? `
                <div class="info-row">
                    <span class="info-label">Referencia:</span>
                    <span class="info-value">${datos.referencia.tipo}: ${datos.referencia.numero}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Lugar de Entrega:</span>
                    <span class="info-value">${datos.lugarEntrega}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Condiciones de Pago:</span>
                    <span class="info-value">${datos.condicionesPago}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Solicitado por:</span>
                    <span class="info-value">${datos.solicitadoPor}</span>
                </div>
                ${datos.aprobadoPor ? `
                <div class="info-row">
                    <span class="info-label">Aprobado por:</span>
                    <span class="info-value">${datos.aprobadoPor}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- TABLA DE ITEMS -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 4%;">#</th>
                    <th style="width: 10%;">Código Prov.</th>
                    <th style="width: 10%;">Código Int.</th>
                    <th style="width: 32%;">Descripción</th>
                    <th style="width: 8%;" class="text-center">Cant.</th>
                    <th style="width: 6%;">Und.</th>
                    <th style="width: 12%;" class="text-right">P. Unit.</th>
                    <th style="width: 6%;" class="text-center">Dto%</th>
                    <th style="width: 12%;" class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${datos.items.map(item => `
                <tr>
                    <td class="text-center">${item.orden}</td>
                    <td>${item.codigoProveedor || '-'}</td>
                    <td>${item.codigoInterno || '-'}</td>
                    <td>
                        ${item.descripcion}
                        ${item.notas ? `<br><small style="color: ${COLORS.textLight};">${item.notas}</small>` : ''}
                    </td>
                    <td class="text-center">${item.cantidad}</td>
                    <td>${item.unidad}</td>
                    <td class="text-right">${formatMoney(item.precioUnitario)}</td>
                    <td class="text-center">${item.descuentoPorcentaje > 0 ? item.descuentoPorcentaje + '%' : '-'}</td>
                    <td class="text-right">${formatMoney(item.subtotal)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- TOTALES -->
        <div class="totales-section">
            <div class="totales-box">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${formatMoney(datos.totales.subtotal)}</span>
                </div>
                ${datos.totales.descuentoValor > 0 ? `
                <div class="total-row" style="color: ${MEKANOS_COLORS.success};">
                    <span>Descuento (${datos.totales.descuentoPorcentaje}%):</span>
                    <span>- ${formatMoney(datos.totales.descuentoValor)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>${escapeBrandHtml(brand.etiquetaImpuesto)} (${datos.totales.ivaPorcentaje}%):</span>
                    <span>${formatMoney(datos.totales.ivaValor)}</span>
                </div>
                <div class="total-row final">
                    <span>TOTAL ORDEN:</span>
                    <span>${formatMoney(datos.totales.total)}</span>
                </div>
            </div>
        </div>
        
        <!-- INSTRUCCIONES ESPECIALES -->
        ${datos.instruccionesEspeciales ? `
        <div class="instrucciones-box">
            <strong>⚠️ Instrucciones Especiales:</strong><br>
            ${datos.instruccionesEspeciales}
        </div>
        ` : ''}
        
        <!-- FIRMAS -->
        <div class="firmas-section">
            <div class="firma-box">
                <div class="firma-line">
                    <div style="font-weight: bold; font-size: 10px;">${datos.solicitadoPor}</div>
                    <div style="font-size: 8px; color: ${COLORS.textLight};">Solicitado por</div>
                </div>
            </div>
            <div class="firma-box">
                <div class="firma-line">
                    <div style="font-weight: bold; font-size: 10px;">${datos.aprobadoPor || '________________'}</div>
                    <div style="font-size: 8px; color: ${COLORS.textLight};">Aprobado por</div>
                </div>
            </div>
        </div>
        
        <!-- FOOTER -->
        ${generarFooterCorporativoHtml(brand, 'Este documento es válido como orden de compra oficial. Cualquier discrepancia debe ser notificada antes de la entrega.')}
    </div>
</body>
</html>
    `.trim();
}

export default generarOrdenCompraHTML;
