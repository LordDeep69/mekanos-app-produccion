export class GetLotesQuery {
  constructor(
    public readonly id_componente?: number,
    public readonly estado_lote?: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}
