/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Catálogo de Sistemas
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createCatalogoSistema,
    deleteCatalogoSistema,
    getCatalogoSistema,
    getCatalogoSistemas,
    getCatalogoSistemasActivos,
    updateCatalogoSistema,
    type CatalogoSistemasQueryParams,
    type CreateCatalogoSistemaDto,
    type UpdateCatalogoSistemaDto
} from '../api/catalogo-sistemas.service';

const CATALOGO_SISTEMAS_KEY = ['catalogos', 'sistemas'];

/**
 * Hook para obtener lista paginada de sistemas
 */
export function useCatalogoSistemas(params?: CatalogoSistemasQueryParams) {
    return useQuery({
        queryKey: [...CATALOGO_SISTEMAS_KEY, params],
        queryFn: () => getCatalogoSistemas(params),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener sistemas activos
 */
export function useCatalogoSistemasActivos() {
    return useQuery({
        queryKey: [...CATALOGO_SISTEMAS_KEY, 'activos'],
        queryFn: () => getCatalogoSistemasActivos(),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener un sistema por ID
 */
export function useCatalogoSistema(id: number) {
    return useQuery({
        queryKey: [...CATALOGO_SISTEMAS_KEY, id],
        queryFn: () => getCatalogoSistema(id),
        enabled: !!id,
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para crear sistema
 */
export function useCreateCatalogoSistema() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCatalogoSistemaDto) => createCatalogoSistema(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_SISTEMAS_KEY });
            toast.success('Sistema creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear sistema');
        },
    });
}

/**
 * Hook para actualizar sistema
 */
export function useUpdateCatalogoSistema() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateCatalogoSistemaDto }) =>
            updateCatalogoSistema(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: [...CATALOGO_SISTEMAS_KEY, id] });
            queryClient.invalidateQueries({ queryKey: CATALOGO_SISTEMAS_KEY });
            toast.success('Sistema actualizado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar sistema');
        },
    });
}

/**
 * Hook para eliminar (soft delete) sistema
 */
export function useDeleteCatalogoSistema() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteCatalogoSistema(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_SISTEMAS_KEY });
            toast.success('Sistema desactivado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar sistema');
        },
    });
}

/**
 * Hook para obtener sistemas con indicadores de uso
 */
export function useCatalogoSistemasConUso(params?: CatalogoSistemasQueryParams) {
    return useQuery({
        queryKey: [...CATALOGO_SISTEMAS_KEY, 'con-uso', params],
        queryFn: () => getCatalogoSistemasConUso(params),
        ...CacheStrategy.DYNAMIC,
    });
}
