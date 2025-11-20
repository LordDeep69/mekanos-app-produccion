import { equipos_motor } from '@prisma/client';

export interface CrearEquipoMotorData {
  id_equipo: number; // FK a equipos_base
  tipo_motor: 'COMBUSTION' | 'ELECTRICO';
  marca_motor: string;
  modelo_motor?: string;
  numero_serie_motor?: string;
  potencia_hp?: number;
  potencia_kw?: number;
  velocidad_nominal_rpm?: number;
  tipo_combustible?: 'DIESEL' | 'GASOLINA' | 'GAS_NATURAL' | 'GLP' | 'DUAL' | 'BIODIESEL';
  numero_cilindros?: number;
  cilindrada_cc?: number;
  tiene_turbocargador?: boolean;
  tipo_arranque?: 'ELECTRICO' | 'MANUAL' | 'NEUMATICO' | 'HIDRAULICO';
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
  capacidad_aceite_litros?: number;
  tipo_aceite?: string;
  capacidad_refrigerante_litros?: number;
  tipo_refrigerante?: string;
  voltaje_operacion_vac?: string;
  numero_fases?: 'MONOFASICO' | 'TRIFASICO';
  frecuencia_hz?: number;
  clase_aislamiento?: 'A' | 'B' | 'F' | 'H';
  grado_proteccion_ip?: string;
  amperaje_nominal?: number;
  factor_potencia?: number;
  a_o_fabricacion?: number; // Mapea a "año_fabricacion" en DB
  observaciones?: string;
  metadata?: any;
  creado_por: number;
}

export interface ActualizarEquipoMotorData {
  tipo_motor?: 'COMBUSTION' | 'ELECTRICO';
  marca_motor?: string;
  modelo_motor?: string;
  numero_serie_motor?: string;
  potencia_hp?: number;
  potencia_kw?: number;
  velocidad_nominal_rpm?: number;
  tipo_combustible?: 'DIESEL' | 'GASOLINA' | 'GAS_NATURAL' | 'GLP' | 'DUAL' | 'BIODIESEL';
  numero_cilindros?: number;
  cilindrada_cc?: number;
  tiene_turbocargador?: boolean;
  tipo_arranque?: 'ELECTRICO' | 'MANUAL' | 'NEUMATICO' | 'HIDRAULICO';
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
  capacidad_aceite_litros?: number;
  tipo_aceite?: string;
  capacidad_refrigerante_litros?: number;
  tipo_refrigerante?: string;
  voltaje_operacion_vac?: string;
  numero_fases?: 'MONOFASICO' | 'TRIFASICO';
  frecuencia_hz?: number;
  clase_aislamiento?: 'A' | 'B' | 'F' | 'H';
  grado_proteccion_ip?: string;
  amperaje_nominal?: number;
  factor_potencia?: number;
  a_o_fabricacion?: number; // Mapea a "año_fabricacion" en DB
  observaciones?: string;
  metadata?: any;
  modificado_por: number;
}

export interface EquiposMotorFilters {
  tipo_motor?: 'COMBUSTION' | 'ELECTRICO';
  marca_motor?: string;
  tipo_combustible?: 'DIESEL' | 'GASOLINA' | 'GAS_NATURAL' | 'GLP' | 'DUAL' | 'BIODIESEL';
  tiene_turbocargador?: boolean;
  page?: number;
  limit?: number;
}

export interface EquipoMotorEntity extends Omit<equipos_motor, 'potencia_hp' | 'potencia_kw' | 'amperaje_arranque' | 'radiador_alto_cm' | 'radiador_ancho_cm' | 'radiador_espesor_cm' | 'amperaje_cargador' | 'capacidad_aceite_litros' | 'capacidad_refrigerante_litros' | 'amperaje_nominal' | 'factor_potencia'> {
  potencia_hp?: number;
  potencia_kw?: number;
  amperaje_arranque?: number;
  radiador_alto_cm?: number;
  radiador_ancho_cm?: number;
  radiador_espesor_cm?: number;
  amperaje_cargador?: number;
  capacidad_aceite_litros?: number;
  capacidad_refrigerante_litros?: number;
  amperaje_nominal?: number;
  factor_potencia?: number;
}

export interface IEquiposMotorRepository {
  crear(data: CrearEquipoMotorData): Promise<equipos_motor>;
  actualizar(id_equipo: number, data: ActualizarEquipoMotorData): Promise<equipos_motor>;
  obtenerPorId(id_equipo: number): Promise<EquipoMotorEntity | null>;
  obtenerTodos(filters: EquiposMotorFilters): Promise<{ data: EquipoMotorEntity[]; total: number }>;
  eliminar(id_equipo: number): Promise<void>;
}
