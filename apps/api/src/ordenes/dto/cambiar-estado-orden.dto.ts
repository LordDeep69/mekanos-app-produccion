import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Estados válidos para órdenes de servicio
 * Basado en: ordenes/domain/workflow-estados.ts
 */
export enum EstadoOrdenEnum {
  PROGRAMADA = 'PROGRAMADA',
  ASIGNADA = 'ASIGNADA',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  APROBADA = 'APROBADA',
  CANCELADA = 'CANCELADA',
  EN_ESPERA_REPUESTO = 'EN_ESPERA_REPUESTO',
}

/**
 * DTO para cambiar estado de una orden
 * Endpoint: PATCH /ordenes/:id/estado
 */
export class CambiarEstadoOrdenDto {
  @ApiProperty({
    description: 'Nuevo estado de la orden',
    enum: EstadoOrdenEnum,
    example: 'EN_PROCESO',
  })
  @IsEnum(EstadoOrdenEnum, {
    message: `Estado inválido. Valores permitidos: ${Object.values(EstadoOrdenEnum).join(', ')}`,
  })
  nuevoEstado: EstadoOrdenEnum;

  @ApiPropertyOptional({
    description: 'Motivo o razón del cambio de estado',
    example: 'Técnico llegó a sitio y comenzó trabajo',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales del cambio',
    example: 'Cliente presente durante la visita',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'ID del técnico (requerido para transición a ASIGNADA)',
    example: 1,
  })
  @IsOptional()
  tecnicoId?: number;

  @ApiPropertyOptional({
    description: 'ID del usuario que aprueba (requerido para transición a APROBADA)',
    example: 1,
  })
  @IsOptional()
  aprobadorId?: number;
}
