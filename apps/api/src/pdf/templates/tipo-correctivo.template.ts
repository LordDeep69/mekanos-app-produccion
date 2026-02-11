/**
 * Template MEKANOS - Informe de Mantenimiento Correctivo
 * ✅ REDISEÑO COMPLETO 06-FEB-2026: Secciones dedicadas por naturaleza de actividad
 *
 * NUEVA ESTRUCTURA ENTERPRISE:
 * 1. CABECERA
 * 2. DATOS DEL CLIENTE Y SERVICIO + ESTADO INICIAL DEL EQUIPO
 * 3. REGISTRO DE DATOS DEL MÓDULO DE CONTROL [solo si aplica]
 * 4. PROBLEMA Y DIAGNÓSTICO (Problema Reportado + Fallas + Sistemas + Diagnóstico)
 * 5. TRABAJOS REALIZADOS (narrativo, NO checklist B/M/C/NA)
 * 6. REPUESTOS Y MATERIALES (tabla dedicada si hay items)
 * 7. RESULTADO DEL SERVICIO (Estado Final + Pendientes + Recomendaciones)
 * 8. REGISTRO FOTOGRÁFICO DEL SERVICIO
 * 9. OBSERVACIONES ADICIONALES (solo notas generales)
 * 10. FIRMAS
 * 11. FOOTER
 *
 * ✅ MULTI-EQUIPOS (16-DIC-2025): Soporta órdenes con múltiples equipos
 */

import {
  ActividadesPorEquipoPDF,
  baseStyles,
  EquipoOrdenPDF,
  EvidenciasPorEquipoPDF,
  generarHeaderConLogo,
  generarLeyendaEquipos,
  generarMedicionesMultiEquipo,
  MedicionesPorEquipoPDF,
  MEKANOS_COLORS
} from './mekanos-base.template';

/**
 * ✅ FIX 30-ENE-2026: Optimizar URLs de Cloudinary para reducir tamaño del PDF
 */
const optimizarUrlCloudinary = (url: string): string => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('q_auto') || url.includes('w_600')) return url;
  const match = url.match(/(.+\/upload\/)(.+)/);
  if (match) return `${match[1]}q_auto:low,w_600,f_jpg/${match[2]}`;
  return url;
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

  // ✅ REDISEÑO 06-FEB-2026: Campos dedicados por naturaleza de actividad
  // Estado del equipo (selectores enum)
  estadoInicial?: string;          // Texto legible mapeado: "✅ Equipo Operativo"
  estadoFinal?: string;            // Texto legible mapeado: "⚠️ Reparación Parcial"

  // Texto narrativo (campos de texto libre)
  problemaReportado?: string;      // Texto libre del técnico
  fallasObservadas?: string;       // Texto libre del técnico
  diagnosticoTecnico?: string;     // Texto libre del técnico
  trabajosRealizados?: string;     // Texto libre del técnico
  trabajosPendientes?: string;     // Texto libre del técnico
  recomendaciones?: string;        // Texto libre del técnico

  // Sistemas afectados (multi-selector → chips)
  sistemasAfectados?: string[];    // Array de nombres legibles

  // Listas de items (listas dinámicas)
  repuestosUtilizados?: string[];  // Array de strings
  materialesUtilizados?: string[]; // Array de strings

  // ✅ FIX 06-FEB-2026: Observaciones auxiliares del técnico por actividad (parte después de |||)
  obsEstadoInicial?: string;
  obsEstadoFinal?: string;
  obsSistemas?: string;
  obsProblema?: string;
  obsFallas?: string;
  obsDiagnostico?: string;
  obsTrabajos?: string;
  obsPendientes?: string;
  obsRecomendaciones?: string;
  obsRepuestos?: string;
  obsMateriales?: string;

  // Mediciones (si aplica)
  mediciones?: MedicionCorrectivoPDF[];

  // Observaciones generales del técnico (textarea separado)
  observacionesGenerales?: string;

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

  // Datos del firmante
  nombreTecnico?: string;
  nombreCliente?: string;
  cargoCliente?: string;

  // ✅ MULTI-EQUIPOS (16-DIC-2025): Soporte para múltiples equipos
  esMultiEquipo?: boolean;
  actividadesPorEquipo?: ActividadesPorEquipoPDF[];
  medicionesPorEquipo?: MedicionesPorEquipoPDF[];
  evidenciasPorEquipo?: EvidenciasPorEquipoPDF[];
  equiposOrden?: EquipoOrdenPDF[];
}

export interface MedicionCorrectivoPDF {
  parametro: string;
  valorAntes?: string;
  valorDespues: string;
  unidad: string;
  estado: 'OK' | 'ADVERTENCIA' | 'CRITICO';
}

export interface EvidenciaCorrectivoPDF {
  // ✅ FIX 06-FEB-2026: Incluir GENERAL y MEDICION para separación de fotos
  tipo: 'ANTES' | 'DURANTE' | 'DESPUES' | 'GENERAL' | 'MEDICION';
  url: string;
  descripcion?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS ESPECÍFICO PARA CORRECTIVO - Secciones dedicadas enterprise
// ═══════════════════════════════════════════════════════════════════════════
const correctivoStyles = `
  /* --- Contenedor de campos estructurados --- */
  .corr-fields-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* --- Campo individual (label + valor) --- */
  .corr-field {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 10px 14px;
    border-left: 4px solid ${MEKANOS_COLORS.primary};
  }
  .corr-field-label {
    font-size: 9px;
    font-weight: 700;
    color: ${MEKANOS_COLORS.primary};
    text-transform: uppercase;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }
  .corr-field-value {
    font-size: 10px;
    color: #2c3e50;
    line-height: 1.5;
  }

  /* --- Caja narrativa (trabajos realizados, observaciones) --- */
  .corr-narrative-box {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 14px 16px;
    font-size: 10px;
    color: #2c3e50;
    line-height: 1.6;
    white-space: pre-line;
  }

  /* --- Badges de estado (inicial / final) --- */
  .corr-estado-inicial-bar,
  .corr-resultado-estado {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding: 8px 14px;
    background: #f0f4f8;
    border-radius: 6px;
    border: 1px solid #d0d7de;
  }
  .corr-estado-label {
    font-size: 9px;
    font-weight: 700;
    color: #495057;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .corr-estado-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  .corr-estado-inicial {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffc107;
  }
  .corr-estado-final {
    background: #d4edda;
    color: #155724;
    border: 1px solid #28a745;
  }

  /* --- Chips de sistemas afectados --- */
  .corr-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .corr-chip {
    display: inline-block;
    padding: 2px 10px;
    background: #e3f2fd;
    color: #1565c0;
    border: 1px solid #90caf9;
    border-radius: 10px;
    font-size: 8px;
    font-weight: 600;
  }

  /* --- Pendientes (highlight warning) --- */
  .corr-pendientes {
    background: #fff8e1;
    border: 1px solid #ffca28;
    border-radius: 4px;
    padding: 6px 10px;
    color: #e65100;
    font-weight: 600;
  }

  /* --- ✅ FIX 06-FEB-2026: Observación auxiliar del técnico (después de |||) --- */
  .corr-obs-aux {
    margin-top: 6px;
    padding: 6px 10px;
    background: #fefefe;
    border-left: 3px solid #adb5bd;
    border-radius: 0 4px 4px 0;
    font-size: 9px;
    font-style: italic;
    color: #6c757d;
    line-height: 1.4;
  }
  .corr-obs-aux::before {
    content: '📝 Obs. Técnico: ';
    font-weight: 600;
    font-style: normal;
    color: #495057;
  }
`;

/**
 * Genera el HTML del informe de correctivo
 * ✅ REDISEÑO 06-FEB-2026: Secciones dedicadas por naturaleza de actividad
 */
export function generarCorrectivoOrdenHTML(datos: DatosCorrectivoOrdenPDF): string {
  const tieneMediciones = Array.isArray(datos.mediciones) && datos.mediciones.length > 0;
  const tieneDatosModulo =
    datos.datosModulo && Object.values(datos.datosModulo).some((v) => v != null && v !== 0);

  // MULTI-EQUIPOS: Determinar si usar tablas multi-equipo
  const esMultiEquipo =
    datos.esMultiEquipo || (datos.actividadesPorEquipo && datos.actividadesPorEquipo.length > 1);

  // Determinar si hay contenido en secciones condicionales
  const tieneProblemaODiagnostico = datos.problemaReportado || datos.fallasObservadas ||
    datos.diagnosticoTecnico || (datos.sistemasAfectados && datos.sistemasAfectados.length > 0);
  const tieneRepuestosOMateriales =
    (datos.repuestosUtilizados && datos.repuestosUtilizados.length > 0) ||
    (datos.materialesUtilizados && datos.materialesUtilizados.length > 0);
  const tieneResultado = datos.estadoFinal || datos.trabajosPendientes || datos.recomendaciones;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe Mantenimiento Correctivo - ${datos.numeroOrden}</title>
    <style>
        ${baseStyles}
        ${correctivoStyles}
    </style>
</head>
<body>
    <div class="page">
        <!-- 1. HEADER -->
        ${generarHeader(datos)}
        
        <!-- MULTI-EQUIPOS: Leyenda de equipos si hay más de uno -->
        ${generarLeyendaEquipos(
    datos.actividadesPorEquipo?.map((a) => a.equipo),
    esMultiEquipo,
  )}
        
        <!-- 2. DATOS DEL CLIENTE Y SERVICIO + ESTADO INICIAL -->
        ${generarDatosCliente(datos)}
        
        <!-- 3. REGISTRO DE DATOS DEL MÓDULO DE CONTROL (solo si aplica) -->
        ${tieneDatosModulo ? generarDatosModulo(datos) : ''}
        
        <!-- 4. PROBLEMA Y DIAGNÓSTICO -->
        ${tieneProblemaODiagnostico ? generarProblemaYDiagnostico(datos) : ''}
        
        <!-- 5. TRABAJOS REALIZADOS (narrativo) -->
        ${datos.trabajosRealizados ? generarTrabajosRealizados(datos) : ''}
        
        <!-- 6. REPUESTOS Y MATERIALES -->
        ${tieneRepuestosOMateriales ? generarRepuestosYMateriales(datos) : ''}
        
        <!-- 7. RESULTADO DEL SERVICIO -->
        ${tieneResultado ? generarResultadoServicio(datos) : ''}
        
        <!-- 8. MEDICIONES TÉCNICAS (solo si aplica) -->
        ${esMultiEquipo && datos.medicionesPorEquipo
      ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
      : tieneMediciones
        ? generarMediciones(datos.mediciones!)
        : ''
    }
        
        <!-- 9. REGISTRO FOTOGRÁFICO DEL SERVICIO -->
        ${esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
      ? generarEvidenciasMultiEquipo(datos.evidenciasPorEquipo)
      : generarEvidencias(datos.evidencias || [])
    }
        
        <!-- 10. OBSERVACIONES ADICIONALES -->
        ${generarObservaciones(datos)}
        
        <!-- 11. FIRMAS -->
        ${generarFirmas(datos)}
        
        <!-- 12. FOOTER -->
        ${generarFooter()}
    </div>
</body>
</html>
    `.trim();
}

// ============================================================================
// FUNCIONES DE GENERACIÓN - ESTRUCTURA IDÉNTICA A TIPO A/B
// ============================================================================

const generarHeader = (datos: DatosCorrectivoOrdenPDF): string =>
  generarHeaderConLogo(
    'MANTENIMIENTO CORRECTIVO',
    datos.tipoEquipo || 'EQUIPOS INDUSTRIALES',
    datos.numeroOrden,
  );

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
        ${datos.estadoInicial ? `
        <div class="corr-estado-inicial-bar">
            <span class="corr-estado-label">ESTADO INICIAL DEL EQUIPO:</span>
            <span class="corr-estado-badge corr-estado-inicial">${datos.estadoInicial}</span>
        </div>
        ${renderObsAux(datos.obsEstadoInicial)}
        ` : ''}
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

// ═══════════════════════════════════════════════════════════════════════════
// ✅ FIX 06-FEB-2026: Helper para renderizar observación auxiliar del técnico
// ═══════════════════════════════════════════════════════════════════════════
const renderObsAux = (obs?: string): string =>
  obs ? `<div class="corr-obs-aux">${obs}</div>` : '';

// ═══════════════════════════════════════════════════════════════════════════
// ✅ REDISEÑO 06-FEB-2026: Secciones dedicadas por naturaleza de actividad
// ═══════════════════════════════════════════════════════════════════════════

const generarProblemaYDiagnostico = (datos: DatosCorrectivoOrdenPDF): string => {
  const items: string[] = [];

  if (datos.problemaReportado) {
    items.push(`
      <div class="corr-field">
        <div class="corr-field-label">⚠️ Problema Reportado</div>
        <div class="corr-field-value">${datos.problemaReportado}</div>
        ${renderObsAux(datos.obsProblema)}
      </div>
    `);
  }

  if (datos.fallasObservadas) {
    items.push(`
      <div class="corr-field">
        <div class="corr-field-label">🔍 Fallas Observadas</div>
        <div class="corr-field-value">${datos.fallasObservadas}</div>
        ${renderObsAux(datos.obsFallas)}
      </div>
    `);
  }

  if (datos.sistemasAfectados && datos.sistemasAfectados.length > 0) {
    items.push(`
      <div class="corr-field">
        <div class="corr-field-label">⚙️ Sistemas Afectados</div>
        <div class="corr-chips">
          ${datos.sistemasAfectados.map(s => `<span class="corr-chip">${s}</span>`).join('')}
        </div>
        ${renderObsAux(datos.obsSistemas)}
      </div>
    `);
  }

  if (datos.diagnosticoTecnico) {
    items.push(`
      <div class="corr-field">
        <div class="corr-field-label">🔧 Diagnóstico Técnico</div>
        <div class="corr-field-value">${datos.diagnosticoTecnico}</div>
        ${renderObsAux(datos.obsDiagnostico)}
      </div>
    `);
  }

  return `
    <div class="section">
        <div class="section-title">PROBLEMA Y DIAGNÓSTICO</div>
        <div class="corr-fields-container">
            ${items.join('')}
        </div>
    </div>
  `;
};

const generarTrabajosRealizados = (datos: DatosCorrectivoOrdenPDF): string => `
    <div class="section">
        <div class="section-title">TRABAJOS REALIZADOS</div>
        <div class="corr-narrative-box">
            ${datos.trabajosRealizados || 'Sin información de trabajos realizados.'}
        </div>
        ${renderObsAux(datos.obsTrabajos)}
    </div>
`;

const generarRepuestosYMateriales = (datos: DatosCorrectivoOrdenPDF): string => {
  const repuestos = datos.repuestosUtilizados || [];
  const materiales = datos.materialesUtilizados || [];
  const rows: string[] = [];

  repuestos.forEach((r, i) => {
    rows.push(`<tr><td style="text-align:center;">${i + 1}</td><td>${r}</td><td style="text-align:center;">Repuesto</td></tr>`);
  });
  materiales.forEach((m, i) => {
    rows.push(`<tr><td style="text-align:center;">${repuestos.length + i + 1}</td><td>${m}</td><td style="text-align:center;">Material</td></tr>`);
  });

  return `
    <div class="section">
        <div class="section-title">REPUESTOS Y MATERIALES UTILIZADOS</div>
        <table class="checklist-table">
            <thead>
                <tr>
                    <th style="width: 10%;">#</th>
                    <th style="width: 70%;">Descripción</th>
                    <th style="width: 20%;">Tipo</th>
                </tr>
            </thead>
            <tbody>
                ${rows.join('')}
            </tbody>
        </table>
        ${renderObsAux(datos.obsRepuestos)}
        ${renderObsAux(datos.obsMateriales)}
    </div>
  `;
};

const generarResultadoServicio = (datos: DatosCorrectivoOrdenPDF): string => {
  const items: string[] = [];

  if (datos.estadoFinal) {
    items.push(`
      <div class="corr-resultado-estado">
        <span class="corr-estado-label">ESTADO FINAL DEL EQUIPO:</span>
        <span class="corr-estado-badge corr-estado-final">${datos.estadoFinal}</span>
      </div>
      ${renderObsAux(datos.obsEstadoFinal)}
    `);
  }

  if (datos.trabajosPendientes) {
    items.push(`
      <div class="corr-field">
        <div class="corr-field-label">⚠️ Trabajos Pendientes</div>
        <div class="corr-field-value corr-pendientes">${datos.trabajosPendientes}</div>
        ${renderObsAux(datos.obsPendientes)}
      </div>
    `);
  }

  if (datos.recomendaciones) {
    items.push(`
      <div class="corr-field">
        <div class="corr-field-label">💡 Recomendaciones</div>
        <div class="corr-field-value">${datos.recomendaciones}</div>
        ${renderObsAux(datos.obsRecomendaciones)}
      </div>
    `);
  }

  return `
    <div class="section">
        <div class="section-title">RESULTADO DEL SERVICIO</div>
        <div class="corr-fields-container">
            ${items.join('')}
        </div>
    </div>
  `;
};

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
                ${mediciones
    .map(
      (med) => `
                <tr>
                    <td>${med.parametro}</td>
                    <td style="text-align: center; font-weight: bold;">${med.valorDespues}</td>
                    <td style="text-align: center;">${med.unidad}</td>
                    <td style="text-align: center;" class="alerta-${med.estado}">${med.estado}</td>
                </tr>
                `,
    )
    .join('')}
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
    case 'ANTES':
      return { titulo: 'Estado Inicial (Antes del Servicio)', icono: '📸' };
    case 'DURANTE':
      return { titulo: 'Durante el Servicio', icono: '🔧' };
    case 'DESPUES':
      return { titulo: 'Estado Final (Después del Servicio)', icono: '✅' };
    case 'MEDICION':
      return { titulo: 'Mediciones y Verificaciones', icono: '📏' };
    case 'GENERAL':
      return { titulo: 'Evidencias Generales', icono: '📷' };
    default:
      return { titulo: 'Otras Evidencias', icono: '📎' };
  }
};

// ✅ FIX 06-FEB-2026: Separar fotos de actividades (ANTES/DURANTE/DESPUÉS) de fotos GENERALES
// Ahora retorna DOS secciones HTML independientes en el PDF
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
  const normalizarEvidencia = (
    ev: EvidenciaInput,
    idx: number,
  ): { url: string; caption: string } => {
    if (typeof ev === 'string') {
      return { url: ev, caption: `Evidencia ${idx + 1}` };
    }
    if ('tipo' in ev) {
      // descripcion ya contiene el prefijo "TIPO: ..." desde el service; usarlo directo evita doble-prefijo
      return { url: ev.url, caption: ev.descripcion || `${ev.tipo}: Foto ${idx + 1}` };
    }
    return { url: ev.url, caption: ev.caption || `Evidencia ${idx + 1}` };
  };

  const evidenciasNormalizadas = evidencias.map((ev, idx) => normalizarEvidencia(ev, idx));

  // Agrupar evidencias por tipo
  const grupos: Record<string, Array<{ url: string; caption: string }>> = {};

  evidenciasNormalizadas.forEach((ev) => {
    const tipo = extraerTipoEvidencia(ev.caption);
    if (!grupos[tipo]) grupos[tipo] = [];
    const captionLimpio = ev.caption.replace(
      /^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i,
      '',
    );
    grupos[tipo].push({ url: ev.url, caption: captionLimpio });
  });

  // Helper: generar grid de fotos para un grupo
  const generarGridFotos = (fotos: Array<{ url: string; caption: string }>): string =>
    fotos.map((ev, idx) => `
        <div class="evidencia-item-compacto">
            <img src="${optimizarUrlCloudinary(ev.url)}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
            <div class="evidencia-caption-compacto">${ev.caption || `Foto ${idx + 1}`}</div>
        </div>
    `).join('');

  // ── SECCIÓN 1: Fotos de actividades (ANTES / DURANTE / DESPUÉS / MEDICION) ──
  const tiposActividad = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION'];
  const gruposActividad = tiposActividad
    .filter((tipo) => grupos[tipo] && grupos[tipo].length > 0)
    .map((tipo) => {
      const { titulo, icono } = getTituloSeccion(tipo);
      const evidenciasTipo = grupos[tipo];
      return `
        <div class="evidencias-grupo">
            <div class="evidencias-grupo-titulo">${icono} ${titulo} (${evidenciasTipo.length})</div>
            <div class="evidencias-grid-compacto">
                ${generarGridFotos(evidenciasTipo)}
            </div>
        </div>
      `;
    })
    .join('');

  let htmlActividades = '';
  if (gruposActividad) {
    htmlActividades = `
    <div class="section evidencias-section">
        <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
        ${gruposActividad}
    </div>
    `;
  }

  // ── SECCIÓN 2: Fotos GENERALES (separadas visualmente) ──
  const fotosGenerales = grupos['GENERAL'] || [];
  let htmlGenerales = '';
  if (fotosGenerales.length > 0) {
    htmlGenerales = `
    <div class="section evidencias-section evidencias-section-general" style="margin-top: 20px;">
        <div class="section-title" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">📷 FOTOS GENERALES DEL SERVICIO (${fotosGenerales.length})</div>
        <div class="evidencias-grid-compacto">
            ${generarGridFotos(fotosGenerales)}
        </div>
    </div>
    `;
  }

  // Si no hay fotos de actividad pero sí generales, o viceversa
  if (!htmlActividades && !htmlGenerales) {
    return `
        <div class="section">
            <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
            <div class="evidencias-empty">
                <p>No se registraron evidencias fotográficas para este servicio.</p>
            </div>
        </div>
        `;
  }

  return htmlActividades + htmlGenerales;
};

const generarObservaciones = (datos: DatosCorrectivoOrdenPDF): string => {
  // ✅ REDISEÑO 06-FEB-2026: Solo observaciones generales (el resto tiene secciones dedicadas)
  if (!datos.observacionesGenerales) {
    return '';
  }

  return `
    <div class="section">
        <div class="section-title">OBSERVACIONES ADICIONALES</div>
        <div class="corr-narrative-box">
            ${datos.observacionesGenerales}
        </div>
    </div>
  `;
};

// ✅ FIX 05-ENE-2026: Mostrar nombre y cargo del técnico/cliente bajo la firma
const generarFirmas = (datos: DatosCorrectivoOrdenPDF): string => `
    <div class="firmas-container">
        <div class="firma-box">
            ${datos.firmaTecnico
    ? `<div class="firma-imagen"><img src="${datos.firmaTecnico}" alt="Firma Técnico" /></div>`
    : `<div class="firma-line"></div>`
  }
            <div class="firma-nombre">${datos.nombreTecnico || datos.tecnico || ''}</div>
            <div class="firma-cargo">${datos.cargoTecnico || 'Técnico Responsable'}</div>
            <div class="firma-label">Firma Técnico Asignado</div>
        </div>
        <div class="firma-box">
            ${datos.firmaCliente
    ? `<div class="firma-imagen"><img src="${datos.firmaCliente}" alt="Firma Cliente" /></div>`
    : `<div class="firma-line"></div>`
  }
            <div class="firma-nombre">${datos.nombreCliente || ''}</div>
            <div class="firma-cargo">${datos.cargoCliente || 'Cliente / Autorizador'}</div>
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

// ═══════════════════════════════════════════════════════════════════════════
// ✅ MULTI-EQUIPOS (16-DIC-2025): Funciones para evidencias multi-equipo
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ✅ MULTI-EQUIPOS: Genera sección de evidencias agrupadas por equipo
 * Cada equipo tiene su propia sección con fotos ANTES/DURANTE/DESPUÉS
 */
const generarEvidenciasMultiEquipo = (evidenciasPorEquipo: EvidenciasPorEquipoPDF[]): string => {
  if (!evidenciasPorEquipo || evidenciasPorEquipo.length === 0) {
    return `
        <div class="section">
            <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
            <div style="padding: 20px; text-align: center; color: #666;">
                No se registraron evidencias fotográficas para este servicio.
            </div>
        </div>
        `;
  }

  const equiposHTML = evidenciasPorEquipo
    .map((grupo, equipoIdx) => {
      const { equipo, evidencias } = grupo;
      const nombreEquipo =
        equipo.nombreSistema || equipo.nombreEquipo || `Equipo ${equipo.ordenSecuencia}`;

      // Agrupar evidencias por tipo (ANTES, DURANTE, DESPUÉS)
      const ordenTipos = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'];
      const grupos: Record<string, Array<{ url: string; caption: string }>> = {};

      evidencias.forEach((ev: any) => {
        const tipo = ev.momento || extraerTipoEvidenciaCorrectivo(ev.caption || '');
        if (!grupos[tipo]) grupos[tipo] = [];
        const captionLimpio = (ev.caption || '').replace(
          /^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i,
          '',
        );
        grupos[tipo].push({
          url: ev.url,
          caption: captionLimpio || `Foto ${grupos[tipo].length + 1}`,
        });
      });

      // Generar secciones de fotos por tipo
      const tiposHTML = ordenTipos
        .filter((tipo) => grupos[tipo] && grupos[tipo].length > 0)
        .map((tipo) => {
          const { titulo, icono } = getTituloSeccionCorrectivo(tipo);
          const evidenciasTipo = grupos[tipo];

          return `
                <div style="margin-bottom: 12px;">
                    <div style="background: linear-gradient(135deg, ${MEKANOS_COLORS.secondary} 0%, ${MEKANOS_COLORS.primary} 100%); color: white; padding: 5px 12px; font-size: 10px; font-weight: bold; border-radius: 4px 4px 0 0;">
                        ${icono} ${titulo} (${evidenciasTipo.length})
                    </div>
                    <div class="evidencias-grid" style="padding: 8px; background: #f8f9fa; border-radius: 0 0 4px 4px;">
                        ${evidenciasTipo
              .map(
                (ev: any, idx: number) => `
                            <div class="evidencia-item">
                                <img src="${optimizarUrlCloudinary(ev.url)}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
                                <div class="evidencia-caption">${ev.caption || `Foto ${idx + 1}`}</div>
                            </div>
                        `,
              )
              .join('')}
                    </div>
                </div>
                `;
        })
        .join('');

      // Colores alternados para cada equipo
      const coloresEquipo = [
        { bg: '#fef2f2', border: '#dc2626', header: '#b91c1c' }, // Rojo para correctivo
        { bg: '#fef3c7', border: '#d97706', header: '#b45309' },
        { bg: '#e0f2fe', border: '#0284c7', header: '#0369a1' },
        { bg: '#dcfce7', border: '#16a34a', header: '#15803d' },
      ];
      const color = coloresEquipo[equipoIdx % coloresEquipo.length];

      return `
        <div style="margin-bottom: 20px; border: 2px solid ${color.border}; border-radius: 8px; overflow: hidden;">
            <div style="background: ${color.header}; color: white; padding: 10px 15px; font-weight: bold; font-size: 13px;">
                🔧 EQUIPO ${equipo.ordenSecuencia}: ${nombreEquipo.toUpperCase()}
                ${equipo.codigoEquipo ? `<span style="font-weight: normal; font-size: 11px; opacity: 0.9;"> (${equipo.codigoEquipo})</span>` : ''}
            </div>
            <div style="padding: 10px; background: ${color.bg};">
                ${tiposHTML || '<div style="text-align: center; color: #666; padding: 10px;">Sin evidencias para este equipo</div>'}
            </div>
        </div>
        `;
    })
    .join('');

  return `
    <div class="section">
        <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO - MULTI-EQUIPOS (${evidenciasPorEquipo.length} equipos)</div>
        ${equiposHTML}
    </div>
    `;
};

/**
 * Extrae el tipo de evidencia del caption
 */
const extraerTipoEvidenciaCorrectivo = (caption: string): string => {
  const upper = caption.toUpperCase();
  if (upper.includes('ANTES')) return 'ANTES';
  if (upper.includes('DURANTE')) return 'DURANTE';
  if (upper.includes('DESPUES') || upper.includes('DESPUÉS')) return 'DESPUES';
  if (upper.includes('MEDICION') || upper.includes('MEDICIÓN')) return 'MEDICION';
  return 'GENERAL';
};

/**
 * Obtiene título e icono para sección de evidencias
 */
const getTituloSeccionCorrectivo = (tipo: string): { titulo: string; icono: string } => {
  switch (tipo) {
    case 'ANTES':
      return { titulo: 'ESTADO INICIAL (PROBLEMA)', icono: '⚠️' };
    case 'DURANTE':
      return { titulo: 'PROCESO DE REPARACIÓN', icono: '🔧' };
    case 'DESPUES':
      return { titulo: 'ESTADO FINAL (CORREGIDO)', icono: '✅' };
    case 'MEDICION':
      return { titulo: 'VERIFICACIONES', icono: '📏' };
    default:
      return { titulo: 'GENERAL', icono: '📷' };
  }
};

export default generarCorrectivoOrdenHTML;
