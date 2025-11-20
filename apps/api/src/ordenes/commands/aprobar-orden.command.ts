/**
 * Command: Aprobar orden de servicio
 * Transición: COMPLETADA → APROBADA (estado final)
 */
export class AprobarOrdenCommand {
  constructor(
    public readonly ordenId: number,
    public readonly aprobadoPor: number,
  ) {}
}
