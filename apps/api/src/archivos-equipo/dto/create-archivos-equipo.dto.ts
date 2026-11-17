import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en archivos_equipo.
 */
export class CreateArchivosEquipoDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty()
  @IsString()
  tipo_archivo!: string;

  @ApiProperty()
  @IsString()
  nombre_archivo!: string;

  @ApiProperty()
  @IsString()
  nombre_original!: string;

  @ApiProperty()
  @IsString()
  ruta_archivo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extension_archivo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tama_o_bytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  es_publico?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden?: number;

  @ApiProperty()
  @IsString()
  hash_archivo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  metadata?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_subida?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  subido_por!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_modificacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modificado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_eliminacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eliminado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo_eliminacion?: string;
}
