import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum TipoRecepcionEnum {
  PARCIAL = 'PARCIAL',
  FINAL = 'FINAL',
  UNICA = 'UNICA',
}

export enum CalidadRecepcionEnum {
  OK = 'OK',
  PARCIAL_DA_ADO = 'PARCIAL_DA_ADO',
  RECHAZADO = 'RECHAZADO',
}

export class ItemRecepcionLoteDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_detalle_orden!: number;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  cantidad_recibida!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  cantidad_aceptada!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  cantidad_rechazada!: number;

  @IsEnum(CalidadRecepcionEnum)
  @IsOptional()
  calidad?: CalidadRecepcionEnum;

  @IsInt()
  @IsPositive()
  @IsOptional()
  id_ubicacion_destino?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  costo_unitario_real?: number;
}

export class RegistrarRecepcionLoteDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_orden_compra!: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  id_ubicacion_destino?: number;

  @IsString()
  @IsOptional()
  guia_remision?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemRecepcionLoteDto)
  @IsNotEmpty()
  items!: ItemRecepcionLoteDto[];
}
