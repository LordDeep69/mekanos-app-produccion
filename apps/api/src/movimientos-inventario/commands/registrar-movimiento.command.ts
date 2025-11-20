export class RegistrarMovimientoCommand {
  constructor(
    public readonly tipo_movimiento: string,
    public readonly origen_movimiento: string,
    public readonly id_componente: number,
    public readonly cantidad: number,
    public readonly userId: number,
    public readonly id_ubicacion?: number,
    public readonly id_lote?: number,
    public readonly id_orden_servicio?: number,
    public readonly id_orden_compra?: number,
    public readonly id_remision?: number,
    public readonly observaciones?: string,
  ) {}
}
