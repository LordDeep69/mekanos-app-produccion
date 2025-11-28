/**
 * TEST ATÓMICO - Generación PDF Enterprise con Template Tipo A Generador
 * 
 * Este test verifica:
 * 1. Generación del HTML con datos completos
 * 2. Renderización de evidencias fotográficas
 * 3. Renderización de firmas digitales (imágenes base64)
 * 4. Conversión a PDF con Puppeteer
 * 5. Estética y calidad del resultado
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ========== COLORES MEKANOS ==========
const MEKANOS_COLORS = {
  background: '#F2F2F2',
  primary: '#244673',
  secondary: '#3290A6',
  success: '#56A672',
  highlight: '#9EC23D',
  white: '#FFFFFF',
  text: '#333333',
  border: '#CCCCCC',
  warning: '#F59E0B',
  danger: '#DC2626',
};

// ========== ESTILOS BASE ==========
const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: ${MEKANOS_COLORS.text};
    background: ${MEKANOS_COLORS.white};
  }
  
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 15mm;
    margin: 0 auto;
    background: ${MEKANOS_COLORS.white};
  }
  
  @page { size: A4; margin: 0; }
  
  @media print {
    .page { margin: 0; border: none; box-shadow: none; }
    .page-break { page-break-before: always; }
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 10px;
    border-bottom: 3px solid ${MEKANOS_COLORS.primary};
    margin-bottom: 15px;
  }
  
  .logo-container { flex: 0 0 120px; }
  
  .header-title { flex: 1; text-align: center; }
  
  .header-title h1 {
    font-size: 16px;
    color: ${MEKANOS_COLORS.primary};
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .header-title h2 {
    font-size: 12px;
    color: ${MEKANOS_COLORS.secondary};
    font-weight: normal;
  }
  
  .header-order { flex: 0 0 120px; text-align: right; }
  
  .order-number {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 8px 12px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 10px;
  }
  
  .section { margin-bottom: 15px; }
  
  .section-title {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 6px 10px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 8px;
    border-radius: 3px;
  }
  
  .section-subtitle {
    background: ${MEKANOS_COLORS.secondary};
    color: ${MEKANOS_COLORS.white};
    padding: 4px 8px;
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 6px;
    border-radius: 2px;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .info-grid-4 { grid-template-columns: repeat(4, 1fr); }
  
  .info-item { display: flex; flex-direction: column; }
  
  .info-label {
    font-size: 9px;
    color: ${MEKANOS_COLORS.secondary};
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  
  .info-value {
    font-size: 11px;
    color: ${MEKANOS_COLORS.text};
    padding: 4px 6px;
    background: ${MEKANOS_COLORS.background};
    border-radius: 2px;
    min-height: 22px;
  }
  
  .checklist-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  
  .checklist-table th {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 5px 8px;
    text-align: left;
    font-weight: bold;
    border: 1px solid ${MEKANOS_COLORS.primary};
  }
  
  .checklist-table td {
    padding: 4px 8px;
    border: 1px solid ${MEKANOS_COLORS.border};
    vertical-align: middle;
  }
  
  .checklist-table tr:nth-child(even) { background: ${MEKANOS_COLORS.background}; }
  
  .resultado-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-weight: bold;
    font-size: 9px;
    text-align: center;
    min-width: 40px;
  }
  
  .resultado-B { background: ${MEKANOS_COLORS.success}; color: white; }
  .resultado-R { background: ${MEKANOS_COLORS.warning}; color: white; }
  .resultado-M { background: ${MEKANOS_COLORS.danger}; color: white; }
  .resultado-C { background: ${MEKANOS_COLORS.warning}; color: white; }
  .resultado-LI, .resultado-L, .resultado-A { background: ${MEKANOS_COLORS.secondary}; color: white; }
  .resultado-F, .resultado-RN { background: ${MEKANOS_COLORS.highlight}; color: white; }
  .resultado-default { background: ${MEKANOS_COLORS.secondary}; color: white; }
  
  .mediciones-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  
  .medicion-item {
    background: ${MEKANOS_COLORS.background};
    padding: 8px;
    border-radius: 4px;
    text-align: center;
    border-left: 3px solid ${MEKANOS_COLORS.primary};
  }
  
  .medicion-label {
    font-size: 9px;
    color: ${MEKANOS_COLORS.secondary};
    margin-bottom: 4px;
  }
  
  .medicion-value {
    font-size: 14px;
    font-weight: bold;
    color: ${MEKANOS_COLORS.primary};
  }
  
  .evidencias-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    margin-top: 10px;
  }
  
  .evidencia-item {
    border: 2px solid ${MEKANOS_COLORS.primary};
    border-radius: 8px;
    overflow: hidden;
    background: ${MEKANOS_COLORS.white};
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .evidencia-item img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    display: block;
  }
  
  .evidencia-principal { grid-column: span 2; }
  .evidencia-principal img { height: 200px; }
  
  .evidencia-caption {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 6px 10px;
    font-size: 9px;
    text-align: center;
    font-weight: bold;
  }
  
  .observaciones-box {
    background: ${MEKANOS_COLORS.background};
    padding: 10px;
    border-radius: 4px;
    min-height: 60px;
    border-left: 3px solid ${MEKANOS_COLORS.secondary};
    white-space: pre-wrap;
  }
  
  .firmas-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
    margin-top: 20px;
    padding: 20px;
    background: ${MEKANOS_COLORS.background};
    border-radius: 8px;
    border: 2px solid ${MEKANOS_COLORS.primary};
  }
  
  .firma-box { text-align: center; padding-top: 10px; }
  
  .firma-line {
    border-bottom: 2px solid ${MEKANOS_COLORS.text};
    height: 60px;
    margin-bottom: 8px;
    background: ${MEKANOS_COLORS.white};
  }
  
  .firma-imagen {
    height: 60px;
    margin-bottom: 8px;
    background: ${MEKANOS_COLORS.white};
    border-bottom: 2px solid ${MEKANOS_COLORS.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
  }
  
  .firma-imagen img {
    max-height: 50px;
    max-width: 150px;
    object-fit: contain;
  }
  
  .firma-label {
    font-size: 10px;
    color: ${MEKANOS_COLORS.primary};
    text-transform: uppercase;
    font-weight: bold;
  }
  
  .footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 2px solid ${MEKANOS_COLORS.primary};
    text-align: center;
    font-size: 9px;
    color: ${MEKANOS_COLORS.secondary};
  }
  
  .simbologia-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    font-size: 9px;
    background: ${MEKANOS_COLORS.background};
    padding: 8px;
    border-radius: 4px;
  }
  
  .simbologia-item { display: flex; align-items: center; gap: 4px; }
  .simbologia-code { font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
`;

// ========== FUNCIÓN GENERADORA DE HTML ==========
function generarTipoAGeneradorHTML(datos) {
  // Agrupar actividades por sistema
  const grupos = {
    ENFRIAMIENTO: [], ASPIRACION: [], COMBUSTIBLE: [],
    LUBRICACION: [], ESCAPE: [], ELECTRICO: [], GENERAL: []
  };
  
  datos.actividades.forEach(act => {
    const sistema = (act.sistema || 'GENERAL').toUpperCase();
    if (grupos[sistema]) grupos[sistema].push(act);
    else grupos.GENERAL.push(act);
  });
  
  // Generar sección de actividades
  const generarSeccionActividades = (titulo, actividades) => {
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
            ${actividades.map(act => `
              <tr>
                <td>${act.descripcion}</td>
                <td style="text-align: center;">
                  <span class="resultado-badge resultado-${act.resultado || 'default'}">${act.resultado || '-'}</span>
                </td>
                <td>${act.observaciones || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };
  
  // Generar evidencias
  const generarEvidencias = (evidencias) => {
    if (!evidencias || evidencias.length === 0) {
      return `
        <div class="section">
          <div class="section-title">REGISTRO FOTOGRAFICO DEL SERVICIO</div>
          <div style="padding: 20px; text-align: center; background: #F2F2F2; border-radius: 8px;">
            No se registraron evidencias fotograficas para este servicio.
          </div>
        </div>
      `;
    }
    
    const captions = ['VISTA GENERAL DEL EQUIPO', 'DETALLE SISTEMA DE ENFRIAMIENTO', 'PANEL DE CONTROL', 'SISTEMA DE COMBUSTIBLE'];
    
    return `
      <div class="section">
        <div class="section-title">REGISTRO FOTOGRAFICO DEL SERVICIO</div>
        <div class="evidencias-grid">
          ${evidencias.map((url, idx) => `
            <div class="evidencia-item${idx === 0 ? ' evidencia-principal' : ''}">
              <img src="${url}" alt="Evidencia ${idx + 1}" />
              <div class="evidencia-caption">${captions[idx] || 'EVIDENCIA ' + (idx + 1)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };
  
  // Generar firmas
  const generarFirmas = (firmaTecnico, firmaCliente) => `
    <div class="firmas-container">
      <div class="firma-box">
        ${firmaTecnico 
          ? '<div class="firma-imagen"><img src="' + firmaTecnico + '" alt="Firma Tecnico" /></div>'
          : '<div class="firma-line"></div>'
        }
        <div class="firma-label">Firma Tecnico Asignado</div>
      </div>
      <div class="firma-box">
        ${firmaCliente 
          ? '<div class="firma-imagen"><img src="' + firmaCliente + '" alt="Firma Cliente" /></div>'
          : '<div class="firma-line"></div>'
        }
        <div class="firma-label">Firma y Sello de Quien Solicita el Servicio</div>
      </div>
    </div>
  `;
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Mantenimiento - ${datos.numeroOrden}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="logo-container">
        <svg viewBox="0 0 120 45" style="width: 100px;">
          <rect width="120" height="45" fill="${MEKANOS_COLORS.primary}" rx="5"/>
          <text x="60" y="20" fill="white" font-size="14" font-weight="bold" text-anchor="middle">MEKANOS</text>
          <text x="60" y="35" fill="${MEKANOS_COLORS.highlight}" font-size="8" text-anchor="middle">S.A.S</text>
        </svg>
      </div>
      <div class="header-title">
        <h1>MANTENIMIENTO PREVENTIVO TIPO A</h1>
        <h2>EQUIPOS GENERADORES ELECTRICOS</h2>
      </div>
      <div class="header-order">
        <div class="order-number">${datos.numeroOrden}</div>
      </div>
    </div>
    
    <!-- DATOS DEL CLIENTE Y SERVICIO -->
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
          <span class="info-label">N de Serie</span>
          <span class="info-value">${datos.serieEquipo}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Direccion</span>
          <span class="info-value">${datos.direccion}</span>
        </div>
      </div>
      <div class="info-grid info-grid-4" style="margin-top: 8px;">
        <div class="info-item">
          <span class="info-label">Fecha</span>
          <span class="info-value">${datos.fecha}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tecnico</span>
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
    
    <!-- ACTIVIDADES POR SISTEMA -->
    ${generarSeccionActividades('SISTEMA DE ENFRIAMIENTO', grupos.ENFRIAMIENTO)}
    ${generarSeccionActividades('SISTEMA DE ASPIRACION', grupos.ASPIRACION)}
    ${generarSeccionActividades('SISTEMA DE COMBUSTIBLE', grupos.COMBUSTIBLE)}
    ${generarSeccionActividades('SISTEMA DE LUBRICACION', grupos.LUBRICACION)}
    ${generarSeccionActividades('SISTEMA DE ESCAPE', grupos.ESCAPE)}
    ${generarSeccionActividades('SISTEMA ELECTRICO DEL MOTOR', grupos.ELECTRICO)}
    
    <!-- REGISTRO DE DATOS DEL MODULO DE CONTROL -->
    <div class="section">
      <div class="section-subtitle">REGISTRO DE DATOS DEL MODULO DE CONTROL</div>
      <div class="mediciones-grid">
        <div class="medicion-item">
          <div class="medicion-label">Velocidad Motor</div>
          <div class="medicion-value">${datos.datosModulo?.rpm || '-'} RPM</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Presion Aceite</div>
          <div class="medicion-value">${datos.datosModulo?.presionAceite || '-'} PSI</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Temp. Refrigerante</div>
          <div class="medicion-value">${datos.datosModulo?.temperaturaRefrigerante || '-'} C</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Carga Bateria</div>
          <div class="medicion-value">${datos.datosModulo?.cargaBateria || '-'} V</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Horas Trabajo</div>
          <div class="medicion-value">${datos.datosModulo?.horasTrabajo || '-'} Hrs</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Voltaje Generador</div>
          <div class="medicion-value">${datos.datosModulo?.voltaje || '-'} V</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Frecuencia</div>
          <div class="medicion-value">${datos.datosModulo?.frecuencia || '-'} Hz</div>
        </div>
        <div class="medicion-item">
          <div class="medicion-label">Corriente</div>
          <div class="medicion-value">${datos.datosModulo?.corriente || '-'} A</div>
        </div>
      </div>
    </div>
    
    <!-- GENERAL -->
    ${generarSeccionActividades('GENERAL', grupos.GENERAL)}
    
    <!-- SIMBOLOGIA -->
    <div class="section">
      <div class="section-title">SIMBOLOGIA</div>
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
  </div>
  
  <div class="page page-break">
    <!-- EVIDENCIAS FOTOGRAFICAS -->
    ${generarEvidencias(datos.evidencias)}
    
    <!-- OBSERVACIONES -->
    <div class="section">
      <div class="section-title">OBSERVACIONES</div>
      <div class="observaciones-box">${datos.observaciones || 'Sin observaciones adicionales.'}</div>
    </div>
    
    <!-- FIRMAS -->
    ${generarFirmas(datos.firmaTecnico, datos.firmaCliente)}
    
    <!-- FOOTER -->
    <div class="footer">
      <strong>MEKANOS S.A.S</strong><br/>
      BARRIO LIBANO CRA 49C #31-35 DIAG. AL SENA - TEL: 6359384<br/>
      CEL: 315-7083350 E-MAIL: mekanossas2@gmail.com
    </div>
  </div>
</body>
</html>
`;
}

// Datos de prueba completos siguiendo FORMATO_TIPO_A_GENERADORES.MD
const datosPrueba = {
  // Datos del cliente
  cliente: 'EMPRESA TEST S.A.S',
  direccion: 'Calle 50 #45-67, Zona Industrial, Cartagena',
  sede: 'Sede Principal',
  
  // Datos del equipo
  marcaEquipo: 'CATERPILLAR',
  serieEquipo: '3516B-HD',
  tipoEquipo: 'GENERADOR',
  
  // Datos del servicio
  fecha: '27/11/2025',
  tecnico: 'Carlos Martínez',
  horaEntrada: '08:00',
  horaSalida: '12:30',
  tipoServicio: 'PREVENTIVO_A',
  
  // Número de orden
  numeroOrden: 'OS-2025-TEST-001',
  
  // Datos del módulo de control
  datosModulo: {
    rpm: 1800,
    presionAceite: 65,
    temperaturaRefrigerante: 85,
    cargaBateria: 27.5,
    horasTrabajo: 4520,
    voltaje: 480,
    frecuencia: 60,
    corriente: 125
  },
  
  // Actividades ejecutadas por sistema
  actividades: [
    // SISTEMA DE ENFRIAMIENTO
    { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar tapa de radiador', resultado: 'B', observaciones: '' },
    { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar nivel de refrigerante y su estado', resultado: 'B', observaciones: 'Nivel óptimo' },
    { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar fugas en mangueras, abrazaderas, tuberías, radiador', resultado: 'B', observaciones: '' },
    { sistema: 'ENFRIAMIENTO', descripcion: 'Inspeccionar aspas del ventilador, guardas y soportes', resultado: 'B', observaciones: '' },
    { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar panal del radiador, limpieza y condición', resultado: 'LI', observaciones: 'Se realizó limpieza' },
    { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar estado y tensión de las correas', resultado: 'B', observaciones: '' },
    { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar y lubricar rodamientos del ventilador y poleas', resultado: 'L', observaciones: '' },
    
    // SISTEMA DE ASPIRACIÓN
    { sistema: 'ASPIRACION', descripcion: 'Revisar estado de los filtros de aire', resultado: 'C', observaciones: 'Se reemplazaron' },
    { sistema: 'ASPIRACION', descripcion: 'Apretar abrazaderas, tuberías y mangueras de admisión', resultado: 'A', observaciones: '' },
    { sistema: 'ASPIRACION', descripcion: 'Inspección de turbocargador, álabes y rotación libre', resultado: 'B', observaciones: '' },
    
    // SISTEMA DE COMBUSTIBLE
    { sistema: 'COMBUSTIBLE', descripcion: 'Revisar mangueras, tuberías y abrazaderas', resultado: 'B', observaciones: '' },
    { sistema: 'COMBUSTIBLE', descripcion: 'Inspeccionar sistema riel común, fugas, acoples', resultado: 'B', observaciones: '' },
    { sistema: 'COMBUSTIBLE', descripcion: 'Revisar operación de bomba de transferencia', resultado: 'B', observaciones: '' },
    { sistema: 'COMBUSTIBLE', descripcion: 'Inspección de filtros, trampas separadoras, drenar', resultado: 'C', observaciones: 'Filtros reemplazados' },
    { sistema: 'COMBUSTIBLE', descripcion: 'Inspeccionar y lubricar actuadores/solenoides', resultado: 'L', observaciones: '' },
    { sistema: 'COMBUSTIBLE', descripcion: 'Revisar nivel de combustible', resultado: 'F', observaciones: 'Tanque lleno' },
    { sistema: 'COMBUSTIBLE', descripcion: 'Revisar tanque de combustible', resultado: 'B', observaciones: '' },
    
    // SISTEMA DE LUBRICACIÓN
    { sistema: 'LUBRICACION', descripcion: 'Revisar nivel de aceite', resultado: 'B', observaciones: '' },
    { sistema: 'LUBRICACION', descripcion: 'Inspección por fugas', resultado: 'B', observaciones: '' },
    
    // SISTEMA DE ESCAPE
    { sistema: 'ESCAPE', descripcion: 'Inspección visual a tubos de escape y conexiones', resultado: 'B', observaciones: '' },
    { sistema: 'ESCAPE', descripcion: 'Revisar condición externa del turbocargador', resultado: 'B', observaciones: '' },
    
    // SISTEMA ELÉCTRICO
    { sistema: 'ELECTRICO', descripcion: 'Revisar estado del cableado y conexiones', resultado: 'B', observaciones: '' },
    { sistema: 'ELECTRICO', descripcion: 'Revisar amarres y puntos de sujeción', resultado: 'B', observaciones: '' },
    { sistema: 'ELECTRICO', descripcion: 'Revisar cargador de batería', resultado: 'B', observaciones: '' },
    { sistema: 'ELECTRICO', descripcion: 'Revisar electrolitos de batería', resultado: 'RN', observaciones: 'Se rellenó' },
    { sistema: 'ELECTRICO', descripcion: 'Revisar sistema de carga de baterías', resultado: 'B', observaciones: '' },
    { sistema: 'ELECTRICO', descripcion: 'Revisar voltaje de alternador', resultado: 'B', observaciones: '28V' },
    { sistema: 'ELECTRICO', descripcion: 'Limpieza y ajuste de bornes', resultado: 'LI', observaciones: '' },
    
    // GENERAL
    { sistema: 'GENERAL', descripcion: 'El equipo requiere pintura', resultado: 'M', observaciones: 'NO' },
    { sistema: 'GENERAL', descripcion: 'El equipo cuenta con cargador de batería', resultado: 'B', observaciones: 'SÍ' },
    { sistema: 'GENERAL', descripcion: 'El cuarto de máquinas cuenta con bomba de trasiego', resultado: 'B', observaciones: 'SÍ' },
    { sistema: 'GENERAL', descripcion: 'El cuarto de máquinas se encuentra aseado y ordenado', resultado: 'B', observaciones: 'SÍ' },
    { sistema: 'GENERAL', descripcion: 'El cuarto de máquinas cuenta con buena iluminación', resultado: 'B', observaciones: 'SÍ' },
  ],
  
  // Mediciones técnicas
  mediciones: [
    { parametro: 'Voltaje L1-L2', valor: 480, unidad: 'V', nivelAlerta: 'OK' },
    { parametro: 'Voltaje L2-L3', valor: 478, unidad: 'V', nivelAlerta: 'OK' },
    { parametro: 'Voltaje L3-L1', valor: 481, unidad: 'V', nivelAlerta: 'OK' },
    { parametro: 'Frecuencia', valor: 60.1, unidad: 'Hz', nivelAlerta: 'OK' },
    { parametro: 'Corriente L1', valor: 125, unidad: 'A', nivelAlerta: 'OK' },
    { parametro: 'Corriente L2', valor: 123, unidad: 'A', nivelAlerta: 'OK' },
    { parametro: 'Corriente L3', valor: 126, unidad: 'A', nivelAlerta: 'OK' },
    { parametro: 'Potencia Activa', valor: 98.5, unidad: 'kW', nivelAlerta: 'OK' },
  ],
  
  // Evidencias fotográficas - Se llenarán dinámicamente
  evidencias: [],
  
  // Observaciones
  observaciones: `Mantenimiento preventivo Tipo A realizado exitosamente. 
El equipo se encuentra en óptimas condiciones de operación. 
Se recomienda próximo mantenimiento en 250 horas de trabajo.
Se realizó cambio de filtros de aire y combustible según programación.
Próxima revisión programada: Enero 2026.`,
  
  // Firmas
  firmaTecnico: null,
  firmaCliente: null
};

async function ejecutarTest() {
  console.log('='.repeat(60));
  console.log('   TEST ATOMICO - PDF ENTERPRISE TIPO A GENERADOR');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // PASO 1: Cargar imagen de prueba
    console.log('[PASO 1] Cargando imagen de prueba...');
    const imagenPath = 'C:\\Users\\Usuario\\Downloads\\mekanosApp\\BASE DE DATOS\\MEKANOS_DB\\REFACTORIZATION\\PRUEBA_PARA_TEST_E2E_FASE3Y4.jpg';
    
    console.log('   Buscando en:', imagenPath);
    
    if (!fs.existsSync(imagenPath)) {
      console.log('   [!] Imagen no encontrada, usando placeholder...');
      datosPrueba.evidencias = [
        'https://via.placeholder.com/800x600/244673/FFFFFF?text=VISTA+GENERAL+EQUIPO',
        'https://via.placeholder.com/800x600/3290A6/FFFFFF?text=SISTEMA+ENFRIAMIENTO',
      ];
    } else {
      const imagenBuffer = fs.readFileSync(imagenPath);
      const imagenBase64 = 'data:image/jpeg;base64,' + imagenBuffer.toString('base64');
      console.log('   [OK] Imagen cargada: ' + (imagenBuffer.length / 1024).toFixed(2) + ' KB');
      
      datosPrueba.evidencias = [imagenBase64, imagenBase64];
    }
    
    // PASO 2: Crear firmas simuladas
    console.log('');
    console.log('[PASO 2] Generando firmas simuladas...');
    
    const firmaTecnicoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="35" font-family="cursive" font-size="24" fill="#244673">Carlos Martinez</text></svg>';
    const firmaClienteSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="35" font-family="cursive" font-size="24" fill="#244673">Juan Perez</text></svg>';
    
    datosPrueba.firmaTecnico = 'data:image/svg+xml;base64,' + Buffer.from(firmaTecnicoSvg).toString('base64');
    datosPrueba.firmaCliente = 'data:image/svg+xml;base64,' + Buffer.from(firmaClienteSvg).toString('base64');
    console.log('   [OK] Firmas generadas');
    
    // PASO 3: Generar HTML
    console.log('');
    console.log('[PASO 3] Generando HTML con template...');
    const html = generarTipoAGeneradorHTML(datosPrueba);
    
    const htmlPath = path.join(__dirname, 'test-pdf-enterprise.html');
    fs.writeFileSync(htmlPath, html);
    console.log('   [OK] HTML guardado: ' + htmlPath);
    
    // PASO 4: Generar PDF
    console.log('');
    console.log('[PASO 4] Generando PDF con Puppeteer...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Esperar para que las imágenes base64 carguen
    await new Promise(r => setTimeout(r, 2000));
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    
    await browser.close();
    
    const pdfPath = path.join(__dirname, 'test-pdf-enterprise.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log('   [OK] PDF generado: ' + pdfPath);
    console.log('   [OK] Tamano: ' + (pdfBuffer.length / 1024).toFixed(2) + ' KB');
    
    // RESULTADO
    console.log('');
    console.log('='.repeat(60));
    console.log('   [OK] TEST COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('');
    console.log('Archivos generados:');
    console.log('   HTML: ' + htmlPath);
    console.log('   PDF:  ' + pdfPath);
    console.log('');
    console.log('Por favor, abre el PDF para verificar:');
    console.log('   1. Estetica y diseno profesional');
    console.log('   2. Colores MEKANOS correctos');
    console.log('   3. Evidencias fotograficas visibles');
    console.log('   4. Firmas digitales renderizadas');
    console.log('   5. Todas las secciones del formato Tipo A');
    
    return { success: true, pdfPath, htmlPath };
    
  } catch (error) {
    console.error('');
    console.error('[ERROR] ' + error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Ejecutar
ejecutarTest().then(result => {
  if (result.success) {
    console.log('');
    console.log('[FIN] El PDF esta listo para revision.');
    process.exit(0);
  } else {
    console.log('');
    console.log('[FIN] El test fallo. Revisa los errores.');
    process.exit(1);
  }
});
