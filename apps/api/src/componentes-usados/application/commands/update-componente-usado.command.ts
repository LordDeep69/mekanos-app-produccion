import { UpdateComponenteUsadoDto } from '../../dto/update-componente-usado.dto';

/**
 * Command para actualizar componente usado
 * Tabla 12/14 - FASE 3
 */
export class UpdateComponenteUsadoCommand {
  constructor(
    public readonly id: number,
    public readonly data: UpdateComponenteUsadoDto,
  ) {}
}
