/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos de Dominio para Órdenes de Compra y Abastecimiento Comercial (Ciclo 4.A)
 */

export type EstadoOrdenCompra = 'BORRADOR' | 'ENVIADA' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';

export interface OrdenCompraDetalle {
  id_detalle: number;
  id_componente: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string | null;
  componente?: {
    id_componente: number;
    referencia_fabricante: string;
    descripcion_corta?: string;
    codigo_interno?: string | null;
    unidad_medida?: string | null;
  };
}

export interface RecepcionResumen {
  id_recepcion: number;
  numero_recepcion: string;
  cantidad_recibida: number;
  cantidad_aceptada: number;
  cantidad_rechazada: number;
  calidad: string;
  fecha_recepcion: string;
}

export interface OrdenCompra {
  id_orden_compra: number;
  numero_orden_compra: string;
  id_proveedor: number;
  fecha_solicitud: string;
  fecha_necesidad: string | null;
  estado: EstadoOrdenCompra;
  observaciones: string | null;
  solicitada_por: number;
  aprobada_por: number | null;
  fecha_aprobacion: string | null;
  subtotal: number;
  porcentaje_iva: number;
  iva: number;
  total: number;
  total_items: number;
  proveedor?: {
    id_proveedor: number;
    nombre_completo: string;
    razon_social?: string | null;
    numero_identificacion?: string | null;
  };
  solicitante?: {
    id_usuario: number;
    nombre_completo: string;
    username?: string;
  };
  aprobador?: {
    id_usuario: number;
    nombre_completo: string;
    username?: string;
  } | null;
  detalles?: OrdenCompraDetalle[];
  recepciones?: RecepcionResumen[];
}

export interface OrdenesCompraPaginatedResponse {
  data: OrdenCompra[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrdenesCompraKpis {
  total_ordenes: number;
  borradores: number;
  enviadas: number;
  parciales: number;
  completadas: number;
  canceladas: number;
  monto_total_comprometido: number;
}

export interface ItemOrdenCompraPayload {
  id_componente: number;
  cantidad: number;
  precio_unitario: number;
  observaciones?: string;
}

export interface CrearOrdenCompraPayload {
  numero_orden_compra?: string;
  id_proveedor: number;
  fecha_necesidad?: string;
  observaciones?: string;
  items: ItemOrdenCompraPayload[];
}

export interface ArticuloSourcing {
  id_componente: number;
  codigo_interno: string | null;
  descripcion_corta: string;
  referencia_fabricante: string;
  referencia_proveedor: string | null;
  costo_actual: number;
  moneda: string;
  tiempo_entrega_dias: number | null;
  cantidad_minima_compra: number | null;
  es_pactado: boolean;
  stock_actual: number;
  unidad_medida: string | null;
}

export interface CostoSourcingResponse {
  id_componente: number;
  id_proveedor: number;
  costo: number;
  moneda: string;
  referencia_proveedor: string | null;
  tiempo_entrega_dias: number | null;
  es_pactado: boolean;
}
