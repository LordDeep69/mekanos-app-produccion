/**
 * MEKANOS PDF Templates - Paleta de Colores Oficial
 *
 * #F2F2F2 - Blanco (fondo)
 * #244673 - Azul Oscuro (encabezados)
 * #3290A6 - Azul Claro (acentos)
 * #56A672 - Verde (estados OK)
 * #9EC23D - Verde Claro (destacados)
 */

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
}

// Evidencia fotográfica con caption opcional
export interface EvidenciaPDF {
  url: string;
  caption?: string;
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
    min-height: 297mm;
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
  
  /* ✅ FIX: Estilos mejorados para columna de Observaciones */
  .checklist-table td:last-child {
    font-size: 9px;
    color: ${MEKANOS_COLORS.secondary};
    font-style: italic;
    max-width: 150px;
    word-wrap: break-word;
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
  .resultado-default { background: ${MEKANOS_COLORS.secondary}; color: white; }
  
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
    height: 150px;
    object-fit: cover;
    display: block;
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
  
  .firma-label {
    font-size: 11px;
    color: ${MEKANOS_COLORS.primary};
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 5px;
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
     EVIDENCIAS AGRUPADAS POR TIPO
     ═══════════════════════════════════════════════════════════════ */
  
  .evidencias-section {
    page-break-inside: avoid;
  }
  
  .evidencias-grupo {
    margin-bottom: 15px;
    border: 1px solid ${MEKANOS_COLORS.border};
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
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
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
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
    height: 100px;
    object-fit: cover;
    display: block;
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
`;
