/**
 * Command: IniciarOrdenCommand
 * ASIGNADA → EN_PROCESO
 * Inicia la ejecución de la orden
 */
export class IniciarOrdenCommand {
  constructor(public readonly ordenId: string) {}
}
