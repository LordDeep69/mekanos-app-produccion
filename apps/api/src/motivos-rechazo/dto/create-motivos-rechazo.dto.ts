import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en motivos_rechazo.
 */
export class CreateMotivosRechazoDto {
  @ApiProperty()
  @IsString()
  codigo_motivo!: string;

  @ApiProperty()
  @IsString()
  nombre_motivo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiere_observacion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;

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
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;
}
