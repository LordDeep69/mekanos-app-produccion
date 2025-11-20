import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Enum: Estado de Devolución para Procesamiento
 * Workflow simplificado: SOLICITADA → APROBADA_PROVEEDOR (afecta inventario) | ACREDITADA (rechazada)
 */
export enum EstadoDevolucionProcesamientoEnum {
  APROBADA_PROVEEDOR = 'APROBADA_PROVEEDOR', // Aprueba y crea movimiento SALIDA
  ACREDITADA = 'ACREDITADA', // Rechazada, no afecta inventario
}

/**
 * DTO: Procesar Devolución
 * Valida los datos para aprobar o rechazar una devolución
 */
export class ProcesarDevolucionDto {
  @IsEnum(EstadoDevolucionProcesamientoEnum, {
    message: 'Estado debe ser: APROBADA_PROVEEDOR (aprobar) o ACREDITADA (rechazar)',
  })
  estado_devolucion: EstadoDevolucionProcesamientoEnum;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  observaciones_procesamiento?: string;
}
