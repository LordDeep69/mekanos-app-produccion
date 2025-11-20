// DTO - Crear Item Componente Cotización

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItemComponenteDto {
  @ApiProperty({
    description: 'ID del componente del catálogo (opcional si es manual)',
    example: 15,
    required: false,
  })
  @IsOptional()
  @IsInt()
  id_componente?: number;

  @ApiProperty({
    description: 'ID del tipo de componente',
    example: 3,
  })
  @IsNotEmpty()
  @IsInt()
  id_tipo_componente!: number;

  @ApiProperty({
    description: 'Descripción del componente',
    example: 'Filtro de aceite motor Perkins 2806',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  descripcion!: string;

  @ApiProperty({
    description: 'Referencia o código de catálogo',
    example: 'CH10929',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_manual?: string;

  @ApiProperty({
    description: 'Marca del componente',
    example: 'Perkins Original',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_manual?: string;

  @ApiProperty({
    description: 'Cantidad de componentes',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'unidad',
    required: false,
  })
  @IsOptional()
  @IsString()
  unidad?: string;

  @ApiProperty({
    description: 'Precio unitario del componente',
    example: 85000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @ApiProperty({
    description: 'Porcentaje de descuento (0-100)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiProperty({
    description: 'Meses de garantía del componente',
    example: 6,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  garantia_meses?: number;

  @ApiProperty({
    description: 'Observaciones sobre la garantía',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiProperty({
    description: 'Observaciones adicionales',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({
    description: 'Orden de visualización',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden_item?: number;

  @ApiProperty({
    description: 'ID usuario que registra',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  registrado_por?: number;
}
