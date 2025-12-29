import { PrioridadOrdenEnum } from '@mekanos/core';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO para crear nueva orden de servicio
 */
export class CreateOrdenDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id_equipo?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  equipos_ids?: number[];

  @IsInt()
  @Min(1)
  id_cliente!: number;

  @IsInt()
  @Min(1)
  id_tipo_servicio!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_sede_cliente?: number;

  @IsOptional()
  @IsString()
  descripcion_inicial?: string;

  @IsOptional()
  @IsEnum(PrioridadOrdenEnum)
  prioridad?: PrioridadOrdenEnum;

  @IsOptional()
  @IsDateString()
  fecha_programada?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_tecnico_asignado?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tecnicoId?: number; // Alias para compatibilidad con frontend
}
