import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    ValidateIf,
} from 'class-validator';

/**
 * ENUMs para gastos_orden
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

export enum EstadoAprobacionGastoEnum {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

/**
 * DTO para crear gasto de orden
 * Tabla 13/14 - FASE 3
 * 22 campos, 5 FKs, 2 ENUMs, 1 Decimal
 */
export class CreateGastoOrdenDto {
  @ApiProperty({ description: 'ID de la orden de servicio', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  idOrdenServicio!: number;

  @ApiProperty({ description: 'Tipo de gasto', enum: TipoGastoEnum, example: 'TRANSPORTE' })
  @IsEnum(TipoGastoEnum)
  @IsNotEmpty()
  tipoGasto!: TipoGastoEnum;

  @ApiProperty({ description: 'Descripción del gasto', example: 'Transporte a sede cliente', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  descripcion!: string;

  @ApiProperty({ description: 'Justificación del gasto', example: 'Requerido para desplazamiento a sede remota' })
  @IsString()
  @IsNotEmpty()
  justificacion!: string;

  @ApiProperty({ description: 'Valor del gasto (Decimal > 0)', example: 50000.00 })
  @IsNumber()
  @IsPositive()
  valor!: number;

  @ApiPropertyOptional({ description: 'Tiene comprobante', example: true })
  @IsOptional()
  @IsBoolean()
  tieneComprobante?: boolean;

  @ApiPropertyOptional({ description: 'Número de comprobante (requerido si tieneComprobante=true)', example: 'FAC-001234' })
  @ValidateIf(o => o.tieneComprobante === true)
  @IsString()
  @MaxLength(100)
  numeroComprobante?: string;

  @ApiPropertyOptional({ description: 'Nombre del proveedor', example: 'Taxi Express', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  proveedor?: string;

  @ApiPropertyOptional({ description: 'Ruta al comprobante', example: '/uploads/comprobantes/fac-001234.pdf', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rutaComprobante?: string;

  @ApiPropertyOptional({ description: 'Estado de aprobación (PENDIENTE por defecto)', enum: EstadoAprobacionGastoEnum, example: 'PENDIENTE' })
  @IsOptional()
  @IsEnum(EstadoAprobacionGastoEnum)
  estadoAprobacion?: EstadoAprobacionGastoEnum;

  @ApiPropertyOptional({ description: 'Observaciones de aprobación', example: 'Aprobado por supervisor' })
  @IsOptional()
  @IsString()
  observacionesAprobacion?: string;

  @ApiPropertyOptional({ description: 'ID del empleado que generó el gasto', example: 1 })
  @IsOptional()
  @IsNumber()
  generadoPor?: number;

  @ApiPropertyOptional({ description: 'Observaciones', example: 'Servicio urgente' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Fecha del gasto', example: '2025-11-25T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  fechaGasto?: string;

  @ApiPropertyOptional({ description: 'ID del usuario que registra', example: 1 })
  @IsOptional()
  @IsNumber()
  registradoPor?: number;
}
