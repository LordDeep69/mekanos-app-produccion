// Command - Aprobar Cotización Cliente

export class AprobarCotizacionCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly aprobadoPor: number,
    public readonly observaciones?: string,
  ) {}
}
