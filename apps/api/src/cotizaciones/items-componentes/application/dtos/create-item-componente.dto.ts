// DTO - Crear Item Componente Cotización (EAM-CPQ Universal)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
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
  @ApiPropertyOptional({
    description: 'ID del componente del catálogo WMS (opcional si es manual)',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  id_componente?: number;

  @ApiPropertyOptional({
    description: 'ID del tipo de componente (opcional, legacy compatible)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  id_tipo_componente?: number;

  @ApiPropertyOptional({
    description: 'ID del equipo específico al que aplica esta línea (opcional)',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  id_equipo?: number;

  @ApiProperty({
    description: 'Descripción del componente o repuesto',
    example: 'Batería de Arranque 12V 1000 CCA libre mantenimiento',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  descripcion!: string;

  @ApiPropertyOptional({
    description: 'Referencia o código de catálogo/fabricante',
    example: 'CH10929',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_manual?: string;

  @ApiPropertyOptional({
    description: 'Marca del componente',
    example: 'Perkins Original',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_manual?: string;

  @ApiPropertyOptional({
    description: 'Cantidad de componentes',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional({
    description: 'Unidad de medida',
    example: 'unidad',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional({
    description: 'Costo unitario interno (si se omite, se hereda del catálogo WMS)',
    example: 55000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @ApiProperty({
    description: 'Precio unitario de venta (permite 0 para cortesías/incluidos)',
    example: 85000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de descuento (0-100)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Si es true, se presenta como ítem opcional fuera del total principal',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el ítem grava impuesto/IVA',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @ApiPropertyOptional({
    description: 'Título de sección para agrupación en PDF',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seccion_titulo?: string;

  @ApiPropertyOptional({
    description: 'Meses de garantía del componente',
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  garantia_meses?: number;

  @ApiPropertyOptional({
    description: 'Observaciones sobre la garantía',
  })
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;

  @ApiPropertyOptional({
    description: 'ID usuario que registra (se resuelve automáticamente del JWT)',
  })
  @IsOptional()
  @IsInt()
  registrado_por?: number;
}
