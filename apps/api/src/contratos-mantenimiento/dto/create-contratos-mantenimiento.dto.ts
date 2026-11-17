import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en contratos_mantenimiento.
 */
export class CreateContratosMantenimientoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo_contrato?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_cliente!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_asesor_responsable!: number;

  @ApiPropertyOptional({ enum: ["PREVENTIVO_RECURRENTE","INTEGRAL","ESPECIAL"] })
  @IsOptional()
  @IsIn(["PREVENTIVO_RECURRENTE","INTEGRAL","ESPECIAL"])
  tipo_contrato?: "PREVENTIVO_RECURRENTE" | "INTEGRAL" | "ESPECIAL";

  @ApiPropertyOptional({ enum: ["SEMANAL","QUINCENAL","MENSUAL","BIMESTRAL","TRIMESTRAL","SEMESTRAL","ANUAL"] })
  @IsOptional()
  @IsIn(["SEMANAL","QUINCENAL","MENSUAL","BIMESTRAL","TRIMESTRAL","SEMESTRAL","ANUAL"])
  periodicidad_default?: "SEMANAL" | "QUINCENAL" | "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

  @ApiProperty()
  @IsDateString()
  fecha_inicio!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @ApiPropertyOptional({ enum: ["ACTIVO","SUSPENDIDO","FINALIZADO","RENOVACION_PENDIENTE"] })
  @IsOptional()
  @IsIn(["ACTIVO","SUSPENDIDO","FINALIZADO","RENOVACION_PENDIENTE"])
  estado_contrato?: "ACTIVO" | "SUSPENDIDO" | "FINALIZADO" | "RENOVACION_PENDIENTE";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  genera_automaticamente?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dias_anticipacion_generacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creado_por?: number;
}
