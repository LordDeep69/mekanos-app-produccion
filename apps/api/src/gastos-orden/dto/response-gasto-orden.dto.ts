import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de respuesta para gasto de orden - REFACTORIZADO
 * Tabla 13/14 - FASE 3 - camelCase
 * Incluye relaciones expandidas
 */
export class ResponseGastoOrdenDto {
  @ApiProperty({ description: 'ID único del gasto', example: 1 })
  idGasto!: number;

  @ApiProperty({ description: 'ID de la orden de servicio', example: 1 })
  idOrdenServicio!: number;

  @ApiProperty({ description: 'Tipo de gasto (ENUM)', example: 'TRANSPORTE' })
  tipoGasto!: string;

  @ApiProperty({ description: 'Descripción del gasto', example: 'Viaje a sede cliente' })
  descripcion!: string;

  @ApiProperty({ description: 'Justificación del gasto', example: 'Desplazamiento requerido para atención urgente' })
  justificacion!: string;

  @ApiProperty({ description: 'Valor del gasto (Decimal)', example: 50000.00 })
  valor!: number;

  @ApiPropertyOptional({ description: 'Tiene comprobante', example: true })
  tieneComprobante?: boolean | null;

  @ApiPropertyOptional({ description: 'Número del comprobante', example: 'FAC-001234' })
  numeroComprobante?: string | null;

  @ApiPropertyOptional({ description: 'Nombre del proveedor', example: 'Estación de Servicio XYZ' })
  proveedor?: string | null;

  @ApiPropertyOptional({ description: 'Ruta del archivo comprobante' })
  rutaComprobante?: string | null;

  @ApiPropertyOptional({ description: 'Requiere aprobación (> 100K)', example: false })
  requiereAprobacion?: boolean | null;

  @ApiPropertyOptional({ description: 'ID del usuario que aprobó' })
  aprobadoPor?: number | null;

  @ApiPropertyOptional({ description: 'Fecha de aprobación' })
  fechaAprobacion?: Date | null;

  @ApiPropertyOptional({ description: 'Estado de aprobación (ENUM)', example: 'APROBADO' })
  estadoAprobacion?: string | null;

  @ApiPropertyOptional({ description: 'Observaciones de aprobación' })
  observacionesAprobacion?: string | null;

  @ApiPropertyOptional({ description: 'Fecha del gasto' })
  fechaGasto?: Date | null;

  @ApiPropertyOptional({ description: 'ID del empleado que generó' })
  generadoPor?: number | null;

  @ApiPropertyOptional({ description: 'Observaciones' })
  observaciones?: string | null;

  @ApiPropertyOptional({ description: 'Fecha de registro' })
  fechaRegistro?: Date | null;

  @ApiPropertyOptional({ description: 'ID del usuario que registró' })
  registradoPor?: number | null;

  @ApiPropertyOptional({ description: 'Fecha de modificación' })
  fechaModificacion?: Date | null;

  @ApiPropertyOptional({ description: 'ID del usuario que modificó' })
  modificadoPor?: number | null;

  // ═══════════════════════════════════════════════════════════════════
  // RELACIONES EXPANDIDAS
  // ═══════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({ description: 'Orden de servicio relacionada' })
  ordenServicio?: {
    idOrdenServicio: number;
    numeroOrden?: string | null;
    fechaProgramada?: Date | null;
  };

  @ApiPropertyOptional({ description: 'Empleado que generó el gasto' })
  empleado?: {
    idEmpleado: number;
    codigoEmpleado?: string | null;
  } | null;

  @ApiPropertyOptional({ description: 'Usuario que aprobó' })
  usuarioAprobador?: {
    idUsuario: number;
    nombreUsuario?: string | null;
  } | null;
}
