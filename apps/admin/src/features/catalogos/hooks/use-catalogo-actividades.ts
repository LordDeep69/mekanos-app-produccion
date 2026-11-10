/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Catálogo de Actividades y Banco Universal (Fase 5.9)
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createCatalogoActividad,
    deleteCatalogoActividad,
    getCatalogoActividad,
    getCatalogoActividades,
    propagarActividadBanco,
    reordenarActividadesLote,
    updateCatalogoActividad,
    vincularActividadesLote,
    type CatalogoActividadesQueryParams,
    type CreateCatalogoActividadDto,
    type PropagarActividadBancoPayload,
    type ReordenarActividadesLotePayload,
    type UpdateCatalogoActividadDto,
    type VincularActividadesLotePayload,
} from '../api/catalogo-actividades.service';

const CATALOGO_ACTIVIDADES_KEY = ['catalogos', 'actividades'];

export function useCatalogoActividades(params?: CatalogoActividadesQueryParams) {
    return useQuery({
        queryKey: [...CATALOGO_ACTIVIDADES_KEY, params],
        queryFn: () => getCatalogoActividades(params),
        ...CacheStrategy.STATIC,
    });
}

export function useCatalogoActividad(id: number) {
    return useQuery({
        queryKey: [...CATALOGO_ACTIVIDADES_KEY, id],
        queryFn: () => getCatalogoActividad(id),
        enabled: !!id,
        ...CacheStrategy.STATIC,
    });
}

export function useCreateCatalogoActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCatalogoActividadDto) => createCatalogoActividad(data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] });
            toast.success(result?.message || 'Actividad registrada exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear actividad');
        },
    });
}

export function useUpdateCatalogoActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateCatalogoActividadDto }) =>
            updateCatalogoActividad(id, data),
        onSuccess: (result, { id }) => {
            queryClient.invalidateQueries({ queryKey: [...CATALOGO_ACTIVIDADES_KEY, id] });
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] });
            toast.success(result?.message || 'Actividad actualizada exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar actividad');
        },
    });
}

export function useDeleteCatalogoActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteCatalogoActividad(id),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] });
            toast.success(result?.message || 'Actividad quitada del protocolo');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar actividad');
        },
    });
}

export function useVincularActividadesLote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: VincularActividadesLotePayload) => vincularActividadesLote(payload),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] });
            toast.success(
                `Se vincularon ${res.createdCount} actividad(es) exitosamente` +
                    (res.skippedCount > 0 ? ` (${res.skippedCount} ya estaban en el protocolo)` : ''),
            );
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al vincular actividades en lote');
        },
    });
}

export function useReordenarActividadesLote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReordenarActividadesLotePayload) => reordenarActividadesLote(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] });
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al reordenar actividades');
        },
    });
}

export function usePropagarActividadBanco() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: PropagarActividadBancoPayload) => propagarActividadBanco(payload),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: CATALOGO_ACTIVIDADES_KEY });
            queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] });
            toast.success(
                res.propagatedCount > 0
                    ? `Actividad actualizada y propagada a ${res.propagatedCount} protocolo(s) vinculado(s)`
                    : 'Plantilla del Banco Universal actualizada exitosamente',
            );
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al propagar cambios desde el Banco Universal');
        },
    });
}
