export class ResolverAlertaCommand {
  constructor(
    public readonly id_alerta: number,
    public readonly userId: number,
    public readonly observaciones?: string,
  ) {}
}
