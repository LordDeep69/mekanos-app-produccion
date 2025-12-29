/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MEKANOS S.A.S - Portal Admin
 * Configuración NextAuth.js v5
 * 
 * ZERO TRUST: Esta configuración conecta con el backend NestJS
 * El JWT del backend se persiste en el token de NextAuth
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Tipos para la respuesta del backend
interface BackendLoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    nombre: string;
    rol: string;
    idEmpleado?: number;
  };
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Refresca el access token usando el refresh token
 */
async function refreshAccessToken(token: any): Promise<any> {
  try {
    console.log('[NextAuth] Refrescando access token...');
    
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('RefreshTokenError');
    }

    const refreshedTokens = await response.json();
    
    console.log('[NextAuth] Token refrescado exitosamente');

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + 3 * 60 * 60 * 1000, // 3 horas
    };
  } catch (error) {
    console.error('[NextAuth] Error refrescando token:', error);
    return {
      ...token,
      error: 'RefreshTokenError',
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[NextAuth] Intentando login con:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('[NextAuth] Credenciales incompletas');
          return null;
        }

        try {
          // Llamar al endpoint de login del backend NestJS
          const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            console.log('[NextAuth] Login fallido:', response.status);
            return null;
          }

          const data: BackendLoginResponse = await response.json();
          console.log('[NextAuth] Login exitoso para:', data.user.email);

          // Retornar usuario con tokens - NextAuth espera un objeto User
          return {
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.nombre,
            // Propiedades custom que irán al JWT callback
            nombre: data.user.nombre,
            rol: data.user.rol,
            idEmpleado: data.user.idEmpleado,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          } as any;
        } catch (error) {
          console.error('[NextAuth] Error en authorize:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * JWT Callback: Se ejecuta al crear/actualizar el token
     * CRÍTICO: Aquí persistimos el access_token del backend
     */
    async jwt({ token, user }) {
      // Login inicial: guardar tokens del backend
      if (user) {
        console.log('[NextAuth] JWT callback - Login inicial');
        const customUser = user as any;
        return {
          ...token,
          id: customUser.id,
          nombre: customUser.nombre,
          rol: customUser.rol,
          idEmpleado: customUser.idEmpleado,
          accessToken: customUser.accessToken,
          refreshToken: customUser.refreshToken,
          accessTokenExpires: Date.now() + 3 * 60 * 60 * 1000, // 3 horas
        };
      }

      // Token aún válido
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Token expirado, intentar refresh
      console.log('[NextAuth] Token expirado, refrescando...');
      return refreshAccessToken(token);
    },

    /**
     * Session Callback: Expone datos al cliente
     * CRÍTICO: Aquí exponemos el accessToken para que Axios lo use
     */
    async session({ session, token }) {
      // Construir session con datos custom
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          nombre: token.nombre as string,
          rol: token.rol as string,
          idEmpleado: token.idEmpleado as number | undefined,
        },
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 días
  },
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
});
