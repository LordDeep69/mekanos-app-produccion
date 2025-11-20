export class GetAlertasStockQuery {
  constructor(
    public readonly tipo_alerta?: string,
    public readonly nivel?: string,
    public readonly estado?: string,
    public readonly id_componente?: number,
    public readonly fecha_desde?: Date,
    public readonly fecha_hasta?: Date,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
