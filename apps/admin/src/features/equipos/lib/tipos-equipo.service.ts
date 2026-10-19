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
    // limit alto: el endpoint pagina por defecto (10) y el formulario necesita
    // el catálogo completo (incluido COMPRESOR DE AIRE / id 20).
    const response = await apiClient.get<{ data: TipoEquipoOption[] }>(
      '/tipos-equipo?limit=100&activo=true',
    );
    return response.data.data || [];
  },
};
