export class CancelarRemisionCommand {
  constructor(
    public readonly id_remision: number,
    public readonly motivo_cancelacion: string,
    public readonly userId: number,
  ) {}
}
