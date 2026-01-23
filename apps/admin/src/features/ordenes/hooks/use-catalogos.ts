/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Catálogos del Módulo de Órdenes
 * 
 * ENTERPRISE CACHE: Usa estrategias optimizadas por tipo de dato
 * - STATIC (30min): Catálogos que casi nunca cambian
 * - SEMI_STATIC (15min): Selectores de referencia
 */

import { CacheStrategy } from '@/lib/cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createActividadCatalogo,
    createEstadoOrden,
    createParametroMedicion,
    createServicioComercial,
    createSistema,
    createTipoServicio,
    deleteActividadCatalogo,
    deleteEstadoOrden,
    deleteParametroMedicion,
    deleteServicioComercial,
    deleteSistema,
    deleteTipoServicio,
    getActividadesCatalogo,
    getClientesSelector,
    getEquipo,
    getEquiposSelector,
    getEstadoOrden,
    getEstadosOrden,
    getParametrosMedicion,
    getSedesCliente,
    getServiciosComerciales,
    getSistemas,
    getTecnicosSelector,
    getTipoServicio,
    getTiposServicio,
    updateActividadCatalogo,
    updateEstadoOrden,
    updateParametroMedicion,
    updateServicioComercial,
    updateSistema,
    updateTipoServicio,
    type ActividadCatalogo,
    type CatalogoServicio,
    type EstadoOrden,
    type ParametroMedicion,
    type Sistema,
    type TipoServicio
} from '../api/catalogos.service';

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════════

export const CATALOGOS_KEYS = {
    tiposServicio: ['tipos-servicio'] as const,
    estadosOrden: ['estados-orden'] as const,
    clientes: ['clientes-selector'] as const,
    sedes: ['sedes-cliente'] as const,
    equipos: ['equipos-selector'] as const,
    tecnicos: ['tecnicos-selector'] as const,
    sistemas: ['sistemas'] as const,
    parametros: ['parametros-medicion'] as const,
    actividades: ['catalogo-actividades'] as const,
    serviciosComerciales: ['catalogo-servicios'] as const,
};

// ... (existing code for tiposServicio and estadosOrden) ...

// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE SERVICIOS (COMERCIAL)
// ═══════════════════════════════════════════════════════════════════════════════

export function useServiciosComerciales(params?: { activo?: boolean; idTipoServicio?: number }) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.serviciosComerciales, params],
        queryFn: () => getServiciosComerciales(params),
        ...CacheStrategy.STATIC, // Catálogo estático - 30 min cache
    });
}

export function useCrearServicioComercial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<CatalogoServicio>) => createServicioComercial(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.serviciosComerciales });
            toast.success('Servicio comercial creado');
        },
    });
}

export function useActualizarServicioComercial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CatalogoServicio> }) => updateServicioComercial(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.serviciosComerciales });
            toast.success('Servicio comercial actualizado');
        },
    });
}

export function useEliminarServicioComercial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteServicioComercial(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.serviciosComerciales });
            toast.success('Servicio comercial eliminado');
        },
    });
}

// ... (existing code for sistemas, parametros, actividades, tiposServicio) ...

// ═══════════════════════════════════════════════════════════════════════════════
// SISTEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export function useSistemas(params?: { activo?: boolean }) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.sistemas, params],
        queryFn: () => getSistemas(params),
        ...CacheStrategy.STATIC, // Catálogo estático - 30 min cache
    });
}

export function useCrearSistema() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Sistema>) => createSistema(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.sistemas });
            toast.success('Sistema creado exitosamente');
        },
    });
}

export function useActualizarSistema() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Sistema> }) => updateSistema(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.sistemas });
            toast.success('Sistema actualizado');
        },
    });
}

export function useEliminarSistema() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteSistema(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.sistemas });
            toast.success('Sistema eliminado');
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS DE MEDICIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export function useParametrosMedicion(params?: { activo?: boolean; categoria?: string }) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.parametros, params],
        queryFn: () => getParametrosMedicion(params),
        ...CacheStrategy.STATIC, // Catálogo estático - 30 min cache
    });
}

export function useCrearParametroMedicion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<ParametroMedicion>) => createParametroMedicion(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.parametros });
            toast.success('Parámetro creado exitosamente');
        },
    });
}

export function useActualizarParametroMedicion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ParametroMedicion> }) => updateParametroMedicion(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.parametros });
            toast.success('Parámetro actualizado');
        },
    });
}

export function useEliminarParametroMedicion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteParametroMedicion(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.parametros });
            toast.success('Parámetro eliminado');
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVIDADES (CHECKLIST)
// ═══════════════════════════════════════════════════════════════════════════════

export function useActividadesCatalogo(params?: { activo?: boolean; idTipoServicio?: number; idSistema?: number }) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.actividades, params],
        queryFn: () => getActividadesCatalogo(params),
        ...CacheStrategy.STATIC, // Catálogo estático - 30 min cache
    });
}

export function useCrearActividadCatalogo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<ActividadCatalogo>) => createActividadCatalogo(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.actividades });
            toast.success('Actividad creada exitosamente');
        },
    });
}

export function useActualizarActividadCatalogo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ActividadCatalogo> }) => updateActividadCatalogo(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.actividades });
            toast.success('Actividad actualizada');
        },
    });
}

export function useEliminarActividadCatalogo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteActividadCatalogo(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.actividades });
            toast.success('Actividad eliminada');
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE SERVICIO
// ═══════════════════════════════════════════════════════════════════════════════

export function useTiposServicio(params?: { activo?: boolean; categoria?: string; tipoEquipoId?: number }) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.tiposServicio, params],
        queryFn: () => getTiposServicio(params),
        ...CacheStrategy.STATIC, // Catálogo estático - 30 min cache
    });
}

export function useTipoServicio(id: number) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.tiposServicio, id],
        queryFn: () => getTipoServicio(id),
        enabled: !!id,
    });
}

export function useCrearTipoServicio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<TipoServicio>) => createTipoServicio(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.tiposServicio });
            toast.success('Tipo de servicio creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear tipo de servicio');
        },
    });
}

export function useActualizarTipoServicio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<TipoServicio> }) =>
            updateTipoServicio(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.tiposServicio });
            toast.success('Tipo de servicio actualizado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar tipo de servicio');
        },
    });
}

export function useEliminarTipoServicio() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteTipoServicio(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.tiposServicio });
            toast.success('Tipo de servicio desactivado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar tipo de servicio');
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADOS DE ORDEN
// ═══════════════════════════════════════════════════════════════════════════════

export function useEstadosOrden(params?: { activo?: boolean; esEstadoFinal?: boolean }) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.estadosOrden, params],
        queryFn: () => getEstadosOrden(params),
        ...CacheStrategy.STATIC, // Catálogo estático - 30 min cache
    });
}

export function useEstadoOrden(id: number) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.estadosOrden, id],
        queryFn: () => getEstadoOrden(id),
        enabled: !!id,
    });
}

export function useCrearEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<EstadoOrden>) => createEstadoOrden(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.estadosOrden });
            toast.success('Estado de orden creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear estado de orden');
        },
    });
}

export function useActualizarEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<EstadoOrden> }) =>
            updateEstadoOrden(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.estadosOrden });
            toast.success('Estado de orden actualizado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar estado de orden');
        },
    });
}

export function useEliminarEstadoOrden() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteEstadoOrden(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CATALOGOS_KEYS.estadosOrden });
            toast.success('Estado de orden desactivado');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar estado de orden');
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTORES PARA WIZARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para selector de clientes con búsqueda
 */
export function useClientesSelector(busqueda?: string, enabled = true) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.clientes, busqueda],
        queryFn: () => getClientesSelector({ busqueda, limit: 50 }),
        enabled,
        ...CacheStrategy.SEMI_STATIC, // Selector semi-estático - 15 min cache
    });
}

/**
 * Hook para obtener sedes de un cliente
 */
export function useSedesCliente(clienteId: number | undefined) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.sedes, clienteId],
        queryFn: () => getSedesCliente(clienteId!),
        enabled: !!clienteId,
    });
}

/**
 * Hook para selector de equipos filtrado por cliente/sede
 */
export function useEquiposSelector(params?: {
    idCliente?: number;
    idSede?: number;
    busqueda?: string;
}, enabled = true) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.equipos, params],
        queryFn: () => getEquiposSelector({ ...params, limit: 50 }),
        enabled,
        ...CacheStrategy.SEMI_STATIC, // Selector semi-estático - 15 min cache
    });
}

/**
 * Hook para obtener un equipo específico
 */
export function useEquipo(id: number | undefined) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.equipos, 'detalle', id],
        queryFn: () => getEquipo(id!),
        enabled: !!id,
    });
}

/**
 * Hook para selector de técnicos con búsqueda
 */
export function useTecnicosSelector(busqueda?: string, enabled = true) {
    return useQuery({
        queryKey: [...CATALOGOS_KEYS.tecnicos, busqueda],
        queryFn: () => getTecnicosSelector({ busqueda, limit: 50 }),
        enabled,
        ...CacheStrategy.SEMI_STATIC, // Selector semi-estático - 15 min cache
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS COMPUESTOS PARA WIZARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook que carga catálogos necesarios para el wizard, permitiendo filtrado dinámico
 */
export function useWizardCatalogos(params?: { tipoEquipoId?: number }) {
    const tiposServicio = useTiposServicio({
        activo: true,
        tipoEquipoId: params?.tipoEquipoId
    });
    const estadosOrden = useEstadosOrden({ activo: true });

    return {
        tiposServicio: tiposServicio.data || [],
        estadosOrden: estadosOrden.data || [],
        isLoading: tiposServicio.isLoading || estadosOrden.isLoading,
        isError: tiposServicio.isError || estadosOrden.isError,
        error: tiposServicio.error || estadosOrden.error,
    };
}

/**
 * Hook para el flujo de selección en cascada: Cliente → Sede → Equipo
 */
export function useCascadaClienteEquipo(clienteId?: number, sedeId?: number) {
    const clientes = useClientesSelector();
    const sedes = useSedesCliente(clienteId);
    const equipos = useEquiposSelector(
        { idCliente: clienteId, idSede: sedeId },
        !!clienteId
    );

    return {
        clientes: clientes.data || [],
        sedes: sedes.data || [],
        equipos: equipos.data || [],
        isLoadingClientes: clientes.isLoading,
        isLoadingSedes: sedes.isLoading,
        isLoadingEquipos: equipos.isLoading,
    };
}
