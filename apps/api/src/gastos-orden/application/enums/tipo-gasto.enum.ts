/**
 * ENUM: Tipo de gasto
 * Tabla 13/14 - FASE 3
 * Valores: 7
 */
export enum TipoGastoEnum {
  TRANSPORTE = 'TRANSPORTE',
  PARQUEADERO = 'PARQUEADERO',
  PEAJE = 'PEAJE',
  ALIMENTACION = 'ALIMENTACION',
  CONSUMIBLE = 'CONSUMIBLE',
  HERRAMIENTA = 'HERRAMIENTA',
  OTRO = 'OTRO',
}

/**
 * ENUM: Estado de aprobación del gasto
 * Valores: 3
 */
export enum EstadoAprobacionGastoEnum {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}
