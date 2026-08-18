/**
 * Template MEKANOS - Mantenimiento Preventivo Tipo A - GENERADORES
 *
 * SISTEMA DE ENFRIAMIENTO
 * SISTEMA DE ASPIRACIÓN
 * SISTEMA DE COMBUSTIBLE
 * SISTEMA DE LUBRICACIÓN
 * SISTEMA DE ESCAPE
 * SISTEMA ELÉCTRICO DEL MOTOR
 * REGISTRO DE DATOS DEL MÓDULO DE CONTROL
 * GENERAL
 *
 * ✅ MULTI-EQUIPOS (15-DIC-2025): Soporta órdenes con múltiples equipos
 */

import {
  baseStyles,
  DatosOrdenPDF,
  EvidenciasPorEquipoPDF,
  generarChecklistMultiEquipo,
  generarHeaderConLogo,
  generarLeyendaEquipos,
  generarMedicionesMultiEquipo,
  MEKANOS_COLORS
} from './mekanos-base.template';

/**
 * ✅ FIX 30-ENE-2026: Optimizar URLs de Cloudinary para reducir tamaño del PDF
 * Transforma URLs para aplicar compresión: q_auto:low,w_600,f_jpg
 * Reduce imágenes de 2-5MB a 50-150KB cada una
 */
const optimizarUrlCloudinary = (url: string): string => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('q_auto') || url.includes('w_600')) return url;
  const match = url.match(/(.+\/upload\/)(.+)/);
  if (match) return `${match[1]}q_auto:low,w_600,f_jpg/${match[2]}`;
  return url;
};

export const generarTipoAGeneradorHTML = (datos: DatosOrdenPDF): string => {
  // ✅ MULTI-EQUIPOS: Determinar si usar tablas multi-equipo
  const esMultiEquipo =
    datos.esMultiEquipo || (datos.actividadesPorEquipo && datos.actividadesPorEquipo.length > 1);

  const actividadesPorSistema = agruparActividadesPorSistema(datos.actividades);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Mantenimiento - ${datos.numeroOrden}</title>
  <style>
    ${baseStyles}
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    ${generarHeader(datos)}
    
    <!-- ✅ MULTI-EQUIPOS: Leyenda de equipos si hay más de uno -->
    ${generarLeyendaEquipos(
    datos.actividadesPorEquipo?.map((a) => a.equipo),
    esMultiEquipo,
  )}
    
    <!-- DATOS DEL CLIENTE Y SERVICIO -->
    ${generarDatosCliente(datos)}
    
    <!-- LISTA DE ACTIVIDADES DE INSPECCIÓN -->
    <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
    ${esMultiEquipo && datos.actividadesPorEquipo
      ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
      : `
          ${generarSeccionActividades('SISTEMA DE ENFRIAMIENTO', actividadesPorSistema['ENFRIAMIENTO'] || [])}
          ${generarSeccionActividades('SISTEMA DE ASPIRACIÓN', actividadesPorSistema['ASPIRACION'] || [])}
          ${generarSeccionActividades('SISTEMA DE COMBUSTIBLE', actividadesPorSistema['COMBUSTIBLE'] || [])}
          ${generarSeccionActividades('SISTEMA DE LUBRICACIÓN', actividadesPorSistema['LUBRICACION'] || [])}
          ${generarSeccionActividades('SISTEMA DE ESCAPE', actividadesPorSistema['ESCAPE'] || [])}
          ${generarSeccionActividades('SISTEMA ELÉCTRICO DEL MOTOR', actividadesPorSistema['ELECTRICO'] || [])}
        `
    }
    
    <!-- REGISTRO DE DATOS DEL MÓDULO DE CONTROL -->
    ${generarDatosModulo(datos)}
    
    <!-- GENERAL: Solo para órdenes de un solo equipo (ya está incluido en checklist multi-equipo) -->
    ${!esMultiEquipo ? generarSeccionGeneral(actividadesPorSistema['GENERAL'] || []) : ''}
    
    <!-- SIMBOLOGÍA -->
    ${generarSimbologia()}
    
    <!-- MEDICIONES (si hay) -->
    <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
    ${esMultiEquipo && datos.medicionesPorEquipo
      ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
      : datos.mediciones.length > 0
        ? generarMediciones(datos.mediciones)
        : ''
    }
    
    <!-- EVIDENCIAS FOTOGRÁFICAS -->
    <!-- ✅ MULTI-EQUIPOS (16-DIC-2025): Usar evidencias agrupadas por equipo si es multi-equipo -->
    ${esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
      ? generarEvidenciasMultiEquipo(datos.evidenciasPorEquipo)
      : generarEvidencias(datos.evidencias)
    }
    
    <!-- OBSERVACIONES -->
    ${generarObservaciones(datos.observaciones)}
    
    <!-- FIRMAS -->
    ${generarFirmas(datos)}
    
    <!-- FOOTER -->
    ${generarFooter()}
  </div>
</body>
</html>
`;
};

const generarHeader = (datos: DatosOrdenPDF): string =>
  generarHeaderConLogo(
    'MANTENIMIENTO PREVENTIVO TIPO A',
    'EQUIPOS GENERADORES ELÉCTRICOS',
    datos.numeroOrden,
  );

const generarDatosCliente = (datos: DatosOrdenPDF): string => `
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

const generarSeccionActividades = (titulo: string, actividades: any[]): string => {
  if (actividades.length === 0) return '';

  return `
  <div class="section">
    <div class="section-subtitle">${titulo}</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        ${actividades
      .map(
        (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;">
              <span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span>
            </td>
            <td><span class="observacion-actividad">${act.observaciones || ''}</span></td>
          </tr>
        `,
      )
      .join('')}
      </tbody>
    </table>
  </div>
`;
};

const generarDatosModulo = (datos: DatosOrdenPDF): string => {
  const modulo = datos.datosModulo || {};

  // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Unidades dinámicas con fallback
  const u = datos.configUnidades || {};
  const unidades = {
    velocidad: u.velocidad || 'RPM',
    presion: u.presion || 'PSI',
    temperatura: u.temperatura || '°C',
    voltaje: u.voltaje || 'V',
    frecuencia: u.frecuencia || 'Hz',
    corriente: u.corriente || 'A',
  };

  return `
  <div class="section">
    <div class="section-subtitle">REGISTRO DE DATOS DEL MÓDULO DE CONTROL</div>
    <div class="mediciones-grid">
      <div class="medicion-item">
        <div class="medicion-label">Velocidad Motor</div>
        <div class="medicion-value">${modulo.rpm || '-'} ${unidades.velocidad}</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Presión Aceite</div>
        <div class="medicion-value">${modulo.presionAceite || '-'} ${unidades.presion}</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Temp. Refrigerante</div>
        <div class="medicion-value">${modulo.temperaturaRefrigerante || '-'} ${unidades.temperatura}</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Carga Batería</div>
        <div class="medicion-value">${modulo.cargaBateria || '-'} ${unidades.voltaje}</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Horas Trabajo</div>
        <div class="medicion-value">${modulo.horasTrabajo || '-'} Hrs</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Voltaje Generador</div>
        <div class="medicion-value">${modulo.voltaje || '-'} ${unidades.voltaje}</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Frecuencia</div>
        <div class="medicion-value">${modulo.frecuencia || '-'} ${unidades.frecuencia}</div>
      </div>
      <div class="medicion-item">
        <div class="medicion-label">Corriente</div>
        <div class="medicion-value">${modulo.corriente || '-'} ${unidades.corriente}</div>
      </div>
    </div>
  </div>
`;
};

const generarSeccionGeneral = (actividades: any[]): string => `
  <div class="section">
    <div class="section-subtitle">GENERAL</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Pregunta</th>
          <th style="width: 15%;">Resp.</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        ${actividades
    .map(
      (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;">
              <span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span>
            </td>
            <td><span class="observacion-actividad">${act.observaciones || ''}</span></td>
          </tr>
        `,
    )
    .join('')}
      </tbody>
    </table>
  </div>
`;

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

const generarMediciones = (mediciones: any[]): string => `
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
            <td style="text-align: center; font-weight: bold;">${med.valor}</td>
            <td style="text-align: center;">${med.unidad}</td>
            <td style="text-align: center;" class="alerta-${med.nivelAlerta}">${med.nivelAlerta}</td>
          </tr>
        `,
    )
    .join('')}
      </tbody>
    </table>
  </div>
`;

// Soporte para evidencias como strings o objetos {url, caption}
type EvidenciaInput = string | { url: string; caption?: string };

// Extraer tipo de evidencia del caption (ANTES, DURANTE, DESPUÉS, MEDICIÓN, GENERAL)
const extraerTipoEvidencia = (caption: string): string => {
  const tipoMatch = caption.match(/^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):/i);
  if (tipoMatch) {
    const tipo = tipoMatch[1].toUpperCase();
    // Normalizar variantes
    if (tipo === 'DESPUÉS') return 'DESPUES';
    if (tipo === 'MEDICIÓN') return 'MEDICION';
    return tipo;
  }
  return 'GENERAL';
};

// Títulos amigables para cada sección
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

/**
 * NOTA: Tipo A NO incluye sección de INSUMOS - esa sección es exclusiva de Tipo B
 */

// ✅ FIX 06-AGO-2026: Fase interna de fotos generales ("GENERAL: ANTES: X" → ANTES)
const detectarFaseFotoGeneral = (caption: string): string => {
  const m = caption.match(/(?:ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN):/i);
  if (!m) return 'GENERAL';
  const raw = m[0].toUpperCase().replace(':', '').trim();
  if (raw === 'DESPUÉS') return 'DESPUES';
  if (raw === 'MEDICIÓN') return 'MEDICION';
  return raw;
};

// ✅ FIX 06-AGO-2026: Quita TODOS los prefijos de fase ("GENERAL: ANTES: X" → "X")
const limpiarPrefijosCaption = (caption: string): string => {
  let limpio = caption;
  const re = /^(?:ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i;
  while (re.test(limpio)) {
    limpio = limpio.replace(re, '');
  }
  return limpio;
};

const SUB_LABEL_FASE: Record<string, string> = {
  ANTES: 'Antes del servicio',
  DURANTE: 'Durante el servicio',
  DESPUES: 'Después del servicio',
  MEDICION: 'Mediciones',
};

// ✅ FIX 06-AGO-2026: Color distintivo por fase (igual que el selector de la app)
const SUB_COLOR_FASE: Record<string, { bg: string; border: string; text: string }> = {
  ANTES: { bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', text: '#1d4ed8' },
  DURANTE: { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#b45309' },
  DESPUES: { bg: 'rgba(34,197,94,0.10)', border: '#22c55e', text: '#15803d' },
  MEDICION: { bg: 'rgba(139,92,246,0.10)', border: '#8b5cf6', text: '#6d28d9' },
};

const SUB_ICONO_FASE: Record<string, string> = {
  ANTES: '📸',
  DURANTE: '🔧',
  DESPUES: '✅',
  MEDICION: '📏',
};

// ✅ FIX 06-AGO-2026: Sub-secciones SUTILES de fase dentro de FOTOS GENERALES
// Cada fase (ANTES/DURANTE/DESPUÉS) va en su propio contenedor con el color
// distintivo (azul/ámbar/verde) en borde, cabecera y badge de conteo.
const generarSubSeccionesGenerales = (
  evidencias: Array<{ url: string; caption: string; fase?: string }>,
  gridClass: string,
  itemClass: string,
  captionClass: string,
): string => {
  const subOrden = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'];
  const subGrupos: Record<string, Array<{ url: string; caption: string }>> = {};
  evidencias.forEach((ev) => {
    const fase = ev.fase || 'GENERAL';
    if (!subGrupos[fase]) subGrupos[fase] = [];
    subGrupos[fase].push({ url: ev.url, caption: ev.caption });
  });

  return subOrden
    .filter((f) => subGrupos[f] && subGrupos[f].length > 0)
    .map((f) => {
      const fotos = subGrupos[f];
      const color = SUB_COLOR_FASE[f];
      const esColoreada = f !== 'GENERAL' && color;

      const gridFotos = `
        <div class="${gridClass}" style="${esColoreada ? 'padding: 8px; background: #f8f9fa;' : ''}">
          ${fotos
            .map(
              (ev, idx) => `
            <div class="${itemClass}">
              <img src="${optimizarUrlCloudinary(ev.url)}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
              <div class="${captionClass}" style="${esColoreada ? `background: ${color.border}; color: #ffffff;` : ''}">${ev.caption || `Foto ${idx + 1}`}</div>
            </div>
          `,
            )
            .join('')}
        </div>`;

      if (!esColoreada) return gridFotos;

      return `
      <div style="border: 1px solid ${color.border}; border-radius: 8px; overflow: hidden; margin: 8px 0; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 6px; background: ${color.bg}; border-bottom: 1px solid ${color.border}; color: ${color.text}; padding: 5px 10px; font-size: 9px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase;">
          <span>${SUB_ICONO_FASE[f] || '📷'}</span>
          <span>${SUB_LABEL_FASE[f]}</span>
          <span style="margin-left: auto; background: ${color.border}; color: #ffffff; border-radius: 999px; padding: 1px 7px; font-size: 8px; line-height: 13px;">${fotos.length}</span>
        </div>
        ${gridFotos}
      </div>`;
    })
    .join('');
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
    return { url: ev.url, caption: ev.caption || `Evidencia ${idx + 1}` };
  };

  // TIPO A: NO mostrar evidencias de insumos (exclusivo de Tipo B)
  const evidenciasNormalizadas = evidencias.map((ev, idx) => normalizarEvidencia(ev, idx));

  // Filtrar cualquier evidencia de insumos - NO deben aparecer en Tipo A
  const evidenciasRegulares = evidenciasNormalizadas.filter((ev) => {
    const captionLower = (ev.caption || '').toLowerCase();
    const esInsumo =
      captionLower.includes('insumo') ||
      captionLower.includes('verificación y registro fotográfico de insumos');
    return !esInsumo;
  });

  // Agrupar evidencias por tipo (ANTES, DURANTE, DESPUÉS, MEDICIÓN)
  const grupos: Record<string, Array<{ url: string; caption: string }>> = {};
  const ordenTipos = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'];

  evidenciasRegulares.forEach((ev) => {
    const tipo = extraerTipoEvidencia(ev.caption);
    if (!grupos[tipo]) grupos[tipo] = [];
    // Limpiar el tipo del caption para mostrar solo la descripción
    const captionLimpio = limpiarPrefijosCaption(ev.caption);
    grupos[tipo].push({ url: ev.url, caption: captionLimpio, fase: detectarFaseFotoGeneral(ev.caption) });
  });

  // Generar HTML agrupado
  const seccionesHTML = ordenTipos
    .filter((tipo) => grupos[tipo] && grupos[tipo].length > 0)
    .map((tipo) => {
      const { titulo, icono } = getTituloSeccion(tipo);
      const evidenciasTipo = grupos[tipo];

      // ✅ FIX: Clase especial para Fotos Generales
      const claseGrupo =
        tipo === 'GENERAL' ? 'evidencias-grupo evidencias-grupo-general' : 'evidencias-grupo';
      const tituloMostrar =
        tipo === 'GENERAL' ? '📷 FOTOS GENERALES DEL SERVICIO' : `${icono} ${titulo}`;

      return `
      <div class="${claseGrupo}">
        <div class="evidencias-grupo-titulo">${tituloMostrar} (${evidenciasTipo.length})</div>
        ${tipo === 'GENERAL'
          ? generarSubSeccionesGenerales(evidenciasTipo, 'evidencias-grid-compacto', 'evidencia-item-compacto', 'evidencia-caption-compacto')
          : `<div class="evidencias-grid-compacto">
          ${evidenciasTipo
          .map(
            (ev, idx) => `
            <div class="evidencia-item-compacto">
              <img src="${optimizarUrlCloudinary(ev.url)}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
              <div class="evidencia-caption-compacto">${ev.caption || `Foto ${idx + 1}`}</div>
            </div>
          `,
          )
          .join('')}
        </div>`}
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

const generarObservaciones = (observaciones: string): string => `
  <div class="section">
    <div class="section-title">OBSERVACIONES</div>
    <div class="observaciones-box">
      ${observaciones || 'Sin observaciones adicionales.'}
    </div>
  </div>
`;

// ✅ FIX 05-ENE-2026: Mostrar nombre y cargo del técnico/cliente bajo la firma
const generarFirmas = (datos: DatosOrdenPDF): string => `
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

const agruparActividadesPorSistema = (actividades: any[]): Record<string, any[]> => {
  const grupos: Record<string, any[]> = {
    ENFRIAMIENTO: [],
    ASPIRACION: [],
    COMBUSTIBLE: [],
    LUBRICACION: [],
    ESCAPE: [],
    ELECTRICO: [],
    GENERAL: [],
  };

  actividades.forEach((act) => {
    const sistema = act.sistema?.toUpperCase() || 'GENERAL';
    if (grupos[sistema]) {
      grupos[sistema].push(act);
    } else {
      grupos['GENERAL'].push(act);
    }
  });

  return grupos;
};

/**
 * ✅ MULTI-EQUIPOS (16-DIC-2025): Genera sección de evidencias agrupadas por equipo
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
        const tipo = ev.momento || extraerTipoEvidenciaGenerador(ev.caption || '');
        if (!grupos[tipo]) grupos[tipo] = [];
        const captionLimpio = limpiarPrefijosCaption(ev.caption || '');
        grupos[tipo].push({
          url: ev.url,
          caption: captionLimpio || `Foto ${grupos[tipo].length + 1}`,
          fase: detectarFaseFotoGeneral(ev.caption || ''),
        });
      });

      // Generar secciones de fotos por tipo
      const tiposHTML = ordenTipos
        .filter((tipo) => grupos[tipo] && grupos[tipo].length > 0)
        .map((tipo) => {
          const { titulo, icono } = getTituloSeccionGenerador(tipo);
          const evidenciasTipo = grupos[tipo];

          return `
        <div style="margin-bottom: 12px;">
          <div style="background: linear-gradient(135deg, ${MEKANOS_COLORS.secondary} 0%, ${MEKANOS_COLORS.primary} 100%); color: white; padding: 5px 12px; font-size: 10px; font-weight: bold; border-radius: 4px 4px 0 0;">
            ${icono} ${titulo} (${evidenciasTipo.length})
          </div>
          ${tipo === 'GENERAL'
            ? generarSubSeccionesGenerales(evidenciasTipo, 'evidencias-grid', 'evidencia-item', 'evidencia-caption')
            : `<div class="evidencias-grid" style="padding: 8px; background: #f8f9fa; border-radius: 0 0 4px 4px;">
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
          </div>`}
        </div>
      `;
        })
        .join('');

      // Colores alternados para cada equipo
      const coloresEquipo = [
        { bg: '#e0f2fe', border: '#0284c7', header: '#0369a1' },
        { bg: '#dcfce7', border: '#16a34a', header: '#15803d' },
        { bg: '#fef3c7', border: '#d97706', header: '#b45309' },
        { bg: '#fce7f3', border: '#db2777', header: '#be185d' },
      ];
      const color = coloresEquipo[equipoIdx % coloresEquipo.length];

      return `
    <div style="margin-bottom: 20px; border: 2px solid ${color.border}; border-radius: 8px; overflow: hidden;">
      <div style="background: ${color.header}; color: white; padding: 10px 15px; font-weight: bold; font-size: 13px;">
        ⚡ GENERADOR ${equipo.ordenSecuencia}: ${nombreEquipo.toUpperCase()}
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
const extraerTipoEvidenciaGenerador = (caption: string): string => {
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
const getTituloSeccionGenerador = (tipo: string): { titulo: string; icono: string } => {
  switch (tipo) {
    case 'ANTES':
      return { titulo: 'ESTADO INICIAL', icono: '📋' };
    case 'DURANTE':
      return { titulo: 'PROCESO DE MANTENIMIENTO', icono: '🔧' };
    case 'DESPUES':
      return { titulo: 'ESTADO FINAL', icono: '✅' };
    case 'MEDICION':
      return { titulo: 'MEDICIONES', icono: '📏' };
    default:
      return { titulo: 'GENERAL', icono: '📷' };
  }
};

export default generarTipoAGeneradorHTML;
