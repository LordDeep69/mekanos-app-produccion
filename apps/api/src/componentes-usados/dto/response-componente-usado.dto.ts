import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de respuesta para componente usado - REFACTORIZADO
 * Tabla 12/14 - FASE 3 - camelCase
 * Incluye relaciones expandidas
 */
export class ResponseComponenteUsadoDto {
  @ApiProperty({ description: 'ID único del componente usado', example: 1 })
  idComponenteUsado!: number;

  @ApiProperty({ description: 'ID de la orden de servicio', example: 1 })
  idOrdenServicio!: number;

  @ApiPropertyOptional({ description: 'ID del componente del catálogo', example: 5 })
  idComponente?: number | null;

  @ApiPropertyOptional({ description: 'ID del tipo de componente', example: 2 })
  idTipoComponente?: number | null;

  @ApiPropertyOptional({ description: 'ID de la actividad ejecutada', example: 10 })
  idActividadEjecutada?: number | null;

  @ApiProperty({ description: 'Descripción del componente', example: 'Filtro de aceite 15W-40' })
  descripcion!: string;

  @ApiPropertyOptional({ description: 'Referencia manual' })
  referenciaManual?: string | null;

  @ApiPropertyOptional({ description: 'Marca manual' })
  marcaManual?: string | null;

  @ApiProperty({ description: 'Cantidad usada (Decimal)', example: 2.5 })
  cantidad!: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', example: 'litro' })
  unidad?: string | null;

  @ApiPropertyOptional({ description: 'Costo unitario (Decimal)', example: 45000.00 })
  costoUnitario?: number | null;

  @ApiPropertyOptional({ description: 'Costo total calculado (Decimal)', example: 112500.00 })
  costoTotal?: number | null;

  @ApiPropertyOptional({ description: 'Estado del componente retirado (ENUM)', example: 'M' })
  estadoComponenteRetirado?: string | null;

  @ApiPropertyOptional({ description: 'Razón de uso' })
  razonUso?: string | null;

  @ApiPropertyOptional({ description: 'Si el componente fue guardado', example: false })
  componenteGuardado?: boolean | null;

  @ApiPropertyOptional({ description: 'Origen del componente (ENUM)', example: 'BODEGA' })
  origenComponente?: string | null;

  @ApiPropertyOptional({ description: 'Observaciones' })
  observaciones?: string | null;

  @ApiPropertyOptional({ description: 'Fecha de uso' })
  fechaUso?: Date | null;

  @ApiPropertyOptional({ description: 'ID del empleado que usó' })
  usadoPor?: number | null;

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

  @ApiPropertyOptional({ description: 'Componente del catálogo relacionado' })
  catalogoComponente?: {
    idComponente: number;
    nombre?: string | null;
    referencia?: string | null;
  } | null;

  @ApiPropertyOptional({ description: 'Tipo de componente relacionado' })
  tipoComponente?: {
    idTipoComponente: number;
    nombreTipo?: string | null;
  } | null;

  @ApiPropertyOptional({ description: 'Actividad ejecutada relacionada' })
  actividadEjecutada?: {
    idActividadEjecutada: number;
    descripcion?: string | null;
  } | null;

  @ApiPropertyOptional({ description: 'Empleado que usó el componente' })
  empleado?: {
    idEmpleado: number;
    nombre?: string | null;
  } | null;
}
