/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks React Query para Integración Relacional de Marcas y Fabricantes OEM
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comprasService } from '@/lib/api/compras.service';
import { CreateMarcaPayload, Marca } from '@/types/compras.types';

export function useMarcasEam(search?: string, limit = 150) {
  return useQuery<Marca[]>({
    queryKey: ['marcas', search?.trim() || '', limit],
    queryFn: () => comprasService.getMarcas(search?.trim(), limit),
    staleTime: 60_000,
  });
}

export function useCrearMarcaEam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMarcaPayload) => comprasService.createMarca(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] });
    },
  });
}
