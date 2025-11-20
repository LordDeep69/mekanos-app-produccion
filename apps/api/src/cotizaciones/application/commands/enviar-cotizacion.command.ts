// Command - Enviar Cotización

export class EnviarCotizacionCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly destinatarioEmail: string,
    public readonly destinatarioNombre: string,
    public readonly emailsCopia: string[],
    public readonly enviadoPor: number,
  ) {}
}
