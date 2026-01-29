/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Firmas Administrativas
 */

'use client';

import type {
    CreateFirmaAdministrativaDto,
    FirmasAdministrativasQueryParams,
    UpdateFirmaAdministrativaDto,
} from '@/types/firmas-administrativas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createFirmaAdministrativa,
    deleteFirmaAdministrativa,
    getFirmaAdministrativa,
    getFirmasAdministrativas,
    updateFirmaAdministrativa,
} from '../api/firmas-administrativas.service';

// Query Keys
export const firmasAdministrativasKeys = {
    all: ['firmas-administrativas'] as const,
    lists: () => [...firmasAdministrativasKeys.all, 'list'] as const,
    list: (params?: FirmasAdministrativasQueryParams) =>
        [...firmasAdministrativasKeys.lists(), params] as const,
    details: () => [...firmasAdministrativasKeys.all, 'detail'] as const,
    detail: (id: number) => [...firmasAdministrativasKeys.details(), id] as const,
};

/**
 * Hook para obtener lista de firmas administrativas
 */
export function useFirmasAdministrativas(
    params?: FirmasAdministrativasQueryParams
) {
    return useQuery({
        queryKey: firmasAdministrativasKeys.list(params),
        queryFn: () => getFirmasAdministrativas(params),
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

/**
 * Hook para obtener una firma administrativa por ID
 */
export function useFirmaAdministrativa(
    id: number,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: firmasAdministrativasKeys.detail(id),
        queryFn: () => getFirmaAdministrativa(id),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled ?? id > 0,
    });
}

/**
 * Hook para crear firma administrativa
 */
export function useCreateFirmaAdministrativa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFirmaAdministrativaDto) =>
            createFirmaAdministrativa(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: firmasAdministrativasKeys.lists(),
            });
        },
    });
}

/**
 * Hook para actualizar firma administrativa
 */
export function useUpdateFirmaAdministrativa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: UpdateFirmaAdministrativaDto;
        }) => updateFirmaAdministrativa(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({
                queryKey: firmasAdministrativasKeys.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: firmasAdministrativasKeys.detail(id),
            });
        },
    });
}

/**
 * Hook para eliminar firma administrativa
 */
export function useDeleteFirmaAdministrativa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteFirmaAdministrativa(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: firmasAdministrativasKeys.lists(),
            });
        },
    });
}

/**
 * Hook para refrescar manualmente la lista
 */
export function useRefreshFirmasAdministrativas() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: firmasAdministrativasKeys.all,
        });
    };
}
