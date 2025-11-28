export interface HistorialEstadosOrdenRepositoryInterface {
  crear(
    idOrdenServicio: number,
    idEstadoAnterior: number | undefined,
    idEstadoNuevo: number,
    motivoCambio: string | undefined,
    observaciones: string | undefined,
    accion: string | undefined,
    realizadoPor: number,
    ipOrigen: string | undefined,
    userAgent: string | undefined,
    duracionEstadoAnteriorMinutos: number | undefined,
    metadata: any | undefined,
  ): Promise<any>;

  listar(page: number, limit: number): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>;

  listarPorOrden(idOrden: number, page: number, limit: number): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>;

  obtenerPorId(id: number): Promise<any | null>;
}
