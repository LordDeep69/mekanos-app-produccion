/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Sedes de Cliente
 */

import { apiClient } from '@/lib/api/client';

export interface SedeOption {
  id_sede: number;
  nombre_sede: string;
  direccion?: string;
  ciudad?: string;
}

export const sedesService = {
  /**
   * Obtener sedes filtradas por cliente
   */
  async listarSedesPorCliente(id_cliente: number): Promise<SedeOption[]> {
    if (!id_cliente) return [];
    
    const response = await apiClient.get<SedeOption[]>(`/sedes-cliente?id_cliente=${id_cliente}&activo=true`);
    return response.data || [];
  },
};
