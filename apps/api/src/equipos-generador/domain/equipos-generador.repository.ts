import { equipos_generador } from '@prisma/client';

export interface CrearEquipoGeneradorData {
  id_equipo: number;
  marca_generador: string;
  modelo_generador?: string;
  numero_serie_generador?: string;
  marca_alternador?: string;
  modelo_alternador?: string;
  numero_serie_alternador?: string;
  potencia_kw?: number;
  potencia_kva?: number;
  factor_potencia?: number;
  voltaje_salida: string;
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
  año_fabricacion?: number;
  observaciones?: string;
  metadata?: any;
  creado_por: number;
}

export interface ActualizarEquipoGeneradorData {
  marca_generador?: string;
  modelo_generador?: string;
  numero_serie_generador?: string;
  marca_alternador?: string;
  modelo_alternador?: string;
  numero_serie_alternador?: string;
  potencia_kw?: number;
  potencia_kva?: number;
  factor_potencia?: number;
  voltaje_salida?: string;
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
  año_fabricacion?: number;
  observaciones?: string;
  metadata?: any;
  modificado_por: number;
}

export interface EquiposGeneradorFilters {
  marca_generador?: string;
  tiene_avr?: boolean;
  tiene_modulo_control?: boolean;
  tiene_arranque_automatico?: boolean;
  page?: number;
  limit?: number;
}

export interface EquipoGeneradorEntity extends Omit<equipos_generador, 'potencia_kw' | 'potencia_kva' | 'factor_potencia' | 'amperaje_nominal_salida' | 'capacidad_tanque_principal_litros' | 'capacidad_tanque_auxiliar_litros'> {
  potencia_kw?: number;
  potencia_kva?: number;
  factor_potencia?: number;
  amperaje_nominal_salida?: number;
  capacidad_tanque_principal_litros?: number;
  capacidad_tanque_auxiliar_litros?: number;
}

export interface IEquiposGeneradorRepository {
  crear(data: CrearEquipoGeneradorData): Promise<equipos_generador>;
  actualizar(id_equipo: number, data: ActualizarEquipoGeneradorData): Promise<equipos_generador>;
  obtenerPorId(id_equipo: number): Promise<EquipoGeneradorEntity | null>;
  obtenerTodos(filters: EquiposGeneradorFilters): Promise<{ data: EquipoGeneradorEntity[]; total: number }>;
  eliminar(id_equipo: number): Promise<void>;
}
