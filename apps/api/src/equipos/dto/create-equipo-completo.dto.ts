/**
 * DTO UNIFICADO PARA CREACIÓN DE EQUIPOS - MEKANOS S.A.S
 * 
 * Maneja la creación polimórfica de equipos:
 * - Tabla padre: equipos
 * - Tabla hijo: equipos_generador | equipos_bomba | equipos_motor
 * 
 * Versión: 4.0 - 100% Fidelidad SQL Schema
 */

import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateIf,
    ValidateNested,
    IsDateString,
    IsJSON
} from 'class-validator';

// 
// ENUMS (Sincronizados con SQL)
// 

export enum TipoEquipoDiscriminator {
  GENERADOR = 'GENERADOR',
  BOMBA = 'BOMBA',
  MOTOR = 'MOTOR',
}

export enum EstadoEquipoEnum {
  OPERATIVO = 'OPERATIVO',
  STANDBY = 'STANDBY',
  INACTIVO = 'INACTIVO',
  EN_REPARACION = 'EN_REPARACION',
  FUERA_SERVICIO = 'FUERA_SERVICIO',
  BAJA = 'BAJA',
}

export enum CriticidadEnum {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export enum TipoMotorEnum {
  COMBUSTION = 'COMBUSTION',
  ELECTRICO = 'ELECTRICO',
}

export enum TipoCombustibleEnum {
  DIESEL = 'DIESEL',
  GASOLINA = 'GASOLINA',
  GAS_NATURAL = 'GAS_NATURAL',
  GLP = 'GLP',
  DUAL = 'DUAL',
  BIODIESEL = 'BIODIESEL',
}

export enum TipoArranqueEnum {
  ELECTRICO = 'ELECTRICO',
  MANUAL = 'MANUAL',
  NEUMATICO = 'NEUMATICO',
  HIDRAULICO = 'HIDRAULICO',
}

export enum NumeroFasesEnum {
  MONOFASICO = 'MONOFASICO',
  TRIFASICO = 'TRIFASICO',
}

export enum ClaseAislamientoEnum {
  A = 'A',
  B = 'B',
  F = 'F',
  H = 'H',
}

export enum TipoBombaEnum {
  CENTRIFUGA = 'CENTRIFUGA',
  TURBINA_VERTICAL_POZO = 'TURBINA_VERTICAL_POZO',
  SUMERGIBLE = 'SUMERGIBLE',
  PERIFERICA = 'PERIFERICA',
  TURBINA = 'TURBINA',
  DESPLAZAMIENTO_POSITIVO = 'DESPLAZAMIENTO_POSITIVO',
}

export enum AplicacionBombaEnum {
  AGUA_POTABLE = 'AGUA_POTABLE',
  AGUAS_RESIDUALES = 'AGUAS_RESIDUALES',
  AGUAS_LLUVIAS = 'AGUAS_LLUVIAS',
  CONTRAINCENDIOS = 'CONTRAINCENDIOS',
  INDUSTRIAL = 'INDUSTRIAL',
  PISCINA = 'PISCINA',
  RIEGO = 'RIEGO',
}

// 
// DTO DATOS COMUNES DEL EQUIPO (TABLA PADRE: equipos)
// 

export class DatosEquipoBaseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[A-Z0-9\-]+$/, {
    message: 'codigo_equipo debe contener solo letras mayúsculas, números y guiones',
  })
  codigo_equipo: string;

  @IsInt()
  @IsPositive()
  id_cliente: number;

  @IsInt()
  @IsPositive()
  id_tipo_equipo: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  id_sede?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_equipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_equipo?: string;

  @IsString()
  @MaxLength(500)
  ubicacion_texto: string;

  @IsOptional()
  @IsJSON()
  ubicacion_detallada?: any;

  @IsEnum(EstadoEquipoEnum)
  estado_equipo: EstadoEquipoEnum = EstadoEquipoEnum.OPERATIVO;

  @IsEnum(CriticidadEnum)
  criticidad: CriticidadEnum = CriticidadEnum.MEDIA;

  @IsOptional()
  @IsString()
  criticidad_justificacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_instalacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio_servicio_mekanos?: string;

  @IsOptional()
  @IsBoolean()
  en_garantia?: boolean;

  @IsOptional()
  @IsDateString()
  fecha_inicio_garantia?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin_garantia?: string;
}

// 
// DTO DATOS DEL MOTOR (TABLA: equipos_motor)
// 

export class DatosMotorDto {
  @IsEnum(TipoMotorEnum)
  tipo_motor: TipoMotorEnum;

  @IsString()
  @MaxLength(100)
  marca_motor: string;

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

  // Campos Combustión
  @IsOptional()
  @IsEnum(TipoCombustibleEnum)
  tipo_combustible?: TipoCombustibleEnum;

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
  @IsEnum(TipoArranqueEnum)
  tipo_arranque?: TipoArranqueEnum;

  @IsOptional()
  @IsInt()
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

  // Campos Eléctricos
  @IsOptional()
  @IsString()
  @MaxLength(30)
  voltaje_operacion_vac?: string;

  @IsOptional()
  @IsEnum(NumeroFasesEnum)
  numero_fases?: NumeroFasesEnum;

  @IsOptional()
  @IsInt()
  frecuencia_hz?: number;

  @IsOptional()
  @IsEnum(ClaseAislamientoEnum)
  clase_aislamiento?: ClaseAislamientoEnum;

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

  @IsOptional()
  @IsJSON()
  metadata?: any;
}

// 
// DTO DATOS ESPECÍFICOS DE GENERADOR (TABLA: equipos_generador)
// 

export class DatosGeneradorDto {
  @IsString()
  @MaxLength(100)
  marca_generador: string;

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

  @IsString()
  @MaxLength(50)
  voltaje_salida: string;

  @IsOptional()
  @IsInt()
  numero_fases?: number;

  @IsOptional()
  @IsInt()
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

  @IsOptional()
  @IsJSON()
  metadata?: any;
}

// 
// DTO DATOS ESPECÍFICOS DE BOMBA (TABLA: equipos_bomba)
// 

export class DatosBombaDto {
  @IsString()
  @MaxLength(100)
  marca_bomba: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo_bomba?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_serie_bomba?: string;

  @IsEnum(TipoBombaEnum)
  tipo_bomba: TipoBombaEnum;

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
  numero_total_bombas_sistema?: number;

  @IsOptional()
  @IsInt()
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

  @IsOptional()
  @IsJSON()
  metadata?: any;
}

// 
// DTO PRINCIPAL UNIFICADO
// 

export class CreateEquipoCompletoDto {
  @IsEnum(TipoEquipoDiscriminator)
  tipo: TipoEquipoDiscriminator;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DatosEquipoBaseDto)
  datosEquipo: DatosEquipoBaseDto;

  /**
   * Datos del motor.
   * Casi siempre requerido para Generadores y Bombas.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosMotorDto)
  datosMotor?: DatosMotorDto;

  /**
   * Datos específicos de generador.
   * REQUERIDO si tipo === 'GENERADOR'
   */
  @ValidateIf((o) => o.tipo === TipoEquipoDiscriminator.GENERADOR)
  @IsNotEmpty({ message: 'datosGenerador es requerido para equipos tipo GENERADOR' })
  @ValidateNested()
  @Type(() => DatosGeneradorDto)
  datosGenerador?: DatosGeneradorDto;

  /**
   * Datos específicos de bomba.
   * REQUERIDO si tipo === 'BOMBA'
   */
  @ValidateIf((o) => o.tipo === TipoEquipoDiscriminator.BOMBA)
  @IsNotEmpty({ message: 'datosBomba es requerido para equipos tipo BOMBA' })
  @ValidateNested()
  @Type(() => DatosBombaDto)
  datosBomba?: DatosBombaDto;
}

// 
// RESPONSE DTOs
// 

export interface CreateEquipoCompletoResponse {
  success: boolean;
  message: string;
  data: {
    id_equipo: number;
    codigo_equipo: string;
    tipo: string;
    nombre_equipo: string | null;
    cliente: { id_cliente: number; nombre: string };
    sede: { id_sede: number; nombre: string } | null;
    estado_equipo: string;
    fecha_creacion: string;
    datos_especificos: Record<string, any>;
  };
}
