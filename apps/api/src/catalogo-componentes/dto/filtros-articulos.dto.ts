import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { destino_articulo_enum } from '@prisma/client';

export class FiltrosArticulosDto {
  @ApiPropertyOptional({ description: 'Búsqueda por texto (SKU, referencia, nombre, marca)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtro por destino operativo / arquetipo', enum: destino_articulo_enum })
  @IsOptional()
  @IsEnum(destino_articulo_enum)
  destino_articulo?: destino_articulo_enum;

  @ApiPropertyOptional({ description: 'ID de la categoría técnica / tipo de componente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_componente?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de proveedor vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_proveedor?: number;

  @ApiPropertyOptional({ description: 'Filtrar por marca (texto)' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de marca normalizada' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_marca?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de categoría taxonómica' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_categoria?: number;

  @ApiPropertyOptional({ description: 'Filtrar por código de unidad de medida normalizada' })
  @IsOptional()
  @IsString()
  codigo_unidad_medida?: string;

  @ApiPropertyOptional({ description: 'Solo artículos comprables' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  es_comprable?: boolean;

  @ApiPropertyOptional({ description: 'Solo artículos inventariables' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  es_inventariable?: boolean;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Paginación: número de página (1-indexado)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Paginación: registros a omitir', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ description: 'Paginación: límite de registros', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
