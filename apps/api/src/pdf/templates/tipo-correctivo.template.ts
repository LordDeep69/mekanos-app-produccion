/**
 * Template MEKANOS - Informe de Mantenimiento Correctivo
 *
 * ESTRUCTURA ESTÁNDAR (igual que Tipo A/B):
 * 1. CABECERA
 * 2. DATOS DEL CLIENTE Y SERVICIO
 * 3. REGISTRO DE DATOS DEL MÓDULO DE CONTROL [solo si aplica]
 * 4. GENERAL (trabajos ejecutados)
 * 5. SIMBOLOGÍA
 * 6. MEDICIONES TÉCNICAS [solo si aplica]
 * 7. REGISTRO FOTOGRÁFICO DEL SERVICIO
 * 8. FOTOS GENERALES [si hay]
 * 9. OBSERVACIONES
 * 10. FIRMAS
 * 11. FOOTER
 */

import {
    baseStyles,
    MEKANOS_COLORS
} from './mekanos-base.template';

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

    // Problema reportado (se incluirá en observaciones)
    problemaReportado: {
        descripcion: string;
        fechaReporte: string;
        reportadoPor?: string;
    };

    // Diagnóstico (se incluirá en observaciones)
    diagnostico: {
        descripcion: string;
        causaRaiz: string;
        sistemasAfectados: string[];
    };

    // Trabajos ejecutados (se muestran en GENERAL)
    trabajosEjecutados: TrabajoEjecutadoPDF[];

    // Repuestos utilizados (no se usa - mantener compatibilidad)
    repuestosUtilizados: RepuestoUtilizadoPDF[];

    // Mediciones (si aplica)
    mediciones?: MedicionCorrectivoPDF[];

    // Recomendaciones (no se usa - mantener compatibilidad)
    recomendaciones: string[];

    // Observaciones
    observaciones?: string;

    // Datos del módulo de control (opcional, solo si hay valores)
    datosModulo?: {
        rpm?: number;
        presionAceite?: number;
        temperaturaRefrigerante?: number;
        cargaBateria?: number;
        horasTrabajo?: number;
        voltaje?: number;
        frecuencia?: number;
        corriente?: number;
    };

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
    // ✅ FIX: Aceptar todos los códigos de simbología válidos
    resultado: 'COMPLETADO' | 'PARCIAL' | 'PENDIENTE' | 'B' | 'R' | 'M' | 'C' | 'NA' | 'I' | 'LI' | 'A' | 'L' | 'LA' | 'S' | 'NT' | 'BA' | 'F' | 'RN' | 'NF' | string;
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
 * ESTRUCTURA IDÉNTICA A TIPO A/B
 */
export function generarCorrectivoOrdenHTML(datos: DatosCorrectivoOrdenPDF): string {
    const tieneMediciones = Array.isArray(datos.mediciones) && datos.mediciones.length > 0;
    const tieneDatosModulo = datos.datosModulo && Object.values(datos.datosModulo).some(v => v != null && v !== 0);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe Mantenimiento Correctivo - ${datos.numeroOrden}</title>
    <style>
        ${baseStyles}
    </style>
</head>
<body>
    <div class="page">
        <!-- 1. HEADER -->
        ${generarHeader(datos)}
        
        <!-- 2. DATOS DEL CLIENTE Y SERVICIO -->
        ${generarDatosCliente(datos)}
        
        <!-- 3. REGISTRO DE DATOS DEL MÓDULO DE CONTROL (solo si aplica) -->
        ${tieneDatosModulo ? generarDatosModulo(datos) : ''}
        
        <!-- 4. GENERAL (Trabajos ejecutados) -->
        ${generarSeccionGeneral(datos.trabajosEjecutados)}
        
        <!-- 5. SIMBOLOGÍA -->
        ${generarSimbologia()}
        
        <!-- 6. MEDICIONES TÉCNICAS (solo si aplica) -->
        ${tieneMediciones ? generarMediciones(datos.mediciones!) : ''}
    </div>
    
    <div class="page page-break">
        <!-- 7 y 8. REGISTRO FOTOGRÁFICO DEL SERVICIO + FOTOS GENERALES -->
        ${generarEvidencias(datos.evidencias || [])}
        
        <!-- 9. OBSERVACIONES -->
        ${generarObservaciones(datos)}
        
        <!-- 10. FIRMAS -->
        ${generarFirmas(datos.firmaTecnico, datos.firmaCliente)}
        
        <!-- 11. FOOTER -->
        ${generarFooter()}
    </div>
</body>
</html>
    `.trim();
}

// ============================================================================
// FUNCIONES DE GENERACIÓN - ESTRUCTURA IDÉNTICA A TIPO A/B
// ============================================================================

const generarHeader = (datos: DatosCorrectivoOrdenPDF): string => `
    <div class="header">
        <div class="logo-container">
            <svg class="logo" viewBox="0 0 100 40">
                <rect width="100" height="40" fill="${MEKANOS_COLORS.primary}"/>
                <text x="50" y="25" fill="white" font-size="14" font-weight="bold" text-anchor="middle">MEKANOS</text>
            </svg>
        </div>
        <div class="header-title">
            <h1>MANTENIMIENTO CORRECTIVO</h1>
            <h2>${datos.tipoEquipo || 'EQUIPOS INDUSTRIALES'}</h2>
        </div>
        <div class="header-order">
            <div class="order-number">${datos.numeroOrden}</div>
        </div>
    </div>
`;

const generarDatosCliente = (datos: DatosCorrectivoOrdenPDF): string => `
    <div class="section">
        <div class="section-title">DATOS DEL CLIENTE Y SERVICIO</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Cliente</span>
                <span class="info-value">${datos.cliente}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Marca del Equipo</span>
                <span class="info-value">${datos.marcaEquipo}</span>
            </div>
            <div class="info-item">
                <span class="info-label">N° de Serie</span>
                <span class="info-value">${datos.serieEquipo}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Dirección</span>
                <span class="info-value">${datos.direccion}</span>
            </div>
        </div>
        <div class="info-grid info-grid-4" style="margin-top: 8px;">
            <div class="info-item">
                <span class="info-label">Fecha</span>
                <span class="info-value">${datos.fecha}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Técnico</span>
                <span class="info-value">${datos.tecnico}</span>
            </div>
            <div class="info-item">
                <span class="info-label">H. Entrada</span>
                <span class="info-value">${datos.horaEntrada}</span>
            </div>
            <div class="info-item">
                <span class="info-label">H. Salida</span>
                <span class="info-value">${datos.horaSalida}</span>
            </div>
        </div>
    </div>
`;

const generarDatosModulo = (datos: DatosCorrectivoOrdenPDF): string => {
    const modulo = datos.datosModulo || {};

    return `
    <div class="section">
        <div class="section-subtitle">REGISTRO DE DATOS DEL MÓDULO DE CONTROL</div>
        <div class="mediciones-grid">
            <div class="medicion-item">
                <div class="medicion-label">Velocidad Motor</div>
                <div class="medicion-value">${modulo.rpm || '-'} RPM</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Presión Aceite</div>
                <div class="medicion-value">${modulo.presionAceite || '-'} PSI</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Temp. Refrigerante</div>
                <div class="medicion-value">${modulo.temperaturaRefrigerante || '-'} °C</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Carga Batería</div>
                <div class="medicion-value">${modulo.cargaBateria || '-'} V</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Horas Trabajo</div>
                <div class="medicion-value">${modulo.horasTrabajo || '-'} Hrs</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Voltaje Generador</div>
                <div class="medicion-value">${modulo.voltaje || '-'} V</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Frecuencia</div>
                <div class="medicion-value">${modulo.frecuencia || '-'} Hz</div>
            </div>
            <div class="medicion-item">
                <div class="medicion-label">Corriente</div>
                <div class="medicion-value">${modulo.corriente || '-'} A</div>
            </div>
        </div>
    </div>
`;
};

const generarSeccionGeneral = (trabajos: TrabajoEjecutadoPDF[]): string => `
    <div class="section">
        <div class="section-subtitle">GENERAL</div>
        <table class="checklist-table">
            <thead>
                <tr>
                    <th style="width: 70%;">Actividad / Trabajo Ejecutado</th>
                    <th style="width: 15%;">Estado</th>
                    <th style="width: 15%;">Obs.</th>
                </tr>
            </thead>
            <tbody>
                ${trabajos.map((t) => `
                <tr>
                    <td>${t.descripcion}</td>
                    <td style="text-align: center;">
                        <span class="resultado-badge resultado-${mapResultado(t.resultado)}">${mapResultado(t.resultado)}</span>
                    </td>
                    <td>${t.sistema || ''}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
`;

// ✅ FIX: Mapea resultados preservando códigos reales (B, R, M, C, NA, etc.)
const mapResultado = (resultado: string): string => {
    if (!resultado) return 'NA';

    // Si ya es un código válido, devolverlo directamente
    const codigosValidos = ['B', 'R', 'M', 'C', 'NA', 'I', 'LI', 'A', 'L', 'LA', 'S', 'NT', 'BA', 'F', 'RN', 'NF'];
    if (codigosValidos.includes(resultado.toUpperCase())) {
        return resultado.toUpperCase();
    }

    // Mapear nombres largos a códigos
    switch (resultado.toUpperCase()) {
        case 'COMPLETADO': return 'B';
        case 'BUENO': return 'B';
        case 'PARCIAL': return 'R';
        case 'REGULAR': return 'R';
        case 'PENDIENTE': return 'M';
        case 'MALO': return 'M';
        case 'CAMBIADO': return 'C';
        case 'NO_APLICA': return 'NA';
        case 'N/A': return 'NA';
        default: return resultado; // Devolver tal cual, no asumir 'B'
    }
};

const generarSimbologia = (): string => `
    <div class="section">
        <div class="section-title">SIMBOLOGÍA</div>
        <div class="simbologia-grid">
            <div class="simbologia-item"><span class="simbologia-code">B:</span> Bueno</div>
            <div class="simbologia-item"><span class="simbologia-code">R:</span> Regular</div>
            <div class="simbologia-item"><span class="simbologia-code">M:</span> Malo</div>
            <div class="simbologia-item"><span class="simbologia-code">I:</span> Inspeccionar</div>
            <div class="simbologia-item"><span class="simbologia-code">C:</span> Cambiado</div>
            <div class="simbologia-item"><span class="simbologia-code">LI:</span> Limpiar</div>
            <div class="simbologia-item"><span class="simbologia-code">A:</span> Ajustar</div>
            <div class="simbologia-item"><span class="simbologia-code">L:</span> Lubricar</div>
            <div class="simbologia-item"><span class="simbologia-code">NA:</span> No Aplica</div>
            <div class="simbologia-item"><span class="simbologia-code">LA:</span> Lavar</div>
            <div class="simbologia-item"><span class="simbologia-code">S:</span> Sucio</div>
            <div class="simbologia-item"><span class="simbologia-code">NT:</span> No Tiene</div>
            <div class="simbologia-item"><span class="simbologia-code">BA:</span> Bajo</div>
            <div class="simbologia-item"><span class="simbologia-code">F:</span> Lleno</div>
            <div class="simbologia-item"><span class="simbologia-code">RN:</span> Rellenar Nivel</div>
            <div class="simbologia-item"><span class="simbologia-code">NF:</span> No Funciona</div>
        </div>
    </div>
`;

const generarMediciones = (mediciones: MedicionCorrectivoPDF[]): string => `
    <div class="section">
        <div class="section-title">MEDICIONES TÉCNICAS</div>
        <table class="checklist-table">
            <thead>
                <tr>
                    <th>Parámetro</th>
                    <th>Valor</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${mediciones.map((med) => `
                <tr>
                    <td>${med.parametro}</td>
                    <td style="text-align: center; font-weight: bold;">${med.valorDespues}</td>
                    <td style="text-align: center;">${med.unidad}</td>
                    <td style="text-align: center;" class="alerta-${med.estado}">${med.estado}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
`;

// Soporte para evidencias - Estructura idéntica a Tipo A
type EvidenciaInput = EvidenciaCorrectivoPDF | string | { url: string; caption?: string };

const extraerTipoEvidencia = (caption: string): string => {
    const tipoMatch = caption.match(/^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):/i);
    if (tipoMatch) {
        const tipo = tipoMatch[1].toUpperCase();
        if (tipo === 'DESPUÉS') return 'DESPUES';
        if (tipo === 'MEDICIÓN') return 'MEDICION';
        return tipo;
    }
    return 'GENERAL';
};

const getTituloSeccion = (tipo: string): { titulo: string; icono: string } => {
    switch (tipo) {
        case 'ANTES': return { titulo: 'Estado Inicial (Antes del Servicio)', icono: '📸' };
        case 'DURANTE': return { titulo: 'Durante el Servicio', icono: '🔧' };
        case 'DESPUES': return { titulo: 'Estado Final (Después del Servicio)', icono: '✅' };
        case 'MEDICION': return { titulo: 'Mediciones y Verificaciones', icono: '📏' };
        case 'GENERAL': return { titulo: 'Evidencias Generales', icono: '📷' };
        default: return { titulo: 'Otras Evidencias', icono: '📎' };
    }
};

const generarEvidencias = (evidencias: EvidenciaInput[]): string => {
    if (!evidencias || evidencias.length === 0) {
        return `
        <div class="section">
            <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
            <div class="evidencias-empty">
                <p>No se registraron evidencias fotográficas para este servicio.</p>
            </div>
        </div>
        `;
    }

    // Normalizar evidencias a formato objeto
    const normalizarEvidencia = (ev: EvidenciaInput, idx: number): { url: string; caption: string } => {
        if (typeof ev === 'string') {
            return { url: ev, caption: `Evidencia ${idx + 1}` };
        }
        if ('tipo' in ev) {
            return { url: ev.url, caption: `${ev.tipo}: ${ev.descripcion || `Foto ${idx + 1}`}` };
        }
        return { url: ev.url, caption: ev.caption || `Evidencia ${idx + 1}` };
    };

    const evidenciasNormalizadas = evidencias.map((ev, idx) => normalizarEvidencia(ev, idx));

    // Agrupar evidencias por tipo
    const grupos: Record<string, Array<{ url: string; caption: string }>> = {};
    const ordenTipos = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'];

    evidenciasNormalizadas.forEach((ev) => {
        const tipo = extraerTipoEvidencia(ev.caption);
        if (!grupos[tipo]) grupos[tipo] = [];
        const captionLimpio = ev.caption.replace(/^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i, '');
        grupos[tipo].push({ url: ev.url, caption: captionLimpio });
    });

    // Generar HTML agrupado
    const seccionesHTML = ordenTipos
        .filter(tipo => grupos[tipo] && grupos[tipo].length > 0)
        .map(tipo => {
            const { titulo, icono } = getTituloSeccion(tipo);
            const evidenciasTipo = grupos[tipo];
            const claseGrupo = tipo === 'GENERAL' ? 'evidencias-grupo evidencias-grupo-general' : 'evidencias-grupo';
            const tituloMostrar = tipo === 'GENERAL' ? '📷 FOTOS GENERALES DEL SERVICIO' : `${icono} ${titulo}`;

            return `
            <div class="${claseGrupo}">
                <div class="evidencias-grupo-titulo">${tituloMostrar} (${evidenciasTipo.length})</div>
                <div class="evidencias-grid-compacto">
                    ${evidenciasTipo.map((ev, idx) => `
                    <div class="evidencia-item-compacto">
                        <img src="${ev.url}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
                        <div class="evidencia-caption-compacto">${ev.caption || `Foto ${idx + 1}`}</div>
                    </div>
                    `).join('')}
                </div>
            </div>
            `;
        })
        .join('');

    return `
    <div class="section evidencias-section">
        <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
        ${seccionesHTML}
    </div>
    `;
};

const generarObservaciones = (datos: DatosCorrectivoOrdenPDF): string => {
    // Combinar problema reportado, diagnóstico y observaciones en una sola sección
    const partes: string[] = [];

    if (datos.problemaReportado?.descripcion) {
        partes.push(`<strong>Problema Reportado:</strong> ${datos.problemaReportado.descripcion}`);
    }

    if (datos.diagnostico?.descripcion) {
        partes.push(`<strong>Diagnóstico:</strong> ${datos.diagnostico.descripcion}`);
    }

    if (datos.diagnostico?.causaRaiz) {
        partes.push(`<strong>Causa Raíz:</strong> ${datos.diagnostico.causaRaiz}`);
    }

    if (datos.observaciones) {
        partes.push(`<strong>Observaciones:</strong> ${datos.observaciones}`);
    }

    const contenido = partes.length > 0
        ? partes.join('<br><br>')
        : 'Sin observaciones adicionales.';

    return `
    <div class="section">
        <div class="section-title">OBSERVACIONES</div>
        <div class="observaciones-box">
            ${contenido}
        </div>
    </div>
    `;
};

const generarFirmas = (firmaTecnico?: string, firmaCliente?: string): string => `
    <div class="firmas-container">
        <div class="firma-box">
            ${firmaTecnico
        ? `<div class="firma-imagen"><img src="${firmaTecnico}" alt="Firma Técnico" /></div>`
        : `<div class="firma-line"></div>`
    }
            <div class="firma-label">Firma Técnico Asignado</div>
        </div>
        <div class="firma-box">
            ${firmaCliente
        ? `<div class="firma-imagen"><img src="${firmaCliente}" alt="Firma Cliente" /></div>`
        : `<div class="firma-line"></div>`
    }
            <div class="firma-label">Firma y Sello de Quien Solicita el Servicio</div>
        </div>
    </div>
`;

const generarFooter = (): string => `
    <div class="footer">
        <strong>MEKANOS S.A.S</strong><br/>
        BARRIO LIBANO CRA 49C #31-35 DIAG. AL SENA - TEL: 6359384<br/>
        CEL: 315-7083350 E-MAIL: mekanossas2@gmail.com
    </div>
`;

export default generarCorrectivoOrdenHTML;
