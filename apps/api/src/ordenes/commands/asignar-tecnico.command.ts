/**
 * Command: AsignarTecnicoCommand
 * PROGRAMADA → ASIGNADA
 * Asigna un técnico a la orden
 */
export class AsignarTecnicoCommand {
  constructor(
    public readonly ordenId: string,
    public readonly tecnicoId: number
  ) {}
}
