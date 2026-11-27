'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Devuelve `false` durante SSR y en el primer pase de hidratación de React,
 * y `true` inmediatamente después de que el cliente se hidrata.
 * Evita Hydration Mismatch con IDs dinámicos de Radix UI sin activar
 * advertencias de `react-hooks/set-state-in-effect` en React 19.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
