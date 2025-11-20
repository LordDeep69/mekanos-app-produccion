import {
    IsBoolean,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdateEquipoGeneradorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_generador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_generador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_generador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_alternador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_alternador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_alternador?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  potencia_kw?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  potencia_kva?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  factor_potencia?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voltaje_salida?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numero_fases?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  frecuencia_hz?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amperaje_nominal_salida?: number;

  @IsOptional()
  @IsBoolean()
  tiene_avr?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_avr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_avr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_avr?: string;

  @IsOptional()
  @IsBoolean()
  tiene_modulo_control?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_modulo_control?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_modulo_control?: string;

  @IsOptional()
  @IsBoolean()
  tiene_arranque_automatico?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacidad_tanque_principal_litros?: number;

  @IsOptional()
  @IsBoolean()
  tiene_tanque_auxiliar?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacidad_tanque_auxiliar_litros?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  clase_aislamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  grado_proteccion_ip?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  año_fabricacion?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @IsPositive()
  modificado_por?: number;
}
