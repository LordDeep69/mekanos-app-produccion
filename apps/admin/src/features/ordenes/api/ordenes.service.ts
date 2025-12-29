/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Órdenes de Servicio
 *
 * Backend: @Controller('ordenes') en ordenes.controller.ts
 */

import { apiClient } from '@/lib/api/client';
import type {
    CambiarEstadoDto,
    CreateOrdenDto,
    Orden,
    OrdenesQueryParams,
    OrdenesResponse,
} from '@/types/ordenes';

const ORDENES_BASE = '/ordenes';

/**
 * Obtener lista de órdenes con filtros y paginación
 */
export async function getOrdenes(
    params?: OrdenesQueryParams
): Promise<OrdenesResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) {
        queryParams.append('page', String(params.page));
    }
    if (params?.limit !== undefined) {
        queryParams.append('limit', String(params.limit));
    }
    if (params?.idCliente !== undefined) {
        queryParams.append('idCliente', String(params.idCliente));
    }
    if (params?.idEquipo !== undefined) {
        queryParams.append('idEquipo', String(params.idEquipo));
    }
    if (params?.idTecnico !== undefined) {
        queryParams.append('idTecnico', String(params.idTecnico));
    }
    if (params?.estado) {
        queryParams.append('estado', params.estado);
    }
    if (params?.prioridad) {
        queryParams.append('prioridad', params.prioridad);
    }

    const url = queryParams.toString()
        ? `${ORDENES_BASE}?${queryParams.toString()}`
        : ORDENES_BASE;

    const response = await apiClient.get<OrdenesResponse>(url);
    return response.data;
}

/**
 * Obtener una orden por ID
 */
export async function getOrden(id: number): Promise<{ success: boolean; data: Orden }> {
    const response = await apiClient.get<{ success: boolean; data: Orden }>(
        `${ORDENES_BASE}/${id}`
    );
    return response.data;
}

/**
 * Crear nueva orden de servicio
 * MULTI-EQUIPOS: El backend procesa equiposIds para crear registros en ordenes_equipos
 */
export async function createOrden(data: CreateOrdenDto): Promise<{ success: boolean; data: Orden }> {
    // Transformar datos para el backend
    const payload = {
        id_cliente: data.clienteId,
        id_equipo: data.equipoId,           // Equipo principal (legacy)
        equipos_ids: data.equiposIds,       // MULTI-EQUIPOS: Array de IDs
        id_tipo_servicio: data.tipoServicioId,
        id_sede_cliente: data.sedeClienteId,
        descripcion_inicial: data.descripcion,
        prioridad: data.prioridad || 'NORMAL',
        fecha_programada: data.fechaProgramada,
        id_tecnico_asignado: data.tecnicoId,
    };

    const response = await apiClient.post<{ success: boolean; data: Orden }>(
        ORDENES_BASE,
        payload
    );
    return response.data;
}

/**
 * Cambiar estado de una orden
 */
export async function cambiarEstadoOrden(
    id: number,
    data: CambiarEstadoDto
): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch<{ success: boolean; message: string }>(
        `${ORDENES_BASE}/${id}/estado`,
        data
    );
    return response.data;
}

/**
 * Asignar técnico a una orden
 */
export async function asignarTecnico(
    id: number,
    tecnicoId: number
): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put<{ success: boolean; message: string }>(
        `${ORDENES_BASE}/${id}/asignar`,
        { tecnicoId }
    );
    return response.data;
}

/**
 * Cancelar orden
 */
export async function cancelarOrden(
    id: number,
    motivo?: string
): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put<{ success: boolean; message: string }>(
        `${ORDENES_BASE}/${id}/cancelar`,
        { motivo }
    );
    return response.data;
}

export interface AddServicioDetalleDto {
    id_servicio: number;
    cantidad: number;
    precio_unitario?: number;
    descuento_porcentaje?: number;
    id_tecnico_ejecutor?: number;
    observaciones?: string;
}

/**
 * Obtener detalles de servicios de una orden
 */
export async function getServiciosOrden(idOrden: number): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `${ORDENES_BASE}/${idOrden}/servicios`
    );
    return response.data;
}

/**
 * Agregar servicio al detalle de la orden
 */
export async function addServicioOrden(idOrden: number, data: AddServicioDetalleDto): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
        `${ORDENES_BASE}/${idOrden}/servicios`,
        data
    );
    return response.data;
}

/**
 * Eliminar servicio del detalle de la orden
 */
export async function removeServicioOrden(idOrden: number, idDetalle: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
        `${ORDENES_BASE}/${idOrden}/servicios/${idDetalle}`
    );
    return response.data;
}

/**
 * Obtener actividades ejecutadas de una orden
 */
export async function getActividadesOrden(idOrden: number): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `${ORDENES_BASE}/${idOrden}/actividades`
    );
    return response.data;
}

/**
 * Obtener mediciones de una orden
 */
export async function getMedicionesOrden(idOrden: number): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `${ORDENES_BASE}/${idOrden}/mediciones`
    );
    return response.data;
}

/**
 * Obtener evidencias fotográficas de una orden
 */
export async function getEvidenciasOrden(idOrden: number): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `${ORDENES_BASE}/${idOrden}/evidencias`
    );
    return response.data;
}

/**
 * Obtener firmas de una orden
 */
export async function getFirmasOrden(idOrden: number): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `${ORDENES_BASE}/${idOrden}/firmas`
    );
    return response.data;
}
