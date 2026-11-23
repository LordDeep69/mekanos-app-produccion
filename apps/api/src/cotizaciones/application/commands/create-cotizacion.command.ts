/**
 * CREATE COTIZACION COMMAND (EAM-CPQ Universal)
 */
export class CreateCotizacionCommand {
  constructor(
    public readonly id_cliente: number,
    public readonly fecha_cotizacion: Date,
    public readonly fecha_vencimiento: Date,
    public readonly asunto: string,
    public readonly elaborada_por?: number,
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
    public readonly extras?: {
      atencion_a_nombre?: string | null;
      atencion_a_cargo?: string | null;
      equipos_ids?: number[];
      tipo_cotizacion?: string;
      id_plantilla_origen?: number;
      id_propuesta_origen?: number;
      moneda?: string;
      usa_aiu?: boolean;
      aiu_admin_porcentaje?: number;
      aiu_imprevistos_porcentaje?: number;
      aiu_utilidad_porcentaje?: number;
      iva_sobre_utilidad_aiu?: boolean;
      modo_agrupacion_pdf?: string;
      mostrar_desglose_precios?: boolean;
      user_id?: number;
      user_empleado_id?: number | null;
    },
  ) {}
}
