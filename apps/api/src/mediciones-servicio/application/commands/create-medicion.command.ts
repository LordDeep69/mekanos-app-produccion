import { CreateMedicionDto } from '../../dto/create-medicion.dto';

/**
 * CreateMedicionCommand - Command para crear medición
 * FASE 4.2 - Incluye userId para medido_por
 */

export class CreateMedicionCommand {
  constructor(
    public readonly dto: CreateMedicionDto,
    public readonly userId: number,
  ) {}
}
