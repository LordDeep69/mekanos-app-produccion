// Query - Obtener Items Servicios de Cotización

export class GetItemsServiciosQuery {
  constructor(
    public readonly idCotizacion: number,
    public readonly includeServicio?: boolean,
    public readonly includeUsuario?: boolean,
  ) {}
}
