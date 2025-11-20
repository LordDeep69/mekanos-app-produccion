export class CancelarOrdenCompraCommand {
  constructor(
    public readonly id_orden_compra: number,
    public readonly motivo_cancelacion: string,
    public readonly userId: number,
  ) {}
}
