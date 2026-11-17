import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en lecturas_horometro.
 */
export class CreateLecturasHorometroDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  horas_lectura!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_lectura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_orden_servicio?: number;

  @ApiPropertyOptional({ enum: ["MANTENIMIENTO","MANUAL","AUTOMATICA","INICIAL"] })
  @IsOptional()
  @IsIn(["MANTENIMIENTO","MANUAL","AUTOMATICA","INICIAL"])
  tipo_lectura?: "MANTENIMIENTO" | "MANUAL" | "AUTOMATICA" | "INICIAL";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  horas_transcurridas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dias_transcurridos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  horas_promedio_dia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  registrado_por?: number;
}
