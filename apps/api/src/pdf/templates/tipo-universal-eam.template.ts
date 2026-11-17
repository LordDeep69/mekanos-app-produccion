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
  buildBrandCssVars,
  DatosOrdenPDF,
  escapeBrandHtml,
  EvidenciasPorEquipoPDF,
  formatNumberOrg,
  generarChecklistMultiEquipo,
  generarDatosClienteConFichaTecnica,
  generarFooterCorporativoHtml,
  generarHeaderConLogo,
  generarLeyendaEquipos,
  generarMedicionesMultiEquipo,
  generarSeccionRepuestosSegregados,
  LoteGaleriaPDF,
  resolveOrgBranding,
} from './mekanos-base.template';
import { EquipoSpecsReader, DatosPlacaUniversal } from '../../equipos/services/equipo-specs.reader';

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
 * Detecta determinísticamente desde metadatos del catálogo si una actividad
 * representa una medición o parámetro operacional (sin heurísticas regex sobre texto).
 */
export const esActividadMedicion = (act: any): boolean => {
  if (act?.idParametroMedicion != null) return true;
  return act?.tipoActividad === 'MEDICION';
};

/**
 * Lee explícitamente la unidad desde respuestaJson/configInputJson o metadata de actividad.
 * Nunca adivina unidades mediante expresiones regulares sobre la descripción.
 */
export const deducirUnidadParametro = (descripcion: string, act?: any): string => {
  const fromResp =
    act?.respuestaJson && typeof act.respuestaJson === 'object'
      ? act.respuestaJson.unidad
      : undefined;
  const fromCfg =
    act?.configInputJson && typeof act.configInputJson === 'object'
      ? act.configInputJson.unidad
      : undefined;
  const explicita = String(fromResp || fromCfg || act?.unidad || '').trim();
  if (explicita) return explicita;

  const raw = (descripcion || '').trim();
  const parenMatch = raw.match(/\(([A-Za-z0-9°%Ωµ/³²·\s-]+)\)\s*$/);
  if (parenMatch) {
    const unitCandidate = parenMatch[1].trim();
    if (
      unitCandidate.length <= 10 &&
      !['DELTA T', 'BAJA', 'ALTA', 'SI/NO', 'S/N'].includes(unitCandidate.toUpperCase())
    ) {
      return unitCandidate;
    }
  }
  return '';
};

export const formatearLabelParametroUniversal = (descripcion: string): string => {
  const d = (descripcion || '').toUpperCase();
  const esPresion = d.includes('PRESIÓN') || d.includes('PRESION');
  if (d.includes('SUCCIÓN') || d.includes('SUCCION') || (esPresion && d.includes('BAJA'))) {
    return 'Presión de Succión (Baja)';
  }
  if (d.includes('DESCARGA') || (esPresion && d.includes('ALTA'))) {
    return 'Presión de Descarga (Alta)';
  }
  if (d.includes('DELTA T')) {
    return 'Temperatura / Delta T';
  }

  const limpio = (descripcion || '')
    .replace(/^MEDICI[ÓO]N\s+DE\s+/i, '')
    .replace(/^VERIFICACI[ÓO]N\s+DE\s+/i, '')
    .replace(/^REVISI[ÓO]N\s+DE\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

export const generarTipoUniversalEamHTML = (datos: DatosOrdenPDF): string => {
  const brand = resolveOrgBranding(datos.branding);
  const esMultiEquipo =
    Boolean(datos.esMultiEquipo) ||
    (Boolean(datos.actividadesPorEquipo) && (datos.actividadesPorEquipo?.length || 0) > 1);

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
    ${buildBrandCssVars(brand)}
    ${baseStyles}

    /* Blindaje Anti-Corte en Tablas y Filas */
    .checklist-table tr, .checklist-table td, .checklist-table th, .subsistema-block,
    .pendientes-bloque, .pendientes-tabla, .pendientes-tabla tr, .pendientes-tabla td, .pendientes-tabla th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .checklist-table thead, .pendientes-tabla thead {
      display: table-header-group;
      page-break-after: avoid;
      break-after: avoid;
    }

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
    <!-- 1. ENCABEZADO CORPORATIVO WHITE-LABEL -->
    ${generarHeaderConLogo(
      'INFORME TÉCNICO DE MANTENIMIENTO',
      subtituloServicio,
      datos.numeroOrden,
      brand,
    )}

    <!-- 2. LEYENDA MULTI-EQUIPOS (SI APLICA) -->
    ${generarLeyendaEquipos(
      datos.actividadesPorEquipo?.map((a) => a.equipo),
      esMultiEquipo,
    )}

    <!-- 3. DATOS DEL CLIENTE Y FICHA TÉCNICA DEL ACTIVO -->
    ${generarDatosClienteConFichaTecnica(datos)}

    <!-- 4. CHECKLIST DE INSPECCIÓN DINÁMICO POR SUBSISTEMAS (SIN MEDICIONES CRÍTICAS) -->
    ${
      esMultiEquipo && datos.actividadesPorEquipo
        ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
        : generarChecklistUniversal(datos.actividades || [], brand)
    }

    <!-- 5. REGISTRO DE PARÁMETROS OPERATIVOS Y TELEMETRÍA TÉCNICA -->
    ${
      esMultiEquipo && datos.medicionesPorEquipo
        ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
        : generarMedicionesUniversal(datos, placaUniversal)
    }

    <!-- 6. REPUESTOS, INSUMOS Y FLUIDOS DE SERVICIO WMS -->
    ${generarSeccionRepuestosSegregados(datos.repuestosDetallados, datos.repuestosWms, datos.tipoServicio, brand)}

    <!-- 6B. PENDIENTES TÉCNICOS Y HALLAZGOS -->
    ${generarPendientesUniversal(datos.pendientes)}

    <!-- 7. GALERÍA FOTOGRÁFICA DE EVIDENCIAS -->
    ${
      esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
        ? generarEvidenciasMultiEquipo(datos.evidenciasPorEquipo, datos.lotesGaleria)
        : generarEvidenciasUniversal(datos.evidencias || [], datos.lotesGaleria)
    }

    <!-- BLOQUE ATÓMICO DE CIERRE (OBSERVACIONES, FIRMAS Y FOOTER) -->
    <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 14px;">
      <!-- 8. OBSERVACIONES Y DIAGNÓSTICO -->
      ${generarObservacionesUniversal(datos)}

      <!-- 9. FIRMAS DIGITALES Y CIERRE -->
      ${generarFirmasUniversal(datos, brand)}

      <!-- 10. PIE DE PÁGINA CORPORATIVO -->
      ${generarFooterCorporativoHtml(brand)}
    </div>
  </div>
</body>
</html>
`;
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-RENDERIZADORES ATÓMICOS DEL TEMPLATE UNIVERSAL
// ════════════════════════════════════════════════════════════════════════════

function generarChecklistUniversal(
  actividades: any[],
  brand = resolveOrgBranding(),
): string {
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
      .map(
        ([sistema, items]) => `
      <div class="subsistema-block" style="margin-bottom: 12px; page-break-inside: avoid !important; break-inside: avoid !important;">
        <div style="background: #F1F5F9; color: #1E3A8A; font-size: 9.5px; font-weight: 800; padding: 6px 10px; border-radius: 4px; border-left: 4px solid #1D4ED8; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
          <span>⚙️ SUBSISTEMA: ${sistema}</span>
          <span style="font-size: 8px; color: #475569; font-weight: 700; background: #E2E8F0; padding: 2px 7px; border-radius: 10px;">${items.length} tareas</span>
        </div>
        <table class="checklist-table" style="width: 100%; border-collapse: collapse; font-size: 9px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden;">
          <thead>
            <tr style="background: #244673; border-bottom: 1.5px solid #1E3A8A;">
              <th style="width: 52%; text-align: left; padding: 6px 10px; font-size: 8.5px; font-weight: 700; color: #FFFFFF !important; background: #244673 !important; text-transform: uppercase; border: none;">Actividad / Tarea</th>
              <th style="width: 14%; text-align: center; padding: 6px 8px; font-size: 8.5px; font-weight: 700; color: #FFFFFF !important; background: #244673 !important; text-transform: uppercase; border: none;">Estado</th>
              <th style="width: 34%; text-align: left; padding: 6px 10px; font-size: 8.5px; font-weight: 700; color: #FFFFFF !important; background: #244673 !important; text-transform: uppercase; border: none;">Observaciones Técnicas</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((act) => {
                const resp =
                  act.respuestaJson && typeof act.respuestaJson === 'object'
                    ? act.respuestaJson
                    : null;
                // Columna ESTADO refleja siempre el resultado técnico actual (incl. Corregido/Ajustado);
                // el semáforo intrínseco del input custom (resp.semaforo) colorea la píldora de respuesta.
                const estRaw = (
                  (act as any).resultado ||
                  act.estado ||
                  resp?.semaforo ||
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

                const tipoInputUpper = String(
                  act.tipoControlInput || 'ESCALA_ESTADO',
                ).toUpperCase();
                const esContadorAct =
                  act.rolSemantico === 'LECTURA_CONTADOR_ACTIVO' ||
                  act.rolSemantico === 'LECTURA_CONTADOR' ||
                  tipoInputUpper.includes('CONTADOR');

                const formatRespuestaCustom = (): string => {
                  if (!resp || esContadorAct) return '';
                  if (Array.isArray(resp.seleccionados) && resp.seleccionados.length > 0) {
                    const base = resp.seleccionados.join(', ');
                    return resp.detalle ? `${base} · ${resp.detalle}` : base;
                  }
                  if (resp.etiqueta != null && String(resp.etiqueta).trim() !== '') {
                    const etq = String(resp.etiqueta).trim();
                    const det =
                      resp.detalle != null && String(resp.detalle).trim() !== ''
                        ? ` · ${String(resp.detalle).trim()}`
                        : '';
                    if (
                      resp.valor != null &&
                      typeof resp.valor === 'number' &&
                      resp.unidad &&
                      !etq.includes(String(resp.valor))
                    ) {
                      return `${etq}: ${resp.valor} ${String(resp.unidad).trim()}${det}`;
                    }
                    return `${etq}${det}`;
                  }
                  if (resp.valor != null && String(resp.valor).trim() !== '') {
                    const u = resp.unidad ? ` ${String(resp.unidad).trim()}` : '';
                    const det = resp.detalle ? ` · ${String(resp.detalle).trim()}` : '';
                    return `${String(resp.valor).trim()}${u}${det}`;
                  }
                  return '';
                };
                const etiquetaCustom = formatRespuestaCustom();

                const obsRaw = (act.observaciones || '').trim();
                const partesObs = obsRaw
                  ? obsRaw
                      .split('|||')
                      .map((p: string) => p.trim())
                      .filter(Boolean)
                  : [];
                const regexPrefijoEstructurado =
                  /^(?:RESPUESTA|CICLOS|HORAS|HOROMETRO|HORÓMETRO|KM|ODOMETRO|CONTADOR|UPM)\s*:\s*(.*)$/i;
                const regexPrefijoContadorCustom = /^[A-ZÁÉÍÓÚÑ0-9_]{2,25}\s*:\s*[\d.,]+$/i;

                let prefijoLegacy = '';
                let notaRaw = '';
                if (
                  partesObs.length > 0 &&
                  (regexPrefijoEstructurado.test(partesObs[0]) ||
                    (esContadorAct && regexPrefijoContadorCustom.test(partesObs[0])))
                ) {
                  prefijoLegacy = partesObs[0];
                  notaRaw = partesObs.slice(1).join(' ').trim();
                } else {
                  notaRaw = partesObs.join(' ').trim();
                }

                const notaTecnica = notaRaw && notaRaw !== '--' && notaRaw !== '-' ? notaRaw : '';
                const obsLimpia = prefijoLegacy || notaTecnica;

                const esContadorDetectado =
                  esContadorAct ||
                  /^(CICLOS|HORAS|HOROMETRO|HORÓMETRO|KM|ODOMETRO|CONTADOR|UPM)\s*:/i.test(
                    obsLimpia,
                  );

                const parseNumeroContador = (txt: string): number => {
                  let raw = txt.trim();
                  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
                    raw = raw.replace(/\./g, '');
                  } else {
                    raw = raw.replace(',', '.');
                  }
                  return Number(raw);
                };

                const escapeHtmlTextoPlano = (txt: string): string =>
                  txt
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');

                const renderNotaSeguro = (txt: string): string => {
                  if (/<(?:br|b|i|u|strong|em|div|span|p)\b[^>]*>/i.test(txt)) return txt;
                  return escapeHtmlTextoPlano(txt).replace(/\r?\n/g, '<br/>');
                };

                const getSemanticPillTheme = (codigo: string) => {
                  const c = codigo.toUpperCase();
                  if (c === 'M' || c === 'MALO') {
                    return { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B', dot: '#DC2626' };
                  }
                  if (c === 'R' || c === 'REGULAR') {
                    return { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', dot: '#D97706' };
                  }
                  if (c === 'B' || c === 'BUENO') {
                    return { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', dot: '#059669' };
                  }
                  if (c === 'C' || c === 'CORREGIDO' || c === 'A' || c === 'AJUSTADO') {
                    return { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', dot: '#2563EB' };
                  }
                  return { bg: '#F8FAFC', border: '#CBD5E1', color: '#334155', dot: '#64748B' };
                };

                const buildNotaBox = (conBadgeEncima: boolean): string => {
                  if (!notaTecnica) return '';
                  const contenido = renderNotaSeguro(notaTecnica);
                  if (conBadgeEncima) {
                    return `<div style="color: #1E293B; font-size: 7.8px; line-height: 1.35; background: #F8FAFC; border-left: 2.5px solid #94A3B8; padding: 2.5px 6px; border-radius: 0 3px 3px 0;"><span style="font-weight: 700; color: #475569;">Nota:</span> ${contenido}</div>`;
                  }
                  return `<div style="color: #334155; font-size: 8px; line-height: 1.35; font-style: normal;">${contenido}</div>`;
                };

                let obsDisplay = '';
                if (esContadorDetectado) {
                  const matchPref = obsLimpia.match(
                    esContadorAct
                      ? /^([A-ZÁÉÍÓÚÑ0-9_]{2,25})\s*:\s*([0-9.,]+)/i
                      : /^(CICLOS|HORAS|HOROMETRO|HORÓMETRO|KM|ODOMETRO|CONTADOR|UPM)\s*:\s*([0-9.,]+)/i,
                  );
                  const numRaw =
                    resp?.valor != null && Number.isFinite(parseNumeroContador(String(resp.valor)))
                      ? parseNumeroContador(String(resp.valor))
                      : matchPref
                        ? parseNumeroContador(matchPref[2])
                        : NaN;
                  if (Number.isFinite(numRaw)) {
                    const prefUpper = (matchPref?.[1] || String(resp?.unidad || '')).toUpperCase();
                    const unitFromResp = resp?.unidad ? String(resp.unidad).trim() : '';
                    const sufijo =
                      unitFromResp ||
                      (prefUpper.includes('CICLO')
                        ? 'ciclos'
                        : prefUpper.includes('KM') || prefUpper.includes('ODO')
                          ? 'km'
                          : prefUpper.includes('UPM') || prefUpper === 'UDS'
                            ? 'und'
                            : prefUpper.includes('HORA') || prefUpper.startsWith('HR')
                              ? 'hrs'
                              : prefUpper &&
                                  prefUpper !== 'CONTADOR' &&
                                  prefUpper !== 'RESPUESTA'
                                ? prefUpper.toLowerCase()
                                : '');
                    const chipPrefix =
                      tipoInputUpper === 'INPUT_NUMERICO' && etiquetaCustom
                        ? `${escapeHtmlTextoPlano(etiquetaCustom)}:`
                        : 'Lectura:';
                    const numFormateado = formatNumberOrg(
                      numRaw,
                      brand,
                      Number.isInteger(numRaw) ? 0 : 2,
                    );
                    const lecturaChip = `<span style="display: inline-flex; align-items: center; gap: 4px; background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; border-radius: 4px; padding: 2px 7px; font-size: 7.8px; font-weight: 700; font-style: normal;"><span style="color: #3B82F6; font-weight: 600;">${chipPrefix}</span> ${numFormateado}${sufijo ? ` ${sufijo}` : ''}</span>`;
                    const notaBox = buildNotaBox(true);
                    obsDisplay = notaBox
                      ? `<div style="display: flex; flex-direction: column; gap: 4px;"><div>${lecturaChip}</div>${notaBox}</div>`
                      : lecturaChip;
                  } else {
                    obsDisplay = buildNotaBox(false);
                  }
                } else {
                  const legacyRespMatch = prefijoLegacy.match(/^RESPUESTA\s*:\s*(.+)$/i);
                  const tieneInputDeclarativo = tipoInputUpper !== 'ESCALA_ESTADO';
                  const etiquetaFinal =
                    (etiquetaCustom &&
                    (tieneInputDeclarativo || etiquetaCustom.toUpperCase() !== estTexto)
                      ? etiquetaCustom
                      : '') ||
                    legacyRespMatch?.[1]?.trim() ||
                    '';

                  if (etiquetaFinal) {
                    const semaforoResp = String(resp?.semaforo || estRaw).toUpperCase();
                    const theme = getSemanticPillTheme(semaforoResp);
                    const respChip = `<span style="display: inline-flex; align-items: center; gap: 4px; background: ${theme.bg}; color: ${theme.color}; border: 1px solid ${theme.border}; border-radius: 4px; padding: 2px 7px; font-size: 7.8px; font-weight: 700; font-style: normal;"><span style="display: inline-block; width: 5.5px; height: 5.5px; border-radius: 50%; background: ${theme.dot}; flex-shrink: 0;"></span>${escapeHtmlTextoPlano(etiquetaFinal)}</span>`;
                    const notaBox = buildNotaBox(true);
                    obsDisplay = notaBox
                      ? `<div style="display: flex; flex-direction: column; gap: 4px;"><div>${respChip}</div>${notaBox}</div>`
                      : respChip;
                  } else {
                    obsDisplay = buildNotaBox(false);
                  }
                }

                return `
              <tr style="border-bottom: 1px solid #F1F5F9; page-break-inside: avoid !important; break-inside: avoid !important;">
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
      `,
      )
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

function generarMedicionesUniversal(
  datos: DatosOrdenPDF,
  placaUniversal?: DatosPlacaUniversal,
): string {
  const mediciones = datos.mediciones || [];
  const modulo = datos.datosModulo;
  const actividadesMedicion = (datos.actividades || []).filter((act) => esActividadMedicion(act));

  // 1. Extraer tarjetas de parámetros operativos
  const itemsCards: Array<{ label: string; value: string; badge?: string; badgeColor?: string }> =
    [];

  // A) Desde actividades de medición ejecutadas
  for (const act of actividadesMedicion) {
    const label = formatearLabelParametroUniversal(act.descripcion);
    let valorTexto = '';
    let badgeText = '';
    let badgeColor = '';

    let respAct: any = null;
    if (act.respuestaJson) {
      if (typeof act.respuestaJson === 'string') {
        try {
          respAct = JSON.parse(act.respuestaJson);
        } catch {
          respAct = null;
        }
      } else if (typeof act.respuestaJson === 'object') {
        respAct = act.respuestaJson;
      }
    }

    if (respAct && respAct.valor != null && String(respAct.valor).trim() !== '') {
      const unidadResp =
        (respAct.unidad ? String(respAct.unidad).trim() : '') ||
        deducirUnidadParametro(act.descripcion, act);
      valorTexto = `${respAct.valor}${unidadResp ? ` ${unidadResp}` : ''}`.trim();
    } else if (respAct && respAct.etiqueta) {
      valorTexto = String(respAct.etiqueta).trim();
    } else {
      const obs = (act.observaciones || '').trim();
      if (obs && !obs.startsWith('--')) {
        // Extraer si viene número tipo "TEMP: 80" -> "80 °C"
        const matchNum = obs.match(
          /(?:temp|presion|voltaje|amperaje|amp|corriente)?[:\s]*([\d.,]+)\s*([a-zA-Z°/³]*)/i,
        );
        if (matchNum) {
          const unidad = matchNum[2] || deducirUnidadParametro(act.descripcion, act);
          valorTexto = `${matchNum[1]} ${unidad}`.trim();
        } else {
          valorTexto = obs;
        }
      }
    }

    const est = String(
      respAct?.semaforo || (act as any).resultado || act.estado || '',
    ).toUpperCase();
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
    } else {
      badgeText = 'CONFORME';
      badgeColor = '#15803D';
    }

    if (!valorTexto) {
      valorTexto = 'NORMAL';
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
    if (
      modulo.horasTrabajo != null &&
      placaUniversal?.requiereHorometro !== false &&
      String(placaUniversal?.unidadUso || '').toUpperCase() !== 'CAL' &&
      !itemsCards.some(
        (i) =>
          i.label.toLowerCase().includes('horómetr') ||
          i.label.toLowerCase().includes('horometr') ||
          i.label.toLowerCase().includes('ciclos') ||
          i.label.toLowerCase().includes('odómetr') ||
          i.label.toLowerCase().includes('odometr') ||
          (placaUniversal?.etiquetaContador &&
            i.label.toLowerCase().includes(placaUniversal.etiquetaContador.toLowerCase())),
      )
    ) {
      const uUsoRaw = String(placaUniversal?.unidadUso || 'HORAS').trim();
      const uUso = uUsoRaw.toUpperCase();
      const etiqRaw = placaUniversal?.etiquetaContador?.trim();
      const labelUso =
        etiqRaw ||
        (uUso === 'CICLOS'
          ? 'Ciclos de Operación'
          : uUso === 'KM_ODO' || uUso === 'KM'
            ? 'Odómetro de Operación'
            : uUso === 'UPM'
              ? 'Unidades Producidas'
              : uUso !== 'HORAS' && uUso !== 'HRS' && uUso !== 'H'
                ? uUsoRaw
                : 'Horómetro de Operación');
      const sufijoUso =
        uUso === 'CICLOS'
          ? 'ciclos'
          : uUso === 'KM_ODO' || uUso === 'KM'
            ? 'km'
            : uUso === 'UPM'
              ? 'und'
              : uUso !== 'HORAS' && uUso !== 'HRS' && uUso !== 'H'
                ? uUsoRaw.toLowerCase()
                : 'hrs';
      itemsCards.push({ label: labelUso, value: `${modulo.horasTrabajo} ${sufijoUso}` });
    }
    if (
      modulo.voltaje != null &&
      !itemsCards.some((i) => i.label.toLowerCase().includes('voltaj'))
    ) {
      itemsCards.push({ label: 'Voltaje de Operación', value: `${modulo.voltaje} V` });
    }
    if (
      modulo.corriente != null &&
      !itemsCards.some(
        (i) =>
          i.label.toLowerCase().includes('amperaj') || i.label.toLowerCase().includes('corrient'),
      )
    ) {
      itemsCards.push({ label: 'Corriente / Amperaje', value: `${modulo.corriente} A` });
    }
    const yaTieneVelocidadNoRpm = mediciones.some((m) => {
      const p = String(m.parametro || '').toLowerCase();
      const u = String(m.unidad || '').toLowerCase();
      return (p.includes('velocidad') || p.includes('cabina')) && u !== '' && !u.includes('rpm');
    });
    if (
      modulo.rpm != null &&
      !yaTieneVelocidadNoRpm &&
      !itemsCards.some(
        (i) => i.label.toLowerCase().includes('velocidad') || i.label.toLowerCase().includes('rpm'),
      )
    ) {
      itemsCards.push({ label: 'Velocidad de Operación', value: `${modulo.rpm} RPM` });
    }
    if (
      modulo.presionAceite != null &&
      !itemsCards.some(
        (i) =>
          i.label.toLowerCase().includes('presión de aceite') ||
          i.label.toLowerCase().includes('presion de aceite'),
      )
    ) {
      itemsCards.push({ label: 'Presión de Aceite', value: `${modulo.presionAceite} PSI` });
    }
    if (
      modulo.temperaturaRefrigerante != null &&
      !itemsCards.some((i) => i.label.toLowerCase().includes('temperatura'))
    ) {
      itemsCards.push({ label: 'Temperatura', value: `${modulo.temperaturaRefrigerante} °C` });
    }
    if (
      modulo.frecuencia != null &&
      !itemsCards.some((i) => i.label.toLowerCase().includes('frecuencia'))
    ) {
      itemsCards.push({ label: 'Frecuencia', value: `${modulo.frecuencia} Hz` });
    }
  }

  if (itemsCards.length === 0 && mediciones.length === 0) return '';

  const numCols = itemsCards.length <= 5 ? itemsCards.length : itemsCards.length === 6 ? 3 : 4;
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
          <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.3px; min-height: 20px; display: flex; align-items: center; justify-content: center;">${item.label}</div>
          <div style="font-size: 11px; font-weight: 900; color: #0F172A; margin-top: 3px; font-family: monospace;">${item.value}</div>
          <div style="font-size: 7.5px; font-weight: 800; color: ${item.badgeColor || '#15803D'}; margin-top: 2px;">● ${item.badge || 'CONFORME'}</div>
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

function generarEvidenciasUniversal(evidencias: any[], _lotesGaleria?: LoteGaleriaPDF[]): string {
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
    else if (upper.includes('DESPUES') || upper.includes('DESPUÉS') || upper.includes('FINAL'))
      fase = 'DESPUES';

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
                <img src="${escapeBrandHtml(item.url)}" alt="${escapeBrandHtml(item.caption)}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 3px;" onerror="this.style.display='none'" />
                <div style="font-size: 7.5px; color: #475569; margin-top: 3px; font-weight: 600; line-height: 1.2;">
                  ${escapeBrandHtml(item.caption)}
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
        const nom =
          g.equipo.nombreSistema || g.equipo.nombreEquipo || `Equipo ${g.equipo.ordenSecuencia}`;
        return `
        <div style="margin-bottom: 10px; border: 1.5px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
          <div style="background: #1E293B; color: #FFFFFF; padding: 6px 10px; font-size: 9.5px; font-weight: bold;">
            ${escapeBrandHtml(nom)} (${escapeBrandHtml(g.equipo.codigoEquipo || 'S/C')})
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
  const obs =
    datos.observaciones ||
    datos.observaciones_tecnico ||
    'Servicio ejecutado a satisfacción sin novedades extraordinarias.';

  return `
  <div class="section" style="page-break-inside: avoid;">
    <div class="section-title">📝 OBSERVACIONES, RECOMENDACIONES Y DIAGNÓSTICO FINAL</div>
    <div style="padding: 10px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 9px; line-height: 1.5; color: #1E293B; white-space: pre-wrap;">
${escapeBrandHtml(obs)}
    </div>
  </div>
  `;
}

function generarFirmasUniversal(
  datos: DatosOrdenPDF,
  brand = resolveOrgBranding(datos.branding),
): string {
  const nombreClienteRaw = (datos.nombreCliente || '').trim();
  const nombreClienteValido =
    nombreClienteRaw && !['.', '-', '--', '..', '...'].includes(nombreClienteRaw)
      ? nombreClienteRaw
      : 'Recibido a Satisfacción';

  const cargoClienteRaw = (datos.cargoCliente || '').trim();
  const cargoClienteValido =
    cargoClienteRaw && !['.', '-', '--', '..', '...'].includes(cargoClienteRaw)
      ? cargoClienteRaw
      : 'Representante del Cliente / Autorizador';

  return `
  <div class="firmas-container" style="display: table !important; width: 100% !important; border-collapse: separate !important; border-spacing: 20px 0 !important; margin-top: 14px; page-break-inside: avoid !important; break-inside: avoid !important;">
    <div style="display: table-row;">
      <div class="firma-box" style="display: table-cell; width: 50%; vertical-align: top; page-break-inside: avoid !important; break-inside: avoid !important;">
        ${
          datos.firmaTecnico
            ? `<div class="firma-imagen"><img src="${datos.firmaTecnico}" alt="Firma Técnico" style="max-height: 50px;" /></div>`
            : `<div class="firma-line"></div>`
        }
        <div class="firma-nombre">${escapeBrandHtml(datos.nombreTecnico || datos.tecnico || 'Técnico de Servicio')}</div>
        <div class="firma-cargo">${escapeBrandHtml(datos.cargoTecnico || 'Técnico Responsable de Mantenimiento')}</div>
        <div class="firma-label">${escapeBrandHtml(brand.nombreComercial)} · Departamento Técnico</div>
      </div>
      <div class="firma-box" style="display: table-cell; width: 50%; vertical-align: top; page-break-inside: avoid !important; break-inside: avoid !important;">
        ${
          datos.firmaCliente
            ? `<div class="firma-imagen"><img src="${escapeBrandHtml(datos.firmaCliente)}" alt="Firma Cliente" style="max-height: 50px;" /></div>`
            : `<div class="firma-line"></div>`
        }
        <div class="firma-nombre">${escapeBrandHtml(nombreClienteValido)}</div>
        <div class="firma-cargo">${escapeBrandHtml(cargoClienteValido)}</div>
        <div class="firma-label">Firma y Aprobación del Cliente</div>
      </div>
    </div>
  </div>
  `;
}

function generarPendientesUniversal(pendientes?: DatosOrdenPDF['pendientes']): string {
  if (!pendientes || pendientes.length === 0) {
    return '';
  }

  const badgePrioridad = (prio?: string) => {
    const p = String(prio || 'MEDIA').toUpperCase();
    if (p === 'CRITICA' || p === 'ALTA' || p === 'URGENTE') {
      return `<span style="background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;padding:2px 6px;border-radius:4px;font-size:7.5px;font-weight:700;">${p}</span>`;
    }
    if (p === 'BAJA') {
      return `<span style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:2px 6px;border-radius:4px;font-size:7.5px;font-weight:700;">${p}</span>`;
    }
    return `<span style="background:#FEF3C7;color:#B45309;border:1px solid #FCD34D;padding:2px 6px;border-radius:4px;font-size:7.5px;font-weight:700;">${p}</span>`;
  };

  const badgeEstado = (est?: string) => {
    const e = String(est || 'PENDIENTE').toUpperCase();
    const esResuelto = e === 'RESUELTO' || e === 'CERRADO';
    return `<span style="background:${esResuelto ? '#DCFCE7' : '#EFF6FF'};color:${esResuelto ? '#15803D' : '#1E40AF'};border:1px solid ${esResuelto ? '#86EFAC' : '#BFDBFE'};padding:2px 6px;border-radius:4px;font-size:7.5px;font-weight:700;">${e}</span>`;
  };

  return `
  <div class="pendientes-bloque" style="margin-top: 12px; margin-bottom: 14px; break-inside: avoid !important; page-break-inside: avoid !important;">
    <div class="section-title" style="background: linear-gradient(90deg, #7C2D12 0%, #B45309 100%); break-after: avoid; page-break-after: avoid;">📌 PENDIENTES TÉCNICOS Y HALLAZGOS (${pendientes.length})</div>
    <table class="pendientes-tabla" style="width: 100%; border-collapse: collapse; font-size: 8.5px; background: #FFFBEB; border: 1px solid #FDE68A; break-inside: avoid !important; page-break-inside: avoid !important;">
      <thead>
        <tr style="background: #FEF3C7; color: #78350F; break-inside: avoid; page-break-inside: avoid;">
          <th style="padding: 6px 8px; text-align: left; font-size: 8px;">HALLAZGO / RECOMENDACIÓN</th>
          <th style="padding: 6px 8px; text-align: center; width: 85px; font-size: 8px;">PRIORIDAD</th>
          <th style="padding: 6px 8px; text-align: center; width: 85px; font-size: 8px;">ESTADO</th>
          <th style="padding: 6px 8px; text-align: left; width: 32%; font-size: 8px;">NOTAS / REPUESTO ASOCIADO</th>
        </tr>
      </thead>
      <tbody>
        ${pendientes
          .map(
            (p) => `
          <tr style="border-top: 1px solid #FDE68A; break-inside: avoid; page-break-inside: avoid;">
            <td style="padding: 6px 8px; color: #1E293B; font-weight: 600;">
              ${p.equipoNombre ? `<div style="font-size:7.5px;color:#92400E;font-weight:700;">${p.equipoNombre}</div>` : ''}
              ${p.descripcion}
            </td>
            <td style="padding: 6px 8px; text-align: center;">${badgePrioridad(p.prioridad)}</td>
            <td style="padding: 6px 8px; text-align: center;">${badgeEstado(p.estado)}</td>
            <td style="padding: 6px 8px; color: #475569;">${p.observaciones || '-'}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>
  `;
}

export default generarTipoUniversalEamHTML;
