/**
 * Command para actualizar estado de orden existente
 */
export class ActualizarEstadosOrdenCommand {
  constructor(
    public readonly idEstado: number,
    public readonly codigoEstado?: string,
    public readonly nombreEstado?: string,
    public readonly descripcion?: string,
    public readonly permiteEdicion?: boolean,
    public readonly permiteEliminacion?: boolean,
    public readonly esEstadoFinal?: boolean,
    public readonly colorHex?: string,
    public readonly icono?: string,
    public readonly ordenVisualizacion?: number,
    public readonly activo?: boolean,
  ) {}
}
