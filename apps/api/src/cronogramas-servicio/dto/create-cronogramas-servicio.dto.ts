import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en cronogramas_servicio.
 */
export class CreateCronogramasServicioDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_contrato!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo_contrato!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  tipo_servicio_programado!: number;

  @ApiProperty()
  @IsDateString()
  fecha_prevista!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_inicio_ventana?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_fin_ventana?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_base_calculo?: string;

  @ApiPropertyOptional({ enum: ["PENDIENTE","PROGRAMADA","COMPLETADA","VENCIDA","CANCELADA"] })
  @IsOptional()
  @IsIn(["PENDIENTE","PROGRAMADA","COMPLETADA","VENCIDA","CANCELADA"])
  estado_cronograma?: "PENDIENTE" | "PROGRAMADA" | "COMPLETADA" | "VENCIDA" | "CANCELADA";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_orden_servicio_generada?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_generacion_os?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_completado?: string;

  @ApiPropertyOptional({ enum: ["NORMAL","ALTA","URGENTE","EMERGENCIA"] })
  @IsOptional()
  @IsIn(["NORMAL","ALTA","URGENTE","EMERGENCIA"])
  prioridad?: "NORMAL" | "ALTA" | "URGENTE" | "EMERGENCIA";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones_programacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  secuencia_contrato?: number;
}
