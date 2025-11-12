/**
 * Query: GetOrdenesTecnicoQuery
 * Obtiene órdenes asignadas a un técnico
 */
export class GetOrdenesTecnicoQuery {
  constructor(
    public readonly tecnicoId: number,
    public readonly estado?: string
  ) {}
}
