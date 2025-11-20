import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength
} from 'class-validator';

/**
 * Enum para categorías de componente
 */
export enum CategoriaComponenteEnum {
  FILTRO = 'FILTRO',
  CORREA = 'CORREA',
  BATERIA = 'BATERIA',
  SELLO = 'SELLO',
  RODAMIENTO = 'RODAMIENTO',
  FLUIDO = 'FLUIDO',
  ELECTRICO = 'ELECTRICO',
  OTRO = 'OTRO',
}

/**
 * Enum para aplicabilidad del componente
 */
export enum AplicabilidadEnum {
  GENERADOR = 'GENERADOR',
  BOMBA = 'BOMBA',
  AMBOS = 'AMBOS',
}

/**
 * DTO para crear tipo de componente
 */
export class CreateTiposComponenteDto {
  @IsString()
  @MinLength(3, { message: 'El código debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  codigo_tipo: string;

  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre_componente: string;

  @IsEnum(CategoriaComponenteEnum, {
    message: 'La categoría debe ser FILTRO, CORREA, BATERIA, SELLO, RODAMIENTO, FLUIDO, ELECTRICO u OTRO',
  })
  categoria: CategoriaComponenteEnum;

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
  aplica_a: AplicabilidadEnum;

  @IsString()
  @IsOptional()
  descripcion?: string;

  // creado_por se extrae del JWT usando @CurrentUser('id')
}
