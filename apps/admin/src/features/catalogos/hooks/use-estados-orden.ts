/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Estados de Orden
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createEstadoOrden,
    deleteEstadoOrden,
    getEstadoOrden,
    getEstadosOrden,
    getEstadosOrdenActivos,
    updateEstadoOrden,
    type CreateEstadoOrdenDto,
    type EstadosOrdenQueryParams,
    type UpdateEstadoOrdenDto,
} from '../api/estados-orden.service';

const ESTADOS_ORDEN_KEY = ['catalogos', 'estados-orden'];

/**
 * Hook para obtener lista de estados de orden
 */
export function useEstadosOrden(params?: EstadosOrdenQueryParams) {
    return useQuery({
        queryKey: [...ESTADOS_ORDEN_KEY, params],
        queryFn: () => getEstadosOrden(params),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener estados activos (ordenados)
 */
export function useEstadosOrdenActivos() {
    return useQuery({
        queryKey: [...ESTADOS_ORDEN_KEY, 'activos'],
        queryFn: () => getEstadosOrdenActivos(),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener un estado de orden por ID
 */
export function useEstadoOrden(id: number) {
    return useQuery({
        queryKey: [...ESTADOS_ORDEN_KEY, id],
        queryFn: () => getEstadoOrden(id),
        enabled: !!id,
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para crear estado de orden
 */
export function useCreateEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEstadoOrdenDto) => createEstadoOrden(data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ESTADOS_ORDEN_KEY });
            toast.success(result.message || 'Estado de orden creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear estado de orden');
        },
    });
}

/**
 * Hook para actualizar estado de orden
 */
export function useUpdateEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateEstadoOrdenDto }) =>
            updateEstadoOrden(id, data),
        onSuccess: (result, { id }) => {
            queryClient.invalidateQueries({ queryKey: [...ESTADOS_ORDEN_KEY, id] });
            queryClient.invalidateQueries({ queryKey: ESTADOS_ORDEN_KEY });
            toast.success(result.message || 'Estado de orden actualizado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar estado de orden');
        },
    });
}

/**
 * Hook para eliminar (soft delete) estado de orden
 */
export function useDeleteEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteEstadoOrden(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ESTADOS_ORDEN_KEY });
            toast.success(result.message || 'Estado de orden desactivado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar estado de orden');
        },
    });
}
