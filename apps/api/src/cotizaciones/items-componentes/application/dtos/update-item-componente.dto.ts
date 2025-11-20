// DTO - Actualizar Item Componente

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateItemComponenteDto {
  @ApiProperty({
    description: 'Descripción del componente',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @ApiProperty({
    description: 'Referencia o código',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_manual?: string;

  @ApiProperty({
    description: 'Marca del componente',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_manual?: string;

  @ApiProperty({
    description: 'Cantidad',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiProperty({
    description: 'Unidad de medida',
    required: false,
  })
  @IsOptional()
  @IsString()
  unidad?: string;

  @ApiProperty({
    description: 'Precio unitario',
    example: 90000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @ApiProperty({
    description: 'Porcentaje descuento (0-100)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiProperty({
    description: 'Meses de garantía',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  garantia_meses?: number;

  @ApiProperty({
    description: 'Observaciones garantía',
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
    description: 'Orden visualización',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden_item?: number;
}
