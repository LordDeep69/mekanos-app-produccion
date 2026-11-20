// DTO - Crear Item Servicio Cotización (EAM-CPQ Universal)

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

export class CreateItemServicioDto {
  @ApiPropertyOptional({
    description: 'ID del servicio del catálogo (opcional si se ingresa descripcion_personalizada)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  id_servicio?: number;

  @ApiPropertyOptional({
    description: 'ID del equipo específico al que aplica esta línea (opcional)',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  id_equipo?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de servicios',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional({
    description: 'Unidad de medida',
    example: 'servicio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidad?: string;

  @ApiPropertyOptional({
    description: 'Costo unitario interno de ejecución (horas hombre / cuadrilla)',
    example: 250000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @ApiProperty({
    description: 'Precio unitario de venta (permite 0 para cortesías/incluidos)',
    example: 500000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de descuento aplicado (0-100)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento_porcentaje?: number;

  @ApiPropertyOptional({
    description: 'Ítem opcional (no suma al total principal)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_opcional?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si grava impuesto/IVA',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  iva_aplicable?: boolean;

  @ApiPropertyOptional({
    description: 'Sección editorial para agrupación en PDF',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seccion_titulo?: string;

  @ApiPropertyOptional({
    description: 'Descripción personalizada del servicio (obligatoria si no se selecciona id_servicio)',
    example: 'Instalación, pruebas de carga y puesta en marcha de banco de baterías',
  })
  @IsOptional()
  @IsString()
  descripcion_personalizada?: string;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Justificación del precio (si difiere del catálogo)',
  })
  @IsOptional()
  @IsString()
  justificacion_precio?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización en cotización',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden_item?: number;

  @ApiPropertyOptional({
    description: 'ID usuario que registra el item (se resuelve del JWT)',
  })
  @IsOptional()
  @IsInt()
  registrado_por?: number;
}
