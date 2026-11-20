// Command - Crear Item Servicio (EAM-CPQ Universal)

export class CreateItemServicioCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly idServicio: number | undefined,
    public readonly cantidad: number,
    public readonly unidad: string | undefined,
    public readonly precioUnitario: number,
    public readonly descuentoPorcentaje: number | undefined,
    public readonly descripcionPersonalizada: string | undefined,
    public readonly observaciones: string | undefined,
    public readonly justificacionPrecio: string | undefined,
    public readonly ordenItem: number | undefined,
    public readonly registradoPor: number | undefined,
    public readonly idEquipo?: number,
    public readonly costoUnitario?: number,
    public readonly esOpcional?: boolean,
    public readonly ivaAplicable?: boolean,
    public readonly seccionTitulo?: string,
  ) {}
}
