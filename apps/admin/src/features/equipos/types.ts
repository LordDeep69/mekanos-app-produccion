/**
 * TIPOS DE EQUIPOS - MEKANOS S.A.S
 * 
 * Tipos TypeScript para el módulo de gestión de equipos.
 * Versión: 4.0 - 100% Fidelidad SQL Schema & Backend DTO
 */

// 
// ENUMS
// 

export type TipoEquipo = 'GENERADOR' | 'BOMBA' | 'MOTOR';

export type EstadoEquipo =
  | 'OPERATIVO'
  | 'STANDBY'
  | 'INACTIVO'
  | 'EN_REPARACION'
  | 'FUERA_SERVICIO'
  | 'BAJA';

export type Criticidad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type TipoMotor = 'COMBUSTION' | 'ELECTRICO';

export type TipoCombustible =
  | 'DIESEL'
  | 'GASOLINA'
  | 'GAS_NATURAL'
  | 'GLP'
  | 'DUAL'
  | 'BIODIESEL';

export type TipoArranque =
  | 'ELECTRICO'
  | 'MANUAL'
  | 'NEUMATICO'
  | 'HIDRAULICO';

export type NumeroFases = 'MONOFASICO' | 'TRIFASICO';

export type ClaseAislamiento = 'A' | 'B' | 'F' | 'H';

export type CriterioIntervalo = 'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO';

export type TipoContrato =
  | 'SIN_CONTRATO'
  | 'PREVENTIVO'
  | 'INTEGRAL'
  | 'POR_LLAMADA';

export type EstadoPintura = 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'MALO' | 'NO_APLICA';

export type TipoBomba =
  | 'CENTRIFUGA'
  | 'TURBINA_VERTICAL_POZO'
  | 'SUMERGIBLE'
  | 'PERIFERICA'
  | 'TURBINA'
  | 'DESPLAZAMIENTO_POSITIVO';

export type AplicacionBomba =
  | 'AGUA_POTABLE'
  | 'AGUAS_RESIDUALES'
  | 'AGUAS_LLUVIAS'
  | 'CONTRAINCENDIOS'
  | 'INDUSTRIAL'
  | 'PISCINA'
  | 'RIEGO';

// 
// INTERFACES PRINCIPALES
// 

export interface EquipoListItem {
  id_equipo: number;
  codigo_equipo: string;
  nombre_equipo: string | null;
  tipo: TipoEquipo;
  estado_equipo: EstadoEquipo;
  criticidad: Criticidad;
  ubicacion_texto: string;
  cliente: {
    id_cliente: number;
    nombre: string;
  };
  sede: {
    id_sede: number;
    nombre: string;
  } | null;
  fecha_creacion: string;
  datos_especificos: Record<string, unknown> | null;
  motor?: DatosMotor;
}

export interface EquipoDetalle extends EquipoListItem {
  numero_serie_equipo: string | null;
  tipo_equipo: {
    id_tipo_equipo: number;
    nombre_tipo: string;
    codigo_tipo: string;
  };
  config_parametros?: ConfigParametros;
  fecha_modificacion?: string;
  // Campos de fechas importantes
  fecha_instalacion?: string | null;
  fecha_inicio_servicio_mekanos?: string | null;
  // Campos de garantía
  en_garantia?: boolean;
  fecha_inicio_garantia?: string | null;
  fecha_fin_garantia?: string | null;
  proveedor_garantia?: string | null;
  // Campos de horas y mantenimiento
  horas_actuales?: number | string | null;
  fecha_ultima_lectura_horas?: string | null;
  tipo_contrato?: TipoContrato;
  // Intervalos de mantenimiento override
  intervalo_tipo_a_dias_override?: number | null;
  intervalo_tipo_a_horas_override?: number | null;
  intervalo_tipo_b_dias_override?: number | null;
  intervalo_tipo_b_horas_override?: number | null;
  criterio_intervalo_override?: CriterioIntervalo | null;
  // Estado físico
  estado_pintura?: EstadoPintura | null;
  requiere_pintura?: boolean;
  // Observaciones
  observaciones_generales?: string | null;
  configuracion_especial?: string | null;
  criticidad_justificacion?: string | null;
  // Estado de baja
  activo?: boolean;
  fecha_baja?: string | null;
  motivo_baja?: string | null;
  // Relaciones
  lecturas_horometro: Array<{
    id_lectura: number;
    horas_lectura: number | string;
    fecha_lectura: string;
    tipo_lectura?: string;
    observaciones?: string | null;
  }>;
  historial_estados: Array<{
    id_historial: number;
    estado_anterior: string | null;
    estado_nuevo: string;
    fecha_cambio: string;
    motivo_cambio?: string | null;
  }>;
}

// 
// DTOs PARA CREACIÓN (Fieles al Backend)
// 

export interface DatosEquipoBase {
  codigo_equipo: string;
  id_cliente: number;
  id_tipo_equipo: number;
  id_sede?: number;
  nombre_equipo?: string;
  numero_serie_equipo?: string;
  ubicacion_texto: string;
  ubicacion_detallada?: Record<string, unknown>;
  estado_equipo: EstadoEquipo;
  criticidad: Criticidad;
  criticidad_justificacion?: string;
  fecha_instalacion?: string;
  fecha_inicio_servicio_mekanos?: string;
  en_garantia?: boolean;
  fecha_inicio_garantia?: string;
  fecha_fin_garantia?: string;
  proveedor_garantia?: string;
  horas_actuales?: number;
  fecha_ultima_lectura_horas?: string;
  estado_pintura?: EstadoPintura;
  requiere_pintura?: boolean;
  tipo_contrato?: TipoContrato;
  intervalo_tipo_a_dias_override?: number;
  intervalo_tipo_a_horas_override?: number;
  intervalo_tipo_b_dias_override?: number;
  intervalo_tipo_b_horas_override?: number;
  criterio_intervalo_override?: CriterioIntervalo;
  observaciones_generales?: string;
  configuracion_especial?: string;
  activo?: boolean;
  fecha_baja?: string;
  motivo_baja?: string;
  metadata?: Record<string, unknown>;
}

export interface DatosMotor {
  tipo_motor: TipoMotor;
  marca_motor: string;
  modelo_motor?: string;
  numero_serie_motor?: string;
  potencia_hp?: number;
  potencia_kw?: number;
  velocidad_nominal_rpm?: number;
  tipo_combustible?: TipoCombustible;
  numero_cilindros?: number;
  voltaje_arranque_vdc?: number;
  capacidad_aceite_litros?: number;
  capacidad_refrigerante_litros?: number;
  voltaje_operacion_vac?: string;
  frecuencia_hz?: number;
  aspiracion?: string;
  sistema_enfriamiento?: string;
  capacidad_baterias_ah?: number;
  cantidad_baterias?: number;
  tipo_aceite_recomendado?: string;
  tipo_refrigerante_recomendado?: string;
  presion_aceite_minima_psi?: number;
  temperatura_operacion_maxima_c?: number;
}

export interface DatosGenerador {
  marca_generador: string;
  modelo_generador?: string;
  numero_serie_generador?: string;
  potencia_kva?: number;
  potencia_kw_generador?: number;
  voltaje_salida: string;
  amperaje_maximo?: number;
  numero_fases?: number;
  frecuencia_hz_generador?: number;
  factor_potencia?: number;
  tipo_conexion?: string;
  marca_avr?: string;
  modelo_avr?: string;
  marca_controlador?: string;
  modelo_controlador?: string;
  capacidad_tanque_principal_litros?: number;
  tiene_cabina_insonorizada?: boolean;
  tiene_transferencia_automatica?: boolean;
  tipo_transferencia?: string;
  ubicacion_transferencia?: string;
  calibre_cable_potencia?: string;
  longitud_cable_potencia_m?: number;
}

export interface DatosBomba {
  marca_bomba: string;
  modelo_bomba?: string;
  numero_serie_bomba?: string;
  tipo_bomba: string;
  caudal_maximo_m3h?: number;
  altura_manometrica_maxima_m?: number;
  presion_maxima_psi?: number;
  diametro_succion_pulgadas?: number;
  diametro_descarga_pulgadas?: number;
  presion_encendido_psi?: number;
  presion_apagado_psi?: number;
  material_cuerpo_bomba?: string;
  material_impulsor?: string;
  tipo_sello_mecanico?: string;
  succion_positiva?: boolean;
  tiene_tablero_control?: boolean;
  marca_tablero_control?: string;
  modelo_tablero_control?: string;
  radiador_alto_cm?: number;
  radiador_ancho_cm?: number;
  radiador_panal_cm?: number;
}

// ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Tipos para config personalizada
export interface ConfigParametros {
  unidades?: {
    temperatura?: string;
    presion?: string;
    voltaje?: string;
    frecuencia?: string;
    corriente?: string;
    velocidad?: string;
    vibracion?: string;
    potencia?: string;
  };
  rangos?: Record<string, {
    min_normal?: number;
    max_normal?: number;
    min_critico?: number;
    max_critico?: number;
    valor_ideal?: number;
  }>;
}

export interface CreateEquipoPayload {
  tipo: TipoEquipo;
  datosEquipo: DatosEquipoBase;
  datosMotor?: DatosMotor;
  datosGenerador?: DatosGenerador;
  datosBomba?: DatosBomba;
  // ✅ FLEXIBILIZACIÓN PARÁMETROS: Config personalizada opcional
  config_parametros?: ConfigParametros;
}

/**
 * Payload para actualizar un equipo existente
 * Basado en UpdateEquipoDto del backend NestJS
 * ✅ 23-FEB-2026: Expandido con TODOS los campos de la tabla equipos
 */
export interface UpdateEquipoPayload {
  // Identificación
  codigo_equipo?: string;
  id_cliente?: number;
  id_tipo_equipo?: number;
  id_sede?: number | null;
  nombre_equipo?: string;
  numero_serie_equipo?: string;
  ubicacion_texto?: string;
  // Estado
  estado_equipo?: EstadoEquipo;
  criticidad?: Criticidad;
  criticidad_justificacion?: string;
  // Fechas
  fecha_instalacion?: string | null;
  fecha_inicio_servicio_mekanos?: string | null;
  // Garantía
  en_garantia?: boolean;
  fecha_inicio_garantia?: string | null;
  fecha_fin_garantia?: string | null;
  proveedor_garantia?: string;
  // Pintura
  estado_pintura?: EstadoPintura;
  requiere_pintura?: boolean;
  // Contrato
  tipo_contrato?: TipoContrato;
  // Intervalos override
  intervalo_tipo_a_dias_override?: number | null;
  intervalo_tipo_a_horas_override?: number | null;
  intervalo_tipo_b_dias_override?: number | null;
  intervalo_tipo_b_horas_override?: number | null;
  criterio_intervalo_override?: CriterioIntervalo | null;
  // Observaciones
  observaciones_generales?: string;
  configuracion_especial?: string;
  // Parámetros
  config_parametros?: ConfigParametros;
}

/**
 * ✅ 23-FEB-2026: Payload para actualizar datos específicos (Motor, Generador, Bomba)
 */
export interface UpdateDatosEspecificosPayload {
  datosMotor?: Partial<DatosMotor> & {
    cilindrada_cc?: number;
    tiene_turbocargador?: boolean;
    tipo_arranque?: string;
    voltaje_arranque_vdc?: number;
    amperaje_arranque?: number;
    numero_baterias?: number;
    referencia_bateria?: string;
    capacidad_bateria_ah?: number;
    tiene_radiador?: boolean;
    radiador_alto_cm?: number;
    radiador_ancho_cm?: number;
    radiador_espesor_cm?: number;
    tiene_cargador_bateria?: boolean;
    marca_cargador?: string;
    modelo_cargador?: string;
    amperaje_cargador?: number;
    tipo_aceite?: string;
    tipo_refrigerante?: string;
    clase_aislamiento?: string;
    grado_proteccion_ip?: string;
    amperaje_nominal?: number;
    factor_potencia?: number;
    anio_fabricacion?: number;
    observaciones?: string;
  };
  datosGenerador?: Partial<DatosGenerador> & {
    numero_serie_alternador?: string;
    marca_alternador?: string;
    modelo_alternador?: string;
    potencia_kw?: number;
    potencia_kva?: number;
    factor_potencia?: number;
    numero_fases?: number;
    frecuencia_hz?: number;
    amperaje_nominal_salida?: number;
    configuracion_salida?: string;
    tiene_avr?: boolean;
    marca_avr?: string;
    modelo_avr?: string;
    referencia_avr?: string;
    tiene_modulo_control?: boolean;
    marca_modulo_control?: string;
    modelo_modulo_control?: string;
    tiene_arranque_automatico?: boolean;
    capacidad_tanque_principal_litros?: number;
    tiene_tanque_auxiliar?: boolean;
    capacidad_tanque_auxiliar_litros?: number;
    clase_aislamiento?: string;
    grado_proteccion_ip?: string;
    anio_fabricacion?: number;
    observaciones?: string;
  };
  datosBomba?: Partial<DatosBomba> & {
    aplicacion_bomba?: string;
    diametro_aspiracion?: string;
    diametro_descarga?: string;
    altura_presion_trabajo_m?: number;
    potencia_hidraulica_kw?: number;
    eficiencia_porcentaje?: number;
    numero_total_bombas_sistema?: number;
    numero_bomba_en_sistema?: number;
    tiene_panel_control?: boolean;
    marca_panel_control?: string;
    modelo_panel_control?: string;
    tiene_presostato?: boolean;
    marca_presostato?: string;
    modelo_presostato?: string;
    tiene_contactor_externo?: boolean;
    marca_contactor?: string;
    amperaje_contactor?: number;
    tiene_arrancador_suave?: boolean;
    tiene_variador_frecuencia?: boolean;
    marca_variador?: string;
    modelo_variador?: string;
    tiene_tanques_hidroneumaticos?: boolean;
    cantidad_tanques?: number;
    capacidad_tanques_litros?: number;
    presion_tanques_psi?: number;
    tiene_manometro?: boolean;
    rango_manometro_min_psi?: number;
    rango_manometro_max_psi?: number;
    tiene_proteccion_nivel?: boolean;
    tipo_proteccion_nivel?: string;
    tiene_valvula_purga?: boolean;
    tiene_valvula_cebado?: boolean;
    tiene_valvula_cheque?: boolean;
    tiene_valvula_pie?: boolean;
    referencia_sello_mecanico?: string;
    anio_fabricacion?: number;
    observaciones?: string;
  };
}

// 
// RESPUESTAS
// 

export interface CreateEquipoResponse {
  success: boolean;
  message: string;
  error?: string;
  data: {
    id_equipo: number;
    codigo_equipo: string;
    tipo: string;
    nombre_equipo: string | null;
    cliente: { id_cliente: number; nombre: string };
    sede: { id_sede: number; nombre: string } | null;
    estado_equipo: string;
    fecha_creacion: string;
    datos_especificos: Record<string, unknown>;
  };
}

/**
 * ✅ 08-ENE-2026: Response para cambiar estado de equipo
 */
export interface CambiarEstadoResponse {
  success: boolean;
  message: string;
  data: {
    id_equipo: number;
    codigo_equipo: string;
    estado_anterior: string;
    estado_nuevo: string;
    motivo_cambio?: string;
    fecha_cambio: string;
    id_historial: number;
  };
}

/**
 * ✅ 08-ENE-2026: Response para registrar lectura de horómetro
 */
export interface RegistrarLecturaResponse {
  success: boolean;
  message: string;
  data: {
    id_lectura: number;
    id_equipo: number;
    codigo_equipo: string;
    horas_anteriores: number;
    horas_nuevas: number;
    horas_transcurridas: number;
    dias_transcurridos: number | null;
    horas_promedio_dia: number | null;
    fecha_lectura: string;
  };
}

export interface EquiposListadoResponse {
  data: EquipoListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
