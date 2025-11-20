// Command - Procesar Aprobación (APROBAR/RECHAZAR)

export class ProcesarAprobacionCommand {
  constructor(
    public readonly idAprobacion: number,
    public readonly decision: 'APROBADA' | 'RECHAZADA',
    public readonly aprobadaPor: number,
    public readonly observacionesAprobador: string,
  ) {}
}
