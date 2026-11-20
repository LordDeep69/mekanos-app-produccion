// Domain Entity - Items Cotización Componentes (EAM-CPQ Universal)

export class ItemCotizacionComponente {
  id_item_componente!: number;
  id_cotizacion!: number;
  id_componente?: number; // opcional (catálogo WMS)
  id_tipo_componente?: number; // opcional (desacoplado de tipos_componente legacy)
  id_equipo?: number; // opcional: asignación puntual a un activo de la cotización
  descripcion!: string;
  referencia_manual?: string;
  marca_manual?: string;
  cantidad!: number; // Decimal
  unidad?: string; // default 'unidad'
  costo_unitario?: number; // Decimal (costo interno para cálculo de margen)
  precio_unitario!: number; // Decimal
  descuento_porcentaje?: number; // Decimal (0-100)
  subtotal?: number; // Decimal
  es_opcional?: boolean; // Si true, suma en subtotal_opcionales y no al total base
  iva_aplicable?: boolean; // default true
  seccion_titulo?: string; // Agrupación editorial opcional en PDF
  garantia_meses?: number;
  observaciones_garantia?: string;
  observaciones?: string;
  orden_item?: number;
  fecha_registro?: Date;
  registrado_por?: number;

  // Relaciones opcionales
  cotizacion?: any;
  componente?: any;
  tipo_componente?: any;
  equipo?: any;
  usuario?: any;

  constructor(partial?: Partial<ItemCotizacionComponente>) {
    Object.assign(this, partial);
  }

  /**
   * Calcula el subtotal del item componente
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
   * Permite precio_unitario === 0 (cortesías/incluidos) e id_tipo_componente opcional.
   */
  static validate(item: Partial<ItemCotizacionComponente>): string[] {
    const errors: string[] = [];

    if (!item.id_cotizacion) {
      errors.push('id_cotizacion es requerido');
    }

    if (!item.descripcion || item.descripcion.trim() === '') {
      errors.push('descripcion es requerida');
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
