/**
 * MEKANOS S.A.S - Portal Admin
 * Cliente API Base - Axios Configuration
 * 
 * ZERO TRUST: Esta es la ÚNICA forma de comunicación con el backend.
 * Todos los hooks y servicios DEBEN usar este cliente.
 * 
 * ARQUITECTURA: El token JWT se inyecta dinámicamente desde NextAuth.
 * La UI NUNCA debe saber sobre tokens - es responsabilidad de este módulo.
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
 * Interceptor de Request: Inyecta token JWT de NextAuth
 * 
 * SEGURIDAD INVISIBLE: Los componentes UI no saben de tokens.
 * Este interceptor obtiene el token dinámicamente en cada request.
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Solo en cliente (browser)
    if (typeof window !== 'undefined') {
      try {
        const session = await getSession();
        
        // Inyectar token si existe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accessToken = (session as any)?.accessToken;
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
