export class CrearCatalogoSistemasCommand {
  constructor(
    public readonly codigoSistema: string,
    public readonly nombreSistema: string,
    public readonly descripcion?: string,
    public readonly aplicaA?: string[],
    public readonly ordenVisualizacion?: number,
    public readonly icono?: string,
    public readonly colorHex?: string,
    public readonly activo?: boolean,
    public readonly observaciones?: string,
  ) {}
}
