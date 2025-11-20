// Command - Solicitar Aprobación Interna

export class SolicitarAprobacionCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly observacionesSolicitante: string,
    public readonly solicitadaPor: number,
  ) {}
}
