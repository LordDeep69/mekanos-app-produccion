/**
 * MEKANOS PDF Templates - Paleta de Colores Oficial
 *
 * #F2F2F2 - Blanco (fondo)
 * #244673 - Azul Oscuro (encabezados)
 * #3290A6 - Azul Claro (acentos)
 * #56A672 - Verde (estados OK)
 * #9EC23D - Verde Claro (destacados)
 */

import * as fs from 'fs';
import * as path from 'path';

export const MEKANOS_COLORS = {
  background: '#F2F2F2',
  primary: '#244673', // Azul oscuro - encabezados
  secondary: '#3290A6', // Azul claro - acentos
  success: '#56A672', // Verde - estados OK
  highlight: '#9EC23D', // Verde claro - destacados
  white: '#FFFFFF',
  text: '#333333',
  border: '#CCCCCC',
  warning: '#F59E0B',
  danger: '#DC2626',
};

/**
 * ✅ LOGO MEKANOS OFICIAL - PNG embebido en base64
 * Logo original de MEKANOS S.A.S embebido directamente en el PDF
 * No depende de URLs externas - garantiza renderizado perfecto
 */

const getLogoBase64 = (): string => {
  try {
    // En producción compilada con webpack, todo está en dist/main.js
    // Los assets se copian a dist/pdf/assets/
    const possiblePaths = [
      // ✅ Rutas correctas para nest build con webpack (assets copiados a dist/pdf/assets/)
      path.join(process.cwd(), 'dist/pdf/assets/logo-mekanos.png'),           // desde api cwd
      path.join(process.cwd(), 'apps/api/dist/pdf/assets/logo-mekanos.png'),  // desde monorepo root
      // Fallback a rutas antiguas por compatibilidad
      path.join(__dirname, 'assets/logo-mekanos.png'),
      path.join(__dirname, '../assets/logo-mekanos.png'),
      path.join(__dirname, '../../assets/logo-mekanos.png'),
      path.join(process.cwd(), 'apps/api/dist/assets/logo-mekanos.png'),
      path.join(process.cwd(), 'dist/assets/logo-mekanos.png'),
    ];

    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        console.log(`[PDF] ✅ Logo encontrado en: ${logoPath}`);
        const logoBuffer = fs.readFileSync(logoPath);
        return logoBuffer.toString('base64');
      }
    }

    console.error('[PDF] ❌ Logo no encontrado en ninguna ruta:', possiblePaths);
    return '';
  } catch (error) {
    console.error('[PDF] Error cargando logo:', error);
    return '';
  }
};

/**
 * ✅ Genera header profesional con logo MEKANOS OFICIAL para todos los PDFs
 */
export const generarHeaderConLogo = (
  titulo: string,
  subtitulo: string,
  numeroOrden: string,
): string => {
  const logoBase64 = getLogoBase64();
  return `
  <div class="header">
    <div class="logo-container">
      <img src="data:image/png;base64,${logoBase64}" alt="MEKANOS S.A.S" style="height: 50px; width: auto;" />
    </div>
    <div class="header-title">
      <h1>${titulo}</h1>
      <h2>${subtitulo}</h2>
    </div>
    <div class="header-order">
      <div class="order-number">${numeroOrden}</div>
    </div>
  </div>
`;
};

export interface DatosOrdenPDF {
  // Datos del cliente
  cliente: string;
  direccion: string;
  sede?: string;

  // Datos del equipo
  marcaEquipo: string;
  serieEquipo: string;
  tipoEquipo: 'GENERADOR' | 'BOMBA' | 'MOTOR';

  // Datos del servicio
  fecha: string;
  tecnico: string;
  horaEntrada: string;
  horaSalida: string;
  tipoServicio: 'PREVENTIVO_A' | 'PREVENTIVO_B' | 'CORRECTIVO';

  // Número de orden
  numeroOrden: string;

  // Datos del módulo de control (para generadores)
  datosModulo?: {
    rpm?: number;
    presionAceite?: number;
    temperaturaRefrigerante?: number;
    cargaBateria?: number;
    horasTrabajo?: number;
    voltaje?: number;
    frecuencia?: number;
    corriente?: number;
  };

  // Actividades ejecutadas
  actividades: ActividadPDF[];

  // Mediciones
  mediciones: MedicionPDF[];

  // Evidencias fotográficas - soporta strings simples o objetos con caption
  evidencias: string[] | EvidenciaPDF[];

  // Observaciones
  observaciones: string;

  // Firmas
  firmaTecnico?: string;
  firmaCliente?: string;

  // ✅ FIX 05-ENE-2026: Datos del firmante para mostrar nombre/cargo bajo la firma
  nombreTecnico?: string;
  cargoTecnico?: string;
  nombreCliente?: string;
  cargoCliente?: string;

  // ✅ Campos adicionales para correctivos (opcional)
  diagnostico?: {
    descripcion: string;
    causaRaiz: string;
    sistemasAfectados?: string[];
  };
  problemaReportado?: {
    descripcion: string;
    fechaReporte: string;
  };

  // ✅ MULTI-EQUIPOS: Equipos de la orden (opcional)
  // Si existe, las evidencias se agrupan por equipo
  equiposOrden?: EquipoOrdenPDF[];

  // ✅ MULTI-EQUIPOS: Evidencias agrupadas por equipo (alternativa)
  evidenciasPorEquipo?: EvidenciasPorEquipoPDF[];

  // ✅ MULTI-EQUIPOS (15-DIC-2025): Actividades agrupadas por equipo
  actividadesPorEquipo?: ActividadesPorEquipoPDF[];

  // ✅ MULTI-EQUIPOS (15-DIC-2025): Mediciones agrupadas por equipo
  medicionesPorEquipo?: MedicionesPorEquipoPDF[];

  // ✅ MULTI-EQUIPOS (15-DIC-2025): Flag para detectar si es orden multi-equipo
  esMultiEquipo?: boolean;

  // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Unidades personalizadas por equipo
  // Si no se proporciona, usa unidades por defecto (°C, PSI, V, Hz, etc.)
  configUnidades?: {
    temperatura?: string;  // °C, °F, K
    presion?: string;      // PSI, bar, kPa, atm
    voltaje?: string;      // V
    frecuencia?: string;   // Hz
    corriente?: string;    // A
    velocidad?: string;    // RPM
    vibracion?: string;    // mm/s
  };
}

// ✅ MULTI-EQUIPOS: Datos de un equipo en la orden
export interface EquipoOrdenPDF {
  idOrdenEquipo: number;
  ordenSecuencia: number;
  nombreSistema?: string;
  codigoEquipo?: string;
  nombreEquipo?: string;
  estado: string;
}

// ✅ MULTI-EQUIPOS: Evidencias agrupadas por equipo
export interface EvidenciasPorEquipoPDF {
  equipo: EquipoOrdenPDF;
  evidencias: EvidenciaPDF[];
}

// ✅ MULTI-EQUIPOS (15-DIC-2025): Actividades agrupadas por equipo
export interface ActividadesPorEquipoPDF {
  equipo: EquipoOrdenPDF;
  actividades: ActividadPDF[];
}

// ✅ MULTI-EQUIPOS (15-DIC-2025): Mediciones agrupadas por equipo
export interface MedicionesPorEquipoPDF {
  equipo: EquipoOrdenPDF;
  mediciones: MedicionPDF[];
}

// Evidencia fotográfica con caption opcional
export interface EvidenciaPDF {
  url: string;
  caption?: string;
  // ✅ MULTI-EQUIPOS: ID del equipo al que pertenece (opcional)
  idOrdenEquipo?: number;
}

export interface ActividadPDF {
  sistema: string;
  descripcion: string;
  resultado:
  | 'B'
  | 'R'
  | 'M'
  | 'I'
  | 'C'
  | 'LI'
  | 'A'
  | 'L'
  | 'NA'
  | 'LA'
  | 'S'
  | 'NT'
  | 'BA'
  | 'F'
  | 'RN'
  | 'NF';
  observaciones?: string;
}

export interface MedicionPDF {
  parametro: string;
  valor: number;
  unidad: string;
  nivelAlerta: 'OK' | 'ADVERTENCIA' | 'CRITICO';
}

export const getResultadoLabel = (resultado: string): string => {
  const labels: Record<string, string> = {
    B: 'Bueno',
    R: 'Regular',
    M: 'Malo',
    I: 'Inspeccionar',
    C: 'Cambiado',
    LI: 'Limpiar',
    A: 'Ajustar',
    L: 'Lubricar',
    NA: 'No Aplica',
    LA: 'Lavar',
    S: 'Sucio',
    NT: 'No Tiene',
    BA: 'Bajo',
    F: 'Lleno',
    RN: 'Rellenar Nivel',
    NF: 'No Funciona',
  };
  return labels[resultado] || resultado;
};

export const getResultadoColor = (resultado: string): string => {
  const colors: Record<string, string> = {
    B: MEKANOS_COLORS.success,
    R: MEKANOS_COLORS.warning,
    M: MEKANOS_COLORS.danger,
    NF: MEKANOS_COLORS.danger,
    C: MEKANOS_COLORS.warning,
    NA: MEKANOS_COLORS.border,
  };
  return colors[resultado] || MEKANOS_COLORS.text;
};

export const getAlertaColor = (nivel: string): string => {
  switch (nivel) {
    case 'OK':
      return MEKANOS_COLORS.success;
    case 'ADVERTENCIA':
      return MEKANOS_COLORS.warning;
    case 'CRITICO':
      return MEKANOS_COLORS.danger;
    default:
      return MEKANOS_COLORS.text;
  }
};

export const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: ${MEKANOS_COLORS.text};
    background: ${MEKANOS_COLORS.white};
    -webkit-font-smoothing: antialiased;
  }
  
  .page {
    width: 210mm;
    padding: 15mm;
    margin: 0 auto;
    background: ${MEKANOS_COLORS.white};
  }
  
  @page {
    size: A4;
    margin: 0;
  }
  
  @media print {
    .page {
      margin: 0;
      border: none;
      box-shadow: none;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    .page-break-auto {
      page-break-before: auto;
    }
  }
  
  /* ✅ FIX MEJORADO: Reglas de saltos de página inteligentes */
  
  /* Las secciones grandes (checklist) PUEDEN romperse entre páginas */
  .section {
    page-break-inside: auto;
    break-inside: auto;
  }
  
  /* Secciones pequeñas que NO deben romperse */
  .observaciones-box,
  .firmas-container,
  .simbologia-grid,
  .mediciones-grid,
  .info-grid {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Las filas individuales de tabla NO deben cortarse */
  .checklist-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Los títulos de sección deben quedarse con su contenido */
  .section-title,
  .section-subtitle {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  /* Evitar que el header de tabla quede solo al final de página */
  .checklist-table thead {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  /* Permitir que evidencias-grupo se rompa si es necesario */
  .evidencias-grupo {
    page-break-inside: auto;
    break-inside: auto;
  }
  
  /* Pero no romper filas individuales de evidencias */
  .evidencia-item,
  .evidencia-item-compacto {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 10px;
    border-bottom: 3px solid ${MEKANOS_COLORS.primary};
    margin-bottom: 15px;
  }
  
  .logo-container {
    flex: 0 0 120px;
  }
  
  .logo {
    width: 100px;
    height: auto;
  }
  
  .header-title {
    flex: 1;
    text-align: center;
  }
  
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
  
  .header-order {
    flex: 0 0 120px;
    text-align: right;
  }
  
  .order-number {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 8px 12px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 10px;
  }
  
  .section {
    margin-bottom: 15px;
  }
  
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
  
  .info-grid-4 {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .info-item {
    display: flex;
    flex-direction: column;
  }
  
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
    table-layout: fixed;
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
  
  .checklist-table tr:nth-child(even) {
    background: ${MEKANOS_COLORS.background};
  }
  
  /* ✅ FIX 29-ENE-2026: Estilos mejorados para columna de Observaciones - WRAP correcto */
  .checklist-table td:last-child {
    font-size: 9px;
    color: ${MEKANOS_COLORS.secondary};
    font-style: italic;
    max-width: 120px;
    width: 15%;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    vertical-align: top;
  }
  
  /* Columna de resultado (centrada con badge) */
  .checklist-table td:nth-child(2) {
    text-align: center;
    padding: 4px;
  }
  
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
  .resultado-NF { background: ${MEKANOS_COLORS.danger}; color: white; }
  .resultado-NA { background: ${MEKANOS_COLORS.border}; color: ${MEKANOS_COLORS.text}; }
  .resultado-C { background: ${MEKANOS_COLORS.warning}; color: white; }
  .resultado-SI { background: ${MEKANOS_COLORS.success}; color: white; }
  .resultado-NO { background: ${MEKANOS_COLORS.danger}; color: white; }
  .resultado-default { background: ${MEKANOS_COLORS.secondary}; color: white; }
  
  /* ✅ FIX 29-ENE-2026: Estilo mejorado para observaciones de actividades - WRAP correcto */
  .observacion-actividad {
    display: block;
    font-size: 8px;
    color: ${MEKANOS_COLORS.secondary};
    font-style: italic;
    background: ${MEKANOS_COLORS.background};
    padding: 2px 6px;
    border-radius: 3px;
    border-left: 2px solid ${MEKANOS_COLORS.primary};
    max-width: 100%;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    line-height: 1.3;
  }
  
  .observacion-actividad:empty {
    display: none;
  }
  
  .alerta-OK { color: ${MEKANOS_COLORS.success}; }
  .alerta-ADVERTENCIA { color: ${MEKANOS_COLORS.warning}; }
  .alerta-CRITICO { color: ${MEKANOS_COLORS.danger}; font-weight: bold; }
  
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
  
  .evidencias-empty {
    background: ${MEKANOS_COLORS.background};
    padding: 20px;
    text-align: center;
    border-radius: 8px;
    border: 2px dashed ${MEKANOS_COLORS.border};
    color: ${MEKANOS_COLORS.secondary};
    font-style: italic;
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
    height: 180px;
    object-fit: contain;
    display: block;
    background: #f0f4f8;
  }
  
  .evidencia-caption {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 6px 10px;
    font-size: 9px;
    text-align: center;
    font-weight: bold;
  }
  
  .evidencia-principal {
    grid-column: span 2;
  }
  
  .evidencia-principal img {
    height: 200px;
  }
  
  .observaciones-box {
    background: ${MEKANOS_COLORS.background};
    padding: 10px;
    border-radius: 4px;
    min-height: 60px;
    border-left: 3px solid ${MEKANOS_COLORS.secondary};
  }
  
  /* ✅ FIX: Sección de Firmas - Más grande y profesional */
  .firmas-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
    margin-top: 20px;
    padding: 20px;
    background: ${MEKANOS_COLORS.white};
    border-radius: 8px;
    border: 2px solid ${MEKANOS_COLORS.primary};
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .firma-box {
    text-align: center;
    padding: 15px;
    background: ${MEKANOS_COLORS.background};
    border-radius: 6px;
  }
  
  .firma-line {
    border-bottom: 2px solid ${MEKANOS_COLORS.text};
    height: 70px;
    margin-bottom: 10px;
    background: ${MEKANOS_COLORS.white};
    border-radius: 4px;
  }
  
  .firma-imagen {
    height: 70px;
    margin-bottom: 10px;
    background: ${MEKANOS_COLORS.white};
    border-bottom: 2px solid ${MEKANOS_COLORS.primary};
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  
  .firma-imagen img, .firma-img {
    max-height: 60px;
    max-width: 180px;
    object-fit: contain;
  }
  
  .firma-nombre {
    font-size: 12px;
    font-weight: bold;
    color: ${MEKANOS_COLORS.text};
    margin-top: 8px;
  }
  
  .firma-cargo {
    font-size: 10px;
    color: ${MEKANOS_COLORS.secondary};
    margin-top: 2px;
  }
  
  .firma-label {
    font-size: 9px;
    color: ${MEKANOS_COLORS.primary};
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 8px;
    padding-top: 5px;
    border-top: 1px solid ${MEKANOS_COLORS.border};
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
  
  .simbologia-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .simbologia-code {
    font-weight: bold;
    color: ${MEKANOS_COLORS.primary};
  }

  /* ═══════════════════════════════════════════════════════════════
     ✅ FIX 03-FEB-2026: BADGES DE ESTADO ENTERPRISE (Correctivo)
     ═══════════════════════════════════════════════════════════════ */
  
  .estado-transicion {
    background: linear-gradient(135deg, ${MEKANOS_COLORS.background} 0%, #e8f4f8 100%);
    border: 2px solid ${MEKANOS_COLORS.secondary};
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
  }
  
  .estado-label {
    font-size: 9px;
    font-weight: bold;
    color: ${MEKANOS_COLORS.secondary};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  
  .estado-badges {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .estado-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .estado-inicial {
    background: linear-gradient(135deg, #fff3cd 0%, #ffc107 100%);
    color: #856404;
    border: 1px solid #ffc107;
  }
  
  .estado-final {
    background: linear-gradient(135deg, #d4edda 0%, ${MEKANOS_COLORS.success} 100%);
    color: #155724;
    border: 1px solid ${MEKANOS_COLORS.success};
  }
  
  .estado-arrow {
    font-size: 18px;
    font-weight: bold;
    color: ${MEKANOS_COLORS.primary};
  }
  
  /* ═══════════════════════════════════════════════════════════════
     EVIDENCIAS AGRUPADAS POR TIPO
     ═══════════════════════════════════════════════════════════════ */
  
  .evidencias-section {
    page-break-inside: auto;
    break-inside: auto;
  }
  
  .evidencias-grupo {
    margin-bottom: 15px;
    border: 1px solid ${MEKANOS_COLORS.border};
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: auto;
    break-inside: auto;
  }
  
  .evidencias-grupo-titulo {
    background: ${MEKANOS_COLORS.primary};
    color: ${MEKANOS_COLORS.white};
    padding: 8px 12px;
    font-size: 11px;
    font-weight: bold;
  }
  
  /* ✅ FIX: Estilo diferenciador para Fotos Generales del Servicio */
  .evidencias-grupo-general {
    border: 2px solid #0d9488;
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
  }
  
  .evidencias-grupo-general .evidencias-grupo-titulo {
    background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
    font-size: 12px;
    letter-spacing: 0.5px;
  }
  
  .evidencias-grupo-general .evidencia-caption-compacto {
    background: #0d9488;
  }
  
  .evidencias-grid-compacto {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px;
    background: ${MEKANOS_COLORS.background};
  }
  
  .evidencia-item-compacto {
    border-radius: 6px;
    overflow: hidden;
    background: ${MEKANOS_COLORS.white};
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  
  .evidencia-item-compacto img {
    width: 100%;
    height: 160px;
    object-fit: contain;
    display: block;
    background: #f0f4f8;
  }
  
  .evidencia-caption-compacto {
    background: ${MEKANOS_COLORS.secondary};
    color: ${MEKANOS_COLORS.white};
    padding: 4px 6px;
    font-size: 8px;
    text-align: center;
    line-height: 1.2;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .evidencias-empty {
    padding: 20px;
    text-align: center;
    color: ${MEKANOS_COLORS.text};
    font-style: italic;
  }

  /* ═══════════════════════════════════════════════════════════════
     MULTI-EQUIPOS: Estilos para tablas dinámicas
     ✅ FIX 14-FEB-2026: Responsive para 2-10+ equipos
     ═══════════════════════════════════════════════════════════════ */

  /* Landscape automático para muchos equipos */
  .multiequipo-landscape {
    /* Puppeteer usa @page para orientación, pero esta clase marca la intención */
  }

  .checklist-multiequipo {
    table-layout: fixed;
    width: 100%;
    font-size: 8px;
  }

  .checklist-multiequipo th.equipo-col {
    background: ${MEKANOS_COLORS.secondary};
    text-align: center;
    font-size: 7px;
    padding: 3px 1px;
    word-wrap: break-word;
    overflow: hidden;
    line-height: 1.1;
  }
  
  .checklist-multiequipo td.equipo-cell {
    text-align: center;
    padding: 2px 1px;
  }
  
  .checklist-multiequipo .resultado-mini {
    display: inline-block;
    padding: 1px 3px;
    border-radius: 2px;
    font-weight: bold;
    font-size: 7px;
    min-width: 16px;
  }

  /* Columna de observaciones multi-equipo */
  .obs-multiequipo {
    font-size: 7px;
    line-height: 1.2;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .obs-multiequipo .obs-eq-tag {
    font-weight: bold;
    color: ${MEKANOS_COLORS.primary};
    font-size: 6px;
  }
  .obs-multiequipo .obs-eq-line {
    margin-bottom: 1px;
  }

  .mediciones-multiequipo {
    table-layout: fixed;
    width: 100%;
  }

  .mediciones-multiequipo th.equipo-col {
    background: ${MEKANOS_COLORS.secondary};
    text-align: center;
    font-size: 7px;
    padding: 3px 1px;
    word-wrap: break-word;
    overflow: hidden;
    line-height: 1.1;
  }
  
  .mediciones-multiequipo td.equipo-cell {
    text-align: center;
    padding: 2px 2px;
    font-weight: bold;
    font-size: 8px;
  }
  
  .medicion-valor-multiequipo {
    font-size: 9px;
    font-weight: bold;
    padding: 1px 3px;
    border-radius: 3px;
    background: ${MEKANOS_COLORS.background};
  }
  
  .medicion-valor-ok { color: ${MEKANOS_COLORS.success}; }
  .medicion-valor-warning { color: ${MEKANOS_COLORS.warning}; }
  .medicion-valor-critico { color: ${MEKANOS_COLORS.danger}; font-weight: bold; }

  /* ═══════════════════════════════════════════════════════════════
     OBSERVACIONES PROFESIONALES: Tarjetas estructuradas (02-FEB-2026)
     ═══════════════════════════════════════════════════════════════ */
  
  .obs-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .obs-card {
    border: 1px solid ${MEKANOS_COLORS.border};
    border-radius: 8px;
    overflow: hidden;
    background: ${MEKANOS_COLORS.white};
    page-break-inside: avoid;
  }
  
  .obs-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-weight: bold;
    font-size: 10px;
  }
  
  .obs-icon {
    font-size: 14px;
  }
  
  .obs-card-title {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .obs-card-content {
    padding: 10px 12px;
    font-size: 10px;
    line-height: 1.5;
    background: ${MEKANOS_COLORS.background};
  }
  
  .obs-item {
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 1px dashed ${MEKANOS_COLORS.border};
  }
  
  .obs-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  
  /* Tarjeta Problema - Rojo/Naranja */
  .obs-problema .obs-card-header {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    color: #991b1b;
    border-bottom: 2px solid #fca5a5;
  }
  
  /* Tarjeta Diagnóstico - Azul */
  .obs-diagnostico .obs-card-header {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1e40af;
    border-bottom: 2px solid #93c5fd;
  }
  
  /* Tarjeta General/Detalle - Verde */
  .obs-general .obs-card-header {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    color: #166534;
    border-bottom: 2px solid #86efac;
  }
  
  .obs-detalle {
    white-space: pre-wrap;
  }
  
  /* Tarjeta Recomendaciones - Amarillo */
  .obs-recomendaciones .obs-card-header {
    background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
    color: #854d0e;
    border-bottom: 2px solid #fde047;
  }
  
  .obs-list {
    margin: 0;
    padding-left: 20px;
  }
  
  .obs-list li {
    margin-bottom: 4px;
  }
  
  .obs-empty {
    padding: 20px;
    text-align: center;
    color: ${MEKANOS_COLORS.text};
    font-style: italic;
    background: ${MEKANOS_COLORS.background};
    border-radius: 8px;
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-EQUIPOS: Funciones para generar checklist/mediciones dinámicas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ✅ MULTI-EQUIPOS: Genera tabla de checklist con columnas dinámicas por equipo
 * ✅ FIX 14-FEB-2026: Responsive para 2-10+ equipos con sizing adaptativo
 *
 * Estructura:
 * | # | Sistema | Actividad | EQ1 | EQ2 | ... | EQn | Obs. |
 */
export const generarChecklistMultiEquipo = (
  actividadesPorEquipo: ActividadesPorEquipoPDF[],
  _observacionesPorActividad?: Map<string, string>,
): string => {
  if (!actividadesPorEquipo || actividadesPorEquipo.length === 0) {
    return '<div class="section"><p>No hay actividades registradas.</p></div>';
  }

  const equipos = actividadesPorEquipo.map((g) => g.equipo);
  const numEquipos = equipos.length;

  // ✅ FIX REGRESIÓN 14-FEB-2026:
  // Antes se tomaban actividades SOLO del primer equipo.
  // Si ese equipo venía sin actividades, la tabla quedaba sin filas.
  const actividadesBaseMap = new Map<string, ActividadPDF>();
  actividadesPorEquipo.forEach((grupo) => {
    (grupo.actividades || []).forEach((act) => {
      const key = `${act.sistema || 'GENERAL'}|||${act.descripcion}`;
      if (!actividadesBaseMap.has(key)) {
        actividadesBaseMap.set(key, act);
      }
    });
  });
  const actividadesBase = Array.from(actividadesBaseMap.values());
  if (actividadesBase.length === 0) {
    return '<div class="section"><p>No hay actividades registradas.</p></div>';
  }

  // ✅ FIX 14-FEB-2026: Sizing adaptativo según cantidad de equipos
  // Para 8 equipos en A4 portrait (~750px usable):
  //   #=20px, Sistema=60px, Actividad=flex, 8*EQcol, Obs=flex
  const esMuchos = numEquipos >= 5;
  const esExtremo = numEquipos >= 7;
  const colNum = esExtremo ? 18 : 22;
  const colSistema = esExtremo ? 50 : 65;
  const colEquipo = esExtremo ? 32 : (esMuchos ? 38 : 50);
  const colObs = esExtremo ? 70 : (esMuchos ? 85 : 100);
  const fontSize = esExtremo ? '7px' : (esMuchos ? '8px' : '9px');
  const headerFontSize = esExtremo ? '6px' : '7px';
  const labelMaxLen = esExtremo ? 6 : (esMuchos ? 8 : 12);

  // Headers de equipos con label truncado
  const equipoHeaders = equipos
    .map(
      (eq) => {
        const label = (eq.nombreSistema || eq.nombreEquipo || '').substring(0, labelMaxLen);
        return `<th class="equipo-col" style="width:${colEquipo}px;">EQ${eq.ordenSecuencia}<br/><span style="font-weight:normal;font-size:${headerFontSize};">${label}</span></th>`;
      },
    )
    .join('');

  // Filas de actividades
  const filas = actividadesBase
    .map((actBase, idx) => {
      const actividadKey = `${actBase.sistema || 'GENERAL'}|||${actBase.descripcion}`;
      const celdasEquipos = equipos
        .map((eq) => {
          const grupoEquipo = actividadesPorEquipo.find(
            (g) => g.equipo.idOrdenEquipo === eq.idOrdenEquipo,
          );
          const actividadEquipo = grupoEquipo?.actividades.find(
            (a) => `${a.sistema || 'GENERAL'}|||${a.descripcion}` === actividadKey,
          );
          const resultado = actividadEquipo?.resultado || '-';
          return `<td class="equipo-cell"><span class="resultado-mini resultado-${resultado}">${resultado}</span></td>`;
        })
        .join('');

      // ✅ FIX 14-FEB-2026: Observaciones con HTML estructurado para distinguir equipos
      const observacionesArr: string[] = [];
      actividadesPorEquipo.forEach((g) => {
        const obs = g.actividades.find(
          (a) => `${a.sistema || 'GENERAL'}|||${a.descripcion}` === actividadKey,
        )?.observaciones;
        if (obs && obs.trim()) {
          if (numEquipos === 1) {
            observacionesArr.push(obs.trim());
          } else {
            observacionesArr.push(
              `<div class="obs-eq-line"><span class="obs-eq-tag">EQ${g.equipo.ordenSecuencia}:</span> ${obs.trim()}</div>`,
            );
          }
        }
      });

      const observacionesHtml = observacionesArr.length > 0
        ? `<div class="obs-multiequipo">${observacionesArr.join('')}</div>`
        : '';

      return `
      <tr>
        <td style="text-align:center;width:${colNum}px;font-size:${fontSize};">${idx + 1}</td>
        <td style="width:${colSistema}px;font-size:${fontSize};">${actBase.sistema || 'GENERAL'}</td>
        <td style="font-size:${fontSize};">${actBase.descripcion}</td>
        ${celdasEquipos}
        <td style="width:${colObs}px;">${observacionesHtml}</td>
      </tr>
    `;
    })
    .join('');

  return `
  <div class="section${esMuchos ? ' multiequipo-landscape' : ''}">
    <div class="section-title" style="font-size:${esMuchos ? '11px' : '13px'};">📋 CHECKLIST DE ACTIVIDADES - MULTI-EQUIPOS (${numEquipos} equipos)</div>
    <table class="checklist-table checklist-multiequipo">
      <thead>
        <tr>
          <th style="width:${colNum}px;">#</th>
          <th style="width:${colSistema}px;">Sistema</th>
          <th>Actividad</th>
          ${equipoHeaders}
          <th style="width:${colObs}px;">Obs.</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  </div>
  `;
};

/**
 * ✅ MULTI-EQUIPOS: Genera tabla de mediciones con columnas dinámicas por equipo
 * ✅ FIX 14-FEB-2026: Responsive para 2-10+ equipos
 *
 * Estructura:
 * | Parámetro | Unidad | EQ1 | EQ2 | ... | EQn | Estado |
 */
export const generarMedicionesMultiEquipo = (
  medicionesPorEquipo: MedicionesPorEquipoPDF[],
): string => {
  if (!medicionesPorEquipo || medicionesPorEquipo.length === 0) {
    return '<div class="section"><p>No hay mediciones registradas.</p></div>';
  }

  const equipos = medicionesPorEquipo.map((g) => g.equipo);
  const numEquipos = equipos.length;

  // ✅ FIX REGRESIÓN 14-FEB-2026:
  // Antes se tomaban mediciones SOLO del primer equipo.
  // Si ese equipo venía sin datos, la tabla quedaba vacía.
  const medicionesBaseMap = new Map<string, MedicionPDF>();
  medicionesPorEquipo.forEach((grupo) => {
    (grupo.mediciones || []).forEach((med) => {
      const key = `${med.parametro}|||${med.unidad || ''}`;
      if (!medicionesBaseMap.has(key)) {
        medicionesBaseMap.set(key, med);
      }
    });
  });
  const medicionesBase = Array.from(medicionesBaseMap.values());
  if (medicionesBase.length === 0) {
    return '<div class="section"><p>No hay mediciones registradas.</p></div>';
  }

  // ✅ FIX 14-FEB-2026: Sizing adaptativo
  const esExtremo = numEquipos >= 7;
  const esMuchos = numEquipos >= 5;
  const colEquipo = esExtremo ? 32 : (esMuchos ? 40 : 55);
  const fontSize = esExtremo ? '7px' : (esMuchos ? '8px' : '9px');
  const headerFontSize = esExtremo ? '6px' : '7px';
  const labelMaxLen = esExtremo ? 6 : (esMuchos ? 8 : 12);

  // Headers de equipos
  const equipoHeaders = equipos
    .map(
      (eq) => {
        const label = (eq.nombreSistema || eq.nombreEquipo || '').substring(0, labelMaxLen);
        return `<th class="equipo-col" style="width:${colEquipo}px;">EQ${eq.ordenSecuencia}<br/><span style="font-weight:normal;font-size:${headerFontSize};">${label}</span></th>`;
      },
    )
    .join('');

  // Filas de mediciones
  const filas = medicionesBase
    .map((medBase) => {
      const medicionKey = `${medBase.parametro}|||${medBase.unidad || ''}`;
      const celdasEquipos = equipos
        .map((eq) => {
          const grupoEquipo = medicionesPorEquipo.find(
            (g) => g.equipo.idOrdenEquipo === eq.idOrdenEquipo,
          );
          const medicionEquipo = grupoEquipo?.mediciones.find(
            (m) => `${m.parametro}|||${m.unidad || ''}` === medicionKey,
          );
          const valor = medicionEquipo?.valor ?? '-';
          const alerta = medicionEquipo?.nivelAlerta || 'OK';
          const colorClass =
            alerta === 'OK' ? 'ok' : alerta === 'ADVERTENCIA' ? 'warning' : 'critico';

          return `<td class="equipo-cell"><span class="medicion-valor-multiequipo medicion-valor-${colorClass}" style="font-size:${fontSize};">${valor}</span></td>`;
        })
        .join('');

      // Estado general (peor caso entre todos los equipos)
      const alertas = equipos.map((eq) => {
        const grupoEquipo = medicionesPorEquipo.find(
          (g) => g.equipo.idOrdenEquipo === eq.idOrdenEquipo,
        );
        return (
          grupoEquipo?.mediciones.find((m) => `${m.parametro}|||${m.unidad || ''}` === medicionKey)?.nivelAlerta ||
          'OK'
        );
      });
      const estadoGeneral = alertas.includes('CRITICO')
        ? '🔴'
        : alertas.includes('ADVERTENCIA')
          ? '🟡'
          : '🟢';

      return `
      <tr>
        <td style="font-size:${fontSize};">${medBase.parametro}</td>
        <td style="text-align:center;width:${esExtremo ? '35px' : '45px'};font-size:${fontSize};">${medBase.unidad || '-'}</td>
        ${celdasEquipos}
        <td style="text-align:center;font-size:${fontSize};width:${esExtremo ? '30px' : '60px'};">${estadoGeneral}</td>
      </tr>
    `;
    })
    .join('');

  return `
  <div class="section${esMuchos ? ' multiequipo-landscape' : ''}">
    <div class="section-title" style="font-size:${esMuchos ? '11px' : '13px'};">📊 MEDICIONES TÉCNICAS - MULTI-EQUIPOS (${numEquipos} equipos)</div>
    <table class="checklist-table mediciones-multiequipo">
      <thead>
        <tr>
          <th>Parámetro</th>
          <th style="width:${esExtremo ? '35px' : '45px'};">Ud.</th>
          ${equipoHeaders}
          <th style="width:${esExtremo ? '30px' : '60px'};">Est.</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  </div>
  `;
};

/**
 * Obtiene la clase CSS para el color del resultado
 */
export const getResultadoColorClass = (resultado: string): string => {
  switch (resultado) {
    case 'B':
      return 'success';
    case 'R':
    case 'C':
      return 'warning';
    case 'M':
    case 'NF':
      return 'danger';
    default:
      return 'default';
  }
};

/**
 * ✅ MULTI-EQUIPOS (16-DIC-2025): Genera leyenda de equipos debajo del header
 *
 * Muestra: Equipo 1: Motor Caterpillar C9 | Equipo 2: Generador Stamford | ...
 * Solo se muestra si es orden multi-equipo (más de 1 equipo)
 */
export const generarLeyendaEquipos = (
  equipos: EquipoOrdenPDF[] | undefined,
  esMultiEquipo: boolean | undefined,
): string => {
  // Solo mostrar si es multi-equipo
  if (!esMultiEquipo || !equipos || equipos.length <= 1) {
    return '';
  }

  // Ordenar por secuencia
  const equiposOrdenados = [...equipos].sort((a, b) => a.ordenSecuencia - b.ordenSecuencia);

  // ✅ FIX 14-FEB-2026: Nombres COMPLETOS en leyenda (sin truncar)
  // Para 5+ equipos usar layout de 2 columnas compacto; para menos, inline
  const esMuchos = equiposOrdenados.length >= 5;

  const bgColors = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff'];
  const borderColors = ['#2563eb', '#16a34a', '#ca8a04', '#db2777', '#4f46e5'];

  if (esMuchos) {
    // Layout en grilla de 2 columnas para 5+ equipos — nombres COMPLETOS
    const equiposHtml = equiposOrdenados
      .map((eq) => {
        const nombre = eq.nombreSistema || eq.nombreEquipo || eq.codigoEquipo || 'Sin nombre';
        const ci = ((eq.ordenSecuencia - 1) % 5);
        return `
          <div style="
            background: ${bgColors[ci]};
            border-left: 3px solid ${borderColors[ci]};
            padding: 3px 8px;
            font-size: 8px;
            border-radius: 3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            <strong>EQ${eq.ordenSecuencia}:</strong> ${nombre}
          </div>
        `;
      })
      .join('');

    return `
      <div class="leyenda-equipos" style="
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
        margin-bottom: 12px;
      ">
        <div style="font-weight: bold; font-size: 9px; color: #475569; margin-bottom: 6px;">
          📋 EQUIPOS EN ESTA ORDEN (${equiposOrdenados.length}):
        </div>
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 10px;
        ">
          ${equiposHtml}
        </div>
      </div>
    `;
  }

  // Layout inline para pocos equipos — nombres COMPLETOS
  const equiposHtml = equiposOrdenados
    .map((eq) => {
      const nombre = eq.nombreSistema || eq.nombreEquipo || eq.codigoEquipo || 'Sin nombre';
      const ci = ((eq.ordenSecuencia - 1) % 5);
      return `
        <span class="equipo-leyenda-item" style="
          background: ${bgColors[ci]};
          border-left: 3px solid ${borderColors[ci]};
          padding: 4px 10px;
          margin-right: 6px;
          font-size: 9px;
          border-radius: 3px;
          display: inline-block;
          margin-bottom: 2px;
        ">
          <strong>EQ${eq.ordenSecuencia}:</strong> ${nombre}
        </span>
      `;
    })
    .join('');

  return `
    <div class="leyenda-equipos" style="
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 15px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    ">
      <span style="font-weight: bold; font-size: 10px; color: #475569; margin-right: 10px;">
        📋 EQUIPOS EN ESTA ORDEN:
      </span>
      ${equiposHtml}
    </div>
  `;
};

/**
 * ✅ FIX 30-ENE-2026: Optimizar URLs de Cloudinary para reducir tamaño del PDF
 * 
 * Cloudinary permite transformaciones en la URL para comprimir imágenes:
 * - q_auto:low = Calidad automática baja (reduce ~70% del tamaño)
 * - w_600 = Ancho máximo 600px (suficiente para PDF)
 * - f_auto = Formato automático (WebP si es soportado)
 * 
 * URL original: https://res.cloudinary.com/xxx/image/upload/v123/folder/image.jpg
 * URL optimizada: https://res.cloudinary.com/xxx/image/upload/q_auto:low,w_600,f_jpg/v123/folder/image.jpg
 * 
 * Esto reduce imágenes de 2-5MB a 50-150KB cada una
 */
export const optimizarUrlCloudinary = (url: string): string => {
  if (!url) return url;

  // Solo optimizar URLs de Cloudinary
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Evitar doble optimización
  if (url.includes('q_auto') || url.includes('w_600')) {
    return url;
  }

  // Patrón: .../upload/v123/... -> .../upload/q_auto:low,w_600,f_jpg/v123/...
  // También manejar: .../upload/folder/... sin versión
  const uploadMatch = url.match(/(.+\/upload\/)(.+)/);
  if (uploadMatch) {
    const [, base, rest] = uploadMatch;
    // Transformaciones para PDF: calidad baja, ancho max 600px, formato JPG (más compatible que WebP)
    return `${base}q_auto:low,w_600,f_jpg/${rest}`;
  }

  return url;
};

/**
 * Optimizar array de evidencias
 */
export const optimizarEvidencias = (evidencias: (string | EvidenciaPDF)[]): (string | EvidenciaPDF)[] => {
  if (!evidencias || evidencias.length === 0) return evidencias;

  return evidencias.map(ev => {
    if (typeof ev === 'string') {
      return optimizarUrlCloudinary(ev);
    }
    return {
      ...ev,
      url: optimizarUrlCloudinary(ev.url),
    };
  });
};
