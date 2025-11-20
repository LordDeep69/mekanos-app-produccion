/**
 * GetVersionesQuery
 * FASE 4.8: Listar versiones históricas cotización
 */
export class GetVersionesQuery {
  constructor(
    public readonly idCotizacion: number,
    public readonly skip?: number,
    public readonly take?: number,
  ) {}
}
