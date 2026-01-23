/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Órdenes de Servicio
 * 
 * ENTERPRISE CACHE: Órdenes usan estrategia DYNAMIC (2min staleTime)
 * para garantizar actualizaciones en tiempo real sin sacrificar rendimiento.
 * 
 * IMPORTANTE: Las mutaciones invalidan cache relacionado para
 * garantizar que cambios de estado se reflejen inmediatamente.
 */

import { CacheStrategy } from '@/lib/cache';
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
    updateActividad,
    updateMedicion,
    updateObservacionesCierre,
    updateOrden,
    type AddServicioDetalleDto,
    type UpdateActividadDto,
    type UpdateMedicionDto,
    type UpdateOrdenDto
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
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
        ...CacheStrategy.DYNAMIC, // Datos dinámicos - 2 min cache
    });
}

/**
 * Hook para crear orden
 */
// Dashboard keys para invalidación cruzada
const DASHBOARD_KEY = ['dashboard'];

export function useCrearOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateOrdenDto) => createOrden(data),
        onSuccess: () => {
            // Invalidar órdenes Y dashboard para reflejar cambios en métricas
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
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
            // ✅ ENTERPRISE: Invalidar órdenes Y dashboard para actualización en tiempo real
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
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
            // Invalidar órdenes Y dashboard
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
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
            // Invalidar órdenes Y dashboard
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
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
 * Hook para actualizar orden
 * Solo permite edición si el estado NO es final (APROBADA, CANCELADA)
 */
export function useUpdateOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateOrdenDto }) =>
            updateOrden(id, data),
        onSuccess: (result, { id }) => {
            // Invalidar órdenes específica Y lista Y dashboard
            queryClient.invalidateQueries({ queryKey: [...ORDENES_KEY, id] });
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
            toast.success(result.message || 'Orden actualizada exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar orden');
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

/**
 * Hook para actualizar actividad ejecutada (estado B/M/C/NA, observaciones)
 * Invalida cache de actividades de la orden para reflejar cambios inmediatamente
 */
export function useUpdateActividad() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ idActividad, data }: { idActividad: number; data: UpdateActividadDto }) =>
            updateActividad(idActividad, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACTIVIDADES_ORDEN_KEY });
            toast.success('Actividad actualizada');
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
 * Hook para actualizar medición (valor, observaciones)
 * El backend recalcula automáticamente fueraDeRango y nivelAlerta
 */
export function useUpdateMedicion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ idMedicion, data }: { idMedicion: number; data: UpdateMedicionDto }) =>
            updateMedicion(idMedicion, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MEDICIONES_ORDEN_KEY });
            toast.success('Medición actualizada');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar medición');
        },
    });
}

/**
 * Hook ATÓMICO para actualizar observaciones de cierre
 * Usa endpoint dedicado PATCH /ordenes/:id/observaciones-cierre
 * Permite edición incluso en órdenes COMPLETADAS
 */
export function useUpdateObservacionesCierre() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, observaciones_cierre }: { id: number; observaciones_cierre: string }) =>
            updateObservacionesCierre(id, observaciones_cierre),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...ORDENES_KEY, variables.id] });
            queryClient.invalidateQueries({ queryKey: ORDENES_KEY });
            toast.success('Observaciones de cierre actualizadas');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar observaciones de cierre');
        },
    });
}
