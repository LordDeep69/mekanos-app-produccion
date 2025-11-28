import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

/**
 * DTO para crear detalle de orden de compra
 * 
 * Campos requeridos según schema:
 * - id_orden_compra: FK a ordenes_compra
 * - id_componente: FK a catalogo_componentes
 * - cantidad: Decimal (10,2)
 * - precio_unitario: Decimal (12,2)
 */
export class CreateOrdenesCompraDetalleDto {
  @IsInt()
  @IsNotEmpty({ message: 'El ID de orden de compra es obligatorio' })
  @IsPositive({ message: 'El ID de orden de compra debe ser positivo' })
  id_orden_compra: number;

  @IsInt()
  @IsNotEmpty({ message: 'El ID de componente es obligatorio' })
  @IsPositive({ message: 'El ID de componente debe ser positivo' })
  id_componente: number;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsNotEmpty({ message: 'La cantidad es obligatoria' })
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  cantidad: number;

  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @IsNotEmpty({ message: 'El precio unitario es obligatorio' })
  @IsPositive({ message: 'El precio unitario debe ser positivo' })
  precio_unitario: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  observaciones?: string;
}
