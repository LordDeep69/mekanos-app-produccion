/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Catálogos del Módulo de Órdenes
 * 
 * Endpoints consumidos:
 * - /tipos-servicio (Fase 3)
 * - /estados-orden (Fase 3)
 * - /clientes (Fase 1)
 * - /equipos (Fase 2)
 * - /empleados (Fase 1)
 * - /sedes-cliente (Fase 1)
 */

import { apiClient } from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TipoServicio {
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    descripcion?: string;
    categoria: string;
    tiene_checklist: boolean;
    duracion_estimada_horas?: number;
    color_hex?: string;
    icono?: string;
    activo: boolean;
}

export interface EstadoOrden {
    id_estado: number;
    codigo_estado: string;
    nombre_estado: string;
    descripcion?: string;
    permite_edicion: boolean;
    permite_eliminacion: boolean;
    es_estado_final: boolean;
    color_hex?: string;
    icono?: string;
    orden_visualizacion: number;
    activo: boolean;
}

export interface ClienteSelector {
    id_cliente: number;
    codigo_cliente?: string;
    persona?: {
        nombre_comercial?: string;
        razon_social?: string;
        numero_identificacion?: string;
    };
}

export interface SedeCliente {
    id_sede: number;
    nombre_sede: string;
    direccion?: string;
    ciudad?: string;
    es_principal: boolean;
}

export interface EquipoSelector {
    id_equipo: number;
    codigo_equipo: string;
    nombre_equipo?: string;
    marca?: string;
    modelo?: string;
    serie?: string;
    id_cliente?: number;
    id_sede?: number;
    id_tipo_equipo?: number;
    tipos_equipo?: {
        id_tipo_equipo: number;
        nombre_tipo?: string;
        codigo_tipo?: string;
    };
}

export interface TecnicoSelector {
    id_empleado: number;
    codigo_empleado?: string;
    cargo?: string;
    es_tecnico: boolean;
    persona?: {
        primer_nombre?: string;
        primer_apellido?: string;
        celular?: string;
    };
    certificaciones_tecnicas?: Array<{
        tipo_certificacion: string;
        fecha_vencimiento?: string;
    }>;
}

// Respuestas API
interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE SERVICIO
// ═══════════════════════════════════════════════════════════════════════════════

export const getTiposServicio = async (params?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
}): Promise<TipoServicio[]> => {
    const response = await apiClient.get<PaginatedResponse<TipoServicio>>('/tipos-servicio', {
        params: {
            activo: params?.activo,
            categoria: params?.categoria,
            tipoEquipoId: params?.tipoEquipoId
        }
    });
    return response.data.data || [];
};

export async function getTipoServicio(id: number): Promise<TipoServicio> {
    const response = await apiClient.get<ApiResponse<TipoServicio>>(
        `/tipos-servicio/${id}`
    );
    return response.data.data;
}

export async function createTipoServicio(data: Partial<TipoServicio>): Promise<TipoServicio> {
    const response = await apiClient.post<ApiResponse<TipoServicio>>(
        '/tipos-servicio',
        data
    );
    return response.data.data;
}

export async function updateTipoServicio(
    id: number,
    data: Partial<TipoServicio>
): Promise<TipoServicio> {
    const response = await apiClient.put<ApiResponse<TipoServicio>>(
        `/tipos-servicio/${id}`,
        data
    );
    return response.data.data;
}

export async function deleteTipoServicio(id: number): Promise<void> {
    await apiClient.delete(`/tipos-servicio/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADOS DE ORDEN
// ═══════════════════════════════════════════════════════════════════════════════

export async function getEstadosOrden(params?: {
    activo?: boolean;
    esEstadoFinal?: boolean;
}): Promise<EstadoOrden[]> {
    const queryParams = new URLSearchParams();
    if (params?.activo !== undefined) {
        queryParams.append('activo', String(params.activo));
    }
    if (params?.esEstadoFinal !== undefined) {
        queryParams.append('esEstadoFinal', String(params.esEstadoFinal));
    }

    const url = queryParams.toString()
        ? `/estados-orden?${queryParams.toString()}`
        : '/estados-orden';

    const response = await apiClient.get<PaginatedResponse<EstadoOrden>>(url);
    return response.data.data || [];
}

export async function getEstadoOrden(id: number): Promise<EstadoOrden> {
    const response = await apiClient.get<ApiResponse<EstadoOrden>>(
        `/estados-orden/${id}`
    );
    return response.data.data;
}

export async function createEstadoOrden(data: Partial<EstadoOrden>): Promise<EstadoOrden> {
    const response = await apiClient.post<ApiResponse<EstadoOrden>>(
        '/estados-orden',
        data
    );
    return response.data.data;
}

export async function updateEstadoOrden(
    id: number,
    data: Partial<EstadoOrden>
): Promise<EstadoOrden> {
    const response = await apiClient.put<ApiResponse<EstadoOrden>>(
        `/estados-orden/${id}`,
        data
    );
    return response.data.data;
}

export async function deleteEstadoOrden(id: number): Promise<void> {
    await apiClient.delete(`/estados-orden/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTES (Para selector en wizard)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ✅ OPTIMIZACIÓN 05-ENE-2026: Usar endpoint LIGERO /clientes/selector
 * Impacto: De ~2s a ~100ms en carga de selector de clientes
 */
export async function getClientesSelector(params?: {
    busqueda?: string;
    limit?: number;
}): Promise<ClienteSelector[]> {
    const queryParams = new URLSearchParams();
    if (params?.busqueda) {
        queryParams.append('q', params.busqueda);
    }
    if (params?.limit) {
        queryParams.append('limit', String(params.limit));
    }

    // ✅ OPTIMIZADO: Usar endpoint ligero /selector
    const response = await apiClient.get<{
        success: boolean; data: Array<{
            id_cliente: number;
            codigo_cliente?: string;
            nombre: string;
            nit?: string;
        }>
    }>(
        `/clientes/selector?${queryParams.toString()}`
    );

    // Transformar al formato esperado por la UI
    return (response.data.data || []).map(c => ({
        id_cliente: c.id_cliente,
        codigo_cliente: c.codigo_cliente,
        persona: {
            nombre_comercial: c.nombre,
            razon_social: c.nombre,
            numero_identificacion: c.nit,
        },
    }));
}

export async function getSedesCliente(clienteId: number): Promise<SedeCliente[]> {
    const response = await apiClient.get<PaginatedResponse<SedeCliente>>(
        `/sedes-cliente?id_cliente=${clienteId}`
    );
    return response.data.data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPOS (Para selector en wizard)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ✅ OPTIMIZACIÓN 05-ENE-2026: Usar endpoint LIGERO /equipos/selector
 * Impacto: De ~2s a ~100ms en carga de selector de equipos
 */
export async function getEquiposSelector(params?: {
    idCliente?: number;
    idSede?: number;
    busqueda?: string;
    limit?: number;
}): Promise<EquipoSelector[]> {
    const queryParams = new URLSearchParams();
    if (params?.idCliente) {
        queryParams.append('clienteId', String(params.idCliente));
    }
    if (params?.idSede) {
        queryParams.append('sedeId', String(params.idSede));
    }
    if (params?.busqueda) {
        queryParams.append('q', params.busqueda);
    }
    if (params?.limit) {
        queryParams.append('limit', String(params.limit));
    }

    // ✅ OPTIMIZADO: Usar endpoint ligero /selector
    const response = await apiClient.get<{
        success: boolean; data: Array<{
            id_equipo: number;
            codigo_equipo: string;
            nombre: string;
            serie?: string;
            tipo?: string;
        }>
    }>(
        `/equipos/selector?${queryParams.toString()}`
    );

    // Transformar al formato esperado por la UI
    return (response.data.data || []).map(e => ({
        id_equipo: e.id_equipo,
        codigo_equipo: e.codigo_equipo,
        nombre_equipo: e.nombre,
        serie: e.serie,
        tipos_equipo: e.tipo ? { id_tipo_equipo: 0, nombre_tipo: e.tipo } : undefined,
    }));
}

export async function getEquipo(id: number): Promise<EquipoSelector> {
    const response = await apiClient.get<ApiResponse<EquipoSelector>>(
        `/equipos/${id}`
    );
    return response.data.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TÉCNICOS/EMPLEADOS (Para selector en wizard)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTecnicosSelector(params?: {
    busqueda?: string;
    limit?: number;
}): Promise<TecnicoSelector[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('activo', 'true');
    queryParams.append('esTecnico', 'true');
    if (params?.busqueda) {
        queryParams.append('search', params.busqueda);
    }
    if (params?.limit) {
        queryParams.append('limit', String(params.limit));
    }

    const response = await apiClient.get<PaginatedResponse<TecnicoSelector>>(
        `/empleados?${queryParams.toString()}`
    );
    return response.data.data || [];
}

export interface Sistema {
    id_sistema: number;
    codigo_sistema: string;
    nombre_sistema: string;
    descripcion?: string;
    aplica_a: string[]; // Array de códigos tipos_equipo
    orden_visualizacion: number;
    icono?: string;
    color_hex?: string;
    activo: boolean;
}

export interface ParametroMedicion {
    id_parametro_medicion: number;
    codigo_parametro: string;
    nombre_parametro: string;
    descripcion?: string;
    unidad_medida: string;
    tipo_dato: 'NUMERICO' | 'TEXTO' | 'BOOLEANO';
    valor_minimo_normal?: number;
    valor_maximo_normal?: number;
    valor_minimo_critico?: number;
    valor_maximo_critico?: number;
    valor_ideal?: number;
    categoria: string;
    id_tipo_equipo?: number;
    es_critico_seguridad: boolean;
    es_obligatorio: boolean;
    decimales_precision: number;
    activo: boolean;
}

export interface ActividadCatalogo {
    id_actividad_catalogo: number;
    codigo_actividad: string;
    descripcion_actividad: string;
    id_tipo_servicio: number;
    id_sistema?: number;
    tipo_actividad: 'INSPECCION' | 'LIMPIEZA' | 'AJUSTE' | 'REEMPLAZO' | 'MEDICION' | 'PRUEBA';
    orden_ejecucion: number;
    es_obligatoria: boolean;
    tiempo_estimado_minutos?: number;
    id_parametro_medicion?: number;
    id_tipo_componente?: number;
    instrucciones?: string;
    precauciones?: string;
    activo: boolean;
    // Relaciones para UI
    tipos_servicio?: { nombre_tipo: string };
    catalogo_sistemas?: { nombre_sistema: string };
    parametros_medicion?: { nombre_parametro: string; unidad_medida: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SISTEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSistemas(params?: { activo?: boolean }): Promise<Sistema[]> {
    const queryParams = new URLSearchParams();
    if (params?.activo !== undefined) {
        queryParams.append('activo', String(params.activo));
    }
    const response = await apiClient.get<PaginatedResponse<Sistema>>(`/catalogo-sistemas?${queryParams.toString()}`);
    return response.data.data || [];
}

export async function createSistema(data: Partial<Sistema>): Promise<Sistema> {
    const response = await apiClient.post<ApiResponse<Sistema>>('/catalogo-sistemas', data);
    return response.data.data;
}

export async function updateSistema(id: number, data: Partial<Sistema>): Promise<Sistema> {
    const response = await apiClient.put<ApiResponse<Sistema>>(`/catalogo-sistemas/${id}`, data);
    return response.data.data;
}

export async function deleteSistema(id: number): Promise<void> {
    await apiClient.delete(`/catalogo-sistemas/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS DE MEDICIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export async function getParametrosMedicion(params?: { activo?: boolean; categoria?: string }): Promise<ParametroMedicion[]> {
    const queryParams = new URLSearchParams();
    if (params?.activo !== undefined) {
        queryParams.append('activo', String(params.activo));
    }
    if (params?.categoria) {
        queryParams.append('categoria', params.categoria);
    }
    const response = await apiClient.get<PaginatedResponse<ParametroMedicion>>(`/parametros-medicion?${queryParams.toString()}`);
    return response.data.data || [];
}

export async function createParametroMedicion(data: Partial<ParametroMedicion>): Promise<ParametroMedicion> {
    const response = await apiClient.post<ApiResponse<ParametroMedicion>>('/parametros-medicion', data);
    return response.data.data;
}

export async function updateParametroMedicion(id: number, data: Partial<ParametroMedicion>): Promise<ParametroMedicion> {
    const response = await apiClient.put<ApiResponse<ParametroMedicion>>(`/parametros-medicion/${id}`, data);
    return response.data.data;
}

export async function deleteParametroMedicion(id: number): Promise<void> {
    await apiClient.delete(`/parametros-medicion/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVIDADES (CHECKLIST)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getActividadesCatalogo(params?: {
    activo?: boolean;
    idTipoServicio?: number;
    idSistema?: number;
}): Promise<ActividadCatalogo[]> {
    const queryParams = new URLSearchParams();
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));
    if (params?.idTipoServicio) queryParams.append('idTipoServicio', String(params.idTipoServicio));
    if (params?.idSistema) queryParams.append('idSistema', String(params.idSistema));

    const response = await apiClient.get<PaginatedResponse<ActividadCatalogo>>(`/catalogo-actividades?${queryParams.toString()}`);
    return response.data.data || [];
}

export async function createActividadCatalogo(data: Partial<ActividadCatalogo>): Promise<ActividadCatalogo> {
    const response = await apiClient.post<ApiResponse<ActividadCatalogo>>('/catalogo-actividades', data);
    return response.data.data;
}

export async function updateActividadCatalogo(id: number, data: Partial<ActividadCatalogo>): Promise<ActividadCatalogo> {
    const response = await apiClient.put<ApiResponse<ActividadCatalogo>>(`/catalogo-actividades/${id}`, data);
    return response.data.data;
}

export async function deleteActividadCatalogo(id: number): Promise<void> {
    await apiClient.delete(`/catalogo-actividades/${id}`);
}

export interface CatalogoServicio {
    id_servicio: number;
    codigo_servicio: string;
    nombre_servicio: string;
    descripcion?: string;
    categoria: string;
    id_tipo_servicio?: number;
    id_tipo_equipo?: number;
    duracion_estimada_horas?: number;
    requiere_certificacion: boolean;
    tipo_certificacion_requerida?: string;
    precio_base?: number;
    incluye_repuestos: boolean;
    activo: boolean;
    observaciones?: string;
    // Relación
    tipos_servicio?: { nombre_tipo: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE SERVICIOS (COMERCIAL)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getServiciosComerciales(params?: { activo?: boolean; idTipoServicio?: number }): Promise<CatalogoServicio[]> {
    const queryParams = new URLSearchParams();
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));
    if (params?.idTipoServicio) queryParams.append('idTipoServicio', String(params.idTipoServicio));

    const response = await apiClient.get<PaginatedResponse<CatalogoServicio>>(`/catalogo-servicios?${queryParams.toString()}`);
    return response.data.data || [];
}

export async function createServicioComercial(data: Partial<CatalogoServicio>): Promise<CatalogoServicio> {
    const response = await apiClient.post<ApiResponse<CatalogoServicio>>('/catalogo-servicios', data);
    return response.data.data;
}

export async function updateServicioComercial(id: number, data: Partial<CatalogoServicio>): Promise<CatalogoServicio> {
    const response = await apiClient.put<ApiResponse<CatalogoServicio>>(`/catalogo-servicios/${id}`, data);
    return response.data.data;
}

export async function deleteServicioComercial(id: number): Promise<void> {
    await apiClient.delete(`/catalogo-servicios/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS (adicionales)
// ═══════════════════════════════════════════════════════════════════════════════

export function getTipoActividadColor(tipo: string): string {
    const colors: Record<string, string> = {
        INSPECCION: 'bg-blue-100 text-blue-800',
        LIMPIEZA: 'bg-green-100 text-green-800',
        AJUSTE: 'bg-amber-100 text-amber-800',
        REEMPLAZO: 'bg-purple-100 text-purple-800',
        MEDICION: 'bg-cyan-100 text-cyan-800',
        PRUEBA: 'bg-indigo-100 text-indigo-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
}

export function getClienteLabel(cliente: ClienteSelector): string {
    if (!cliente.persona) return `Cliente ${cliente.id_cliente}`;
    return cliente.persona.nombre_comercial ||
        cliente.persona.razon_social ||
        `Cliente ${cliente.id_cliente}`;
}

export function getEquipoLabel(equipo: EquipoSelector): string {
    const parts = [equipo.codigo_equipo];
    if (equipo.nombre_equipo) parts.push(equipo.nombre_equipo);
    if (equipo.marca) parts.push(`(${equipo.marca})`);
    return parts.join(' - ');
}

export function getTecnicoLabel(tecnico: TecnicoSelector): string {
    if (!tecnico.persona) return `Técnico ${tecnico.id_empleado}`;
    const nombre = `${tecnico.persona.primer_nombre || ''} ${tecnico.persona.primer_apellido || ''}`.trim();
    return nombre || `Técnico ${tecnico.id_empleado}`;
}

export function getCategoriaServicioLabel(categoria: string): string {
    const labels: Record<string, string> = {
        PREVENTIVO: 'Preventivo',
        CORRECTIVO: 'Correctivo',
        PREDICTIVO: 'Predictivo',
        EMERGENCIA: 'Emergencia',
        INSTALACION: 'Instalación',
        RETIRO: 'Retiro',
        INSPECCION: 'Inspección',
        DIAGNOSTICO: 'Diagnóstico',
        ESPECIALIZADO: 'Especializado',
    };
    return labels[categoria] || categoria;
}

export function getCategoriaServicioColor(categoria: string): string {
    const colors: Record<string, string> = {
        PREVENTIVO: 'bg-blue-100 text-blue-800',
        CORRECTIVO: 'bg-orange-100 text-orange-800',
        PREDICTIVO: 'bg-purple-100 text-purple-800',
        EMERGENCIA: 'bg-red-100 text-red-800',
        INSTALACION: 'bg-green-100 text-green-800',
        RETIRO: 'bg-gray-100 text-gray-800',
        INSPECCION: 'bg-cyan-100 text-cyan-800',
        DIAGNOSTICO: 'bg-indigo-100 text-indigo-800',
        ESPECIALIZADO: 'bg-amber-100 text-amber-800',
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800';
}
