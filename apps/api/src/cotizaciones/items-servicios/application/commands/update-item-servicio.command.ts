// Command - Actualizar Item Servicio (EAM-CPQ Universal)

export class UpdateItemServicioCommand {
  constructor(
    public readonly idItemServicio: number,
    public readonly idCotizacion: number,
    public readonly cantidad?: number,
    public readonly unidad?: string,
    public readonly precioUnitario?: number,
    public readonly descuentoPorcentaje?: number,
    public readonly descripcionPersonalizada?: string,
    public readonly observaciones?: string,
    public readonly justificacionPrecio?: string,
    public readonly ordenItem?: number,
    public readonly idEquipo?: number | null,
    public readonly costoUnitario?: number,
    public readonly esOpcional?: boolean,
    public readonly ivaAplicable?: boolean,
    public readonly seccionTitulo?: string,
  ) {}
}
