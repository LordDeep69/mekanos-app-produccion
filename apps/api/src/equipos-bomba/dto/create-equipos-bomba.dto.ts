import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en equipos_bomba.
 */
export class CreateEquiposBombaDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_equipo!: number;

  @ApiProperty()
  @IsString()
  marca_bomba!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_bomba?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_serie_bomba?: string;

  @ApiProperty({ enum: ["CENTRIFUGA","TURBINA_VERTICAL_POZO","SUMERGIBLE","PERIFERICA","TURBINA","DESPLAZAMIENTO_POSITIVO","HIDRO","TANQUE_A_TANQUE"] })
  @IsIn(["CENTRIFUGA","TURBINA_VERTICAL_POZO","SUMERGIBLE","PERIFERICA","TURBINA","DESPLAZAMIENTO_POSITIVO","HIDRO","TANQUE_A_TANQUE"])
  tipo_bomba!: "CENTRIFUGA" | "TURBINA_VERTICAL_POZO" | "SUMERGIBLE" | "PERIFERICA" | "TURBINA" | "DESPLAZAMIENTO_POSITIVO" | "HIDRO" | "TANQUE_A_TANQUE";

  @ApiPropertyOptional({ enum: ["AGUA_POTABLE","AGUAS_RESIDUALES","AGUAS_LLUVIAS","CONTRAINCENDIOS","INDUSTRIAL","PISCINA","RIEGO"] })
  @IsOptional()
  @IsIn(["AGUA_POTABLE","AGUAS_RESIDUALES","AGUAS_LLUVIAS","CONTRAINCENDIOS","INDUSTRIAL","PISCINA","RIEGO"])
  aplicacion_bomba?: "AGUA_POTABLE" | "AGUAS_RESIDUALES" | "AGUAS_LLUVIAS" | "CONTRAINCENDIOS" | "INDUSTRIAL" | "PISCINA" | "RIEGO";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diametro_aspiracion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diametro_descarga?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  caudal_maximo_m3h?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  altura_manometrica_maxima_m?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  altura_presion_trabajo_m?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  potencia_hidraulica_kw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  eficiencia_porcentaje?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero_total_bombas_sistema?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero_bomba_en_sistema?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_panel_control?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_panel_control?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_panel_control?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_presostato?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_presostato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_presostato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  presion_encendido_psi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  presion_apagado_psi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_contactor_externo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_contactor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amperaje_contactor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_arrancador_suave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_variador_frecuencia?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca_variador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo_variador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_tanques_hidroneumaticos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cantidad_tanques?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacidad_tanques_litros?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  presion_tanques_psi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_manometro?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rango_manometro_min_psi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rango_manometro_max_psi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_proteccion_nivel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo_proteccion_nivel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_valvula_purga?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_valvula_cebado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_valvula_cheque?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tiene_valvula_pie?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia_sello_mecanico?: string;

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
