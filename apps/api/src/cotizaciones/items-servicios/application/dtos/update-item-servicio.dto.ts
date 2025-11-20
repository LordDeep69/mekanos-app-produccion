// DTO - Actualizar Item Servicio Cotización

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateItemServicioDto {
  @ApiProperty({
    description: 'Cantidad de servicios',
    example: 2,
    required: false,
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
    example: 550000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_unitario?: number;

  @ApiProperty({
    description: 'Porcentaje de descuento aplicado (0-100)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiProperty({
    description: 'Descripción personalizada del servicio',
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
    description: 'Justificación del precio',
    required: false,
  })
  @IsOptional()
  @IsString()
  justificacion_precio?: string;

  @ApiProperty({
    description: 'Orden de visualización en cotización',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden_item?: number;
}
