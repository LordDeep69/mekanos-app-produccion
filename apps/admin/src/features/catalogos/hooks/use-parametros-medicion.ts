/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Parámetros de Medición
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createParametroMedicion,
    deleteParametroMedicion,
    getParametroMedicion,
    getParametrosMedicion,
    getParametrosMedicionActivos,
    updateParametroMedicion,
    type CreateParametroMedicionDto,
    type ParametrosMedicionQueryParams,
    type UpdateParametroMedicionDto,
} from '../api/parametros-medicion.service';

const PARAMETROS_MEDICION_KEY = ['catalogos', 'parametros-medicion'];

/**
 * Hook para obtener lista paginada de parámetros
 */
export function useParametrosMedicion(params?: ParametrosMedicionQueryParams) {
    return useQuery({
        queryKey: [...PARAMETROS_MEDICION_KEY, params],
        queryFn: () => getParametrosMedicion(params),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener parámetros activos
 */
export function useParametrosMedicionActivos() {
    return useQuery({
        queryKey: [...PARAMETROS_MEDICION_KEY, 'activos'],
        queryFn: () => getParametrosMedicionActivos(),
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para obtener un parámetro por ID
 */
export function useParametroMedicion(id: number) {
    return useQuery({
        queryKey: [...PARAMETROS_MEDICION_KEY, id],
        queryFn: () => getParametroMedicion(id),
        enabled: !!id,
        ...CacheStrategy.STATIC,
    });
}

/**
 * Hook para crear parámetro
 */
export function useCreateParametroMedicion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateParametroMedicionDto) => createParametroMedicion(data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: PARAMETROS_MEDICION_KEY });
            toast.success(result.message || 'Parámetro creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear parámetro');
        },
    });
}

/**
 * Hook para actualizar parámetro
 */
export function useUpdateParametroMedicion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateParametroMedicionDto }) =>
            updateParametroMedicion(id, data),
        onSuccess: (result, { id }) => {
            queryClient.invalidateQueries({ queryKey: [...PARAMETROS_MEDICION_KEY, id] });
            queryClient.invalidateQueries({ queryKey: PARAMETROS_MEDICION_KEY });
            toast.success(result.message || 'Parámetro actualizado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar parámetro');
        },
    });
}

/**
 * Hook para eliminar (soft delete) parámetro
 */
export function useDeleteParametroMedicion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteParametroMedicion(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: PARAMETROS_MEDICION_KEY });
            toast.success(result.message || 'Parámetro desactivado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar parámetro');
        },
    });
}
