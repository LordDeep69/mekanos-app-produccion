import {
    IsBoolean,
    IsDateString,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export enum ZonaGeograficaEnum {
  NORTE = 'NORTE',
  SUR = 'SUR',
  CENTRO = 'CENTRO',
  ORIENTE = 'ORIENTE',
  OCCIDENTE = 'OCCIDENTE',
  METROPOLITANA = 'METROPOLITANA',
  OTRA = 'OTRA',
}

export class CreateSedesClienteDto {
  @IsInt()
  id_cliente: number;

  @IsString()
  @MaxLength(200)
  nombre_sede: string;

  @IsString()
  @MaxLength(300)
  direccion_sede: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barrio_zona?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad_sede?: string = 'CARTAGENA';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento_sede?: string = 'BOLÍVAR';

  @IsOptional()
  @IsEnum(ZonaGeograficaEnum)
  zona_geografica?: ZonaGeograficaEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contacto_sede?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo_contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono_sede?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular_sede?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email_sede?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean = true;

  @IsOptional()
  @IsDateString()
  fecha_cierre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo_cierre?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
