import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en equipos_motor.
 */
export class CreateEquiposMotorDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty({ enum: ["COMBUSTION","ELECTRICO"] })
  @IsIn(["COMBUSTION","ELECTRICO"])
  tipo_motor!: "COMBUSTION" | "ELECTRICO";

  @ApiProperty()
  @IsString()
  marca_motor!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_motor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_serie_motor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  potencia_hp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  potencia_kw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  velocidad_nominal_rpm?: number;

  @ApiPropertyOptional({ enum: ["DIESEL","GASOLINA","GAS_NATURAL","GLP","DUAL","BIODIESEL"] })
  @IsOptional()
  @IsIn(["DIESEL","GASOLINA","GAS_NATURAL","GLP","DUAL","BIODIESEL"])
  tipo_combustible?: "DIESEL" | "GASOLINA" | "GAS_NATURAL" | "GLP" | "DUAL" | "BIODIESEL";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero_cilindros?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cilindrada_cc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_turbocargador?: boolean;

  @ApiPropertyOptional({ enum: ["ELECTRICO","MANUAL","NEUMATICO","HIDRAULICO"] })
  @IsOptional()
  @IsIn(["ELECTRICO","MANUAL","NEUMATICO","HIDRAULICO"])
  tipo_arranque?: "ELECTRICO" | "MANUAL" | "NEUMATICO" | "HIDRAULICO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  voltaje_arranque_vdc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amperaje_arranque?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero_baterias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia_bateria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  capacidad_bateria_ah?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_radiador?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiador_alto_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiador_ancho_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiador_espesor_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_cargador_bateria?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_cargador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_cargador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amperaje_cargador?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacidad_aceite_litros?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo_aceite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacidad_refrigerante_litros?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo_refrigerante?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voltaje_operacion_vac?: string;

  @ApiPropertyOptional({ enum: ["MONOFASICO","TRIFASICO"] })
  @IsOptional()
  @IsIn(["MONOFASICO","TRIFASICO"])
  numero_fases?: "MONOFASICO" | "TRIFASICO";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  frecuencia_hz?: number;

  @ApiPropertyOptional({ enum: ["A","B","F","H"] })
  @IsOptional()
  @IsIn(["A","B","F","H"])
  clase_aislamiento?: "A" | "B" | "F" | "H";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grado_proteccion_ip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amperaje_nominal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factor_potencia?: number;

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
