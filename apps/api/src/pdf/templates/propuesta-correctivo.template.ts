/**
 * Template MEKANOS - Propuesta de Correctivo
 *
 * Documento técnico-comercial que se genera tras una inspección
 * para proponer trabajos correctivos al cliente.
 *
 * Incluye:
 * - Header con datos del problema detectado
 * - Diagnóstico técnico
 * - Solución propuesta con alcance
 * - Listado de repuestos necesarios
 * - Estimación de costos
 * - Urgencia y recomendación
 * - Términos y condiciones
 */

import { baseStyles, MEKANOS_COLORS } from './mekanos-base.template';

// Extender colores para este template
const COLORS = {
    ...MEKANOS_COLORS,
    textLight: '#666666',
};

export interface DatosPropuestaCorrectivoPDF {
    // Identificación
    numeroPropuesta: string;
    fechaPropuesta: string;
    version: number;
    prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

    // Orden de origen
    ordenServicioOrigen?: {
        numeroOrden: string;
        fechaServicio: string;
        tipoServicio: string;
        tecnicoInspector: string;
    };

    // Cliente
    cliente: {
        nombre: string;
        nit?: string;
        direccion: string;
        telefono?: string;
        email?: string;
        contacto?: string;
    };

    // Equipo afectado
    equipo: {
        tipoEquipo: string;
        marca: string;
        modelo?: string;
        serie?: string;
        ubicacion?: string;
        horasOperacion?: number;
    };

    // Problema detectado
    problemaDetectado: {
        descripcion: string;
        sintomas: string[];
        sistemasAfectados: string[];
        nivelCriticidad: 'LEVE' | 'MODERADO' | 'CRITICO' | 'EMERGENCIA';
        observacionesTecnico?: string;
    };

    // Diagnóstico
    diagnostico: {
        causaProbable: string;
        analisisTecnico: string;
        riesgosNoActuar: string[];
    };

    // Solución propuesta
    solucionPropuesta: {
        descripcion: string;
        alcanceTrabajo: string[];
        exclusiones?: string[];
        tiempoEstimadoHoras: number;
        requiereParadaEquipo: boolean;
    };

    // Items de repuestos
    itemsRepuestos: ItemRepuestoPDF[];

    // Items de mano de obra
    itemsManoObra: ItemManoObraPDF[];

    // Costos
    costos: {
        subtotalRepuestos: number;
        subtotalManoObra: number;
        subtotalGeneral: number;
        descuentoPorcentaje: number;
        descuentoValor: number;
        ivaPorcentaje: number;
        ivaValor: number;
        totalPropuesta: number;
    };

    // Condiciones
    formaPago: string;
    diasValidez: number;
    mesesGarantia: number;

    // Elaboración
    elaboradoPor: string;
    cargoElaborador?: string;
}

export interface ItemRepuestoPDF {
    orden: number;
    descripcion: string;
    referencia?: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    subtotal: number;
}

export interface ItemManoObraPDF {
    orden: number;
    descripcion: string;
    horas: number;
    tarifaHora: number;
    subtotal: number;
}

/**
 * Genera el HTML completo de la propuesta de correctivo
 */
export function generarPropuestaCorrectivoHTML(datos: DatosPropuestaCorrectivoPDF): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Propuesta Correctivo ${datos.numeroPropuesta}</title>
    <style>
        ${baseStyles}
        
        /* Estilos específicos propuesta correctivo */
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .priority-BAJA { background: #e0e0e0; color: #666; }
        .priority-NORMAL { background: ${MEKANOS_COLORS.secondary}; color: white; }
        .priority-ALTA { background: ${MEKANOS_COLORS.warning}; color: white; }
        .priority-URGENTE { background: ${MEKANOS_COLORS.danger}; color: white; }
        
        .criticality-box {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .criticality-LEVE { background: #e8f5e9; border-left: 4px solid #4caf50; }
        .criticality-MODERADO { background: #fff3e0; border-left: 4px solid ${MEKANOS_COLORS.warning}; }
        .criticality-CRITICO { background: #ffebee; border-left: 4px solid ${MEKANOS_COLORS.danger}; }
        .criticality-EMERGENCIA { background: #f3e5f5; border-left: 4px solid #9c27b0; }
        
        .symptoms-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        .symptom-tag {
            background: ${MEKANOS_COLORS.background};
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 9px;
            border: 1px solid ${MEKANOS_COLORS.border};
        }
        
        .risk-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        .risk-icon {
            color: ${MEKANOS_COLORS.danger};
            margin-right: 8px;
            font-weight: bold;
        }
        
        .alcance-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 6px;
            font-size: 9px;
        }
        .alcance-icon {
            color: ${MEKANOS_COLORS.success};
            margin-right: 8px;
        }
        
        .exclusion-item {
            color: ${COLORS.textLight};
            font-size: 8px;
            margin-bottom: 4px;
        }
        
        .time-estimate {
            display: inline-flex;
            align-items: center;
            background: ${MEKANOS_COLORS.secondary};
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="page">
        ${generarHeader(datos)}
        ${generarInfoOrigenCliente(datos)}
        ${generarProblemaDetectado(datos)}
        ${generarDiagnostico(datos)}
        ${generarSolucionPropuesta(datos)}
        ${generarTablaRepuestos(datos)}
        ${generarTablaManoObra(datos)}
        ${generarResumenCostos(datos)}
        ${generarCondiciones(datos)}
        ${generarFirmas(datos)}
        ${generarFooter()}
    </div>
</body>
</html>
  `.trim();
}

function generarHeader(datos: DatosPropuestaCorrectivoPDF): string {
    return `
    <div class="header">
        <div class="logo-section">
            <div class="logo">
                <span style="font-size: 16px; font-weight: bold; color: white;">MEKANOS</span>
            </div>
            <div class="company-info">
                <h1 style="font-size: 20px; color: ${MEKANOS_COLORS.primary}; margin: 0;">MEKANOS S.A.S</h1>
                <p style="font-size: 9px; color: ${COLORS.textLight}; margin: 2px 0;">Especialistas en Equipos Electrógenos</p>
                <p style="font-size: 9px; color: ${COLORS.textLight}; margin: 0;">NIT: 900.123.456-7</p>
            </div>
        </div>
        <div class="quote-info" style="text-align: right;">
            <div style="font-size: 12px; color: ${MEKANOS_COLORS.primary}; font-weight: bold;">PROPUESTA DE CORRECTIVO</div>
            <div style="font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.secondary}; margin: 5px 0;">${datos.numeroPropuesta}</div>
            <div style="font-size: 9px; color: ${COLORS.textLight};">Fecha: ${datos.fechaPropuesta}</div>
            <div style="margin-top: 8px;">
                <span class="priority-badge priority-${datos.prioridad}">${datos.prioridad}</span>
            </div>
        </div>
    </div>
  `;
}

function generarInfoOrigenCliente(datos: DatosPropuestaCorrectivoPDF): string {
    return `
    <div class="section">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            ${datos.ordenServicioOrigen ? `
            <div class="data-box">
                <h3 style="font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 10px;">📋 ORDEN DE ORIGEN</h3>
                <div class="data-row">
                    <span class="data-label">Número:</span>
                    <span class="data-value">${datos.ordenServicioOrigen.numeroOrden}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Fecha Servicio:</span>
                    <span class="data-value">${datos.ordenServicioOrigen.fechaServicio}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Tipo:</span>
                    <span class="data-value">${datos.ordenServicioOrigen.tipoServicio}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Técnico:</span>
                    <span class="data-value">${datos.ordenServicioOrigen.tecnicoInspector}</span>
                </div>
            </div>
            ` : ''}
            
            <div class="data-box">
                <h3 style="font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 10px;">👤 CLIENTE</h3>
                <div class="data-row">
                    <span class="data-label">Empresa:</span>
                    <span class="data-value">${datos.cliente.nombre}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">NIT:</span>
                    <span class="data-value">${datos.cliente.nit || 'N/A'}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Dirección:</span>
                    <span class="data-value">${datos.cliente.direccion}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Contacto:</span>
                    <span class="data-value">${datos.cliente.contacto || 'N/A'}</span>
                </div>
            </div>
            
            <div class="data-box">
                <h3 style="font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 10px;">⚙️ EQUIPO</h3>
                <div class="data-row">
                    <span class="data-label">Tipo:</span>
                    <span class="data-value">${datos.equipo.tipoEquipo}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Marca/Modelo:</span>
                    <span class="data-value">${datos.equipo.marca} ${datos.equipo.modelo || ''}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Serie:</span>
                    <span class="data-value">${datos.equipo.serie || 'N/A'}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Ubicación:</span>
                    <span class="data-value">${datos.equipo.ubicacion || 'N/A'}</span>
                </div>
                ${datos.equipo.horasOperacion ? `
                <div class="data-row">
                    <span class="data-label">Horas Operación:</span>
                    <span class="data-value">${datos.equipo.horasOperacion.toLocaleString()} hrs</span>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
  `;
}

function generarProblemaDetectado(datos: DatosPropuestaCorrectivoPDF): string {
    const p = datos.problemaDetectado;
    return `
    <div class="section">
        <div class="section-title">🔴 PROBLEMA DETECTADO</div>
        
        <div class="criticality-box criticality-${p.nivelCriticidad}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 11px;">Nivel de Criticidad: ${p.nivelCriticidad}</strong>
                <span style="font-size: 9px; color: ${COLORS.textLight};">
                    Sistemas afectados: ${p.sistemasAfectados.join(', ')}
                </span>
            </div>
            
            <p style="font-size: 10px; margin-bottom: 10px;">${p.descripcion}</p>
            
            <div class="symptoms-list">
                <strong style="font-size: 9px; width: 100%; margin-bottom: 5px;">Síntomas observados:</strong>
                ${p.sintomas.map(s => `<span class="symptom-tag">• ${s}</span>`).join('')}
            </div>
            
            ${p.observacionesTecnico ? `
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed ${MEKANOS_COLORS.border};">
                <strong style="font-size: 9px;">Observaciones del técnico:</strong>
                <p style="font-size: 9px; font-style: italic; margin-top: 5px;">"${p.observacionesTecnico}"</p>
            </div>
            ` : ''}
        </div>
    </div>
  `;
}

function generarDiagnostico(datos: DatosPropuestaCorrectivoPDF): string {
    const d = datos.diagnostico;
    return `
    <div class="section">
        <div class="section-title">🔍 DIAGNÓSTICO TÉCNICO</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="data-box">
                <h3 style="font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 10px;">Causa Probable</h3>
                <p style="font-size: 10px; font-weight: 500;">${d.causaProbable}</p>
                
                <h3 style="font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin: 15px 0 10px 0;">Análisis Técnico</h3>
                <p style="font-size: 9px;">${d.analisisTecnico}</p>
            </div>
            
            <div class="data-box" style="background: #fff5f5; border-color: ${MEKANOS_COLORS.danger};">
                <h3 style="font-size: 10px; color: ${MEKANOS_COLORS.danger}; margin-bottom: 10px;">⚠️ Riesgos de No Actuar</h3>
                ${d.riesgosNoActuar.map(r => `
                <div class="risk-item">
                    <span class="risk-icon">!</span>
                    <span style="font-size: 9px;">${r}</span>
                </div>
                `).join('')}
            </div>
        </div>
    </div>
  `;
}

function generarSolucionPropuesta(datos: DatosPropuestaCorrectivoPDF): string {
    const s = datos.solucionPropuesta;
    return `
    <div class="section">
        <div class="section-title">✅ SOLUCIÓN PROPUESTA</div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
            <div class="data-box">
                <p style="font-size: 10px; font-weight: 500; margin-bottom: 12px;">${s.descripcion}</p>
                
                <h4 style="font-size: 9px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 8px;">Alcance del trabajo:</h4>
                ${s.alcanceTrabajo.map(a => `
                <div class="alcance-item">
                    <span class="alcance-icon">✓</span>
                    <span>${a}</span>
                </div>
                `).join('')}
                
                ${s.exclusiones && s.exclusiones.length > 0 ? `
                <h4 style="font-size: 9px; color: ${COLORS.textLight}; margin: 12px 0 8px 0;">No incluye:</h4>
                ${s.exclusiones.map(e => `
                <div class="exclusion-item">✗ ${e}</div>
                `).join('')}
                ` : ''}
            </div>
            
            <div style="text-align: center;">
                <div class="time-estimate">
                    🕐 ${s.tiempoEstimadoHoras} horas estimadas
                </div>
                
                ${s.requiereParadaEquipo ? `
                <div style="margin-top: 15px; background: ${MEKANOS_COLORS.warning}15; padding: 10px; border-radius: 8px;">
                    <span style="font-size: 9px; color: ${MEKANOS_COLORS.warning};">
                        ⚠️ Requiere parada del equipo
                    </span>
                </div>
                ` : `
                <div style="margin-top: 15px; background: ${MEKANOS_COLORS.success}15; padding: 10px; border-radius: 8px;">
                    <span style="font-size: 9px; color: ${MEKANOS_COLORS.success};">
                        ✓ Sin interrupción de servicio
                    </span>
                </div>
                `}
            </div>
        </div>
    </div>
  `;
}

function generarTablaRepuestos(datos: DatosPropuestaCorrectivoPDF): string {
    if (!datos.itemsRepuestos || datos.itemsRepuestos.length === 0) return '';

    const formatNumber = (n: number) => n.toLocaleString('es-CO');

    return `
    <div class="section">
        <div class="section-title">🔩 REPUESTOS Y MATERIALES</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 40%;">Descripción</th>
                    <th style="width: 15%;">Referencia</th>
                    <th style="width: 10%;" class="text-center">Cant.</th>
                    <th style="width: 15%;" class="text-right">Precio Unit.</th>
                    <th style="width: 15%;" class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${datos.itemsRepuestos.map(item => `
                <tr>
                    <td class="text-center">${item.orden}</td>
                    <td>${item.descripcion}</td>
                    <td>${item.referencia || '-'}</td>
                    <td class="text-center">${item.cantidad} ${item.unidad}</td>
                    <td class="text-right">$ ${formatNumber(item.precioUnitario)}</td>
                    <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                </tr>
                `).join('')}
                <tr style="background: ${MEKANOS_COLORS.secondary}15;">
                    <td colspan="5" class="text-right" style="font-weight: bold;">Subtotal Repuestos:</td>
                    <td class="text-right" style="font-weight: bold;">$ ${formatNumber(datos.costos.subtotalRepuestos)}</td>
                </tr>
            </tbody>
        </table>
    </div>
  `;
}

function generarTablaManoObra(datos: DatosPropuestaCorrectivoPDF): string {
    if (!datos.itemsManoObra || datos.itemsManoObra.length === 0) return '';

    const formatNumber = (n: number) => n.toLocaleString('es-CO');

    return `
    <div class="section">
        <div class="section-title">👷 MANO DE OBRA</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 50%;">Descripción</th>
                    <th style="width: 15%;" class="text-center">Horas</th>
                    <th style="width: 15%;" class="text-right">Tarifa/Hora</th>
                    <th style="width: 15%;" class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${datos.itemsManoObra.map(item => `
                <tr>
                    <td class="text-center">${item.orden}</td>
                    <td>${item.descripcion}</td>
                    <td class="text-center">${item.horas}</td>
                    <td class="text-right">$ ${formatNumber(item.tarifaHora)}</td>
                    <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                </tr>
                `).join('')}
                <tr style="background: ${MEKANOS_COLORS.secondary}15;">
                    <td colspan="4" class="text-right" style="font-weight: bold;">Subtotal Mano de Obra:</td>
                    <td class="text-right" style="font-weight: bold;">$ ${formatNumber(datos.costos.subtotalManoObra)}</td>
                </tr>
            </tbody>
        </table>
    </div>
  `;
}

function generarResumenCostos(datos: DatosPropuestaCorrectivoPDF): string {
    const formatNumber = (n: number) => n.toLocaleString('es-CO');
    const c = datos.costos;

    return `
    <div class="section">
        <div style="display: flex; justify-content: flex-end;">
            <div style="width: 300px; background: ${MEKANOS_COLORS.background}; padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px;">
                    <span>Subtotal Repuestos:</span>
                    <span>$ ${formatNumber(c.subtotalRepuestos)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px;">
                    <span>Subtotal Mano de Obra:</span>
                    <span>$ ${formatNumber(c.subtotalManoObra)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px; font-weight: 500;">
                    <span>Subtotal General:</span>
                    <span>$ ${formatNumber(c.subtotalGeneral)}</span>
                </div>
                ${c.descuentoValor > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px; color: ${MEKANOS_COLORS.success};">
                    <span>Descuento (${c.descuentoPorcentaje}%):</span>
                    <span>- $ ${formatNumber(c.descuentoValor)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px;">
                    <span>IVA (${c.ivaPorcentaje}%):</span>
                    <span>$ ${formatNumber(c.ivaValor)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0; margin-top: 8px; border-top: 2px solid ${MEKANOS_COLORS.primary}; font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.primary};">
                    <span>TOTAL PROPUESTA:</span>
                    <span>$ ${formatNumber(c.totalPropuesta)}</span>
                </div>
            </div>
        </div>
    </div>
  `;
}

function generarCondiciones(datos: DatosPropuestaCorrectivoPDF): string {
    return `
    <div class="section">
        <div class="section-title">📋 CONDICIONES</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 6px; text-align: center;">
                <div style="font-size: 8px; color: ${COLORS.textLight};">Forma de Pago</div>
                <div style="font-size: 10px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; margin-top: 4px;">${datos.formaPago}</div>
            </div>
            <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 6px; text-align: center;">
                <div style="font-size: 8px; color: ${COLORS.textLight};">Tiempo Estimado</div>
                <div style="font-size: 10px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; margin-top: 4px;">${datos.solucionPropuesta.tiempoEstimadoHoras} horas</div>
            </div>
            <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 6px; text-align: center;">
                <div style="font-size: 8px; color: ${COLORS.textLight};">Garantía</div>
                <div style="font-size: 10px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; margin-top: 4px;">${datos.mesesGarantia} meses</div>
            </div>
            <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 6px; text-align: center;">
                <div style="font-size: 8px; color: ${COLORS.textLight};">Validez</div>
                <div style="font-size: 10px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; margin-top: 4px;">${datos.diasValidez} días</div>
            </div>
        </div>
    </div>
  `;
}

function generarFirmas(datos: DatosPropuestaCorrectivoPDF): string {
    return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 40px;">
        <div style="text-align: center;">
            <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 8px; margin-top: 50px;">
                <div style="font-weight: bold; font-size: 10px;">${datos.elaboradoPor}</div>
                <div style="font-size: 8px; color: ${COLORS.textLight};">${datos.cargoElaborador || 'Ingeniero de Servicio'}</div>
                <div style="font-size: 8px; color: ${COLORS.textLight};">MEKANOS S.A.S</div>
            </div>
        </div>
        <div style="text-align: center;">
            <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 8px; margin-top: 50px;">
                <div style="font-weight: bold; font-size: 10px;">Firma Cliente</div>
                <div style="font-size: 8px; color: ${COLORS.textLight};">Aprobación de la Propuesta</div>
            </div>
        </div>
    </div>
  `;
}

function generarFooter(): string {
    return `
    <div class="footer">
        <strong>MEKANOS S.A.S</strong> - NIT: 900.123.456-7<br>
        BARRIO LIBANO CRA 49C #31-35 DIAG. AL SENA - Cartagena, Colombia<br>
        TEL: 6359384 | CEL: 315-7083350 | EMAIL: mekanossas2@gmail.com
    </div>
  `;
}

export default generarPropuestaCorrectivoHTML;
