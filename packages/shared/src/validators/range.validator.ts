/**
 * Validador de rangos de parámetros
 * Permite definir, validar y comparar rangos de valores
 */

import { DEFAULT_RANGES } from './alert-level.validator';
import { MeasurementCategory, MeasurementUnit, RangeDefinition } from './types';

/**
 * Opciones para crear un rango personalizado
 */
export interface CreateRangeOptions {
  parametro: string;
  categoria?: MeasurementCategory;
  unidad?: MeasurementUnit | string;
  minNormal: number;
  maxNormal: number;
  toleranciaPorcentaje?: number; // Porcentaje de tolerancia para warning/critical
  descripcion?: string;
}

/**
 * Resultado de validación de rango
 */
export interface RangeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Crea un rango personalizado con cálculo automático de zonas warning/critical
 */
export function createRange(options: CreateRangeOptions): RangeDefinition {
  const tolerancia = options.toleranciaPorcentaje ?? 15;
  const rangoNormal = options.maxNormal - options.minNormal;
  const margenWarning = rangoNormal * (tolerancia / 100);
  const margenCritical = rangoNormal * ((tolerancia * 2) / 100);

  return {
    parametro: options.parametro,
    categoria: options.categoria ?? MeasurementCategory.OTRO,
    unidad: options.unidad ?? '',
    minNormal: options.minNormal,
    maxNormal: options.maxNormal,
    minWarning: options.minNormal - margenWarning,
    maxWarning: options.maxNormal + margenWarning,
    minCritical: options.minNormal - margenCritical,
    maxCritical: options.maxNormal + margenCritical,
    descripcion: options.descripcion,
  };
}

/**
 * Valida que un rango esté correctamente definido
 */
export function validateRangeDefinition(rango: RangeDefinition): RangeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar que minNormal < maxNormal
  if (rango.minNormal >= rango.maxNormal) {
    errors.push(`minNormal (${rango.minNormal}) debe ser menor que maxNormal (${rango.maxNormal})`);
  }

  // Validar que minWarning <= minNormal
  if (rango.minWarning !== undefined && rango.minWarning > rango.minNormal) {
    errors.push(`minWarning (${rango.minWarning}) debe ser menor o igual a minNormal (${rango.minNormal})`);
  }

  // Validar que maxWarning >= maxNormal
  if (rango.maxWarning !== undefined && rango.maxWarning < rango.maxNormal) {
    errors.push(`maxWarning (${rango.maxWarning}) debe ser mayor o igual a maxNormal (${rango.maxNormal})`);
  }

  // Validar que minCritical <= minWarning
  if (rango.minCritical !== undefined && rango.minWarning !== undefined) {
    if (rango.minCritical > rango.minWarning) {
      errors.push(`minCritical (${rango.minCritical}) debe ser menor o igual a minWarning (${rango.minWarning})`);
    }
  }

  // Validar que maxCritical >= maxWarning
  if (rango.maxCritical !== undefined && rango.maxWarning !== undefined) {
    if (rango.maxCritical < rango.maxWarning) {
      errors.push(`maxCritical (${rango.maxCritical}) debe ser mayor o igual a maxWarning (${rango.maxWarning})`);
    }
  }

  // Advertencias sobre rangos muy amplios
  const rangoNormal = rango.maxNormal - rango.minNormal;
  const rangoCritical = (rango.maxCritical ?? rango.maxNormal) - (rango.minCritical ?? rango.minNormal);
  
  if (rangoCritical > rangoNormal * 5) {
    warnings.push(`El rango crítico es muy amplio (${rangoCritical}) comparado con el normal (${rangoNormal})`);
  }

  // Advertencia si no hay zona de advertencia
  if (rango.minWarning === undefined && rango.maxWarning === undefined) {
    warnings.push('No se definieron límites de advertencia, se usarán valores calculados');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Verifica si un valor está dentro del rango normal
 */
export function isInNormalRange(valor: number, rango: RangeDefinition): boolean {
  return valor >= rango.minNormal && valor <= rango.maxNormal;
}

/**
 * Verifica si un valor está dentro del rango de advertencia
 */
export function isInWarningRange(valor: number, rango: RangeDefinition): boolean {
  const minWarning = rango.minWarning ?? rango.minNormal * 0.9;
  const maxWarning = rango.maxWarning ?? rango.maxNormal * 1.1;
  
  return (
    (valor >= minWarning && valor < rango.minNormal) ||
    (valor > rango.maxNormal && valor <= maxWarning)
  );
}

/**
 * Verifica si un valor está en rango crítico
 */
export function isInCriticalRange(valor: number, rango: RangeDefinition): boolean {
  const minCritical = rango.minCritical ?? rango.minNormal * 0.7;
  const maxCritical = rango.maxCritical ?? rango.maxNormal * 1.3;
  
  return valor < minCritical || valor > maxCritical;
}

/**
 * Combina un rango predeterminado con valores personalizados
 */
export function mergeRanges(
  baseKey: string,
  overrides: Partial<RangeDefinition>
): RangeDefinition | undefined {
  const base = DEFAULT_RANGES[baseKey];
  if (!base) return undefined;

  return {
    ...base,
    ...overrides,
  };
}

/**
 * Calcula el porcentaje de uso del rango normal
 * 0% = minNormal, 100% = maxNormal
 */
export function calculateRangeUsage(valor: number, rango: RangeDefinition): number {
  if (valor <= rango.minNormal) return 0;
  if (valor >= rango.maxNormal) return 100;
  
  const usage = ((valor - rango.minNormal) / (rango.maxNormal - rango.minNormal)) * 100;
  return Math.round(usage * 100) / 100;
}

/**
 * Obtiene la descripción textual de la posición del valor en el rango
 */
export function getRangePosition(valor: number, rango: RangeDefinition): string {
  const minCritical = rango.minCritical ?? rango.minNormal * 0.7;
  const maxCritical = rango.maxCritical ?? rango.maxNormal * 1.3;
  const minWarning = rango.minWarning ?? rango.minNormal * 0.9;
  const maxWarning = rango.maxWarning ?? rango.maxNormal * 1.1;

  if (valor < minCritical) return 'MUY_BAJO_CRITICO';
  if (valor < minWarning) return 'BAJO_CRITICO';
  if (valor < rango.minNormal) return 'BAJO_ADVERTENCIA';
  if (valor <= rango.maxNormal) return 'NORMAL';
  if (valor <= maxWarning) return 'ALTO_ADVERTENCIA';
  if (valor <= maxCritical) return 'ALTO_CRITICO';
  return 'MUY_ALTO_CRITICO';
}

/**
 * Exporta todos los rangos predeterminados como mapa
 */
export function getAllDefaultRanges(): Map<string, RangeDefinition> {
  return new Map(Object.entries(DEFAULT_RANGES));
}
