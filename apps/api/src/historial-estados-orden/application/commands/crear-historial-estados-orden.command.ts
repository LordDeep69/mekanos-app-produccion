export class CrearHistorialEstadosOrdenCommand {
  constructor(
    public readonly idOrdenServicio: number,
    public readonly idEstadoAnterior: number | undefined,
    public readonly idEstadoNuevo: number,
    public readonly motivoCambio: string | undefined,
    public readonly observaciones: string | undefined,
    public readonly accion: string | undefined,
    public readonly realizadoPor: number,
    public readonly ipOrigen: string | undefined,
    public readonly userAgent: string | undefined,
    public readonly duracionEstadoAnteriorMinutos: number | undefined,
    public readonly metadata: any | undefined,
  ) {}
}
