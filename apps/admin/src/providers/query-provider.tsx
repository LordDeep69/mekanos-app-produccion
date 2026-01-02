'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * TanStack Query Provider
 * 
 * Configuración global de React Query
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tiempo que los datos se consideran frescos
            staleTime: 5 * 60 * 1000, // 5 minutos
            // Tiempo que los datos permanecen en cache
            gcTime: 10 * 60 * 1000, // 10 minutos
            // Reintentos en caso de error
            retry: (failureCount, error) => {
              // No reintentar en errores 4xx
              if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                const status = axiosError.response?.status;
                if (status && status >= 400 && status < 500) {
                  return false;
                }
              }
              return failureCount < 2;
            },
            // Refetch al volver a la ventana
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
