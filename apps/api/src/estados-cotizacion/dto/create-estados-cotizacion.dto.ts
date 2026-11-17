import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en estados_cotizacion.
 */
export class CreateEstadosCotizacionDto {
  @ApiProperty()
  @IsString()
  codigo_estado!: string;

  @ApiProperty()
  @IsString()
  nombre_estado!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permite_edicion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permite_eliminacion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  es_estado_final?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiere_aprobacion_interna?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color_hex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden_visualizacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;
}
