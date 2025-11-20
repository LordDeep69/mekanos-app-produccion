export class CrearUbicacionCommand {
  constructor(
    public readonly codigo_ubicacion: string,
    public readonly zona: string,
    public readonly pasillo?: string,
    public readonly estante?: string,
    public readonly nivel?: string,
  ) {}
}
