import { UpdateActividadDto } from '../../dto/update-actividad.dto';

/**
 * Command para actualizar actividad ejecutada
 */

export class UpdateActividadCommand {
  constructor(
    public readonly dto: UpdateActividadDto,
    public readonly userId: number,
  ) {}
}
