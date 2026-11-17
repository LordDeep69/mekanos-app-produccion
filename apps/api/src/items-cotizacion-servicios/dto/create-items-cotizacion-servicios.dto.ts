import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en items_cotizacion_servicios.
 */
export class CreateItemsCotizacionServiciosDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_cotizacion!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_servicio!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cantidad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unidad?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  precio_unitario!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  descuento_porcentaje?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion_personalizada?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justificacion_precio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden_item?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_registro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  registrado_por?: number;
}
