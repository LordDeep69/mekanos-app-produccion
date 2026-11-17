import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en items_cotizacion_componentes.
 */
export class CreateItemsCotizacionComponentesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_cotizacion!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_componente?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_tipo_componente!: number;

  @ApiProperty()
  @IsString()
  descripcion!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia_manual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_manual?: string;

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
  @Type(() => Number)
  @IsInt()
  garantia_meses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

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
