import { IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoOrdenEnum, PrioridadOrdenEnum } from '@mekanos/core';

/**
 * DTO para filtrar órdenes en queries
 */
export class FilterOrdenesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  equipoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tecnicoId?: number;

  @IsOptional()
  @IsEnum(EstadoOrdenEnum)
  estado?: EstadoOrdenEnum;

  @IsOptional()
  @IsEnum(PrioridadOrdenEnum)
  prioridad?: PrioridadOrdenEnum;
}
