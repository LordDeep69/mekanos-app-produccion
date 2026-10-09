export interface IOrdenesCompraRepository {
  crearOrdenCompra(data: CrearOrdenCompraData): Promise<OrdenCompraResult>;
  enviarOrdenCompra(idOrdenCompra: number, userId: number): Promise<OrdenCompraResult>;
  cancelarOrdenCompra(idOrdenCompra: number, motivo: string, userId: number): Promise<OrdenCompraResult>;
  findAll(filters: OrdenesCompraFilters): Promise<OrdenesCompraPaginatedResult>;
  findById(idOrdenCompra: number): Promise<OrdenCompraResult>;
  getOrdenesActivasProveedor(idProveedor: number): Promise<OrdenCompraResult[]>;
  getResumenKpis(): Promise<OrdenesCompraResumenKpis>;
  getSourcingProveedor(idProveedor: number): Promise<ArticuloSourcingResult[]>;
  getCostoComponente(idProveedor: number, idComponente: number): Promise<CostoComponenteResult>;
}

export interface CrearOrdenCompraData {
  numero_orden_compra?: string;
  id_proveedor: number;
  fecha_necesidad?: Date;
  observaciones?: string;
  solicitada_por: number;
  items: OrdenCompraItemData[];
}

export interface OrdenCompraItemData {
  id_componente: number;
  cantidad: number;
  precio_unitario: number;
  observaciones?: string;
}

export interface OrdenesCompraFilters {
  id_proveedor?: number;
  estado?: string;
  fecha_desde?: Date;
  fecha_hasta?: Date;
  numero_orden?: string;
  page?: number;
  limit?: number;
}

export interface OrdenCompraResult {
  id_orden_compra: number;
  numero_orden_compra: string;
  id_proveedor: number;
  fecha_solicitud: Date;
  fecha_necesidad: Date | null;
  estado: string;
  observaciones: string | null;
  solicitada_por: number;
  aprobada_por: number | null;
  fecha_aprobacion: Date | null;
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
  detalles?: OrdenCompraDetalleResult[];
  recepciones?: RecepcionCompraResult[];
}

export interface OrdenCompraDetalleResult {
  id_detalle: number;
  id_componente: number;
  cantidad: number;
  cantidad_recibida_acumulada?: number;
  cantidad_aceptada_acumulada?: number;
  cantidad_rechazada_acumulada?: number;
  cantidad_pendiente?: number;
  precio_unitario: number;
  subtotal: number;
  observaciones: string | null;
  componente?: {
    id_componente: number;
    referencia_fabricante: string;
    descripcion_corta?: string;
    codigo_interno?: string | null;
    unidad_medida?: string | null;
  };
}

export interface RecepcionCompraResult {
  id_recepcion: number;
  numero_recepcion: string;
  id_detalle_orden?: number;
  cantidad_recibida: number;
  cantidad_aceptada: number;
  cantidad_rechazada: number;
  calidad: string;
  tipo_recepcion?: string;
  id_ubicacion_destino?: number | null;
  ubicacion_nombre?: string | null;
  observaciones?: string | null;
  fecha_recepcion: Date;
}

export interface OrdenesCompraPaginatedResult {
  data: OrdenCompraResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrdenesCompraResumenKpis {
  total_ordenes: number;
  borradores: number;
  enviadas: number;
  parciales: number;
  completadas: number;
  canceladas: number;
  monto_total_comprometido: number;
}

export interface ArticuloSourcingResult {
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

export interface CostoComponenteResult {
  id_componente: number;
  id_proveedor: number;
  costo: number;
  moneda: string;
  referencia_proveedor: string | null;
  tiempo_entrega_dias: number | null;
  es_pactado: boolean;
}

