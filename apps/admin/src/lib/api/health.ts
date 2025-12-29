/**
 * MEKANOS S.A.S - Portal Admin
 * Health Check Service
 * 
 * SMOKE TEST: Verificación de conectividad con el backend
 */

import apiClient from './client';

export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
  version?: string;
  uptime?: number;
}

/**
 * Verifica el estado del backend
 * @returns Estado del servidor
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  const response = await apiClient.get<HealthCheckResponse>('/health');
  return response.data;
}

/**
 * Verifica que el backend esté accesible
 * @returns true si el backend responde correctamente
 */
export async function isBackendHealthy(): Promise<boolean> {
  try {
    const health = await checkHealth();
    return health.status === 'ok' || health.status === 'OK';
  } catch (error) {
    console.error('[HealthCheck] Backend no accesible:', error);
    return false;
  }
}
