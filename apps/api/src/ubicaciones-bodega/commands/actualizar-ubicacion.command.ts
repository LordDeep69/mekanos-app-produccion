export class ActualizarUbicacionCommand {
  constructor(
    public readonly id_ubicacion: number,
    public readonly codigo_ubicacion?: string,
    public readonly zona?: string,
    public readonly pasillo?: string,
    public readonly estante?: string,
    public readonly nivel?: string,
    public readonly activo?: boolean,
  ) {}
}
