import { CreateComponenteUsadoDto } from '../../dto/create-componente-usado.dto';

/**
 * Command para crear componente usado
 * Tabla 12/14 - FASE 3
 */
export class CreateComponenteUsadoCommand {
  constructor(public readonly data: CreateComponenteUsadoDto) {}
}
