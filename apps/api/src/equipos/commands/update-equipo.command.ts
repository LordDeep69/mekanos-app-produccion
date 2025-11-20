import { UpdateEquipoDto } from '../dto/update-equipo.dto';

/**
 * Command para actualizar un equipo
 * ✅ FASE 2: Incluye userId del usuario autenticado
 */
export class UpdateEquipoCommand {
  constructor(
    public readonly equipoId: number,
    public readonly dto: UpdateEquipoDto,
    public readonly userId: number
  ) {}
}
