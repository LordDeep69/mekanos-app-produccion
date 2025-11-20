// Command - Crear Item Componente

export class CreateItemComponenteCommand {
  constructor(
    public readonly idCotizacion: number,
    public readonly idComponente: number | undefined,
    public readonly idTipoComponente: number,
    public readonly descripcion: string,
    public readonly referenciaManual: string | undefined,
    public readonly marcaManual: string | undefined,
    public readonly cantidad: number,
    public readonly unidad: string | undefined,
    public readonly precioUnitario: number,
    public readonly descuentoPorcentaje: number | undefined,
    public readonly garantiaMeses: number | undefined,
    public readonly observacionesGarantia: string | undefined,
    public readonly observaciones: string | undefined,
    public readonly ordenItem: number | undefined,
    public readonly registradoPor: number | undefined,
  ) {}
}
