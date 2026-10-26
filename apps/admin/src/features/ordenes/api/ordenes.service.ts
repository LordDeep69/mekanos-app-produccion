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
    ProgresoRegistroDetallado,
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
    // ENTERPRISE: Nuevos parámetros de ordenamiento y filtrado
    if (params?.sortBy) {
        queryParams.append('sortBy', params.sortBy);
    }
    if (params?.sortOrder) {
        queryParams.append('sortOrder', params.sortOrder);
    }
    if (params?.tipoServicioId !== undefined) {
        queryParams.append('tipoServicioId', String(params.tipoServicioId));
    }
    if (params?.fechaDesde) {
        queryParams.append('fechaDesde', params.fechaDesde);
    }
    if (params?.fechaHasta) {
        queryParams.append('fechaHasta', params.fechaHasta);
    }
    if (params?.busqueda) {
        queryParams.append('busqueda', params.busqueda);
    }
    if (params?.idServicio !== undefined) {
        queryParams.append('idServicio', String(params.idServicio));
    }
    if (params?.servicioTexto) {
        queryParams.append('servicioTexto', params.servicioTexto);
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
        id_equipo: data.equipoId,           // Equipo principal
        equipos_ids: data.equiposIds,       // MULTI-EQUIPOS: Array de IDs
        id_tipo_servicio: data.tipoServicioId,
        servicios_ids: data.serviciosIds,   // SERVICIOS CORRECTIVOS ESPECÍFICOS
        razon_falla: data.razonFalla,
        id_sede_cliente: data.sedeClienteId,
        descripcion_inicial: data.descripcion,
        prioridad: data.prioridad || 'NORMAL',
        fecha_programada: data.fechaProgramada,
        id_tecnico_asignado: data.tecnicoId,
        id_orden_padre: data.idOrdenPadre,
        tipo_visita: data.tipoVisita,
        ids_pendientes_a_resolver: data.idsPendientesAResolver,
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

/**
 * DTO para actualizar orden
 */
export interface UpdateOrdenDto {
    id_sede?: number;
    id_tipo_servicio?: number;
    fecha_programada?: string;      // YYYY-MM-DD
    hora_programada?: string;       // HH:mm
    prioridad?: 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA';
    origen_solicitud?: 'PROGRAMADO' | 'CLIENTE' | 'INTERNO' | 'EMERGENCIA' | 'GARANTIA';
    descripcion_inicial?: string;
    trabajo_realizado?: string;
    observaciones_tecnico?: string;
    observaciones?: string;         // Observaciones generales
    observaciones_cierre?: string;  // Observaciones de cierre
    requiere_firma_cliente?: boolean;
    id_tecnico_asignado?: number | null;   // ✅ Cambiar o desasignar técnico
}

/**
 * Actualizar orden de servicio
 * Solo se puede editar si el estado NO es final (APROBADA, CANCELADA)
 */
export async function updateOrden(
    id: number,
    data: UpdateOrdenDto
): Promise<{ success: boolean; message: string; data: Orden }> {
    const response = await apiClient.put<{ success: boolean; message: string; data: Orden }>(
        `${ORDENES_BASE}/${id}`,
        data
    );
    return response.data;
}

/**
 * Actualizar SOLO observaciones de cierre (endpoint atómico)
 * Permite edición incluso en órdenes COMPLETADAS
 * Diseñado para Portal Admin
 */
export async function updateObservacionesCierre(
    id: number,
    observaciones_cierre: string
): Promise<{ success: boolean; message: string; data: { id_orden_servicio: number; observaciones_cierre: string } }> {
    const response = await apiClient.patch<{ success: boolean; message: string; data: { id_orden_servicio: number; observaciones_cierre: string } }>(
        `${ORDENES_BASE}/${id}/observaciones-cierre`,
        { observaciones_cierre }
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
 * ✅ 24-FEB-2026: Obtener mediciones completas (registradas + parámetros sin medir)
 */
export async function getMedicionesCompletasOrden(idOrden: number): Promise<{ success: boolean; data: any[]; parametros_sin_medir: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: any[]; parametros_sin_medir: any[] }>(
        `${ORDENES_BASE}/${idOrden}/mediciones-completas`
    );
    return response.data;
}

/**
 * ✅ 24-FEB-2026: Crear una nueva medición desde el portal admin
 */
export async function createMedicionOrden(idOrden: number, data: {
    id_parametro_medicion: number;
    valor_numerico?: number;
    valor_texto?: string;
    observaciones?: string;
}): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post<{ success: boolean; data: any }>(
        `${ORDENES_BASE}/${idOrden}/mediciones`,
        data
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

/**
 * ✅ 25-FEB-2026: Actualizar/crear firma de una orden
 * ✅ 20-AGO-2026: Edición PARCIAL — firma_base64 ahora opcional para poder
 * guardar SOLO el nombre y/o cargo del firmante sin redibujar la firma.
 */
export interface UpdateFirmaOrdenDto {
    firma_base64?: string;
    nombre_firmante?: string;
    cargo_firmante?: string;
}

export async function updateFirmaOrden(
    idOrden: number,
    tipo: 'TECNICO' | 'CLIENTE',
    data: UpdateFirmaOrdenDto
): Promise<{ success: boolean; message: string; data: any }> {
    const response = await apiClient.put(
        `${ORDENES_BASE}/${idOrden}/firmas/${tipo}`,
        data
    );
    return response.data;
}

/**
 * ✅ 06-AGO-2026: Historial de firmas del técnico de una orden
 * (agrupado por hash: incluye la firma estándar más usada)
 */
export interface FirmaHistorialTecnico {
    id_firma_digital: number;
    firma_base64: string;
    veces_usada: number;
    fecha_captura?: string;
    es_estandar: boolean;
}

export async function getFirmasHistorialTecnico(
    idOrden: number
): Promise<{ success: boolean; data: FirmaHistorialTecnico[] }> {
    const response = await apiClient.get(
        `${ORDENES_BASE}/${idOrden}/firmas-historial-tecnico`
    );
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVIDADES EJECUTADAS - EDICIÓN AVANZADA
// ═══════════════════════════════════════════════════════════════════════════════

export type EstadoActividad = 'B' | 'R' | 'M' | 'I' | 'C' | 'LI' | 'A' | 'L' | null;

export interface UpdateActividadDto {
    estado?: EstadoActividad;
    observaciones?: string | null;
    ejecutada?: boolean;
}

/**
 * Actualizar actividad ejecutada (estado, observaciones, ejecutada)
 */
export async function updateActividad(
    idActividad: number,
    data: UpdateActividadDto
): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put<{ success: boolean; message: string }>(
        `/actividades-ejecutadas/${idActividad}`,
        data
    );
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICIONES - EDICIÓN AVANZADA
// ═══════════════════════════════════════════════════════════════════════════════

export interface UpdateMedicionDto {
    valorNumerico?: number;
    valorTexto?: string;
    observaciones?: string | null;
    // FIX 04-MAY-2026: Excluir/incluir medición del PDF
    excluidoPdf?: boolean;
}

export interface MedicionResponse {
    idMedicion: number;
    idOrdenServicio: number;
    idParametroMedicion: number;
    valorNumerico?: number;
    valorTexto?: string;
    unidadMedida?: string;
    fueraDeRango?: boolean;
    nivelAlerta?: string;
    mensajeAlerta?: string;
    observaciones?: string;
    excluidoPdf?: boolean;
    parametrosMedicion?: {
        nombreParametro?: string;
        codigoParametro?: string;
        valorMinimo?: number;
        valorMaximo?: number;
        valorCriticoMinimo?: number;
        valorCriticoMaximo?: number;
    };
}

/**
 * Actualizar medición (valor numérico, texto, observaciones)
 * El backend recalcula automáticamente fueraDeRango y nivelAlerta
 */
export async function updateMedicion(
    idMedicion: number,
    data: UpdateMedicionDto
): Promise<MedicionResponse> {
    const response = await apiClient.put<MedicionResponse>(
        `/mediciones-servicio/${idMedicion}`,
        data
    );
    return response.data;
}

// ========================================================================
// GESTIÓN DE INFORMES PDF
// ========================================================================

export interface RegenerarPdfDto {
    emailDestino?: string;
    enviarEmail?: boolean;
    asuntoEmail?: string;
    mensajeEmail?: string;
    guardarEnR2?: boolean;
    forzarRegeneracion?: boolean; // ✅ Forzar regeneración aunque exista PDF
}

export interface RegenerarPdfResponse {
    success: boolean;
    message: string;
    pdfUrl?: string;
    idDocumento?: number;
    emailEnviado?: boolean;
    filename?: string;
    pdfBase64?: string;
}

/**
 * Regenerar PDF de una orden y opcionalmente enviarlo por email
 */
export async function regenerarPdf(
    idOrden: number,
    data: RegenerarPdfDto
): Promise<RegenerarPdfResponse> {
    const response = await apiClient.post<RegenerarPdfResponse>(
        `${ORDENES_BASE}/${idOrden}/pdf/regenerar`,
        data
    );
    return response.data;
}

/**
 * Archivo adjunto adicional
 */
export interface ArchivoAdjunto {
    filename: string;
    contentBase64: string;
    contentType?: string;
}

/**
 * Enviar PDF existente por email
 */
export interface EnviarPdfExistenteDto {
    emailDestino: string;
    asuntoEmail?: string;
    mensajeEmail?: string;
    emailsCc?: string[];
    archivosAdicionales?: ArchivoAdjunto[];
}

export interface EnviarPdfExistenteResponse {
    success: boolean;
    message: string;
    usoPdfExistente: boolean;
    urlPdf?: string;
    error?: string;
}

export async function enviarPdfExistente(
    idOrden: number,
    data: EnviarPdfExistenteDto
): Promise<EnviarPdfExistenteResponse> {
    const response = await apiClient.post<EnviarPdfExistenteResponse>(
        `${ORDENES_BASE}/${idOrden}/pdf/enviar`,
        data
    );
    return response.data;
}

// ========================================================================
// HORARIOS DE SERVICIO (Hora Entrada / Hora Salida)
// ========================================================================

export interface UpdateHorariosServicioDto {
    fecha_inicio_real?: string;  // ISO 8601 DateTime string
    fecha_fin_real?: string;     // ISO 8601 DateTime string
    // ✅ FIX 20-AGO-2026: Permite guardar duraciones > 24h tras confirmar "Estoy seguro"
    forzarDuracion?: boolean;
}

export interface UpdateHorariosServicioResponse {
    success: boolean;
    message: string;
    data: {
        id_orden_servicio: number;
        fecha_inicio_real: string | null;
        fecha_fin_real: string | null;
        duracion_minutos: number | null;
    };
}

/**
 * Actualizar horarios de servicio (hora entrada/salida)
 * Endpoint atómico - permite edición incluso en órdenes COMPLETADAS
 * Recalcula duracion_minutos automáticamente
 */
export async function updateHorariosServicio(
    id: number,
    data: UpdateHorariosServicioDto
): Promise<UpdateHorariosServicioResponse> {
    const response = await apiClient.patch<UpdateHorariosServicioResponse>(
        `${ORDENES_BASE}/${id}/horarios-servicio`,
        data
    );
    return response.data;
}

// ========================================================================
// AUTORIZACIÓN DE EDICIÓN TÉCNICA (19-OCT-2026)
// ========================================================================

export interface UpdateEdicionTecnicoDto {
    habilitada: boolean;
    motivo?: string;
}

export interface UpdateEdicionTecnicoResponse {
    success: boolean;
    message: string;
    data: {
        id_orden_servicio: number;
        edicion_tecnico_habilitada: boolean;
        edicion_tecnico_autorizada_por?: number | null;
        edicion_tecnico_fecha_autorizacion?: string | null;
        edicion_tecnico_motivo?: string | null;
    };
}

/**
 * Habilita o revoca la edición de una orden COMPLETADA desde la app móvil.
 * Endpoint dedicado PATCH /ordenes/:id/edicion-tecnico (solo administradores).
 */
export async function updateEdicionTecnico(
    id: number,
    data: UpdateEdicionTecnicoDto
): Promise<UpdateEdicionTecnicoResponse> {
    const response = await apiClient.patch<UpdateEdicionTecnicoResponse>(
        `${ORDENES_BASE}/${id}/edicion-tecnico`,
        data
    );
    return response.data;
}

// ========================================================================
// HISTORIAL DE EMAILS ENVIADOS
// ========================================================================

export interface HistorialEmailEnviado {
    id_historial_email: number;
    id_orden_servicio: number;
    destinatario_to: string;
    destinatarios_cc: string | null;
    asunto: string;
    estado_envio: 'EXITOSO' | 'FALLIDO';
    mensaje_error: string | null;
    message_id: string | null;
    url_pdf_enviado: string | null;
    origen_envio: string;
    fecha_envio: string;
    enviado_por: number | null;
}

export interface HistorialEmailsResponse {
    success: boolean;
    historial: HistorialEmailEnviado[];
    total: number;
}

/**
 * Obtener historial de emails enviados de una orden
 * FIX 18-FEB-2026
 */
export async function getHistorialEmails(
    idOrden: number
): Promise<HistorialEmailsResponse> {
    const url = `${ORDENES_BASE}/${idOrden}/emails/historial`;
    console.log(`📧 [API] Llamando a: ${url}`);
    try {
        const response = await apiClient.get<HistorialEmailsResponse>(url);
        console.log(`✅ [API] Respuesta historial:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`❌ [API] Error en getHistorialEmails:`, error?.response?.status, error?.response?.data || error?.message);
        throw error;
    }
}

/**
 * ✅ 26-FEB-2026: Eliminar orden de servicio (HARD DELETE)
 * Elimina permanentemente la orden y TODOS sus datos asociados
 */
export async function deleteOrden(
    id: number
): Promise<{ success: boolean; message: string; data: { id_orden_servicio: number; numero_orden: string } }> {
    const response = await apiClient.delete<{ success: boolean; message: string; data: { id_orden_servicio: number; numero_orden: string } }>(
        `${ORDENES_BASE}/${id}`
    );
    return response.data;
}

/**
 * ✅ FIX 13-MAR-2026: Transferir datos completos de una orden a otra
 * Copia todos los datos (actividades, evidencias, mediciones, firmas, componentes, etc.)
 */
export async function transferirDatosOrden(
    idOrdenDestino: number,
    idOrdenOrigen: number
): Promise<{
    success: boolean;
    message: string;
    ordenOrigen: { id: number; numero: string };
    ordenDestino: { id: number; numero: string };
    estadisticas: {
        camposDirectos: boolean;
        ordenesEquipos: number;
        actividadesEjecutadas: number;
        evidenciasFotograficas: number;
        medicionesServicio: number;
        componentesUsados: number;
        ordenesActividadesPlan: number;
    };
}> {
    const response = await apiClient.post(
        `${ORDENES_BASE}/${idOrdenDestino}/transferir-datos`,
        { idOrdenOrigen }
    );
    return response.data;
}

/**
 * Obtener URL del PDF de una orden (para previsualización)
 */
export function getPdfUrl(idOrden: number): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${baseUrl}${ORDENES_BASE}/${idOrden}/pdf`;
}

/**
 * ✅ 25-SEP-2026: FEATURE LECTURA EN TIEMPO REAL (ESTILO SYTEX)
 * Obtiene métricas y desglose de avance de registro en vivo
 */
export async function getProgresoRegistro(idOrden: number): Promise<ProgresoRegistroDetallado> {
    const response = await apiClient.get<ProgresoRegistroDetallado>(
        `${ORDENES_BASE}/${idOrden}/progreso-registro`
    );
    return response.data;
}

/**
 * ✅ 25-SEP-2026: FEATURE LECTURA EN TIEMPO REAL (ESTILO SYTEX)
 * Envía latido/heartbeat de telemetría a la orden
 */
export async function sendHeartbeat(
    idOrden: number,
    data: {
        actividad_actual?: string;
        bateria?: number;
        latitud?: number;
        longitud?: number;
        observacion?: string;
    }
): Promise<{ success: boolean; timestamp: string }> {
    const response = await apiClient.post<{ success: boolean; timestamp: string }>(
        `${ORDENES_BASE}/${idOrden}/heartbeat`,
        data
    );
    return response.data;
}


// ========================================================================
// REPUESTOS & INSUMOS UTILIZADOS (INTEGRACIÓN BIDIRECCIONAL WMS ⇄ OS)
// ========================================================================

export interface ComponenteUsadoOrden {
    id_componente_usado: number;
    id_orden_servicio: number;
    id_componente: number | null;
    sku: string;
    referencia_fabricante: string | null;
    descripcion: string;
    marca: string | null;
    cantidad: number;
    unidad: string;
    costo_unitario: number;
    costo_total: number;
    origen_componente: 'BODEGA' | 'COMPRA_DIRECTA' | 'CLIENTE' | 'GARANTIA';
    id_ubicacion: number | null;
    bodega_codigo: string | null;
    bodega_nombre: string | null;
    id_lote: number | null;
    codigo_lote: string | null;
    fecha_vencimiento_lote: string | null;
    id_movimiento_inventario: number | null;
    fecha_uso: string | null;
    observaciones: string | null;
    registrado_por_nombre: string;
}

export interface ResumenComponentesOrden {
    total_items: number;
    unidades_totales: number;
    costo_total_bodega: number;
    costo_total_compra_directa: number;
    costo_total_general: number;
}

export interface ComponentesOrdenResponse {
    success: boolean;
    data: ComponenteUsadoOrden[];
    resumen: ResumenComponentesOrden;
}

export interface DespacharComponenteOrdenDto {
    origen_componente?: 'BODEGA' | 'COMPRA_DIRECTA' | 'CLIENTE' | 'GARANTIA';
    id_componente?: number;
    id_ubicacion?: number;
    id_lote?: number;
    descripcion?: string;
    referencia_manual?: string;
    marca_manual?: string;
    cantidad: number;
    unidad?: string;
    costo_unitario?: number;
    observaciones?: string;
    realizado_por?: number;
}

export async function getComponentesOrden(idOrden: number): Promise<ComponentesOrdenResponse> {
    const numId = Number(idOrden);
    if (!numId || isNaN(numId) || numId <= 0) {
        return {
            success: true,
            data: [],
            resumen: {
                total_items: 0,
                unidades_totales: 0,
                costo_total_bodega: 0,
                costo_total_compra_directa: 0,
                costo_total_general: 0,
            },
        };
    }
    const response = await apiClient.get<ComponentesOrdenResponse>(
        `${ORDENES_BASE}/${numId}/componentes`
    );
    return response.data;
}

export async function addComponenteOrden(
    idOrden: number,
    data: DespacharComponenteOrdenDto
): Promise<{ success: boolean; mensaje: string; data?: any }> {
    const response = await apiClient.post<{ success: boolean; mensaje: string; data?: any }>(
        `${ORDENES_BASE}/${idOrden}/componentes`,
        data
    );
    return response.data;
}

export async function removeComponenteOrden(
    idOrden: number,
    idUso: number,
    motivo?: string
): Promise<{ success: boolean; mensaje: string; reintegrado_bodega?: boolean }> {
    const response = await apiClient.delete<{ success: boolean; mensaje: string; reintegrado_bodega?: boolean }>(
        `${ORDENES_BASE}/${idOrden}/componentes/${idUso}`,
        { params: motivo ? { motivo } : undefined }
    );
    return response.data;
}


// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR CENTRAL DE PENDIENTES 360° (CLIENTE / EQUIPO / SERVICIO)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getBacklogPendientes(params: {
    idCliente?: number;
    idEquipo?: number;
    idEquipos?: number[];
    idOrdenServicio?: number;
    idOrdenResolucion?: number;
    alcance?: string;
    estado?: string;
}) {
    const queryParams = new URLSearchParams();
    if (params.idCliente) queryParams.append('idCliente', String(params.idCliente));
    if (params.idEquipo) queryParams.append('idEquipo', String(params.idEquipo));
    if (params.idEquipos && params.idEquipos.length > 0) {
        queryParams.append('idEquipos', params.idEquipos.join(','));
    }
    if (params.idOrdenServicio) queryParams.append('idOrdenServicio', String(params.idOrdenServicio));
    if (params.idOrdenResolucion) queryParams.append('idOrdenResolucion', String(params.idOrdenResolucion));
    if (params.alcance) queryParams.append('alcance', params.alcance);
    if (params.estado) queryParams.append('estado', params.estado);

    const response = await apiClient.get<{
        success: boolean;
        data: any[];
        resumen: {
            total: number;
            pendientes: number;
            en_gestion: number;
            resueltos: number;
            por_alcance: { EQUIPO: number; CLIENTE: number; SERVICIO: number };
        };
    }>(`${ORDENES_BASE}/backlog-pendientes?${queryParams.toString()}`);
    return response.data;
}

export async function createPendienteDirecto(data: {
    idCliente?: number;
    idEquipo?: number | null;
    idOrdenServicio?: number | null;
    alcance?: 'CLIENTE' | 'EQUIPO' | 'SERVICIO';
    descripcion: string;
    idPendienteCatalogo?: number;
    prioridad?: 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA';
    observaciones?: string;
}) {
    const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
    }>(`${ORDENES_BASE}/pendientes-directos`, data);
    return response.data;
}
