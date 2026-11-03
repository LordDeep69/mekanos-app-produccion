/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Template Oficial: INFORME TÉCNICO DE MANTENIMIENTO UNIVERSAL EAM
 * 
 * Gobierna activos universales polimórficos (Compresores, Motores, Chiller HVAC, 
 * Plantas de Emergencia, Sistemas de Bombeo y cualquier arquetipo futuro del Hub).
 * 
 * - Encabezado corporativo Mekanos con logo embebido base64
 * - Trazabilidad de caso / encadenamiento fractal de visitas
 * - Placa Técnica Modular Universal (EquipoSpecsReader + JSONB + KPIs)
 * - Matriz de Telemetría Adaptativa con semáforos de evaluación
 * - Checklist dinámico agrupado por sub-sistemas
 * - Repuestos y fluidos WMS segregados
 * - Galería fotográfica cronológica con lotes
 * - Firmas digitales y pie de página corporativo
 */

import {
  baseStyles,
  DatosOrdenPDF,
  EvidenciasPorEquipoPDF,
  formatearFechaServicio,
  generarChecklistMultiEquipo,
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
  BloquePlaca,
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

    /* Estilos Especializados para la Placa Técnica Universal EAM */
    .placa-universal-card {
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      background: #FFFFFF;
      margin-bottom: 14px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .placa-universal-header {
      background: linear-gradient(135deg, ${MEKANOS_COLORS.primary} 0%, #1A365D 100%);
      color: #FFFFFF;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .placa-universal-header .tag-clase {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255, 255, 255, 0.15);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .placa-universal-header .tag-codigo {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #93C5FD;
    }
    .placa-universal-kpi-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }
    .placa-kpi-item {
      flex: 1;
      min-width: 100px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .placa-kpi-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748B;
      letter-spacing: 0.3px;
    }
    .placa-kpi-val {
      font-size: 11px;
      font-weight: 900;
      color: #0F172A;
      margin-top: 2px;
      font-family: monospace;
    }
    .placa-subsystem-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 10px 12px;
    }
    .placa-subsystem-card {
      flex: 1;
      min-width: 45%;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      overflow: hidden;
      background: #FFFFFF;
    }
    .placa-subsystem-title {
      background: #F1F5F9;
      color: #1E293B;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 8px;
      border-bottom: 1px solid #E2E8F0;
      border-left: 3px solid ${MEKANOS_COLORS.secondary};
    }
    .placa-attr-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
    }
    .placa-attr-table td {
      padding: 3px 6px;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
    }
    .placa-attr-label {
      color: #64748B;
      font-weight: 600;
      width: 45%;
    }
    .placa-attr-value {
      color: #0F172A;
      font-weight: 800;
      font-family: monospace;
    }

    /* Tabla de Mediciones y Telemetría Adaptativa */
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

    /* Badges de Actividades */
    .badge-act-b { background: #DCFCE7; color: #166534; font-weight: 900; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; border: 1px solid #86EFAC; }
    .badge-act-r { background: #FEF3C7; color: #92400E; font-weight: 900; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; border: 1px solid #FCD34D; }
    .badge-act-m { background: #FEE2E2; color: #991B1B; font-weight: 900; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; border: 1px solid #FCA5A5; }
    .badge-act-c { background: #DBEAFE; color: #1E40AF; font-weight: 900; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; border: 1px solid #93C5FD; }
    .badge-act-a { background: #E0E7FF; color: #3730A3; font-weight: 900; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; border: 1px solid #C7D2FE; }
    .badge-act-na { background: #F1F5F9; color: #64748B; font-weight: 900; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; border: 1px solid #CBD5E1; }
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

    <!-- 3. DATOS DEL CLIENTE, SEDE Y SERVICIO CON TRAZABILIDAD FRACTAL -->
    ${generarDatosServicioUniversal(datos)}

    <!-- 4. PLACA TÉCNICA MODULAR UNIVERSAL EAM (JSONB + KPIS + SUBSISTEMAS) -->
    ${generarPlacaTecnicaUniversalHTML(placaUniversal, datos)}

    <!-- 5. CHECKLIST DE INSPECCIÓN DINÁMICO POR SUBSISTEMAS -->
    ${
      esMultiEquipo && datos.actividadesPorEquipo
        ? generarChecklistMultiEquipo(datos.actividadesPorEquipo)
        : generarChecklistUniversal(datos.actividades || [])
    }

    <!-- 6. MATRIZ DE MEDICIONES Y TELEMETRÍA TÉCNICA -->
    ${
      esMultiEquipo && datos.medicionesPorEquipo
        ? generarMedicionesMultiEquipo(datos.medicionesPorEquipo)
        : generarMedicionesUniversal(datos)
    }

    <!-- 7. REPUESTOS, INSUMOS Y FLUIDOS DE SERVICIO WMS -->
    ${generarSeccionRepuestosSegregados(datos.repuestosDetallados, datos.repuestosWms, datos.tipoServicio)}

    <!-- 8. GALERÍA FOTOGRÁFICA DE EVIDENCIAS -->
    ${
      esMultiEquipo && datos.evidenciasPorEquipo && datos.evidenciasPorEquipo.length > 0
        ? generarEvidenciasMultiEquipo(datos.evidenciasPorEquipo, datos.lotesGaleria)
        : generarEvidenciasUniversal(datos.evidencias || [], datos.lotesGaleria)
    }

    <!-- 9. OBSERVACIONES Y DIAGNÓSTICO -->
    ${generarObservacionesUniversal(datos)}

    <!-- 10. FIRMAS DIGITALES Y CIERRE -->
    ${generarFirmasUniversal(datos)}

    <!-- 11. PIE DE PÁGINA CORPORATIVO -->
    ${generarFooterCorporativo()}
  </div>
</body>
</html>
`;
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-RENDERIZADORES ATÓMICOS DEL TEMPLATE UNIVERSAL
// ════════════════════════════════════════════════════════════════════════════

function generarDatosServicioUniversal(datos: DatosOrdenPDF): string {
  const eq = datos.equipoDetalle;
  const clienteNombre = eq?.cliente || datos.cliente || 'CLIENTE MEKANOS';
  const clienteNit = eq?.clienteNit || '';
  const direccion = eq?.direccion || datos.direccion || 'N/A';
  const sede = eq?.sede || datos.sede || '';
  const fechaServicio = formatearFechaServicio(
    datos.fecha,
    datos.fechaSalida,
    datos.diasDiferentes,
  );

  return `
  <div class="section">
    <table class="datos-table">
      <tr>
        <td class="label">CLIENTE:</td>
        <td class="value">${clienteNombre}${clienteNit ? ` (${clienteNit})` : ''}</td>
        <td class="label">ORDEN DE SERVICIO:</td>
        <td class="value"><strong>${datos.numeroOrden}</strong></td>
      </tr>
      <tr>
        <td class="label">SEDE / UBICACIÓN:</td>
        <td class="value">${sede ? `${sede} · ` : ''}${direccion}</td>
        <td class="label">FECHA SERVICIO:</td>
        <td class="value">${fechaServicio}</td>
      </tr>
      <tr>
        <td class="label">TÉCNICO ASIGNADO:</td>
        <td class="value">${datos.tecnico || 'Personal de Operaciones'}</td>
        <td class="label">HORARIO:</td>
        <td class="value">${datos.horaEntrada || '--:--'} a ${datos.horaSalida || '--:--'}</td>
      </tr>
      ${
        datos.numeroVisitaCaso
          ? `
      <tr>
        <td class="label">TRAZABILIDAD CASO:</td>
        <td class="value" colspan="3">
          <span style="background: #EFF6FF; color: #1E40AF; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #BFDBFE;">
            Visita #${datos.numeroVisitaCaso}${datos.tipoVisita ? ` (${datos.tipoVisita})` : ''}
          </span>
          ${datos.numeroOrdenPadre ? `<span style="color: #64748B; font-size: 8px; margin-left: 6px;">Orden anterior: ${datos.numeroOrdenPadre}</span>` : ''}
        </td>
      </tr>
      `
          : ''
      }
    </table>
  </div>
  `;
}

function generarPlacaTecnicaUniversalHTML(
  placa: DatosPlacaUniversal,
  datos: DatosOrdenPDF,
): string {
  const eq = datos.equipoDetalle;
  const codigoEquipo = eq?.codigoEquipo || 'S/C';
  const nombreEquipo = eq?.nombreEquipo || `${placa.marca} ${placa.modelo || ''}`.trim();
  const ubicacion = eq?.ubicacion || datos.sede || 'PLANTA / CUARTO DE MÁQUINAS';

  const kpis: KpiHeader[] = placa.kpis || [];
  const bloques: BloquePlaca[] = placa.bloques || [];

  return `
  <div class="placa-universal-card">
    <div class="placa-universal-header">
      <div>
        <span class="tag-clase">${placa.categoriaCanonica || 'ACTIVO'}</span>
        <strong style="margin-left: 6px; font-size: 11px;">${nombreEquipo}</strong>
      </div>
      <div class="tag-codigo">TAG: ${codigoEquipo}</div>
    </div>

    <div style="padding: 6px 12px; background: #FFFFFF; font-size: 9px; color: #334155; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between;">
      <div><strong>Marca:</strong> ${placa.marca} &nbsp;|&nbsp; <strong>Modelo:</strong> ${placa.modelo || 'N/A'} &nbsp;|&nbsp; <strong>Serie:</strong> ${placa.serie}</div>
      <div><strong>Ubicación:</strong> ${ubicacion}</div>
    </div>

    ${
      kpis.length > 0
        ? `
    <div class="placa-universal-kpi-bar">
      ${kpis
        .map(
          (kpi) => `
        <div class="placa-kpi-item">
          <div class="placa-kpi-label">${kpi.etiqueta}</div>
          <div class="placa-kpi-val">${kpi.valorTexto}</div>
        </div>
      `,
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      bloques.length > 0
        ? `
    <div class="placa-subsystem-grid">
      ${bloques
        .map(
          (bloque) => `
        <div class="placa-subsystem-card">
          <div class="placa-subsystem-title">${bloque.nombreModulo}</div>
          <table class="placa-attr-table">
            ${bloque.atributos
              .map(
                (attr) => `
              <tr>
                <td class="placa-attr-label">${attr.etiqueta}</td>
                <td class="placa-attr-value">${attr.valor}</td>
              </tr>
            `,
              )
              .join('')}
          </table>
        </div>
      `,
        )
        .join('')}
    </div>
    `
        : ''
    }
  </div>
  `;
}

function generarChecklistUniversal(actividades: any[]): string {
  if (!actividades || actividades.length === 0) {
    return `
    <div class="section">
      <div class="section-title">📋 ACTIVIDADES Y PROTOCOLO DE INSPECCIÓN</div>
      <div style="padding: 10px; text-align: center; color: #64748B; font-size: 9px;">
        No se registraron actividades específicas en esta orden.
      </div>
    </div>
    `;
  }

  // Agrupar actividades por sistema
  const sistemasMap = new Map<string, any[]>();
  for (const act of actividades) {
    const sis = (act.sistema || 'GENERAL').toUpperCase();
    if (!sistemasMap.has(sis)) sistemasMap.set(sis, []);
    sistemasMap.get(sis)!.push(act);
  }

  return `
  <div class="section">
    <div class="section-title">📋 ACTIVIDADES Y PROTOCOLO DE INSPECCIÓN (${actividades.length} ítems)</div>
    
    ${Array.from(sistemasMap.entries())
      .map(([sistema, items]) => {
        return `
        <div style="margin-bottom: 8px;">
          <div style="background: #F1F5F9; color: #1E293B; font-size: 9px; font-weight: 800; padding: 4px 8px; border-left: 3px solid ${MEKANOS_COLORS.primary};">
            SUBSISTEMA: ${sistema}
          </div>
          <table class="checklist-table" style="width: 100%; border-collapse: collapse; font-size: 8.5px;">
            <thead>
              <tr style="background: #FAFAFA; border-bottom: 1px solid #E2E8F0;">
                <th style="width: 50%; text-align: left; padding: 4px 6px;">Actividad / Tarea</th>
                <th style="width: 15%; text-align: center; padding: 4px 6px;">Estado</th>
                <th style="width: 35%; text-align: left; padding: 4px 6px;">Observaciones Técnicas</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((act) => {
                  const estRaw = (act.estado || 'NA').toUpperCase();
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

                  return `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 3px 6px; color: #1E293B;">${act.descripcion}</td>
                  <td style="padding: 3px 6px; text-align: center;">
                    <span class="${badgeClass}">${estTexto}</span>
                  </td>
                  <td style="padding: 3px 6px; color: #64748B; font-size: 8px;">${act.observaciones || '--'}</td>
                </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        `;
      })
      .join('')}

    <!-- SIMBOLOGÍA DE ESTADOS -->
    <div style="margin-top: 6px; padding: 4px 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; display: flex; gap: 10px; font-size: 7.5px; color: #475569;">
      <span><strong>CONVENCIONES:</strong></span>
      <span><span class="badge-act-b">B</span> Bueno</span>
      <span><span class="badge-act-r">R</span> Regular</span>
      <span><span class="badge-act-m">M</span> Malo</span>
      <span><span class="badge-act-c">C</span> Corregido</span>
      <span><span class="badge-act-a">A</span> Ajustado</span>
      <span><span class="badge-act-na">NA</span> No Aplica</span>
    </div>
  </div>
  `;
}

function generarMedicionesUniversal(datos: DatosOrdenPDF): string {
  const mediciones = datos.mediciones || [];
  const modulo = datos.datosModulo;

  if (mediciones.length === 0 && !modulo) return '';

  return `
  <div class="section">
    <div class="section-title">📊 TELEMETRÍA Y VARIABLES OPERACIONALES</div>
    
    ${
      modulo
        ? `
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
      ${modulo.horasTrabajo != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Horómetro</div><div class="placa-kpi-val">${modulo.horasTrabajo} hrs</div></div>` : ''}
      ${modulo.presionAceite != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Presión Aceite</div><div class="placa-kpi-val">${modulo.presionAceite} PSI</div></div>` : ''}
      ${modulo.temperaturaRefrigerante != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Temp. Refrigerante</div><div class="placa-kpi-val">${modulo.temperaturaRefrigerante} °C</div></div>` : ''}
      ${modulo.cargaBateria != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Voltaje Batería</div><div class="placa-kpi-val">${modulo.cargaBateria} VDC</div></div>` : ''}
      ${modulo.rpm != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Velocidad</div><div class="placa-kpi-val">${modulo.rpm} RPM</div></div>` : ''}
      ${modulo.voltaje != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Tensión Salida</div><div class="placa-kpi-val">${modulo.voltaje} V</div></div>` : ''}
      ${modulo.frecuencia != null ? `<div class="placa-kpi-item"><div class="placa-kpi-label">Frecuencia</div><div class="placa-kpi-val">${modulo.frecuencia} Hz</div></div>` : ''}
    </div>
    `
        : ''
    }

    ${
      mediciones.length > 0
        ? `
    <table class="datos-table" style="width: 100%; font-size: 8.5px;">
      <thead>
        <tr style="background: #F1F5F9; border-bottom: 1.5px solid #CBD5E1;">
          <th style="padding: 4px 6px; text-align: left;">Parámetro / Variable</th>
          <th style="padding: 4px 6px; text-align: center;">Valor Medido</th>
          <th style="padding: 4px 6px; text-align: center;">Rango de Referencia</th>
          <th style="padding: 4px 6px; text-align: center;">Evaluación</th>
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
            <td style="padding: 3px 6px; font-weight: 600;">${m.parametro}</td>
            <td style="padding: 3px 6px; text-align: center; font-family: monospace; font-weight: 800;">
              ${m.valor} ${m.unidad || ''}
            </td>
            <td style="padding: 3px 6px; text-align: center; color: #64748B;">${rangoTexto}</td>
            <td style="padding: 3px 6px; text-align: center;">${badge}</td>
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
  lotesGaleria?: LoteGaleriaPDF[],
): string {
  if (!evidencias || evidencias.length === 0) {
    return `
    <div class="section">
      <div class="section-title">📷 REGISTRO FOTOGRÁFICO DE INTERVENCIÓN</div>
      <div style="padding: 10px; text-align: center; color: #64748B; font-size: 9px;">
        No se adjuntaron registros fotográficos en este reporte.
      </div>
    </div>
    `;
  }

  // Agrupar por fase ANTES, DURANTE, DESPUES, GENERAL
  const grupos: Record<string, any[]> = {
    ANTES: [],
    DURANTE: [],
    DESPUES: [],
    GENERAL: [],
  };

  for (const ev of evidencias) {
    const rawUrl = typeof ev === 'string' ? ev : ev.url;
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
