import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

export class RegistrarTrasladoDto {
  @IsNotEmpty({ message: 'El ID del componente es requerido' })
  @IsInt({ message: 'El ID del componente debe ser un número entero' })
  @IsPositive({ message: 'El ID del componente debe ser positivo' })
  id_componente!: number;

  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  cantidad!: number;

  @IsNotEmpty({ message: 'El ID de ubicación origen es requerido' })
  @IsInt({ message: 'El ID de ubicación origen debe ser un número entero' })
  @IsPositive({ message: 'El ID de ubicación origen debe ser positivo' })
  id_ubicacion_origen!: number;

  @IsNotEmpty({ message: 'El ID de ubicación destino es requerido' })
  @IsInt({ message: 'El ID de ubicación destino debe ser un número entero' })
  @IsPositive({ message: 'El ID de ubicación destino debe ser positivo' })
  id_ubicacion_destino!: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden exceder 500 caracteres',
  })
  observaciones?: string;
}
