import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { origen_costo_enum } from '@prisma/client';
import { EscalaPrecioDto } from './create-articulo-maestro.dto';

export class VincularProveedorDto {
  @ApiProperty({ description: 'ID del proveedor', example: 5 })
  @IsInt()
  id_proveedor: number;

  @ApiProperty({ description: 'Referencia o SKU del proveedor', example: 'FLT-CUMMINS-FF5052' })
  @IsString()
  @MaxLength(100)
  referencia_proveedor: string;

  @ApiPropertyOptional({ description: 'Marca ofrecida por el proveedor', example: 'FLEETGUARD' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_ofrecida?: string;

  @ApiPropertyOptional({ description: 'Nombre según factura del proveedor' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_segun_proveedor?: string;

  @ApiProperty({ description: 'Costo unitario actual de compra', example: 110000 })
  @IsNumber()
  @Min(0)
  costo_actual: number;

  @ApiPropertyOptional({ description: 'Moneda del costo', default: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string = 'COP';

  @ApiPropertyOptional({ description: 'Tiempo de entrega en días hábiles', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tiempo_entrega_dias?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad mínima de compra', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_minima_compra?: number = 1;

  @ApiPropertyOptional({ description: 'Escalas de precios por volumen', type: [EscalaPrecioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalaPrecioDto)
  escalas_precios?: EscalaPrecioDto[];

  @ApiPropertyOptional({ description: 'Marcar como proveedor preferido', default: false })
  @IsOptional()
  @IsBoolean()
  es_proveedor_preferido?: boolean = false;

  @ApiPropertyOptional({ description: 'URL del producto en la tienda del proveedor' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_producto_proveedor?: string;

  @ApiPropertyOptional({ description: 'Notas comerciales o de garantía' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Número de factura u orden de compra origen', example: 'FAC-2026-891' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_factura_oc?: string;

  @ApiPropertyOptional({
    description: 'Origen del registro de costo',
    enum: origen_costo_enum,
    default: origen_costo_enum.ACTUALIZACION_PROVEEDOR,
  })
  @IsOptional()
  @IsEnum(origen_costo_enum)
  origen_cambio?: origen_costo_enum = origen_costo_enum.ACTUALIZACION_PROVEEDOR;
}

export class ActualizarPrecioProveedorDto {
  @ApiProperty({ description: 'Nuevo costo unitario pactado o facturado', example: 115000 })
  @IsNumber()
  @Min(0)
  nuevo_costo: number;

  @ApiPropertyOptional({ description: 'Moneda del costo', default: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  moneda?: string = 'COP';

  @ApiPropertyOptional({ description: 'Cantidad adquirida en esta transacción (si aplica)', example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_adquirida?: number;

  @ApiPropertyOptional({ description: 'Número de factura o documento de compra de respaldo', example: 'FE-99214' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_factura_oc?: string;

  @ApiPropertyOptional({
    description: 'Razón del cambio o evento origen',
    enum: origen_costo_enum,
    default: origen_costo_enum.ACTUALIZACION_PROVEEDOR,
  })
  @IsOptional()
  @IsEnum(origen_costo_enum)
  origen_cambio?: origen_costo_enum = origen_costo_enum.ACTUALIZACION_PROVEEDOR;

  @ApiPropertyOptional({ description: 'Observaciones de auditoría o justificación del cambio de precio' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Nuevas escalas de precios por volumen' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalaPrecioDto)
  escalas_precios?: EscalaPrecioDto[];
}
