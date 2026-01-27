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
 *
 * ✅ MULTI-EQUIPOS (16-DIC-2025): Soporta órdenes con múltiples equipos
 */

import {
  ActividadesPorEquipoPDF,
  baseStyles,
  EquipoOrdenPDF,
  EvidenciasPorEquipoPDF,
  generarChecklistMultiEquipo,
  generarLeyendaEquipos,
  generarMedicionesMultiEquipo,
  MedicionesPorEquipoPDF,
  MEKANOS_COLORS,
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

  // ✅ FIX 05-ENE-2026: Datos del firmante para mostrar nombre/cargo
  nombreTecnico?: string;
  // cargoTecnico ya existe arriba en línea 55
  nombreCliente?: string;
  cargoCliente?: string;

  // ✅ MULTI-EQUIPOS (16-DIC-2025): Soporte para múltiples equipos
  esMultiEquipo?: boolean;
  actividadesPorEquipo?: ActividadesPorEquipoPDF[];
  medicionesPorEquipo?: MedicionesPorEquipoPDF[];
  evidenciasPorEquipo?: EvidenciasPorEquipoPDF[];
  equiposOrden?: EquipoOrdenPDF[];
}

export interface TrabajoEjecutadoPDF {
  orden: number;
  descripcion: string;
  sistema: string;
  tiempoHoras: number;
  // ✅ FIX: Aceptar todos los códigos de simbología válidos
  resultado:
  | 'COMPLETADO'
  | 'PARCIAL'
  | 'PENDIENTE'
  | 'B'
  | 'R'
  | 'M'
  | 'C'
  | 'NA'
  | 'I'
  | 'LI'
  | 'A'
  | 'L'
  | 'LA'
  | 'S'
  | 'NT'
  | 'BA'
  | 'F'
  | 'RN'
  | 'NF'
  | string;
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
  const tieneDatosModulo =
    datos.datosModulo && Object.values(datos.datosModulo).some((v) => v != null && v !== 0);

  // ✅ MULTI-EQUIPOS: Determinar si usar tablas multi-equipo
  const esMultiEquipo =
    datos.esMultiEquipo || (datos.actividadesPorEquipo && datos.actividadesPorEquipo.length > 1);

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
        
        <!-- ✅ MULTI-EQUIPOS: Leyenda de equipos si hay más de uno -->
        ${generarLeyendaEquipos(
    datos.actividadesPorEquipo?.map((a) => a.equipo),
    esMultiEquipo,
  )}
        
        <!-- 2. DATOS DEL CLIENTE Y SERVICIO -->
        ${generarDatosCliente(datos)}
        
        <!-- 3. REGISTRO DE DATOS DEL MÓDULO DE CONTROL (solo si aplica) -->
        ${tieneDatosModulo ? generarDatosModulo(datos) : ''}
        
        <!-- 4. GENERAL (Trabajos ejecutados) -->
        <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
        ${esMultiEquipo && datos.actividadesPorEquipo
      ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
      : generarSeccionGeneral(datos.trabajosEjecutados)
    }
        
        <!-- 5. SIMBOLOGÍA -->
        ${generarSimbologia()}
        
        <!-- 6. MEDICIONES TÉCNICAS (solo si aplica) -->
        <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
        ${esMultiEquipo && datos.medicionesPorEquipo
      ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
      : tieneMediciones
        ? generarMediciones(datos.mediciones!)
        : ''
    }
    </div>
    
    <div class="page page-break">
        <!-- 7 y 8. REGISTRO FOTOGRÁFICO DEL SERVICIO + FOTOS GENERALES -->
        <!-- ✅ MULTI-EQUIPOS: Usar evidencias agrupadas por equipo si es multi-equipo -->
        ${esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
      ? generarEvidenciasMultiEquipo(datos.evidenciasPorEquipo)
      : generarEvidencias(datos.evidencias || [])
    }
        
        <!-- 9. OBSERVACIONES -->
        ${generarObservaciones(datos)}
        
        <!-- 10. FIRMAS -->
        ${generarFirmas(datos)}
        
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
                ${trabajos
    .map(
      (t) => `
                <tr>
                    <td>${t.descripcion}</td>
                    <td style="text-align: center;">
                        <span class="resultado-badge resultado-${mapResultado(t.resultado)}">${mapResultado(t.resultado)}</span>
                    </td>
                    <td><span class="observacion-actividad">${t.sistema || ''}</span></td>
                </tr>
                `,
    )
    .join('')}
            </tbody>
        </table>
    </div>
`;

// ✅ FIX: Mapea resultados preservando códigos reales (B, R, M, C, NA, etc.)
const mapResultado = (resultado: string): string => {
  if (!resultado) return 'NA';

  // Si ya es un código válido, devolverlo directamente
  const codigosValidos = [
    'B',
    'R',
    'M',
    'C',
    'NA',
    'I',
    'LI',
    'A',
    'L',
    'LA',
    'S',
    'NT',
    'BA',
    'F',
    'RN',
    'NF',
    'SI',
    'NO',
  ];
  if (codigosValidos.includes(resultado.toUpperCase())) {
    return resultado.toUpperCase();
  }

  // Mapear nombres largos a códigos
  switch (resultado.toUpperCase()) {
    case 'COMPLETADO':
      return 'B';
    case 'BUENO':
      return 'B';
    case 'PARCIAL':
      return 'R';
    case 'REGULAR':
      return 'R';
    case 'PENDIENTE':
      return 'M';
    case 'MALO':
      return 'M';
    case 'CAMBIADO':
      return 'C';
    case 'NO_APLICA':
      return 'NA';
    case 'N/A':
      return 'NA';
    default:
      return resultado; // Devolver tal cual, no asumir 'B'
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
            <div class="simbologia-item"><span class="simbologia-code">SI:</span> Sí</div>
            <div class="simbologia-item"><span class="simbologia-code">NO:</span> No</div>
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
    const captionLimpio = ev.caption.replace(
      /^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i,
      '',
    );
    grupos[tipo].push({ url: ev.url, caption: captionLimpio });
  });

  // Generar HTML agrupado
  const seccionesHTML = ordenTipos
    .filter((tipo) => grupos[tipo] && grupos[tipo].length > 0)
    .map((tipo) => {
      const { titulo, icono } = getTituloSeccion(tipo);
      const evidenciasTipo = grupos[tipo];
      const claseGrupo =
        tipo === 'GENERAL' ? 'evidencias-grupo evidencias-grupo-general' : 'evidencias-grupo';
      const tituloMostrar =
        tipo === 'GENERAL' ? '📷 FOTOS GENERALES DEL SERVICIO' : `${icono} ${titulo}`;

      return `
            <div class="${claseGrupo}">
                <div class="evidencias-grupo-titulo">${tituloMostrar} (${evidenciasTipo.length})</div>
                <div class="evidencias-grid-compacto">
                    ${evidenciasTipo
          .map(
            (ev, idx) => `
                    <div class="evidencia-item-compacto">
                        <img src="${ev.url}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
                        <div class="evidencia-caption-compacto">${ev.caption || `Foto ${idx + 1}`}</div>
                    </div>
                    `,
          )
          .join('')}
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

  const contenido = partes.length > 0 ? partes.join('<br><br>') : 'Sin observaciones adicionales.';

  return `
    <div class="section">
        <div class="section-title">OBSERVACIONES</div>
        <div class="observaciones-box">
            ${contenido}
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
                                <img src="${ev.url}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
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
