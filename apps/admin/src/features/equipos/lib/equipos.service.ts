/**
 * SERVICIO DE EQUIPOS - MEKANOS S.A.S
 * 
 * Cliente HTTP para el módulo de gestión de equipos.
 * Conecta con el backend: /equipos/gestion-completa, /equipos/listado-completo
 */

import { apiClient } from '@/lib/api/client';
import type {
  CambiarEstadoResponse,
  CreateEquipoPayload,
  CreateEquipoResponse,
  EquipoDetalle,
  EquiposListadoResponse,
  UpdateEquipoPayload
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO EQUIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export const equiposService = {
  /**
   * Obtiene el listado paginado de equipos con datos polimórficos
   * ✅ 08-ENE-2026: Agregado búsqueda, filtro por tipo y ordenación
   */
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
   * Actualiza un equipo completo (datos base + config_parametros)
   */
  async actualizarEquipo(id: number, payload: UpdateEquipoPayload): Promise<{ success: boolean; data: EquipoDetalle }> {
    const response = await apiClient.put<{ success: boolean; data: EquipoDetalle }>(
      `/equipos/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * ✅ 08-ENE-2026: Cambiar estado del equipo con historial
   */
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

  /**
   * ⚠️ ELIMINACIÓN COMPLETA - Elimina permanentemente el equipo y TODOS sus datos relacionados
   * Solo funciona con equipos marcados como inactivos (soft delete)
   */
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

  /**
   * ✅ TRAZABILIDAD 360° / HOJA DE VIDA: Obtener historial de intervenciones y servicios del equipo
   */
  async obtenerTrazabilidadEquipo(id: number): Promise<TrazabilidadEquipoResponse> {
    const response = await apiClient.get<{ success: boolean; data: TrazabilidadEquipoResponse }>(
      `/equipos/${id}/trazabilidad-servicios`
    );
    return response.data.data;
  },

  /**
   * ✅ 23-FEB-2026: Actualiza datos específicos del equipo (Motor, Generador, Bomba)
   */
  async actualizarDatosEspecificos(
    id: number,
    payload: UpdateDatosEspecificosPayload
  ): Promise<{ success: boolean; data: EquipoDetalle }> {
    const response = await apiClient.patch<{ success: boolean; data: EquipoDetalle }>(
      `/equipos/${id}/datos-especificos`,
      payload
    );
    return response.data;
  },
};

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
 * ✅ 08-ENE-2026: Agregado búsqueda, filtro por tipo y ordenación
 */
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
 * ✅ 08-ENE-2026: Hook para cambiar estado de equipo con historial
 */
export function useCambiarEstadoEquipo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, nuevo_estado, motivo_cambio }: {
      id: number;
      nuevo_estado: string;
      motivo_cambio?: string
    }) => equiposService.cambiarEstado(id, { nuevo_estado, motivo_cambio }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equiposKeys.detail(variables.id) });
    },
  });
}

/**
 * ✅ 08-ENE-2026: Hook para registrar lectura de horómetro
 */
export function useRegistrarLecturaHorometro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, horas_lectura, observaciones }: {
      id: number;
      horas_lectura: number;
      observaciones?: string
    }) => equiposService.registrarLecturaHorometro(id, { horas_lectura, observaciones }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: equiposKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equiposKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook para actualizar equipo completo
 */
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

/**
 * ✅ 23-FEB-2026: Hook para actualizar datos específicos del equipo (Motor, Generador, Bomba)
 */
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

/**
 * ⚠️ Hook para eliminación completa de equipo
 */
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

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS Y HOOK DE TRAZABILIDAD / HOJA DE VIDA DEL EQUIPO
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrazabilidadEquipoResponse {
  equipo: {
    id_equipo: number;
    codigo_equipo: string;
    nombre_equipo?: string;
    tipo: string;
    horas_actuales?: number;
    ubicacion_texto?: string;
    cliente_nombre?: string;
  };
  total_intervenciones: number;
  intervenciones: Array<{
    id_orden_servicio: number;
    numero_orden: string;
    fecha_programada?: string;
    fecha_inicio_real?: string;
    fecha_fin_real?: string;
    fecha_creacion?: string;
    prioridad: string;
    descripcion_inicial?: string;
    diagnostico_tecnico?: string;
    trabajo_realizado?: string;
    estados_orden?: {
      id_estado: number;
      codigo_estado: string;
      nombre_estado: string;
      color_hex?: string;
    };
    tipos_servicio?: {
      id_tipo_servicio: number;
      codigo_tipo: string;
      nombre_tipo: string;
      categoria: string;
      icono?: string;
    };
    empleados_ordenes_servicio_id_tecnico_asignadoToempleados?: {
      id_empleado: number;
      persona?: {
        nombre_completo?: string;
        primer_nombre?: string;
        primer_apellido?: string;
      };
    };
    detalle_servicios_orden?: Array<{
      id_detalle_servicio: number;
      cantidad: number;
      estado_servicio: string;
      precio_unitario: number;
      catalogo_servicios: {
        id_servicio: number;
        codigo_servicio: string;
        nombre_servicio: string;
        categoria: string;
        duracion_estimada_horas?: number;
      };
    }>;
    mediciones_servicio?: Array<{
      id_medicion: number;
      valor_medido: number;
      es_critico?: boolean;
      fuera_de_rango?: boolean;
      parametros_medicion?: {
        nombre_parametro: string;
        unidad_medida: string;
      };
    }>;
    informes?: Array<{
      id_informe: number;
      numero_informe: string;
      fecha_generacion: string;
      documentos_generados?: Array<{
        id_documento: number;
        url_documento: string;
        tipo_documento: string;
      }>;
    }>;
  }>;
}

/**
 * Hook para obtener la hoja de vida y trazabilidad de servicios del equipo
 */
export function useTrazabilidadEquipo(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['trazabilidad-equipo', id],
    queryFn: () => equiposService.obtenerTrazabilidadEquipo(id),
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? id > 0,
  });
}
