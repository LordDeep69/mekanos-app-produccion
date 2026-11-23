/**
 * COTIZACION ENTITY - Domain Layer
 * 
 * Representa una cotización comercial generada para un cliente.
 * Incluye servicios y componentes con cálculo automático de totales.
 * 
 * Estados: BORRADOR → ENVIADA → APROBADA/RECHAZADA/VENCIDA
 * 
 * @module Cotizaciones
 * @domain Domain
 */

export class Cotizacion {
  id_cotizacion!: number;
  numero_cotizacion!: string; // Formato: COT-2025-0001
  id_cliente!: number;
  id_sede?: number;
  id_equipo?: number;
  atencion_a_nombre?: string | null;
  atencion_a_cargo?: string | null;
  fecha_cotizacion!: Date; // ← CORREGIDO: era fecha_emision
  fecha_vencimiento!: Date;
  dias_validez?: number; // Calculado: vencimiento - cotizacion
  id_estado!: number; // ← CORREGIDO: era id_estado_cotizacion
  fecha_cambio_estado?: Date;
  id_motivo_rechazo?: number;
  observaciones_rechazo?: string;
  
  // Información comercial
  asunto!: string; // Título cotización
  tipo_cotizacion?: string;
  id_plantilla_origen?: number;
  id_propuesta_origen?: number;
  moneda?: string;
  descripcion_general?: string;
  alcance_trabajo?: string; // Scope detallado
  exclusiones?: string; // Qué NO incluye

  // Totales calculados
  subtotal_servicios!: number;
  subtotal_componentes!: number;
  subtotal_otros?: number;
  subtotal_general!: number;
  subtotal_opcionales?: number;
  descuento_porcentaje?: number;
  descuento_valor!: number;
  subtotal_con_descuento!: number;
  usa_aiu?: boolean;
  aiu_admin_porcentaje?: number;
  aiu_imprevistos_porcentaje?: number;
  aiu_utilidad_porcentaje?: number;
  aiu_admin_valor?: number;
  aiu_imprevistos_valor?: number;
  aiu_utilidad_valor?: number;
  aiu_valor_total?: number;
  iva_sobre_utilidad_aiu?: boolean;
  iva_porcentaje!: number;
  iva_valor!: number;
  total_cotizacion!: number;

  // Rentabilidad interna (privada)
  costo_total_estimado?: number;
  utilidad_bruta_estimada?: number;
  margen_bruto_porcentaje?: number;

  // Aprobación cliente y PDF
  observaciones_aprobacion_cliente?: string;
  orden_compra_cliente?: string;
  modo_agrupacion_pdf?: string;
  mostrar_desglose_precios?: boolean;
  
  // Condiciones comerciales
  forma_pago?: string; // ← NUEVO: CONTADO, CREDITO, ANTICIPADO
  terminos_condiciones?: string; // ← NUEVO: Texto legal
  meses_garantia?: number; // ← CORREGIDO: era garantia_meses
  observaciones_garantia?: string; // ← NUEVO
  tiempo_estimado_dias?: number; // ← NUEVO: Plazo ejecución
  
  // Versionado
  version?: number; // ← NUEVO: Control versionado
  id_cotizacion_padre?: number; // ← NUEVO: Relación versionado
  
  // Conversión a OS
  id_orden_servicio_generada?: number; // ← NUEVO: Si se aprobó y generó OS
  fecha_conversion_os?: Date; // ← NUEVO
  
  // Metadata
  metadata?: any; // ← NUEVO: JSON flexible
  
  // Auditoría
  elaborada_por!: number; // id_empleado (NO id_usuario)
  fecha_creacion!: Date; // ← CORREGIDO: era creado_en
  aprobada_internamente_por?: number; // ← NUEVO: id_usuario
  fecha_aprobacion_interna?: Date; // ← NUEVO
  modificado_por?: number; // id_usuario
  fecha_modificacion!: Date; // ← CORREGIDO: era actualizado_en

  // Relations (para queries)
  cliente?: any;
  sede?: any;
  equipo?: any;
  equipos_vinculados?: any[];
  estado?: any;
  items_servicios?: any[];
  items_componentes?: any[];
  items_otros?: any[];
  plantilla_origen?: any;
  aprobaciones?: any[];
  versiones?: any[];
  historial_envios?: any[];
  elaborador?: any;
  modificador?: any;

  constructor(partial: Partial<Cotizacion>) {
    Object.assign(this, partial);
  }

  /**
   * Validaciones de negocio
   */
  static validate(cotizacion: Partial<Cotizacion>): string[] {
    const errors: string[] = [];

    // Validar fecha vencimiento > fecha cotizacion
    if (cotizacion.fecha_vencimiento && cotizacion.fecha_cotizacion) {
      if (new Date(cotizacion.fecha_vencimiento) <= new Date(cotizacion.fecha_cotizacion)) {
        errors.push('fecha_vencimiento debe ser posterior a fecha_cotizacion');
      }
    }

    // Validar totales no negativos
    if (cotizacion.subtotal_servicios !== undefined && cotizacion.subtotal_servicios < 0) {
      errors.push('subtotal_servicios no puede ser negativo');
    }
    if (cotizacion.subtotal_componentes !== undefined && cotizacion.subtotal_componentes < 0) {
      errors.push('subtotal_componentes no puede ser negativo');
    }

    // Validar porcentaje descuento
    if (cotizacion.descuento_porcentaje !== undefined) {
      if (cotizacion.descuento_porcentaje < 0 || cotizacion.descuento_porcentaje > 100) {
        errors.push('descuento_porcentaje debe estar entre 0 y 100');
      }
    }

    // Validar porcentaje IVA
    if (cotizacion.iva_porcentaje !== undefined) {
      if (cotizacion.iva_porcentaje < 0 || cotizacion.iva_porcentaje > 100) {
        errors.push('iva_porcentaje debe estar entre 0 y 100');
      }
    }

    return errors;
  }

  /**
   * Calcula totales automáticamente
   */
  static calcularTotales(
    subtotalServicios: number,
    subtotalComponentes: number,
    descuentoPorcentaje: number = 0,
    ivaPorcentaje: number = 0, // ← CORREGIDO: default 0 en schema, no 19
  ): {
    subtotalGeneral: number;
    descuentoValor: number;
    subtotalConDescuento: number;
    ivaValor: number;
    totalCotizacion: number;
  } {
    const subtotalGeneral = subtotalServicios + subtotalComponentes;
    const descuentoValor = subtotalGeneral * (descuentoPorcentaje / 100);
    const subtotalConDescuento = subtotalGeneral - descuentoValor;
    const ivaValor = subtotalConDescuento * (ivaPorcentaje / 100);
    const totalCotizacion = subtotalConDescuento + ivaValor;

    return {
      subtotalGeneral: Number(subtotalGeneral.toFixed(2)),
      descuentoValor: Number(descuentoValor.toFixed(2)),
      subtotalConDescuento: Number(subtotalConDescuento.toFixed(2)),
      ivaValor: Number(ivaValor.toFixed(2)),
      totalCotizacion: Number(totalCotizacion.toFixed(2)),
    };
  }

  /**
   * Verifica si la cotización está vencida
   */
  isVencida(): boolean {
    if (!this.fecha_vencimiento) return false;
    return new Date() > new Date(this.fecha_vencimiento);
  }

  /**
   * Verifica si puede ser modificada
   */
  isModificable(): boolean {
    // Solo BORRADOR puede ser modificada (id_estado = 1)
    return this.id_estado === 1;
  }
}
