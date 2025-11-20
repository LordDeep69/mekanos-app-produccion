import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';

export class ItemRemisionDto {
  @IsNotEmpty({ message: 'El ID del componente es requerido' })
  @IsInt({ message: 'El ID del componente debe ser un número entero' })
  @IsPositive({ message: 'El ID del componente debe ser positivo' })
  id_componente!: number;

  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  cantidad!: number;

  @IsOptional()
  @IsInt({ message: 'El ID de ubicación debe ser un número entero' })
  @IsPositive({ message: 'El ID de ubicación debe ser positivo' })
  id_ubicacion?: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden exceder 500 caracteres',
  })
  observaciones?: string;
}

export class CrearRemisionDto {
  @IsOptional()
  @IsInt({ message: 'El ID de orden servicio debe ser un número entero' })
  @IsPositive({ message: 'El ID de orden servicio debe ser positivo' })
  id_orden_servicio?: number;

  @IsNotEmpty({ message: 'El ID del técnico receptor es requerido' })
  @IsInt({ message: 'El ID del técnico receptor debe ser un número entero' })
  @IsPositive({ message: 'El ID del técnico receptor debe ser positivo' })
  id_tecnico_receptor!: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden exceder 500 caracteres',
  })
  observaciones?: string;

  @IsNotEmpty({ message: 'Los items son requeridos' })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => ItemRemisionDto)
  items!: ItemRemisionDto[];
}
