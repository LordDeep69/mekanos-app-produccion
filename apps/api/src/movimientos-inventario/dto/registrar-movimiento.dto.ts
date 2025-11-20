import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength
} from 'class-validator';

// Enums alineados con Prisma schema
export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE = 'AJUSTE',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum OrigenMovimiento {
  COMPRA = 'COMPRA',
  CONSUMO_OS = 'CONSUMO_OS',
  REMISION = 'REMISION',
  DEVOLUCION = 'DEVOLUCION',
  CONTEO_FISICO = 'CONTEO_FISICO',
  MERMA = 'MERMA',
  CORRECCION_ERROR = 'CORRECCION_ERROR',
}

export class RegistrarMovimientoDto {
  @IsNotEmpty({ message: 'El tipo de movimiento es requerido' })
  @IsEnum(TipoMovimiento, {
    message: 'Tipo de movimiento inválido. Valores: ENTRADA, SALIDA, AJUSTE, TRANSFERENCIA',
  })
  tipo_movimiento!: TipoMovimiento;

  @IsNotEmpty({ message: 'El origen del movimiento es requerido' })
  @IsEnum(OrigenMovimiento, {
    message: 'Origen de movimiento inválido. Valores: COMPRA, CONSUMO_OS, REMISION, DEVOLUCION, CONTEO_FISICO, MERMA, CORRECCION_ERROR',
  })
  origen_movimiento!: OrigenMovimiento;

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
  @IsInt({ message: 'El ID de lote debe ser un número entero' })
  @IsPositive({ message: 'El ID de lote debe ser positivo' })
  id_lote?: number;

  @IsOptional()
  @IsInt({ message: 'El ID de orden servicio debe ser un número entero' })
  @IsPositive({ message: 'El ID de orden servicio debe ser positivo' })
  id_orden_servicio?: number;

  @IsOptional()
  @IsInt({ message: 'El ID de orden compra debe ser un número entero' })
  @IsPositive({ message: 'El ID de orden compra debe ser positivo' })
  id_orden_compra?: number;

  @IsOptional()
  @IsInt({ message: 'El ID de remisión debe ser un número entero' })
  @IsPositive({ message: 'El ID de remisión debe ser positivo' })
  id_remision?: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden exceder 500 caracteres',
  })
  observaciones?: string;

  @IsOptional()
  @IsString({ message: 'La justificación debe ser texto' })
  @MaxLength(500, {
    message: 'La justificación no puede exceder 500 caracteres',
  })
  justificacion?: string;
}
