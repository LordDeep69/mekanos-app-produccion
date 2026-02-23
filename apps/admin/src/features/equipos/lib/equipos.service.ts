/**
 * SERVICIO DE EQUIPOS - MEKANOS S.A.S
 * 
 * Cliente HTTP para el modulo de gestion de equipos.
 * Conecta con el backend: /equipos/gestion-completa, /equipos/listado-completo
 */

import { apiClient } from '@/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CambiarEstadoResponse,
  CreateEquipoPayload,
  CreateEquipoResponse,
  EquipoDetalle,
  EquiposListadoResponse,
  RegistrarLecturaResponse,
  UpdateDatosEspecificosPayload,
  UpdateEquipoPayload
} from '../types';

type ClienteOption = {
  id_cliente: number;
  nombre?: string;
};

// ==============================================================================
// SERVICIO EQUIPOS
// ==============================================================================

export const equiposService = {
  async listarEquipos(params?: {
    page?: number;
    limit?: number;
    id_cliente?: number;
    id_sede?: number;
    estado_equipo?: string;
    tipo?: string;
    search?: string;
    sortBy?: 'codigo' | 'nombre' | 'fecha' | 'cliente';
    sortOrder?: 'asc' | 'desc';
  }): Promise<EquiposListadoResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.id_cliente) searchParams.append('id_cliente', params.id_cliente.toString());
    if (params?.id_sede) searchParams.append('id_sede', params.id_sede.toString());
    if (params?.estado_equipo) searchParams.append('estado_equipo', params.estado_equipo);
    if (params?.tipo) searchParams.append('tipo', params.tipo);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    const query = searchParams.toString();
    const url = `/equipos/listado-completo${query ? `?${query}` : ''}`;
    const response = await apiClient.get<EquiposListadoResponse>(url);
    return response.data;
  },

  async obtenerEquipo(id: number): Promise<{ success: boolean; data: EquipoDetalle }> {
    const response = await apiClient.get<{ success: boolean; data: EquipoDetalle }>(
      `/equipos/completo/${id}`
    );
    return response.data;
  },

  async crearEquipo(payload: CreateEquipoPayload): Promise<CreateEquipoResponse> {
    const response = await apiClient.post<CreateEquipoResponse>(
      '/equipos/gestion-completa',
      payload
    );
    return response.data;
  },

  async actualizarEquipo(id: number, payload: UpdateEquipoPayload): Promise<{ success: boolean; data: EquipoDetalle }> {
    const response = await apiClient.put<{ success: boolean; data: EquipoDetalle }>(
      `/equipos/${id}`,
      payload
    );
    return response.data;
  },

  async cambiarEstado(
    id: number,
    payload: { nuevo_estado: string; motivo_cambio?: string }
  ): Promise<CambiarEstadoResponse> {
    const response = await apiClient.patch<CambiarEstadoResponse>(
      `/equipos/${id}/cambiar-estado`,
      payload
    );
    return response.data;
  },

  async eliminarEquipoCompletamente(
    id: number,
    confirmacion: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/equipos/${id}/hard-delete`,
      { data: { confirmacion } }
    );
    return response.data;
  },

  async registrarLecturaHorometro(
    id: number,
    payload: { horas_lectura: number; observaciones?: string }
  ): Promise<RegistrarLecturaResponse> {
    const response = await apiClient.post<RegistrarLecturaResponse>(
      `/equipos/${id}/lectura-horometro`,
      payload
    );
    return response.data;
  },

  async actualizarDatosEspecificos(
    id: number,
    payload: UpdateDatosEspecificosPayload
  ): Promise<{ success: boolean; data: unknown }> {
    const response = await apiClient.patch<{ success: boolean; data: unknown }>(
      `/equipos/${id}/datos-especificos`,
      payload
    );
    return response.data;
  },
};

export const clientesService = {
  async listarClientesParaSelect(): Promise<ClienteOption[]> {
    const response = await apiClient.get<{ data: ClienteOption[] }>('/clientes?limit=1000');
    return response.data?.data || [];
  },
};

// ==============================================================================
// QUERY KEYS
// ==============================================================================

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

// ==============================================================================
// HOOKS REACT QUERY
// ==============================================================================

export function useEquipos(params?: {
  page?: number;
  limit?: number;
  id_cliente?: number;
  id_sede?: number;
  estado_equipo?: string;
  tipo?: string;
  search?: string;
  sortBy?: 'codigo' | 'nombre' | 'fecha' | 'cliente';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: equiposKeys.list(params || {}),
    queryFn: () => equiposService.listarEquipos(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useEquipo(id: number) {
  return useQuery({
    queryKey: equiposKeys.detail(id),
    queryFn: () => equiposService.obtenerEquipo(id),
    enabled: !!id,
  });
}

export function useCrearEquipo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEquipoPayload) => equiposService.crearEquipo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
    },
  });
}

export function useClientesParaSelect() {
  return useQuery({
    queryKey: clientesKeys.forSelect,
    queryFn: () => clientesService.listarClientesParaSelect(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCambiarEstadoEquipo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nuevo_estado, motivo_cambio }: {
      id: number;
      nuevo_estado: string;
      motivo_cambio?: string;
    }) => equiposService.cambiarEstado(id, { nuevo_estado, motivo_cambio }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equiposKeys.detail(variables.id) });
    },
  });
}

export function useRegistrarLecturaHorometro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, horas_lectura, observaciones }: {
      id: number;
      horas_lectura: number;
      observaciones?: string;
    }) => equiposService.registrarLecturaHorometro(id, { horas_lectura, observaciones }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equiposKeys.detail(variables.id) });
    },
  });
}

export function useActualizarEquipo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEquipoPayload }) =>
      equiposService.actualizarEquipo(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equiposKeys.detail(variables.id) });
    },
  });
}

export function useEliminarEquipoCompletamente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmacion }: { id: number; confirmacion: string }) =>
      equiposService.eliminarEquipoCompletamente(id, confirmacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
    },
  });
}

export function useActualizarDatosEspecificos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDatosEspecificosPayload }) =>
      equiposService.actualizarDatosEspecificos(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equiposKeys.detail(variables.id) });
    },
  });
}
