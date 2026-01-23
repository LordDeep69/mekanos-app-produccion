/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Dashboard
 *
 * Centraliza todas las llamadas al backend relacionadas con el Dashboard.
 * Cada función es independiente para permitir carga resiliente.
 */

import { apiClient } from '@/lib/api/client';
import type {
  DashboardAlertas,
  DashboardComercial,
  DashboardCompleto,
  DashboardOrdenes,
  DashboardProductividad,
} from '@/types/dashboard';

const DASHBOARD_BASE = '/dashboard';

/**
 * Obtiene el dashboard completo en una sola llamada
 * NOTA: Puede fallar si hay problemas con alguna query interna
 */
export async function getDashboardCompleto(
  mes?: number,
  anio?: number
): Promise<DashboardCompleto> {
  const params = new URLSearchParams();
  if (mes) params.append('mes', mes.toString());
  if (anio) params.append('anio', anio.toString());

  const url = params.toString()
    ? `${DASHBOARD_BASE}?${params.toString()}`
    : DASHBOARD_BASE;

  const response = await apiClient.get<DashboardCompleto>(url);
  return response.data;
}

/**
 * Obtiene métricas de alertas (más estable)
 */
export async function getDashboardAlertas(): Promise<DashboardAlertas> {
  const response = await apiClient.get<DashboardAlertas>(
    `${DASHBOARD_BASE}/alertas`
  );
  return response.data;
}

/**
 * Obtiene métricas de órdenes de servicio
 */
export async function getDashboardOrdenes(): Promise<DashboardOrdenes> {
  const response = await apiClient.get<DashboardOrdenes>(
    `${DASHBOARD_BASE}/ordenes`
  );
  return response.data;
}

/**
 * Obtiene métricas comerciales
 */
export async function getDashboardComercial(): Promise<DashboardComercial> {
  const response = await apiClient.get<DashboardComercial>(
    `${DASHBOARD_BASE}/comercial`
  );
  return response.data;
}

/**
 * Obtiene productividad de técnicos
 */
export async function getDashboardProductividad(
  mes?: number,
  anio?: number
): Promise<DashboardProductividad> {
  const params = new URLSearchParams();
  if (mes) params.append('mes', mes.toString());
  if (anio) params.append('anio', anio.toString());

  const url = params.toString()
    ? `${DASHBOARD_BASE}/productividad?${params.toString()}`
    : `${DASHBOARD_BASE}/productividad`;

  const response = await apiClient.get<DashboardProductividad>(url);
  return response.data;
}

/**
 * Interfaz transformada para órdenes recientes (UI)
 */
export interface OrdenRecienteUI {
  id: number;
  numeroOrden: string;
  cliente: string;
  estado: string;
  estadoCodigo: string;
  fecha: string;
}

/**
 * Obtiene órdenes recientes para la tabla
 * Usa el endpoint de órdenes con paginación
 * Backend expone: @Controller('ordenes') en ordenes.controller.ts
 * 
 * ENTERPRISE: Ordena por fecha_creacion DESC para mostrar las más recientes primero
 * MAPEO: Transforma la respuesta cruda del backend a la estructura UI
 */
export async function getOrdenesRecientes(limit = 5): Promise<OrdenRecienteUI[]> {
  const response = await apiClient.get('/ordenes', {
    params: {
      limit,
      page: 1,
      sortBy: 'fecha_creacion',  // ENTERPRISE: Ordenar por fecha de creación
      sortOrder: 'desc',         // Más recientes primero
    },
  });

  // Backend devuelve: { success, data: [...], pagination }
  const rawData = response.data?.data || response.data || [];

  // Transformar al formato que espera la UI
  return rawData.map((orden: {
    id_orden_servicio?: number;
    numero_orden?: string;
    clientes?: { persona?: { razon_social?: string; nombre_completo?: string } };
    estados_orden?: { nombre_estado?: string; codigo_estado?: string };
    fecha_programada?: string;
    fecha_creacion?: string;
  }, index: number) => ({
    id: orden.id_orden_servicio || index + 1,
    numeroOrden: orden.numero_orden || `#${orden.id_orden_servicio}`,
    cliente: orden.clientes?.persona?.razon_social
      || orden.clientes?.persona?.nombre_completo
      || 'Cliente sin nombre',
    estado: orden.estados_orden?.nombre_estado || 'Pendiente',
    estadoCodigo: orden.estados_orden?.codigo_estado || 'PENDIENTE',
    fecha: orden.fecha_programada || orden.fecha_creacion || '',
  }));
}
