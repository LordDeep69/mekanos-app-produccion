import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Enum: Motivo de Devolución al Proveedor
 */
export enum MotivoDevolucionEnum {
  DEFECTUOSO = 'DEFECTUOSO',
  INCORRECTO = 'INCORRECTO',
  PROXIMO_VENCER = 'PROXIMO_VENCER',
  EXCESO = 'EXCESO',
}

/**
 * DTO: Crear Devolución a Proveedor
 * Valida los datos para crear una solicitud de devolución
 */
export class CrearDevolucionDto {
  @IsInt()
  @IsPositive()
  id_orden_compra: number;

  @IsInt()
  @IsPositive()
  id_lote: number;

  @IsEnum(MotivoDevolucionEnum, {
    message: 'Motivo debe ser: DEFECTUOSO, INCORRECTO, PROXIMO_VENCER, EXCESO',
  })
  motivo: MotivoDevolucionEnum;

  @IsPositive()
  cantidad_devuelta: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  observaciones_solicitud?: string;
}
