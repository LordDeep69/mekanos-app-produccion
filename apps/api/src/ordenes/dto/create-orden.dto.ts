import { IsInt, IsOptional, IsString, IsEnum, IsDateString, Min } from 'class-validator';
import { PrioridadOrdenEnum } from '@mekanos/core';

/**
 * DTO para crear nueva orden de servicio
 */
export class CreateOrdenDto {
  @IsInt()
  @Min(1)
  equipoId!: number;

  @IsInt()
  @Min(1)
  clienteId!: number;

  @IsInt()
  @Min(1)
  tipoServicioId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sedeClienteId?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(PrioridadOrdenEnum)
  prioridad?: PrioridadOrdenEnum;

  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;
}
