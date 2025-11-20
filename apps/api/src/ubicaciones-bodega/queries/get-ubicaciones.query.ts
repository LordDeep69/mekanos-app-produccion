export class GetUbicacionesQuery {
  constructor(
    public readonly zona?: string,
    public readonly activo?: boolean,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
