import { IsString, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoNotificacionEnum {
  ORDEN_ASIGNADA = 'ORDEN_ASIGNADA',
  ORDEN_COMPLETADA = 'ORDEN_COMPLETADA',
  ORDEN_VENCIDA = 'ORDEN_VENCIDA',
  COTIZACION_APROBADA = 'COTIZACION_APROBADA',
  COTIZACION_RECHAZADA = 'COTIZACION_RECHAZADA',
  CONTRATO_POR_VENCER = 'CONTRATO_POR_VENCER',
  SERVICIO_PROGRAMADO = 'SERVICIO_PROGRAMADO',
  ALERTA_MEDICION = 'ALERTA_MEDICION',
  RECORDATORIO = 'RECORDATORIO',
  SISTEMA = 'SISTEMA',
}

export enum PrioridadNotificacionEnum {
  BAJA = 'BAJA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

export class CreateNotificacionDto {
  @ApiProperty({ description: 'ID del usuario destino' })
  @IsNumber()
  idUsuarioDestino: number;

  @ApiProperty({ enum: TipoNotificacionEnum, description: 'Tipo de notificación' })
  @IsEnum(TipoNotificacionEnum)
  tipo: TipoNotificacionEnum;

  @ApiProperty({ description: 'Título de la notificación' })
  @IsString()
  titulo: string;

  @ApiProperty({ description: 'Mensaje de la notificación' })
  @IsString()
  mensaje: string;

  @ApiPropertyOptional({ enum: PrioridadNotificacionEnum, default: 'NORMAL' })
  @IsOptional()
  @IsEnum(PrioridadNotificacionEnum)
  prioridad?: PrioridadNotificacionEnum;

  @ApiPropertyOptional({ description: 'ID de la entidad relacionada' })
  @IsOptional()
  @IsNumber()
  idEntidadRelacionada?: number;

  @ApiPropertyOptional({ description: 'Tipo de entidad relacionada' })
  @IsOptional()
  @IsString()
  tipoEntidadRelacionada?: string;

  @ApiPropertyOptional({ description: 'URL de acción al hacer clic' })
  @IsOptional()
  @IsString()
  urlAccion?: string;

  @ApiPropertyOptional({ description: 'Datos extra en formato JSON' })
  @IsOptional()
  @IsObject()
  datosExtra?: Record<string, any>;
}

