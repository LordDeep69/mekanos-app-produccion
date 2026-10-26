import { PrioridadOrdenEnum } from '@mekanos/core';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO para crear nueva orden de servicio
 * Incluye soporte para Encadenamiento Fractal (Orden Raíz -> Visitas Hijas) y Resolución de Pendientes
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
  @IsArray()
  @IsInt({ each: true })
  servicios_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  serviciosIds?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  id_sede_cliente?: number;

  @IsOptional()
  @IsString()
  descripcion_inicial?: string;

  @IsOptional()
  @IsString()
  razon_falla?: string;

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

  // ✅ ENCADENAMIENTO FRACTAL DE VISITAS (Hilo de Caso)
  @IsOptional()
  @IsInt()
  @Min(1)
  id_orden_padre?: number;

  @IsOptional()
  @IsString()
  tipo_visita?: 'INICIAL' | 'CONTINUACION' | 'CORRECTIVO_DERIVADO' | 'GARANTIA' | string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids_pendientes_a_resolver?: number[];
}
