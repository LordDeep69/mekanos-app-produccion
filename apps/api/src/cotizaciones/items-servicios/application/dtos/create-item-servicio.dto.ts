// DTO - Crear Item Servicio Cotización

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateItemServicioDto {
  @ApiProperty({
    description: 'ID del servicio del catálogo',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  id_servicio!: number;

  @ApiProperty({
    description: 'Cantidad de servicios',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'servicio',
    required: false,
  })
  @IsOptional()
  @IsString()
  unidad?: string;

  @ApiProperty({
    description: 'Precio unitario del servicio',
    example: 500000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @ApiProperty({
    description: 'Porcentaje de descuento aplicado (0-100)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiProperty({
    description: 'Descripción personalizada del servicio',
    example: 'Mantenimiento preventivo completo incluye cambio filtros',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion_personalizada?: string;

  @ApiProperty({
    description: 'Observaciones adicionales',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({
    description: 'Justificación del precio (si difiere del catálogo)',
    required: false,
  })
  @IsOptional()
  @IsString()
  justificacion_precio?: string;

  @ApiProperty({
    description: 'Orden de visualización en cotización',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden_item?: number;

  @ApiProperty({
    description: 'ID usuario que registra el item',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  registrado_por?: number;
}
