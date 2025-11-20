import { CreateEquipoDto } from '../dto/create-equipo.dto';

/**
 * Command para crear un equipo
 * ✅ FASE 2: Incluye userId del usuario autenticado
 */
export class CreateEquipoCommand {
  constructor(
    public readonly dto: CreateEquipoDto,
    public readonly userId: number
  ) {}
}
