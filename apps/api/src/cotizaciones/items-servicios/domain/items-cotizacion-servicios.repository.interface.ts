// Repository Interface - Items Cotización Servicios

import { ItemCotizacionServicio } from './item-cotizacion-servicio.entity';

export interface ItemsCotizacionServiciosRepository {
  /**
   * Guarda un nuevo item servicio en una cotización
   */
  save(data: Partial<ItemCotizacionServicio>): Promise<ItemCotizacionServicio>;

  /**
   * Busca un item servicio por ID
   */
  findById(
    id: number,
    includeRelations?: {
      includeCotizacion?: boolean;
      includeServicio?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionServicio | null>;

  /**
   * Lista todos los items servicios de una cotización
   */
  findByCotizacionId(
    idCotizacion: number,
    includeRelations?: {
      includeServicio?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionServicio[]>;

  /**
   * Actualiza un item servicio existente
   */
  update(
    id: number,
    data: Partial<ItemCotizacionServicio>,
  ): Promise<ItemCotizacionServicio>;

  /**
   * Elimina un item servicio (soft delete o hard delete según cascade)
   */
  delete(id: number): Promise<void>;

  /**
   * Calcula el subtotal de todos los servicios de una cotización
   */
  calcularSubtotalServicios(idCotizacion: number): Promise<number>;
}
