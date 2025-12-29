/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para el módulo de Órdenes de Servicio
 * 
 * Backend: ordenes.controller.ts
 */

// Estado de orden
export interface EstadoOrden {
    id_estado: number;
    codigo_estado: string;
    nombre_estado: string;
    descripcion?: string;
    es_estado_final: boolean;
}

// Tipo de servicio
export interface TipoServicio {
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    descripcion?: string;
}

// Cliente básico
export interface ClienteOrden {
    id_cliente: number;
    persona?: {
        nombre_comercial?: string;
        razon_social?: string;
        numero_identificacion?: string;
    };
}

// Equipo básico
export interface EquipoOrden {
    id_equipo: number;
    codigo_equipo: string;
    nombre_equipo?: string;
}

// Técnico asignado
export interface TecnicoOrden {
    id_empleado: number;
    cargo?: string;
    persona?: {
        primer_nombre?: string;
        primer_apellido?: string;
    };
}

// Orden de servicio
export interface Orden {
    id_orden_servicio: number;
    numero_orden: string;
    descripcion?: string;
    prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA';
    fecha_programada?: string;
    fecha_inicio_real?: string;
    fecha_fin_real?: string;
    observaciones?: string;
    fecha_creacion?: string;
    fecha_modificacion?: string;

    // Totales financieros (cache del backend)
    total_servicios?: number;
    total_gastos?: number;
    total_componentes?: number;
    total_general?: number;

    // Relaciones
    estados_orden?: EstadoOrden;
    tipos_servicio?: TipoServicio;
    clientes?: ClienteOrden;
    equipos?: EquipoOrden; // Equipo principal (legacy)

    // MULTI-EQUIPOS
    ordenes_equipos?: Array<{
        id_orden_equipo: number;
        equipo: EquipoOrden;
        orden_secuencia: number;
    }>;

    empleados_ordenes_servicio_id_tecnico_asignadoToempleados?: TecnicoOrden;
    informes?: Array<{
        id_informe: number;
        url_pdf: string;
        fecha_generacion: string;
    }>;
}

// Respuesta paginada
export interface OrdenesResponse {
    success: boolean;
    message: string;
    data: Orden[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Parámetros de consulta
export interface OrdenesQueryParams {
    page?: number;
    limit?: number;
    idCliente?: number;
    idEquipo?: number;
    idTecnico?: number;
    estado?: string;
    prioridad?: string;
}

// DTO para crear orden - MULTI-EQUIPOS
export interface CreateOrdenDto {
    clienteId: number;
    tipoServicioId: number;
    // MULTI-EQUIPOS: equipoId para compatibilidad, equiposIds para múltiples
    equipoId: number;           // Equipo principal (legacy/compatibilidad)
    equiposIds?: number[];      // Array de IDs de equipos (MULTI-EQUIPOS)
    sedeClienteId?: number;
    descripcion?: string;
    prioridad?: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA';
    fechaProgramada?: string;
    tecnicoId?: number;         // Opcional: asignar técnico al crear
}

// DTO para cambiar estado
export interface CambiarEstadoDto {
    nuevoEstado: string;
    motivo?: string;
    observaciones?: string;
    tecnicoId?: number;
    aprobadorId?: number;
}

// Helpers
export function getClienteNombre(orden: Orden): string {
    if (!orden.clientes?.persona) return 'Sin cliente';
    return orden.clientes.persona.nombre_comercial ||
        orden.clientes.persona.razon_social ||
        'Sin nombre';
}

export function getTecnicoNombre(orden: Orden): string {
    const tecnico = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;
    if (!tecnico?.persona) return 'Sin asignar';
    return `${tecnico.persona.primer_nombre || ''} ${tecnico.persona.primer_apellido || ''}`.trim() || 'Sin nombre';
}

export function getTecnicoLabel(tecnico: TecnicoOrden): string {
    if (!tecnico?.persona) return 'Sin nombre';
    return `${tecnico.persona.primer_nombre || ''} ${tecnico.persona.primer_apellido || ''}`.trim() || 'Sin nombre';
}

export function getEstadoColor(estado?: string): string {
    const colores: Record<string, string> = {
        PROGRAMADA: 'bg-blue-100 text-blue-800',
        ASIGNADA: 'bg-indigo-100 text-indigo-800',
        EN_PROCESO: 'bg-yellow-100 text-yellow-800',
        EN_ESPERA_REPUESTO: 'bg-orange-100 text-orange-800',
        COMPLETADA: 'bg-green-100 text-green-800',
        APROBADA: 'bg-emerald-100 text-emerald-800',
        CANCELADA: 'bg-red-100 text-red-800',
    };
    return colores[estado || ''] || 'bg-gray-100 text-gray-800';
}

export function getPrioridadColor(prioridad?: string): string {
    const colores: Record<string, string> = {
        BAJA: 'bg-slate-100 text-slate-800',
        NORMAL: 'bg-blue-100 text-blue-800',
        ALTA: 'bg-orange-100 text-orange-800',
        URGENTE: 'bg-red-100 text-red-800',
        EMERGENCIA: 'bg-purple-100 text-purple-800',
    };
    return colores[prioridad || ''] || 'bg-gray-100 text-gray-800';
}
