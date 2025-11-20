export class CrearOrdenCompraCommand {
  constructor(
    public readonly numero_orden_compra: string,
    public readonly id_proveedor: number,
    public readonly fecha_necesidad: string | undefined,
    public readonly observaciones: string | undefined,
    public readonly userId: number,
    public readonly items: Array<{
      id_componente: number;
      cantidad: number;
      precio_unitario: number;
      observaciones?: string;
    }>,
  ) {}
}
