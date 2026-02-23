/**
 * DTO para actualizar datos específicos de equipos (Motor, Generador, Bomba)
 * ✅ 23-FEB-2026: CRUD completo - Edición de datos polimórficos
 */

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// ═══════════════════════════════════════════════════════
// MOTOR UPDATE DTO
// ═══════════════════════════════════════════════════════

export class UpdateDatosMotorDto {
  @IsOptional()
  @IsEnum(['COMBUSTION', 'ELECTRICO'])
  tipo_motor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_motor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_motor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_motor?: string;

  @IsOptional()
  @IsNumber()
  potencia_hp?: number;

  @IsOptional()
  @IsNumber()
  potencia_kw?: number;

  @IsOptional()
  @IsInt()
  velocidad_nominal_rpm?: number;

  // CAMPOS COMBUSTIÓN
  @IsOptional()
  @IsEnum(['DIESEL', 'GASOLINA', 'GAS_NATURAL', 'GLP', 'DUAL', 'BIODIESEL'])
  tipo_combustible?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  numero_cilindros?: number;

  @IsOptional()
  @IsInt()
  cilindrada_cc?: number;

  @IsOptional()
  @IsBoolean()
  tiene_turbocargador?: boolean;

  @IsOptional()
  @IsEnum(['ELECTRICO', 'MANUAL', 'NEUMATICO', 'HIDRAULICO'])
  tipo_arranque?: string;

  @IsOptional()
  @IsInt()
  @IsIn([12, 24, 48])
  voltaje_arranque_vdc?: number;

  @IsOptional()
  @IsNumber()
  amperaje_arranque?: number;

  @IsOptional()
  @IsInt()
  numero_baterias?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_bateria?: string;

  @IsOptional()
  @IsInt()
  capacidad_bateria_ah?: number;

  @IsOptional()
  @IsBoolean()
  tiene_radiador?: boolean;

  @IsOptional()
  @IsNumber()
  radiador_alto_cm?: number;

  @IsOptional()
  @IsNumber()
  radiador_ancho_cm?: number;

  @IsOptional()
  @IsNumber()
  radiador_espesor_cm?: number;

  @IsOptional()
  @IsBoolean()
  tiene_cargador_bateria?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_cargador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_cargador?: string;

  @IsOptional()
  @IsNumber()
  amperaje_cargador?: number;

  @IsOptional()
  @IsNumber()
  capacidad_aceite_litros?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_aceite?: string;

  @IsOptional()
  @IsNumber()
  capacidad_refrigerante_litros?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipo_refrigerante?: string;

  // CAMPOS ELÉCTRICOS
  @IsOptional()
  @IsString()
  @MaxLength(30)
  voltaje_operacion_vac?: string;

  @IsOptional()
  @IsEnum(['MONOFASICO', 'TRIFASICO'])
  numero_fases?: string;

  @IsOptional()
  @IsInt()
  frecuencia_hz?: number;

  @IsOptional()
  @IsEnum(['A', 'B', 'F', 'H'])
  clase_aislamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  grado_proteccion_ip?: string;

  @IsOptional()
  @IsNumber()
  amperaje_nominal?: number;

  @IsOptional()
  @IsNumber()
  factor_potencia?: number;

  @IsOptional()
  @IsInt()
  anio_fabricacion?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════
// GENERADOR UPDATE DTO
// ═══════════════════════════════════════════════════════

export class UpdateDatosGeneradorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_generador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_generador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_generador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_alternador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_alternador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_alternador?: string;

  @IsOptional()
  @IsNumber()
  potencia_kw?: number;

  @IsOptional()
  @IsNumber()
  potencia_kva?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  factor_potencia?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voltaje_salida?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 3])
  numero_fases?: number;

  @IsOptional()
  @IsInt()
  @IsIn([50, 60])
  frecuencia_hz?: number;

  @IsOptional()
  @IsNumber()
  amperaje_nominal_salida?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  configuracion_salida?: string;

  @IsOptional()
  @IsBoolean()
  tiene_avr?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  marca_avr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_avr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_avr?: string;

  @IsOptional()
  @IsBoolean()
  tiene_modulo_control?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_modulo_control?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_modulo_control?: string;

  @IsOptional()
  @IsBoolean()
  tiene_arranque_automatico?: boolean;

  @IsOptional()
  @IsNumber()
  capacidad_tanque_principal_litros?: number;

  @IsOptional()
  @IsBoolean()
  tiene_tanque_auxiliar?: boolean;

  @IsOptional()
  @IsNumber()
  capacidad_tanque_auxiliar_litros?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  clase_aislamiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  grado_proteccion_ip?: string;

  @IsOptional()
  @IsInt()
  anio_fabricacion?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════
// BOMBA UPDATE DTO
// ═══════════════════════════════════════════════════════

export class UpdateDatosBombaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca_bomba?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_bomba?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_bomba?: string;

  @IsOptional()
  @IsEnum(['CENTRIFUGA', 'TURBINA_VERTICAL_POZO', 'SUMERGIBLE', 'PERIFERICA', 'TURBINA', 'DESPLAZAMIENTO_POSITIVO'])
  tipo_bomba?: string;

  @IsOptional()
  @IsEnum(['AGUA_POTABLE', 'AGUAS_RESIDUALES', 'AGUAS_LLUVIAS', 'CONTRAINCENDIOS', 'INDUSTRIAL', 'PISCINA', 'RIEGO'])
  aplicacion_bomba?: string;

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
  caudal_maximo_m3h?: number;

  @IsOptional()
  @IsNumber()
  altura_manometrica_maxima_m?: number;

  @IsOptional()
  @IsNumber()
  altura_presion_trabajo_m?: number;

  @IsOptional()
  @IsNumber()
  potencia_hidraulica_kw?: number;

  @IsOptional()
  @IsNumber()
  eficiencia_porcentaje?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  numero_total_bombas_sistema?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
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
  presion_encendido_psi?: number;

  @IsOptional()
  @IsNumber()
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
  cantidad_tanques?: number;

  @IsOptional()
  @IsNumber()
  capacidad_tanques_litros?: number;

  @IsOptional()
  @IsNumber()
  presion_tanques_psi?: number;

  @IsOptional()
  @IsBoolean()
  tiene_manometro?: boolean;

  @IsOptional()
  @IsNumber()
  rango_manometro_min_psi?: number;

  @IsOptional()
  @IsNumber()
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
  anio_fabricacion?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════
// DTO PRINCIPAL: UPDATE DATOS ESPECÍFICOS
// ═══════════════════════════════════════════════════════

export class UpdateDatosEspecificosDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDatosMotorDto)
  datosMotor?: UpdateDatosMotorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDatosGeneradorDto)
  datosGenerador?: UpdateDatosGeneradorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDatosBombaDto)
  datosBomba?: UpdateDatosBombaDto;
}
