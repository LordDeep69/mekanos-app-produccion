/**
 * UPDATE COTIZACION COMMAND (EAM-CPQ Universal)
 */
export class UpdateCotizacionCommand {
  constructor(
    public readonly id_cotizacion: number,
    public readonly modificado_por: number,
    public readonly id_sede?: number | null,
    public readonly id_equipo?: number | null,
    public readonly fecha_vencimiento?: Date,
    public readonly asunto?: string,
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
    public readonly extras?: {
      equipos_ids?: number[];
      tipo_cotizacion?: string;
      moneda?: string;
      fecha_cotizacion?: Date;
      usa_aiu?: boolean;
      aiu_admin_porcentaje?: number;
      aiu_imprevistos_porcentaje?: number;
      aiu_utilidad_porcentaje?: number;
      iva_sobre_utilidad_aiu?: boolean;
      modo_agrupacion_pdf?: string;
    },
  ) {}
}
