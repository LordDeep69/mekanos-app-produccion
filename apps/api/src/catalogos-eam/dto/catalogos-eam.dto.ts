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
  ValidateNested,
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

export class CreateUnidadBaseInlineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  simbolo: string;

  @IsOptional()
  @IsBoolean()
  permite_decimales?: boolean;
}

export class ActivarMagnitudBancoDto {
  @IsString()
  @IsNotEmpty()
  codigo_magnitud: string;
}

export class CreateMagnitudDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo_magnitud: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre_magnitud: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  unidad_base_codigo?: string;

  @IsOptional()
  @IsBoolean()
  es_sistema?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUnidadBaseInlineDto)
  unidad_base?: CreateUnidadBaseInlineDto;
}

export class UpdateMagnitudDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre_magnitud?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  unidad_base_codigo?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreateUnidadMedidaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  simbolo: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipo_magnitud?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_magnitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_magnitud?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factor_a?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factor_b?: number;

  @IsOptional()
  @IsBoolean()
  es_unidad_base?: boolean;

  @IsOptional()
  @IsBoolean()
  permite_decimales?: boolean;
}

export class UpdateUnidadMedidaDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  simbolo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_magnitud?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factor_a?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factor_b?: number;

  @IsOptional()
  @IsBoolean()
  es_unidad_base?: boolean;

  @IsOptional()
  @IsBoolean()
  permite_decimales?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
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

export class UpdateModuloTecnicoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre_modulo?: string;

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

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
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
  @MaxLength(40)
  rol_semantico_override?: string;

  @IsOptional()
  @IsString()
  valor_defecto?: string;
}

export class UpdateAtributoModuloDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  grupo_visual?: string;

  @IsOptional()
  @Type(() => Number)
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
  @MaxLength(40)
  rol_semantico_override?: string;

  @IsOptional()
  @IsString()
  valor_defecto?: string;
}

export class CreateArquetipoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo_tipo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre_tipo: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoria?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  requiere_horometro?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden?: number;
}

export class UpdateArquetipoDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo_tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo_corto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre_tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoria?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  requiere_horometro?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreatePlanArquetipoDto {
  @Type(() => Number)
  @IsInt()
  id_tipo_servicio: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre_plan: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  frecuencia_dias?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  frecuencia_uso?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  criterio_intervalo?: string;

  @IsOptional()
  @IsBoolean()
  es_plan_por_defecto?: boolean;
}

export class UpdatePlanArquetipoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre_plan?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  frecuencia_dias?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  frecuencia_uso?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  criterio_intervalo?: string;

  @IsOptional()
  @IsBoolean()
  es_plan_por_defecto?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
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

  @Type(() => Number)
  @IsInt()
  id_tipo_equipo: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre_comercial?: string;

  @IsOptional()
  especificaciones_base?: Record<string, any>;
}

export class UpdateModeloEquipoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_equipo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre_comercial?: string;

  @IsOptional()
  especificaciones_base?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
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

export class CreateTipoServicioEamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo_tipo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre_tipo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_equipo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duracion_estimada_horas?: number;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color_hex?: string;
}

