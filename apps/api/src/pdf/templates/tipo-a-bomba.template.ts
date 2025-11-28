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
 */

import { baseStyles, DatosOrdenPDF, MEKANOS_COLORS } from './mekanos-base.template';

export const generarTipoABombaHTML = (datos: DatosOrdenPDF): string => {
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
    
    <!-- DATOS DEL CLIENTE Y SERVICIO -->
    ${generarDatosCliente(datos)}
    
    <!-- CHECKLIST DE BOMBAS -->
    ${generarChecklistBombas(datos)}
    
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
      <h1>MANTENIMIENTO PREVENTIVO TIPO A</h1>
      <h2>SISTEMAS DE BOMBEO</h2>
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

const generarChecklistBombas = (datos: DatosOrdenPDF): string => `
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
        <!-- Inspección General -->
        <tr>
          <td>Limpieza general del sistema</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Análisis de vibración y ruido en rodamientos</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        
        <!-- Mediciones -->
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Medición de las presiones</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- PSI</span></td>
          <td></td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Medición de voltaje</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- V</span></td>
          <td></td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Medición de amperaje</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- A</span></td>
          <td></td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Temperatura</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- °C</span></td>
          <td></td>
        </tr>
        
        <!-- Inspecciones -->
        <tr>
          <td>Revisión de fugas en bombas, tanques y tubería inmediata</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Limpieza y revisión de funcionamiento del tablero de control</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Retorqueo de conexiones en el tablero</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Estado de juan omega</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Engrasar puntos de lubricación</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Revisar Sello Mecánico</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Ajustar y revisar Sello Tipo Prensa</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        
        <!-- Presostato -->
        <tr>
          <td>Revisar funcionamiento Presostato</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Presostato presión de encendido</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- PSI</span></td>
          <td></td>
        </tr>
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Presostato presión de apagado</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- PSI</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Limpiar señal hidráulica de presostato</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Probar suiche nivel de protección encendido y apagado</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        <tr>
          <td>Abrir y cerrar válvulas de operación del sistema</td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">B</span></td>
          <td></td>
        </tr>
        
        <!-- Tanques -->
        <tr style="background: ${MEKANOS_COLORS.background};">
          <td><strong>Revisar presión de los tanques</strong></td>
          <td style="text-align: center;"><span class="presion-value">-- PSI</span></td>
          <td></td>
        </tr>
        
        <!-- Preguntas SI/NO -->
        <tr>
          <td>Verificar que las membranas no estén llenas de agua</td>
          <td style="text-align: center;">
            <span class="opcion-si-no">
              <span class="opcion-si-no opcion-si">SÍ</span>
              <span class="opcion-si-no opcion-inactive">NO</span>
            </span>
          </td>
          <td></td>
        </tr>
        <tr>
          <td>¿Se debe cambiar tanque? ¿Por qué?</td>
          <td style="text-align: center;">
            <span class="opcion-si-no">
              <span class="opcion-si-no opcion-inactive">SÍ</span>
              <span class="opcion-si-no opcion-no">NO</span>
            </span>
          </td>
          <td></td>
        </tr>
        <tr>
          <td>¿El sistema tiene válvula de purga?</td>
          <td style="text-align: center;">
            <span class="opcion-si-no">
              <span class="opcion-si-no opcion-si">SÍ</span>
              <span class="opcion-si-no opcion-inactive">NO</span>
            </span>
          </td>
          <td></td>
        </tr>
        <tr>
          <td>¿Las bombas tienen válvulas de purga y cebado?</td>
          <td style="text-align: center;">
            <span class="opcion-si-no">
              <span class="opcion-si-no opcion-si">SÍ</span>
              <span class="opcion-si-no opcion-inactive">NO</span>
            </span>
          </td>
          <td></td>
        </tr>
        
        <!-- Prueba final -->
        <tr style="background: #E8F5E9;">
          <td><strong>Prueba general del sistema</strong></td>
          <td style="text-align: center;"><span class="resultado-badge resultado-B">APROBADA</span></td>
          <td></td>
        </tr>
        
        ${datos.actividades
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

export default generarTipoABombaHTML;
