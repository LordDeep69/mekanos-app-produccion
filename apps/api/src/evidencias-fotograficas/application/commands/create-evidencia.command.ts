import { CreateEvidenciaDto } from '../../dto/create-evidencia.dto';

/**
 * Command crear evidencia fotográfica
 * FASE 3 - Tabla 11 - DTO refactorizado camelCase
 */

export class CreateEvidenciaCommand {
  constructor(
    public readonly dto: CreateEvidenciaDto,
    public readonly userId: number, // capturadaPor desde JWT
  ) {}
}
