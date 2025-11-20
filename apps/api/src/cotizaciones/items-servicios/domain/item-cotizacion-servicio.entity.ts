// Domain Entity - Items Cotización Servicios
// Representa un servicio incluido en una cotización

export class ItemCotizacionServicio {
  id_item_servicio!: number;
  id_cotizacion!: number;
  id_servicio!: number;
  cantidad!: number; // Decimal
  unidad?: string; // default 'servicio'
  precio_unitario!: number; // Decimal
  descuento_porcentaje?: number; // Decimal (0-100)
  subtotal?: number; // Decimal
  descripcion_personalizada?: string;
  observaciones?: string;
  justificacion_precio?: string;
  orden_item?: number;
  fecha_registro?: Date;
  registrado_por?: number;

  // Relaciones opcionales (si se incluyen en query)
  cotizacion?: any;
  servicio?: any;
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

    return Math.round(subtotalFinal * 100) / 100; // 2 decimales
  }

  /**
   * Valida que el item tenga datos consistentes
   */
  static validate(item: Partial<ItemCotizacionServicio>): string[] {
    const errors: string[] = [];

    if (!item.id_cotizacion) {
      errors.push('id_cotizacion es requerido');
    }

    if (!item.id_servicio) {
      errors.push('id_servicio es requerido');
    }

    if (!item.precio_unitario || item.precio_unitario < 0) {
      errors.push('precio_unitario debe ser mayor a 0');
    }

    if (item.cantidad && item.cantidad <= 0) {
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
