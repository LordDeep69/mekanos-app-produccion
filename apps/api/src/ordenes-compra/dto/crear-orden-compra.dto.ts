import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class ItemOrdenCompraDto {
  @ApiProperty({ description: 'ID del componente', example: 1 })
  @IsInt()
  @IsPositive()
  id_componente!: number;

  @ApiProperty({ description: 'Cantidad a solicitar', example: 10 })
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ description: 'Precio unitario del componente', example: 15000.5 })
  @IsPositive()
  precio_unitario!: number;

  @ApiPropertyOptional({ description: 'Observaciones del item', example: 'Verificar disponibilidad' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Bandera para auto-vincular o actualizar en la matriz articulos_proveedores', example: true })
  @IsOptional()
  @IsBoolean()
  vincular_proveedor?: boolean;

  @ApiPropertyOptional({ description: 'Código o SKU asignado por el proveedor', example: 'REF-PROV-100' })
  @IsOptional()
  @IsString()
  codigo_proveedor?: string;
}

export class CrearOrdenCompraDto {
  @ApiPropertyOptional({ description: 'Número único de la orden compra (si se omite, se autogenera OC-YYYY-XXXX)', example: 'OC-2026-0001' })
  @IsOptional()
  @IsString()
  numero_orden_compra?: string;

  @ApiProperty({ description: 'ID del proveedor', example: 1 })
  @IsInt()
  @IsPositive()
  id_proveedor!: number;

  @ApiPropertyOptional({ description: 'Fecha de necesidad (ISO 8601)', example: '2025-02-01' })
  @IsOptional()
  @IsDateString()
  fecha_necesidad?: string;

  @ApiPropertyOptional({ description: 'Observaciones generales', example: 'Urgente para mantenimiento' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Items de la orden compra', type: [ItemOrdenCompraDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos 1 item' })
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenCompraDto)
  items!: ItemOrdenCompraDto[];
}
