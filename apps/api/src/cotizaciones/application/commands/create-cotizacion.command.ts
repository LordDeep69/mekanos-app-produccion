/**
 * CREATE COTIZACION COMMAND
 * 
 * Comando para crear una nueva cotización en estado BORRADOR.
 */
export class CreateCotizacionCommand {
  constructor(
    public readonly id_cliente: number,
    public readonly fecha_cotizacion: Date,
    public readonly fecha_vencimiento: Date,
    public readonly asunto: string,
    public readonly elaborada_por: number,
    public readonly id_sede?: number,
    public readonly id_equipo?: number,
    public readonly descripcion_general?: string,
    public readonly alcance_trabajo?: string,
    public readonly exclusiones?: string,
    public readonly descuento_porcentaje?: number,
    public readonly iva_porcentaje?: number,
    public readonly tiempo_estimado_dias?: number,
    public readonly forma_pago?: string,
    public readonly terminos_condiciones?: string,
    public readonly meses_garantia?: number,
    public readonly observaciones_garantia?: string,
  ) {}
}
