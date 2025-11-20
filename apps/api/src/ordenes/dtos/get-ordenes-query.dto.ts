import { IsInt, IsOptional, IsDateString, IsEnum } from 'class-validator';

/**
 * DTO: Filtros para listar órdenes
 */
export class GetOrdenesQueryDto {
  @IsInt()
  @IsOptional()
  id_cliente?: number;

  @IsInt()
  @IsOptional()
  id_sede?: number;

  @IsInt()
  @IsOptional()
  id_equipo?: number;

  @IsInt()
  @IsOptional()
  id_tecnico_asignado?: number;

  @IsInt()
  @IsOptional()
  id_estado_actual?: number;

  @IsDateString()
  @IsOptional()
  fecha_desde?: string;

  @IsDateString()
  @IsOptional()
  fecha_hasta?: string;

  @IsEnum(['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'])
  @IsOptional()
  prioridad?: string;

  @IsEnum(['PROGRAMADO', 'CLIENTE', 'INTERNO', 'EMERGENCIA', 'GARANTIA'])
  @IsOptional()
  origen_solicitud?: string;

  @IsInt()
  @IsOptional()
  page?: number;

  @IsInt()
  @IsOptional()
  limit?: number;
}
