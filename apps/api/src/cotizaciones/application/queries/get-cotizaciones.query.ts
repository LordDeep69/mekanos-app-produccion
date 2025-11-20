/**
 * GET COTIZACIONES QUERY (con filtros y paginación)
 */
export class GetCotizacionesQuery {
  constructor(
    public readonly clienteId?: number,
    public readonly sedeId?: number,
    public readonly estadoId?: number,
    public readonly fechaEmisionDesde?: Date,
    public readonly fechaEmisionHasta?: Date,
    public readonly elaboradaPor?: number,
    public readonly skip?: number,
    public readonly take?: number,
  ) {}
}
