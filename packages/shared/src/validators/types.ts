/**
 * Tipos para validación de mediciones industriales
 */

/**
 * Niveles de alerta para mediciones fuera de rango
 */
export enum AlertLevel {
  /** Dentro del rango óptimo */
  NORMAL = 'NORMAL',
  /** Fuera de rango óptimo pero dentro de tolerancia */
  WARNING = 'WARNING',
  /** Fuera de tolerancia - Requiere acción correctiva */
  CRITICAL = 'CRITICAL',
}

/**
 * Tipos de unidades de medición soportadas
 */
export enum MeasurementUnit {
  // Temperatura
  CELSIUS = '°C',
  FAHRENHEIT = '°F',
  KELVIN = 'K',
  
  // Presión
  PSI = 'psi',
  BAR = 'bar',
  KPA = 'kPa',
  
  // Velocidad
  RPM = 'rpm',
  HZ = 'Hz',
  
  // Voltaje
  VOLTIOS = 'V',
  KILOVOLTIOS = 'kV',
  
  // Corriente
  AMPERIOS = 'A',
  MILIAMPERIOS = 'mA',
  
  // Resistencia
  OHMIOS = 'Ω',
  MEGAOHMIOS = 'MΩ',
  
  // Potencia
  VATIOS = 'W',
  KILOVATIOS = 'kW',
  CABALLOS_FUERZA = 'HP',
  
  // Flujo
  LITROS_MINUTO = 'L/min',
  GALONES_MINUTO = 'GPM',
  METROS_CUBICOS_HORA = 'm³/h',
  
  // Vibración
  MM_S = 'mm/s',
  IN_S = 'in/s',
  G = 'g',
  
  // Tiempo
  HORAS = 'h',
  MINUTOS = 'min',
  SEGUNDOS = 's',
  
  // Otros
  PORCENTAJE = '%',
  DECIBELIOS = 'dB',
  GRADOS = '°',
}

/**
 * Categorías de parámetros de medición
 */
export enum MeasurementCategory {
  TEMPERATURA = 'TEMPERATURA',
  PRESION = 'PRESION',
  VIBRACION = 'VIBRACION',
  ELECTRICO = 'ELECTRICO',
  FLUJO = 'FLUJO',
  NIVEL = 'NIVEL',
  RPM = 'RPM',
  OTRO = 'OTRO',
}

/**
 * Definición de rango para un parámetro
 */
export interface RangeDefinition {
  /** Nombre del parámetro */
  parametro: string;
  /** Categoría del parámetro */
  categoria: MeasurementCategory;
  /** Unidad de medida */
  unidad: MeasurementUnit | string;
  /** Valor mínimo normal */
  minNormal: number;
  /** Valor máximo normal */
  maxNormal: number;
  /** Valor mínimo de advertencia (por debajo es crítico) */
  minWarning?: number;
  /** Valor máximo de advertencia (por encima es crítico) */
  maxWarning?: number;
  /** Valor absoluto mínimo (por debajo es crítico) */
  minCritical?: number;
  /** Valor absoluto máximo (por encima es crítico) */
  maxCritical?: number;
  /** Descripción del parámetro */
  descripcion?: string;
}

/**
 * Resultado de validación de medición
 */
export interface MeasurementValidationResult {
  /** Es válido el valor */
  isValid: boolean;
  /** Nivel de alerta */
  alertLevel: AlertLevel;
  /** Valor medido */
  valor: number;
  /** Nombre del parámetro */
  parametro: string;
  /** Unidad de medida */
  unidad: string;
  /** Mensaje descriptivo */
  mensaje: string;
  /** Porcentaje de desviación del rango normal */
  desviacionPorcentaje?: number;
  /** Rango de referencia */
  rango?: {
    minNormal: number;
    maxNormal: number;
    minCritical?: number;
    maxCritical?: number;
  };
  /** Timestamp de la validación */
  validadoEn: Date;
  /** Acciones recomendadas si hay alerta */
  accionesRecomendadas?: string[];
}

/**
 * Opciones para validar medición
 */
export interface ValidateMeasurementOptions {
  /** Parámetro a validar */
  parametro: string;
  /** Valor medido */
  valor: number;
  /** Unidad de medida */
  unidad?: string;
  /** ID del equipo (para contexto) */
  equipoId?: string;
  /** Tipo de equipo */
  tipoEquipo?: 'MOTOR' | 'GENERADOR' | 'BOMBA' | 'OTRO';
  /** Definición de rango personalizada (override defaults) */
  rangoPersonalizado?: RangeDefinition;
}

/**
 * Resultado de conversión de unidades
 */
export interface UnitConversionResult {
  valorOriginal: number;
  unidadOriginal: string;
  valorConvertido: number;
  unidadDestino: string;
  factorConversion: number;
}
