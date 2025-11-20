/**
 * Query para obtener lista de tipos de componente con filtros
 */
export class GetTiposComponenteQuery {
  constructor(
    public readonly categoria?: string,
    public readonly aplica_a?: string,
    public readonly es_consumible?: boolean,
    public readonly es_inventariable?: boolean,
    public readonly activo?: boolean,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
