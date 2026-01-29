/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Firmas Administrativas
 *
 * Backend: @Controller('firmas-administrativas')
 */

import { apiClient } from '@/lib/api/client';
import type {
    CreateFirmaAdministrativaDto,
    FirmaAdministrativaConPersona,
    FirmasAdministrativasQueryParams,
    FirmasAdministrativasResponse,
    UpdateFirmaAdministrativaDto,
} from '@/types/firmas-administrativas';

const BASE_URL = '/firmas-administrativas';

/**
 * Obtener lista de firmas administrativas con filtros
 */
export async function getFirmasAdministrativas(
    params?: FirmasAdministrativasQueryParams
): Promise<FirmasAdministrativasResponse> {
    const queryParams = new URLSearchParams();

    if (params?.firma_activa !== undefined) {
        queryParams.append('firma_activa', String(params.firma_activa));
    }
    if (params?.skip !== undefined) {
        queryParams.append('skip', String(params.skip));
    }
    if (params?.take !== undefined) {
        queryParams.append('take', String(params.take));
    }
    if (params?.includeClientes) {
        queryParams.append('includeClientes', 'true');
    }

    const url = queryParams.toString()
        ? `${BASE_URL}?${queryParams.toString()}`
        : BASE_URL;

    const response = await apiClient.get<FirmaAdministrativaConPersona[]>(url);

    // Normalizar respuesta
    if (Array.isArray(response.data)) {
        return {
            data: response.data,
            total: response.data.length,
        };
    }

    return response.data as unknown as FirmasAdministrativasResponse;
}

/**
 * Obtener una firma administrativa por ID
 */
export async function getFirmaAdministrativa(
    id: number
): Promise<FirmaAdministrativaConPersona> {
    const response = await apiClient.get<FirmaAdministrativaConPersona>(
        `${BASE_URL}/${id}`
    );
    return response.data;
}

/**
 * Crear nueva firma administrativa
 */
export async function createFirmaAdministrativa(
    data: CreateFirmaAdministrativaDto
): Promise<FirmaAdministrativaConPersona> {
    const response = await apiClient.post<FirmaAdministrativaConPersona>(
        BASE_URL,
        data
    );
    return response.data;
}

/**
 * Actualizar firma administrativa existente
 */
export async function updateFirmaAdministrativa(
    id: number,
    data: UpdateFirmaAdministrativaDto
): Promise<FirmaAdministrativaConPersona> {
    const response = await apiClient.put<FirmaAdministrativaConPersona>(
        `${BASE_URL}/${id}`,
        data
    );
    return response.data;
}

/**
 * Eliminar (soft delete) firma administrativa
 */
export async function deleteFirmaAdministrativa(id: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${id}`);
}
