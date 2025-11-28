import { estado_item_remision_enum, tipo_item_remision_enum } from '@prisma/client';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

/**
 * DTO para crear detalle de remisión
 * 
 * Campos requeridos según schema:
 * - id_remision: FK a remisiones
 * - tipo_item: COMPONENTE | HERRAMIENTA
 * - descripcion_item: String (max 300)
 * - cantidad_entregada: Decimal (10,2)
 */
export class CreateRemisionesDetalleDto {
  @IsInt()
  @IsNotEmpty({ message: 'El ID de remisión es obligatorio' })
  @IsPositive({ message: 'El ID de remisión debe ser positivo' })
  id_remision: number;

  @IsEnum(tipo_item_remision_enum, {
    message: 'El tipo de item debe ser COMPONENTE o HERRAMIENTA',
  })
  @IsNotEmpty({ message: 'El tipo de item es obligatorio' })
  tipo_item: tipo_item_remision_enum;

  @IsInt()
  @IsOptional()
  @IsPositive({ message: 'El ID de componente debe ser positivo' })
  id_componente?: number;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del item es obligatoria' })
  @MaxLength(300, { message: 'La descripción no puede exceder 300 caracteres' })
  descripcion_item: string;

  @IsNumber({}, { message: 'La cantidad entregada debe ser un número' })
  @IsNotEmpty({ message: 'La cantidad entregada es obligatoria' })
  @IsPositive({ message: 'La cantidad entregada debe ser positiva' })
  cantidad_entregada: number;

  @IsNumber()
  @IsOptional()
  cantidad_devuelta?: number;

  @IsEnum(estado_item_remision_enum)
  @IsOptional()
  estado_item?: estado_item_remision_enum;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  observaciones?: string;
}
