export class GetTiposEquipoQuery {
  constructor(
    public readonly page?: number,
    public readonly limit?: number,
    public readonly categoria?: string,
    public readonly activo?: boolean,
    public readonly disponible?: boolean,
    public readonly tiene_motor?: boolean,
    public readonly tiene_generador?: boolean,
    public readonly tiene_bomba?: boolean,
  ) {}
}
