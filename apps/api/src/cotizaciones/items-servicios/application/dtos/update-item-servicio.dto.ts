// DTO - Actualizar Item Servicio Cotización (EAM-CPQ Universal)

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

export class UpdateItemServicioDto {
  @ApiPropertyOptional({ description: 'ID del equipo asociado (null para general)' })
  @IsOptional()
  @IsInt()
  id_equipo?: number | null;

  @ApiPropertyOptional({ description: 'Cantidad de servicios', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', example: 'servicio' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional({ description: 'Costo unitario interno' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @ApiPropertyOptional({ description: 'Precio unitario del servicio', example: 550000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento aplicado (0-100)', example: 5 })
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

  @ApiPropertyOptional({ description: 'Descripción personalizada del servicio' })
  @IsOptional()
  @IsString()
  descripcion_personalizada?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Justificación del precio' })
  @IsOptional()
  @IsString()
  justificacion_precio?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización en cotización', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;
}
