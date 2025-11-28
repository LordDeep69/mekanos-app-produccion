/**
 * IMedicionesRepository - Interface para repository de mediciones
 * FASE 3 - Refactorizado camelCase
 */

export interface IMedicionesRepository {
  /**
   * CREATE medición
   */
  create(data: {
    idOrdenServicio: number;
    idParametroMedicion: number;
    valorNumerico?: number;
    valorTexto?: string;
    nivelAlerta?: string;
    mensajeAlerta?: string;
    observaciones?: string;
    temperaturaAmbiente?: number;
    humedadRelativa?: number;
    fechaMedicion?: Date;
    medidoPor?: number;
    instrumentoMedicion?: string;
  }): Promise<any>;

  /**
   * UPDATE medición
   */
  update(
    id: number,
    data: {
      valorNumerico?: number;
      valorTexto?: string;
      nivelAlerta?: string;
      mensajeAlerta?: string;
      observaciones?: string;
      temperaturaAmbiente?: number;
      humedadRelativa?: number;
      fechaMedicion?: Date;
      instrumentoMedicion?: string;
    },
  ): Promise<any>;

  /**
   * READ ONE - obtener medición por ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * READ ALL por orden - filtrar mediciones de orden específica
   */
  findByOrden(ordenId: number): Promise<any[]>;

  /**
   * READ ALL (simplificado sin paginación por ahora)
   */
  findAll(): Promise<any[]>;

  /**
   * DELETE - eliminar medición
   */
  delete(id: number): Promise<void>;

  /**
   * Legacy save() para compatibilidad (usa create/update internamente)
   */
  save(data: any): Promise<any>;
}
