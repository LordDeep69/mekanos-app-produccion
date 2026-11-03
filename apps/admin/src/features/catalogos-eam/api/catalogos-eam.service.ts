/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API Tipado para el Catálogo de Equipos Maestros y Fichas Técnicas EAM
 *
 * Conecta directamente con los controladores REST de CatalogosEamModule:
 * - /catalogos/magnitudes
 * - /catalogos/unidades
 * - /catalogos/atributos-tecnicos
 * - /catalogos/modulos-tecnicos
 * - /catalogos/arquetipos
 * - /catalogos/modelos-equipo
 */

import { apiClient } from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES DE DOMINIO EAM (5 CAPAS)
// ═══════════════════════════════════════════════════════════════════════════

export type OpcionJsonItem =
  | string
  | {
      valor?: string;
      etiqueta?: string;
      value?: string;
      label?: string;
      [key: string]: any;
    };

export interface UnidadMedidaEam {
  codigo: string;
  nombre: string;
  simbolo: string;
  tipo_magnitud: string;
  id_magnitud?: number | null;
  factor_a: number | string;
  factor_b: number | string;
  es_unidad_base: boolean;
  permite_decimales: boolean;
  activo: boolean;
  magnitud?: MagnitudFisica | null;
}

export interface MagnitudFisica {
  id_magnitud: number;
  codigo_magnitud: string;
  nombre_magnitud: string;
  descripcion?: string | null;
  unidad_base_codigo?: string | null;
  es_sistema: boolean;
  activo: boolean;
  unidades_medida?: UnidadMedidaEam[];
}

export interface AtributoTecnico {
  id_atributo: number;
  codigo_atributo: string;
  nombre_atributo: string;
  descripcion?: string | null;
  tipo_control: 'NUMERICO' | 'TEXTO' | 'BOOLEANO' | 'SELECT' | 'RANGO' | string;
  id_magnitud?: number | null;
  unidad_defecto_codigo?: string | null;
  rol_semantico: string;
  opciones_json?: OpcionJsonItem[] | null;
  validacion_json?: Record<string, any> | null;
  es_sistema: boolean;
  activo: boolean;
  magnitud?: MagnitudFisica | null;
  unidad_defecto?: UnidadMedidaEam | null;
  modulo_atributos?: Array<{
    id_modulo: number;
    grupo_visual?: string | null;
    obligatorio: boolean;
    es_kpi: boolean;
    modulo: {
      id_modulo: number;
      codigo_modulo: string;
      nombre_modulo: string;
      color_ui?: string | null;
    };
  }>;
  _count?: {
    modulo_atributos: number;
  };
}

export interface ModuloAtributoItem {
  id_modulo_atributo: number;
  id_modulo: number;
  id_atributo: number;
  orden_visual: number;
  obligatorio: boolean;
  es_kpi: boolean;
  es_filtrable: boolean;
  visible_en_pdf: boolean;
  rol_semantico_override?: string | null;
  grupo_visual?: string | null;
  valor_defecto?: string | null;
  atributo: AtributoTecnico;
}

export interface ModuloTecnico {
  id_modulo: number;
  codigo_modulo: string;
  nombre_modulo: string;
  descripcion?: string | null;
  icono?: string | null;
  color_ui?: string | null;
  es_sistema: boolean;
  activo: boolean;
  modulo_atributos?: ModuloAtributoItem[];
  tipo_equipo_modulos?: Array<{
    id_tipo_equipo: number;
    obligatorio: boolean;
    orden_visual: number;
    tipo_equipo: {
      id_tipo_equipo: number;
      codigo_tipo: string;
      nombre_tipo: string;
    };
  }>;
  _count?: {
    modulo_atributos: number;
    tipo_equipo_modulos: number;
  };
}

export interface PlanMantenimientoArquetipo {
  id_plan: number;
  id_tipo_equipo: number;
  id_tipo_servicio: number;
  nombre_plan: string;
  frecuencia_dias?: number | null;
  frecuencia_uso?: number | string | null;
  criterio_intervalo: string;
  es_plan_por_defecto: boolean;
  activo: boolean;
  tipo_servicio?: {
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    categoria: string;
  };
}

export interface ArquetipoEquipo {
  id_tipo_equipo: number;
  codigo_tipo: string;
  codigo_corto?: string;
  nombre_tipo: string;
  nombre_canonico?: string;
  categoria?: string | null;
  descripcion?: string | null;
  requiere_horometro: boolean;
  icono?: string | null;
  color?: string | null;
  orden?: number | null;
  activo: boolean;
  ids_sincronizados?: number[];
  codigos_sincronizados?: string[];
  equipos_activos?: number;
  tipo_equipo_modulos: Array<{
    id_tipo_equipo_modulo: number;
    id_tipo_equipo: number;
    id_modulo: number;
    orden_visual: number;
    obligatorio: boolean;
    etiqueta_local?: string | null;
    modulo: ModuloTecnico;
  }>;
  tipo_equipo_planes: PlanMantenimientoArquetipo[];
  _count: {
    equipos: number;
    modelos_equipo: number;
  };
}

export interface ArquetipoEsquemaResponse {
  arquetipo: {
    id_tipo_equipo: number;
    codigo_tipo: string;
    nombre_tipo: string;
    categoria?: string | null;
    requiere_horometro: boolean;
  };
  modulos: Array<{
    id_modulo: number;
    codigo_modulo: string;
    nombre_modulo: string;
    descripcion?: string | null;
    icono?: string | null;
    color_ui?: string | null;
    obligatorio: boolean;
    orden_visual: number;
    etiqueta_local?: string | null;
    grupos: Array<{
      nombre: string;
      atributos: Array<{
        id_atributo: number;
        codigo_atributo: string;
        nombre_atributo: string;
        descripcion?: string | null;
        tipo_control: string;
        rol_semantico: string;
        obligatorio: boolean;
        es_kpi: boolean;
        es_filtrable: boolean;
        visible_en_pdf: boolean;
        orden_visual: number;
        valor_defecto?: string | null;
        magnitud?: string | null;
        unidad_defecto?: string | null;
        unidades_disponibles: Array<{
          codigo: string;
          nombre: string;
          simbolo: string;
          es_base: boolean;
        }>;
        opciones: OpcionJsonItem[];
      }>;
    }>;
  }>;
  planes_mantenimiento: Array<{
    id_plan: number;
    id_tipo_servicio: number;
    nombre_servicio?: string;
    nombre_plan: string;
    frecuencia_dias?: number | null;
    frecuencia_uso?: number | null;
    criterio_intervalo: string;
  }>;
}

export interface ComponenteWmsItem {
  id_componente: number;
  codigo_interno?: string | null;
  referencia_fabricante: string;
  marca?: string | null;
  descripcion_corta?: string | null;
  unidad_medida?: string | null;
  codigo_unidad_medida?: string | null;
  stock_actual?: number | null;
}

export interface ModeloBomItem {
  id_modelo_bom: number;
  id_modelo_equipo: number;
  id_componente: number;
  cantidad_sugerida: number | string;
  rol_bom: string;
  notas?: string | null;
  catalogo_componentes: ComponenteWmsItem;
}

export interface ModeloEquipoOem {
  id_modelo_equipo: number;
  id_tipo_equipo: number;
  codigo_modelo: string;
  marca: string;
  modelo: string;
  nombre_comercial?: string | null;
  especificaciones_base: Record<string, any>;
  activo: boolean;
  tipo_equipo?: {
    id_tipo_equipo: number;
    codigo_tipo: string;
    nombre_tipo: string;
  };
  modelos_equipo_bom?: ModeloBomItem[];
  _count?: {
    modelos_equipo_bom: number;
  };
}

export interface ResumenEjecutivoEam {
  magnitudes: number;
  unidades: number;
  atributos: number;
  modulos: number;
  arquetipos: number;
  modelos_oem: number;
  equipos_activos: number;
  tipos_servicio_preventivos: Array<{
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    categoria: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS DE CLIENTE HTTP
// ═══════════════════════════════════════════════════════════════════════════

export async function getResumenEjecutivoEam(): Promise<ResumenEjecutivoEam> {
  const { data } = await apiClient.get<ResumenEjecutivoEam>(
    '/catalogos/magnitudes/resumen-ejecutivo',
  );
  return data;
}

// 1. Magnitudes y Unidades UoM
export async function getMagnitudesEam(): Promise<MagnitudFisica[]> {
  const { data } = await apiClient.get<MagnitudFisica[]>('/catalogos/magnitudes');
  return data;
}

export async function createMagnitudEam(payload: {
  codigo_magnitud: string;
  nombre_magnitud: string;
  descripcion?: string;
  unidad_base_codigo?: string;
}): Promise<MagnitudFisica> {
  const { data } = await apiClient.post<MagnitudFisica>('/catalogos/magnitudes', payload);
  return data;
}

export async function updateMagnitudEam(
  codigo: string,
  payload: {
    nombre_magnitud?: string;
    descripcion?: string;
    unidad_base_codigo?: string;
    activo?: boolean;
  },
): Promise<MagnitudFisica> {
  const { data } = await apiClient.patch<MagnitudFisica>(
    `/catalogos/magnitudes/${codigo}`,
    payload,
  );
  return data;
}

export async function getUnidadesEam(magnitud?: string): Promise<UnidadMedidaEam[]> {
  const { data } = await apiClient.get<UnidadMedidaEam[]>('/catalogos/unidades', {
    params: magnitud ? { magnitud } : undefined,
  });
  return data;
}

export async function createUnidadEam(payload: {
  codigo: string;
  nombre: string;
  simbolo: string;
  id_magnitud?: number;
  codigo_magnitud?: string;
  factor_a?: number;
  factor_b?: number;
  es_unidad_base?: boolean;
  permite_decimales?: boolean;
}): Promise<UnidadMedidaEam> {
  const { data } = await apiClient.post<UnidadMedidaEam>('/catalogos/unidades', payload);
  return data;
}

export async function updateUnidadEam(
  codigo: string,
  payload: {
    nombre?: string;
    simbolo?: string;
    id_magnitud?: number;
    factor_a?: number;
    factor_b?: number;
    es_unidad_base?: boolean;
    permite_decimales?: boolean;
    activo?: boolean;
  },
): Promise<UnidadMedidaEam> {
  const { data } = await apiClient.patch<UnidadMedidaEam>(
    `/catalogos/unidades/${codigo}`,
    payload,
  );
  return data;
}

export async function convertirUomEam(payload: {
  valor: number;
  unidadOrigen: string;
  unidadDestino: string;
}): Promise<{
  valorOriginal: number;
  unidadOrigen: string;
  valorDestino: number;
  unidadDestino: string;
}> {
  const { data } = await apiClient.post('/catalogos/unidades/convertir', payload);
  return data;
}

// 2. Diccionario de Atributos Técnicos
export async function getAtributosEam(params?: {
  search?: string;
  magnitud?: string;
  tipoDato?: string;
}): Promise<AtributoTecnico[]> {
  const { data } = await apiClient.get<AtributoTecnico[]>('/catalogos/atributos-tecnicos', {
    params,
  });
  return data;
}

export async function createAtributoEam(payload: {
  codigo_atributo: string;
  nombre_atributo: string;
  descripcion?: string;
  tipo_control: string;
  id_magnitud?: number | null;
  codigo_magnitud?: string;
  unidad_defecto_codigo?: string | null;
  rol_semantico?: string;
  opciones_json?: OpcionJsonItem[];
  validacion_json?: Record<string, any>;
}): Promise<AtributoTecnico> {
  const { data } = await apiClient.post<AtributoTecnico>(
    '/catalogos/atributos-tecnicos',
    payload,
  );
  return data;
}

export async function updateAtributoEam(
  codigo: string,
  payload: {
    nombre_atributo?: string;
    descripcion?: string;
    tipo_control?: string;
    id_magnitud?: number | null;
    unidad_defecto_codigo?: string | null;
    rol_semantico?: string;
    opciones_json?: OpcionJsonItem[];
    validacion_json?: Record<string, any>;
    activo?: boolean;
  },
): Promise<AtributoTecnico> {
  const { data } = await apiClient.patch<AtributoTecnico>(
    `/catalogos/atributos-tecnicos/${codigo}`,
    payload,
  );
  return data;
}

// 3. Módulos Técnicos Funcionales
export async function getModulosEam(): Promise<ModuloTecnico[]> {
  const { data } = await apiClient.get<ModuloTecnico[]>('/catalogos/modulos-tecnicos');
  return data;
}

export async function getModuloDetalleEam(codigo: string): Promise<ModuloTecnico> {
  const { data } = await apiClient.get<ModuloTecnico>(`/catalogos/modulos-tecnicos/${codigo}`);
  return data;
}

export async function createModuloEam(payload: {
  codigo_modulo: string;
  nombre_modulo: string;
  descripcion?: string;
  icono?: string;
  color_ui?: string;
}): Promise<ModuloTecnico> {
  const { data } = await apiClient.post<ModuloTecnico>('/catalogos/modulos-tecnicos', payload);
  return data;
}

export async function updateModuloEam(
  codigo: string,
  payload: {
    nombre_modulo?: string;
    descripcion?: string;
    icono?: string;
    color_ui?: string;
    activo?: boolean;
  },
): Promise<ModuloTecnico> {
  const { data } = await apiClient.patch<ModuloTecnico>(
    `/catalogos/modulos-tecnicos/${codigo}`,
    payload,
  );
  return data;
}

export async function asignarAtributoModuloEam(
  codigoModulo: string,
  payload: {
    id_atributo: number;
    grupo_visual?: string;
    orden_visual?: number;
    obligatorio?: boolean;
    es_kpi?: boolean;
    es_filtrable?: boolean;
    visible_en_pdf?: boolean;
    valor_defecto?: string;
  },
): Promise<ModuloAtributoItem> {
  const { data } = await apiClient.post<ModuloAtributoItem>(
    `/catalogos/modulos-tecnicos/${codigoModulo}/atributos`,
    payload,
  );
  return data;
}

export async function updateAtributoModuloEam(
  codigoModulo: string,
  idAtributo: number,
  payload: {
    grupo_visual?: string;
    orden_visual?: number;
    obligatorio?: boolean;
    es_kpi?: boolean;
    es_filtrable?: boolean;
    visible_en_pdf?: boolean;
    valor_defecto?: string;
  },
): Promise<ModuloAtributoItem> {
  const { data } = await apiClient.patch<ModuloAtributoItem>(
    `/catalogos/modulos-tecnicos/${codigoModulo}/atributos/${idAtributo}`,
    payload,
  );
  return data;
}

export async function desasignarAtributoModuloEam(
  codigoModulo: string,
  idAtributo: number,
): Promise<void> {
  await apiClient.delete(`/catalogos/modulos-tecnicos/${codigoModulo}/atributos/${idAtributo}`);
}

// 4. Arquetipos de Equipo y Planes Preventivos
export async function getArquetiposEam(): Promise<ArquetipoEquipo[]> {
  const { data } = await apiClient.get<ArquetipoEquipo[]>('/catalogos/arquetipos');
  return data;
}

export async function getArquetipoEsquemaEam(
  idTipoEquipo: number,
): Promise<ArquetipoEsquemaResponse> {
  const { data } = await apiClient.get<ArquetipoEsquemaResponse>(
    `/catalogos/arquetipos/${idTipoEquipo}/esquema`,
  );
  return data;
}

export async function createArquetipoEam(payload: {
  codigo_tipo: string;
  nombre_tipo: string;
  categoria?: string;
  descripcion?: string;
  requiere_horometro?: boolean;
  icono?: string;
  color?: string;
  orden?: number;
}): Promise<ArquetipoEquipo> {
  const { data } = await apiClient.post<ArquetipoEquipo>('/catalogos/arquetipos', payload);
  return data;
}

export async function updateArquetipoEam(
  idTipoEquipo: number,
  payload: {
    nombre_tipo?: string;
    categoria?: string;
    descripcion?: string;
    requiere_horometro?: boolean;
    icono?: string;
    color?: string;
    orden?: number;
    activo?: boolean;
  },
): Promise<ArquetipoEquipo> {
  const { data } = await apiClient.patch<ArquetipoEquipo>(
    `/catalogos/arquetipos/${idTipoEquipo}`,
    payload,
  );
  return data;
}

export async function vincularModuloArquetipoEam(
  idTipoEquipo: number,
  payload: { id_modulo: number; obligatorio?: boolean },
): Promise<any> {
  const { data } = await apiClient.post(
    `/catalogos/arquetipos/${idTipoEquipo}/modulos`,
    payload,
  );
  return data;
}

export async function desvincularModuloArquetipoEam(
  idTipoEquipo: number,
  idModulo: number,
): Promise<void> {
  await apiClient.delete(`/catalogos/arquetipos/${idTipoEquipo}/modulos/${idModulo}`);
}

export async function createPlanArquetipoEam(
  idTipoEquipo: number,
  payload: {
    id_tipo_servicio: number;
    nombre_plan: string;
    frecuencia_dias?: number;
    frecuencia_uso?: number;
    criterio_intervalo?: string;
  },
): Promise<PlanMantenimientoArquetipo> {
  const { data } = await apiClient.post<PlanMantenimientoArquetipo>(
    `/catalogos/arquetipos/${idTipoEquipo}/planes`,
    payload,
  );
  return data;
}

export async function updatePlanArquetipoEam(
  idTipoEquipo: number,
  idPlan: number,
  payload: {
    nombre_plan?: string;
    frecuencia_dias?: number;
    frecuencia_uso?: number;
    criterio_intervalo?: string;
    activo?: boolean;
  },
): Promise<PlanMantenimientoArquetipo> {
  const { data } = await apiClient.patch<PlanMantenimientoArquetipo>(
    `/catalogos/arquetipos/${idTipoEquipo}/planes/${idPlan}`,
    payload,
  );
  return data;
}

export async function deletePlanArquetipoEam(
  idTipoEquipo: number,
  idPlan: number,
): Promise<void> {
  await apiClient.delete(`/catalogos/arquetipos/${idTipoEquipo}/planes/${idPlan}`);
}

// 5. Modelos Maestros OEM y Kits BOM WMS
export async function getModelosOemEam(tipoEquipo?: number): Promise<ModeloEquipoOem[]> {
  const { data } = await apiClient.get<ModeloEquipoOem[]>('/catalogos/modelos-equipo', {
    params: tipoEquipo ? { tipoEquipo } : undefined,
  });
  return data;
}

export async function getModeloOemDetalleEam(idModelo: number): Promise<ModeloEquipoOem> {
  const { data } = await apiClient.get<ModeloEquipoOem>(`/catalogos/modelos-equipo/${idModelo}`);
  return data;
}

export async function createModeloOemEam(payload: {
  codigo_modelo: string;
  marca: string;
  modelo: string;
  id_tipo_equipo: number;
  nombre_comercial?: string;
  especificaciones_base?: Record<string, any>;
}): Promise<ModeloEquipoOem> {
  const { data } = await apiClient.post<ModeloEquipoOem>('/catalogos/modelos-equipo', payload);
  return data;
}

export async function updateModeloOemEam(
  idModelo: number,
  payload: {
    marca?: string;
    modelo?: string;
    id_tipo_equipo?: number;
    nombre_comercial?: string;
    especificaciones_base?: Record<string, any>;
    activo?: boolean;
  },
): Promise<ModeloEquipoOem> {
  const { data } = await apiClient.patch<ModeloEquipoOem>(
    `/catalogos/modelos-equipo/${idModelo}`,
    payload,
  );
  return data;
}

export async function deleteModeloOemEam(idModelo: number): Promise<void> {
  await apiClient.delete(`/catalogos/modelos-equipo/${idModelo}`);
}

export async function agregarItemBomOemEam(
  idModelo: number,
  payload: {
    id_componente: number;
    cantidad_sugerida: number;
    rol_bom?: string;
    notas?: string;
  },
): Promise<ModeloBomItem> {
  const { data } = await apiClient.post<ModeloBomItem>(
    `/catalogos/modelos-equipo/${idModelo}/bom`,
    payload,
  );
  return data;
}

export async function eliminarItemBomOemEam(idModelo: number, idBom: number): Promise<void> {
  await apiClient.delete(`/catalogos/modelos-equipo/${idModelo}/bom/${idBom}`);
}

export async function buscarComponentesWmsEam(search?: string): Promise<ComponenteWmsItem[]> {
  const { data } = await apiClient.get<ComponenteWmsItem[]>(
    '/catalogos/modelos-equipo/componentes-wms',
    {
      params: search ? { search } : undefined,
    },
  );
  return data;
}
