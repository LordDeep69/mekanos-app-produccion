/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Bitácoras (módulo dentro de Clientes)
 *
 * Backend: @Controller('bitacoras') en bitacoras.controller.ts
 */

import { apiClient } from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface InformePreview {
  id_documento: number;
  numero_documento: string;
  id_orden_servicio: number;
  numero_orden: string;
  fecha_programada: string | null;
  fecha_servicio: string | null;
  equipo_nombre: string;
  equipo_serie: string | null;
  tipo_equipo: string;
  categoria_equipo: string;
  tipo_servicio: string | null;
  codigo_tipo_servicio: string | null;
  pdf_url: string;
  nombre_sugerido: string;
  nombre_sede: string | null;
  ciudad_sede: string | null;
}

export interface SedeGroup {
  id_cliente: number;
  nombre_sede: string;
  nombre_cliente: string;
  informes: InformePreview[];
  // ✅ FIX 03-MAR-2026: Emails destinatarios de esta sede
  emails_destinatarios?: string[];
}

export interface BitacoraPreviewResult {
  id_cliente_principal: number;
  nombre_cliente_principal: string;
  mes: number;
  anio: number;
  categoria_filtro: string;
  sedes: SedeGroup[];
  total_informes: number;
  total_con_pdf: number;
  total_sin_pdf: number;
  emails_destinatarios: string[];
  id_cuenta_email_remitente: number | null;
}

export interface EnviarBitacoraRequest {
  id_cliente_principal: number;
  mes: number;
  anio: number;
  categoria: string;
  documentos_ids: number[];
  nombres_pdf?: Record<number, string>;
  email_destino?: string;
  emails_cc?: string[];
  asunto_personalizado?: string;
  mensaje_personalizado?: string;
}

export interface EnviarBitacoraResponse {
  success: boolean;
  id_bitacora: number | null;
  informes_enviados: number;
  informes_fallidos: number;
  email_enviado: boolean;
  destinatarios: string[];
  error?: string;
}

export interface BitacoraHistorial {
  id_bitacora: number;
  numero_bitacora: string;
  mes: number;
  anio: number;
  estado_bitacora: string;
  cantidad_informes: number;
  enviada_cliente_fecha: string | null;
  metodo_envio: string | null;
  observaciones: string | null;
  bitacoras_informes: { id_informe: number }[];
}

// ═══════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════

const BITACORAS_BASE = '/bitacoras';

/**
 * Preview: Obtener informes agrupados por sede para un cliente principal
 */
export async function getBitacoraPreview(
  idCliente: number,
  mes: number,
  anio: number,
  categoria?: string,
): Promise<BitacoraPreviewResult> {
  const params = new URLSearchParams({
    mes: String(mes),
    anio: String(anio),
  });
  if (categoria) params.append('categoria', categoria);

  const response = await apiClient.get<{ success: boolean; data: BitacoraPreviewResult }>(
    `${BITACORAS_BASE}/preview/${idCliente}?${params.toString()}`
  );
  return response.data.data;
}

/**
 * Enviar: Crear bitácora y enviar email con PDFs adjuntos
 */
export async function enviarBitacora(
  dto: EnviarBitacoraRequest,
): Promise<EnviarBitacoraResponse> {
  const response = await apiClient.post<{ success: boolean; data: EnviarBitacoraResponse }>(
    `${BITACORAS_BASE}/enviar`,
    dto,
  );
  return response.data.data;
}

/**
 * Historial: Bitácoras anteriores de un cliente
 */
export async function getBitacoraHistorial(
  idCliente: number,
): Promise<BitacoraHistorial[]> {
  const response = await apiClient.get<{ success: boolean; data: BitacoraHistorial[] }>(
    `${BITACORAS_BASE}/historial/${idCliente}`
  );
  return response.data.data;
}

// ═══════════════════════════════════════════════════════════════
// DIAGNÓSTICO: Meses con datos disponibles
// ═══════════════════════════════════════════════════════════════

export interface MesDisponible {
  mes: number;
  anio: number;
  count: number;
}

export interface MesesDisponiblesResult {
  id_cliente: number;
  categoria: string;
  total_ordenes_con_informes: number;
  meses: MesDisponible[];
}

/**
 * Diagnóstico: Obtener meses que tienen informes disponibles
 */
export async function getMesesDisponibles(
  idCliente: number,
  categoria?: string,
): Promise<MesesDisponiblesResult> {
  const params = new URLSearchParams();
  if (categoria) params.append('categoria', categoria);

  const url = `${BITACORAS_BASE}/meses-disponibles/${idCliente}${params.toString() ? '?' + params.toString() : ''}`;
  const response = await apiClient.get<{ success: boolean; data: MesesDisponiblesResult }>(url);
  return response.data.data;
}
