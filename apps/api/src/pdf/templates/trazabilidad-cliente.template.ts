/**
 * Template MEKANOS - Informe Ejecutivo de Trazabilidad y Mantenimiento de Servicios
 * 
 * Diseño corporativo de alto nivel para comités técnicos, juntas directivas y gerencias.
 * Colores oficiales MEKANOS S.A.S:
 * #244673 - Azul Marino Corporativo (Header y títulos)
 * #3290A6 - Azul Técnico (Acentos y bordes)
 * #56A672 - Verde Éxito / Preventivo
 * #D97706 - Ámbar / Correctivo
 * #DC2626 - Rojo / Emergencia
 */

import { MEKANOS_COLORS, getLogoBase64 } from './mekanos-base.template';

export interface DatosTrazabilidadClientePDF {
  cliente: {
    nombre: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    ciudad?: string;
  };
  periodo: {
    desde?: string;
    hasta?: string;
    fechaGeneracion: string;
  };
  filtrosAplicados: {
    equipo?: string;
    categoria?: string;
    sede?: string;
    search?: string;
  };
  resumenKpis: {
    totalOrdenes: number;
    totalPreventivos: number;
    totalCorrectivos: number;
    totalEmergencias: number;
    totalEquiposAuditados: number;
  };
  ordenes: Array<{
    id_orden_servicio: number;
    numero_orden: string;
    fecha: string;
    estado: string;
    color_estado?: string;
    tipoServicio: string;
    categoria: string;
    equipos: Array<{
      nombre: string;
      codigo?: string;
      serie?: string;
      tipo?: string;
      horas?: number;
    }>;
    serviciosEspecificos: Array<{
      nombre: string;
      cantidad: number;
    }>;
    diagnosticoTrabajo: {
      falla?: string;
      trabajo?: string;
      cierre?: string;
    };
    tecnico: string;
  }>;
}

export function generarTrazabilidadClienteHTML(datos: DatosTrazabilidadClientePDF): string {
  const logoBase64 = getLogoBase64();
  const periodoTexto = datos.periodo.desde && datos.periodo.hasta
    ? `${datos.periodo.desde} al ${datos.periodo.hasta}`
    : datos.periodo.desde
      ? `Desde ${datos.periodo.desde}`
      : datos.periodo.hasta
        ? `Hasta ${datos.periodo.hasta}`
        : 'Todo el Histórico Operacional Registrado';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Informe Ejecutivo de Trazabilidad - ${datos.cliente.nombre}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      color: #1e293b;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border-bottom: 2px solid ${MEKANOS_COLORS.primary};
      padding-bottom: 8px;
    }
    
    .logo-cell {
      width: 160px;
      vertical-align: middle;
    }
    
    .title-cell {
      text-align: center;
      vertical-align: middle;
      padding: 0 10px;
    }
    
    .title-cell h1 {
      font-size: 13pt;
      font-weight: 900;
      color: ${MEKANOS_COLORS.primary};
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    .title-cell h2 {
      font-size: 9pt;
      font-weight: 700;
      color: ${MEKANOS_COLORS.secondary};
      text-transform: uppercase;
    }

    .meta-cell {
      width: 150px;
      text-align: right;
      vertical-align: middle;
      font-size: 7.5pt;
      color: #475569;
    }

    .doc-badge {
      display: inline-block;
      background-color: ${MEKANOS_COLORS.primary};
      color: #ffffff;
      font-weight: 800;
      font-size: 8pt;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 3px;
    }

    /* TARJETA DE INFORMACIÓN DEL CLIENTE Y AUDITORÍA */
    .client-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid ${MEKANOS_COLORS.primary};
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }

    .client-grid {
      display: table;
      width: 100%;
    }

    .client-row {
      display: table-row;
    }

    .client-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding: 2px 4px;
    }

    .field-label {
      font-size: 7.5pt;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
    }

    .field-value {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
    }

    .filter-tag {
      display: inline-block;
      background-color: #e2e8f0;
      color: #334155;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      margin-right: 4px;
    }

    /* KPIS EXECUTIVE SUMMARY */
    .kpi-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 6px 0;
      margin-bottom: 12px;
    }

    .kpi-card {
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
      vertical-align: middle;
    }

    .kpi-card.primary {
      border-top: 3px solid ${MEKANOS_COLORS.primary};
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }

    .kpi-card.preventivo {
      border-top: 3px solid ${MEKANOS_COLORS.success};
      background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
    }

    .kpi-card.correctivo {
      border-top: 3px solid #d97706;
      background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
    }

    .kpi-card.equipos {
      border-top: 3px solid ${MEKANOS_COLORS.secondary};
      background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
    }

    .kpi-num {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }

    .kpi-lbl {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 1px;
    }

    /* TABLA DE INTERVENCIONES */
    .intervenciones-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 14px;
    }

    .intervenciones-table th {
      background-color: ${MEKANOS_COLORS.primary};
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 6px 6px;
      border: 1px solid #1e3a8a;
      text-align: left;
    }

    .intervenciones-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 6px;
      font-size: 8pt;
      vertical-align: top;
    }

    .intervenciones-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .orden-tag {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 900;
      color: ${MEKANOS_COLORS.primary};
      font-size: 8.5pt;
      display: block;
    }

    .fecha-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 1px;
    }

    .badge-tipo {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    .badge-preventivo {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .badge-correctivo {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .badge-emergencia {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .servicio-pill {
      display: block;
      background-color: #fff7ed;
      border: 1px solid #fed7aa;
      color: #9a3412;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 3px;
      margin-bottom: 2px;
    }

    .diag-block {
      margin-bottom: 3px;
    }

    .diag-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }

    .diag-content {
      font-size: 7.5pt;
      color: #334155;
      white-space: pre-line;
      line-height: 1.25;
    }

    .tecnico-badge {
      font-weight: 700;
      color: #0f172a;
      font-size: 8pt;
    }

    /* PIE DE PÁGINA INSTITUCIONAL */
    .footer-box {
      margin-top: 15px;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 8px;
      font-size: 7.5pt;
      color: #64748b;
      text-align: center;
      page-break-inside: avoid;
    }

    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>

  <!-- HEADER PRINCIPAL -->
  <table class="header-table">
    <tr>
      <td class="logo-cell">
        <img src="data:image/png;base64,${logoBase64}" alt="MEKANOS S.A.S" style="height: 48px; width: auto;" />
      </td>
      <td class="title-cell">
        <h1>Informe Ejecutivo de Trazabilidad</h1>
        <h2>Historial Integral de Mantenimiento y Confiabilidad</h2>
      </td>
      <td class="meta-cell">
        <div class="doc-badge">MEK-TRZ-360</div>
        <div><strong>Emisión:</strong> ${datos.periodo.fechaGeneracion}</div>
        <div>Cartagena de Indias, Col.</div>
      </td>
    </tr>
  </table>

  <!-- INFORMACIÓN DEL CLIENTE Y PERÍODO -->
  <div class="client-card">
    <div class="client-grid">
      <div class="client-row">
        <div class="client-col">
          <span class="field-label">Cliente / Razón Social:</span>
          <div class="field-value">${datos.cliente.nombre}</div>
          <div style="font-size: 7.5pt; color: #475569; margin-top: 2px;">
            ${datos.cliente.nit ? `<strong>NIT/Doc:</strong> ${datos.cliente.nit}` : ''} 
            ${datos.cliente.ciudad ? ` | <strong>Ciudad:</strong> ${datos.cliente.ciudad}` : ''}
            ${datos.cliente.direccion ? ` | <strong>Dir:</strong> ${datos.cliente.direccion}` : ''}
          </div>
        </div>
        <div class="client-col">
          <span class="field-label">Período Auditado:</span>
          <div class="field-value" style="color: ${MEKANOS_COLORS.primary};">${periodoTexto}</div>
          <div style="margin-top: 3px;">
            ${datos.filtrosAplicados.categoria ? `<span class="filter-tag">Categoría: ${datos.filtrosAplicados.categoria}</span>` : ''}
            ${datos.filtrosAplicados.equipo ? `<span class="filter-tag">Equipo: ${datos.filtrosAplicados.equipo}</span>` : ''}
            ${datos.filtrosAplicados.sede ? `<span class="filter-tag">Sede: ${datos.filtrosAplicados.sede}</span>` : ''}
            ${datos.filtrosAplicados.search ? `<span class="filter-tag">Búsqueda: "${datos.filtrosAplicados.search}"</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- RESUMEN EJECUTIVO / KPIS -->
  <table class="kpi-table">
    <tr>
      <td class="kpi-card primary" style="width: 20%;">
        <div class="kpi-num">${datos.resumenKpis.totalOrdenes}</div>
        <div class="kpi-lbl">Total Servicios</div>
      </td>
      <td class="kpi-card preventivo" style="width: 20%;">
        <div class="kpi-num" style="color: #166534;">${datos.resumenKpis.totalPreventivos}</div>
        <div class="kpi-lbl">Preventivos</div>
      </td>
      <td class="kpi-card correctivo" style="width: 20%;">
        <div class="kpi-num" style="color: #b45309;">${datos.resumenKpis.totalCorrectivos}</div>
        <div class="kpi-lbl">Correctivos</div>
      </td>
      <td class="kpi-card" style="width: 20%; border-top: 3px solid #dc2626; background: linear-gradient(180deg, #fef2f2 0%, #ffffff 100%);">
        <div class="kpi-num" style="color: #b91c1c;">${datos.resumenKpis.totalEmergencias}</div>
        <div class="kpi-lbl">Emergencias</div>
      </td>
      <td class="kpi-card equipos" style="width: 20%;">
        <div class="kpi-num" style="color: ${MEKANOS_COLORS.secondary};">${datos.resumenKpis.totalEquiposAuditados}</div>
        <div class="kpi-lbl">Equipos Cubiertos</div>
      </td>
    </tr>
  </table>

  <!-- MATRIZ DE INTERVENCIONES TÉCNICAS -->
  <table class="intervenciones-table">
    <thead>
      <tr>
        <th style="width: 12%;">Fecha / Orden</th>
        <th style="width: 14%;">Naturaleza</th>
        <th style="width: 18%;">Activo / Horómetro</th>
        <th style="width: 20%;">Alcance & Servicios</th>
        <th style="width: 24%;">Diagnóstico & Trabajo</th>
        <th style="width: 12%;">Especialista</th>
      </tr>
    </thead>
    <tbody>
      ${datos.ordenes.length > 0 ? datos.ordenes.map((orden) => {
    const esCorrectivo = orden.categoria === 'CORRECTIVO' || orden.categoria === 'EMERGENCIA';
    const badgeClass = orden.categoria === 'EMERGENCIA'
      ? 'badge-emergencia'
      : esCorrectivo
        ? 'badge-correctivo'
        : 'badge-preventivo';

    return `
        <tr>
          <td>
            <span class="orden-tag">${orden.numero_orden}</span>
            <div class="fecha-sub">${orden.fecha}</div>
            <div style="font-size: 6.5pt; font-weight: bold; color: ${orden.color_estado || '#64748b'}; text-transform: uppercase; margin-top: 2px;">
              ${orden.estado}
            </div>
          </td>
          <td>
            <span class="badge-tipo ${badgeClass}">${orden.categoria}</span>
            <div style="font-weight: 700; color: #1e293b; font-size: 7.5pt;">${orden.tipoServicio}</div>
          </td>
          <td>
            ${orden.equipos.length > 0 ? orden.equipos.map((eq) => `
              <div style="margin-bottom: 3px;">
                <div style="font-weight: 800; color: #0f172a; font-size: 7.5pt;">${eq.nombre}</div>
                <div style="font-size: 6.5pt; color: #64748b;">
                  ${eq.codigo ? `Cod: ${eq.codigo}` : ''} ${eq.tipo ? `| ${eq.tipo}` : ''}
                  ${eq.horas != null ? `<span style="font-weight: 800; color: #0f172a; background: #e2e8f0; padding: 0 3px; border-radius: 2px;">${eq.horas} hrs</span>` : ''}
                </div>
              </div>
            `).join('') : '<span style="color: #94a3b8; font-style: italic;">Sin equipo</span>'}
          </td>
          <td>
            ${orden.serviciosEspecificos.length > 0 ? orden.serviciosEspecificos.map((srv) => `
              <div class="servicio-pill">
                ${srv.nombre} ${srv.cantidad > 1 ? `(x${srv.cantidad})` : ''}
              </div>
            `).join('') : esCorrectivo
        ? '<span style="font-size: 7pt; color: #9a3412; font-weight: bold;">Intervención correctiva general en campo</span>'
        : '<span style="font-size: 7pt; color: #64748b;">Rutina preventiva según protocolo</span>'
      }
          </td>
          <td>
            ${orden.diagnosticoTrabajo.trabajo ? `
              <div class="diag-block">
                <span class="diag-title">Trabajo:</span>
                <div class="diag-content">${orden.diagnosticoTrabajo.trabajo}</div>
              </div>
            ` : ''}
            ${orden.diagnosticoTrabajo.falla ? `
              <div class="diag-block">
                <span class="diag-title" style="color: #b45309;">Falla:</span>
                <div class="diag-content">${orden.diagnosticoTrabajo.falla}</div>
              </div>
            ` : ''}
            ${orden.diagnosticoTrabajo.cierre ? `
              <div class="diag-block">
                <span class="diag-title" style="color: #475569;">Cierre:</span>
                <div class="diag-content">${orden.diagnosticoTrabajo.cierre}</div>
              </div>
            ` : ''}
            ${!orden.diagnosticoTrabajo.trabajo && !orden.diagnosticoTrabajo.falla && !orden.diagnosticoTrabajo.cierre ? `
              <span style="color: #94a3b8; font-style: italic; font-size: 7pt;">Sin observaciones detalladas</span>
            ` : ''}
          </td>
          <td>
            <div class="tecnico-badge">${orden.tecnico}</div>
            <div style="font-size: 6.5pt; color: #64748b;">Técnico Especialista</div>
          </td>
        </tr>
        `;
  }).join('') : `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">
            No se encontraron registros de servicios para el período y filtros seleccionados.
          </td>
        </tr>
      `}
    </tbody>
  </table>

  <!-- PIE DE PÁGINA CORPORATIVO -->
  <div class="footer-box">
    <p style="font-weight: bold; color: ${MEKANOS_COLORS.primary};">MEKANOS S.A.S — Mantenimiento Técnico Especializado</p>
    <p>Documento oficial emitido por el Sistema de Gestión Operativa MEKANOS. Prohibida su alteración o reproducción no autorizada.</p>
    <p style="font-size: 7pt; margin-top: 2px;">Cartagena de Indias: Barrio, Líbano Cra 49C #31-35 Diag. Al Sena | TEL: 315-7083350 | Email: mekanossas4@gmail.com | 
  </div>

</body>
</html>
  `;
}
