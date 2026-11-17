'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getConfiguracionEmpresa,
  type ConfiguracionEmpresa,
} from '../api/configuracion.service';

export const EMPRESA_CONFIG_QUERY_KEY = ['configuracion', 'empresa'] as const;

/**
 * Hook cacheado para consultar la configuración corporativa/fiscal completa
 * en rutas autenticadas (documentos, PDFs, órdenes de compra, protocolos).
 */
export function useConfiguracionEmpresa() {
  return useQuery<ConfiguracionEmpresa>({
    queryKey: EMPRESA_CONFIG_QUERY_KEY,
    queryFn: getConfiguracionEmpresa,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
