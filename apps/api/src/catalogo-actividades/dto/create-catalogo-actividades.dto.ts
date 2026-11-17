import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en catalogo_actividades.
 */
export class CreateCatalogoActividadesDto {
  @ApiProperty()
  @IsString()
  codigo_actividad!: string;

  @ApiProperty()
  @IsString()
  descripcion_actividad!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_servicio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_sistema?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_equipo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_plantilla_origen?: number;

  @ApiProperty({ enum: ["INSPECCION","MEDICION","LIMPIEZA","LUBRICACION","AJUSTE","CAMBIO","PRUEBA","VERIFICACION"] })
  @IsIn(["INSPECCION","MEDICION","LIMPIEZA","LUBRICACION","AJUSTE","CAMBIO","PRUEBA","VERIFICACION"])
  tipo_actividad!: "INSPECCION" | "MEDICION" | "LIMPIEZA" | "LUBRICACION" | "AJUSTE" | "CAMBIO" | "PRUEBA" | "VERIFICACION";

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  orden_ejecucion!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  es_obligatoria?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tiempo_estimado_minutos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_parametro_medicion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_tipo_componente?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instrucciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  precauciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_creacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modificado_por?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_modificacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  naturaleza_personalizada?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo_control_input?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  config_input_json?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rol_semantico?: string;
}
