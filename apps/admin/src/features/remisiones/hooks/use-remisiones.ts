'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  cancelarRemision,
  createRemision,
  entregarRemision,
  getRemisionById,
  getRemisiones,
  type CreateRemisionPayload,
} from '../api/remisiones.service';

export const REMISIONES_KEYS = {
  all: ['remisiones'] as const,
};

export function useRemisiones(params?: {
  estado?: string;
  id_tecnico_receptor?: number;
  id_orden_servicio?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...REMISIONES_KEYS.all, params],
    queryFn: () => getRemisiones(params),
  });
}

export function useRemision(id: number | null) {
  return useQuery({
    queryKey: [...REMISIONES_KEYS.all, id],
    queryFn: () => getRemisionById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateRemision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRemisionPayload) => createRemision(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: REMISIONES_KEYS.all });
      qc.invalidateQueries({ queryKey: ['inventario'] });
      toast.success(res.message || 'Remisión creada exitosamente');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear remisión');
    },
  });
}

export function useEntregarRemision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => entregarRemision(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: REMISIONES_KEYS.all });
      toast.success(res.message || 'Entrega registrada');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al entregar remisión');
    },
  });
}

export function useCancelarRemision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo_cancelacion }: { id: number; motivo_cancelacion: string }) =>
      cancelarRemision(id, motivo_cancelacion),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: REMISIONES_KEYS.all });
      qc.invalidateQueries({ queryKey: ['inventario'] });
      toast.success(res.message || 'Remisión cancelada');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al cancelar remisión');
    },
  });
}
