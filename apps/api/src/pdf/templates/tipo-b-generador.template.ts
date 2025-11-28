/**
 * Template MEKANOS - Mantenimiento Preventivo Tipo B - GENERADORES
 *
 * Incluye cambio de filtros y fluidos:
 * - CAMBIO DE REFRIGERANTE
 * - CAMBIO DE FILTROS DE AIRE
 * - CAMBIO DE FILTRO DE COMBUSTIBLE
 * - CAMBIO DE ACEITE
 * - CAMBIO DE FILTRO DE ACEITE
 */

import { baseStyles, DatosOrdenPDF, MEKANOS_COLORS } from './mekanos-base.template';

export const generarTipoBGeneradorHTML = (datos: DatosOrdenPDF): string => {
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
    
    .cambio-item {
      background: ${MEKANOS_COLORS.highlight};
      color: ${MEKANOS_COLORS.primary};
      padding: 3px 8px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 9px;
      margin-right: 5px;
    }
    
    .filtro-options {
      display: flex;
      gap: 5px;
      margin-top: 4px;
    }
    
    .filtro-option {
      background: ${MEKANOS_COLORS.background};
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 8px;
      border: 1px solid ${MEKANOS_COLORS.border};
    }
    
    .filtro-option.selected {
      background: ${MEKANOS_COLORS.secondary};
      color: white;
      border-color: ${MEKANOS_COLORS.secondary};
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    ${generarHeader(datos)}
    
    <!-- DATOS DEL CLIENTE Y SERVICIO -->
    ${generarDatosCliente(datos)}
    
    <!-- AVISO TIPO B -->
    <div class="section">
      <div style="background: ${MEKANOS_COLORS.highlight}; color: ${MEKANOS_COLORS.primary}; padding: 8px 12px; border-radius: 4px; font-weight: bold; text-align: center; margin-bottom: 10px;">
        ⚙️ MANTENIMIENTO TIPO B - INCLUYE CAMBIO DE FILTROS Y FLUIDOS
      </div>
    </div>
    
    <!-- LISTA DE ACTIVIDADES DE MANTENIMIENTO -->
    ${generarSeccionEnfriamientoTipoB(actividadesPorSistema['ENFRIAMIENTO'] || [])}
    ${generarSeccionAspiracionTipoB(actividadesPorSistema['ASPIRACION'] || [])}
    ${generarSeccionCombustibleTipoB(actividadesPorSistema['COMBUSTIBLE'] || [])}
    ${generarSeccionLubricacionTipoB(actividadesPorSistema['LUBRICACION'] || [])}
    ${generarSeccionElectricoTipoB(actividadesPorSistema['ELECTRICO'] || [])}
    
    <!-- REGISTRO DE DATOS DEL MÓDULO DE CONTROL -->
    ${generarDatosModulo(datos)}
    
    <!-- SIMBOLOGÍA -->
    ${generarSimbologia()}
  </div>
  
  <div class="page page-break">
    <!-- EVIDENCIAS FOTOGRÁFICAS -->
    ${generarEvidencias(datos.evidencias)}
    
    <!-- OBSERVACIONES -->
    ${generarObservaciones(datos.observaciones)}
    
    <!-- FIRMAS -->
    ${generarFirmas()}
    
    <!-- FOOTER -->
    ${generarFooter()}
  </div>
</body>
</html>
`;
};

const generarHeader = (datos: DatosOrdenPDF): string => `
  <div class="header">
    <div class="logo-container">
      <svg class="logo" viewBox="0 0 100 40">
        <rect width="100" height="40" fill="${MEKANOS_COLORS.primary}"/>
        <text x="50" y="25" fill="white" font-size="14" font-weight="bold" text-anchor="middle">MEKANOS</text>
      </svg>
    </div>
    <div class="header-title">
      <h1>MANTENIMIENTO PREVENTIVO TIPO B</h1>
      <h2>GENERADORES ELÉCTRICOS - CAMBIO DE FILTROS Y FLUIDOS</h2>
    </div>
    <div class="header-order">
      <div class="order-number">${datos.numeroOrden}</div>
    </div>
  </div>
`;

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

const generarSeccionEnfriamientoTipoB = (actividades: any[]): string => `
  <div class="section">
    <div class="section-subtitle">SISTEMA DE ENFRIAMIENTO</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Revisar tapa de radiador</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr style="background: #E8F5E9;">
          <td><span class="cambio-item">CAMBIO</span> Realizar cambio de refrigerante</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">✓</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar fugas en mangueras, abrazaderas, tuberías, radiador, etc.</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Inspeccionar aspas del ventilador, guardas y soportes</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar panal del radiador, limpieza, condición y estado</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar estado y tensión de las correas</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        ${actividades
          .map(
            (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;"><span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span></td>
            <td>${act.observaciones || ''}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
`;

const generarSeccionAspiracionTipoB = (actividades: any[]): string => `
  <div class="section">
    <div class="section-subtitle">SISTEMA DE ASPIRACIÓN</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #E8F5E9;">
          <td>
            <span class="cambio-item">CAMBIO</span> Realizar cambio de filtros de aire
            <div class="filtro-options">
              <span class="filtro-option">FILTRO DOBLE</span>
              <span class="filtro-option selected">FILTRO 1</span>
              <span class="filtro-option">FILTRO 2</span>
              <span class="filtro-option">FILTRO 3</span>
            </div>
          </td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">✓</span></td>
          <td></td>
        </tr>
        ${actividades
          .map(
            (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;"><span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span></td>
            <td>${act.observaciones || ''}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
`;

const generarSeccionCombustibleTipoB = (actividades: any[]): string => `
  <div class="section">
    <div class="section-subtitle">SISTEMA DE COMBUSTIBLE</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Revisar mangueras, tuberías y abrazaderas del sistema de combustible</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Inspeccionar sistema riel común, fugas, acoples y tuberías</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar operación y estado de bomba de transferencia</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr style="background: #E8F5E9;">
          <td>
            <span class="cambio-item">CAMBIO</span> Realizar cambio de filtro de combustible
            <div class="filtro-options">
              <span class="filtro-option">TRAMPA SEPARADOR</span>
              <span class="filtro-option selected">FILTRO 1</span>
              <span class="filtro-option">FILTRO 2</span>
              <span class="filtro-option">FILTRO 3</span>
            </div>
          </td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">✓</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar nivel de combustible</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        ${actividades
          .map(
            (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;"><span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span></td>
            <td>${act.observaciones || ''}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
`;

const generarSeccionLubricacionTipoB = (actividades: any[]): string => `
  <div class="section">
    <div class="section-subtitle">SISTEMA DE LUBRICACIÓN</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #E8F5E9;">
          <td><span class="cambio-item">CAMBIO</span> Realizar cambio de aceite</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">✓</span></td>
          <td></td>
        </tr>
        <tr style="background: #E8F5E9;">
          <td>
            <span class="cambio-item">CAMBIO</span> Realizar cambio de filtro de aceite
            <div class="filtro-options">
              <span class="filtro-option selected">FILTRO 1</span>
              <span class="filtro-option">FILTRO 2</span>
              <span class="filtro-option">FILTRO 3</span>
            </div>
          </td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">✓</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Inspección por fugas</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        ${actividades
          .map(
            (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;"><span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span></td>
            <td>${act.observaciones || ''}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
`;

const generarSeccionElectricoTipoB = (actividades: any[]): string => `
  <div class="section">
    <div class="section-subtitle">SISTEMA ELÉCTRICO DEL MOTOR</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 70%;">Actividad</th>
          <th style="width: 15%;">Estado</th>
          <th style="width: 15%;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Revisar cargador de batería</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar electrolitos de batería</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar sistema de carga de baterías</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Limpieza y ajuste de bornes</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar instrumentos y controles</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        ${actividades
          .map(
            (act) => `
          <tr>
            <td>${act.descripcion}</td>
            <td style="text-align: center;"><span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span></td>
            <td>${act.observaciones || ''}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
`;

const generarDatosModulo = (datos: DatosOrdenPDF): string => {
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

const generarSimbologia = (): string => `
  <div class="section">
    <div class="section-title">SIMBOLOGÍA</div>
    <div class="simbologia-grid">
      <div class="simbologia-item"><span class="simbologia-code">B:</span> Bueno</div>
      <div class="simbologia-item"><span class="simbologia-code">R:</span> Regular</div>
      <div class="simbologia-item"><span class="simbologia-code">M:</span> Malo</div>
      <div class="simbologia-item"><span class="simbologia-code">I:</span> Inspeccionar</div>
      <div class="simbologia-item"><span class="simbologia-code">C:</span> Cambiar</div>
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

const generarEvidencias = (evidencias: string[] | { url: string; caption?: string }[]): string => {
  if (!evidencias || evidencias.length === 0) return '';

  // Normalizar formato - soportar array de strings o array de objetos
  const evidenciasNormalizadas = evidencias.map((ev, idx) => {
    if (typeof ev === 'string') {
      return { url: ev, caption: `Evidencia ${idx + 1}` };
    }
    return { url: ev.url, caption: ev.caption || `Evidencia ${idx + 1}` };
  });

  return `
  <div class="section">
    <div class="section-title">📷 EVIDENCIAS FOTOGRÁFICAS</div>
    <div class="evidencias-grid">
      ${evidenciasNormalizadas
        .map(
          (ev, idx) => `
        <div class="evidencia-item">
          <img src="${ev.url}" alt="${ev.caption}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'background:#f0f0f0;height:100%;display:flex;align-items:center;justify-content:center;color:#666;\\'>Imagen no disponible</div>';" />
          <div class="evidencia-caption">${ev.caption}</div>
        </div>
      `,
        )
        .join('')}
    </div>
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

const generarFirmas = (): string => `
  <div class="firmas-container">
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">Firma Técnico Asignado</div>
    </div>
    <div class="firma-box">
      <div class="firma-line"></div>
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
    ELECTRICO: [],
  };

  actividades.forEach((act) => {
    const sistema = act.sistema?.toUpperCase() || 'GENERAL';
    if (grupos[sistema]) {
      grupos[sistema].push(act);
    }
  });

  return grupos;
};

export default generarTipoBGeneradorHTML;
