/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Clientes
 *
 * Backend: @Controller('clientes') en clientes.controller.ts
 */

import { apiClient } from '@/lib/api/client';
import type {
    Cliente,
    ClienteConPersona,
    ClientesQueryParams,
    ClientesResponse,
    CreateClienteDto,
    UpdateClienteDto,
} from '@/types/clientes';

const CLIENTES_BASE = '/clientes';

/**
 * Obtener lista de clientes con filtros y paginación
 */
export async function getClientes(
  params?: ClientesQueryParams
): Promise<ClientesResponse> {
  const queryParams = new URLSearchParams();

  if (params?.tipo_cliente) {
    queryParams.append('tipo_cliente', params.tipo_cliente);
  }
  if (params?.cliente_activo !== undefined) {
    queryParams.append('cliente_activo', String(params.cliente_activo));
  }
  if (params?.skip !== undefined) {
    queryParams.append('skip', String(params.skip));
  }
  if (params?.take !== undefined) {
    queryParams.append('take', String(params.take));
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }

  const url = queryParams.toString()
    ? `${CLIENTES_BASE}?${queryParams.toString()}`
    : CLIENTES_BASE;

  const response = await apiClient.get<ClientesResponse | ClienteConPersona[]>(url);
  
  // Normalizar respuesta (puede venir array o objeto paginado)
  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      total: response.data.length,
    };
  }
  
  return response.data;
}

/**
 * Obtener un cliente por ID
 */
export async function getCliente(id: number): Promise<ClienteConPersona> {
  const response = await apiClient.get<ClienteConPersona>(`${CLIENTES_BASE}/${id}`);
  return response.data;
}

/**
 * Crear nuevo cliente
 */
export async function createCliente(data: CreateClienteDto): Promise<Cliente> {
  const response = await apiClient.post<Cliente>(CLIENTES_BASE, data);
  return response.data;
}

/**
 * Actualizar cliente existente
 */
export async function updateCliente(
  id: number,
  data: UpdateClienteDto
): Promise<Cliente> {
  const response = await apiClient.put<Cliente>(`${CLIENTES_BASE}/${id}`, data);
  return response.data;
}

/**
 * Eliminar cliente
 */
export async function deleteCliente(id: number): Promise<void> {
  await apiClient.delete(`${CLIENTES_BASE}/${id}`);
}
