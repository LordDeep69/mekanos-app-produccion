import { equipos_bomba } from '@prisma/client';

export interface CrearEquipoBombaData {
  id_equipo: number;
  marca_bomba: string;
  tipo_bomba: 'CENTRIFUGA' | 'TURBINA_VERTICAL_POZO' | 'SUMERGIBLE' | 'PERIFERICA' | 'TURBINA' | 'DESPLAZAMIENTO_POSITIVO';
  modelo_bomba?: string;
  numero_serie_bomba?: string;
  aplicacion_bomba?: 'AGUA_POTABLE' | 'AGUAS_RESIDUALES' | 'AGUAS_LLUVIAS' | 'CONTRAINCENDIOS' | 'INDUSTRIAL' | 'PISCINA' | 'RIEGO';
  diametro_aspiracion?: string;
  diametro_descarga?: string;
  caudal_maximo_m3h?: number;
  altura_manometrica_maxima_m?: number;
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
  presion_encendido_psi?: number;
  presion_apagado_psi?: number;
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
  a_o_fabricacion?: number;
  observaciones?: string;
  metadata?: Record<string, any>;
  creado_por: number;
}

export interface ActualizarEquipoBombaData {
  marca_bomba?: string;
  tipo_bomba?: 'CENTRIFUGA' | 'TURBINA_VERTICAL_POZO' | 'SUMERGIBLE' | 'PERIFERICA' | 'TURBINA' | 'DESPLAZAMIENTO_POSITIVO';
  modelo_bomba?: string;
  numero_serie_bomba?: string;
  aplicacion_bomba?: 'AGUA_POTABLE' | 'AGUAS_RESIDUALES' | 'AGUAS_LLUVIAS' | 'CONTRAINCENDIOS' | 'INDUSTRIAL' | 'PISCINA' | 'RIEGO';
  diametro_aspiracion?: string;
  diametro_descarga?: string;
  caudal_maximo_m3h?: number;
  altura_manometrica_maxima_m?: number;
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
  presion_encendido_psi?: number;
  presion_apagado_psi?: number;
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
  a_o_fabricacion?: number;
  observaciones?: string;
  metadata?: Record<string, any>;
  modificado_por?: number;
}

export interface EquiposBombaFilters {
  marca_bomba?: string;
  tipo_bomba?: string;
  aplicacion_bomba?: string;
  tiene_variador_frecuencia?: boolean;
  page?: number;
  limit?: number;
}

export interface EquipoBombaEntity extends Omit<equipos_bomba, 
  'caudal_maximo_m3h' | 'altura_manometrica_maxima_m' | 'altura_presion_trabajo_m' |
  'potencia_hidraulica_kw' | 'eficiencia_porcentaje' | 'presion_encendido_psi' |
  'presion_apagado_psi' | 'amperaje_contactor' | 'capacidad_tanques_litros' |
  'presion_tanques_psi' | 'rango_manometro_min_psi' | 'rango_manometro_max_psi'
> {
  caudal_maximo_m3h?: number;
  altura_manometrica_maxima_m?: number;
  altura_presion_trabajo_m?: number;
  potencia_hidraulica_kw?: number;
  eficiencia_porcentaje?: number;
  presion_encendido_psi?: number;
  presion_apagado_psi?: number;
  amperaje_contactor?: number;
  capacidad_tanques_litros?: number;
  presion_tanques_psi?: number;
  rango_manometro_min_psi?: number;
  rango_manometro_max_psi?: number;
}

export interface IEquiposBombaRepository {
  crear(data: CrearEquipoBombaData): Promise<equipos_bomba>;
  actualizar(id_equipo: number, data: ActualizarEquipoBombaData): Promise<equipos_bomba>;
  obtenerPorId(id_equipo: number): Promise<EquipoBombaEntity | null>;
  obtenerTodos(filters: EquiposBombaFilters): Promise<{ data: EquipoBombaEntity[]; total: number }>;
  eliminar(id_equipo: number): Promise<void>;
}
