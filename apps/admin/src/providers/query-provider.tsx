'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * TanStack Query Provider - ENTERPRISE EDITION
 * 
 * Configuración optimizada con:
 * - Estrategias de cache por tipo de dato
 * - Prefetching inteligente
 * - Cache persistente (localStorage)
 * - Monitoreo de rendimiento
 */

import { DataCacheService, getCacheStrategy } from '@/lib/cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useEffect, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════════

const MINUTES = 60 * 1000;

/**
 * Crea el QueryClient con configuración enterprise
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Defaults optimizados - se sobrescriben por query key
        staleTime: 5 * MINUTES,
        gcTime: 15 * MINUTES,

        // Reintentos inteligentes
        retry: (failureCount, error) => {
          // No reintentar en errores 4xx (client errors)
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number } };
            const status = axiosError.response?.status;
            if (status && status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch deshabilitado por defecto - se activa por estrategia
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,

        // Network mode: siempre intentar (mejor UX offline)
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },

    // Configuración global del cache
    queryCache: undefined, // Usar default
    mutationCache: undefined, // Usar default
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient());

  // Inicializar DataCacheService cuando el cliente esté listo
  useEffect(() => {
    DataCacheService.initialize(queryClient);

    // Log de stats en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const logStats = () => {
        const stats = DataCacheService.getCacheStats();
        console.log('[QueryProvider] 📊 Cache Stats:', stats);
      };

      // Log stats cada 30 segundos en desarrollo
      const interval = setInterval(logStats, 30000);
      return () => clearInterval(interval);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES EXPORTADAS
// ═══════════════════════════════════════════════════════════════════════════════

export { getCacheStrategy };
