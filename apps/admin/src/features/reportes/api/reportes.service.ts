/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para el módulo de Reportes
 * 
 * Consume: GET /api/informes/reportes (con filtros)
 *          GET /api/informes/reportes/clientes (para dropdown)
 * 
 * ✅ REPORTES MODULE 10-FEB-2026
 */

import { apiClient } from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReporteItem {
    id_documento: number;
    id_informe: number | null;
    numero_informe: string;
    estado_informe: 'BORRADOR' | 'REVISADO' | 'APROBADO' | 'ENVIADO' | 'GENERADO';
    fecha_generacion: string;
    observaciones: string | null;
    documento: {
        id_documento: number;
        ruta_archivo: string;
        tipo_documento: string;
        numero_documento: string | null;
        tama_o_bytes: number;
        mime_type: string;
        fecha_generacion: string;
        hash_sha256: string;
    } | null;
    orden: {
        id_orden_servicio: number;
        numero_orden: string;
        fecha_programada: string | null;
        fecha_fin_real: string | null;
        prioridad: string | null;
    } | null;
    cliente: {
        id_cliente: number;
        nombre: string;
        nit: string;
        tipo_documento: string;
    };
    equipo: {
        id_equipo: number;
        codigo: string;
        nombre: string;
        numero_serie: string | null;
        tipo: string;
    } | null;
    tipo_servicio: {
        id: number;
        nombre: string;
        codigo: string;
    } | null;
    tecnico: {
        nombre: string;
    };
    sede: {
        nombre: string;
        ciudad: string | null;
    } | null;
}

export interface ReportesResponse {
    data: ReporteItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ClienteConInformes {
    id_cliente: number;
    nombre: string;
    nit: string;
}

export interface ReportesQueryParams {
    page?: number;
    limit?: number;
    clienteId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    tipoServicio?: number;
    estadoInforme?: string;
    busqueda?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene reportes/informes con datos enriquecidos (cliente, orden, equipo, técnico, PDF)
 */
export async function getReportes(params?: ReportesQueryParams): Promise<ReportesResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.clienteId) queryParams.append('clienteId', String(params.clienteId));
    if (params?.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
    if (params?.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
    if (params?.tipoServicio) queryParams.append('tipoServicio', String(params.tipoServicio));
    if (params?.estadoInforme) queryParams.append('estadoInforme', params.estadoInforme);
    if (params?.busqueda) queryParams.append('busqueda', params.busqueda);

    const qs = queryParams.toString();
    const url = `/informes/reportes${qs ? `?${qs}` : ''}`;

    const response = await apiClient.get<ReportesResponse>(url);
    return response.data;
}

/**
 * Obtiene lista de clientes únicos que tienen informes generados (para filtro dropdown)
 */
export async function getClientesConInformes(): Promise<ClienteConInformes[]> {
    const response = await apiClient.get<ClienteConInformes[]>('/informes/reportes/clientes');
    return response.data;
}
