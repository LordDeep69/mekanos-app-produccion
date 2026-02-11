/**
 * Template MEKANOS - Mantenimiento Preventivo Tipo B - GENERADORES
 *
 * Incluye cambio de filtros y fluidos:
 * - CAMBIO DE REFRIGERANTE
 * - CAMBIO DE FILTROS DE AIRE
 * - CAMBIO DE FILTRO DE COMBUSTIBLE
 * - CAMBIO DE ACEITE
 * - CAMBIO DE FILTRO DE ACEITE
 *
 * Estilo alineado con Tipo A para consistencia profesional
 *
 * ✅ MULTI-EQUIPOS (16-DIC-2025): Soporta órdenes con múltiples equipos
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
 */
const optimizarUrlCloudinary = (url: string): string => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('q_auto') || url.includes('w_600')) return url;
  const match = url.match(/(.+\/upload\/)(.+)/);
  if (match) return `${match[1]}q_auto:low,w_600,f_jpg/${match[2]}`;
  return url;
};

export const generarTipoBGeneradorHTML = (datos: DatosOrdenPDF): string => {
  // ✅ MULTI-EQUIPOS: Determinar si usar tablas multi-equipo
  const esMultiEquipo =
    datos.esMultiEquipo || (datos.actividadesPorEquipo && datos.actividadesPorEquipo.length > 1);

  // actividadesPorSistema: reserved for future per-system rendering
  void agruparActividadesPorSistema(datos.actividades);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Mantenimiento - ${datos.numeroOrden}</title>
  <style>
    ${baseStyles}
    
    .cambio-badge {
      background: #4CAF50;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 8px;
      margin-left: 5px;
    }
    
    .tipo-b-banner {
      background: linear-gradient(135deg, ${MEKANOS_COLORS.primary} 0%, ${MEKANOS_COLORS.secondary} 100%);
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 12px;
      font-size: 11px;
    }
    
    /* ✅ FIX: Sección Insumos - Estilo limpio y profesional sin fondo verde */
    .insumos-section {
      background: ${MEKANOS_COLORS.white};
      border: 2px solid ${MEKANOS_COLORS.primary};
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .insumos-title {
      background: ${MEKANOS_COLORS.primary};
      color: white;
      padding: 8px 15px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 11px;
      display: inline-block;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    
    .insumos-photo {
      display: flex;
      justify-content: center;
      padding: 10px;
      background: ${MEKANOS_COLORS.background};
      border-radius: 6px;
    }
    
    .insumos-photo img {
      max-width: 280px;
      max-height: 200px;
      border-radius: 6px;
      border: 2px solid ${MEKANOS_COLORS.secondary};
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .insumos-caption {
      text-align: center;
      font-size: 10px;
      color: ${MEKANOS_COLORS.primary};
      margin-top: 8px;
      font-weight: 600;
      padding: 4px 8px;
      background: ${MEKANOS_COLORS.background};
      border-radius: 4px;
      display: inline-block;
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
    
    <!-- BANNER TIPO B -->
    <div class="tipo-b-banner">
      ⚙️ MANTENIMIENTO PREVENTIVO TIPO B - INCLUYE CAMBIO DE FILTROS Y FLUIDOS
    </div>
    
    <!-- SECCIÓN INSUMOS (VERIFICACIÓN FOTOGRÁFICA) -->
    <!-- ✅ MULTI-EQUIPOS (17-DIC-2025): Usar versión multi-equipo si aplica -->
    ${esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
      ? generarSeccionInsumosMultiEquipo(datos.evidenciasPorEquipo)
      : generarSeccionInsumos(datos.evidencias)
    }
    
    <!-- LISTA DE ACTIVIDADES DE MANTENIMIENTO -->
    <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
    ${esMultiEquipo && datos.actividadesPorEquipo
      ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
      : generarTodasLasActividades(datos.actividades)
    }
    
    <!-- REGISTRO DE DATOS DEL MÓDULO DE CONTROL -->
    ${generarDatosModulo(datos)}
    
    <!-- SIMBOLOGÍA -->
    ${generarSimbologia()}
    
    <!-- ✅ FIX 17-DIC-2025: MEDICIONES TÉCNICAS (si hay) -->
    <!-- ✅ MULTI-EQUIPOS: Usar tabla dinámica si hay múltiples equipos -->
    ${esMultiEquipo && datos.medicionesPorEquipo && datos.medicionesPorEquipo.length > 0
      ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
      : datos.mediciones && datos.mediciones.length > 0
        ? generarMediciones(datos.mediciones)
        : ''
    }
    
    <!-- EVIDENCIAS FOTOGRÁFICAS -->
    <!-- ✅ MULTI-EQUIPOS: Usar evidencias agrupadas por equipo si es multi-equipo -->
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
    'MANTENIMIENTO PREVENTIVO TIPO B',
    'GENERADORES ELÉCTRICOS - CAMBIO DE FILTROS Y FLUIDOS',
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
 * Detecta si una actividad es realmente un parámetro de medición (debe excluirse del checklist)
 * ✅ MEJORADO: Lista ampliada de términos para detectar mediciones
 * ✅ FIX: Excluye actividades de revisión/inspección como "REVISAR SISTEMA DE CARGA DE BATERÍAS"
 */
const esActividadMedicion = (descripcion: string): boolean => {
  const desc = descripcion.toLowerCase();

  // Si es una actividad de revisión/inspección, NO es medición
  if (
    desc.includes('revisar') ||
    desc.includes('inspeccionar') ||
    desc.includes('verificar estado')
  ) {
    return false;
  }

  // Lista de términos que identifican mediciones (van en Módulo de Control)
  // Estos términos deben ser específicos para evitar falsos positivos
  const terminosMedicion = [
    'rpm',
    'r.p.m',
    'velocidad motor',
    'velocidad de motor',
    'presión aceite',
    'presión de aceite',
    'temperatura refrigerante',
    'temp refrigerante',
    'temp. refrigerante',
    'registrar carga batería',
    'medir carga batería',
    'voltaje batería',
    'horas de trabajo',
    'horómetro',
    'horometro',
    'voltaje generador',
    'voltaje del generador',
    'voltaje salida',
    'frecuencia generador',
    'frecuencia del generador',
    'corriente generador',
    'corriente del generador',
    'amperaje',
  ];

  return (
    terminosMedicion.some((termino) => desc.includes(termino)) ||
    (desc.includes('medición') && desc.includes('parámetro'))
  );
};

/**
 * Detecta si una actividad es la de "Verificación de insumos" (virtual, no debe aparecer en checklist)
 */
const esActividadInsumos = (descripcion: string): boolean => {
  const desc = descripcion.toLowerCase();
  return (
    desc.includes('verificación y registro fotográfico de insumos') ||
    desc.includes('verificacion y registro fotografico de insumos') ||
    (desc.includes('registro fotográfico') && desc.includes('insumos'))
  );
};

/**
 * ✅ FIX 17-DIC-2025: Genera tabla de mediciones técnicas (single-equipo)
 */
const generarMediciones = (mediciones: any[]): string => `
  <div class="section">
    <div class="section-title">📊 MEDICIONES TÉCNICAS</div>
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
            <td style="text-align: center;" class="alerta-${med.nivelAlerta || 'OK'}">${med.nivelAlerta || 'OK'}</td>
          </tr>
        `,
    )
    .join('')}
      </tbody>
    </table>
  </div>
`;

/**
 * Genera TODAS las actividades en una sola sección con checklist completo
 * FILTRA las actividades que son parámetros de medición (aparecen en Módulo de Control)
 * ✅ FIX: También filtra la actividad artificial de "Verificación de insumos"
 */
const generarTodasLasActividades = (actividades: any[]): string => {
  if (!actividades || actividades.length === 0) {
    return `
    <div class="section">
      <div class="section-subtitle">LISTA DE ACTIVIDADES DE MANTENIMIENTO</div>
      <p style="padding: 10px; color: #666;">No se registraron actividades para este servicio.</p>
    </div>
    `;
  }

  // Filtrar actividades que NO son mediciones NI la actividad artificial de insumos
  const actividadesChecklist = actividades.filter(
    (act) =>
      !esActividadMedicion(act.descripcion || '') && !esActividadInsumos(act.descripcion || ''),
  );

  if (actividadesChecklist.length === 0) {
    return `
    <div class="section">
      <div class="section-subtitle">LISTA DE ACTIVIDADES DE MANTENIMIENTO</div>
      <p style="padding: 10px; color: #666;">No se registraron actividades de checklist para este servicio.</p>
    </div>
    `;
  }

  return `
  <div class="section">
    <div class="section-subtitle">LISTA DE ACTIVIDADES DE MANTENIMIENTO</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 60%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 25%;">Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${actividadesChecklist
      .map((act) => {
        const esCambio = (act.descripcion || '').toLowerCase().includes('cambio');
        return `
          <tr${esCambio ? ' style="background: #E8F5E9;"' : ''}>
            <td>${act.descripcion || 'Actividad'}${esCambio ? ' <span class="cambio-badge">CAMBIO</span>' : ''}</td>
            <td style="text-align: center;">
              <span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span>
            </td>
            <td><span class="observacion-actividad">${act.observaciones || ''}</span></td>
          </tr>
        `;
      })
      .join('')}
      </tbody>
    </table>
  </div>
`;
};

/**
 * Genera sección de actividades por sistema (no usada actualmente)
 */
export const _generarSeccionActividades = (
  titulo: string,
  actividades: any[],
  tieneCambios: boolean = false,
): string => {
  if (actividades.length === 0) return '';

  return `
  <div class="section">
    <div class="section-subtitle">${titulo}${tieneCambios ? ' <span class="cambio-badge">INCLUYE CAMBIOS</span>' : ''}</div>
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
      .map((act) => {
        const esCambio = (act.descripcion || '').toLowerCase().includes('cambio');
        return `
          <tr${esCambio ? ' style="background: #E8F5E9;"' : ''}>
            <td>${act.descripcion}${esCambio ? ' <span class="cambio-badge">CAMBIO</span>' : ''}</td>
            <td style="text-align: center;">
              <span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span>
            </td>
            <td><span class="observacion-actividad">${act.observaciones || ''}</span></td>
          </tr>
        `;
      })
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

// Soporte para evidencias como strings o objetos
type EvidenciaInput = string | { url: string; caption?: string };

// Extraer tipo de evidencia del caption (ANTES, DURANTE, DESPUÉS, GENERAL)
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

// ✅ FIX 17-DIC-2025: Detectar evidencia de insumos con mayor precisión
// La actividad de insumos tiene descripción exacta:
// "Verificación y registro fotográfico de insumos a utilizar (filtros, aceites, etc.)"
// Caption generado: "ANTES: Verificación y registro fotográfico de insumos..."
const esEvidenciaInsumos = (caption: string): boolean => {
  const captionLower = caption.toLowerCase();
  // Detección PRECISA: La descripción exacta de la actividad de insumos
  // Esto evita falsos positivos con otras actividades que mencionen "filtro" o "aceite"
  return (
    captionLower.includes('verificación y registro fotográfico de insumos') ||
    captionLower.includes('verificacion y registro fotografico de insumos') ||
    // Fallback: Si el caption contiene SOLO "insumo" (sin palabras que puedan confundir)
    (captionLower.includes('insumo') && captionLower.includes('registro'))
  );
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

  // Separar evidencias de INSUMOS (ya mostradas en sección propia)
  const evidenciasNormalizadas = evidencias.map((ev, idx) => normalizarEvidencia(ev, idx));
  const evidenciasRegulares = evidenciasNormalizadas.filter(
    (ev) => !esEvidenciaInsumos(ev.caption),
  );

  // Agrupar por tipo (ANTES, DURANTE, DESPUÉS)
  const grupos: Record<string, Array<{ url: string; caption: string }>> = {};
  const ordenTipos = ['ANTES', 'DURANTE', 'DESPUES', 'MEDICION', 'GENERAL'];

  evidenciasRegulares.forEach((ev) => {
    const tipo = extraerTipoEvidencia(ev.caption);
    if (!grupos[tipo]) grupos[tipo] = [];
    const captionLimpio = ev.caption.replace(
      /^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i,
      '',
    );
    grupos[tipo].push({ url: ev.url, caption: captionLimpio });
  });

  // Generar HTML agrupado por secciones
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
        <div class="evidencias-grid-compacto">
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
    GENERAL: [], // Para INSUMOS
    ENFRIAMIENTO: [],
    ASPIRACION: [],
    COMBUSTIBLE: [],
    LUBRICACION: [],
    ELECTRICO: [],
  };

  actividades.forEach((act) => {
    const sistema = act.sistema?.toUpperCase() || 'GENERAL';
    if (grupos[sistema]) {
      grupos[sistema].push(act);
    } else {
      // Si el sistema no está en la lista, agregarlo a GENERAL
      grupos['GENERAL'].push(act);
    }
  });

  return grupos;
};

/**
 * Sección especial para INSUMOS con foto destacada
 * ✅ FIX 17-DIC-2025: Usa detección precisa basada en descripción exacta de actividad
 */
const generarSeccionInsumos = (evidencias: any[]): string => {
  // ✅ Buscar evidencia de insumos usando la función de detección precisa
  const evidenciaInsumos = evidencias?.find((e: any) => {
    const caption = e.caption || e.descripcion || '';
    return esEvidenciaInsumos(caption);
  });

  if (!evidenciaInsumos) return '';

  return `
  <div class="insumos-section">
    <div class="insumos-title">📦 VERIFICACIÓN DE INSUMOS UTILIZADOS</div>
    <div class="insumos-photo">
      <img src="${optimizarUrlCloudinary(evidenciaInsumos.url)}" alt="Insumos" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
    </div>
    <div style="text-align: center; margin-top: 10px;">
      <span class="insumos-caption">
        ${evidenciaInsumos.caption || 'Registro fotográfico de insumos utilizados en el servicio'}
      </span>
    </div>
  </div>
`;
};

/**
 * ✅ MULTI-EQUIPOS (17-DIC-2025): Sección de insumos por equipo
 * Cada equipo tiene su propia sección de verificación de insumos
 */
const generarSeccionInsumosMultiEquipo = (
  evidenciasPorEquipo: EvidenciasPorEquipoPDF[],
): string => {
  if (!evidenciasPorEquipo || evidenciasPorEquipo.length === 0) return '';

  // Colores alternados para cada equipo
  const coloresEquipo = [
    { bg: '#e0f2fe', border: '#0284c7', header: '#0369a1' },
    { bg: '#dcfce7', border: '#16a34a', header: '#15803d' },
    { bg: '#fef3c7', border: '#d97706', header: '#b45309' },
    { bg: '#fce7f3', border: '#db2777', header: '#be185d' },
  ];

  const equiposConInsumos = evidenciasPorEquipo
    .map((grupo, idx) => {
      const { equipo, evidencias } = grupo;
      const nombreEquipo =
        equipo.nombreSistema || equipo.nombreEquipo || `Equipo ${equipo.ordenSecuencia}`;
      const color = coloresEquipo[idx % coloresEquipo.length];

      // ✅ FIX 17-DIC-2025: Buscar evidencia de insumos usando la función precisa
      const evidenciaInsumos = evidencias?.find((e: any) => {
        const caption = e.caption || '';
        return esEvidenciaInsumos(caption);
      });

      if (!evidenciaInsumos) return '';

      return `
    <div style="margin-bottom: 15px; border: 2px solid ${color.border}; border-radius: 8px; overflow: hidden;">
      <div style="background: ${color.header}; color: white; padding: 8px 15px; font-weight: bold; font-size: 11px;">
        🔧 EQUIPO ${equipo.ordenSecuencia}: ${nombreEquipo.toUpperCase()}
        ${equipo.codigoEquipo ? `<span style="font-weight: normal; font-size: 10px; opacity: 0.9;"> (${equipo.codigoEquipo})</span>` : ''}
      </div>
      <div style="padding: 12px; background: ${color.bg};">
        <div class="insumos-photo">
          <img src="${optimizarUrlCloudinary(evidenciaInsumos.url)}" alt="Insumos ${nombreEquipo}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
        </div>
        <div style="text-align: center; margin-top: 10px;">
          <span class="insumos-caption">
            ${evidenciaInsumos.caption || 'Registro fotográfico de insumos utilizados'}
          </span>
        </div>
      </div>
    </div>
    `;
    })
    .filter((html) => html !== '');

  if (equiposConInsumos.length === 0) return '';

  return `
  <div class="section">
    <div class="section-title">📦 VERIFICACIÓN DE INSUMOS UTILIZADOS - MULTI-EQUIPOS (${equiposConInsumos.length} equipos)</div>
    ${equiposConInsumos.join('')}
  </div>
  `;
};

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
        const tipo = ev.momento || extraerTipoEvidenciaTipoB(ev.caption || '');
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
          const { titulo, icono } = getTituloSeccionTipoB(tipo);
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
const extraerTipoEvidenciaTipoB = (caption: string): string => {
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
const getTituloSeccionTipoB = (tipo: string): { titulo: string; icono: string } => {
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

export default generarTipoBGeneradorHTML;
