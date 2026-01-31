'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Root Providers
 * 
 * Combina todos los providers de la aplicación
 * Incluye: Session, Query, Toast notifications, Error Boundary
 */

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { SessionProvider } from './session-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </QueryProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
