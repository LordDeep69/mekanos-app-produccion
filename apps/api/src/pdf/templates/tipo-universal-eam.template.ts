/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Template Oficial: INFORME TÉCNICO DE MANTENIMIENTO UNIVERSAL EAM
 * 
 * Gobierna activos universales polimórficos (Compresores, Motores, Chiller HVAC, 
 * Plantas de Emergencia, Sistemas de Bombeo y cualquier arquetipo futuro del Hub).
 * 
 * - Encabezado corporativo Mekanos con logo embebido base64
 * - Ficha Técnica Unificada del Cliente y Activo (Estándar Mekanos Base)
 * - Trazabilidad de caso / encadenamiento fractal de visitas
 * - Checklist ergonómico y espacioso segregado de mediciones
 * - Sección dedicada: Registro de Parámetros Operativos y Telemetría Técnica
 * - Repuestos y fluidos WMS segregados
 * - Galería fotográfica cronológica con lotes
 * - Firmas digitales y pie de página corporativo
 */

import {
  baseStyles,
  DatosOrdenPDF,
  EvidenciasPorEquipoPDF,
  generarChecklistMultiEquipo,
  generarDatosClienteConFichaTecnica,
  generarHeaderConLogo,
  generarLeyendaEquipos,
  generarMedicionesMultiEquipo,
  generarSeccionRepuestosSegregados,
  LoteGaleriaPDF,
  MEKANOS_COLORS,
} from './mekanos-base.template';
import {
  EquipoSpecsReader,
  DatosPlacaUniversal,
  KpiHeader,
} from '../../equipos/services/equipo-specs.reader';

/**
 * Optimiza URLs de Cloudinary para compresión y carga ultra-rápida en Puppeteer
 */
const optimizarUrlCloudinary = (url: string): string => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('q_auto') || url.includes('w_600')) return url;
  const match = url.match(/(.+\/upload\/)(.+)/);
  if (match) return `${match[1]}q_auto:low,w_600,f_jpg/${match[2]}`;
  return url;
};

const limpiarPrefijosCaption = (caption: string): string => {
  let limpio = caption || '';
  const re = /^(?:ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):\s*/i;
  while (re.test(limpio)) {
    limpio = limpio.replace(re, '');
  }
  return limpio;
};

/**
 * Detecta si una actividad representa una medición o parámetro operacional
 * que debe ser segregado del checklist hacia la sección de telemetría/parámetros.
 */
export const esActividadMedicion = (act: any): boolean => {
  if (act.tipoActividad) return act.tipoActividad === 'MEDICION';
  const desc = (act.descripcion || '').toLowerCase();
  
  // Excluir ajustes mecánicos de tensión en correas o bandas de transmisión
  if (desc.includes('banda') || desc.includes('correa')) {
    return false;
  }
  
  // Excluir pruebas funcionales de verificación de switches o presostatos
  if (desc.includes('presostato') && (desc.includes('verific') || desc.includes('revis') || desc.includes('prueba'))) {
    return false;
  }
  
  return (
    desc.includes('medición') ||
    desc.includes('medicion') ||
    desc.includes('presión de') ||
    desc.includes('presion de') ||
    desc.includes('voltaje') ||
    desc.includes('tensión eléctrica') ||
    desc.includes('tension electrica') ||
    desc.includes('tensión vac') ||
    desc.includes('tensión salida') ||
    desc.includes('amperaje') ||
    desc.includes('corriente') ||
    desc.includes('temperatura') ||
    desc.includes('delta t') ||
    desc.includes('consumo eléctrico') ||
    desc.includes('consumo electrico') ||
    desc.includes('vibración') ||
    desc.includes('vibracion') ||
    desc.includes('rpm') ||
    (desc.includes('medir') && !desc.includes('revisar'))
  );
};

export const deducirUnidadParametro = (descripcion: string): string => {
  const d = (descripcion || '').toUpperCase();
  if (d.includes('PSI') || d.includes('PRESIÓN') || d.includes('PRESION')) return 'PSI';
  if (d.includes('VAC') || d.includes('VOLTIOS') || d.includes('VOLTAJE')) return 'VAC';
  if (d.includes('AMPERAJE') || d.includes('CORRIENTE') || d.includes('AMP')) return 'A';
  if (d.includes('TEMPERATURA') || d.includes('DELTA T') || d.includes('°C')) return '°C';
  if (d.includes('RPM')) return 'RPM';
  if (d.includes('HZ') || d.includes('FRECUENCIA')) return 'Hz';
  if (d.includes('CFM')) return 'CFM';
  if (d.includes('M3/H') || d.includes('M³/H') || d.includes('CAUDAL')) return 'm³/h';
  return '';
};

export const formatearLabelParametroUniversal = (descripcion: string): string => {
  const d = (descripcion || '').toUpperCase();
  if (d.includes('SUCCIÓN') || d.includes('SUCCION') || d.includes('BAJA')) {
    return 'Presión de Succión (Baja)';
  }
  if (d.includes('DESCARGA') || d.includes('ALTA')) {
    return 'Presión de Descarga (Alta)';
  }
  if (d.includes('VOLTAJE') || d.includes('TENSIÓN') || d.includes('TENSION')) {
    return 'Voltaje de Alimentación';
  }
  if (d.includes('AMPERAJE') || d.includes('CORRIENTE') || d.includes('CONSUMO ELÉCTRICO') || d.includes('CONSUMO ELECTRICO')) {
    return 'Consumo Eléctrico / Amperaje';
  }
  if (d.includes('DELTA T') || d.includes('TEMPERATURA')) {
    return 'Temperatura / Delta T';
  }
  if (d.includes('VIBRACIÓN') || d.includes('VIBRACION')) {
    return 'Nivel de Vibración';
  }
  if (d.includes('ACEITE') && d.includes('PRESIÓN')) {
    return 'Presión de Aceite';
  }

  let limpio = (descripcion || '')
    .replace(/^MEDICI[ÓO]N\s+DE\s+/i, '')
    .replace(/^VERIFICACI[ÓO]N\s+DE\s+/i, '')
    .replace(/^REVISI[ÓO]N\s+DE\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

export const generarTipoUniversalEamHTML = (datos: DatosOrdenPDF): string => {
  const esMultiEquipo =
    Boolean(datos.esMultiEquipo) || (Boolean(datos.actividadesPorEquipo) && (datos.actividadesPorEquipo?.length || 0) > 1);

  // 1. Resolver Placa Universal EAM
  const eq = datos.equipoDetalle || datos;
  const placaUniversal: DatosPlacaUniversal =
    (datos as any).placaUniversal || EquipoSpecsReader.getPlacaUniversal(eq);

  // 2. Título y Subtítulo corporativos
  const nombreArquetipo = (
    datos.equipoDetalle?.tipoEquipoNombre ||
    datos.tipoEquipo ||
    placaUniversal.categoriaCanonica ||
    'ACTIVO INDUSTRIAL'
  ).toUpperCase();

  const subtituloServicio = `${nombreArquetipo} · ${
    datos.tipoServicio === 'CORRECTIVO'
      ? 'MANTENIMIENTO CORRECTIVO'
      : datos.tipoServicio === 'PREVENTIVO_B'
        ? 'MANTENIMIENTO PREVENTIVO TIPO B'
        : 'MANTENIMIENTO PREVENTIVO'
  }`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Mantenimiento EAM - ${datos.numeroOrden}</title>
  <style>
    ${baseStyles}

    /* Estilos Especializados para Badges de Telemetría */
    .telemetria-badge-normal {
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #86EFAC;
      font-size: 8px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .telemetria-badge-alerta {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
      font-size: 8px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .telemetria-badge-critico {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
      font-size: 8px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    /* Badges de Actividades con diseño premium tipo cápsula */
    .badge-act-b { background: #DCFCE7; color: #15803D; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; border: 1px solid #86EFAC; display: inline-block; min-width: 58px; text-align: center; }
    .badge-act-r { background: #FEF3C7; color: #B45309; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; border: 1px solid #FCD34D; display: inline-block; min-width: 58px; text-align: center; }
    .badge-act-m { background: #FEE2E2; color: #B91C1C; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; border: 1px solid #FCA5A5; display: inline-block; min-width: 58px; text-align: center; }
    .badge-act-c { background: #DBEAFE; color: #1D4ED8; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; border: 1px solid #93C5FD; display: inline-block; min-width: 58px; text-align: center; }
    .badge-act-a { background: #E0E7FF; color: #4338CA; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; border: 1px solid #C7D2FE; display: inline-block; min-width: 58px; text-align: center; }
    .badge-act-na { background: #F1F5F9; color: #64748B; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; border: 1px solid #CBD5E1; display: inline-block; min-width: 58px; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <!-- 1. ENCABEZADO OFICIAL MEKANOS -->
    ${generarHeaderConLogo(
      'INFORME TÉCNICO DE MANTENIMIENTO',
      subtituloServicio,
      datos.numeroOrden,
    )}

    <!-- 2. LEYENDA MULTI-EQUIPOS (SI APLICA) -->
    ${generarLeyendaEquipos(
      datos.actividadesPorEquipo?.map((a) => a.equipo),
      esMultiEquipo,
    )}

    <!-- 3. DATOS DEL CLIENTE Y FICHA TÉCNICA DEL ACTIVO (ESTÁNDAR UNIFICADO MEKANOS BASE) -->
    ${generarDatosClienteConFichaTecnica(datos)}

    <!-- 4. CHECKLIST DE INSPECCIÓN DINÁMICO POR SUBSISTEMAS (SIN MEDICIONES CRÍTICAS) -->
    ${
      esMultiEquipo && datos.actividadesPorEquipo
        ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
        : generarChecklistUniversal(datos.actividades || [])
    }

    <!-- 5. REGISTRO DE PARÁMETROS OPERATIVOS Y TELEMETRÍA TÉCNICA -->
    ${
      esMultiEquipo && datos.medicionesPorEquipo
        ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
        : generarMedicionesUniversal(datos)
    }

    <!-- 6. REPUESTOS, INSUMOS Y FLUIDOS DE SERVICIO WMS -->
    ${generarSeccionRepuestosSegregados(datos.repuestosDetallados, datos.repuestosWms, datos.tipoServicio)}

    <!-- 7. GALERÍA FOTOGRÁFICA DE EVIDENCIAS -->
    ${
      esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
        ? generarEvidenciasMultiEquipo(datos.evidenciasPorEquipo, datos.lotesGaleria)
        : generarEvidenciasUniversal(datos.evidencias || [], datos.lotesGaleria)
    }

    <!-- 8. OBSERVACIONES Y DIAGNÓSTICO -->
    ${generarObservacionesUniversal(datos)}

    <!-- 9. FIRMAS DIGITALES Y CIERRE -->
    ${generarFirmasUniversal(datos)}

    <!-- 10. PIE DE PÁGINA CORPORATIVO -->
    ${generarFooterCorporativo()}
  </div>
</body>
</html>
`;
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-RENDERIZADORES ATÓMICOS DEL TEMPLATE UNIVERSAL
// ════════════════════════════════════════════════════════════════════════════

function generarChecklistUniversal(actividades: any[]): string {
  // Filtrar estrictamente actividades de inspección/mantenimiento (las mediciones van separadas)
  const actividadesInspeccion = (actividades || []).filter((act) => !esActividadMedicion(act));

  if (!actividadesInspeccion || actividadesInspeccion.length === 0) {
    return `
    <div class="section" style="page-break-inside: avoid; margin-bottom: 12px;">
      <div class="section-title">📋 PROTOCOLO DE INSPECCIÓN Y ACTIVIDADES PREVENTIVAS</div>
      <div style="padding: 10px; text-align: center; color: #64748B; font-size: 9px;">
        No se registraron actividades específicas de inspección en esta orden.
      </div>
    </div>
    `;
  }

  // Agrupar actividades por subsistema
  const sistemasMap = new Map<string, any[]>();
  for (const act of actividadesInspeccion) {
    const sis = (act.sistema || 'GENERAL').toUpperCase();
    if (!sistemasMap.has(sis)) sistemasMap.set(sis, []);
    sistemasMap.get(sis)!.push(act);
  }

  return `
  <div class="section" style="page-break-inside: auto; break-inside: auto; margin-bottom: 14px;">
    <div class="section-title">📋 PROTOCOLO DE INSPECCIÓN Y ACTIVIDADES PREVENTIVAS (${actividadesInspeccion.length} TAREAS)</div>

    ${Array.from(sistemasMap.entries())
      .map(([sistema, items]) => `
      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="background: #F1F5F9; color: #1E3A8A; font-size: 9.5px; font-weight: 800; padding: 6px 10px; border-radius: 4px; border-left: 4px solid #1D4ED8; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
          <span>⚙️ SUBSISTEMA: ${sistema}</span>
          <span style="font-size: 8px; color: #475569; font-weight: 700; background: #E2E8F0; padding: 2px 7px; border-radius: 10px;">${items.length} tareas</span>
        </div>
        <table class="checklist-table" style="width: 100%; border-collapse: collapse; font-size: 9px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
          <thead>
            <tr style="background: #F8FAFC; border-bottom: 1.5px solid #CBD5E1;">
              <th style="width: 60%; text-align: left; padding: 6px 10px; font-size: 8.5px; font-weight: 700; color: #334155; text-transform: uppercase;">Actividad / Tarea</th>
              <th style="width: 16%; text-align: center; padding: 6px 8px; font-size: 8.5px; font-weight: 700; color: #334155; text-transform: uppercase;">Estado</th>
              <th style="width: 24%; text-align: left; padding: 6px 10px; font-size: 8.5px; font-weight: 700; color: #334155; text-transform: uppercase;">Observaciones Técnicas</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((act) => {
                const estRaw = (
                  (act as any).resultado ||
                  act.estado ||
                  'NA'
                ).toUpperCase();
                const badgeClass =
                  estRaw === 'B' || estRaw === 'BUENO'
                    ? 'badge-act-b'
                    : estRaw === 'R' || estRaw === 'REGULAR'
                      ? 'badge-act-r'
                      : estRaw === 'M' || estRaw === 'MALO'
                        ? 'badge-act-m'
                        : estRaw === 'C' || estRaw === 'CORREGIDO'
                          ? 'badge-act-c'
                          : estRaw === 'A' || estRaw === 'AJUSTADO'
                            ? 'badge-act-a'
                            : 'badge-act-na';

                const estTexto =
                  estRaw === 'B'
                    ? 'BUENO'
                    : estRaw === 'R'
                      ? 'REGULAR'
                      : estRaw === 'M'
                        ? 'MALO'
                        : estRaw === 'C'
                          ? 'CORREGIDO'
                          : estRaw === 'A'
                            ? 'AJUSTADO'
                            : estRaw;

                const obsLimpia = (act.observaciones || '').trim();
                const obsDisplay = obsLimpia && obsLimpia !== '--' && obsLimpia !== '-' ? obsLimpia : '';

                return `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 6px 10px; color: #1E293B; line-height: 1.35; font-weight: 500;">${act.descripcion}</td>
                <td style="padding: 6px 8px; text-align: center; vertical-align: middle;">
                  <span class="${badgeClass}">${estTexto}</span>
                </td>
                <td style="padding: 6px 10px; color: #475569; font-size: 8.5px; line-height: 1.3;">${obsDisplay}</td>
              </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      `)
      .join('')}

    <!-- SIMBOLOGÍA DE ESTADOS -->
    <div class="simbologia-grid" style="margin-top: 8px; padding: 5px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; display: flex; gap: 12px; font-size: 8px; color: #475569; align-items: center; flex-wrap: wrap;">
      <span style="font-weight: 700; color: #1E293B;">CONVENCIONES:</span>
      <span><span class="badge-act-b" style="min-width: 20px; padding: 1px 5px;">B</span> Bueno</span>
      <span><span class="badge-act-r" style="min-width: 20px; padding: 1px 5px;">R</span> Regular</span>
      <span><span class="badge-act-m" style="min-width: 20px; padding: 1px 5px;">M</span> Malo</span>
      <span><span class="badge-act-c" style="min-width: 20px; padding: 1px 5px;">C</span> Corregido</span>
      <span><span class="badge-act-a" style="min-width: 20px; padding: 1px 5px;">A</span> Ajustado</span>
      <span><span class="badge-act-na" style="min-width: 20px; padding: 1px 5px;">NA</span> No Aplica</span>
    </div>
  </div>
  `;
}

function generarMedicionesUniversal(datos: DatosOrdenPDF): string {
  const mediciones = datos.mediciones || [];
  const modulo = datos.datosModulo;
  const actividadesMedicion = (datos.actividades || []).filter((act) => esActividadMedicion(act));

  // 1. Extraer tarjetas de parámetros operativos
  const itemsCards: Array<{ label: string; value: string; badge?: string; badgeColor?: string }> = [];

  // A) Desde actividades de medición ejecutadas
  for (const act of actividadesMedicion) {
    const label = formatearLabelParametroUniversal(act.descripcion);
    let valorTexto = '';
    let badgeText = '';
    let badgeColor = '';

    const obs = (act.observaciones || '').trim();
    if (obs && !obs.startsWith('--')) {
      // Extraer si viene número tipo "TEMP: 80" -> "80 °C"
      const matchNum = obs.match(/(?:temp|presion|voltaje|amperaje|amp|corriente)?[:\s]*([\d.,]+)\s*([a-zA-Z°/³]*)/i);
      if (matchNum) {
        const unidad = matchNum[2] || deducirUnidadParametro(act.descripcion);
        valorTexto = `${matchNum[1]} ${unidad}`.trim();
      } else {
        valorTexto = obs;
      }
    }

    const est = ((act as any).resultado || act.estado || '').toUpperCase();
    if (est === 'B' || est === 'BUENO') {
      badgeText = 'CONFORME';
      badgeColor = '#15803D';
    } else if (est === 'M' || est === 'MALO') {
      badgeText = 'ALERTA / MALO';
      badgeColor = '#B91C1C';
    } else if (est === 'R' || est === 'REGULAR') {
      badgeText = 'REGULAR';
      badgeColor = '#B45309';
    } else if (est === 'C' || est === 'CORREGIDO') {
      badgeText = 'CORREGIDO';
      badgeColor = '#1D4ED8';
    } else if (est === 'A' || est === 'AJUSTADO') {
      badgeText = 'AJUSTADO';
      badgeColor = '#4338CA';
    }

    if (!valorTexto) {
      valorTexto = badgeText || 'OPERATIVO';
    }

    itemsCards.push({
      label,
      value: valorTexto,
      badge: badgeText,
      badgeColor,
    });
  }

  // B) Si hay datosModulo (fallbacks operativos) y no se duplicaron
  if (modulo) {
    if (modulo.horasTrabajo != null && !itemsCards.some(i => i.label.toLowerCase().includes('horómetr'))) {
      itemsCards.push({ label: 'Horómetro de Operación', value: `${modulo.horasTrabajo} hrs` });
    }
    if (modulo.voltaje != null && !itemsCards.some(i => i.label.toLowerCase().includes('voltaj'))) {
      itemsCards.push({ label: 'Voltaje de Operación', value: `${modulo.voltaje} V` });
    }
    if (modulo.corriente != null && !itemsCards.some(i => i.label.toLowerCase().includes('amperaj') || i.label.toLowerCase().includes('corrient'))) {
      itemsCards.push({ label: 'Corriente / Amperaje', value: `${modulo.corriente} A` });
    }
    if (modulo.rpm != null && !itemsCards.some(i => i.label.toLowerCase().includes('velocidad') || i.label.toLowerCase().includes('rpm'))) {
      itemsCards.push({ label: 'Velocidad de Operación', value: `${modulo.rpm} RPM` });
    }
    if (modulo.presionAceite != null && !itemsCards.some(i => i.label.toLowerCase().includes('presión de aceite') || i.label.toLowerCase().includes('presion de aceite'))) {
      itemsCards.push({ label: 'Presión de Aceite', value: `${modulo.presionAceite} PSI` });
    }
    if (modulo.temperaturaRefrigerante != null && !itemsCards.some(i => i.label.toLowerCase().includes('temperatura'))) {
      itemsCards.push({ label: 'Temperatura', value: `${modulo.temperaturaRefrigerante} °C` });
    }
    if (modulo.frecuencia != null && !itemsCards.some(i => i.label.toLowerCase().includes('frecuencia'))) {
      itemsCards.push({ label: 'Frecuencia', value: `${modulo.frecuencia} Hz` });
    }
  }

  if (itemsCards.length === 0 && mediciones.length === 0) return '';

  const numCols = itemsCards.length <= 2 ? itemsCards.length : itemsCards.length === 3 ? 3 : 4;
  const gridColumnsStyle = `grid-template-columns: repeat(${numCols}, 1fr);`;

  return `
  <div class="section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 14px;">
    <div class="section-title">📊 REGISTRO DE PARÁMETROS OPERATIVOS (TELEMETRÍA Y VARIABLES OPERACIONALES)</div>
    
    ${
      itemsCards.length > 0
        ? `
    <div style="display: grid; ${gridColumnsStyle} gap: 8px; margin-bottom: 10px;">
      ${itemsCards
        .map(
          (item) => `
        <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-top: 3px solid #0284C7; border-radius: 6px; padding: 7px 10px; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.3px;">${item.label}</div>
          <div style="font-size: 11px; font-weight: 900; color: #0F172A; margin-top: 3px; font-family: monospace;">${item.value}</div>
          ${item.badge && item.badge !== item.value ? `
            <div style="font-size: 7.5px; font-weight: 800; color: ${item.badgeColor || '#64748B'}; margin-top: 2px;">● ${item.badge}</div>
          ` : ''}
        </div>
      `,
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      mediciones.length > 0
        ? `
    <table class="datos-table" style="width: 100%; font-size: 8.5px; border-collapse: collapse; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
      <thead>
        <tr style="background: #F1F5F9; border-bottom: 1.5px solid #CBD5E1;">
          <th style="padding: 6px 8px; text-align: left; font-size: 8px; font-weight: 700; color: #334155; text-transform: uppercase;">Parámetro / Variable</th>
          <th style="padding: 6px 8px; text-align: center; font-size: 8px; font-weight: 700; color: #334155; text-transform: uppercase;">Valor Medido</th>
          <th style="padding: 6px 8px; text-align: center; font-size: 8px; font-weight: 700; color: #334155; text-transform: uppercase;">Rango de Referencia</th>
          <th style="padding: 6px 8px; text-align: center; font-size: 8px; font-weight: 700; color: #334155; text-transform: uppercase;">Evaluación</th>
        </tr>
      </thead>
      <tbody>
        ${mediciones
          .map((m) => {
            const valNum = Number(m.valor);
            const rMin = m.rangoMin != null ? Number(m.rangoMin) : null;
            const rMax = m.rangoMax != null ? Number(m.rangoMax) : null;

            let badge = '<span class="telemetria-badge-normal">NORMAL</span>';
            if (m.estado === 'CRITICO' || m.estado === 'CRÍTICO') {
              badge = '<span class="telemetria-badge-critico">CRÍTICO</span>';
            } else if (m.estado === 'ALERTA' || m.estado === 'ADVERTENCIA') {
              badge = '<span class="telemetria-badge-alerta">ALERTA</span>';
            } else if (rMin != null && rMax != null && Number.isFinite(valNum)) {
              if (valNum < rMin || valNum > rMax) {
                badge = '<span class="telemetria-badge-critico">FUERA DE RANGO</span>';
              }
            }

            const rangoTexto =
              rMin != null && rMax != null
                ? `${rMin} - ${rMax} ${m.unidad}`
                : rMin != null
                  ? `≥ ${rMin} ${m.unidad}`
                  : rMax != null
                    ? `≤ ${rMax} ${m.unidad}`
                    : 'Estándar Fabricante';

            return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 5px 8px; font-weight: 600; color: #1E293B;">${m.parametro}</td>
            <td style="padding: 5px 8px; text-align: center; font-family: monospace; font-weight: 800; color: #0F172A;">
              ${m.valor} ${m.unidad || ''}
            </td>
            <td style="padding: 5px 8px; text-align: center; color: #64748B;">${rangoTexto}</td>
            <td style="padding: 5px 8px; text-align: center;">${badge}</td>
          </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }
  </div>
  `;
}

function generarEvidenciasUniversal(
  evidencias: any[],
  _lotesGaleria?: LoteGaleriaPDF[],
): string {
  if (!evidencias || evidencias.length === 0) return '';

  const grupos: Record<string, Array<{ url: string; caption: string; idLote?: number }>> = {
    ANTES: [],
    DURANTE: [],
    DESPUES: [],
    GENERAL: [],
  };

  for (const ev of evidencias) {
    const rawUrl = typeof ev === 'string' ? ev : ev.url || '';
    if (!rawUrl) continue;

    const rawCaption = typeof ev === 'string' ? '' : ev.caption || '';
    const upper = (rawCaption + ' ' + (ev.tipo || '')).toUpperCase();

    let fase = 'GENERAL';
    if (upper.includes('ANTES') || upper.includes('INICIAL')) fase = 'ANTES';
    else if (upper.includes('DURANTE') || upper.includes('PROCESO')) fase = 'DURANTE';
    else if (upper.includes('DESPUES') || upper.includes('DESPUÉS') || upper.includes('FINAL')) fase = 'DESPUES';

    grupos[fase].push({
      url: optimizarUrlCloudinary(rawUrl),
      caption: limpiarPrefijosCaption(rawCaption) || `Evidencia fotográfica`,
      idLote: ev.idLote,
    });
  }

  const fasesLabels: Record<string, { label: string; color: string }> = {
    ANTES: { label: 'ESTADO INICIAL (ANTES DEL SERVICIO)', color: '#3B82F6' },
    DURANTE: { label: 'PROCESO DE INTERVENCIÓN TÉCNICA (DURANTE)', color: '#F59E0B' },
    DESPUES: { label: 'ESTADO FINAL CERTIFICADO (DESPUÉS)', color: '#10B981' },
    GENERAL: { label: 'EVIDENCIAS GENERALES Y DE DETALLE', color: '#6366F1' },
  };

  return `
  <div class="section">
    <div class="section-title">📷 REGISTRO FOTOGRÁFICO DE INTERVENCIÓN (${evidencias.length} fotografías)</div>
    
    ${Object.entries(grupos)
      .filter(([_, items]) => items.length > 0)
      .map(([fase, items]) => {
        const conf = fasesLabels[fase];
        return `
        <div style="margin-bottom: 12px; page-break-inside: avoid;">
          <div style="background: ${conf.color}; color: #FFFFFF; font-size: 8.5px; font-weight: 800; padding: 4px 8px; border-radius: 4px 4px 0 0;">
            ${conf.label} (${items.length})
          </div>
          <div class="evidencias-grid" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 4px 4px;">
            ${items
              .map(
                (item) => `
              <div class="evidencia-item" style="flex: 1 1 30%; min-width: 130px; max-width: 32%; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 4px; padding: 4px; text-align: center;">
                <img src="${item.url}" alt="${item.caption}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 3px;" onerror="this.style.display='none'" />
                <div style="font-size: 7.5px; color: #475569; margin-top: 3px; font-weight: 600; line-height: 1.2;">
                  ${item.caption}
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
        `;
      })
      .join('')}
  </div>
  `;
}

function generarEvidenciasMultiEquipo(
  evidenciasPorEquipo: EvidenciasPorEquipoPDF[],
  _lotesGaleria?: LoteGaleriaPDF[],
): string {
  return `
  <div class="section">
    <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO - MULTI-EQUIPOS</div>
    ${evidenciasPorEquipo
      .map((g) => {
        const nom = g.equipo.nombreSistema || g.equipo.nombreEquipo || `Equipo ${g.equipo.ordenSecuencia}`;
        return `
        <div style="margin-bottom: 10px; border: 1.5px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
          <div style="background: #1E293B; color: #FFFFFF; padding: 6px 10px; font-size: 9.5px; font-weight: bold;">
            ${nom} (${g.equipo.codigoEquipo || 'S/C'})
          </div>
          ${generarEvidenciasUniversal(g.evidencias, undefined)}
        </div>
        `;
      })
      .join('')}
  </div>
  `;
}

function generarObservacionesUniversal(datos: DatosOrdenPDF): string {
  const obs = datos.observaciones || datos.observaciones_tecnico || 'Servicio ejecutado a satisfacción sin novedades extraordinarias.';

  return `
  <div class="section" style="page-break-inside: avoid;">
    <div class="section-title">📝 OBSERVACIONES, RECOMENDACIONES Y DIAGNÓSTICO FINAL</div>
    <div style="padding: 10px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 9px; line-height: 1.5; color: #1E293B; white-space: pre-wrap;">
${obs}
    </div>
  </div>
  `;
}

function generarFirmasUniversal(datos: DatosOrdenPDF): string {
  return `
  <div class="firmas-container" style="page-break-inside: avoid; margin-top: 14px;">
    <div class="firma-box">
      ${
        datos.firmaTecnico
          ? `<div class="firma-imagen"><img src="${datos.firmaTecnico}" alt="Firma Técnico" style="max-height: 50px;" /></div>`
          : `<div class="firma-line"></div>`
      }
      <div class="firma-nombre">${datos.nombreTecnico || datos.tecnico || 'Técnico de Servicio'}</div>
      <div class="firma-cargo">${datos.cargoTecnico || 'Técnico Responsable de Mantenimiento'}</div>
      <div class="firma-label">MEKANOS S.A.S · Departamento Técnico</div>
    </div>
    <div class="firma-box">
      ${
        datos.firmaCliente
          ? `<div class="firma-imagen"><img src="${datos.firmaCliente}" alt="Firma Cliente" style="max-height: 50px;" /></div>`
          : `<div class="firma-line"></div>`
      }
      <div class="firma-nombre">${datos.nombreCliente || 'Recibido a Satisfacción'}</div>
      <div class="firma-cargo">${datos.cargoCliente || 'Representante del Cliente / Autorizador'}</div>
      <div class="firma-label">Firma y Aprobación del Cliente</div>
    </div>
  </div>
  `;
}

function generarFooterCorporativo(): string {
  return `
  <div class="footer" style="margin-top: 14px; text-align: center; font-size: 7.5px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 6px;">
    <strong>MEKANOS S.A.S</strong> · NIT: 900.542.123-1 · CRA 49C # 31-35 DIAG. AL SENA, CARTAGENA DE INDIAS<br/>
    Línea PBX: (605) 635-9384 · WhatsApp Soporte 24/7: 315-708-3350 · info@mekanos.com.co
  </div>
  `;
}

export default generarTipoUniversalEamHTML;
