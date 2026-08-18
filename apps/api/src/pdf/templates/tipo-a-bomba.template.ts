/**
 * Template MEKANOS - Mantenimiento Preventivo Tipo A - BOMBAS
 *
 * Checklist específico para sistemas de bombeo:
 * - Limpieza general del sistema
 * - Análisis de vibración y ruido
 * - Mediciones eléctricas
 * - Revisión de fugas
 * - Tablero de control
 * - Presostatos
 * - Tanques y membranas
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

export const generarTipoABombaHTML = (datos: DatosOrdenPDF): string => {
  // ✅ MULTI-EQUIPOS: Determinar si usar tablas multi-equipo
  const esMultiEquipo =
    datos.esMultiEquipo || (datos.actividadesPorEquipo && datos.actividadesPorEquipo.length > 1);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Mantenimiento - ${datos.numeroOrden}</title>
  <style>
    ${baseStyles}
    
    .bomba-icon {
      color: ${MEKANOS_COLORS.secondary};
      font-size: 14px;
      margin-right: 5px;
    }
    
    .presion-value {
      font-weight: bold;
      color: ${MEKANOS_COLORS.primary};
      background: ${MEKANOS_COLORS.background};
      padding: 2px 8px;
      border-radius: 3px;
    }
    
    .pregunta-si-no {
      display: inline-flex;
      gap: 5px;
    }
    
    .opcion-si-no {
      padding: 2px 10px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    
    .opcion-si {
      background: ${MEKANOS_COLORS.success};
      color: white;
    }
    
    .opcion-no {
      background: ${MEKANOS_COLORS.danger};
      color: white;
    }
    
    .opcion-inactive {
      background: ${MEKANOS_COLORS.border};
      color: ${MEKANOS_COLORS.text};
    }
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
    
    <!-- CHECKLIST DE BOMBAS -->
    <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
    ${esMultiEquipo && datos.actividadesPorEquipo
      ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
      : generarChecklistBombas(datos)
    }
    
    <!-- MEDICIONES -->
    <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
    ${esMultiEquipo && datos.medicionesPorEquipo
      ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
      : '' // Las mediciones se incluyen en generarChecklistBombas para órdenes simples
    }
    
    <!-- SIMBOLOGÍA -->
    ${generarSimbologia()}
    
    <!-- EVIDENCIAS FOTOGRÁFICAS -->
    ${datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
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
    'SISTEMAS DE BOMBEO',
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

/**
 * Función auxiliar para obtener valor de medición por nombre EXACTO de parámetro
 * ✅ CORREGIDO: Usa coincidencia exacta para evitar cruces de datos
 */
const obtenerMedicionExacta = (
  mediciones: any[],
  nombreExacto: string,
): { valor: string; unidad: string } => {
  if (!mediciones || mediciones.length === 0) return { valor: '-', unidad: '' };

  // Buscar coincidencia exacta (case-insensitive)
  const med = mediciones.find((m: any) => {
    const param = (m.parametro || '').toLowerCase().trim();
    return param === nombreExacto.toLowerCase().trim();
  });

  if (med && med.valor !== null && med.valor !== undefined) {
    return { valor: String(med.valor), unidad: med.unidad || '' };
  }
  return { valor: '-', unidad: '' };
};

/**
 * Detecta si una actividad es realmente una medición (debe excluirse del checklist)
 */
const esActividadMedicion = (descripcion: string): boolean => {
  const desc = descripcion.toLowerCase();
  return (
    desc.includes('medición') ||
    desc.includes('presión') ||
    desc.includes('voltaje') ||
    desc.includes('amperaje') ||
    desc.includes('temperatura') ||
    desc.includes('rpm') ||
    (desc.includes('medir') && !desc.includes('revisar'))
  );
};

const generarChecklistBombas = (datos: DatosOrdenPDF): string => {
  // Filtrar actividades que NO son mediciones (las mediciones van en sección aparte)
  const actividadesChecklist = (datos.actividades || []).filter(
    (act: any) => !esActividadMedicion(act.descripcion || ''),
  );

  // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Unidades dinámicas con fallback
  const u = datos.configUnidades || {};
  const unidades = {
    presion: u.presion || 'PSI',
    voltaje: u.voltaje || 'V',
    corriente: u.corriente || 'A',
    temperatura: u.temperatura || '°C',
    vibracion: u.vibracion || 'mm/s',
  };

  // Obtener mediciones con NOMBRES EXACTOS del catálogo
  // (Los nombres corresponden a los registros en parametros_medicion)
  const presion = obtenerMedicionExacta(datos.mediciones, 'Medición de Presiones');
  const voltaje = obtenerMedicionExacta(datos.mediciones, 'Medición de Voltaje');
  const amperaje = obtenerMedicionExacta(datos.mediciones, 'Medición de Amperaje');
  const temperatura = obtenerMedicionExacta(datos.mediciones, 'Temperatura');
  const presionEncendido = obtenerMedicionExacta(datos.mediciones, 'Presostato Presión Encendido');
  const presionApagado = obtenerMedicionExacta(datos.mediciones, 'Presostato Presión Apagado');
  const presionTanques = obtenerMedicionExacta(datos.mediciones, 'Presión Tanques');
  const vibracion = obtenerMedicionExacta(datos.mediciones, 'Análisis de Vibración');

  return `
  <div class="section">
    <div class="section-title">LISTA DE ACTIVIDADES DE MANTENIMIENTO</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 60%;">Actividad</th>
          <th style="width: 20%;">Valor/Estado</th>
          <th style="width: 20%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        <!-- Actividades dinámicas del checklist -->
        ${actividadesChecklist
      .map(
        (act: any) => `
          <tr>
            <td>${act.descripcion || 'Actividad'}</td>
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
  
  <!-- SECCIÓN DE MEDICIONES -->
  <div class="section">
    <div class="section-title">📊 MEDICIONES TÉCNICAS</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 50%;">Parámetro</th>
          <th style="width: 25%;">Valor</th>
          <th style="width: 25%;">Unidad</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Medición de las presiones</strong></td>
          <td style="text-align: center;"><span class="presion-value">${presion.valor}</span></td>
          <td style="text-align: center;">${unidades.presion}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Medición de voltaje</strong></td>
          <td style="text-align: center;"><span class="presion-value">${voltaje.valor}</span></td>
          <td style="text-align: center;">${unidades.voltaje}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Medición de amperaje</strong></td>
          <td style="text-align: center;"><span class="presion-value">${amperaje.valor}</span></td>
          <td style="text-align: center;">${unidades.corriente}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Temperatura</strong></td>
          <td style="text-align: center;"><span class="presion-value">${temperatura.valor}</span></td>
          <td style="text-align: center;">${unidades.temperatura}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Vibración</strong></td>
          <td style="text-align: center;"><span class="presion-value">${vibracion.valor}</span></td>
          <td style="text-align: center;">${unidades.vibracion}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Presostato - Presión encendido</strong></td>
          <td style="text-align: center;"><span class="presion-value">${presionEncendido.valor}</span></td>
          <td style="text-align: center;">${unidades.presion}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Presostato - Presión apagado</strong></td>
          <td style="text-align: center;"><span class="presion-value">${presionApagado.valor}</span></td>
          <td style="text-align: center;">${unidades.presion}</td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Presión de tanques</strong></td>
          <td style="text-align: center;"><span class="presion-value">${presionTanques.valor}</span></td>
          <td style="text-align: center;">${unidades.presion}</td>
        </tr>
        ${(datos.mediciones || [])
      .filter((m: any) => {
        // Excluir mediciones que ya se mostraron arriba (coincidencia exacta)
        const nombresMostrados = [
          'medición de presiones',
          'medición de voltaje',
          'medición de amperaje',
          'temperatura',
          'presostato presión encendido',
          'presostato presión apagado',
          'presión tanques',
          'análisis de vibración',
        ];
        const param = (m.parametro || '').toLowerCase().trim();
        return !nombresMostrados.includes(param);
      })
      .map(
        (m: any) => `
          <tr style="background: ${MEKANOS_COLORS.background};">
            <td><strong>${m.parametro}</strong></td>
            <td style="text-align: center;"><span class="presion-value">${m.valor ?? '-'}</span></td>
            <td style="text-align: center;">${m.unidad || ''}</td>
          </tr>
        `,
      )
      .join('')}
      </tbody>
    </table>
  </div>
`;
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

/**
 * Detecta si una evidencia es de INSUMOS por su caption/descripción
 * ✅ FIX 17-DIC-2025: Detección precisa basada en descripción exacta de la actividad
 */
const esEvidenciaInsumos = (caption: string): boolean => {
  const captionLower = caption.toLowerCase();
  // Detección PRECISA: La descripción exacta de la actividad de insumos
  return (
    captionLower.includes('verificación y registro fotográfico de insumos') ||
    captionLower.includes('verificacion y registro fotografico de insumos') ||
    // Fallback más específico
    (captionLower.includes('insumo') && captionLower.includes('registro'))
  );
};

/**
 * Extrae el tipo de evidencia del caption (ANTES, DURANTE, DESPUÉS, GENERAL)
 */
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

/**
 * Títulos para cada sección de evidencias
 */
const getTituloSeccionBomba = (tipo: string): { titulo: string; icono: string } => {
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
 * ✅ FIX 06-AGO-2026: Fase interna de fotos generales ("GENERAL: ANTES: X" → ANTES)
 */
const detectarFaseFotoGeneral = (caption: string): string => {
  const m = caption.match(/(?:ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN):/i);
  if (!m) return 'GENERAL';
  const raw = m[0].toUpperCase().replace(':', '').trim();
  if (raw === 'DESPUÉS') return 'DESPUES';
  if (raw === 'MEDICIÓN') return 'MEDICION';
  return raw;
};

/**
 * ✅ FIX 06-AGO-2026: Quita TODOS los prefijos de fase ("GENERAL: ANTES: X" → "X")
 */
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

/**
 * ✅ FIX 06-AGO-2026: Sub-secciones SUTILES de fase dentro de FOTOS GENERALES
 * (las generales no llevan la separación fuerte de las actividades; cada fase
 *  va en su propio contenedor con el color distintivo: azul/ámbar/verde).
 * Fotos sin fase van sueltas, como antes.
 */
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

const generarEvidencias = (evidencias: string[] | { url: string; caption?: string }[]): string => {
  if (!evidencias || evidencias.length === 0) {
    return `
    <div class="section">
      <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
      <div style="padding: 20px; text-align: center; color: #666;">
        No se registraron evidencias fotográficas para este servicio.
      </div>
    </div>
    `;
  }

  // Normalizar formato - soportar array de strings o array de objetos
  const evidenciasNormalizadas = evidencias.map((ev: any, idx: number) => {
    if (typeof ev === 'string') {
      return { url: ev, caption: `Evidencia ${idx + 1}` };
    }
    return { url: ev.url, caption: ev.caption || `Evidencia ${idx + 1}` };
  });

  // Separar evidencias de INSUMOS (para bombas no debería haber, pero por consistencia)
  const evidenciasRegulares = evidenciasNormalizadas.filter(
    (ev: any) => !esEvidenciaInsumos(ev.caption),
  );

  // Agrupar por tipo (ANTES, DURANTE, DESPUÉS)
  const grupos: Record<string, Array<{ url: string; caption: string }>> = {};
  const ordenTipos = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'];

  evidenciasRegulares.forEach((ev: any) => {
    const tipo = extraerTipoEvidencia(ev.caption);
    if (!grupos[tipo]) grupos[tipo] = [];
    const captionLimpio = limpiarPrefijosCaption(ev.caption);
    grupos[tipo].push({ url: ev.url, caption: captionLimpio, fase: detectarFaseFotoGeneral(ev.caption) });
  });

  // Generar HTML agrupado por secciones
  const seccionesHTML = ordenTipos
    .filter((tipo) => grupos[tipo] && grupos[tipo].length > 0)
    .map((tipo) => {
      const { titulo, icono } = getTituloSeccionBomba(tipo);
      const evidenciasTipo = grupos[tipo];

      // ✅ FIX: Clase y estilo especial para Fotos Generales
      const esGeneral = tipo === 'GENERAL';
      const tituloMostrar = esGeneral ? '📷 FOTOS GENERALES DEL SERVICIO' : `${icono} ${titulo}`;
      const colorFondo = esGeneral
        ? 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)'
        : `linear-gradient(135deg, ${MEKANOS_COLORS.primary} 0%, ${MEKANOS_COLORS.secondary} 100%)`;
      const bordeGrupo = esGeneral ? 'border: 2px solid #0d9488;' : '';
      const fondoGrupo = esGeneral
        ? 'background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);'
        : '';

      return `
        <div class="evidencias-grupo" style="margin-bottom: 20px; ${bordeGrupo} ${fondoGrupo} border-radius: 8px; overflow: hidden;">
        <div style="background: ${colorFondo}; color: white; padding: 8px 15px; font-weight: bold; margin-bottom: 0; ${esGeneral ? 'font-size: 12px; letter-spacing: 0.5px;' : ''}">
          ${tituloMostrar} (${evidenciasTipo.length})
        </div>
        ${esGeneral
          ? generarSubSeccionesGenerales(evidenciasTipo, 'evidencias-grid', 'evidencia-item', 'evidencia-caption')
          : `<div class="evidencias-grid" style="padding: 10px;">
          ${evidenciasTipo
          .map(
            (ev: any, idx: number) => `
            <div class="evidencia-item">
              <img src="${optimizarUrlCloudinary(ev.url)}" alt="${ev.caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
              <div class="evidencia-caption" style="${esGeneral ? 'background: #0d9488;' : ''}">${ev.caption || `Foto ${idx + 1}`}</div>
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
  <div class="section">
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

/**
 * ✅ MULTI-EQUIPOS: Genera evidencias agrupadas por equipo
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
        const tipo = extraerTipoEvidencia(ev.caption || '');
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
          const { titulo, icono } = getTituloSeccionBomba(tipo);
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

export default generarTipoABombaHTML;
