'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Root Providers
 * 
 * Combina todos los providers de la aplicación
 */

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { SessionProvider } from './session-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </SessionProvider>
  );
}
