export class ReordenarCatalogoSistemasCommand {
  constructor(
    public readonly items: Array<{ idSistema: number; ordenVisualizacion: number }>,
  ) {}
}
