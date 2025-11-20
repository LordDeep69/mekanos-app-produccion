import { UpdateMedicionDto } from '../../dto/update-medicion.dto';

/**
 * UpdateMedicionCommand - Command para actualizar medición
 * FASE 4.2 - Preserva medido_por original
 */

export class UpdateMedicionCommand {
  constructor(
    public readonly dto: UpdateMedicionDto,
    public readonly userId: number,
  ) {}
}
