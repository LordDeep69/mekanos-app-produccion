import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsEnum,
  IsISO8601,
  ValidateIf,
} from 'class-validator';

/**
 * DTO para crear actividad ejecutada
 * FASE 4.1 - Validación modo dual: Catálogo XOR Manual
 */

export enum EstadoActividadEnum {
  B = 'B', // Bueno
  R = 'R', // Regular
  M = 'M', // Malo
  NF = 'NF', // No Funcional
  NA = 'NA', // No Aplica
}

export class CreateActividadDto {
  @IsInt()
  id_orden_servicio!: number;

  // MODO CATÁLOGO: id_actividad_catalogo (preferido para preventivos)
  @IsOptional()
  @IsInt()
  @ValidateIf((o) => !o.descripcion_manual)
  id_actividad_catalogo?: number;

  // MODO MANUAL: descripcion_manual + sistema (correctivos/emergencias)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ValidateIf((o) => !o.id_actividad_catalogo)
  descripcion_manual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ValidateIf((o) => !!o.descripcion_manual) // Requerido si modo manual
  sistema?: string;

  // Campos opcionales
  @IsOptional()
  @IsInt()
  orden_secuencia?: number;

  @IsOptional()
  @IsEnum(EstadoActividadEnum)
  estado?: EstadoActividadEnum;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  ejecutada?: boolean;

  @IsOptional()
  @IsISO8601()
  fecha_ejecucion?: string;

  @IsOptional()
  @IsInt()
  tiempo_ejecucion_minutos?: number;

  @IsOptional()
  @IsBoolean()
  requiere_evidencia?: boolean;

  @IsOptional()
  @IsBoolean()
  evidencia_capturada?: boolean;
}
