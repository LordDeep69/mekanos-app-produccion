/**
 * Command: Crear gasto de orden
 * Tabla 13/14 - FASE 3
 */
export class CreateGastoOrdenCommand {
  constructor(
    public readonly idOrdenServicio: number,
    public readonly tipoGasto: string,
    public readonly descripcion: string,
    public readonly justificacion: string,
    public readonly valor: number,
    public readonly tieneComprobante?: boolean,
    public readonly numeroComprobante?: string,
    public readonly proveedor?: string,
    public readonly rutaComprobante?: string,
    public readonly estadoAprobacion?: string,
    public readonly observacionesAprobacion?: string,
    public readonly fechaGasto?: string,
    public readonly generadoPor?: number,
    public readonly observaciones?: string,
    public readonly registradoPor?: number,
  ) {}
}
