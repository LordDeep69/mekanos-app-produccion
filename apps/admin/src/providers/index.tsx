'use client';

/**
 * Portal Admin White-Label — Root Providers
 * Combina Session, Query, Branding reactivo, Toast y ErrorBoundary
 */

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { ReactNode } from 'react';
import { BrandingProvider } from './branding-provider';
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
          <BrandingProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </BrandingProvider>
        </QueryProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
