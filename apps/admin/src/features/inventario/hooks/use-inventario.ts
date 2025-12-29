/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Inventario
 */

import type {
    ComponentesQueryParams,
    CreateComponenteDto,
    MovimientosQueryParams,
    RegistrarMovimientoDto,
} from '@/types/inventario';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createComponente,
    deleteComponente,
    getComponente,
    getComponentes,
    getKardex,
    getMovimientos,
    getStockComponente,
    registrarMovimiento,
    updateComponente,
} from '../api/inventario.service';

// Query Keys
const COMPONENTES_KEY = ['componentes'];
const MOVIMIENTOS_KEY = ['movimientos-inventario'];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

export function useComponentes(params?: ComponentesQueryParams) {
    return useQuery({
        queryKey: [...COMPONENTES_KEY, params],
        queryFn: () => getComponentes(params),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

export function useComponente(id: number) {
    return useQuery({
        queryKey: [...COMPONENTES_KEY, id],
        queryFn: () => getComponente(id),
        enabled: id > 0,
    });
}

export function useCreateComponente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateComponenteDto) => createComponente(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMPONENTES_KEY });
        },
    });
}

export function useUpdateComponente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CreateComponenteDto> }) =>
            updateComponente(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMPONENTES_KEY });
        },
    });
}

export function useDeleteComponente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteComponente(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMPONENTES_KEY });
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════

export function useMovimientos(params?: MovimientosQueryParams) {
    return useQuery({
        queryKey: [...MOVIMIENTOS_KEY, params],
        queryFn: () => getMovimientos(params),
        staleTime: 1000 * 60, // 1 minuto
    });
}

export function useRegistrarMovimiento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: RegistrarMovimientoDto) => registrarMovimiento(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MOVIMIENTOS_KEY });
            queryClient.invalidateQueries({ queryKey: COMPONENTES_KEY });
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK Y KARDEX
// ═══════════════════════════════════════════════════════════════════════════════

export function useStockComponente(idComponente: number) {
    return useQuery({
        queryKey: ['stock', idComponente],
        queryFn: () => getStockComponente(idComponente),
        enabled: idComponente > 0,
    });
}

export function useKardex(
    idComponente: number,
    params?: {
        fecha_desde?: string;
        fecha_hasta?: string;
        tipo_movimiento?: string;
    }
) {
    return useQuery({
        queryKey: ['kardex', idComponente, params],
        queryFn: () => getKardex(idComponente, params),
        enabled: idComponente > 0,
    });
}
