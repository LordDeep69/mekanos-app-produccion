/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para Agenda Enterprise
 */

export type NivelUrgencia = 'CRITICA' | 'ALTA' | 'MEDIA' | 'NORMAL';
export type EstadoCronograma = 'PENDIENTE' | 'PROGRAMADA' | 'COMPLETADA' | 'VENCIDA' | 'CANCELADA';
export type Prioridad = 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAJA';

export interface ServicioProgramado {
    id_cronograma: number;
    fecha_prevista: string;
    fecha_inicio_ventana: string | null;
    fecha_fin_ventana: string | null;
    estado_cronograma: EstadoCronograma;
    prioridad: Prioridad;
    dias_restantes: number;
    nivel_urgencia: NivelUrgencia;

    cliente: {
        id: number;
        nombre: string;
        codigo: string;
    };
    equipo: {
        id: number;
        codigo: string;
        nombre_tipo: string;
        sede?: string;
        zona?: string;
    };
    tipo_servicio: {
        id: number;
        nombre: string;
        codigo: string;
    };
    contrato: {
        id: number;
        codigo: string;
    };
    tecnico_asignado?: {
        id: number;
        nombre: string;
    };
    orden_servicio?: {
        id: number;
        numero: string;
        estado: string;
    };
}

export interface AgendaMetricas {
    total_programados: number;
    servicios_hoy: number;
    servicios_semana: number;
    servicios_mes: number;
    vencidos: number;
    proximos_vencer: number;
    por_prioridad: {
        urgente: number;
        alta: number;
        normal: number;
        baja: number;
    };
    por_estado: {
        pendiente: number;
        programada: number;
        completada: number;
        vencida: number;
        cancelada: number;
    };
}

export interface CargaTecnico {
    id_tecnico: number;
    nombre: string;
    zona: string;
    servicios_hoy: number;
    servicios_semana: number;
    servicios_mes: number;
    carga_porcentaje: number;
}

export interface AgendaFilters {
    fechaDesde?: string;
    fechaHasta?: string;
    clienteId?: number;
    tecnicoId?: number;
    tipoServicioId?: number;
    estado?: EstadoCronograma;
    prioridad?: Prioridad;
    zonaGeografica?: string;
}

export interface CalendarioResponse {
    fechaDesde: string;
    fechaHasta: string;
    calendario: Record<string, ServicioProgramado[]>;
    totalDias: number;
    totalServicios: number;
}

export interface ServiciosResponse {
    data: ServicioProgramado[];
    total: number;
    meta?: {
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// Vista activa de la agenda
export type AgendaView = 'hoy' | 'semana' | 'mes' | 'calendario' | 'lista';
