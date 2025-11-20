import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { CriterioIntervaloEnum } from './create-tipos-equipo.dto';

export class UpdateTiposEquipoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  nombre_tipo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  tiene_motor?: boolean;

  @IsBoolean()
  @IsOptional()
  tiene_generador?: boolean;

  @IsBoolean()
  @IsOptional()
  tiene_bomba?: boolean;

  @IsBoolean()
  @IsOptional()
  requiere_horometro?: boolean;

  @IsBoolean()
  @IsOptional()
  permite_mantenimiento_tipo_a?: boolean;

  @IsBoolean()
  @IsOptional()
  permite_mantenimiento_tipo_b?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  intervalo_tipo_a_dias?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  intervalo_tipo_a_horas?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  intervalo_tipo_b_dias?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  intervalo_tipo_b_horas?: number;

  @IsEnum(CriterioIntervaloEnum)
  @IsOptional()
  criterio_intervalo?: CriterioIntervaloEnum;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  formato_ficha_tecnica?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  formato_mantenimiento_tipo_a?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  formato_mantenimiento_tipo_b?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orden?: number;

  @IsBoolean()
  @IsOptional()
  disponible?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

