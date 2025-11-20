import { Cotizacion } from './cotizacion.entity';

/**
 * REPOSITORY INTERFACE - Domain Layer
 * 
 * Contrato para operaciones de persistencia de cotizaciones.
 * Implementación concreta en infrastructure/prisma-cotizaciones.repository.ts
 */
export interface CotizacionesRepository {
  /**
   * Crea una nueva cotización
   */
  save(cotizacion: Partial<Cotizacion>): Promise<Cotizacion>;

  /**
   * Encuentra cotización por ID con relaciones opcionales
   */
  findById(
    idCotizacion: number,
    includeRelations?: {
      cliente?: boolean;
      sede?: boolean;
      equipo?: boolean;
      estado?: boolean;
      items_servicios?: boolean;
      items_componentes?: boolean;
      aprobaciones?: boolean;
      historial_envios?: boolean;
    },
  ): Promise<Cotizacion | null>;

  /**
   * Encuentra todas las cotizaciones con filtros
   */
  findAll(filters: {
    clienteId?: number;
    sedeId?: number;
    estadoId?: number;
    fechaEmisionDesde?: Date;
    fechaEmisionHasta?: Date;
    elaboradaPor?: number;
    skip?: number;
    take?: number;
  }): Promise<{ cotizaciones: Cotizacion[]; total: number }>;

  /**
   * Encuentra por número de cotización (único)
   */
  findByNumero(numeroCotizacion: string): Promise<Cotizacion | null>;

  /**
   * Actualiza una cotización existente
   */
  update(idCotizacion: number, data: Partial<Cotizacion>): Promise<Cotizacion>;

  /**
   * Elimina (soft delete) una cotización
   */
  delete(idCotizacion: number): Promise<void>;

  /**
   * Actualiza estado de cotización
   */
  updateEstado(idCotizacion: number, idEstado: number, userId: number): Promise<Cotizacion>;

  /**
   * Actualizar totales de cotización (cuando cambian ítems)
   */
  updateTotales(
    idCotizacion: number,
    totales: {
      subtotal_servicios: number;
      subtotal_componentes: number;
      subtotal_general: number;
      descuento_valor: number;
      subtotal_con_descuento: number;
      iva_valor: number;
      total_cotizacion: number;
    },
  ): Promise<Cotizacion>;

  /**
   * Encuentra cotizaciones próximas a vencer (para alertas)
   */
  findProximasVencer(diasAnticipacion: number): Promise<Cotizacion[]>;

  /**
   * Genera próximo número de cotización (COT-YYYY-NNNN)
   */
  generateNumeroCotizacion(): Promise<string>;
}
