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

  /* ═══════════════════════════════════════════════════════════════
     MULTI-EQUIPOS: Estilos para tablas dinámicas (15-DIC-2025)
     ═══════════════════════════════════════════════════════════════ */
  
  .checklist-multiequipo th.equipo-col {
    background: ${MEKANOS_COLORS.secondary};
    text-align: center;
    min-width: 50px;
    max-width: 80px;
    font-size: 8px;
    padding: 4px 2px;
  }
  
  .checklist-multiequipo td.equipo-cell {
    text-align: center;
    padding: 3px 2px;
    min-width: 50px;
    max-width: 80px;
  }
  
  .checklist-multiequipo .resultado-mini {
    display: inline-block;
    padding: 2px 4px;
    border-radius: 2px;
    font-weight: bold;
    font-size: 8px;
    min-width: 24px;
  }
  
  .mediciones-multiequipo th.equipo-col {
    background: ${MEKANOS_COLORS.secondary};
    text-align: center;
    min-width: 60px;
    max-width: 90px;
    font-size: 8px;
    padding: 4px 2px;
  }
  
  .mediciones-multiequipo td.equipo-cell {
    text-align: center;
    padding: 3px 4px;
    font-weight: bold;
  }
  
  .medicion-valor-multiequipo {
    font-size: 10px;
    font-weight: bold;
    padding: 2px 4px;
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
 *
 * Estructura:
 * | # | Sistema | Actividad | Equipo 1 | Equipo 2 | Equipo 3 | Obs. |
 * | 1 | ENFRIAMIENTO | Revisar tapa | B | B | R | Tensionar |
 */
export const generarChecklistMultiEquipo = (
  actividadesPorEquipo: ActividadesPorEquipoPDF[],
  observacionesPorActividad?: Map<string, string>,
): string => {
  if (!actividadesPorEquipo || actividadesPorEquipo.length === 0) {
    return '<div class="section"><p>No hay actividades registradas.</p></div>';
  }

  // Obtener lista única de actividades (por descripción)
  const primerasActividades = actividadesPorEquipo[0]?.actividades || [];
  const equipos = actividadesPorEquipo.map((g) => g.equipo);

  // Headers de equipos
  const equipoHeaders = equipos
    .map(
      (eq) =>
        `<th class="equipo-col">EQ${eq.ordenSecuencia}<br/><span style="font-weight:normal;font-size:7px;">${(eq.nombreSistema || eq.nombreEquipo || '').substring(0, 12)}</span></th>`,
    )
    .join('');

  // Filas de actividades
  const filas = primerasActividades
    .map((actBase, idx) => {
      // Para cada equipo, buscar el resultado de esta actividad
      const celdasEquipos = equipos
        .map((eq) => {
          const grupoEquipo = actividadesPorEquipo.find(
            (g) => g.equipo.idOrdenEquipo === eq.idOrdenEquipo,
          );
          const actividadEquipo = grupoEquipo?.actividades.find(
            (a) => a.descripcion === actBase.descripcion,
          );
          const resultado = actividadEquipo?.resultado || '-';
          const colorClass = getResultadoColorClass(resultado);

          return `<td class="equipo-cell"><span class="resultado-mini resultado-${resultado}">${resultado}</span></td>`;
        })
        .join('');

      // Obtener observaciones combinadas - ✅ FIX: Formato legible con indicador de equipo
      const observacionesArr = actividadesPorEquipo
        .map((g, idx) => {
          const obs = g.actividades.find(
            (a) => a.descripcion === actBase.descripcion,
          )?.observaciones;
          if (obs && obs.trim()) {
            // Si solo hay 1 equipo, no agregar prefijo
            return actividadesPorEquipo.length === 1
              ? obs.trim()
              : `[EQ${g.equipo.ordenSecuencia}] ${obs.trim()}`;
          }
          return null;
        })
        .filter(Boolean);

      // Formato: Si hay múltiples observaciones, usar salto de línea visual
      const observaciones =
        observacionesArr.length > 1 ? observacionesArr.join(' | ') : observacionesArr.join('');

      return `
      <tr>
        <td style="text-align:center;width:25px;">${idx + 1}</td>
        <td style="width:80px;font-size:9px;">${actBase.sistema || 'GENERAL'}</td>
        <td style="font-size:9px;">${actBase.descripcion}</td>
        ${celdasEquipos}
        <td style="font-size:8px;max-width:100px;">${observaciones}</td>
      </tr>
    `;
    })
    .join('');

  return `
  <div class="section">
    <div class="section-title">📋 CHECKLIST DE ACTIVIDADES - MULTI-EQUIPOS (${equipos.length} equipos)</div>
    <table class="checklist-table checklist-multiequipo">
      <thead>
        <tr>
          <th style="width:25px;">#</th>
          <th style="width:80px;">Sistema</th>
          <th>Actividad</th>
          ${equipoHeaders}
          <th style="width:100px;">Obs.</th>
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
 *
 * Estructura:
 * | Parámetro | Unidad | Equipo 1 | Equipo 2 | Equipo 3 | Estado |
 * | Temperatura | °C | 82 | 85 | 79 | ✅ OK |
 */
export const generarMedicionesMultiEquipo = (
  medicionesPorEquipo: MedicionesPorEquipoPDF[],
): string => {
  if (!medicionesPorEquipo || medicionesPorEquipo.length === 0) {
    return '<div class="section"><p>No hay mediciones registradas.</p></div>';
  }

  const equipos = medicionesPorEquipo.map((g) => g.equipo);
  const primerasMediciones = medicionesPorEquipo[0]?.mediciones || [];

  // Headers de equipos
  const equipoHeaders = equipos
    .map(
      (eq) =>
        `<th class="equipo-col">EQ${eq.ordenSecuencia}<br/><span style="font-weight:normal;font-size:7px;">${(eq.nombreSistema || eq.nombreEquipo || '').substring(0, 12)}</span></th>`,
    )
    .join('');

  // Filas de mediciones
  const filas = primerasMediciones
    .map((medBase) => {
      // Para cada equipo, buscar el valor de este parámetro
      const celdasEquipos = equipos
        .map((eq) => {
          const grupoEquipo = medicionesPorEquipo.find(
            (g) => g.equipo.idOrdenEquipo === eq.idOrdenEquipo,
          );
          const medicionEquipo = grupoEquipo?.mediciones.find(
            (m) => m.parametro === medBase.parametro,
          );
          const valor = medicionEquipo?.valor ?? '-';
          const alerta = medicionEquipo?.nivelAlerta || 'OK';
          const colorClass =
            alerta === 'OK' ? 'ok' : alerta === 'ADVERTENCIA' ? 'warning' : 'critico';

          return `<td class="equipo-cell"><span class="medicion-valor-multiequipo medicion-valor-${colorClass}">${valor}</span></td>`;
        })
        .join('');

      // Estado general (peor caso entre todos los equipos)
      const alertas = equipos.map((eq) => {
        const grupoEquipo = medicionesPorEquipo.find(
          (g) => g.equipo.idOrdenEquipo === eq.idOrdenEquipo,
        );
        return (
          grupoEquipo?.mediciones.find((m) => m.parametro === medBase.parametro)?.nivelAlerta ||
          'OK'
        );
      });
      const estadoGeneral = alertas.includes('CRITICO')
        ? '🔴 CRITICO'
        : alertas.includes('ADVERTENCIA')
          ? '🟡 ALERTA'
          : '🟢 OK';

      return `
      <tr>
        <td style="font-size:9px;">${medBase.parametro}</td>
        <td style="text-align:center;width:50px;">${medBase.unidad || '-'}</td>
        ${celdasEquipos}
        <td style="text-align:center;font-size:9px;">${estadoGeneral}</td>
      </tr>
    `;
    })
    .join('');

  return `
  <div class="section">
    <div class="section-title">📊 MEDICIONES TÉCNICAS - MULTI-EQUIPOS (${equipos.length} equipos)</div>
    <table class="checklist-table mediciones-multiequipo">
      <thead>
        <tr>
          <th>Parámetro</th>
          <th style="width:50px;">Unidad</th>
          ${equipoHeaders}
          <th style="width:80px;">Estado</th>
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
const getResultadoColorClass = (resultado: string): string => {
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

  const equiposHtml = equiposOrdenados
    .map((eq) => {
      const nombre = eq.nombreSistema || eq.nombreEquipo || eq.codigoEquipo || 'Sin nombre';
      const colorIndex = ((eq.ordenSecuencia - 1) % 5) + 1; // Colores 1-5
      return `
        <span class="equipo-leyenda-item" style="
          background: ${colorIndex === 1 ? '#dbeafe' : colorIndex === 2 ? '#dcfce7' : colorIndex === 3 ? '#fef3c7' : colorIndex === 4 ? '#fce7f3' : '#e0e7ff'};
          border-left: 4px solid ${colorIndex === 1 ? '#2563eb' : colorIndex === 2 ? '#16a34a' : colorIndex === 3 ? '#ca8a04' : colorIndex === 4 ? '#db2777' : '#4f46e5'};
          padding: 4px 10px;
          margin-right: 8px;
          font-size: 9px;
          border-radius: 4px;
        ">
          <strong>Equipo ${eq.ordenSecuencia}:</strong> ${nombre}
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
      gap: 8px;
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
