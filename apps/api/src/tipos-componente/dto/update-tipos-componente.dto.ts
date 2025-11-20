import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import {
    AplicabilidadEnum,
    CategoriaComponenteEnum,
} from './create-tipos-componente.dto';

/**
 * DTO para actualizar tipo de componente
 * Todos los campos son opcionales
 */
export class UpdateTiposComponenteDto {
  @IsString()
  @MinLength(3, { message: 'El código debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  @IsOptional()
  codigo_tipo?: string;

  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @IsOptional()
  nombre_componente?: string;

  @IsEnum(CategoriaComponenteEnum, {
    message: 'La categoría debe ser FILTRO, CORREA, BATERIA, SELLO, RODAMIENTO, FLUIDO, ELECTRICO u OTRO',
  })
  @IsOptional()
  categoria?: CategoriaComponenteEnum;

  @IsString()
  @MaxLength(50, { message: 'La subcategoría no puede exceder 50 caracteres' })
  @IsOptional()
  subcategoria?: string;

  @IsBoolean()
  @IsOptional()
  es_consumible?: boolean;

  @IsBoolean()
  @IsOptional()
  es_inventariable?: boolean;

  @IsEnum(AplicabilidadEnum, {
    message: 'La aplicabilidad debe ser GENERADOR, BOMBA o AMBOS',
  })
  @IsOptional()
  aplica_a?: AplicabilidadEnum;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsInt()
  @IsOptional()
  modificado_por?: number;
}
