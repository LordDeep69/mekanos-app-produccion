import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMarcaDto {
  @ApiPropertyOptional({
    description: 'Término de búsqueda rápida para autocompletado en Combobox (nombre o slug)',
    example: 'cat',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Límite de resultados retornados (optimizado para Combobox)',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  activo?: boolean = true;

  @ApiPropertyOptional({
    description: 'Filtrar exclusivamente fabricantes OEM',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  es_fabricante_oem?: boolean;
}
