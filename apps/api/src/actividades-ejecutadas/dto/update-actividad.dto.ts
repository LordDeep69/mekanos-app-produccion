import { IsInt, IsOptional, IsString, IsBoolean, MaxLength, IsEnum, IsISO8601 } from 'class-validator';
import { EstadoActividadEnum } from './create-actividad.dto';

/**
 * DTO para actualizar actividad ejecutada
 * Todos los campos opcionales excepto ID
 */

export class UpdateActividadDto {
  @IsInt()
  id_actividad_ejecutada!: number;

  @IsOptional()
  @IsInt()
  id_orden_servicio?: number;

  @IsOptional()
  @IsInt()
  id_actividad_catalogo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion_manual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sistema?: string;

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
