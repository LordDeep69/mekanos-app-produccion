/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Tipos de Servicio
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createTipoServicio,
    deleteTipoServicio,
    getTipoServicio,
    getTipoServicioDetalleCompleto,
    getTiposServicio,
    getTiposServicioByCategoria,
    updateTipoServicio,
    type CategoriaServicio,
    type CreateTipoServicioDto,
    type TiposServicioQueryParams,
    type UpdateTipoServicioDto,
} from '../api/tipos-servicio.service';

const TIPOS_SERVICIO_KEY = ['catalogos', 'tipos-servicio'];

/**
 * Hook para obtener lista de tipos de servicio
 */
export function useTiposServicio(params?: TiposServicioQueryParams) {
    return useQuery({
        queryKey: [...TIPOS_SERVICIO_KEY, params],
        queryFn: () => getTiposServicio(params),
        ...CacheStrategy.STATIC, // Catálogos cambian poco
    });
}

/**
 * Hook para obtener un tipo de servicio por ID
 */
export function useTipoServicio(id: number) {
    return useQuery({
        queryKey: [...TIPOS_SERVICIO_KEY, id],
        queryFn: () => getTipoServicio(id),
        enabled: !!id,
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener tipos de servicio por categoría
 */
export function useTiposServicioByCategoria(categoria: CategoriaServicio, soloActivos: boolean = true) {
    return useQuery({
        queryKey: [...TIPOS_SERVICIO_KEY, 'categoria', categoria, soloActivos],
        queryFn: () => getTiposServicioByCategoria(categoria, soloActivos),
        enabled: !!categoria,
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para crear tipo de servicio
 */
export function useCreateTipoServicio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTipoServicioDto) => createTipoServicio(data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: TIPOS_SERVICIO_KEY });
            toast.success(result.message || 'Tipo de servicio creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear tipo de servicio');
        },
    });
}

/**
 * Hook para actualizar tipo de servicio
 */
export function useUpdateTipoServicio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTipoServicioDto }) =>
            updateTipoServicio(id, data),
        onSuccess: (result, { id }) => {
            queryClient.invalidateQueries({ queryKey: [...TIPOS_SERVICIO_KEY, id] });
            queryClient.invalidateQueries({ queryKey: TIPOS_SERVICIO_KEY });
            toast.success(result.message || 'Tipo de servicio actualizado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar tipo de servicio');
        },
    });
}

/**
 * Hook para eliminar (soft delete) tipo de servicio
 */
export function useDeleteTipoServicio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteTipoServicio(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: TIPOS_SERVICIO_KEY });
            toast.success(result.message || 'Tipo de servicio desactivado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar tipo de servicio');
        },
    });
}

/**
 * Hook para obtener detalle completo del tipo de servicio (Master-Detail)
 */
export function useTipoServicioDetalleCompleto(id: number | null) {
    return useQuery({
        queryKey: [...TIPOS_SERVICIO_KEY, 'detalle-completo', id],
        queryFn: () => getTipoServicioDetalleCompleto(id!),
        enabled: !!id,
        ...CacheStrategy.DYNAMIC, // Se actualiza más frecuente
    });
}
