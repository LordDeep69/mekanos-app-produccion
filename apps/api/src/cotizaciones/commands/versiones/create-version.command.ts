/**
 * CreateVersionCommand
 * FASE 4.8: Crear snapshot versión cotización
 */
export class CreateVersionCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly motivoCambio: string,
    public readonly creadaPor: number,
  ) {}
}
