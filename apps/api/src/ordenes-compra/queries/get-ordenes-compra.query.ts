export class GetOrdenesCompraQuery {
  constructor(
    public readonly id_proveedor?: number,
    public readonly estado?: string,
    public readonly fecha_desde?: Date,
    public readonly fecha_hasta?: Date,
    public readonly numero_orden?: string,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
