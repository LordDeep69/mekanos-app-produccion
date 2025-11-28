/**
 * Command para crear un nuevo estado de orden
 */
export class CrearEstadosOrdenCommand {
  constructor(
    public readonly codigoEstado: string,
    public readonly nombreEstado: string,
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
