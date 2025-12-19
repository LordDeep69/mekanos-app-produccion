import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';

/**
 * DTO para subir una medición desde offline
 */
export class SyncMedicionDto {
  @ApiProperty({ description: 'ID temporal local (UUID generado en móvil)' })
  @IsString()
  localId: string;

  @ApiPropertyOptional({ description: 'ID del servidor si ya fue sincronizado previamente' })
  @IsOptional()
  @IsInt()
  serverId?: number;

  @ApiPropertyOptional({ description: 'ID del orden-equipo (para multi-equipos, opcional)' })
  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number;

  @ApiProperty({ description: 'ID del parámetro de medición' })
  @IsInt()
  idParametroMedicion: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  valorNumerico?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valorTexto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperaturaAmbiente?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  humedadRelativa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instrumentoMedicion?: string;

  @ApiProperty({ description: 'Fecha/hora de la medición (ISO 8601)' })
  @IsDateString()
  fechaMedicion: string;
}

/**
 * DTO para subir una actividad ejecutada desde offline
 */
export class SyncActividadDto {
  @ApiProperty({ description: 'ID temporal local (UUID)' })
  @IsString()
  localId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  serverId?: number;

  @ApiPropertyOptional({ description: 'ID del orden-equipo (para multi-equipos, opcional)' })
  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number;

  @ApiProperty({ description: 'ID de la actividad del catálogo' })
  @IsInt()
  idActividadCatalogo: number;

  @ApiProperty({ description: 'Estado: PENDIENTE | EN_PROCESO | COMPLETADA | OMITIDA' })
  @IsString()
  estadoActividad: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  horaInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  horaFin?: string;
}

/**
 * DTO para subir un cambio de estado desde offline
 */
export class SyncCambioEstadoDto {
  @ApiProperty({ description: 'Nuevo estado solicitado' })
  @IsString()
  nuevoEstado: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Timestamp del cambio (ISO 8601)' })
  @IsDateString()
  timestamp: string;
}

/**
 * DTO para sincronizar una orden completa desde móvil
 */
export class SyncOrdenDto {
  @ApiProperty({ description: 'ID de la orden de servicio' })
  @IsInt()
  idOrdenServicio: number;

  @ApiProperty({ description: 'Versión local de la orden (para detección de conflictos)' })
  @IsInt()
  @Min(0)
  version: number;

  @ApiPropertyOptional({ description: 'Nuevo estado si hubo cambio' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncCambioEstadoDto)
  cambioEstado?: SyncCambioEstadoDto;

  @ApiPropertyOptional({ description: 'Trabajo realizado (texto libre)' })
  @IsOptional()
  @IsString()
  trabajoRealizado?: string;

  @ApiPropertyOptional({ description: 'Observaciones del técnico' })
  @IsOptional()
  @IsString()
  observacionesTecnico?: string;

  @ApiPropertyOptional({ description: 'Horas actualizadas del horómetro' })
  @IsOptional()
  @IsNumber()
  horasActualizadas?: number;

  @ApiPropertyOptional({ type: [SyncMedicionDto], description: 'Mediciones tomadas offline' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncMedicionDto)
  mediciones?: SyncMedicionDto[];

  @ApiPropertyOptional({ type: [SyncActividadDto], description: 'Actividades ejecutadas offline' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncActividadDto)
  actividades?: SyncActividadDto[];

  @ApiProperty({ description: 'Timestamp de última modificación local (ISO 8601)' })
  @IsDateString()
  lastModified: string;
}

/**
 * DTO para batch upload de múltiples órdenes
 */
export class SyncBatchUploadDto {
  @ApiProperty({ type: [SyncOrdenDto], description: 'Órdenes a sincronizar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOrdenDto)
  ordenes: SyncOrdenDto[];

  @ApiProperty({ description: 'ID del técnico que sincroniza' })
  @IsInt()
  tecnicoId: number;

  @ApiProperty({ description: 'Timestamp de inicio de sincronización (ISO 8601)' })
  @IsDateString()
  syncTimestamp: string;
}
