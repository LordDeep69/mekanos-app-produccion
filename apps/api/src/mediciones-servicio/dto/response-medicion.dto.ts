import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NivelAlertaEnum } from '../application/enums/nivel-alerta.enum';

/**
 * DTO de respuesta para medición de servicio - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 * 17 campos + 3 relaciones anidadas
 */

export class ResponseMedicionDto {
  @ApiProperty({ description: 'ID único de la medición', example: 1 })
  idMedicion!: number;

  @ApiProperty({ description: 'ID de la orden de servicio', example: 1 })
  idOrdenServicio!: number;

  @ApiProperty({ description: 'ID del parámetro de medición', example: 1 })
  idParametroMedicion!: number;

  @ApiPropertyOptional({ description: 'Valor numérico medido (Decimal 12,2)', example: 220.5, type: 'number' })
  valorNumerico?: number;

  @ApiPropertyOptional({ description: 'Valor de texto para mediciones no numéricas', example: 'BUENO' })
  valorTexto?: string;

  @ApiPropertyOptional({ description: 'Unidad de medida (copiada automáticamente del catálogo)', example: 'V' })
  unidadMedida?: string;

  @ApiPropertyOptional({ description: 'Indicador si el valor está fuera del rango crítico (calculado por trigger BD)', example: false })
  fueraDeRango?: boolean;

  @ApiPropertyOptional({ 
    description: 'Nivel de alerta calculado por backend', 
    enum: ['OK', 'ADVERTENCIA', 'CRITICO'], 
    example: 'OK' 
  })
  nivelAlerta?: NivelAlertaEnum;

  @ApiPropertyOptional({ description: 'Mensaje de alerta generado por backend', example: 'Voltaje dentro del rango normal' })
  mensajeAlerta?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Temperatura ambiente en °C (Decimal 5,2)', example: 25.5, type: 'number' })
  temperaturaAmbiente?: number;

  @ApiPropertyOptional({ description: 'Humedad relativa en % (Decimal 5,2)', example: 65.2, type: 'number' })
  humedadRelativa?: number;

  @ApiPropertyOptional({ description: 'Fecha y hora de la medición', example: '2025-11-24T15:30:00Z' })
  fechaMedicion?: Date;

  @ApiPropertyOptional({ description: 'ID del empleado que realizó la medición', example: 1 })
  medidoPor?: number;

  @ApiPropertyOptional({ description: 'Instrumento usado para medir', example: 'Multímetro Fluke 87V' })
  instrumentoMedicion?: string;

  @ApiPropertyOptional({ description: 'Fecha de registro en el sistema', example: '2025-11-24T15:30:00Z' })
  fechaRegistro?: Date;

  // ======= RELACIONES ANIDADAS =======

  @ApiPropertyOptional({
    description: 'Empleado que realizó la medición (relación empleados - PLURAL)',
    type: 'object',
    properties: {
      idEmpleado: { type: 'number', example: 1 },
      codigoEmpleado: { type: 'string', example: 'EMP-00001' },
      cargo: { type: 'string', example: 'TECNICO_SENIOR' },
      esTecnico: { type: 'boolean', example: true },
    },
  })
  empleados?: {
    idEmpleado: number;
    codigoEmpleado: string;
    cargo: string;
    esTecnico: boolean;
  };

  @ApiPropertyOptional({
    description: 'Orden de servicio asociada (relación ordenes_servicio - singular)',
    type: 'object',
    properties: {
      idOrdenServicio: { type: 'number', example: 1 },
      numeroOrden: { type: 'string', example: 'OS-2025-001' },
      idCliente: { type: 'number', example: 1 },
      idEquipo: { type: 'number', example: 1 },
    },
  })
  ordenesServicio?: {
    idOrdenServicio: number;
    numeroOrden: string;
    idCliente: number;
    idEquipo: number;
  };

  @ApiPropertyOptional({
    description: 'Parámetro de medición del catálogo (relación parametros_medicion - singular)',
    type: 'object',
    properties: {
      idParametroMedicion: { type: 'number', example: 1 },
      codigoParametro: { type: 'string', example: 'VOLT-01' },
      nombreParametro: { type: 'string', example: 'Voltaje Línea 1' },
      unidadMedida: { type: 'string', example: 'V' },
      valorMinimoCritico: { type: 'number', example: 200 },
      valorMaximoCritico: { type: 'number', example: 240 },
    },
  })
  parametrosMedicion?: {
    idParametroMedicion: number;
    codigoParametro: string;
    nombreParametro: string;
    unidadMedida: string;
    valorMinimoCritico?: number;
    valorMaximoCritico?: number;
  };
}
