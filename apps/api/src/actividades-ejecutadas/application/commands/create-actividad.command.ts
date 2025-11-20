import { CreateActividadDto } from '../../dto/create-actividad.dto';

/**
 * Command para crear actividad ejecutada
 * FASE 4.1 - CQRS Pattern
 */

export class CreateActividadCommand {
  constructor(
    public readonly dto: CreateActividadDto,
    public readonly userId: number, // Desde JWT
  ) {}
}
