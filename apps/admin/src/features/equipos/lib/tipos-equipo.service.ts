/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Tipos de Equipo
 */

import { apiClient } from '@/lib/api/client';

export interface TipoEquipoOption {
  id_tipo_equipo: number;
  nombre_tipo: string;
  descripcion?: string;
}

export const tiposEquipoService = {
  /**
   * Obtener todos los tipos de equipo activos
   */
  async listarTodos(): Promise<TipoEquipoOption[]> {
    const response = await apiClient.get<{ data: TipoEquipoOption[] }>('/tipos-equipo');
    return response.data.data || [];
  },
};
