/**
 * Template MEKANOS - Informe de Mantenimiento Correctivo
 *
 * Documento técnico para reportar trabajos correctivos realizados.
 * Diferente al preventivo porque incluye:
 * - Descripción del problema original
 * - Diagnóstico realizado
 * - Trabajos ejecutados (no checklist predefinido)
 * - Repuestos utilizados
 * - Recomendaciones preventivas
 */

import { baseStyles, MEKANOS_COLORS } from './mekanos-base.template';

// Extender colores
const COLORS = {
    ...MEKANOS_COLORS,
    textLight: '#666666',
};

export interface DatosCorrectivoOrdenPDF {
    // Datos generales
    numeroOrden: string;
    fecha: string;
    horaEntrada: string;
    horaSalida: string;
    tipoServicio: string;

    // Cliente
    cliente: string;
    direccion: string;
    contacto?: string;
    telefono?: string;

    // Equipo
    tipoEquipo: string;
    marcaEquipo: string;
    modeloEquipo?: string;
    serieEquipo: string;
    horasOperacion?: number;

    // Técnico
    tecnico: string;
    cargoTecnico?: string;

    // Problema reportado (lo que dijo el cliente)
    problemaReportado: {
        descripcion: string;
        fechaReporte: string;
        reportadoPor?: string;
    };

    // Diagnóstico realizado por el técnico
    diagnostico: {
        descripcion: string;
        causaRaiz: string;
        sistemasAfectados: string[];
    };

    // Trabajos ejecutados
    trabajosEjecutados: TrabajoEjecutadoPDF[];

    // Repuestos utilizados
    repuestosUtilizados: RepuestoUtilizadoPDF[];

    // Mediciones (si aplica)
    mediciones?: MedicionCorrectivoPDF[];

    // Recomendaciones
    recomendaciones: string[];

    // Observaciones
    observaciones?: string;

    // Evidencias
    evidencias?: EvidenciaCorrectivoPDF[];

    // Firmas
    firmaTecnico?: string;
    firmaCliente?: string;
}

export interface TrabajoEjecutadoPDF {
    orden: number;
    descripcion: string;
    sistema: string;
    tiempoHoras: number;
    resultado: 'COMPLETADO' | 'PARCIAL' | 'PENDIENTE';
}

export interface RepuestoUtilizadoPDF {
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    estado: 'NUEVO' | 'REPARADO' | 'USADO';
}

export interface MedicionCorrectivoPDF {
    parametro: string;
    valorAntes?: string;
    valorDespues: string;
    unidad: string;
    estado: 'OK' | 'ADVERTENCIA' | 'CRITICO';
}

export interface EvidenciaCorrectivoPDF {
    tipo: 'ANTES' | 'DURANTE' | 'DESPUES';
    url: string;
    descripcion?: string;
}

/**
 * Genera el HTML del informe de correctivo
 */
export function generarCorrectivoOrdenHTML(datos: DatosCorrectivoOrdenPDF): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Correctivo ${datos.numeroOrden}</title>
    <style>
        ${baseStyles}
        
        .correctivo-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            background: ${MEKANOS_COLORS.warning};
            color: white;
        }
        
        .problema-box {
            background: #fff5f5;
            border: 1px solid ${MEKANOS_COLORS.danger};
            border-left: 4px solid ${MEKANOS_COLORS.danger};
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .diagnostico-box {
            background: #f0f7ff;
            border: 1px solid ${MEKANOS_COLORS.secondary};
            border-left: 4px solid ${MEKANOS_COLORS.secondary};
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .resultado-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
        }
        
        .resultado-COMPLETADO { background: ${MEKANOS_COLORS.success}; color: white; }
        .resultado-PARCIAL { background: ${MEKANOS_COLORS.warning}; color: white; }
        .resultado-PENDIENTE { background: ${MEKANOS_COLORS.danger}; color: white; }
        
        .estado-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: bold;
        }
        
        .estado-NUEVO { background: ${MEKANOS_COLORS.success}; color: white; }
        .estado-REPARADO { background: ${MEKANOS_COLORS.secondary}; color: white; }
        .estado-USADO { background: ${COLORS.textLight}; color: white; }
        
        .recomendacion-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 6px;
            font-size: 9px;
        }
        
        .recomendacion-icon {
            color: ${MEKANOS_COLORS.secondary};
            margin-right: 8px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="page">
        ${generarHeaderCorrectivo(datos)}
        ${generarInfoGeneral(datos)}
        ${generarProblemaReportado(datos)}
        ${generarDiagnostico(datos)}
        ${generarTrabajosEjecutados(datos)}
        ${generarRepuestosUtilizados(datos)}
        ${datos.mediciones && datos.mediciones.length > 0 ? generarMediciones(datos) : ''}
        ${generarRecomendaciones(datos)}
        ${datos.observaciones ? generarObservaciones(datos) : ''}
        ${datos.evidencias && datos.evidencias.length > 0 ? generarEvidencias(datos) : ''}
        ${generarFirmasCorrectivo(datos)}
        ${generarFooterCorrectivo()}
    </div>
</body>
</html>
    `.trim();
}

function generarHeaderCorrectivo(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="header">
        <div class="header-left">
            <div class="logo">
                <span style="font-size: 14px; font-weight: bold;">MEKANOS</span>
            </div>
            <div class="header-title">
                <h1>MEKANOS S.A.S</h1>
                <h2>INFORME DE MANTENIMIENTO CORRECTIVO</h2>
            </div>
        </div>
        <div class="header-right">
            <div class="order-number">${datos.numeroOrden}</div>
            <div style="font-size: 9px; color: ${COLORS.textLight}; margin-top: 5px;">${datos.fecha}</div>
            <div style="margin-top: 5px;"><span class="correctivo-badge">CORRECTIVO</span></div>
        </div>
    </div>
    `;
}

function generarInfoGeneral(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="section">
        <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
            <div class="info-group">
                <div class="info-label">👤 Cliente</div>
                <div class="info-value">${datos.cliente}</div>
                <div style="font-size: 8px; color: ${COLORS.textLight}; margin-top: 3px;">${datos.direccion}</div>
                ${datos.contacto ? `<div style="font-size: 8px; color: ${COLORS.textLight};">Contacto: ${datos.contacto}</div>` : ''}
            </div>
            <div class="info-group">
                <div class="info-label">⚙️ Equipo</div>
                <div class="info-value">${datos.marcaEquipo} ${datos.modeloEquipo || ''}</div>
                <div style="font-size: 8px; color: ${COLORS.textLight}; margin-top: 3px;">
                    Serie: ${datos.serieEquipo}<br>
                    ${datos.horasOperacion ? `Horas: ${datos.horasOperacion.toLocaleString()}` : ''}
                </div>
            </div>
            <div class="info-group">
                <div class="info-label">👷 Técnico / Horario</div>
                <div class="info-value">${datos.tecnico}</div>
                <div style="font-size: 8px; color: ${COLORS.textLight}; margin-top: 3px;">
                    Entrada: ${datos.horaEntrada}<br>
                    Salida: ${datos.horaSalida}
                </div>
            </div>
        </div>
    </div>
    `;
}

function generarProblemaReportado(datos: DatosCorrectivoOrdenPDF): string {
    const p = datos.problemaReportado;
    return `
    <div class="section">
        <div class="section-title">🔴 PROBLEMA REPORTADO</div>
        <div class="problema-box">
            <p style="font-size: 10px; margin-bottom: 8px;">${p.descripcion}</p>
            <div style="display: flex; justify-content: space-between; font-size: 8px; color: ${COLORS.textLight};">
                <span>Fecha reporte: ${p.fechaReporte}</span>
                ${p.reportadoPor ? `<span>Reportado por: ${p.reportadoPor}</span>` : ''}
            </div>
        </div>
    </div>
    `;
}

function generarDiagnostico(datos: DatosCorrectivoOrdenPDF): string {
    const d = datos.diagnostico;
    return `
    <div class="section">
        <div class="section-title">🔍 DIAGNÓSTICO TÉCNICO</div>
        <div class="diagnostico-box">
            <div style="margin-bottom: 10px;">
                <strong style="font-size: 9px;">Descripción:</strong>
                <p style="font-size: 10px; margin-top: 4px;">${d.descripcion}</p>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="font-size: 9px;">Causa Raíz:</strong>
                <p style="font-size: 10px; margin-top: 4px; font-weight: 500;">${d.causaRaiz}</p>
            </div>
            <div>
                <strong style="font-size: 9px;">Sistemas Afectados:</strong>
                <div style="margin-top: 4px;">
                    ${d.sistemasAfectados.map(s => `
                    <span style="display: inline-block; background: ${MEKANOS_COLORS.background}; padding: 3px 8px; border-radius: 3px; font-size: 8px; margin-right: 5px; margin-bottom: 3px;">${s}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;
}

function generarTrabajosEjecutados(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="section">
        <div class="section-title">🔧 TRABAJOS EJECUTADOS</div>
        <table class="checklist-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 45%;">Descripción del Trabajo</th>
                    <th style="width: 20%;">Sistema</th>
                    <th style="width: 10%;" class="text-center">Tiempo</th>
                    <th style="width: 20%;" class="text-center">Resultado</th>
                </tr>
            </thead>
            <tbody>
                ${datos.trabajosEjecutados.map(t => `
                <tr>
                    <td class="text-center">${t.orden}</td>
                    <td>${t.descripcion}</td>
                    <td>${t.sistema}</td>
                    <td class="text-center">${t.tiempoHoras}h</td>
                    <td class="text-center">
                        <span class="resultado-badge resultado-${t.resultado}">${t.resultado}</span>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
}

function generarRepuestosUtilizados(datos: DatosCorrectivoOrdenPDF): string {
    if (!datos.repuestosUtilizados || datos.repuestosUtilizados.length === 0) {
        return `
        <div class="section">
            <div class="section-title">🔩 REPUESTOS UTILIZADOS</div>
            <div style="background: ${MEKANOS_COLORS.background}; padding: 15px; text-align: center; border-radius: 4px; font-size: 9px; color: ${COLORS.textLight};">
                No se utilizaron repuestos en este servicio
            </div>
        </div>
        `;
    }

    return `
    <div class="section">
        <div class="section-title">🔩 REPUESTOS UTILIZADOS</div>
        <table class="checklist-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Código</th>
                    <th style="width: 45%;">Descripción</th>
                    <th style="width: 10%;" class="text-center">Cant.</th>
                    <th style="width: 10%;">Unidad</th>
                    <th style="width: 20%;" class="text-center">Estado</th>
                </tr>
            </thead>
            <tbody>
                ${datos.repuestosUtilizados.map(r => `
                <tr>
                    <td><strong>${r.codigo}</strong></td>
                    <td>${r.descripcion}</td>
                    <td class="text-center">${r.cantidad}</td>
                    <td>${r.unidad}</td>
                    <td class="text-center">
                        <span class="estado-badge estado-${r.estado}">${r.estado}</span>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
}

function generarMediciones(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="section">
        <div class="section-title">📊 MEDICIONES</div>
        <table class="checklist-table">
            <thead>
                <tr>
                    <th style="width: 30%;">Parámetro</th>
                    <th style="width: 20%;" class="text-center">Antes</th>
                    <th style="width: 20%;" class="text-center">Después</th>
                    <th style="width: 15%;">Unidad</th>
                    <th style="width: 15%;" class="text-center">Estado</th>
                </tr>
            </thead>
            <tbody>
                ${datos.mediciones!.map(m => `
                <tr>
                    <td>${m.parametro}</td>
                    <td class="text-center">${m.valorAntes || '-'}</td>
                    <td class="text-center" style="font-weight: bold;">${m.valorDespues}</td>
                    <td>${m.unidad}</td>
                    <td class="text-center alerta-${m.estado}">${m.estado}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
}

function generarRecomendaciones(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="section">
        <div class="section-title">💡 RECOMENDACIONES</div>
        <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 4px;">
            ${datos.recomendaciones.map(r => `
            <div class="recomendacion-item">
                <span class="recomendacion-icon">→</span>
                <span>${r}</span>
            </div>
            `).join('')}
        </div>
    </div>
    `;
}

function generarObservaciones(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="section">
        <div class="section-title">📝 OBSERVACIONES</div>
        <div class="observaciones-box" style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 4px; font-size: 9px;">
            ${datos.observaciones}
        </div>
    </div>
    `;
}

function generarEvidencias(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="section">
        <div class="section-title">📷 EVIDENCIAS FOTOGRÁFICAS</div>
        <div class="evidencias-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            ${datos.evidencias!.map(e => `
            <div class="evidencia-item">
                <img src="${e.url}" style="width: 100%; height: 120px; object-fit: cover;" />
                <div class="evidencia-caption" style="background: ${MEKANOS_COLORS.primary}; color: white; padding: 4px; text-align: center; font-size: 8px;">
                    ${e.tipo}${e.descripcion ? ': ' + e.descripcion : ''}
                </div>
            </div>
            `).join('')}
        </div>
    </div>
    `;
}

function generarFirmasCorrectivo(datos: DatosCorrectivoOrdenPDF): string {
    return `
    <div class="firmas-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
        <div class="firma-box" style="text-align: center;">
            ${datos.firmaTecnico ? `<img src="${datos.firmaTecnico}" style="max-height: 50px; margin-bottom: 5px;" />` : '<div style="height: 50px;"></div>'}
            <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px;">
                <div style="font-weight: bold; font-size: 10px;">${datos.tecnico}</div>
                <div style="font-size: 8px; color: ${COLORS.textLight};">Técnico Ejecutor</div>
            </div>
        </div>
        <div class="firma-box" style="text-align: center;">
            ${datos.firmaCliente ? `<img src="${datos.firmaCliente}" style="max-height: 50px; margin-bottom: 5px;" />` : '<div style="height: 50px;"></div>'}
            <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px;">
                <div style="font-weight: bold; font-size: 10px;">Cliente</div>
                <div style="font-size: 8px; color: ${COLORS.textLight};">Recibido a satisfacción</div>
            </div>
        </div>
    </div>
    `;
}

function generarFooterCorrectivo(): string {
    return `
    <div class="footer">
        <strong>MEKANOS S.A.S</strong> - NIT: 900.123.456-7<br>
        BARRIO LIBANO CRA 49C #31-35 DIAG. AL SENA - Cartagena, Colombia<br>
        TEL: 6359384 | CEL: 315-7083350 | EMAIL: mekanossas2@gmail.com
    </div>
    `;
}

export default generarCorrectivoOrdenHTML;
