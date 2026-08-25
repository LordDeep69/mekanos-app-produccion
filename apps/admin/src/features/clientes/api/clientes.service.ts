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
  UpdateClienteDto
} from '@/types/clientes';

const CLIENTES_BASE = '/clientes';

/**
 * Respuesta real del backend con paginación
 */
interface BackendClientesResponse {
  success: boolean;
  data: ClienteConPersona[];
  pagination: {
    total: number;
    skip: number;
    take: number;
    totalPages: number;
  };
}

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

  const response = await apiClient.get<BackendClientesResponse | ClienteConPersona[]>(url);

  // Normalizar respuesta del backend
  // Caso 1: Respuesta paginada { success, data, pagination }
  if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
    const backendResponse = response.data as BackendClientesResponse;
    return {
      data: backendResponse.data,
      total: backendResponse.pagination.total,
    };
  }

  // Caso 2: Respuesta con data y total directos { data, total }
  if (response.data && typeof response.data === 'object' && 'data' in response.data && 'total' in response.data) {
    return response.data as ClientesResponse;
  }

  // Caso 3: Array directo (fallback)
  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      total: response.data.length,
    };
  }

  // Fallback seguro
  return {
    data: [],
    total: 0,
  };
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

// ═══════════════════════════════════════════════════════════════════════════════
// TRAZABILIDAD 360° DE SERVICIOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrazabilidadItem {
  id_orden_servicio: number;
  numero_orden: string;
  fecha_programada?: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  fecha_creacion?: string;
  prioridad: string;
  descripcion_inicial?: string;
  observaciones_tecnico?: string;
  observaciones_cierre?: string;
  trabajo_realizado?: string;
  diagnostico_tecnico?: string;
  clientes?: {
    id_cliente: number;
    nombre_sede?: string;
    persona?: {
      nombre_comercial?: string;
      razon_social?: string;
      nombre_completo?: string;
    };
  };
  estados_orden?: {
    id_estado: number;
    codigo_estado: string;
    nombre_estado: string;
    color_hex?: string;
  };
  tipos_servicio?: {
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    categoria: string;
    icono?: string;
  };
  empleados_ordenes_servicio_id_tecnico_asignadoToempleados?: {
    id_empleado: number;
    persona?: {
      nombre_completo?: string;
      primer_nombre?: string;
      segundo_nombre?: string;
      primer_apellido?: string;
      segundo_apellido?: string;
      razon_social?: string;
    };
  };
  equipos?: {
    id_equipo: number;
    codigo_equipo: string;
    nombre_equipo?: string;
    tipos_equipo?: {
      id_tipo_equipo: number;
      codigo_tipo: string;
      nombre_tipo: string;
    };
    horas_actuales?: number;
    ubicacion_texto?: string;
  };
  ordenes_equipos?: Array<{
    id_equipo: number;
    orden_secuencia: number;
    equipos: {
      id_equipo: number;
      codigo_equipo: string;
      nombre_equipo?: string;
      tipo?: string;
      tipos_equipo?: {
        id_tipo_equipo: number;
        codigo_tipo: string;
        nombre_tipo: string;
      };
      horas_actuales?: number;
      ubicacion_texto?: string;
    };
  }>;
  detalle_servicios_orden?: Array<{
    id_detalle_servicio: number;
    cantidad: number;
    estado_servicio: string;
    precio_unitario: number;
    catalogo_servicios: {
      id_servicio: number;
      codigo_servicio: string;
      nombre_servicio: string;
      categoria: string;
      duracion_estimada_horas?: number;
    };
  }>;
  informes?: Array<{
    id_informe: number;
    numero_informe: string;
    fecha_generacion: string;
    documentos_generados?: {
      id_documento: number;
      ruta_archivo?: string;
      url_documento?: string;
      tipo_documento: string;
    } | Array<{
      id_documento: number;
      ruta_archivo?: string;
      url_documento?: string;
      tipo_documento: string;
    }>;
  }>;
}

export interface TrazabilidadClienteResponse {
  cliente: {
    id_cliente: number;
    nombre: string;
    es_principal: boolean;
  };
  total_ordenes: number;
  ordenes: TrazabilidadItem[];
}

export async function getTrazabilidadCliente(
  id: number,
  params?: {
    idEquipo?: number;
    categoria?: string;
    idSede?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
  }
): Promise<TrazabilidadClienteResponse> {
  const queryParams = new URLSearchParams();
  if (params?.idEquipo) queryParams.append('idEquipo', String(params.idEquipo));
  if (params?.categoria) queryParams.append('categoria', params.categoria);
  if (params?.idSede) queryParams.append('idSede', String(params.idSede));
  if (params?.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
  if (params?.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
  if (params?.search) queryParams.append('search', params.search);

  const url = `${CLIENTES_BASE}/${id}/trazabilidad-servicios?${queryParams.toString()}`;
  const response = await apiClient.get<{ success: boolean; data: TrazabilidadClienteResponse }>(url);
  return response.data.data;
}

/**
 * ✅ MULTI-SEDE: Obtener clientes principales para selector "Es Sede de"
 * Retorna datos completos para auto-fill del formulario
 */
export async function getClientesPrincipales(
  search?: string
): Promise<ClientePrincipalSelector[]> {
  const params = search ? `?q=${encodeURIComponent(search)}` : '';
  const response = await apiClient.get<{ success: boolean; data: ClientePrincipalSelector[] }>(
    `${CLIENTES_BASE}/principales${params}`
  );
  return response.data?.data ?? response.data as any;
}

/**
 * ✅ Obtiene el Blob del Informe Ejecutivo PDF de Trazabilidad aplicando filtros de la tabla
 */
export async function getTrazabilidadPdfBlob(
  id: number,
  params?: {
    idEquipo?: number;
    categoria?: string;
    idSede?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
    preview?: boolean;
  }
): Promise<{ blob: Blob; filename: string }> {
  const queryParams = new URLSearchParams();
  if (params?.idEquipo) queryParams.append('idEquipo', String(params.idEquipo));
  if (params?.categoria) queryParams.append('categoria', params.categoria);
  if (params?.idSede) queryParams.append('idSede', String(params.idSede));
  if (params?.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
  if (params?.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.preview) queryParams.append('preview', 'true');

  const url = `${CLIENTES_BASE}/${id}/trazabilidad-pdf?${queryParams.toString()}`;
  const response = await apiClient.get(url, { responseType: 'blob' });

  let filename = 'INFORME_EJECUTIVO_TRAZABILIDAD.pdf';
  const disposition = response.headers?.['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const matches = disposition.match(/filename="?([^"]+)"?/);
    if (matches && matches[1]) {
      filename = matches[1];
    }
  }

  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: 'application/pdf' });

  return { blob, filename };
}

