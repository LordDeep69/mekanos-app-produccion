export class GetProximosAVencerQuery {
  constructor(
    public readonly dias_anticipacion: number = 30,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}
