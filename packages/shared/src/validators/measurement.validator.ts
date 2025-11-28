/**
 * Validador principal de mediciones industriales
 * Combina validación de rangos, alertas y recomendaciones
 */

import {
    calculateDeviation,
    DEFAULT_RANGES,
    determineAlertLevel,
} from './alert-level.validator';
import {
    AlertLevel,
    MeasurementCategory,
    MeasurementUnit,
    MeasurementValidationResult,
    RangeDefinition,
    UnitConversionResult,
    ValidateMeasurementOptions,
} from './types';

// Re-export para uso externo
export { getRangePosition } from './range.validator';

/**
 * Factores de conversión entre unidades
 */
const CONVERSION_FACTORS: Record<string, Record<string, number>> = {
  // Temperatura
  [MeasurementUnit.CELSIUS]: {
    [MeasurementUnit.FAHRENHEIT]: 1.8, // offset +32
    [MeasurementUnit.KELVIN]: 1, // offset +273.15
  },
  // Presión
  [MeasurementUnit.PSI]: {
    [MeasurementUnit.BAR]: 0.0689476,
    [MeasurementUnit.KPA]: 6.89476,
  },
  [MeasurementUnit.BAR]: {
    [MeasurementUnit.PSI]: 14.5038,
    [MeasurementUnit.KPA]: 100,
  },
  // Vibración
  [MeasurementUnit.MM_S]: {
    [MeasurementUnit.IN_S]: 0.0393701,
  },
  [MeasurementUnit.IN_S]: {
    [MeasurementUnit.MM_S]: 25.4,
  },
  // Flujo
  [MeasurementUnit.LITROS_MINUTO]: {
    [MeasurementUnit.GALONES_MINUTO]: 0.264172,
    [MeasurementUnit.METROS_CUBICOS_HORA]: 0.06,
  },
  [MeasurementUnit.GALONES_MINUTO]: {
    [MeasurementUnit.LITROS_MINUTO]: 3.78541,
    [MeasurementUnit.METROS_CUBICOS_HORA]: 0.227125,
  },
};

/**
 * Acciones recomendadas por nivel de alerta y categoría
 */
const RECOMMENDED_ACTIONS: Record<string, Record<AlertLevel, string[]>> = {
  [MeasurementCategory.TEMPERATURA]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Verificar sistema de refrigeración',
      'Inspeccionar ventilación del área',
      'Revisar carga del equipo',
    ],
    [AlertLevel.CRITICAL]: [
      'DETENER EQUIPO INMEDIATAMENTE',
      'Notificar a supervisión',
      'No reiniciar hasta verificar causa raíz',
      'Verificar sistema de refrigeración',
    ],
  },
  [MeasurementCategory.VIBRACION]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Programar análisis de vibraciones',
      'Verificar alineación',
      'Revisar sujeción de base',
    ],
    [AlertLevel.CRITICAL]: [
      'DETENER EQUIPO INMEDIATAMENTE',
      'Programar mantenimiento correctivo urgente',
      'Realizar análisis de vibraciones completo',
      'Verificar rodamientos',
    ],
  },
  [MeasurementCategory.PRESION]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Verificar válvulas y tuberías',
      'Revisar filtros',
      'Verificar instrumentos de medición',
    ],
    [AlertLevel.CRITICAL]: [
      'DETENER EQUIPO - Riesgo de daño mecánico',
      'Verificar válvulas de alivio',
      'Inspeccionar líneas de presión',
    ],
  },
  [MeasurementCategory.ELECTRICO]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Verificar conexiones eléctricas',
      'Medir balance de fases',
      'Revisar protecciones térmicas',
    ],
    [AlertLevel.CRITICAL]: [
      'DESCONECTAR ENERGÍA INMEDIATAMENTE',
      'Verificar aislamientos',
      'No energizar sin autorización',
    ],
  },
  [MeasurementCategory.RPM]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Verificar tensión de correas',
      'Revisar variador de frecuencia',
      'Verificar carga',
    ],
    [AlertLevel.CRITICAL]: [
      'DETENER EQUIPO',
      'Verificar acople mecánico',
      'Revisar motor y transmisión',
    ],
  },
  [MeasurementCategory.FLUJO]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Verificar válvulas',
      'Revisar filtros de succión',
      'Verificar nivel de tanque',
    ],
    [AlertLevel.CRITICAL]: [
      'DETENER BOMBA - Riesgo de cavitación',
      'Verificar NPSH disponible',
      'Revisar línea de succión',
    ],
  },
  [MeasurementCategory.NIVEL]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: [
      'Programar reposición de fluido',
      'Verificar fugas',
    ],
    [AlertLevel.CRITICAL]: [
      'DETENER EQUIPO - Nivel crítico',
      'Reponer fluido inmediatamente',
      'Verificar fugas antes de reiniciar',
    ],
  },
  [MeasurementCategory.OTRO]: {
    [AlertLevel.NORMAL]: [],
    [AlertLevel.WARNING]: ['Verificar parámetro y documentar'],
    [AlertLevel.CRITICAL]: ['Detener equipo y notificar a supervisión'],
  },
};

/**
 * Valida una medición industrial y retorna resultado completo
 */
export function validateMeasurement(
  options: ValidateMeasurementOptions
): MeasurementValidationResult {
  // Normalizar nombre de parámetro
  const parametroKey = options.parametro.toUpperCase().replace(/\s+/g, '_');
  
  // Obtener rango (personalizado o predeterminado)
  const rango = options.rangoPersonalizado ?? DEFAULT_RANGES[parametroKey];
  
  if (!rango) {
    return {
      isValid: false,
      alertLevel: AlertLevel.WARNING,
      valor: options.valor,
      parametro: options.parametro,
      unidad: options.unidad ?? '',
      mensaje: `No se encontró definición de rango para el parámetro: ${options.parametro}`,
      validadoEn: new Date(),
    };
  }

  // Determinar nivel de alerta
  const alertLevel = determineAlertLevel(options.valor, rango);
  
  // Calcular desviación
  const desviacion = calculateDeviation(options.valor, rango);
  
  // Generar mensaje
  const mensaje = generateMessage(options.valor, rango, alertLevel);
  
  // Obtener acciones recomendadas
  const acciones = RECOMMENDED_ACTIONS[rango.categoria]?.[alertLevel] ?? [];

  return {
    isValid: alertLevel === AlertLevel.NORMAL,
    alertLevel,
    valor: options.valor,
    parametro: rango.parametro,
    unidad: rango.unidad,
    mensaje,
    desviacionPorcentaje: desviacion,
    rango: {
      minNormal: rango.minNormal,
      maxNormal: rango.maxNormal,
      minCritical: rango.minCritical,
      maxCritical: rango.maxCritical,
    },
    validadoEn: new Date(),
    accionesRecomendadas: acciones.length > 0 ? acciones : undefined,
  };
}

/**
 * Genera mensaje descriptivo según el nivel de alerta
 */
function generateMessage(
  valor: number,
  rango: RangeDefinition,
  alertLevel: AlertLevel
): string {
  // Posición se puede usar para logging adicional si es necesario
  // const position = getRangePosition(valor, rango);
  
  switch (alertLevel) {
    case AlertLevel.NORMAL:
      return `${rango.parametro}: ${valor} ${rango.unidad} - Dentro del rango normal (${rango.minNormal}-${rango.maxNormal} ${rango.unidad})`;
    
    case AlertLevel.WARNING:
      if (valor < rango.minNormal) {
        return `⚠️ ${rango.parametro}: ${valor} ${rango.unidad} - BAJO el rango normal. Rango esperado: ${rango.minNormal}-${rango.maxNormal} ${rango.unidad}`;
      }
      return `⚠️ ${rango.parametro}: ${valor} ${rango.unidad} - SOBRE el rango normal. Rango esperado: ${rango.minNormal}-${rango.maxNormal} ${rango.unidad}`;
    
    case AlertLevel.CRITICAL:
      if (valor < (rango.minCritical ?? rango.minNormal)) {
        return `🚨 CRÍTICO - ${rango.parametro}: ${valor} ${rango.unidad} - MUY BAJO. ¡REQUIERE ACCIÓN INMEDIATA!`;
      }
      return `🚨 CRÍTICO - ${rango.parametro}: ${valor} ${rango.unidad} - MUY ALTO. ¡REQUIERE ACCIÓN INMEDIATA!`;
    
    default:
      return `${rango.parametro}: ${valor} ${rango.unidad}`;
  }
}

/**
 * Valida múltiples mediciones a la vez
 */
export function validateMultipleMeasurements(
  measurements: ValidateMeasurementOptions[]
): MeasurementValidationResult[] {
  return measurements.map(m => validateMeasurement(m));
}

/**
 * Obtiene un resumen de múltiples validaciones
 */
export function getMeasurementsSummary(results: MeasurementValidationResult[]): {
  total: number;
  normal: number;
  warning: number;
  critical: number;
  criticalParameters: string[];
} {
  const summary = {
    total: results.length,
    normal: 0,
    warning: 0,
    critical: 0,
    criticalParameters: [] as string[],
  };

  for (const result of results) {
    switch (result.alertLevel) {
      case AlertLevel.NORMAL:
        summary.normal++;
        break;
      case AlertLevel.WARNING:
        summary.warning++;
        break;
      case AlertLevel.CRITICAL:
        summary.critical++;
        summary.criticalParameters.push(result.parametro);
        break;
    }
  }

  return summary;
}

/**
 * Convierte valor entre unidades
 */
export function convertUnit(
  valor: number,
  unidadOrigen: MeasurementUnit | string,
  unidadDestino: MeasurementUnit | string
): UnitConversionResult | null {
  if (unidadOrigen === unidadDestino) {
    return {
      valorOriginal: valor,
      unidadOriginal: unidadOrigen,
      valorConvertido: valor,
      unidadDestino,
      factorConversion: 1,
    };
  }

  const factor = CONVERSION_FACTORS[unidadOrigen]?.[unidadDestino];
  
  if (factor === undefined) {
    return null; // Conversión no soportada
  }

  // Manejar casos especiales de temperatura con offset
  let valorConvertido = valor * factor;
  
  if (unidadOrigen === MeasurementUnit.CELSIUS && unidadDestino === MeasurementUnit.FAHRENHEIT) {
    valorConvertido = valor * 1.8 + 32;
  } else if (unidadOrigen === MeasurementUnit.CELSIUS && unidadDestino === MeasurementUnit.KELVIN) {
    valorConvertido = valor + 273.15;
  }

  return {
    valorOriginal: valor,
    unidadOriginal: unidadOrigen,
    valorConvertido: Math.round(valorConvertido * 100) / 100,
    unidadDestino,
    factorConversion: factor,
  };
}

/**
 * Verifica si una serie de mediciones muestran tendencia
 */
export function detectTrend(
  valores: number[],
  umbralCambio: number = 10
): 'ESTABLE' | 'ASCENDENTE' | 'DESCENDENTE' | 'ERRATICO' {
  if (valores.length < 3) return 'ESTABLE';

  let ascending = 0;
  let descending = 0;

  for (let i = 1; i < valores.length; i++) {
    const cambio = ((valores[i] - valores[i - 1]) / valores[i - 1]) * 100;
    if (cambio > umbralCambio) ascending++;
    else if (cambio < -umbralCambio) descending++;
  }

  const total = valores.length - 1;
  const threshold = total * 0.6;

  if (ascending >= threshold) return 'ASCENDENTE';
  if (descending >= threshold) return 'DESCENDENTE';
  if (ascending > 0 && descending > 0 && ascending + descending > threshold) return 'ERRATICO';
  return 'ESTABLE';
}

/**
 * Calcula estadísticas de una serie de mediciones
 */
export function calculateMeasurementStats(valores: number[]): {
  promedio: number;
  minimo: number;
  maximo: number;
  desviacionEstandar: number;
  tendencia: string;
} {
  if (valores.length === 0) {
    return {
      promedio: 0,
      minimo: 0,
      maximo: 0,
      desviacionEstandar: 0,
      tendencia: 'SIN_DATOS',
    };
  }

  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  
  const varianza = valores.reduce((acc, val) => acc + Math.pow(val - promedio, 2), 0) / valores.length;
  const desviacionEstandar = Math.sqrt(varianza);

  return {
    promedio: Math.round(promedio * 100) / 100,
    minimo,
    maximo,
    desviacionEstandar: Math.round(desviacionEstandar * 100) / 100,
    tendencia: detectTrend(valores),
  };
}
