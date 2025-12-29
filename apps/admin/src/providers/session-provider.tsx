/**
 * MEKANOS S.A.S - Portal Admin
 * Session Provider para NextAuth.js
 * 
 * Este componente provee el contexto de sesión a toda la aplicación
 */

'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

interface Props {
  children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60}>
      {children}
    </NextAuthSessionProvider>
  );
}
