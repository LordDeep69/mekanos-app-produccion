/**
 * Interface del repositorio de gastos de orden
 * Tabla 13/14 - FASE 3
 */
export interface IGastosOrdenRepository {
  /**
   * Crear un nuevo gasto de orden
   */
  create(data: CreateGastoOrdenData): Promise<any>;

  /**
   * Buscar todos los gastos de orden
   */
  findAll(): Promise<any[]>;

  /**
   * Buscar gasto por ID
   */
  findById(idGasto: number): Promise<any | null>;

  /**
   * Buscar gastos por orden de servicio
   */
  findByOrdenServicio(idOrdenServicio: number): Promise<any[]>;

  /**
   * Actualizar gasto de orden
   */
  update(idGasto: number, data: UpdateGastoOrdenData): Promise<any>;

  /**
   * Eliminar gasto de orden (Hard Delete)
   */
  delete(idGasto: number): Promise<void>;
}

/**
 * Data para crear gasto
 */
export interface CreateGastoOrdenData {
  idOrdenServicio: number;
  tipoGasto: string;
  descripcion: string;
  justificacion: string;
  valor: number;
  tieneComprobante?: boolean;
  numeroComprobante?: string;
  proveedor?: string;
  rutaComprobante?: string;
  requiereAprobacion?: boolean;
  estadoAprobacion?: string;
  observacionesAprobacion?: string;
  fechaGasto?: string;
  generadoPor?: number;
  observaciones?: string;
  registradoPor?: number;
}

/**
 * Data para actualizar gasto
 */
export interface UpdateGastoOrdenData {
  tipoGasto?: string;
  descripcion?: string;
  justificacion?: string;
  valor?: number;
  tieneComprobante?: boolean;
  numeroComprobante?: string;
  proveedor?: string;
  rutaComprobante?: string;
  requiereAprobacion?: boolean;
  estadoAprobacion?: string;
  observacionesAprobacion?: string;
  fechaGasto?: string;
  generadoPor?: number;
  aprobadoPor?: number;
  fechaAprobacion?: string;
  observaciones?: string;
  modificadoPor?: number;
}
