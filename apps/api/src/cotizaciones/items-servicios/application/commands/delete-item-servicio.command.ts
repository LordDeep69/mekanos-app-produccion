// Command - Eliminar Item Servicio

export class DeleteItemServicioCommand {
  constructor(
    public readonly idItemServicio: number,
    public readonly idCotizacion: number,
  ) {}
}
