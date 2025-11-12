/**
 * Command: ProgramarOrdenCommand
 * BORRADOR → PROGRAMADA
 * Programa una orden asignando fecha
 */
export class ProgramarOrdenCommand {
  constructor(
    public readonly ordenId: string,
    public readonly fechaProgramada: Date,
    public readonly observaciones?: string
  ) {}
}
