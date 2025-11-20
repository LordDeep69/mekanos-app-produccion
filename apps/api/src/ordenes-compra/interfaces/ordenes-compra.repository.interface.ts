export interface IOrdenesCompraRepository {
  crearOrdenCompra(data: CrearOrdenCompraData): Promise<OrdenCompraResult>;
  enviarOrdenCompra(idOrdenCompra: number, userId: number): Promise<OrdenCompraResult>;
  cancelarOrdenCompra(idOrdenCompra: number, motivo: string, userId: number): Promise<OrdenCompraResult>;
  findAll(filters: OrdenesCompraFilters): Promise<OrdenesCompraPaginatedResult>;
  findById(idOrdenCompra: number): Promise<OrdenCompraResult>;
  getOrdenesActivasProveedor(idProveedor: number): Promise<OrdenCompraResult[]>;
}

export interface CrearOrdenCompraData {
  numero_orden_compra: string;
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
  proveedor?: {
    id_proveedor: number;
    nombre_completo: string;
  };
  solicitante?: {
    id_usuario: number;
    nombre_completo: string;
  };
  aprobador?: {
    id_usuario: number;
    nombre_completo: string;
  } | null;
  detalles?: OrdenCompraDetalleResult[];
  recepciones?: RecepcionCompraResult[];
}

export interface OrdenCompraDetalleResult {
  id_detalle: number;
  id_componente: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones: string | null;
  componente?: {
    id_componente: number;
    referencia_fabricante: string;
    descripcion_corta?: string;
    codigo_interno?: string;
  };
}

export interface RecepcionCompraResult {
  id_recepcion: number;
  numero_recepcion: string;
  cantidad_recibida: number;
  cantidad_aceptada: number;
  cantidad_rechazada: number;
  calidad: string;
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
