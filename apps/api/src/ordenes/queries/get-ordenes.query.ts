/**
 * Query: GetOrdenesQuery
 * Obtiene lista paginada de órdenes con filtros
 */
export class GetOrdenesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly clienteId?: number,
    public readonly equipoId?: number,
    public readonly tecnicoId?: number,
    public readonly estado?: string,
    public readonly prioridad?: string
  ) {}
}
