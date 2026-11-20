// DTO - Actualizar Item Componente (EAM-CPQ Universal)

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateItemComponenteDto {
  @ApiPropertyOptional({ description: 'ID del equipo asociado (null para general)' })
  @IsOptional()
  @IsInt()
  id_equipo?: number | null;

  @ApiPropertyOptional({ description: 'ID del tipo de componente' })
  @IsOptional()
  @IsInt()
  id_tipo_componente?: number | null;

  @ApiPropertyOptional({ description: 'Descripción del componente' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Referencia o código' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_manual?: string;

  @ApiPropertyOptional({ description: 'Marca del componente' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_manual?: string;

  @ApiPropertyOptional({ description: 'Cantidad', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional({ description: 'Costo unitario interno' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @ApiPropertyOptional({ description: 'Precio unitario', example: 90000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @ApiPropertyOptional({ description: 'Porcentaje descuento (0-100)', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional({ description: 'Ítem opcional' })
  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @ApiPropertyOptional({ description: 'Grava IVA/impuesto' })
  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @ApiPropertyOptional({ description: 'Sección editorial para PDF' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seccion_titulo?: string;

  @ApiPropertyOptional({ description: 'Meses de garantía' })
  @IsOptional()
  @IsInt()
  @Min(0)
  garantia_meses?: number;

  @ApiPropertyOptional({ description: 'Observaciones garantía' })
  @IsOptional()
  @IsString()
  observaciones_garantia?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Orden visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;
}
