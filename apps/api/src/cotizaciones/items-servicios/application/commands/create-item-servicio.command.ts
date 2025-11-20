// Command - Crear Item Servicio

export class CreateItemServicioCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly idServicio: number,
    public readonly cantidad: number,
    public readonly unidad: string | undefined,
    public readonly precioUnitario: number,
    public readonly descuentoPorcentaje: number | undefined,
    public readonly descripcionPersonalizada: string | undefined,
    public readonly observaciones: string | undefined,
    public readonly justificacionPrecio: string | undefined,
    public readonly ordenItem: number | undefined,
    public readonly registradoPor: number | undefined,
  ) {}
}
