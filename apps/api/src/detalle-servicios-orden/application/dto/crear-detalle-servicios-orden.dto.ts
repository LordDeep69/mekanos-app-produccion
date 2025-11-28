import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { EstadoDetalleServicioEnum } from '../enums/estado-detalle-servicio.enum';

export class CrearDetalleServiciosOrdenDto {
  @IsInt()
  @IsNotEmpty()
  idOrdenServicio: number;

  @IsInt()
  @IsNotEmpty()
  idServicio: number;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  cantidad: number;

  @IsInt()
  @IsOptional()
  idTecnicoEjecutor?: number;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  fechaInicioServicio?: Date;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  fechaFinServicio?: Date;

  @IsInt()
  @IsOptional()
  @Min(1)
  duracionServicioMinutos?: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precioUnitario: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  descuentoPorcentaje?: number;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsBoolean()
  @IsOptional()
  tieneGarantiaServicio?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  mesesGarantiaServicio?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  justificacionPrecio?: string;

  @IsEnum(EstadoDetalleServicioEnum)
  @IsOptional()
  estadoServicio?: EstadoDetalleServicioEnum;

  @IsInt()
  @IsNotEmpty()
  registradoPor: number;
}
