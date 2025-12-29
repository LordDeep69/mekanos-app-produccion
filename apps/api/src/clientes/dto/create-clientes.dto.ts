import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested
} from 'class-validator';

// Enums para tipo de identificación y tipo de persona
export enum TipoIdentificacionEnum {
  CC = 'CC',
  CE = 'CE',
  NIT = 'NIT',
  PASAPORTE = 'PASAPORTE',
  TI = 'TI',
  RC = 'RC',
}

export enum TipoPersonaEnum {
  NATURAL = 'NATURAL',
  JURIDICA = 'JURIDICA',
}

export enum TipoClienteEnum {
  RESIDENCIAL = 'RESIDENCIAL',
  COMERCIAL = 'COMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  HOSPITALARIO = 'HOSPITALARIO',
  EDUCATIVO = 'EDUCATIVO',
  GUBERNAMENTAL = 'GUBERNAMENTAL',
  HOTELERO = 'HOTELERO',
  EDIFICIO_RESIDENCIAL = 'EDIFICIO_RESIDENCIAL',
  OTRO = 'OTRO',
}

export enum PeriodicidadMantenimientoEnum {
  MENSUAL = 'MENSUAL',
  BIMESTRAL = 'BIMESTRAL',
  TRIMESTRAL = 'TRIMESTRAL',
  CUATRIMESTRAL = 'CUATRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
  POR_SOLICITUD = 'POR_SOLICITUD',
  SIN_DEFINIR = 'SIN_DEFINIR',
}

/**
 * DTO anidado para crear persona junto con el cliente
 */
export class CreatePersonaNestedDto {
  @IsEnum(TipoIdentificacionEnum)
  @IsNotEmpty()
  tipo_identificacion: TipoIdentificacionEnum;

  @IsString()
  @IsNotEmpty()
  numero_identificacion: string;

  @IsEnum(TipoPersonaEnum)
  @IsOptional()
  tipo_persona?: TipoPersonaEnum = TipoPersonaEnum.JURIDICA;

  @IsOptional()
  @IsString()
  primer_nombre?: string;

  @IsOptional()
  @IsString()
  segundo_nombre?: string;

  @IsOptional()
  @IsString()
  primer_apellido?: string;

  @IsOptional()
  @IsString()
  segundo_apellido?: string;

  @IsOptional()
  @IsString()
  razon_social?: string;

  @IsOptional()
  @IsString()
  nombre_comercial?: string;

  @IsOptional()
  @IsString()
  representante_legal?: string;

  @IsOptional()
  @IsString()
  cedula_representante?: string;

  @IsOptional()
  @IsEmail()
  email_principal?: string;

  @IsOptional()
  @IsString()
  telefono_principal?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  direccion_principal?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  departamento?: string;
}

export class CreateClientesDto {
  @IsOptional()
  @IsInt()
  id_persona?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePersonaNestedDto)
  persona?: CreatePersonaNestedDto;

  @IsOptional()
  @IsEnum(TipoClienteEnum)
  tipo_cliente?: TipoClienteEnum = TipoClienteEnum.COMERCIAL;

  @IsOptional()
  @IsDateString()
  fecha_inicio_servicio?: string;

  @IsOptional()
  @IsEnum(PeriodicidadMantenimientoEnum)
  periodicidad_mantenimiento?: PeriodicidadMantenimientoEnum =
    PeriodicidadMantenimientoEnum.SIN_DEFINIR;

  @IsOptional()
  @IsInt()
  id_firma_administrativa?: number;

  @IsOptional()
  @IsInt()
  id_asesor_asignado?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  descuento_autorizado?: number = 0;

  @IsOptional()
  @IsBoolean()
  tiene_credito?: boolean = false;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  limite_credito?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_credito?: number = 0;

  @IsOptional()
  @IsBoolean()
  cliente_activo?: boolean = true;

  @IsOptional()
  @IsDateString()
  fecha_ultimo_servicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_proximo_servicio?: string;

  @IsOptional()
  @IsBoolean()
  tiene_acceso_portal?: boolean = false;

  @IsOptional()
  @IsDateString()
  fecha_activacion_portal?: string;

  @IsOptional()
  @IsString()
  observaciones_servicio?: string;

  @IsOptional()
  @IsString()
  requisitos_especiales?: string;
}
