/**
 * Tipos para configuración de parámetros de equipos
 * 
 * Sistema de resolución en cascada:
 * 1. equipos.config_parametros (override específico)
 * 2. plantillas_parametros.configuracion (plantilla por marca/modelo)
 * 3. parametros_medicion (catálogo global)
 */

/**
 * Configuración de unidades de medida por tipo de magnitud
 */
export interface UnidadesConfig {
    temperatura?: string;  // °C, °F, K
    presion?: string;      // PSI, bar, kPa, atm
    voltaje?: string;      // V
    frecuencia?: string;   // Hz
    corriente?: string;    // A
    velocidad?: string;    // RPM
    vibracion?: string;    // mm/s
    potencia?: string;     // kW, HP
}

/**
 * Rango de valores para un parámetro específico
 */
export interface RangoParametro {
    min_normal?: number;
    max_normal?: number;
    min_critico?: number;
    max_critico?: number;
    valor_ideal?: number;
}

/**
 * Valores nominales del equipo
 */
export interface ParametrosNominales {
    RPM_NOMINAL?: number;
    FRECUENCIA_NOMINAL?: number;
    VOLTAJE_NOMINAL?: number;
    POTENCIA_NOMINAL?: number;
    [key: string]: number | undefined;
}

/**
 * Estructura completa de configuración de parámetros
 */
export interface ConfigParametrosEquipo {
    unidades?: UnidadesConfig;
    rangos?: Record<string, RangoParametro>;
    parametros_nominales?: ParametrosNominales;
}

/**
 * Resultado de resolución de configuración con origen
 */
export interface ConfigResuelta {
    config: ConfigParametrosEquipo;
    origen: 'equipo' | 'plantilla' | 'global';
    idEquipo: number;
    idPlantilla?: number;
}

/**
 * Parámetro resuelto con todos sus valores
 */
export interface ParametroResuelto {
    codigo: string;
    nombre: string;
    unidad: string;
    rango: RangoParametro;
    origen: 'equipo' | 'plantilla' | 'global';
}

/**
 * Mapeo de tipos de magnitud a códigos de parámetro
 */
export const MAGNITUD_A_PARAMETROS: Record<string, string[]> = {
    temperatura: ['GEN_TEMP_REFRIGERANTE', 'GEN_TEMP_ACEITE', 'BOM_TEMPERATURA', 'TEMP'],
    presion: ['GEN_PRESION_ACEITE', 'BOM_PRESION_DESCARGA', 'BOM_PRESION_SUCCION', 'PRESION'],
    voltaje: ['GEN_VOLTAJE', 'BOM_VOLTAJE', 'VOLTAJE'],
    frecuencia: ['GEN_FRECUENCIA', 'FRECUENCIA'],
    corriente: ['GEN_CORRIENTE', 'BOM_AMPERAJE', 'CORRIENTE', 'AMPERAJE'],
    velocidad: ['GEN_RPM', 'RPM'],
    vibracion: ['BOM_VIBRACION', 'VIBRACION'],
};

/**
 * Unidades por defecto por tipo de magnitud
 */
export const UNIDADES_DEFAULT: UnidadesConfig = {
    temperatura: '°C',
    presion: 'PSI',
    voltaje: 'V',
    frecuencia: 'Hz',
    corriente: 'A',
    velocidad: 'RPM',
    vibracion: 'mm/s',
    potencia: 'kW',
};
