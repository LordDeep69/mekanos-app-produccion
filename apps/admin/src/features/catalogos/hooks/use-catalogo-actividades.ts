/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Catálogo de Actividades
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createCatalogoActividad,
    deleteCatalogoActividad,
    getCatalogoActividad,
    getCatalogoActividades,
    updateCatalogoActividad,
    type CatalogoActividadesQueryParams,
    type CreateCatalogoActividadDto,
    type UpdateCatalogoActividadDto,
} from '../api/catalogo-actividades.service';

const CATALOGO_ACTIVIDADES_KEY = ['catalogos', 'actividades'];

/**
 * Hook para obtener lista de actividades del catálogo
 */
export function useCatalogoActividades(params?: CatalogoActividadesQueryParams) {
    return useQuery({
        queryKey: [...CATALOGO_ACTIVIDADES_KEY, params],
        queryFn: () => getCatalogoActividades(params),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener una actividad por ID
 */
export function useCatalogoActividad(id: number) {
    return useQuery({
        queryKey: [...CATALOGO_ACTIVIDADES_KEY, id],
        queryFn: () => getCatalogoActividad(id),
        enabled: !!id,
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para crear actividad en el catálogo
 */
export function useCreateCatalogoActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCatalogoActividadDto) => createCatalogoActividad(data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            toast.success(result.message || 'Actividad creada exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear actividad');
        },
    });
}

/**
 * Hook para actualizar actividad del catálogo
 */
export function useUpdateCatalogoActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateCatalogoActividadDto }) =>
            updateCatalogoActividad(id, data),
        onSuccess: (result, { id }) => {
            queryClient.invalidateQueries({ queryKey: [...CATALOGO_ACTIVIDADES_KEY, id] });
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            toast.success(result.message || 'Actividad actualizada exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar actividad');
        },
    });
}

/**
 * Hook para eliminar (soft delete) actividad del catálogo
 */
export function useDeleteCatalogoActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteCatalogoActividad(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            toast.success(result.message || 'Actividad desactivada');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar actividad');
        },
    });
}
