/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para Bitácoras
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  enviarBitacora,
  getBitacoraHistorial,
  getBitacoraPreview,
  getMesesDisponibles,
  type EnviarBitacoraRequest,
} from '../api/bitacoras.service';

// Query Keys
export const bitacorasKeys = {
  all: ['bitacoras'] as const,
  preview: (idCliente: number, mes: number, anio: number, categoria?: string) =>
    [...bitacorasKeys.all, 'preview', idCliente, mes, anio, categoria] as const,
  historial: (idCliente: number) =>
    [...bitacorasKeys.all, 'historial', idCliente] as const,
  mesesDisponibles: (idCliente: number, categoria?: string) =>
    [...bitacorasKeys.all, 'meses-disponibles', idCliente, categoria] as const,
};

/**
 * Hook para obtener preview de informes agrupados por sede
 */
export function useBitacoraPreview(
  idCliente: number,
  mes: number,
  anio: number,
  categoria?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bitacorasKeys.preview(idCliente, mes, anio, categoria),
    queryFn: () => getBitacoraPreview(idCliente, mes, anio, categoria),
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? (idCliente > 0 && mes > 0 && anio > 0),
  });
}

/**
 * Hook para enviar bitácora (mutation)
 */
export function useEnviarBitacora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: EnviarBitacoraRequest) => enviarBitacora(dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: bitacorasKeys.historial(variables.id_cliente_principal),
      });
    },
  });
}

/**
 * Hook para obtener historial de bitácoras de un cliente
 */
export function useBitacoraHistorial(idCliente: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bitacorasKeys.historial(idCliente),
    queryFn: () => getBitacoraHistorial(idCliente),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? idCliente > 0,
  });
}

/**
 * Hook para obtener meses con informes disponibles
 */
export function useMesesDisponibles(idCliente: number, categoria?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bitacorasKeys.mesesDisponibles(idCliente, categoria),
    queryFn: () => getMesesDisponibles(idCliente, categoria),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? idCliente > 0,
  });
}
