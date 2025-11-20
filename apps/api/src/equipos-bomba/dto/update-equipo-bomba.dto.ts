import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { AplicacionBombaEnum, TipoBombaEnum } from './create-equipo-bomba.dto';

export class UpdateEquipoBombaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_bomba?: string;

  @IsOptional()
  @IsEnum(TipoBombaEnum)
  tipo_bomba?: TipoBombaEnum;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_bomba?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_bomba?: string;

  @IsOptional()
  @IsEnum(AplicacionBombaEnum)
  aplicacion_bomba?: AplicacionBombaEnum;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diametro_aspiracion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diametro_descarga?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  caudal_maximo_m3h?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  altura_manometrica_maxima_m?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  altura_presion_trabajo_m?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  potencia_hidraulica_kw?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  eficiencia_porcentaje?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numero_total_bombas_sistema?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numero_bomba_en_sistema?: number;

  @IsOptional()
  @IsBoolean()
  tiene_panel_control?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_panel_control?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_panel_control?: string;

  @IsOptional()
  @IsBoolean()
  tiene_presostato?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_presostato?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_presostato?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  presion_encendido_psi?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  presion_apagado_psi?: number;

  @IsOptional()
  @IsBoolean()
  tiene_contactor_externo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_contactor?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amperaje_contactor?: number;

  @IsOptional()
  @IsBoolean()
  tiene_arrancador_suave?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_variador_frecuencia?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_variador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_variador?: string;

  @IsOptional()
  @IsBoolean()
  tiene_tanques_hidroneumaticos?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cantidad_tanques?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacidad_tanques_litros?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  presion_tanques_psi?: number;

  @IsOptional()
  @IsBoolean()
  tiene_manometro?: boolean;

  @IsOptional()
  @IsNumber()
  rango_manometro_min_psi?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  rango_manometro_max_psi?: number;

  @IsOptional()
  @IsBoolean()
  tiene_proteccion_nivel?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_proteccion_nivel?: string;

  @IsOptional()
  @IsBoolean()
  tiene_valvula_purga?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_valvula_cebado?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_valvula_cheque?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_valvula_pie?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_sello_mecanico?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  a_o_fabricacion?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @IsPositive()
  modificado_por?: number;
}
