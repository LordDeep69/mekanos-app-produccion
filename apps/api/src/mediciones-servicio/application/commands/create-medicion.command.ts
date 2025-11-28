import { CreateMedicionDto } from '../../dto/create-medicion.dto';

/**
 * CreateMedicionCommand - Command para crear medición - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 */

export class CreateMedicionCommand {
  constructor(
    public readonly dto: CreateMedicionDto,
    public readonly userId: number, // medidoPor desde JWT
  ) {}
}
