/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API de Órdenes de Compra y Abastecimiento Comercial (Ciclo 4.A)
 */

import { apiClient } from '@/lib/api/client';
import {
  ArticuloSourcing,
  CostoSourcingResponse,
  CrearOrdenCompraPayload,
  OrdenCompra,
  OrdenesCompraKpis,
  OrdenesCompraPaginatedResponse,
} from '@/types/ordenes-compra.types';

export interface FiltrosOrdenesCompra {
  id_proveedor?: number;
  estado?: string;
  numero_orden?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}

interface ApiDataResponse<T> {
  data?: T;
  meta?: OrdenesCompraPaginatedResponse['meta'];
}

export const ordenesCompraService = {
  /**
   * Listar órdenes de compra con filtros y paginación
   */
  async getOrdenes(filtros: FiltrosOrdenesCompra = {}): Promise<OrdenesCompraPaginatedResponse> {
    const params = new URLSearchParams();
    if (filtros.id_proveedor) params.append('id_proveedor', String(filtros.id_proveedor));
    if (filtros.estado && filtros.estado !== 'TODOS') params.append('estado', filtros.estado);
    if (filtros.numero_orden) params.append('numero_orden', filtros.numero_orden);
    if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
    if (filtros.page) params.append('page', String(filtros.page));
    if (filtros.limit) params.append('limit', String(filtros.limit));

    const response = await apiClient.get<ApiDataResponse<OrdenCompra[]>>(
      `/ordenes-compra?${params.toString()}`,
    );
    // Desempaquetar ApiResponse estándar { success, message, data, meta }
    if (response.data && response.data.data) {
      return {
        data: response.data.data,
        meta: response.data.meta || {
          total: response.data.data.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };
    }
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
  },

  /**
   * Obtener KPIs ejecutivos de órdenes de compra
   */
  async getResumenKpis(): Promise<OrdenesCompraKpis> {
    try {
      const response = await apiClient.get<ApiDataResponse<OrdenesCompraKpis> | OrdenesCompraKpis>(
        '/ordenes-compra/resumen',
      );
      if (response.data && 'data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as OrdenesCompraKpis;
    } catch (e) {
      console.error('Error al obtener KPIs de órdenes de compra:', e);
      return {
        total_ordenes: 0,
        borradores: 0,
        enviadas: 0,
        parciales: 0,
        completadas: 0,
        canceladas: 0,
        monto_total_comprometido: 0,
      };
    }
  },

  /**
   * Obtener detalle completo de una orden de compra
   */
  async getOrdenById(id: number): Promise<OrdenCompra> {
    const response = await apiClient.get<ApiDataResponse<OrdenCompra> | OrdenCompra>(
      `/ordenes-compra/${id}`,
    );
    return (response.data as ApiDataResponse<OrdenCompra>)?.data || (response.data as OrdenCompra);
  },

  /**
   * Crear nueva orden de compra (Borrador con cálculo automático)
   */
  async createOrden(payload: CrearOrdenCompraPayload): Promise<OrdenCompra> {
    const response = await apiClient.post<ApiDataResponse<OrdenCompra> | OrdenCompra>(
      '/ordenes-compra',
      payload,
    );
    return (response.data as ApiDataResponse<OrdenCompra>)?.data || (response.data as OrdenCompra);
  },

  /**
   * Enviar/Emitir orden de compra al proveedor (BORRADOR -> ENVIADA)
   */
  async enviarOrden(id: number): Promise<OrdenCompra> {
    const response = await apiClient.put<ApiDataResponse<OrdenCompra> | OrdenCompra>(
      `/ordenes-compra/${id}/enviar`,
    );
    return (response.data as ApiDataResponse<OrdenCompra>)?.data || (response.data as OrdenCompra);
  },

  /**
   * Cancelar orden de compra con motivo
   */
  async cancelarOrden(id: number, motivo: string): Promise<OrdenCompra> {
    const response = await apiClient.put<ApiDataResponse<OrdenCompra> | OrdenCompra>(
      `/ordenes-compra/${id}/cancelar`,
      {
        motivo_cancelacion: motivo,
      },
    );
    return (response.data as ApiDataResponse<OrdenCompra>)?.data || (response.data as OrdenCompra);
  },

  /**
   * Obtener catálogo de abastecimiento con precios pactados para un proveedor
   */
  async getSourcingProveedor(idProveedor: number): Promise<ArticuloSourcing[]> {
    try {
      const response = await apiClient.get<
        ApiDataResponse<ArticuloSourcing[]> | ArticuloSourcing[]
      >(`/ordenes-compra/proveedor/${idProveedor}/sourcing`);
      const body = response.data;
      if (Array.isArray(body)) return body;
      return body?.data || [];
    } catch (e) {
      console.error('Error al obtener sourcing del proveedor:', e);
      return [];
    }
  },

  /**
   * Consultar costo pactado o base para un componente específico de un proveedor
   */
  async getCostoSourcing(
    idProveedor: number,
    idComponente: number,
  ): Promise<CostoSourcingResponse> {
    const response = await apiClient.get<
      ApiDataResponse<CostoSourcingResponse> | CostoSourcingResponse
    >('/ordenes-compra/sourcing/costo', {
      params: { id_proveedor: idProveedor, id_componente: idComponente },
    });
    return (
      (response.data as ApiDataResponse<CostoSourcingResponse>)?.data ||
      (response.data as CostoSourcingResponse)
    );
  },
};
