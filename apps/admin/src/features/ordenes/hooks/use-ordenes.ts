/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Órdenes de Servicio
 */

import type {
    CambiarEstadoDto,
    CreateOrdenDto,
    OrdenesQueryParams,
} from '@/types/ordenes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    addServicioOrden,
    asignarTecnico,
    cambiarEstadoOrden,
    cancelarOrden,
    createOrden,
    getActividadesOrden,
    getEvidenciasOrden,
    getFirmasOrden,
    getMedicionesOrden,
    getOrden,
    getOrdenes,
    getServiciosOrden,
    removeServicioOrden,
    type AddServicioDetalleDto,
} from '../api/ordenes.service';

// Query keys
const ORDENES_KEY = ['ordenes'];
const SERVICIOS_ORDEN_KEY = ['ordenes', 'servicios'];
const ACTIVIDADES_ORDEN_KEY = ['ordenes', 'actividades'];
const MEDICIONES_ORDEN_KEY = ['ordenes', 'mediciones'];
const EVIDENCIAS_ORDEN_KEY = ['ordenes', 'evidencias'];
const FIRMAS_ORDEN_KEY = ['ordenes', 'firmas'];

// ... (existing hooks) ...

/**
 * Hook para obtener evidencias de una orden
 */
export function useEvidenciasOrden(idOrden: number) {
    return useQuery({
        queryKey: [...EVIDENCIAS_ORDEN_KEY, idOrden],
        queryFn: () => getEvidenciasOrden(idOrden),
        enabled: !!idOrden,
    });
}

/**
 * Hook para obtener firmas de una orden
 */
export function useFirmasOrden(idOrden: number) {
    return useQuery({
        queryKey: [...FIRMAS_ORDEN_KEY, idOrden],
        queryFn: () => getFirmasOrden(idOrden),
        enabled: !!idOrden,
    });
}

// ... (existing hooks) ...

/**
 * Hook para obtener actividades de una orden
 */
export function useActividadesOrden(idOrden: number) {
    return useQuery({
        queryKey: [...ACTIVIDADES_ORDEN_KEY, idOrden],
        queryFn: () => getActividadesOrden(idOrden),
        enabled: !!idOrden,
    });
}

/**
 * Hook para obtener mediciones de una orden
 */
export function useMedicionesOrden(idOrden: number) {
    return useQuery({
        queryKey: [...MEDICIONES_ORDEN_KEY, idOrden],
        queryFn: () => getMedicionesOrden(idOrden),
        enabled: !!idOrden,
    });
}

// ... (existing hooks) ...

/**
 * Hook para obtener servicios de una orden
 */
export function useServiciosOrden(idOrden: number) {
    return useQuery({
        queryKey: [...SERVICIOS_ORDEN_KEY, idOrden],
        queryFn: () => getServiciosOrden(idOrden),
        enabled: !!idOrden,
    });
}

/**
 * Hook para agregar servicio a una orden
 */
export function useAddServicioOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ idOrden, data }: { idOrden: number; data: AddServicioDetalleDto }) =>
            addServicioOrden(idOrden, data),
        onSuccess: (_, { idOrden }) => {
            queryClient.invalidateQueries({ queryKey: [...SERVICIOS_ORDEN_KEY, idOrden] });
            queryClient.invalidateQueries({ queryKey: [...ORDENES_KEY, idOrden] }); // Refrescar totales
            toast.success('Servicio agregado exitosamente');
        },
    });
}

/**
 * Hook para eliminar servicio de una orden
 */
export function useRemoveServicioOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ idOrden, idDetalle }: { idOrden: number; idDetalle: number }) =>
            removeServicioOrden(idOrden, idDetalle),
        onSuccess: (_, { idOrden }) => {
            queryClient.invalidateQueries({ queryKey: [...SERVICIOS_ORDEN_KEY, idOrden] });
            queryClient.invalidateQueries({ queryKey: [...ORDENES_KEY, idOrden] }); // Refrescar totales
            toast.success('Servicio eliminado de la orden');
        },
    });
}

/**
 * Hook para obtener lista de órdenes
 */
export function useOrdenes(params?: OrdenesQueryParams) {
    return useQuery({
        queryKey: [...ORDENES_KEY, params],
        queryFn: () => getOrdenes(params),
    });
}

/**
 * Hook para obtener una orden por ID
 */
export function useOrden(id: number) {
    return useQuery({
        queryKey: [...ORDENES_KEY, id],
        queryFn: () => getOrden(id),
        enabled: !!id,
    });
}

/**
 * Hook para crear orden
 */
export function useCrearOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateOrdenDto) => createOrden(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            toast.success('Orden creada exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear orden');
        },
    });
}

/**
 * Hook para cambiar estado de orden
 */
export function useCambiarEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CambiarEstadoDto }) =>
            cambiarEstadoOrden(id, data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            toast.success(result.message || 'Estado actualizado');
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
 * Hook para asignar técnico
 */
export function useAsignarTecnico() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, tecnicoId }: { id: number; tecnicoId: number }) =>
            asignarTecnico(id, tecnicoId),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            toast.success(result.message || 'Técnico asignado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al asignar técnico');
        },
    });
}

/**
 * Hook para cancelar orden
 */
export function useCancelarOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
            cancelarOrden(id, motivo),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            toast.success(result.message || 'Orden cancelada');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al cancelar orden');
        },
    });
}

/**
 * Hook para refrescar lista de órdenes
 */
export function useRefreshOrdenes() {
    const queryClient = useQueryClient();

    return {
        refresh: () => queryClient.invalidateQueries({ queryKey: ORDENES_KEY }),
    };
}
