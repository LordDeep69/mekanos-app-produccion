export class CrearLoteCommand {
  constructor(
    public readonly codigo_lote: string,
    public readonly id_componente: number,
    public readonly cantidad_inicial: number,
    public readonly ingresado_por: number,
    public readonly fecha_fabricacion?: Date,
    public readonly fecha_vencimiento?: Date,
    public readonly id_proveedor?: number,
    public readonly numero_factura_proveedor?: string,
    public readonly observaciones?: string,
  ) {}
}
