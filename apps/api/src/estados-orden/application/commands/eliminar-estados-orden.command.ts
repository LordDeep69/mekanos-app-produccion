/**
 * Command para eliminar (soft delete) estado de orden
 */
export class EliminarEstadosOrdenCommand {
  constructor(public readonly idEstado: number) {}
}
