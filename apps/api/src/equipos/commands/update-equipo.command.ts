import { UpdateEquipoDto } from '../dto/update-equipo.dto';

/**
 * Command para actualizar un equipo
 */
export class UpdateEquipoCommand {
  constructor(
    public readonly equipoId: number,
    public readonly dto: UpdateEquipoDto
  ) {}
}
