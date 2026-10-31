import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ConvertirUomDto {
  @IsNumber()
  valor: number;

  @IsString()
  @IsNotEmpty()
  unidadOrigen: string;

  @IsString()
  @IsNotEmpty()
  unidadDestino: string;
}

export class CreateAtributoTecnicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  codigo_atributo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre_atributo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  tipo_control: string; // 'NUMERICO' | 'TEXTO' | 'BOOLEANO' | 'SELECT' | 'RANGO'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_magnitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_magnitud?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  unidad_defecto_codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  rol_semantico?: string;

  @IsOptional()
  @IsArray()
  opciones_json?: any;

  @IsOptional()
  validacion_json?: any;

  @IsOptional()
  @IsBoolean()
  es_sistema?: boolean;
}

export class UpdateAtributoTecnicoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre_atributo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipo_control?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_magnitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  unidad_defecto_codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  rol_semantico?: string;

  @IsOptional()
  opciones_json?: any;

  @IsOptional()
  validacion_json?: any;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreateModuloTecnicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo_modulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre_modulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color_ui?: string;
}

export class AsignarAtributoModuloDto {
  @IsInt()
  id_atributo: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  grupo_visual?: string;

  @IsOptional()
  @IsInt()
  orden_visual?: number;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @IsOptional()
  @IsBoolean()
  es_kpi?: boolean;

  @IsOptional()
  @IsBoolean()
  es_filtrable?: boolean;

  @IsOptional()
  @IsBoolean()
  visible_en_pdf?: boolean;

  @IsOptional()
  @IsString()
  valor_defecto?: string;
}

export class CreateModeloEquipoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  codigo_modelo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modelo: string;

  @IsInt()
  id_tipo_equipo: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre_comercial?: string;

  @IsOptional()
  especificaciones_base?: Record<string, any>;
}

export class CreateBomItemDto {
  @IsInt()
  id_componente: number;

  @IsNumber()
  @Min(0.01)
  cantidad_sugerida: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  rol_bom?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
