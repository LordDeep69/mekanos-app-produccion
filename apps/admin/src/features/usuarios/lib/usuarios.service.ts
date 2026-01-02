/**
 * SERVICIO DE USUARIOS - MEKANOS S.A.S
 * 
 * Cliente HTTP para el módulo de gestión de usuarios.
 * Conecta con el backend: /usuarios/gestion-completa, /roles
 */

import { apiClient } from '@/lib/api/client';
import type {
    BuscarPersonaResponse,
    CreateUsuarioPayload,
    CreateUsuarioResponse,
    Rol,
    UsuarioListItem,
    UsuariosListadoResponse,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

export const usuariosService = {
  /**
   * Obtiene el listado paginado de usuarios con sus roles y persona
   */
  async listarUsuarios(params?: {
    page?: number;
    limit?: number;
    busqueda?: string;
    estado?: string;
    rolId?: number;
  }): Promise<UsuariosListadoResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.busqueda) searchParams.append('busqueda', params.busqueda);
    if (params?.estado) searchParams.append('estado', params.estado);
    if (params?.rolId) searchParams.append('rolId', params.rolId.toString());
    
    const query = searchParams.toString();
    const url = `/usuarios/listado-completo${query ? `?${query}` : ''}`;
    
    const response = await apiClient.get<UsuariosListadoResponse>(url);
    return response.data;
  },

  /**
   * Obtiene un usuario completo por ID
   */
  async obtenerUsuario(id: number): Promise<UsuarioListItem> {
    const response = await apiClient.get<UsuarioListItem>(`/usuarios/${id}`);
    return response.data;
  },

  /**
   * Crea un usuario completo (persona + usuario + empleado + roles)
   */
  async crearUsuarioCompleto(payload: CreateUsuarioPayload): Promise<CreateUsuarioResponse> {
    const response = await apiClient.post<CreateUsuarioResponse>(
      '/usuarios/gestion-completa',
      payload
    );
    return response.data;
  },

  /**
   * Busca si una persona ya existe por su identificación
   */
  async buscarPersona(
    tipo_identificacion: string,
    numero_identificacion: string
  ): Promise<BuscarPersonaResponse> {
    const response = await apiClient.get<BuscarPersonaResponse>(
      `/usuarios/buscar-persona?tipo_identificacion=${tipo_identificacion}&numero_identificacion=${numero_identificacion}`
    );
    return response.data;
  },

  /**
   * Valida si un username está disponible
   */
  async validarUsername(username: string): Promise<{ disponible: boolean; sugerencias?: string[] }> {
    const response = await apiClient.get<{ disponible: boolean; sugerencias?: string[] }>(
      `/usuarios/validar-username/${username}`
    );
    return response.data;
  },

  /**
   * Actualiza el estado de un usuario
   */
  async actualizarEstado(id: number, estado: string): Promise<{ success: boolean }> {
    const response = await apiClient.patch<{ success: boolean }>(
      `/usuarios/${id}/estado`,
      { estado }
    );
    return response.data;
  },

  /**
   * Resetea la contraseña de un usuario
   */
  async resetearPassword(id: number): Promise<{ success: boolean; password_temporal: string }> {
    const response = await apiClient.post<{ success: boolean; password_temporal: string }>(
      `/usuarios/${id}/resetear-password`,
      {}
    );
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export const rolesService = {
  /**
   * Obtiene todos los roles activos
   */
  async listarRoles(): Promise<Rol[]> {
    const response = await apiClient.get<Rol[]>('/roles');
    return response.data;
  },

  /**
   * Obtiene un rol por ID
   */
  async obtenerRol(id: number): Promise<Rol> {
    const response = await apiClient.get<Rol>(`/roles/${id}`);
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS REACT QUERY
// ═══════════════════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Keys para React Query
export const usuariosKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usuariosKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...usuariosKeys.lists(), params] as const,
  details: () => [...usuariosKeys.all, 'detail'] as const,
  detail: (id: number) => [...usuariosKeys.details(), id] as const,
};

export const rolesKeys = {
  all: ['roles'] as const,
  list: () => [...rolesKeys.all, 'list'] as const,
};

/**
 * Hook para obtener listado de usuarios
 */
export function useUsuarios(params?: {
  page?: number;
  limit?: number;
  busqueda?: string;
  estado?: string;
  rolId?: number;
}) {
  return useQuery({
    queryKey: usuariosKeys.list(params || {}),
    queryFn: () => usuariosService.listarUsuarios(params),
  });
}

/**
 * Hook para obtener todos los roles
 */
export function useRoles() {
  return useQuery({
    queryKey: rolesKeys.list(),
    queryFn: () => rolesService.listarRoles(),
    staleTime: 5 * 60 * 1000, // 5 minutos - los roles no cambian frecuentemente
  });
}

/**
 * Hook para crear usuario
 */
export function useCrearUsuario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateUsuarioPayload) => usuariosService.crearUsuarioCompleto(payload),
    onSuccess: () => {
      // Invalidar listado de usuarios
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

/**
 * Hook para buscar persona por identificación
 */
export function useBuscarPersona(
  tipo_identificacion: string,
  numero_identificacion: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['buscar-persona', tipo_identificacion, numero_identificacion],
    queryFn: () => usuariosService.buscarPersona(tipo_identificacion, numero_identificacion),
    enabled: enabled && !!tipo_identificacion && !!numero_identificacion && numero_identificacion.length >= 6,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para validar username
 */
export function useValidarUsername(username: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['validar-username', username],
    queryFn: () => usuariosService.validarUsername(username),
    enabled: enabled && !!username && username.length >= 3,
    staleTime: 10 * 1000, // 10 segundos
  });
}

/**
 * Hook para actualizar estado de usuario
 */
export function useActualizarEstadoUsuario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => 
      usuariosService.actualizarEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}
