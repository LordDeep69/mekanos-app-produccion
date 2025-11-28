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
 */

import {
  baseStyles,
  DatosOrdenPDF,
  MEKANOS_COLORS,
  getResultadoLabel,
} from './mekanos-base.template';

export const generarTipoAGeneradorHTML = (datos: DatosOrdenPDF): string => {
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
    
    <!-- DATOS DEL CLIENTE Y SERVICIO -->
    ${generarDatosCliente(datos)}
    
    <!-- LISTA DE ACTIVIDADES DE INSPECCIÓN -->
    ${generarSeccionActividades('SISTEMA DE ENFRIAMIENTO', actividadesPorSistema['ENFRIAMIENTO'] || [])}
    ${generarSeccionActividades('SISTEMA DE ASPIRACIÓN', actividadesPorSistema['ASPIRACION'] || [])}
    ${generarSeccionActividades('SISTEMA DE COMBUSTIBLE', actividadesPorSistema['COMBUSTIBLE'] || [])}
    ${generarSeccionActividades('SISTEMA DE LUBRICACIÓN', actividadesPorSistema['LUBRICACION'] || [])}
    ${generarSeccionActividades('SISTEMA DE ESCAPE', actividadesPorSistema['ESCAPE'] || [])}
    ${generarSeccionActividades('SISTEMA ELÉCTRICO DEL MOTOR', actividadesPorSistema['ELECTRICO'] || [])}
    
    <!-- REGISTRO DE DATOS DEL MÓDULO DE CONTROL -->
    ${generarDatosModulo(datos)}
    
    <!-- GENERAL -->
    ${generarSeccionGeneral(actividadesPorSistema['GENERAL'] || [])}
    
    <!-- SIMBOLOGÍA -->
    ${generarSimbologia()}
    
    <!-- MEDICIONES (si hay) -->
    ${datos.mediciones.length > 0 ? generarMediciones(datos.mediciones) : ''}
  </div>
  
  <div class="page page-break">
    <!-- EVIDENCIAS FOTOGRÁFICAS -->
    ${generarEvidencias(datos.evidencias)}
    
    <!-- OBSERVACIONES -->
    ${generarObservaciones(datos.observaciones)}
    
    <!-- FIRMAS -->
    ${generarFirmas(datos.firmaTecnico, datos.firmaCliente)}
    
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
      <h2>EQUIPOS GENERADORES ELÉCTRICOS</h2>
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
            <td>${act.observaciones || ''}</td>
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
              <span class="resultado-badge resultado-${act.resultado === 'B' ? 'B' : 'default'}">${act.resultado === 'B' ? 'SÍ' : act.resultado === 'M' ? 'NO' : act.resultado || '-'}</span>
            </td>
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

  // Generar captions por posición de imagen
  const getCaptionPorIndice = (idx: number): string => {
    const captions = [
      'VISTA GENERAL DEL EQUIPO',
      'DETALLE SISTEMA DE ENFRIAMIENTO',
      'PANEL DE CONTROL / MÓDULO',
      'SISTEMA DE COMBUSTIBLE',
      'EVIDENCIA ADICIONAL',
      'EVIDENCIA ADICIONAL',
    ];
    return captions[idx] || `EVIDENCIA ${idx + 1}`;
  };

  // Normalizar evidencias a formato objeto
  const normalizarEvidencia = (
    ev: EvidenciaInput,
    idx: number,
  ): { url: string; caption: string } => {
    if (typeof ev === 'string') {
      return { url: ev, caption: getCaptionPorIndice(idx) };
    }
    return { url: ev.url, caption: ev.caption || getCaptionPorIndice(idx) };
  };

  return `
  <div class="section">
    <div class="section-title">📷 REGISTRO FOTOGRÁFICO DEL SERVICIO</div>
    <div class="evidencias-grid">
      ${evidencias
        .map((ev, idx) => {
          const { url, caption } = normalizarEvidencia(ev, idx);
          return `
        <div class="evidencia-item${idx === 0 ? ' evidencia-principal' : ''}">
          <img src="${url}" alt="${caption}" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'" />
          <div class="evidencia-caption">${caption}</div>
        </div>
      `;
        })
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

const generarFirmas = (firmaTecnico?: string, firmaCliente?: string): string => `
  <div class="firmas-container">
    <div class="firma-box">
      ${
        firmaTecnico
          ? `<div class="firma-imagen"><img src="${firmaTecnico}" alt="Firma Técnico" /></div>`
          : `<div class="firma-line"></div>`
      }
      <div class="firma-label">Firma Técnico Asignado</div>
    </div>
    <div class="firma-box">
      ${
        firmaCliente
          ? `<div class="firma-imagen"><img src="${firmaCliente}" alt="Firma Cliente" /></div>`
          : `<div class="firma-line"></div>`
      }
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

export default generarTipoAGeneradorHTML;
