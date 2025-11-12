import { CreateEquipoDto } from '../dto/create-equipo.dto';

/**
 * Command para crear un equipo
 */
export class CreateEquipoCommand {
  constructor(public readonly dto: CreateEquipoDto) {}
}
