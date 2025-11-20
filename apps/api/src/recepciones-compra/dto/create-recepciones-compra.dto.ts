import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Min,
} from 'class-validator';

enum TipoRecepcionEnum {
  PARCIAL = 'PARCIAL',
  FINAL = 'FINAL',
  UNICA = 'UNICA',
}

enum CalidadRecepcionEnum {
  OK = 'OK',
  PARCIAL_DA_ADO = 'PARCIAL_DA_ADO',
  RECHAZADO = 'RECHAZADO',
}

export class CreateRecepcionesCompraDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id_orden_compra!: number;

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

  @IsEnum(TipoRecepcionEnum)
  @IsNotEmpty()
  tipo_recepcion!: TipoRecepcionEnum;

  @IsEnum(CalidadRecepcionEnum)
  @IsNotEmpty()
  calidad!: CalidadRecepcionEnum;

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
