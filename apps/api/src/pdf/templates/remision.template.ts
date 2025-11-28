/**
 * Template MEKANOS - Remisión de Materiales
 *
 * Documento interno para transferencia de materiales/repuestos
 * del almacén al técnico para una orden de servicio.
 *
 * Incluye:
 * - Información de la orden asociada
 * - Técnico receptor
 * - Listado de items entregados
 * - Firmas de entrega/recepción
 */

import { baseStyles, MEKANOS_COLORS } from './mekanos-base.template';

// Extender colores
const COLORS = {
    ...MEKANOS_COLORS,
    textLight: '#666666',
};

export interface DatosRemisionPDF {
    // Identificación
    numeroRemision: string;
    fechaEmision: string;
    horaEmision: string;
    estado: 'PENDIENTE' | 'ENTREGADA' | 'CANCELADA';

    // Orden asociada
    ordenServicio: {
        numeroOrden: string;
        cliente: string;
        ubicacion: string;
        tipoServicio: string;
    };

    // Técnico receptor
    tecnicoReceptor: {
        nombre: string;
        cargo: string;
        identificacion: string;
    };

    // Responsable de bodega
    responsableBodega: {
        nombre: string;
        cargo: string;
    };

    // Items de la remisión
    items: ItemRemisionPDF[];

    // Observaciones
    observaciones?: string;

    // Datos de entrega (si ya fue entregada)
    entrega?: {
        fechaEntrega: string;
        horaEntrega: string;
        firmaTecnico?: string; // Base64
    };
}

export interface ItemRemisionPDF {
    orden: number;
    codigoInterno: string;
    descripcion: string;
    referencia?: string;
    unidad: string;
    cantidadSolicitada: number;
    cantidadEntregada: number;
    ubicacionBodega?: string;
    lote?: string;
    observaciones?: string;
}

/**
 * Genera el HTML de la remisión
 */
export function generarRemisionHTML(datos: DatosRemisionPDF): string {
    const getEstadoStyle = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE':
                return `background: ${MEKANOS_COLORS.warning}; color: white;`;
            case 'ENTREGADA':
                return `background: ${MEKANOS_COLORS.success}; color: white;`;
            case 'CANCELADA':
                return `background: ${MEKANOS_COLORS.danger}; color: white;`;
            default:
                return '';
        }
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Remisión ${datos.numeroRemision}</title>
    <style>
        ${baseStyles}
        
        .remision-page {
            width: 210mm;
            min-height: 148mm; /* Media carta */
            padding: 10mm;
            background: white;
        }
        
        .remision-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid ${MEKANOS_COLORS.primary};
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        .remision-title {
            font-size: 16px;
            font-weight: bold;
            color: ${MEKANOS_COLORS.primary};
        }
        
        .remision-number {
            font-size: 14px;
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
            margin-bottom: 15px;
        }
        
        .info-box {
            background: ${MEKANOS_COLORS.background};
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid ${MEKANOS_COLORS.primary};
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
            margin-bottom: 3px;
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
            margin-bottom: 15px;
            font-size: 9px;
        }
        
        .items-table th {
            background: ${MEKANOS_COLORS.primary};
            color: white;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 5px 4px;
            border-bottom: 1px solid ${MEKANOS_COLORS.border};
        }
        
        .items-table tr:nth-child(even) {
            background: ${MEKANOS_COLORS.background};
        }
        
        .qty-match {
            color: ${MEKANOS_COLORS.success};
            font-weight: bold;
        }
        
        .qty-partial {
            color: ${MEKANOS_COLORS.warning};
            font-weight: bold;
        }
        
        .observaciones-box {
            background: ${MEKANOS_COLORS.background};
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
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
        
        .firma-name {
            font-weight: bold;
            font-size: 10px;
        }
        
        .firma-cargo {
            font-size: 8px;
            color: ${COLORS.textLight};
        }
        
        .footer-remision {
            text-align: center;
            font-size: 7px;
            color: ${COLORS.textLight};
            border-top: 1px solid ${MEKANOS_COLORS.border};
            padding-top: 8px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="remision-page">
        <!-- HEADER -->
        <div class="remision-header">
            <div>
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 40px; height: 40px; background: ${MEKANOS_COLORS.primary}; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; margin-right: 10px;">MK</div>
                    <div>
                        <div style="font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.primary};">MEKANOS S.A.S</div>
                        <div style="font-size: 8px; color: ${COLORS.textLight};">NIT: 900.123.456-7</div>
                    </div>
                </div>
                <div class="remision-title">REMISIÓN DE MATERIALES</div>
            </div>
            <div style="text-align: right;">
                <div class="remision-number">${datos.numeroRemision}</div>
                <div style="font-size: 9px; color: ${COLORS.textLight}; margin: 5px 0;">
                    Fecha: ${datos.fechaEmision} | Hora: ${datos.horaEmision}
                </div>
                <span class="estado-badge">${datos.estado}</span>
            </div>
        </div>
        
        <!-- INFO GRID -->
        <div class="info-grid">
            <div class="info-box">
                <h4>📋 Orden de Servicio</h4>
                <div class="info-row">
                    <span class="info-label">Número:</span>
                    <span class="info-value">${datos.ordenServicio.numeroOrden}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cliente:</span>
                    <span class="info-value">${datos.ordenServicio.cliente}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ubicación:</span>
                    <span class="info-value">${datos.ordenServicio.ubicacion}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tipo Servicio:</span>
                    <span class="info-value">${datos.ordenServicio.tipoServicio}</span>
                </div>
            </div>
            
            <div class="info-box">
                <h4>👷 Técnico Receptor</h4>
                <div class="info-row">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${datos.tecnicoReceptor.nombre}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cargo:</span>
                    <span class="info-value">${datos.tecnicoReceptor.cargo}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Identificación:</span>
                    <span class="info-value">${datos.tecnicoReceptor.identificacion}</span>
                </div>
            </div>
        </div>
        
        <!-- TABLA DE ITEMS -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 12%;">Código</th>
                    <th style="width: 35%;">Descripción</th>
                    <th style="width: 12%;">Referencia</th>
                    <th style="width: 8%;">Unidad</th>
                    <th style="width: 8%;" class="text-center">Solic.</th>
                    <th style="width: 8%;" class="text-center">Entreg.</th>
                    <th style="width: 12%;">Ubicación</th>
                </tr>
            </thead>
            <tbody>
                ${datos.items
            .map(
                (item) => `
                <tr>
                    <td class="text-center">${item.orden}</td>
                    <td><strong>${item.codigoInterno}</strong></td>
                    <td>${item.descripcion}</td>
                    <td>${item.referencia || '-'}</td>
                    <td>${item.unidad}</td>
                    <td class="text-center">${item.cantidadSolicitada}</td>
                    <td class="text-center ${item.cantidadEntregada === item.cantidadSolicitada ? 'qty-match' : 'qty-partial'}">
                        ${item.cantidadEntregada}
                    </td>
                    <td style="font-size: 8px;">${item.ubicacionBodega || '-'}</td>
                </tr>
                `,
            )
            .join('')}
            </tbody>
        </table>
        
        <!-- OBSERVACIONES -->
        ${datos.observaciones
            ? `
        <div class="observaciones-box">
            <strong>Observaciones:</strong><br>
            ${datos.observaciones}
        </div>
        `
            : ''
        }
        
        <!-- FIRMAS -->
        <div class="firmas-section">
            <div class="firma-box">
                <div class="firma-line">
                    <div class="firma-name">${datos.responsableBodega.nombre}</div>
                    <div class="firma-cargo">${datos.responsableBodega.cargo}</div>
                    <div class="firma-cargo">Entrega</div>
                </div>
            </div>
            <div class="firma-box">
                <div class="firma-line">
                    ${datos.entrega?.firmaTecnico
            ? `<img src="${datos.entrega.firmaTecnico}" style="max-height: 40px; margin-bottom: 5px;" />`
            : ''
        }
                    <div class="firma-name">${datos.tecnicoReceptor.nombre}</div>
                    <div class="firma-cargo">${datos.tecnicoReceptor.cargo}</div>
                    <div class="firma-cargo">Recibe</div>
                </div>
            </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer-remision">
            <strong>MEKANOS S.A.S</strong> - Documento interno de transferencia de materiales<br>
            Conserve este documento como soporte de la entrega.
        </div>
    </div>
</body>
</html>
    `.trim();
}

export default generarRemisionHTML;
