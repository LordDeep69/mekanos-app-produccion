import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en equipos_generador.
 */
export class CreateEquiposGeneradorDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty()
  @IsString()
  marca_generador!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_generador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_serie_generador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_alternador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_alternador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_serie_alternador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  potencia_kw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  potencia_kva?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factor_potencia?: number;

  @ApiProperty()
  @IsString()
  voltaje_salida!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero_fases?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  frecuencia_hz?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amperaje_nominal_salida?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  configuracion_salida?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_avr?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_avr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_avr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia_avr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_modulo_control?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_modulo_control?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_modulo_control?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_arranque_automatico?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacidad_tanque_principal_litros?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_tanque_auxiliar?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacidad_tanque_auxiliar_litros?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clase_aislamiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grado_proteccion_ip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  a_o_fabricacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  metadata?: Record<string, unknown> | unknown[];

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
}
