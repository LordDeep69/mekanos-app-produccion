import { ICommand } from '@nestjs/cqrs';

/**
 * Command: Eliminar (soft delete) parámetro de medición
 * Marca como inactivo (activo = false) sin eliminación física
 */
export class EliminarParametrosMedicionCommand implements ICommand {
  constructor(public readonly id: number) {}
}
