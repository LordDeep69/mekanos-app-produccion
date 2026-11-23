import { apiClient } from '@/lib/api/client';

export interface CotizacionEstado {
  id_estado: number;
  codigo_estado?: string;
  nombre_estado: string;
  color_hex?: string | null;
}

export interface CotizacionEquipoVinculado {
  id_cotizacion_equipo?: number;
  id_equipo: number;
  orden_secuencia: number;
  notas_alcance?: string | null;
  equipos?: {
    id_equipo: number;
    codigo_equipo: string;
    nombre_equipo?: string | null;
    ubicacion_texto?: string | null;
    tipos_equipo?: {
      id_tipo_equipo: number;
      codigo_tipo: string;
      nombre_tipo: string;
      color_hex?: string | null;
      icono_ui?: string | null;
    } | null;
    modelos_equipo?: {
      id_modelo_equipo: number;
      codigo_modelo: string;
      marca: string;
      modelo: string;
    } | null;
  } | null;
}

export interface CotizacionItemServicio {
  id_item_servicio?: number;
  id_servicio?: number | null;
  id_equipo?: number | null;
  cantidad: number | string;
  unidad?: string | null;
  costo_unitario?: number | string | null;
  precio_unitario: number | string;
  descuento_porcentaje?: number | string | null;
  subtotal?: number | string | null;
  es_opcional?: boolean;
  iva_aplicable?: boolean;
  seccion_titulo?: string | null;
  descripcion_personalizada?: string | null;
  observaciones?: string | null;
  justificacion_precio?: string | null;
  orden_item?: number | null;
  catalogo_servicios?: {
    id_servicio?: number;
    codigo_servicio?: string;
    nombre_servicio?: string;
    precio_base?: number | string | null;
  } | null;
  equipos?: { id_equipo: number; codigo_equipo: string; nombre_equipo?: string | null } | null;
}

export interface CotizacionItemComponente {
  id_item_componente?: number;
  id_componente?: number | null;
  id_tipo_componente?: number | null;
  id_equipo?: number | null;
  descripcion: string;
  referencia_manual?: string | null;
  marca_manual?: string | null;
  cantidad: number | string;
  unidad?: string | null;
  costo_unitario?: number | string | null;
  precio_unitario: number | string;
  descuento_porcentaje?: number | string | null;
  subtotal?: number | string | null;
  es_opcional?: boolean;
  iva_aplicable?: boolean;
  seccion_titulo?: string | null;
  garantia_meses?: number | null;
  observaciones_garantia?: string | null;
  observaciones?: string | null;
  orden_item?: number | null;
  catalogo_componentes?: {
    id_componente: number;
    codigo_interno?: string | null;
    referencia_fabricante?: string;
    descripcion_corta?: string | null;
    stock_actual?: number | null;
    stock_minimo?: number | null;
    precio_compra?: number | string | null;
    precio_venta?: number | string | null;
    unidad_medida?: string | null;
  } | null;
  equipos?: { id_equipo: number; codigo_equipo: string; nombre_equipo?: string | null } | null;
}

export interface CotizacionItemOtro {
  id_item_otro?: number;
  id_cotizacion?: number;
  id_equipo?: number | null;
  categoria_rubro: string;
  descripcion: string;
  detalle_calculo?: string | null;
  cantidad: number | string;
  unidad?: string | null;
  costo_unitario?: number | string | null;
  precio_unitario: number | string;
  descuento_porcentaje?: number | string | null;
  subtotal?: number | string | null;
  visible_cliente?: boolean;
  es_opcional?: boolean;
  iva_aplicable?: boolean;
  orden_item?: number | null;
  observaciones?: string | null;
  equipos?: { id_equipo: number; codigo_equipo: string; nombre_equipo?: string | null } | null;
}

export interface CotizacionVersionItem {
  id_version: number;
  numero_version: number;
  fecha_version?: string;
  motivo_cambio?: string | null;
  resumen_cambios?: string | null;
  subtotal_version?: number | string | null;
  total_version?: number | string | null;
}

export interface CotizacionFirmaDigital {
  id_firma_digital: number;
  id_persona?: number;
  tipo_firma?: string;
  firma_base64: string;
  formato_firma?: string | null;
  fecha_captura?: string | null;
}

export interface FirmaHistorialEmpleadoItem {
  id_firma_digital: number;
  firma_base64: string;
  veces_usada: number;
  fecha_captura?: string | null;
  es_estandar: boolean;
}

export interface CotizacionRecord {
  id_cotizacion: number;
  numero_cotizacion: string;
  id_cliente: number;
  id_sede?: number | null;
  id_equipo?: number | null;
  id_firma_asesor?: number | null;
  id_firma_cliente?: number | null;
  firma_asesor?: CotizacionFirmaDigital | null;
  firma_cliente?: CotizacionFirmaDigital | null;
  elaborador?: {
    id_empleado?: number;
    persona?: {
      primer_nombre?: string;
      segundo_nombre?: string;
      primer_apellido?: string;
      segundo_apellido?: string;
      nombre_completo?: string;
    } | null;
  } | null;
  atencion_a_nombre?: string | null;
  atencion_a_cargo?: string | null;
  tipo_cotizacion?: string;
  id_plantilla_origen?: number | null;
  id_propuesta_origen?: number | null;
  moneda?: string | null;
  fecha_cotizacion: string;
  fecha_vencimiento: string;
  dias_validez?: number | null;
  id_estado: number;
  version?: number | null;
  asunto: string;
  descripcion_general?: string | null;
  alcance_trabajo?: string | null;
  exclusiones?: string | null;
  subtotal_servicios?: number | string;
  subtotal_componentes?: number | string;
  subtotal_otros?: number | string;
  subtotal_general?: number | string;
  subtotal_opcionales?: number | string;
  descuento_porcentaje?: number | string;
  descuento_valor?: number | string;
  subtotal_con_descuento?: number | string;
  usa_aiu?: boolean;
  aiu_admin_porcentaje?: number | string;
  aiu_imprevistos_porcentaje?: number | string;
  aiu_utilidad_porcentaje?: number | string;
  aiu_admin_valor?: number | string;
  aiu_imprevistos_valor?: number | string;
  aiu_utilidad_valor?: number | string;
  aiu_valor_total?: number | string;
  iva_sobre_utilidad_aiu?: boolean;
  iva_porcentaje?: number | string;
  iva_valor?: number | string;
  total_cotizacion?: number | string;
  costo_total_estimado?: number | string;
  utilidad_bruta_estimada?: number | string;
  margen_bruto_porcentaje?: number | string;
  observaciones_aprobacion_cliente?: string | null;
  orden_compra_cliente?: string | null;
  observaciones_rechazo?: string | null;
  modo_agrupacion_pdf?: string | null;
  mostrar_desglose_precios?: boolean;
  forma_pago?: string | null;
  terminos_condiciones?: string | null;
  meses_garantia?: number | null;
  observaciones_garantia?: string | null;
  tiempo_estimado_dias?: number | null;
  id_orden_servicio_generada?: number | null;
  fecha_conversion_os?: string | null;
  fecha_modificacion?: string | null;
  elaborada_por?: number;
  estado?: CotizacionEstado;
  estados_cotizacion?: CotizacionEstado;
  cliente?: {
    id_cliente?: number;
    nombre_sede?: string | null;
    persona?: {
      razon_social?: string | null;
      nombre_comercial?: string | null;
      nombre_completo?: string | null;
      representante_legal?: string | null;
      email_principal?: string | null;
      numero_identificacion?: string | null;
    } | null;
  } | null;
  sede?: {
    id_sede: number;
    nombre_sede: string;
    email_sede?: string | null;
    contacto_sede?: string | null;
    cargo_contacto?: string | null;
  } | null;
  equipo?: {
    id_equipo?: number;
    codigo_equipo?: string;
    nombre_equipo?: string | null;
  } | null;
  equipos_vinculados?: CotizacionEquipoVinculado[];
  plantilla_origen?: {
    id_plantilla: number;
    codigo_plantilla?: string;
    nombre: string;
    tipo_cotizacion?: string;
  } | null;
  items_servicios?: CotizacionItemServicio[];
  items_componentes?: CotizacionItemComponente[];
  items_otros?: CotizacionItemOtro[];
  aprobaciones?: AprobacionPendiente[];
  versiones?: CotizacionVersionItem[];
}

export interface CreateCotizacionPayload {
  id_cliente: number;
  id_sede?: number;
  id_equipo?: number;
  atencion_a_nombre?: string | null;
  atencion_a_cargo?: string | null;
  equipos_ids?: number[];
  tipo_cotizacion?: string;
  id_plantilla_origen?: number;
  moneda?: string;
  fecha_cotizacion: string;
  fecha_vencimiento: string;
  asunto: string;
  descripcion_general?: string;
  alcance_trabajo?: string;
  exclusiones?: string;
  descuento_porcentaje?: number;
  iva_porcentaje?: number;
  usa_aiu?: boolean;
  aiu_admin_porcentaje?: number;
  aiu_imprevistos_porcentaje?: number;
  aiu_utilidad_porcentaje?: number;
  iva_sobre_utilidad_aiu?: boolean;
  modo_agrupacion_pdf?: string;
  mostrar_desglose_precios?: boolean;
  tiempo_estimado_dias?: number;
  forma_pago?: string;
  terminos_condiciones?: string;
  meses_garantia?: number;
  observaciones_garantia?: string;
  elaborada_por?: number;
}

export interface GuardarStudioPayload {
  id_cliente?: number;
  id_sede?: number | null;
  atencion_a_nombre?: string | null;
  atencion_a_cargo?: string | null;
  elaborada_por?: number;
  tipo_cotizacion?: string;
  id_plantilla_origen?: number | null;
  moneda?: string;
  fecha_cotizacion?: string;
  fecha_vencimiento?: string;
  asunto?: string;
  descripcion_general?: string | null;
  alcance_trabajo?: string | null;
  exclusiones?: string | null;
  descuento_porcentaje?: number;
  iva_porcentaje?: number;
  usa_aiu?: boolean;
  aiu_admin_porcentaje?: number;
  aiu_imprevistos_porcentaje?: number;
  aiu_utilidad_porcentaje?: number;
  iva_sobre_utilidad_aiu?: boolean;
  modo_agrupacion_pdf?: string;
  mostrar_desglose_precios?: boolean;
  forma_pago?: string;
  terminos_condiciones?: string | null;
  meses_garantia?: number;
  observaciones_garantia?: string | null;
  tiempo_estimado_dias?: number | null;
  equipos?: Array<{ id_equipo: number; orden_secuencia?: number; notas_alcance?: string }>;
  items_servicios?: Array<{
    id_servicio?: number | null;
    id_equipo?: number | null;
    descripcion_personalizada?: string;
    cantidad: number;
    unidad?: string;
    costo_unitario?: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
    es_opcional?: boolean;
    iva_aplicable?: boolean;
    observaciones?: string;
    orden_item?: number;
  }>;
  items_componentes?: Array<{
    id_componente?: number | null;
    id_tipo_componente?: number | null;
    id_equipo?: number | null;
    descripcion: string;
    referencia_manual?: string;
    marca_manual?: string;
    cantidad: number;
    unidad?: string;
    costo_unitario?: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
    es_opcional?: boolean;
    iva_aplicable?: boolean;
    garantia_meses?: number;
    observaciones?: string;
    orden_item?: number;
  }>;
  items_otros?: Array<{
    id_equipo?: number | null;
    categoria_rubro: string;
    descripcion: string;
    detalle_calculo?: string;
    cantidad: number;
    unidad?: string;
    costo_unitario?: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
    visible_cliente?: boolean;
    es_opcional?: boolean;
    iva_aplicable?: boolean;
    observaciones?: string;
    orden_item?: number;
  }>;
}

export interface PlantillaCotizacionItem {
  id_plantilla_item?: number;
  tipo_linea: 'SERVICIO' | 'COMPONENTE' | 'OTRO';
  id_servicio?: number | null;
  id_componente?: number | null;
  categoria_rubro?: string | null;
  descripcion: string;
  detalle_calculo?: string | null;
  unidad?: string;
  cantidad_base: number;
  es_por_equipo: boolean;
  usar_precio_catalogo: boolean;
  precio_unitario_fijo?: number | null;
  costo_unitario_fijo?: number | null;
  visible_cliente?: boolean;
  es_opcional?: boolean;
  iva_aplicable?: boolean;
  garantia_meses?: number | null;
  orden_item?: number;
  observaciones?: string | null;
}

export interface PlantillaCotizacionRecord {
  id_plantilla: number;
  codigo_plantilla: string;
  nombre: string;
  descripcion?: string | null;
  tipo_cotizacion: string;
  id_tipo_equipo?: number | null;
  id_modelo_equipo?: number | null;
  id_modulo?: number | null;
  asunto_sugerido?: string | null;
  descripcion_general?: string | null;
  alcance_trabajo?: string | null;
  exclusiones?: string | null;
  terminos_condiciones?: string | null;
  forma_pago?: string | null;
  meses_garantia?: number | null;
  tiempo_estimado_dias?: number | null;
  usa_aiu: boolean;
  aiu_admin_porcentaje: number;
  aiu_imprevistos_porcentaje: number;
  aiu_utilidad_porcentaje: number;
  iva_sobre_utilidad_aiu: boolean;
  veces_usada: number;
  activo: boolean;
  tipos_equipo?: { id_tipo_equipo: number; codigo_tipo: string; nombre_tipo: string } | null;
  modelos_equipo?: {
    id_modelo_equipo: number;
    codigo_modelo: string;
    marca: string;
    modelo: string;
  } | null;
  modulos_tecnicos?: { id_modulo: number; codigo_modulo: string; nombre_modulo: string } | null;
  items: PlantillaCotizacionItem[];
}

export interface SugerenciasCpqResponse {
  total_equipos: number;
  grupos_gemelos: Array<{
    tipo_agrupacion: 'MODELO_OEM' | 'TIPO_EQUIPO';
    es_gemelo_multiple: boolean;
    cantidad_equipos: number;
    id_modelo_equipo?: number;
    id_tipo_equipo?: number;
    etiqueta: string;
    tipo_equipo: string;
    equipos: Array<{ id_equipo: number; codigo_equipo: string; nombre_equipo: string | null }>;
  }>;
  plantillas_sugeridas: Array<{
    id_plantilla: number;
    codigo_plantilla: string;
    nombre: string;
    descripcion: string | null;
    tipo_cotizacion: string;
    usa_aiu: boolean;
    veces_usada: number;
    total_items: number;
    multiplicador_equipos: number;
    subtotal_estimado: number;
    score: number;
    razones: string[];
  }>;
  bom_kits: Array<{
    id_modelo_equipo: number;
    etiqueta_modelo: string;
    equipos_gemelos: number;
    items: Array<{
      id_componente: number;
      codigo_interno: string | null;
      referencia_fabricante: string;
      descripcion: string;
      rol_bom: string;
      cantidad_por_equipo: number;
      cantidad_total_sugerida: number;
      unidad: string;
      precio_venta: number;
      precio_compra: number;
      stock_actual: number;
      deficit_stock: number;
    }>;
  }>;
  servicios_compatibles: Array<{
    id_servicio: number;
    codigo_servicio: string;
    nombre_servicio: string;
    categoria: string;
    precio_base: number;
    id_tipo_equipo: number | null;
  }>;
  repuestos_compatibles: Array<{
    id_componente: number;
    codigo_interno: string | null;
    referencia_fabricante: string;
    marca: string | null;
    descripcion_corta: string | null;
    unidad_medida: string | null;
    precio_venta: number;
    precio_compra: number;
    stock_actual: number;
    stock_minimo: number;
    aplica_todos_tipos: boolean;
  }>;
}

export interface ConvertirCotizacionOrdenResponse {
  message: string;
  orden_servicio: {
    id_orden_servicio: number;
    numero_orden: string;
    estado: string;
    equipos_count: number;
    total_general: number;
  };
  diagnostico_inventario: {
    total_repuestos_catalogo: number;
    listos_para_remision: number;
    con_deficit_compra: number;
    items: Array<{
      id_componente: number;
      codigo_interno: string | null;
      descripcion: string;
      cantidad_requerida: number;
      stock_actual: number;
      deficit: number;
      accion_sugerida: 'LISTO_PARA_REMISION' | 'GENERAR_ORDEN_COMPRA';
    }>;
  };
}

export interface AddItemServicioPayload {
  id_servicio?: number;
  id_equipo?: number;
  cantidad?: number;
  unidad?: string;
  costo_unitario?: number;
  precio_unitario: number;
  descuento_porcentaje?: number;
  es_opcional?: boolean;
  iva_aplicable?: boolean;
  descripcion_personalizada?: string;
  observaciones?: string;
}

export interface AddItemComponentePayload {
  id_componente?: number;
  id_tipo_componente?: number;
  id_equipo?: number;
  descripcion: string;
  referencia_manual?: string;
  marca_manual?: string;
  cantidad?: number;
  unidad?: string;
  costo_unitario?: number;
  precio_unitario: number;
  descuento_porcentaje?: number;
  es_opcional?: boolean;
  iva_aplicable?: boolean;
  garantia_meses?: number;
}

export interface AprobacionPendiente {
  id_aprobacion: number;
  id_cotizacion: number;
  nivel_aprobacion?: string;
  razon_nivel?: string | null;
  estado_aprobacion: string;
  observaciones_solicitante?: string | null;
  observaciones_aprobador?: string | null;
  fecha_solicitud?: string;
  fecha_respuesta?: string | null;
  cotizaciones?: {
    id_cotizacion: number;
    numero_cotizacion: string;
    asunto?: string;
    total_cotizacion?: number | string;
  };
}

export interface PropuestaCorrectivoItem {
  id_propuesta: number;
  numero_propuesta: string;
  categoria?: string;
  tipo_propuesta?: string;
  urgencia_propuesta?: string;
  descripcion_problema?: string;
  solucion_propuesta?: string;
  prioridad?: number;
  fecha_propuesta?: string;
  fecha_vencimiento?: string | null;
  subtotal_servicios?: number | string;
  subtotal_componentes?: number | string;
  total_propuesta?: number | string;
  estado?: string;
  orden_servicio?: {
    id_orden_servicio: number;
    numero_orden: string;
  } | null;
  clientes?: {
    persona?: {
      razon_social?: string | null;
      primer_nombre?: string | null;
      primer_apellido?: string | null;
    } | null;
  } | null;
  equipos?: {
    id_equipo: number;
    nombre_equipo?: string | null;
  } | null;
}

export interface CreatePropuestaPayload {
  id_orden_servicio: number;
  tipo_propuesta: 'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO';
  descripcion_hallazgo: string;
  descripcion_solucion: string;
  urgencia_propuesta: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  prioridad: number;
  tiempo_estimado_ejecucion: number;
  creada_por: number;
}

export interface TipoComponenteItem {
  id_tipo_componente: number;
  codigo_tipo?: string;
  nombre_componente: string;
  categoria?: string;
}

export interface MotivoRechazoItem {
  id_motivo_rechazo: number;
  codigo_motivo?: string;
  nombre_motivo?: string;
  descripcion?: string;
}

/**
 * Normaliza el código de estado de una cotización de forma inmune a Title Case / acentos / legacy.
 */
export function getEstadoCodigoCotizacion(c?: Partial<CotizacionRecord> | null): string {
  if (!c) return 'BORRADOR';
  const raw =
    c.estado?.codigo_estado ||
    c.estados_cotizacion?.codigo_estado ||
    c.estado?.nombre_estado ||
    c.estados_cotizacion?.nombre_estado;

  if (raw) {
    const norm = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    if (norm.includes('BORRADOR')) return 'BORRADOR';
    if (norm.includes('REVISION')) return 'EN_REVISION';
    if (norm.includes('APROBADA_INTERNA')) return 'APROBADA_INTERNA';
    if (norm.includes('APROBADA_CLIENTE') || norm === 'APROBADA') return 'APROBADA_CLIENTE';
    if (norm.includes('ENVIADA')) return 'ENVIADA';
    if (norm.includes('RECHAZADA')) return 'RECHAZADA';
    if (norm.includes('VENCIDA')) return 'VENCIDA';
    return norm;
  }

  const byId: Record<number, string> = {
    1: 'BORRADOR',
    2: 'EN_REVISION',
    3: 'APROBADA_INTERNA',
    4: 'ENVIADA',
    5: 'APROBADA_CLIENTE',
    6: 'RECHAZADA',
    7: 'VENCIDA',
  };
  return (c.id_estado && byId[c.id_estado]) || 'BORRADOR';
}

export const ESTADO_LABELS_COTIZACION: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En Revisión',
  APROBADA_INTERNA: 'Aprobada Interna',
  ENVIADA: 'Enviada al Cliente',
  APROBADA_CLIENTE: 'Aprobada Cliente',
  RECHAZADA: 'Rechazada',
  VENCIDA: 'Vencida',
};

export const TIPO_COTIZACION_PRESETS = [
  { value: 'SERVICIO_TECNICO', label: 'Servicio Técnico' },
  { value: 'SUMINISTRO_INSTALACION', label: 'Suministro e Instalación' },
  { value: 'SUMINISTRO', label: 'Suministro de Repuestos' },
  { value: 'PREVENTIVO', label: 'Mantenimiento Preventivo' },
  { value: 'CORRECTIVO', label: 'Mantenimiento Correctivo' },
  { value: 'PROYECTO', label: 'Proyecto / Ingeniería' },
  { value: 'CONTRATO', label: 'Propuesta Contractual' },
  { value: 'DIAGNOSTICO', label: 'Diagnóstico Técnico' },
] as const;

export const RUBRO_OTRO_PRESETS = [
  { value: 'TRANSPORTE', label: 'Transporte / Movilización' },
  { value: 'VIATICOS', label: 'Viáticos / Estadía' },
  { value: 'POLIZA', label: 'Póliza / Garantía' },
  { value: 'ALQUILER', label: 'Alquiler Equipos / Grúa' },
  { value: 'DISPOSICION_AMBIENTAL', label: 'Disposición Ambiental' },
  { value: 'SUBCONTRATO', label: 'Subcontrato Especializado' },
  { value: 'OTRO', label: 'Otro Rubro' },
] as const;

// ==================== COTIZACIONES CORE ====================

export async function getCotizaciones(params?: {
  clienteId?: number;
  estadoId?: number;
  skip?: number;
  take?: number;
}): Promise<{ total: number; page: number; perPage: number; cotizaciones: CotizacionRecord[] }> {
  const res = await apiClient.get<{
    total: number;
    page: number;
    perPage: number;
    cotizaciones: CotizacionRecord[];
  }>('/cotizaciones', { params });
  return res.data;
}

export async function getCotizacionDetalle(id: number): Promise<CotizacionRecord> {
  const res = await apiClient.get<CotizacionRecord>(`/cotizaciones/${id}`, {
    params: { includeCliente: 'true', includeItems: 'true' },
  });
  return res.data;
}

export async function createCotizacion(
  payload: CreateCotizacionPayload,
): Promise<CotizacionRecord> {
  const res = await apiClient.post<CotizacionRecord>('/cotizaciones', payload);
  return res.data;
}

export async function guardarStudioCotizacion(
  id: number,
  payload: GuardarStudioPayload,
): Promise<CotizacionRecord> {
  const res = await apiClient.put<CotizacionRecord>(`/cotizaciones/${id}/studio`, payload);
  return res.data;
}

export async function duplicarCotizacion(id: number): Promise<CotizacionRecord> {
  const res = await apiClient.post<CotizacionRecord>(`/cotizaciones/${id}/duplicar`, {});
  return res.data;
}

export async function reabrirBorradorCotizacion(
  id: number,
  motivo_cambio?: string,
): Promise<{ message: string; cotizacion: CotizacionRecord }> {
  const res = await apiClient.post<{ message: string; cotizacion: CotizacionRecord }>(
    `/cotizaciones/${id}/reabrir-borrador`,
    { motivo_cambio },
  );
  return res.data;
}

export async function getSugerenciasCpq(params: {
  equiposIds?: number[];
  tipoCotizacion?: string;
}): Promise<SugerenciasCpqResponse> {
  const res = await apiClient.get<SugerenciasCpqResponse>('/cotizaciones/sugerencias', {
    params: {
      equiposIds: params.equiposIds?.length ? params.equiposIds.join(',') : undefined,
      tipoCotizacion: params.tipoCotizacion || undefined,
    },
  });
  return res.data;
}

export async function convertirCotizacionAOrden(
  id: number,
  payload: {
    id_tipo_servicio?: number;
    fecha_programada?: string;
    id_tecnico_asignado?: number;
    prioridad?: string;
    observaciones?: string;
  },
): Promise<ConvertirCotizacionOrdenResponse> {
  const res = await apiClient.post<ConvertirCotizacionOrdenResponse>(
    `/cotizaciones/${id}/convertir-a-orden`,
    payload,
  );
  return res.data;
}

// ==================== PLANTILLAS CPQ ====================

export async function getPlantillasCotizacion(params?: {
  search?: string;
  tipo_cotizacion?: string;
  id_tipo_equipo?: number;
}): Promise<PlantillaCotizacionRecord[]> {
  const res = await apiClient.get<PlantillaCotizacionRecord[]>('/cotizaciones/plantillas', {
    params,
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createPlantillaCotizacion(
  payload: Partial<PlantillaCotizacionRecord>,
): Promise<PlantillaCotizacionRecord> {
  const res = await apiClient.post<PlantillaCotizacionRecord>('/cotizaciones/plantillas', payload);
  return res.data;
}

export async function updatePlantillaCotizacion(
  idPlantilla: number,
  payload: Partial<PlantillaCotizacionRecord>,
): Promise<PlantillaCotizacionRecord> {
  const res = await apiClient.put<PlantillaCotizacionRecord>(
    `/cotizaciones/plantillas/${idPlantilla}`,
    payload,
  );
  return res.data;
}

export async function deletePlantillaCotizacion(idPlantilla: number): Promise<void> {
  await apiClient.delete(`/cotizaciones/plantillas/${idPlantilla}`);
}

export async function aplicarPlantillaACotizacion(
  idCotizacion: number,
  idPlantilla: number,
  payload?: {
    reemplazar_items?: boolean;
    aplicar_textos_comerciales?: boolean;
    multiplicador_equipos?: number;
  },
): Promise<{ message: string; cotizacion: CotizacionRecord }> {
  const res = await apiClient.post<{ message: string; cotizacion: CotizacionRecord }>(
    `/cotizaciones/${idCotizacion}/aplicar-plantilla/${idPlantilla}`,
    payload || {},
  );
  return res.data;
}

export async function importarBomACotizacion(
  idCotizacion: number,
  idModelo: number,
  payload?: { multiplicador_equipos?: number; incluir_alternos_como_opcionales?: boolean },
): Promise<{ message: string; cotizacion: CotizacionRecord }> {
  const res = await apiClient.post<{ message: string; cotizacion: CotizacionRecord }>(
    `/cotizaciones/${idCotizacion}/importar-bom/${idModelo}`,
    payload || {},
  );
  return res.data;
}

export async function guardarCotizacionComoPlantilla(
  idCotizacion: number,
  payload: {
    nombre: string;
    codigo_plantilla?: string;
    descripcion?: string;
    normalizar_por_equipo?: boolean;
  },
): Promise<PlantillaCotizacionRecord> {
  const res = await apiClient.post<PlantillaCotizacionRecord>(
    `/cotizaciones/${idCotizacion}/guardar-como-plantilla`,
    payload,
  );
  return res.data;
}

// ==================== ÍTEMS INDIVIDUALES & WORKFLOW ====================

export async function addItemServicioCotizacion(
  idCotizacion: number,
  payload: AddItemServicioPayload,
): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${idCotizacion}/servicios`, payload);
  return res.data;
}

export async function deleteItemServicioCotizacion(
  idCotizacion: number,
  idItem: number,
): Promise<void> {
  await apiClient.delete(`/cotizaciones/${idCotizacion}/servicios/${idItem}`);
}

export async function addItemComponenteCotizacion(
  idCotizacion: number,
  payload: AddItemComponentePayload,
): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${idCotizacion}/componentes`, payload);
  return res.data;
}

export async function deleteItemComponenteCotizacion(
  idCotizacion: number,
  idItem: number,
): Promise<void> {
  await apiClient.delete(`/cotizaciones/${idCotizacion}/componentes/${idItem}`);
}

export async function recalcularCotizacion(id: number): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${id}/recalcular`, {});
  return res.data;
}

export async function solicitarAprobacionCotizacion(
  id: number,
  observaciones_solicitante: string,
): Promise<{
  message: string;
  requiere_aprobacion: boolean;
  razon?: string;
  cotizacion?: CotizacionRecord;
}> {
  const res = await apiClient.post(`/cotizaciones/${id}/solicitar-aprobacion`, {
    observaciones_solicitante,
  });
  return res.data;
}

export async function getAprobacionesPendientes(): Promise<{
  aprobaciones?: AprobacionPendiente[];
  data?: AprobacionPendiente[];
}> {
  const res = await apiClient.get('/cotizaciones/aprobaciones/pendientes');
  return res.data;
}

export async function procesarAprobacion(
  idAprobacion: number,
  decision: 'APROBADA' | 'RECHAZADA',
  observaciones_aprobador: string,
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/aprobaciones/${idAprobacion}`, {
    decision,
    observaciones_aprobador,
  });
  return res.data;
}

export async function enviarCotizacion(
  id: number,
  payload: { destinatario_email: string; destinatario_nombre: string; emails_copia?: string[] },
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/${id}/enviar`, payload);
  return res.data;
}

export async function aprobarCotizacionCliente(
  id: number,
  observaciones?: string,
  orden_compra_cliente?: string,
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/${id}/aprobar`, {
    observaciones,
    orden_compra_cliente,
  });
  return res.data;
}

export async function rechazarCotizacionCliente(
  id: number,
  payload: { id_motivo_rechazo: number; observaciones_rechazo: string },
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/${id}/rechazar`, payload);
  return res.data;
}

export async function actualizarPresentacionPdfCotizacion(
  id: number,
  mostrarDesglosePrecios: boolean,
): Promise<{
  id_cotizacion: number;
  mostrar_desglose_precios: boolean;
  fecha_modificacion?: string;
}> {
  const res = await apiClient.patch(`/cotizaciones/${id}/presentacion-pdf`, {
    mostrar_desglose_precios: mostrarDesglosePrecios,
  });
  return res.data;
}

export async function fetchCotizacionPdfBlob(id: number, forceRefresh = false): Promise<Blob> {
  const params: Record<string, string> = {
    _ts: String(Date.now()),
  };
  if (forceRefresh) {
    params.refresh = '1';
  }
  const res = await apiClient.get<Blob>(`/cotizaciones/${id}/pdf`, {
    params,
    responseType: 'blob',
  });
  return new Blob([res.data], { type: 'application/pdf' });
}

export async function downloadCotizacionPdf(id: number, numeroCotizacion?: string): Promise<void> {
  const blob = await fetchCotizacionPdfBlob(id);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${numeroCotizacion || `COTIZACION-${id}`}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// ==================== FIRMAS DIGITALES OPCIONALES EN COTIZACIONES ====================

export async function getFirmasHistorialEmpleado(
  idEmpleado: number,
  excludeFirmaId?: number,
): Promise<FirmaHistorialEmpleadoItem[]> {
  const res = await apiClient.get<{ success?: boolean; data?: FirmaHistorialEmpleadoItem[] }>(
    `/cotizaciones/firmas-historial-empleado/${idEmpleado}`,
    {
      params: excludeFirmaId ? { excludeFirmaId } : undefined,
    },
  );
  return res.data?.data || [];
}

export async function guardarFirmaCotizacion(
  idCotizacion: number,
  tipo: 'ASESOR' | 'CLIENTE',
  payload: {
    firma_base64?: string;
    id_firma_digital?: number;
    atencion_a_nombre?: string;
    atencion_a_cargo?: string;
  },
): Promise<{
  success: boolean;
  message: string;
  data: {
    id_cotizacion: number;
    tipo: 'ASESOR' | 'CLIENTE';
    id_firma_asesor?: number | null;
    id_firma_cliente?: number | null;
    firma_asesor?: CotizacionFirmaDigital | null;
    firma_cliente?: CotizacionFirmaDigital | null;
    atencion_a_nombre?: string | null;
    atencion_a_cargo?: string | null;
    fecha_modificacion?: string;
  };
}> {
  const res = await apiClient.put(`/cotizaciones/${idCotizacion}/firmas/${tipo}`, payload);
  return res.data;
}

export async function eliminarFirmaCotizacion(
  idCotizacion: number,
  tipo: 'ASESOR' | 'CLIENTE',
): Promise<{
  success: boolean;
  message: string;
  data: {
    id_cotizacion: number;
    id_firma_asesor?: number | null;
    id_firma_cliente?: number | null;
    fecha_modificacion?: string;
  };
}> {
  const res = await apiClient.delete(`/cotizaciones/${idCotizacion}/firmas/${tipo}`);
  return res.data;
}

export async function getTiposComponente(): Promise<TipoComponenteItem[]> {
  const res = await apiClient.get<
    TipoComponenteItem[] | { data?: TipoComponenteItem[]; items?: TipoComponenteItem[] }
  >('/tipos-componente', { params: { limit: 100 } });
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data || res.data?.items || [];
}

export async function getMotivosRechazo(): Promise<MotivoRechazoItem[]> {
  const res = await apiClient.get<MotivoRechazoItem[] | { data?: MotivoRechazoItem[] }>(
    '/motivos-rechazo',
    { params: { limit: 100 } },
  );
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data || [];
}

// ==================== PROPUESTAS CORRECTIVO ====================

export async function getPropuestasPendientes(params?: {
  tipoPropuesta?: string;
  urgencia?: string;
  skip?: number;
  take?: number;
}): Promise<{ propuestas: PropuestaCorrectivoItem[]; total: number }> {
  const res = await apiClient.get<{ propuestas: PropuestaCorrectivoItem[]; total: number }>(
    '/propuestas-correctivo/pendientes',
    { params },
  );
  return res.data;
}

export async function createPropuestaCorrectivo(payload: CreatePropuestaPayload): Promise<unknown> {
  const res = await apiClient.post('/propuestas-correctivo', payload);
  return res.data;
}

export async function escalarPropuestaACotizacion(
  id: number,
): Promise<{ message: string; cotizacion: CotizacionRecord }> {
  const res = await apiClient.post<{ message: string; cotizacion: CotizacionRecord }>(
    `/propuestas-correctivo/${id}/convertir-a-cotizacion`,
    {},
  );
  return res.data;
}

export async function convertirPropuestaAOrden(
  id: number,
  convertida_por: number,
): Promise<unknown> {
  const res = await apiClient.post(`/propuestas-correctivo/${id}/convertir-orden`, {
    convertida_por,
  });
  return res.data;
}
