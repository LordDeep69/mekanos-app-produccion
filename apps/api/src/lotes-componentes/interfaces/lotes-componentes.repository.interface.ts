export interface ILotesComponentesRepository {
  crear(data: CrearLoteData): Promise<LoteComponente>;
  actualizar(id: number, data: ActualizarLoteData): Promise<LoteComponente>;
  ajustarCantidad(id: number, nuevaCantidad: number, observaciones: string): Promise<LoteComponente>;
  findAll(filtros: FiltrosLote): Promise<LotesPaginados>;
  findById(id: number): Promise<LoteComponente | null>;
  findByComponente(idComponente: number): Promise<LoteComponente[]>;
  findProximosAVencer(diasAnticipacion?: number): Promise<LoteComponente[]>;
}

export interface LoteComponente {
  id_lote: number;
  codigo_lote: string;
  id_componente: number;
  fecha_fabricacion: Date | null;
  fecha_vencimiento: Date | null;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado_lote: string;
  id_proveedor: number | null;
  numero_factura_proveedor: string | null;
  observaciones: string | null;
  fecha_ingreso: Date;
  ingresado_por: number;
}

export interface CrearLoteData {
  codigo_lote: string;
  id_componente: number;
  fecha_fabricacion?: Date;
  fecha_vencimiento?: Date;
  cantidad_inicial: number;
  id_proveedor?: number;
  numero_factura_proveedor?: string;
  observaciones?: string;
  ingresado_por: number;
}

export interface ActualizarLoteData {
  codigo_lote?: string;
  fecha_fabricacion?: Date;
  fecha_vencimiento?: Date;
  id_proveedor?: number;
  numero_factura_proveedor?: string;
  observaciones?: string;
  estado_lote?: string;
}

export interface FiltrosLote {
  id_componente?: number;
  estado_lote?: string;
  id_proveedor?: number;
  page?: number;
  limit?: number;
}

export interface LotesPaginados {
  data: LoteComponente[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
