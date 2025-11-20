import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export enum TipoMotorEnum {
  COMBUSTION = 'COMBUSTION',
  ELECTRICO = 'ELECTRICO',
}

export enum TipoCombustibleEnum {
  DIESEL = 'DIESEL',
  GASOLINA = 'GASOLINA',
  GAS_NATURAL = 'GAS_NATURAL',
  GLP = 'GLP',
  DUAL = 'DUAL',
  BIODIESEL = 'BIODIESEL',
}

export enum TipoArranqueEnum {
  ELECTRICO = 'ELECTRICO',
  MANUAL = 'MANUAL',
  NEUMATICO = 'NEUMATICO',
  HIDRAULICO = 'HIDRAULICO',
}

export enum NumeroFasesEnum {
  MONOFASICO = 'MONOFASICO',
  TRIFASICO = 'TRIFASICO',
}

export enum ClaseAislamientoEnum {
  A = 'A',
  B = 'B',
  F = 'F',
  H = 'H',
}

export class CreateEquipoMotorDto {
  @IsInt()
  @IsPositive()
  id_equipo!: number;

  @IsEnum(TipoMotorEnum)
  tipo_motor!: TipoMotorEnum;

  @IsString()
  @MaxLength(100)
  marca_motor!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_motor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_motor?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  potencia_hp?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  potencia_kw?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  velocidad_nominal_rpm?: number;

  @IsOptional()
  @IsEnum(TipoCombustibleEnum)
  tipo_combustible?: TipoCombustibleEnum;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numero_cilindros?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cilindrada_cc?: number;

  @IsOptional()
  @IsBoolean()
  tiene_turbocargador?: boolean;

  @IsOptional()
  @IsEnum(TipoArranqueEnum)
  tipo_arranque?: TipoArranqueEnum;

  @IsOptional()
  @IsInt()
  @IsPositive()
  voltaje_arranque_vdc?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amperaje_arranque?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numero_baterias?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_bateria?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacidad_bateria_ah?: number;

  @IsOptional()
  @IsBoolean()
  tiene_radiador?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  radiador_alto_cm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  radiador_ancho_cm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  radiador_espesor_cm?: number;

  @IsOptional()
  @IsBoolean()
  tiene_cargador_bateria?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_cargador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_cargador?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amperaje_cargador?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacidad_aceite_litros?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_aceite?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacidad_refrigerante_litros?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipo_refrigerante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  voltaje_operacion_vac?: string;

  @IsOptional()
  @IsEnum(NumeroFasesEnum)
  numero_fases?: NumeroFasesEnum;

  @IsOptional()
  @IsInt()
  @IsPositive()
  frecuencia_hz?: number;

  @IsOptional()
  @IsEnum(ClaseAislamientoEnum)
  clase_aislamiento?: ClaseAislamientoEnum;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  grado_proteccion_ip?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amperaje_nominal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  factor_potencia?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  año_fabricacion?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  metadata?: any;
}
