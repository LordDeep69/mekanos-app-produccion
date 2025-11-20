// Command - Eliminar Item Componente

export class DeleteItemComponenteCommand {
  constructor(
    public readonly idItemComponente: number,
    public readonly idCotizacion: number,
  ) {}
}
