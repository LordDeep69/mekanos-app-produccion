import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateGastoOrdenDto, EstadoAprobacionGastoEnum } from './create-gasto-orden.dto';

/**
 * DTO para actualizar gasto de orden
 * Tabla 13/14 - FASE 3
 * Todos los campos son opcionales
 * Incluye campos de aprobación
 */
export class UpdateGastoOrdenDto extends PartialType(CreateGastoOrdenDto) {
  @ApiPropertyOptional({ description: 'Requiere aprobación (backend determina automáticamente)' })
  @IsOptional()
  requiereAprobacion?: boolean;

  @ApiPropertyOptional({ description: 'ID del usuario que aprueba', example: 1 })
  @IsOptional()
  @IsNumber()
  aprobadoPor?: number;

  @ApiPropertyOptional({ description: 'Fecha de aprobación', example: '2025-11-25T14:00:00Z' })
  @IsOptional()
  @IsDateString()
  fechaAprobacion?: string;

  @ApiPropertyOptional({ description: 'Estado de aprobación', enum: EstadoAprobacionGastoEnum, example: 'APROBADO' })
  @IsOptional()
  @IsEnum(EstadoAprobacionGastoEnum)
  estadoAprobacion?: EstadoAprobacionGastoEnum;

  @ApiPropertyOptional({ description: 'Observaciones de aprobación' })
  @IsOptional()
  @IsString()
  observacionesAprobacion?: string;

  @ApiPropertyOptional({ description: 'ID del usuario que modifica', example: 1 })
  @IsOptional()
  @IsNumber()
  modificadoPor?: number;
}
