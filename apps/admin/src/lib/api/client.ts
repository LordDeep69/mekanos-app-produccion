/**
 * MEKANOS S.A.S - Portal Admin
 * Cliente API Base - Axios Configuration
 * 
 * ZERO TRUST: Esta es la ÚNICA forma de comunicación con el backend.
 * Todos los hooks y servicios DEBEN usar este cliente.
 * 
 * ARQUITECTURA: El token JWT se inyecta dinámicamente desde NextAuth.
 * La UI NUNCA debe saber sobre tokens - es responsabilidad de este módulo.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 OPTIMIZACIÓN 05-ENE-2026: TOKEN CACHE
 * ═══════════════════════════════════════════════════════════════════════════
 * PROBLEMA: getSession() hacía una llamada async en CADA request HTTP
 * SOLUCIÓN: Cache del token en memoria con TTL de 5 minutos
 * IMPACTO: Reducción de ~200-500ms por request
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { getSession, signOut } from 'next-auth/react';

// Configuración base
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 30000; // 30 segundos

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 TOKEN CACHE ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutos en ms
let tokenFetchPromise: Promise<string | null> | null = null;

/**
 * Obtiene el token JWT con cache inteligente
 * - Si hay token en cache válido, lo retorna inmediatamente
 * - Si no hay cache, obtiene de getSession() y guarda en cache
 * - Previene múltiples llamadas simultáneas a getSession()
 */
async function getCachedAuthToken(): Promise<string | null> {
  // 1. Verificar cache válido
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // 2. Si ya hay una petición en curso, esperar a esa
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  // 3. Obtener nuevo token
  tokenFetchPromise = (async () => {
    try {
      const session = await getSession();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.accessToken;

      if (accessToken) {
        tokenCache = {
          token: accessToken,
          expiresAt: Date.now() + TOKEN_CACHE_TTL,
        };
        return accessToken;
      }
      return null;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

/**
 * Invalida el cache del token (llamar en logout o error 401)
 */
export function invalidateTokenCache(): void {
  tokenCache = null;
  tokenFetchPromise = null;
}

// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cliente Axios configurado para el backend NestJS
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Interceptor de Request: Inyecta token JWT con CACHE
 * 
 * ✅ OPTIMIZADO 05-ENE-2026: Usa cache de token en memoria
 * - Primera llamada: ~200ms (obtiene de getSession)
 * - Llamadas siguientes: ~0ms (usa cache)
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Solo en cliente (browser)
    if (typeof window !== 'undefined') {
      try {
        // ✅ OPTIMIZACIÓN: Usar cache de token
        const accessToken = await getCachedAuthToken();

        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } catch (error) {
        console.warn('[API] No se pudo obtener la sesión:', error);
      }
    }

    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const hasAuth = !!config.headers?.Authorization;
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.url} ${hasAuth ? '🔐' : '🔓'}`
      );
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Response: Manejo de errores PROACTIVO
 * 
 * SEGURIDAD PROACTIVA: Si recibe 401, cierra sesión inmediatamente.
 * No esperamos a que el usuario vea errores - actuamos.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          // Token expirado o inválido - ACCIÓN INMEDIATA
          console.error('[API] 401 No autorizado - Cerrando sesión');
          // ✅ OPTIMIZACIÓN: Invalidar cache del token
          invalidateTokenCache();
          if (typeof window !== 'undefined') {
            // Usar signOut de NextAuth para limpiar todo
            await signOut({ callbackUrl: '/login', redirect: true });
          }
          break;
        case 403:
          console.error('[API] 403 Acceso denegado - Sin permisos');
          break;
        case 404:
          console.error('[API] 404 Recurso no encontrado');
          break;
        case 409:
          // Conflicto - Duplicidad de datos
          console.warn('[API] 409 Conflicto - Dato duplicado');
          break;
        case 500:
          console.error('[API] 500 Error interno del servidor');
          break;
        default:
          console.error(`[API] Error HTTP ${status}`);
      }
    } else if (error.request) {
      console.error('[API] Error de red - Sin respuesta del servidor');
    }

    return Promise.reject(error);
  }
);

/**
 * Tipos de respuesta API estándar
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Helper para extraer datos de respuesta
 */
export function extractData<T>(response: { data: T }): T {
  return response.data;
}

export default apiClient;
