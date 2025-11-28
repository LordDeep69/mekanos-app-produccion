import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { EstadoActividadEnum } from '../application/enums/estado-actividad.enum';
import { OrigenComponenteEnum } from '../application/enums/origen-componente.enum';

/**
 * DTO para crear componente usado - REFACTORIZADO
 * Tabla 12/14 - FASE 3 - camelCase
 * 24 campos: 7 FKs, 2 ENUMs, 3 Decimals
 */
export class CreateComponenteUsadoDto {
  // ═══════════════════════════════════════════════════════════════════
  // RELACIONES PRINCIPALES
  // ═══════════════════════════════════════════════════════════════════

  @ApiProperty({ description: 'ID de la orden de servicio (FK)', example: 1 })
  @IsInt()
  idOrdenServicio!: number;

  @ApiPropertyOptional({ description: 'ID del componente del catálogo (FK opcional)', example: 5 })
  @IsOptional()
  @IsInt()
  idComponente?: number;

  @ApiPropertyOptional({ description: 'ID del tipo de componente (FK opcional)', example: 2 })
  @IsOptional()
  @IsInt()
  idTipoComponente?: number;

  @ApiPropertyOptional({ description: 'ID de la actividad ejecutada (FK opcional)', example: 10 })
  @IsOptional()
  @IsInt()
  idActividadEjecutada?: number;

  // ═══════════════════════════════════════════════════════════════════
  // DESCRIPCIÓN DEL COMPONENTE
  // ═══════════════════════════════════════════════════════════════════

  @ApiProperty({ description: 'Descripción del componente usado', example: 'Filtro de aceite 15W-40', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  descripcion!: string;

  @ApiPropertyOptional({ description: 'Referencia manual (si no está en catálogo)', example: 'REF-123-ABC', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenciaManual?: string;

  @ApiPropertyOptional({ description: 'Marca manual (si no está en catálogo)', example: 'MANN-FILTER', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marcaManual?: string;

  // ═══════════════════════════════════════════════════════════════════
  // CANTIDAD Y COSTOS (Decimal)
  // ═══════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({ description: 'Cantidad usada (Decimal 10,2)', example: 2.5, default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', example: 'litro', default: 'unidad', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidad?: string;

  @ApiPropertyOptional({ description: 'Costo unitario (Decimal 12,2)', example: 45000.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoUnitario?: number;

  // ⚠️ costo_total es CALCULADO por backend (cantidad × costoUnitario)

  // ═══════════════════════════════════════════════════════════════════
  // ESTADO Y ORIGEN
  // ═══════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({ 
    description: 'Estado del componente retirado (ENUM)', 
    enum: EstadoActividadEnum,
    example: 'M' 
  })
  @IsOptional()
  @IsEnum(EstadoActividadEnum)
  estadoComponenteRetirado?: EstadoActividadEnum;

  @ApiPropertyOptional({ description: 'Razón por la cual se usó el componente' })
  @IsOptional()
  @IsString()
  razonUso?: string;

  @ApiPropertyOptional({ description: 'Si el componente retirado fue guardado', default: false })
  @IsOptional()
  @IsBoolean()
  componenteGuardado?: boolean;

  @ApiPropertyOptional({ 
    description: 'Origen del componente (ENUM)', 
    enum: OrigenComponenteEnum,
    example: 'BODEGA',
    default: 'BODEGA'
  })
  @IsOptional()
  @IsEnum(OrigenComponenteEnum)
  origenComponente?: OrigenComponenteEnum;

  // ═══════════════════════════════════════════════════════════════════
  // OBSERVACIONES Y METADATA
  // ═══════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Fecha de uso del componente (ISO 8601)', example: '2025-11-25T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  fechaUso?: string;

  @ApiPropertyOptional({ description: 'ID del empleado que usó el componente (FK)', example: 3 })
  @IsOptional()
  @IsInt()
  usadoPor?: number;

  @ApiPropertyOptional({ description: 'ID del usuario que registra (FK)', example: 1 })
  @IsOptional()
  @IsInt()
  registradoPor?: number;

  // ⚠️ Campos automáticos (NO enviar en request):
  // - id_componente_usado (autoincrement)
  // - costo_total (backend calcula)
  // - fecha_registro (timestamp automático)
  // - fecha_modificacion (trigger)
  // - modificado_por (handler asigna)
}
