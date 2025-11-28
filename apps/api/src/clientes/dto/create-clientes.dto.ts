import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min
} from 'class-validator';

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

export class CreateClientesDto {
  @IsInt()
  id_persona: number;

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
