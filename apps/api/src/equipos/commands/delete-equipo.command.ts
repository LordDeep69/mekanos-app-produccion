/**
 * Command para eliminar un equipo
 * ✅ FASE 2: Incluye userId para auditoría
 */
export class DeleteEquipoCommand {
  constructor(
    public readonly equipoId: number,
    public readonly userId: number
  ) {}
}
