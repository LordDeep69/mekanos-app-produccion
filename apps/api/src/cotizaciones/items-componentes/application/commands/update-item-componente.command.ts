// Command - Actualizar Item Componente (EAM-CPQ Universal)

export class UpdateItemComponenteCommand {
  constructor(
    public readonly idItemComponente: number,
    public readonly idCotizacion: number,
    public readonly descripcion?: string,
    public readonly referenciaManual?: string,
    public readonly marcaManual?: string,
    public readonly cantidad?: number,
    public readonly unidad?: string,
    public readonly precioUnitario?: number,
    public readonly descuentoPorcentaje?: number,
    public readonly garantiaMeses?: number,
    public readonly observacionesGarantia?: string,
    public readonly observaciones?: string,
    public readonly ordenItem?: number,
    public readonly idEquipo?: number | null,
    public readonly idTipoComponente?: number | null,
    public readonly costoUnitario?: number,
    public readonly esOpcional?: boolean,
    public readonly ivaAplicable?: boolean,
    public readonly seccionTitulo?: string,
  ) {}
}
