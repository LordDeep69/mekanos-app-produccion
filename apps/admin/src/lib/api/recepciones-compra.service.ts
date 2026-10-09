/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API de Recepciones Físicas en Almacén, Control de Calidad y Bodega (Ciclo 4.B)
 */

import { apiClient } from '@/lib/api/client';
import {
  RegistrarRecepcionLotePayload,
  UbicacionBodega,
} from '@/types/ordenes-compra.types';

export const recepcionesCompraService = {
  /**
   * Registra la recepción física atómica por lote de una orden de compra
   */
  async registrarRecepcionLote(payload: RegistrarRecepcionLotePayload) {
    const response = await apiClient.post<any>('/recepciones-compra/lote', payload);
    return response.data?.data || response.data;
  },

  /**
   * Obtiene el listado de recepciones registradas para una orden de compra
   */
  async getRecepcionesPorOrden(idOrdenCompra: number) {
    const response = await apiClient.get<any>('/recepciones-compra', {
      params: { id_orden_compra: idOrdenCompra, limit: 100 },
    });
    return response.data?.data || response.data || [];
  },

  /**
   * Obtiene el catálogo de ubicaciones de bodega activas para asignación de destino
   */
  async getUbicacionesBodega(): Promise<UbicacionBodega[]> {
    try {
      const response = await apiClient.get<any>('/ubicaciones-bodega', {
        params: { activo: true, limit: 100 },
      });
      // El endpoint puede devolver { data: [...] } o array directo
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Error al obtener ubicaciones de bodega:', e);
      return [];
    }
  },
};
