import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en ubicaciones_bodega.
 */
export class CreateUbicacionesBodegaDto {
  @ApiProperty()
  @IsString()
  codigo_ubicacion!: string;

  @ApiProperty()
  @IsString()
  zona!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pasillo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estante?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nivel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
