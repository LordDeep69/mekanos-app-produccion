import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryCategoriaDto {
  @ApiPropertyOptional({
    description: 'Buscar por nombre, código o fragmento de la ruta jerárquica',
    example: 'filtro',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por categoría padre directa',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_padre?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nivel taxonómico en la jerarquía (1=Familias principales, 2=Subfamilias, etc.)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nivel?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  activo?: boolean = true;
}
