/**
 * IMedicionesRepository - Interface para repository de mediciones
 * FASE 4.2 - Mediciones con validación de rangos
 */

export interface IMedicionesRepository {
  /**
   * CREATE/UPDATE medición (con detección automática rangos)
   */
  save(data: {
    id_medicion?: number;
    id_orden_servicio: number;
    id_parametro_medicion: number;
    valor_numerico?: number;
    valor_texto?: string;
    unidad_medida?: string;
    fuera_de_rango?: boolean;
    nivel_alerta?: string;
    mensaje_alerta?: string | null; // ✅ FIX: Acepta null explícito
    observaciones?: string;
    temperatura_ambiente?: number;
    humedad_relativa?: number;
    fecha_medicion?: Date;
    medido_por?: number;
    instrumento_medicion?: string;
  }): Promise<any>;

  /**
   * READ ONE - obtener medición por ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * READ ALL por orden - filtrar mediciones de orden específica
   */
  findByOrden(id_orden_servicio: number): Promise<any[]>;

  /**
   * READ ALL con paginación y filtros
   */
  findAll(filters?: {
    page?: number;
    limit?: number;
    id_orden_servicio?: number;
    id_parametro_medicion?: number;
    nivel_alerta?: string;
  }): Promise<{ items: any[]; total: number }>;

  /**
   * DELETE - eliminar medición
   */
  delete(id: number): Promise<void>;
}
