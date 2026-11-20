// Domain Entity - Items Cotización Servicios (EAM-CPQ Universal)

export class ItemCotizacionServicio {
  id_item_servicio!: number;
  id_cotizacion!: number;
  id_servicio?: number; // opcional (permite servicios a medida con descripcion_personalizada)
  id_equipo?: number; // opcional (asignación puntual a un activo)
  cantidad!: number; // Decimal
  unidad?: string; // default 'servicio'
  costo_unitario?: number; // Decimal (costo interno mano de obra/cuadrilla)
  precio_unitario!: number; // Decimal
  descuento_porcentaje?: number; // Decimal (0-100)
  subtotal?: number; // Decimal
  es_opcional?: boolean; // Si true, suma en subtotal_opcionales
  iva_aplicable?: boolean; // default true
  seccion_titulo?: string; // Agrupación editorial opcional en PDF
  descripcion_personalizada?: string;
  observaciones?: string;
  justificacion_precio?: string;
  orden_item?: number;
  fecha_registro?: Date;
  registrado_por?: number;

  // Relaciones opcionales
  cotizacion?: any;
  servicio?: any;
  equipo?: any;
  usuario?: any;

  constructor(partial?: Partial<ItemCotizacionServicio>) {
    Object.assign(this, partial);
  }

  /**
   * Calcula el subtotal del item servicio
   * Formula: cantidad * precio_unitario * (1 - descuento_porcentaje/100)
   */
  calcularSubtotal(): number {
    const cantidad = this.cantidad || 0;
    const precioUnitario = this.precio_unitario || 0;
    const descuentoPorcentaje = this.descuento_porcentaje || 0;

    const subtotalSinDescuento = cantidad * precioUnitario;
    const descuentoValor = (subtotalSinDescuento * descuentoPorcentaje) / 100;
    const subtotalFinal = subtotalSinDescuento - descuentoValor;

    return Math.round(subtotalFinal * 100) / 100;
  }

  /**
   * Valida que el item tenga datos consistentes.
   * Permite servicio libre sin id_servicio si provee descripcion_personalizada, y precio >= 0.
   */
  static validate(item: Partial<ItemCotizacionServicio>): string[] {
    const errors: string[] = [];

    if (!item.id_cotizacion) {
      errors.push('id_cotizacion es requerido');
    }

    if (
      !item.id_servicio &&
      (!item.descripcion_personalizada || item.descripcion_personalizada.trim() === '')
    ) {
      errors.push('Debe indicar id_servicio o descripcion_personalizada');
    }

    if (
      item.precio_unitario === undefined ||
      item.precio_unitario === null ||
      Number.isNaN(Number(item.precio_unitario)) ||
      Number(item.precio_unitario) < 0
    ) {
      errors.push('precio_unitario debe ser mayor o igual a 0');
    }

    if (item.costo_unitario !== undefined && Number(item.costo_unitario) < 0) {
      errors.push('costo_unitario no puede ser negativo');
    }

    if (item.cantidad !== undefined && Number(item.cantidad) <= 0) {
      errors.push('cantidad debe ser mayor a 0');
    }

    if (
      item.descuento_porcentaje !== undefined &&
      (item.descuento_porcentaje < 0 || item.descuento_porcentaje > 100)
    ) {
      errors.push('descuento_porcentaje debe estar entre 0 y 100');
    }

    return errors;
  }
}
