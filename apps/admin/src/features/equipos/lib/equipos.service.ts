/**
 * SERVICIO DE EQUIPOS - MEKANOS S.A.S
 * 
 * Cliente HTTP para el módulo de gestión de equipos.
 * Conecta con el backend: /equipos/gestion-completa, /equipos/listado-completo
 */

import { apiClient } from '@/lib/api/client';
import type {
    CreateEquipoPayload,
    CreateEquipoResponse,
    EquipoDetalle,
    EquiposListadoResponse
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO EQUIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export const equiposService = {
  /**
   * Obtiene el listado paginado de equipos con datos polimórficos
   */
  async listarEquipos(params?: {
    page?: number;
    limit?: number;
    id_cliente?: number;
    id_sede?: number;
    estado_equipo?: string;
    tipo?: string;
  }): Promise<EquiposListadoResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.id_cliente) searchParams.append('id_cliente', params.id_cliente.toString());
    if (params?.id_sede) searchParams.append('id_sede', params.id_sede.toString());
    if (params?.estado_equipo) searchParams.append('estado_equipo', params.estado_equipo);
    if (params?.tipo) searchParams.append('tipo', params.tipo);
    
    const query = searchParams.toString();
    const url = `/equipos/listado-completo${query ? `?${query}` : ''}`;
    
    const response = await apiClient.get<EquiposListadoResponse>(url);
    return response.data;
  },

  /**
   * Obtiene un equipo completo por ID con datos polimórficos
   */
  async obtenerEquipo(id: number): Promise<{ success: boolean; data: EquipoDetalle }> {
    const response = await apiClient.get<{ success: boolean; data: EquipoDetalle }>(
      `/equipos/completo/${id}`
    );
    return response.data;
  },

  /**
   * Crea un equipo completo (padre + hijo según tipo)
   */
  async crearEquipo(payload: CreateEquipoPayload): Promise<CreateEquipoResponse> {
    const response = await apiClient.post<CreateEquipoResponse>(
      '/equipos/gestion-completa',
      payload
    );
    return response.data;
  },

  /**
   * Actualiza el estado de un equipo
   */
  async actualizarEstado(id: number, estado: string): Promise<{ success: boolean }> {
    const response = await apiClient.patch<{ success: boolean }>(
      `/equipos/${id}`,
      { estado_equipo: estado }
    );
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO CLIENTES (para select de cliente en formulario)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClienteOption {
  id_cliente: number;
  codigo_cliente: string;
  nombre: string;
  sedes: Array<{ id_sede: number; nombre_sede: string }>;
}

export const clientesService = {
  async listarClientesParaSelect(): Promise<ClienteOption[]> {
    // Asume que existe un endpoint para esto
    const response = await apiClient.get<{ data: ClienteOption[] }>('/clientes?limit=1000');
    return response.data?.data || [];
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS REACT QUERY
// ═══════════════════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Keys para React Query
export const equiposKeys = {
  all: ['equipos'] as const,
  lists: () => [...equiposKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...equiposKeys.lists(), params] as const,
  details: () => [...equiposKeys.all, 'detail'] as const,
  detail: (id: number) => [...equiposKeys.details(), id] as const,
};

export const clientesKeys = {
  forSelect: ['clientes', 'select'] as const,
};

/**
 * Hook para obtener listado de equipos
 */
export function useEquipos(params?: {
  page?: number;
  limit?: number;
  id_cliente?: number;
  id_sede?: number;
  estado_equipo?: string;
  tipo?: string;
}) {
  return useQuery({
    queryKey: equiposKeys.list(params || {}),
    queryFn: () => equiposService.listarEquipos(params),
  });
}

/**
 * Hook para obtener un equipo por ID
 */
export function useEquipo(id: number) {
  return useQuery({
    queryKey: equiposKeys.detail(id),
    queryFn: () => equiposService.obtenerEquipo(id),
    enabled: !!id,
  });
}

/**
 * Hook para crear equipo
 */
export function useCrearEquipo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateEquipoPayload) => equiposService.crearEquipo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
    },
  });
}

/**
 * Hook para obtener clientes para select
 */
export function useClientesParaSelect() {
  return useQuery({
    queryKey: clientesKeys.forSelect,
    queryFn: () => clientesService.listarClientesParaSelect(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para actualizar estado de equipo
 */
export function useActualizarEstadoEquipo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      equiposService.actualizarEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
    },
  });
}
