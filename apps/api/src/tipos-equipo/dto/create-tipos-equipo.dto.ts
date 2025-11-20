
/**
 * DTO para crear tipos_equipo
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
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

export enum CategoriaEquipoEnum {
  ENERGIA = 'ENERGIA',
  HIDRAULICA = 'HIDRAULICA',
  CLIMATIZACION = 'CLIMATIZACION',
  COMPRESION = 'COMPRESION',
  OTRO = 'OTRO',
}

export enum CriterioIntervaloEnum {
  DIAS = 'DIAS',
  HORAS = 'HORAS',
  LO_QUE_OCURRA_PRIMERO = 'LO_QUE_OCURRA_PRIMERO',
}

export class CreateTiposEquipoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  codigo_tipo: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre_tipo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(CategoriaEquipoEnum)
  categoria: CategoriaEquipoEnum;

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
  formato_ficha_tecnica: string;

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

  @IsObject()
  @IsOptional()
  metadata?: any;

  // creado_por se extrae del JWT usando @CurrentUser('id')
}
