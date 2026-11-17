import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional } from 'class-validator';

/**
 * DTO estrictamente validado para creación en equipos_contrato.
 */
export class CreateEquiposContratoDto {
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
  tipo_servicio_default!: number;

  @ApiPropertyOptional({ enum: ["DIAS","HORAS","LO_QUE_OCURRA_PRIMERO"] })
  @IsOptional()
  @IsIn(["DIAS","HORAS","LO_QUE_OCURRA_PRIMERO"])
  criterio_intervalo?: "DIAS" | "HORAS" | "LO_QUE_OCURRA_PRIMERO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  intervalo_dias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  intervalo_horas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo_en_contrato?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_inclusion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_exclusion?: string;
}
