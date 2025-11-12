/**
 * Command: FinalizarOrdenCommand
 * EN_PROCESO → EJECUTADA
 * Finaliza la ejecución de la orden
 */
export class FinalizarOrdenCommand {
  constructor(
    public readonly ordenId: string,
    public readonly observaciones?: string
  ) {}
}
