import { UpdateEvidenciaDto } from '../../dto/update-evidencia.dto';

/**
 * Command actualizar evidencia fotográfica
 * FASE 3 - Tabla 11 - Solo metadatos editables (NO archivo)
 */

export class UpdateEvidenciaCommand {
  constructor(
    public readonly id: number,
    public readonly dto: UpdateEvidenciaDto,
    public readonly userId: number,
  ) {}
}
