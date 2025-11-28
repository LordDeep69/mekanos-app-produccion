/**
 * Command eliminar evidencia fotográfica
 * FASE 3 - Tabla 11 - DELETE físico
 */

export class DeleteEvidenciaCommand {
  constructor(
    public readonly id: number,
    public readonly userId: number,
  ) {}
}
