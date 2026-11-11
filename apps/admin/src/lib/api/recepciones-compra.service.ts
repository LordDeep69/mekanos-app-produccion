/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API de Recepciones Físicas en Almacén, Control de Calidad y Bodega (Ciclo 4.B)
 */

import { apiClient } from '@/lib/api/client';
import { RegistrarRecepcionLotePayload, UbicacionBodega } from '@/types/ordenes-compra.types';

export interface RecepcionLoteResponse {
  numero_recepcion?: string;
  nuevo_estado_orden?: string;
  id_recepcion?: number;
  [key: string]: unknown;
}

export const recepcionesCompraService = {
  /**
   * Registra la recepción física atómica por lote de una orden de compra
   */
  async registrarRecepcionLote(
    payload: RegistrarRecepcionLotePayload,
  ): Promise<RecepcionLoteResponse> {
    const response = await apiClient.post<RecepcionLoteResponse | { data?: RecepcionLoteResponse }>(
      '/recepciones-compra/lote',
      payload,
    );
    const body = response.data;
    if (
      body &&
      typeof body === 'object' &&
      'data' in body &&
      body.data &&
      typeof body.data === 'object'
    ) {
      return body.data as RecepcionLoteResponse;
    }
    return (body ?? {}) as RecepcionLoteResponse;
  },

  /**
   * Obtiene el listado de recepciones registradas para una orden de compra
   */
  async getRecepcionesPorOrden(idOrdenCompra: number): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data?: unknown[] }>('/recepciones-compra', {
      params: { id_orden_compra: idOrdenCompra, limit: 100 },
    });
    const body = response.data;
    if (Array.isArray(body)) return body;
    return body?.data || [];
  },

  /**
   * Obtiene el catálogo de ubicaciones de bodega activas para asignación de destino
   */
  async getUbicacionesBodega(): Promise<UbicacionBodega[]> {
    try {
      const response = await apiClient.get<UbicacionBodega[] | { data?: UbicacionBodega[] }>(
        '/ubicaciones-bodega',
        {
          params: { activo: true, limit: 100 },
        },
      );
      // El endpoint puede devolver { data: [...] } o array directo
      const body = response.data;
      const data = Array.isArray(body) ? body : body?.data || [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Error al obtener ubicaciones de bodega:', e);
      return [];
    }
  },
};
