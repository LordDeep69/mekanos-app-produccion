import { UpdateMedicionDto } from '../../dto/update-medicion.dto';

/**
 * UpdateMedicionCommand - Command para actualizar medición - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 */

export class UpdateMedicionCommand {
  constructor(
    public readonly id: number,
    public readonly dto: UpdateMedicionDto,
    public readonly userId: number, // Para auditoría (no modifica medidoPor original)
  ) {}
}
