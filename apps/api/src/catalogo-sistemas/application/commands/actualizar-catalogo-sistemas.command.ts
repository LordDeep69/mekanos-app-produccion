export class ActualizarCatalogoSistemasCommand {
  constructor(
    public readonly idSistema: number,
    public readonly nombreSistema?: string,
    public readonly descripcion?: string,
    public readonly aplicaA?: string[],
    public readonly ordenVisualizacion?: number,
    public readonly icono?: string,
    public readonly colorHex?: string,
    public readonly activo?: boolean,
    public readonly observaciones?: string,
  ) {}
}
