export class ListarCatalogosServicioQuery {
  constructor(
    public readonly activo?: boolean,
    public readonly categoria?: string,
    public readonly tipoServicioId?: number,
    public readonly tipoEquipoId?: number,
  ) {}
}
