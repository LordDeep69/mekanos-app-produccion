export interface IAlertasStockRepository {
  generarAlertasAutomaticas(): Promise<AlertaGeneracionResult>;
  resolverAlerta(idAlerta: number, userId: number, observaciones?: string): Promise<AlertaResult>;
  findAll(filters: AlertasStockFilters): Promise<AlertasStockPaginatedResult>;
  findById(idAlerta: number): Promise<AlertaResult>;
  getDashboard(): Promise<AlertasDashboardResult>;
}

export interface AlertasStockFilters {
  tipo_alerta?: string;
  nivel?: string;
  estado?: string;
  id_componente?: number;
  fecha_desde?: Date;
  fecha_hasta?: Date;
  page?: number;
  limit?: number;
}

export interface AlertaResult {
  id_alerta: number;
  tipo_alerta: string;
  nivel: string;
  id_componente: number | null;
  id_lote: number | null;
  mensaje: string;
  estado: string;
  fecha_generacion: Date;
  fecha_resolucion: Date | null;
  resuelto_por: number | null;
  observaciones: string | null;
  componente?: {
    id_componente: number;
    nombre: string;
    codigo_referencia?: string;
  } | null;
  resolvedor?: {
    id_usuario: number;
    nombre_completo: string;
  } | null;
}

export interface AlertaGeneracionResult {
  alertas_generadas: number;
  tipos: {
    stock_minimo: number;
    stock_critico: number;
    vencimiento_proximo: number;
    vencimiento_critico: number;
  };
}

export interface AlertasStockPaginatedResult {
  data: AlertaResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AlertasDashboardResult {
  total_pendientes: number;
  total_criticas: number;
  alertas_por_tipo: Array<{
    tipo: string;
    count: number;
  }>;
  alertas_recientes: AlertaResult[];
}
