/**
 * Command para eliminar permanentemente un equipo (hard delete)
 * ⚠️ Solo funciona con equipos marcados como inactivos
 */
export class HardDeleteEquipoCommand {
  constructor(
    public readonly equipoId: number,
    public readonly userId: number,
    public readonly confirmacion: string
  ) {}
}
