'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createContrato,
  createCronograma,
  createEquipoContrato,
  deleteEquipoContrato,
  getContratos,
  getCronogramas,
  getEquiposContrato,
  updateContrato,
  updateCronograma,
  type CreateContratoPayload,
  type CreateCronogramaPayload,
  type CreateEquipoContratoPayload,
  type UpdateCronogramaPayload,
} from '../api/contratos.service';

export const CONTRATOS_KEYS = {
  contratos: ['contratos-mantenimiento'] as const,
  equiposContrato: ['equipos-contrato'] as const,
  cronogramas: ['cronogramas-servicio'] as const,
};

export function useContratos(page = 1, limit = 100) {
  return useQuery({
    queryKey: [...CONTRATOS_KEYS.contratos, page, limit],
    queryFn: () => getContratos(page, limit),
  });
}

export function useEquiposContrato(page = 1, limit = 200) {
  return useQuery({
    queryKey: [...CONTRATOS_KEYS.equiposContrato, page, limit],
    queryFn: () => getEquiposContrato(page, limit),
  });
}

export function useCronogramas(page = 1, limit = 200) {
  return useQuery({
    queryKey: [...CONTRATOS_KEYS.cronogramas, page, limit],
    queryFn: () => getCronogramas(page, limit),
  });
}

export function useCreateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContratoPayload) => createContrato(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRATOS_KEYS.contratos });
      toast.success('Contrato de mantenimiento creado');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear contrato');
    },
  });
}

export function useUpdateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateContratoPayload> }) =>
      updateContrato(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRATOS_KEYS.contratos });
      toast.success('Contrato actualizado');
    },
  });
}

export function useVincularEquipoContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEquipoContratoPayload) => createEquipoContrato(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRATOS_KEYS.equiposContrato });
      toast.success('Equipo vinculado al contrato');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al vincular equipo');
    },
  });
}

export function useDesvincularEquipoContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEquipoContrato(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRATOS_KEYS.equiposContrato });
      toast.success('Equipo desvinculado del contrato');
    },
  });
}

export function useCreateCronograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCronogramaPayload) => createCronograma(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRATOS_KEYS.cronogramas });
      toast.success('Hito de cronograma programado');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear cronograma');
    },
  });
}

export function useUpdateCronograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCronogramaPayload }) =>
      updateCronograma(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTRATOS_KEYS.cronogramas });
      toast.success('Cronograma actualizado');
    },
  });
}
