/**
 * Query para listar estados de orden con filtros
 */
export class ListarEstadosOrdenQuery {
  constructor(
    public readonly page?: number,
    public readonly limit?: number,
    public readonly activo?: boolean,
    public readonly esEstadoFinal?: boolean,
    public readonly permiteEdicion?: boolean,
  ) {}
}
