/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Clientes
 */

'use client';

import type {
    ClientesQueryParams,
    CreateClienteDto,
    UpdateClienteDto,
} from '@/types/clientes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createCliente,
    deleteCliente,
    getCliente,
    getClientes,
    updateCliente,
} from '../api/clientes.service';

// Query Keys
export const clientesKeys = {
  all: ['clientes'] as const,
  lists: () => [...clientesKeys.all, 'list'] as const,
  list: (params?: ClientesQueryParams) => [...clientesKeys.lists(), params] as const,
  details: () => [...clientesKeys.all, 'detail'] as const,
  detail: (id: number) => [...clientesKeys.details(), id] as const,
};

/**
 * Hook para obtener lista de clientes
 */
export function useClientes(params?: ClientesQueryParams) {
  return useQuery({
    queryKey: clientesKeys.list(params),
    queryFn: () => getClientes(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un cliente por ID
 */
export function useCliente(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientesKeys.detail(id),
    queryFn: () => getCliente(id),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? id > 0,
  });
}

/**
 * Hook para crear cliente
 */
export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClienteDto) => createCliente(data),
    onSuccess: () => {
      // Invalidar lista de clientes
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

/**
 * Hook para actualizar cliente
 */
export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClienteDto }) =>
      updateCliente(id, data),
    onSuccess: (_, { id }) => {
      // Invalidar lista y detalle
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientesKeys.detail(id) });
    },
  });
}

/**
 * Hook para eliminar cliente
 */
export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

/**
 * Hook para refrescar manualmente la lista de clientes
 */
export function useRefreshClientes() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: clientesKeys.all });
  };
}
