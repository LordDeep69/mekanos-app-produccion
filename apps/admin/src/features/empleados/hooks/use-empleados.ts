/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Empleados
 */

import type {
    CreateEmpleadoDto,
    EmpleadosQueryParams,
    UpdateEmpleadoDto,
} from '@/types/empleados';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    createEmpleado,
    deleteEmpleado,
    getEmpleado,
    getEmpleados,
    updateEmpleado,
} from '../api/empleados.service';

// Query keys
const EMPLEADOS_KEY = ['empleados'];

/**
 * Hook para obtener lista de empleados
 */
export function useEmpleados(params?: EmpleadosQueryParams) {
    return useQuery({
        queryKey: [...EMPLEADOS_KEY, params],
        queryFn: () => getEmpleados(params),
    });
}

/**
 * Hook para obtener un empleado por ID
 */
export function useEmpleado(id: number) {
    return useQuery({
        queryKey: [...EMPLEADOS_KEY, id],
        queryFn: () => getEmpleado(id),
        enabled: !!id,
    });
}

/**
 * Hook para crear empleado
 */
export function useCrearEmpleado() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEmpleadoDto) => createEmpleado(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLEADOS_KEY });
            toast.success('Empleado creado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al crear empleado');
        },
    });
}

/**
 * Hook para actualizar empleado
 */
export function useActualizarEmpleado() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateEmpleadoDto }) =>
            updateEmpleado(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLEADOS_KEY });
            toast.success('Empleado actualizado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al actualizar empleado');
        },
    });
}

/**
 * Hook para eliminar empleado
 */
export function useEliminarEmpleado() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteEmpleado(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLEADOS_KEY });
            toast.success('Empleado eliminado exitosamente');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al eliminar empleado');
        },
    });
}

/**
 * Hook para refrescar lista de empleados
 */
export function useRefreshEmpleados() {
    const queryClient = useQueryClient();

    return {
        refresh: () => queryClient.invalidateQueries({ queryKey: EMPLEADOS_KEY }),
    };
}
