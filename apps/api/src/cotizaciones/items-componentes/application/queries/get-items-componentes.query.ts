// Query - Obtener Items Componentes

export class GetItemsComponentesQuery {
  constructor(
    public readonly idCotizacion: number,
    public readonly includeComponente?: boolean,
    public readonly includeTipoComponente?: boolean,
    public readonly includeUsuario?: boolean,
  ) {}
}
