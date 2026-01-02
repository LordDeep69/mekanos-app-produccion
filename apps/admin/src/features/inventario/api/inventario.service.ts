/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Inventario
 *
 * Backend endpoints:
 * - GET/POST /catalogo-componentes
 * - GET/POST /movimientos-inventario
 * - GET /movimientos-inventario/stock/:id
 * - GET /movimientos-inventario/kardex/:id
 */

import { apiClient } from '@/lib/api/client';
import type {
    Componente,
    ComponentesQueryParams,
    ComponentesResponse,
    CreateComponenteDto,
    KardexComponente,
    MovimientoInventario,
    MovimientosQueryParams,
    MovimientosResponse,
    RegistrarMovimientoDto,
    RegistrarTrasladoDto,
    StockComponente,
} from '@/types/inventario';

const COMPONENTES_BASE = '/catalogo-componentes';
const MOVIMIENTOS_BASE = '/movimientos-inventario';

// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtener lista de componentes con filtros
 */
export async function getComponentes(
    params?: ComponentesQueryParams
): Promise<ComponentesResponse> {
    const queryParams = new URLSearchParams();

    if (params?.id_tipo_componente !== undefined) {
        queryParams.append('id_tipo_componente', String(params.id_tipo_componente));
    }
    if (params?.marca) {
        queryParams.append('marca', params.marca);
    }
    if (params?.tipo_comercial) {
        queryParams.append('tipo_comercial', params.tipo_comercial);
    }
    if (params?.activo !== undefined) {
        queryParams.append('activo', String(params.activo));
    }
    if (params?.skip !== undefined) {
        queryParams.append('skip', String(params.skip));
    }
    if (params?.limit !== undefined) {
        queryParams.append('limit', String(params.limit));
    }

    const url = queryParams.toString()
        ? `${COMPONENTES_BASE}?${queryParams.toString()}`
        : COMPONENTES_BASE;

    const response = await apiClient.get<ComponentesResponse | Componente[]>(url);

    // Normalizar respuesta
    if (Array.isArray(response.data)) {
        return {
            data: response.data,
            total: response.data.length,
        };
    }

    return response.data;
}

/**
 * Obtener un componente por ID
 */
export async function getComponente(id: number): Promise<Componente> {
    const response = await apiClient.get<Componente>(`${COMPONENTES_BASE}/${id}`);
    return response.data;
}

/**
 * Crear nuevo componente
 */
export async function createComponente(data: CreateComponenteDto): Promise<Componente> {
    const response = await apiClient.post<Componente>(COMPONENTES_BASE, data);
    return response.data;
}

/**
 * Actualizar componente
 */
export async function updateComponente(
    id: number,
    data: Partial<CreateComponenteDto>
): Promise<Componente> {
    const response = await apiClient.put<Componente>(`${COMPONENTES_BASE}/${id}`, data);
    return response.data;
}

/**
 * Desactivar componente (soft delete)
 */
export async function deleteComponente(id: number): Promise<void> {
    await apiClient.delete(`${COMPONENTES_BASE}/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtener movimientos de inventario
 */
export async function getMovimientos(
    params?: MovimientosQueryParams
): Promise<MovimientosResponse> {
    const queryParams = new URLSearchParams();

    if (params?.id_componente !== undefined) {
        queryParams.append('id_componente', String(params.id_componente));
    }
    if (params?.tipo_movimiento) {
        queryParams.append('tipo_movimiento', params.tipo_movimiento);
    }
    if (params?.fecha_desde) {
        queryParams.append('fecha_desde', params.fecha_desde);
    }
    if (params?.fecha_hasta) {
        queryParams.append('fecha_hasta', params.fecha_hasta);
    }
    if (params?.id_orden_servicio !== undefined) {
        queryParams.append('id_orden_servicio', String(params.id_orden_servicio));
    }
    if (params?.page !== undefined) {
        queryParams.append('page', String(params.page));
    }
    if (params?.limit !== undefined) {
        queryParams.append('limit', String(params.limit));
    }

    const url = queryParams.toString()
        ? `${MOVIMIENTOS_BASE}?${queryParams.toString()}`
        : MOVIMIENTOS_BASE;

    const response = await apiClient.get<MovimientosResponse>(url);
    return response.data;
}

/**
 * Registrar movimiento de inventario
 */
export async function registrarMovimiento(
    data: RegistrarMovimientoDto
): Promise<{ success: boolean; message: string; data: MovimientoInventario }> {
    const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: MovimientoInventario;
    }>(MOVIMIENTOS_BASE, data);
    return response.data;
}

/**
 * Registrar traslado entre ubicaciones
 */
export async function registrarTraslado(
    data: RegistrarTrasladoDto
): Promise<{ success: boolean; message: string; data: unknown }> {
    const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: unknown;
    }>(`${MOVIMIENTOS_BASE}/traslado`, data);
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK Y KARDEX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtener stock actual de un componente
 */
export async function getStockComponente(idComponente: number): Promise<StockComponente> {
    const response = await apiClient.get<{ success: boolean; data: StockComponente }>(
        `${MOVIMIENTOS_BASE}/stock/${idComponente}`
    );
    return response.data.data;
}

/**
 * Obtener kardex de un componente
 */
export async function getKardex(
    idComponente: number,
    params?: {
        fecha_desde?: string;
        fecha_hasta?: string;
        tipo_movimiento?: string;
    }
): Promise<KardexComponente> {
    const queryParams = new URLSearchParams();

    if (params?.fecha_desde) {
        queryParams.append('fecha_desde', params.fecha_desde);
    }
    if (params?.fecha_hasta) {
        queryParams.append('fecha_hasta', params.fecha_hasta);
    }
    if (params?.tipo_movimiento) {
        queryParams.append('tipo_movimiento', params.tipo_movimiento);
    }

    const url = queryParams.toString()
        ? `${MOVIMIENTOS_BASE}/kardex/${idComponente}?${queryParams.toString()}`
        : `${MOVIMIENTOS_BASE}/kardex/${idComponente}`;

    const response = await apiClient.get<{ success: boolean; data: KardexComponente }>(url);
    return response.data.data;
}
