/**
 * MEKANOS S.A.S - Metamodelo Extensible de Facetas EAM (Zero-Trust)
 * 
 * Define la taxonomía dinámica de subsistemas y bloques técnicos de activos
 * (Motor, Generador/Alternador, Bomba, Compresor, Panel de Control, etc.)
 * para alimentar los filtros avanzados inteligentes sin quemar lógica en la UI.
 */

export type BloqueTecnico = 'MOTOR' | 'GENERADOR' | 'BOMBA';
export type TablaSatelitePrisma = 'equipos_motor' | 'equipos_generador' | 'equipos_bomba';

export interface FacetaMarcaDef {
  campo: string;
  etiqueta: string;
  bloque: BloqueTecnico;
  tabla: TablaSatelitePrisma;
}

export interface FacetaValorTrabajoDef {
  campo: string;
  etiqueta: string;
  bloque: BloqueTecnico;
  tabla: TablaSatelitePrisma;
  unidad: string;
  tipoDato: 'numero';
  minSugerido?: number;
  maxSugerido?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRO DECLARATIVO DE SUBSISTEMAS Y ATRIBUTOS
// ═══════════════════════════════════════════════════════════════════════════════

export const FACETAS_MARCA_REGISTRO: FacetaMarcaDef[] = [
  // BLOQUE: GENERADOR / ALTERNADOR
  {
    campo: 'marca_generador',
    etiqueta: 'Marca de Generador / Planta',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
  },
  {
    campo: 'marca_alternador',
    etiqueta: 'Marca de Alternador',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
  },
  {
    campo: 'marca_modulo_control',
    etiqueta: 'Marca de Módulo de Control (DSE/ComAp)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
  },
  {
    campo: 'marca_avr',
    etiqueta: 'Marca de AVR (Regulador de Voltaje)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
  },

  // BLOQUE: MOTOR INDUSTRIAL / DE ARRASTRE
  {
    campo: 'marca_motor',
    etiqueta: 'Marca de Motor',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
  },
  {
    campo: 'marca_cargador',
    etiqueta: 'Marca de Cargador de Batería',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
  },

  // BLOQUE: SISTEMAS DE BOMBEO / HIDRÁULICO
  {
    campo: 'marca_bomba',
    etiqueta: 'Marca de Bomba Hidráulica',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
  },
  {
    campo: 'marca_panel_control',
    etiqueta: 'Marca de Panel de Control',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
  },
  {
    campo: 'marca_presostato',
    etiqueta: 'Marca de Presostato',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
  },
  {
    campo: 'marca_variador',
    etiqueta: 'Marca de Variador de Frecuencia (VFD)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
  },
  {
    campo: 'referencia_sello_mecanico',
    etiqueta: 'Marca / Ref. Sello Mecánico',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
  },
  {
    campo: 'marca_contactor',
    etiqueta: 'Marca de Contactor',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
  },
];

export const FACETAS_VALOR_TRABAJO_REGISTRO: FacetaValorTrabajoDef[] = [
  // BLOQUE: GENERADOR
  {
    campo: 'potencia_kva',
    etiqueta: 'Potencia Aparente (kVA)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
    unidad: 'kVA',
    tipoDato: 'numero',
    minSugerido: 5,
    maxSugerido: 2000,
  },
  {
    campo: 'potencia_kw',
    etiqueta: 'Potencia Eléctrica Activa (kW)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
    unidad: 'kW',
    tipoDato: 'numero',
    minSugerido: 4,
    maxSugerido: 1600,
  },
  {
    campo: 'amperaje_nominal_salida',
    etiqueta: 'Amperaje Nominal Salida (A)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
    unidad: 'A',
    tipoDato: 'numero',
    minSugerido: 10,
    maxSugerido: 3000,
  },
  {
    campo: 'capacidad_tanque_principal_litros',
    etiqueta: 'Capacidad Tanque Combustible (L)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
    unidad: 'L',
    tipoDato: 'numero',
    minSugerido: 10,
    maxSugerido: 5000,
  },
  {
    campo: 'frecuencia_hz',
    etiqueta: 'Frecuencia (Hz)',
    bloque: 'GENERADOR',
    tabla: 'equipos_generador',
    unidad: 'Hz',
    tipoDato: 'numero',
  },

  // BLOQUE: MOTOR
  {
    campo: 'potencia_hp',
    etiqueta: 'Potencia Mecánica Motor (HP)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'HP',
    tipoDato: 'numero',
    minSugerido: 1,
    maxSugerido: 2500,
  },
  {
    campo: 'potencia_kw',
    etiqueta: 'Potencia Motor (kW)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'kW',
    tipoDato: 'numero',
    minSugerido: 0.75,
    maxSugerido: 1800,
  },
  {
    campo: 'capacidad_bateria_ah',
    etiqueta: 'Capacidad Batería de Arranque (Ah)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'Ah',
    tipoDato: 'numero',
    minSugerido: 35,
    maxSugerido: 300,
  },
  {
    campo: 'velocidad_nominal_rpm',
    etiqueta: 'Velocidad de Giro (RPM)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'RPM',
    tipoDato: 'numero',
  },
  {
    campo: 'voltaje_arranque_vdc',
    etiqueta: 'Voltaje Sistema de Arranque (VDC)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'VDC',
    tipoDato: 'numero',
  },
  {
    campo: 'amperaje_arranque',
    etiqueta: 'Amperaje de Arranque (CCA/A)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'A',
    tipoDato: 'numero',
  },
  {
    campo: 'capacidad_aceite_litros',
    etiqueta: 'Capacidad Cárter Aceite (L)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'L',
    tipoDato: 'numero',
  },
  {
    campo: 'capacidad_refrigerante_litros',
    etiqueta: 'Capacidad Sistema Refrigeración (L)',
    bloque: 'MOTOR',
    tabla: 'equipos_motor',
    unidad: 'L',
    tipoDato: 'numero',
  },

  // BLOQUE: BOMBA
  {
    campo: 'caudal_maximo_m3h',
    etiqueta: 'Caudal Máximo de Diseño (m³/h)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'm³/h',
    tipoDato: 'numero',
    minSugerido: 1,
    maxSugerido: 1000,
  },
  {
    campo: 'altura_manometrica_maxima_m',
    etiqueta: 'Altura Manométrica Máxima (m)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'm',
    tipoDato: 'numero',
    minSugerido: 5,
    maxSugerido: 300,
  },
  {
    campo: 'altura_presion_trabajo_m',
    etiqueta: 'Presión de Trabajo (m / PSI)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'm',
    tipoDato: 'numero',
  },
  {
    campo: 'potencia_hidraulica_kw',
    etiqueta: 'Potencia Hidráulica (kW)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'kW',
    tipoDato: 'numero',
  },
  {
    campo: 'presion_encendido_psi',
    etiqueta: 'Presión Encendido (PSI)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'PSI',
    tipoDato: 'numero',
  },
  {
    campo: 'presion_apagado_psi',
    etiqueta: 'Presión Apagado (PSI)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'PSI',
    tipoDato: 'numero',
  },
  {
    campo: 'capacidad_tanques_litros',
    etiqueta: 'Capacidad Tanque Hidroneumático (L)',
    bloque: 'BOMBA',
    tabla: 'equipos_bomba',
    unidad: 'L',
    tipoDato: 'numero',
  },
];

/**
 * Resuelve qué bloques funcionales aplican según el tipo de equipo recibido y su registro en BD.
 * Totalmente desacoplado: soporta cualquier tipo nuevo que se registre en tipos_equipo.
 */
export function resolverBloquesActivos(
  tipoInput?: string,
  tipoEquipoDb?: {
    tiene_motor?: boolean | null;
    tiene_generador?: boolean | null;
    tiene_bomba?: boolean | null;
    codigo_tipo?: string | null;
    nombre_tipo?: string | null;
    metadata?: any;
  } | null,
): BloqueTecnico[] {
  if (tipoEquipoDb) {
    const bloques: BloqueTecnico[] = [];
    if (tipoEquipoDb.tiene_motor) bloques.push('MOTOR');
    if (tipoEquipoDb.tiene_generador) bloques.push('GENERADOR');
    if (tipoEquipoDb.tiene_bomba) bloques.push('BOMBA');
    if (bloques.length > 0) return bloques;
  }

  if (!tipoInput || tipoInput.trim() === '' || tipoInput.toUpperCase() === 'TODOS') {
    return ['GENERADOR', 'MOTOR', 'BOMBA'];
  }

  const t = tipoInput.trim().toUpperCase();
  if (t === 'GENERADOR' || t === 'GEN' || t.includes('GENERADOR') || t.includes('PLANTA')) {
    return ['GENERADOR', 'MOTOR'];
  }
  if (t === 'BOMBA' || t === 'BOM' || t.includes('BOMBA') || t.includes('HIDR')) {
    return ['BOMBA', 'MOTOR'];
  }
  if (t === 'MOTOR' || t === 'MOT') {
    return ['MOTOR'];
  }
  if (t === 'COMPRESOR' || t === 'COMP') {
    return ['MOTOR'];
  }

  // Fallback seguro: motor como mínimo para cualquier activo mecánico
  return ['MOTOR'];
}
