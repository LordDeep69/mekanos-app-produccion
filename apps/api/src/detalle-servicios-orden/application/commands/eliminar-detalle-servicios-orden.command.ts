export class EliminarDetalleServiciosOrdenCommand {
  constructor(
    public readonly id: number,
    public readonly modificadoPor: number,
  ) {}
}
