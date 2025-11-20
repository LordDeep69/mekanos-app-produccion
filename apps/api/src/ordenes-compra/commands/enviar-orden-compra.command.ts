export class EnviarOrdenCompraCommand {
  constructor(
    public readonly id_orden_compra: number,
    public readonly userId: number,
  ) {}
}
