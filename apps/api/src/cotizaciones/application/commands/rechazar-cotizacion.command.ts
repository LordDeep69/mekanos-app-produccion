// Command - Rechazar Cotización

export class RechazarCotizacionCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly idMotivoRechazo: number,
    public readonly observacionesRechazo: string,
    public readonly rechazadoPor: number,
  ) {}
}
