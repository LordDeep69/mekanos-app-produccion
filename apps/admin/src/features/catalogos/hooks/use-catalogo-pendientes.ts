/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Catálogo Maestro de Pendientes Técnicos
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCatalogoPendiente,
  deleteCatalogoPendiente,
  getCatalogoPendientes,
  toggleActivoCatalogoPendiente,
  updateCatalogoPendiente,
  type CatalogoPendientesQueryParams,
  type CreateCatalogoPendienteDto,
  type UpdateCatalogoPendienteDto,
} from '../api/catalogo-pendientes.service';

export const CATALOGO_PENDIENTES_KEY = ['catalogos', 'pendientes'];

/**
 * Hook para obtener la lista de pendientes del catálogo maestro
 */
export function useCatalogoPendientes(params?: CatalogoPendientesQueryParams) {
  return useQuery({
    queryKey: [...CATALOGO_PENDIENTES_KEY, params],
    queryFn: () => getCatalogoPendientes(params),
    ...CacheStrategy.DYNAMIC,
  });
}

/**
 * Hook para crear un nuevo pendiente en el catálogo
 */
export function useCreateCatalogoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCatalogoPendienteDto) => createCatalogoPendiente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_PENDIENTES_KEY });
      toast.success('Pendiente agregado al catálogo maestro');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err.response?.data?.message;
      const errorText = Array.isArray(message) ? message.join(', ') : message;
      toast.error(errorText || 'Error al agregar pendiente');
    },
  });
}

/**
 * Hook para actualizar un pendiente existente
 */
export function useUpdateCatalogoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCatalogoPendienteDto }) =>
      updateCatalogoPendiente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_PENDIENTES_KEY });
      toast.success('Pendiente actualizado exitosamente');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err.response?.data?.message;
      const errorText = Array.isArray(message) ? message.join(', ') : message;
      toast.error(errorText || 'Error al actualizar pendiente');
    },
  });
}

/**
 * Hook para alternar el estado activo / inactivo
 */
export function useToggleActivoCatalogoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      toggleActivoCatalogoPendiente(id, activo),
    onSuccess: (_, { activo }) => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_PENDIENTES_KEY });
      toast.success(activo ? 'Pendiente activado' : 'Pendiente inactivado');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err.response?.data?.message;
      const errorText = Array.isArray(message) ? message.join(', ') : message;
      toast.error(errorText || 'Error al cambiar estado');
    },
  });
}

/**
 * Hook para eliminar un ítem del catálogo
 */
export function useDeleteCatalogoPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, hard }: { id: number; hard?: boolean }) =>
      deleteCatalogoPendiente(id, hard),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_PENDIENTES_KEY });
      toast.success(res.message || 'Operación completada');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err.response?.data?.message;
      const errorText = Array.isArray(message) ? message.join(', ') : message;
      toast.error(errorText || 'Error al eliminar pendiente');
    },
  });
}
