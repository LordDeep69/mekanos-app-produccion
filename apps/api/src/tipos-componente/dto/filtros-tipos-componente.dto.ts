import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FiltrosTiposComponenteDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Registros por página', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Filtrar por categoría' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ description: 'Filtrar por aplicación (EQUIPO, COMPONENTE, GENERAL)' })
  @IsOptional()
  @IsString()
  aplica_a?: string;

  @ApiPropertyOptional({ description: 'Filtrar por es consumible' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true : undefined))
  @IsBoolean()
  es_consumible?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por es inventariable' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true : undefined))
  @IsBoolean()
  es_inventariable?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true : undefined))
  @IsBoolean()
  activo?: boolean;
}
