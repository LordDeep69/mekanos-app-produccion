import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Manifiesto de integridad de registros delta sincronizados antes del cierre atómico.
 * Permite al backend verificar que ningún delta quedó sin llegar antes de cerrar la orden.
 */
export class FinalizarCommitManifestDto {
  @ApiPropertyOptional({
    description: 'UUIDs de actividades ejecutadas activas que el móvil espera en BD',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actividadesUuids?: string[];

  @ApiPropertyOptional({
    description: 'UUIDs de mediciones activas que el móvil espera en BD',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicionesUuids?: string[];

  @ApiPropertyOptional({
    description: 'UUIDs de evidencias fotográficas activas que el móvil espera en BD',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenciasUuids?: string[];

  @ApiPropertyOptional({
    description: 'UUIDs de pendientes técnicos activos que el móvil espera en BD',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pendientesUuids?: string[];

  @ApiPropertyOptional({
    description: 'Tipos de firma que el móvil espera confirmados (TECNICO, CLIENTE)',
    type: [String],
    example: ['TECNICO', 'CLIENTE'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  firmasTipos?: string[];
}

/**
 * DTO de cierre final armónico (Fase 3 · `POST /api/ordenes/:id/finalizar-commit`).
 *
 * A diferencia de `finalizar-completo` (legacy v1), este endpoint NO recibe blobs Base64 ni
 * ejecuta borrados destructivos (`deleteMany`). Consolida el estado de los deltas ya
 * sincronizados vía Carril 1 (`sync-delta`) y Carril 2 (`prepare-upload` -> Cloudinary/R2).
 */
export class FinalizarCommitDto {
  @ApiPropertyOptional({ description: 'Observaciones generales de cierre del servicio' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Hora de entrada al sitio (HH:mm)', example: '08:30' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  horaEntrada?: string;

  @ApiPropertyOptional({ description: 'Hora de salida del sitio (HH:mm)', example: '10:45' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  horaSalida?: string;

  @ApiPropertyOptional({ description: 'Razón de la falla para servicios correctivos' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  razonFalla?: string;

  @ApiPropertyOptional({
    description: 'true cuando es una corrección/resubida autorizada de una orden COMPLETADA',
  })
  @IsOptional()
  @IsBoolean()
  esResubida?: boolean;

  @ApiPropertyOptional({
    description: 'Modo de cierre (SOLO_DATOS por defecto; PDF/email desde Portal Admin)',
    enum: ['SOLO_DATOS', 'COMPLETO'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['SOLO_DATOS', 'COMPLETO'])
  modo?: 'SOLO_DATOS' | 'COMPLETO';

  @ApiPropertyOptional({ description: 'Email adicional opcional' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailAdicional?: string;

  @ApiPropertyOptional({ description: 'Identificador del dispositivo móvil que ejecuta el commit' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Manifiesto de clientUuids activos para validación de completitud antes de cerrar',
    type: FinalizarCommitManifestDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FinalizarCommitManifestDto)
  manifest?: FinalizarCommitManifestDto;
}
