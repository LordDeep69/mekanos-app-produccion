/**
 * Validador de niveles de alerta
 * Determina el nivel de alerta basado en el valor y los rangos definidos
 */

import {
    AlertLevel,
    MeasurementCategory,
    MeasurementUnit,
    RangeDefinition,
} from './types';

/**
 * Rangos predeterminados por categoría de parámetro
 * Estos son valores industriales estándar para equipos rotativos
 */
export const DEFAULT_RANGES: Record<string, RangeDefinition> = {
  // ═══════════════════════════════════════════════════════════════
  // TEMPERATURA
  // ═══════════════════════════════════════════════════════════════
  'TEMPERATURA_MOTOR': {
    parametro: 'Temperatura Motor',
    categoria: MeasurementCategory.TEMPERATURA,
    unidad: MeasurementUnit.CELSIUS,
    minNormal: 40,
    maxNormal: 85,
    minWarning: 30,
    maxWarning: 95,
    minCritical: 20,
    maxCritical: 110,
    descripcion: 'Temperatura del cuerpo del motor eléctrico',
  },
  'TEMPERATURA_RODAMIENTOS': {
    parametro: 'Temperatura Rodamientos',
    categoria: MeasurementCategory.TEMPERATURA,
    unidad: MeasurementUnit.CELSIUS,
    minNormal: 35,
    maxNormal: 70,
    minWarning: 25,
    maxWarning: 80,
    minCritical: 15,
    maxCritical: 95,
    descripcion: 'Temperatura en rodamientos de motor/bomba',
  },
  'TEMPERATURA_ACEITE': {
    parametro: 'Temperatura Aceite',
    categoria: MeasurementCategory.TEMPERATURA,
    unidad: MeasurementUnit.CELSIUS,
    minNormal: 40,
    maxNormal: 75,
    minWarning: 30,
    maxWarning: 85,
    minCritical: 20,
    maxCritical: 100,
    descripcion: 'Temperatura del aceite lubricante',
  },
  'TEMPERATURA_AMBIENTE': {
    parametro: 'Temperatura Ambiente',
    categoria: MeasurementCategory.TEMPERATURA,
    unidad: MeasurementUnit.CELSIUS,
    minNormal: 18,
    maxNormal: 35,
    minWarning: 10,
    maxWarning: 42,
    minCritical: 0,
    maxCritical: 50,
    descripcion: 'Temperatura del ambiente de operación',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PRESIÓN
  // ═══════════════════════════════════════════════════════════════
  'PRESION_DESCARGA': {
    parametro: 'Presión Descarga',
    categoria: MeasurementCategory.PRESION,
    unidad: MeasurementUnit.PSI,
    minNormal: 50,
    maxNormal: 150,
    minWarning: 40,
    maxWarning: 175,
    minCritical: 20,
    maxCritical: 200,
    descripcion: 'Presión en línea de descarga de bomba',
  },
  'PRESION_SUCCION': {
    parametro: 'Presión Succión',
    categoria: MeasurementCategory.PRESION,
    unidad: MeasurementUnit.PSI,
    minNormal: 5,
    maxNormal: 30,
    minWarning: 2,
    maxWarning: 40,
    minCritical: 0,
    maxCritical: 50,
    descripcion: 'Presión en línea de succión de bomba',
  },
  'PRESION_ACEITE': {
    parametro: 'Presión Aceite',
    categoria: MeasurementCategory.PRESION,
    unidad: MeasurementUnit.PSI,
    minNormal: 30,
    maxNormal: 80,
    minWarning: 25,
    maxWarning: 90,
    minCritical: 15,
    maxCritical: 100,
    descripcion: 'Presión del sistema de lubricación',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // VIBRACIÓN
  // ═══════════════════════════════════════════════════════════════
  'VIBRACION_HORIZONTAL': {
    parametro: 'Vibración Horizontal',
    categoria: MeasurementCategory.VIBRACION,
    unidad: MeasurementUnit.MM_S,
    minNormal: 0,
    maxNormal: 4.5,
    minWarning: 0,
    maxWarning: 7.1,
    minCritical: 0,
    maxCritical: 11.2,
    descripcion: 'Vibración en eje horizontal (ISO 10816)',
  },
  'VIBRACION_VERTICAL': {
    parametro: 'Vibración Vertical',
    categoria: MeasurementCategory.VIBRACION,
    unidad: MeasurementUnit.MM_S,
    minNormal: 0,
    maxNormal: 4.5,
    minWarning: 0,
    maxWarning: 7.1,
    minCritical: 0,
    maxCritical: 11.2,
    descripcion: 'Vibración en eje vertical (ISO 10816)',
  },
  'VIBRACION_AXIAL': {
    parametro: 'Vibración Axial',
    categoria: MeasurementCategory.VIBRACION,
    unidad: MeasurementUnit.MM_S,
    minNormal: 0,
    maxNormal: 3.5,
    minWarning: 0,
    maxWarning: 5.6,
    minCritical: 0,
    maxCritical: 9.0,
    descripcion: 'Vibración en eje axial (ISO 10816)',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // ELÉCTRICO
  // ═══════════════════════════════════════════════════════════════
  'VOLTAJE_LINEA': {
    parametro: 'Voltaje Línea',
    categoria: MeasurementCategory.ELECTRICO,
    unidad: MeasurementUnit.VOLTIOS,
    minNormal: 207,
    maxNormal: 253,
    minWarning: 198,
    maxWarning: 264,
    minCritical: 185,
    maxCritical: 275,
    descripcion: 'Voltaje línea-neutro (208-240V nominal)',
  },
  'CORRIENTE_OPERACION': {
    parametro: 'Corriente Operación',
    categoria: MeasurementCategory.ELECTRICO,
    unidad: MeasurementUnit.AMPERIOS,
    minNormal: 0,
    maxNormal: 100, // Variable según motor
    minWarning: 0,
    maxWarning: 110,
    minCritical: 0,
    maxCritical: 125,
    descripcion: 'Corriente de operación del motor',
  },
  'RESISTENCIA_AISLAMIENTO': {
    parametro: 'Resistencia Aislamiento',
    categoria: MeasurementCategory.ELECTRICO,
    unidad: MeasurementUnit.MEGAOHMIOS,
    minNormal: 100,
    maxNormal: 5000,
    minWarning: 50,
    maxWarning: 100000,
    minCritical: 1,
    maxCritical: 100000,
    descripcion: 'Resistencia de aislamiento (IEEE 43)',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // FLUJO
  // ═══════════════════════════════════════════════════════════════
  'CAUDAL_BOMBA': {
    parametro: 'Caudal Bomba',
    categoria: MeasurementCategory.FLUJO,
    unidad: MeasurementUnit.GALONES_MINUTO,
    minNormal: 50,
    maxNormal: 500,
    minWarning: 30,
    maxWarning: 550,
    minCritical: 10,
    maxCritical: 600,
    descripcion: 'Caudal de operación de bomba',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // RPM
  // ═══════════════════════════════════════════════════════════════
  'VELOCIDAD_MOTOR': {
    parametro: 'Velocidad Motor',
    categoria: MeasurementCategory.RPM,
    unidad: MeasurementUnit.RPM,
    minNormal: 1700,
    maxNormal: 1850,
    minWarning: 1650,
    maxWarning: 1900,
    minCritical: 1500,
    maxCritical: 2000,
    descripcion: 'Velocidad de rotación del motor (1800 RPM nominal)',
  },
  'VELOCIDAD_BOMBA': {
    parametro: 'Velocidad Bomba',
    categoria: MeasurementCategory.RPM,
    unidad: MeasurementUnit.RPM,
    minNormal: 3400,
    maxNormal: 3650,
    minWarning: 3300,
    maxWarning: 3750,
    minCritical: 3000,
    maxCritical: 4000,
    descripcion: 'Velocidad de rotación de bomba (3600 RPM nominal)',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // NIVEL
  // ═══════════════════════════════════════════════════════════════
  'NIVEL_ACEITE': {
    parametro: 'Nivel Aceite',
    categoria: MeasurementCategory.NIVEL,
    unidad: MeasurementUnit.PORCENTAJE,
    minNormal: 75,
    maxNormal: 100,
    minWarning: 50,
    maxWarning: 100,
    minCritical: 25,
    maxCritical: 100,
    descripcion: 'Nivel de aceite en cárter o depósito',
  },
  'NIVEL_REFRIGERANTE': {
    parametro: 'Nivel Refrigerante',
    categoria: MeasurementCategory.NIVEL,
    unidad: MeasurementUnit.PORCENTAJE,
    minNormal: 80,
    maxNormal: 100,
    minWarning: 60,
    maxWarning: 100,
    minCritical: 40,
    maxCritical: 100,
    descripcion: 'Nivel de líquido refrigerante',
  },
};

/**
 * Determina el nivel de alerta basado en un valor y su rango
 */
export function determineAlertLevel(
  valor: number,
  rango: RangeDefinition
): AlertLevel {
  // Verificar si está en rango normal
  if (valor >= rango.minNormal && valor <= rango.maxNormal) {
    return AlertLevel.NORMAL;
  }
  
  // Verificar si está en zona de advertencia
  const minWarning = rango.minWarning ?? rango.minNormal * 0.9;
  const maxWarning = rango.maxWarning ?? rango.maxNormal * 1.1;
  
  if (valor >= minWarning && valor < rango.minNormal) {
    return AlertLevel.WARNING;
  }
  if (valor > rango.maxNormal && valor <= maxWarning) {
    return AlertLevel.WARNING;
  }
  
  // Verificar si está en zona crítica
  const minCritical = rango.minCritical ?? rango.minNormal * 0.7;
  const maxCritical = rango.maxCritical ?? rango.maxNormal * 1.3;
  
  if (valor < minCritical || valor > maxCritical) {
    return AlertLevel.CRITICAL;
  }
  
  // Si está fuera de normal pero dentro de crítico, es WARNING
  return AlertLevel.WARNING;
}

/**
 * Obtiene el rango predeterminado para un parámetro
 */
export function getDefaultRange(parametroKey: string): RangeDefinition | undefined {
  return DEFAULT_RANGES[parametroKey.toUpperCase().replace(/\s+/g, '_')];
}

/**
 * Lista todas las claves de rangos disponibles
 */
export function getAvailableRangeKeys(): string[] {
  return Object.keys(DEFAULT_RANGES);
}

/**
 * Obtiene rangos por categoría
 */
export function getRangesByCategory(categoria: MeasurementCategory): RangeDefinition[] {
  return Object.values(DEFAULT_RANGES).filter(r => r.categoria === categoria);
}

/**
 * Calcula el porcentaje de desviación del valor respecto al rango normal
 */
export function calculateDeviation(valor: number, rango: RangeDefinition): number {
  const midPoint = (rango.minNormal + rango.maxNormal) / 2;
  const rangeWidth = rango.maxNormal - rango.minNormal;
  
  if (rangeWidth === 0) return 0;
  
  const deviation = ((valor - midPoint) / (rangeWidth / 2)) * 100;
  return Math.round(deviation * 100) / 100;
}
