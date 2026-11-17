import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en componentes_equipo.
 */
export class CreateComponenteEquipoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_tipo_componente!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_componente?: number;

  @ApiProperty()
  @IsString()
  posicion_descripcion!: string;

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
  @IsInt()
  unidades_por_cambio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  especificaciones_adicionales?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_instalacion_inicial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_ultimo_cambio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_desactivacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo_desactivacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modificado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_modificacion?: string;
}
