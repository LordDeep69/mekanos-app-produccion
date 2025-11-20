/**
 * Command: Cancelar orden de servicio
 * (Soft delete - cambiar estado a CANCELADA)
 */
export class CancelarOrdenCommand {
  constructor(
    public readonly ordenId: number,
    public readonly motivoCancelacion: string,
    public readonly userId: number,
  ) {}
}
