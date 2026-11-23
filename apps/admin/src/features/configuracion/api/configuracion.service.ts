/**
 * Servicio API White-Label de Configuración Organizacional
 * Conecta con /api/configuracion/publica, /api/configuracion/empresa
 */

import { apiClient } from '@/lib/api/client';

export interface ConfiguracionPublica {
  nombre_comercial: string;
  eslogan: string | null;
  sitio_web: string | null;
  email_contacto: string | null;
  telefono_soporte: string | null;
  ciudad_defecto: string;
  pais_defecto: string;
  codigo_pais_iso: string;
  logo_principal_url: string | null;
  logo_claro_url: string | null;
  isotipo_url: string | null;
  favicon_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  color_exito: string;
  color_alerta: string;
  color_peligro: string;
  zona_horaria: string;
  locale: string;
  codigo_moneda: string;
  simbolo_moneda: string;
  decimales_moneda: number;
  etiqueta_impuesto: string;
  tasa_impuesto_defecto: number;
  modulo_comercial_activo: boolean;
  modulo_inventario_activo: boolean;
}

export interface ConfiguracionEmpresa extends ConfiguracionPublica {
  id_configuracion: number;
  razon_social: string;
  tipo_id_fiscal: string;
  numero_id_fiscal: string | null;
  telefono_principal: string | null;
  direccion_linea1: string | null;
  departamento_defecto: string | null;
  prefijo_orden: string;
  prefijo_cotizacion: string;
  prefijo_informe: string;
  prefijo_remision: string;
  prefijo_oc: string;
  prefijo_contrato: string;
  prefijo_propuesta: string;
  texto_pie_pdf: string | null;
  texto_disclaimer_repuestos_cliente: string | null;
  garantia_meses_defecto: number;
  validez_cotizacion_dias_defecto: number;
  requiere_firma_cliente_defecto: boolean;
  storage_prefijo_raiz: string;
  politica_retencion_mobile_dias: number;
  enable_cpq_governance?: boolean;
  lock_catalog_unit_price?: boolean;
  cot_mostrar_desglose_precios?: boolean;
  umbral_aprobacion_supervisor?: number;
  umbral_aprobacion_gerente?: number;
  descuento_max_sin_aprobacion?: number;
  margen_minimo_alerta?: number;
  margen_minimo_aprobacion?: number;
  terminos_cotizacion_defecto?: string | null;
  fecha_modificacion?: string | null;
}

export const DEFAULT_BRANDING: ConfiguracionPublica = {
  nombre_comercial: 'Mi Organización',
  eslogan: 'Gestión Técnica de Mantenimiento y Activos',
  sitio_web: null,
  email_contacto: null,
  telefono_soporte: null,
  ciudad_defecto: 'Ciudad',
  pais_defecto: 'País',
  codigo_pais_iso: 'CO',
  logo_principal_url: null,
  logo_claro_url: null,
  isotipo_url: null,
  favicon_url: null,
  color_primario: '#1E40AF',
  color_secundario: '#0F172A',
  color_acento: '#0EA5E9',
  color_exito: '#16A34A',
  color_alerta: '#D97706',
  color_peligro: '#DC2626',
  zona_horaria: 'America/Bogota',
  locale: 'es-CO',
  codigo_moneda: 'USD',
  simbolo_moneda: '$',
  decimales_moneda: 2,
  etiqueta_impuesto: 'IVA',
  tasa_impuesto_defecto: 19,
  modulo_comercial_activo: true,
  modulo_inventario_activo: true,
};

export async function getConfiguracionPublica(): Promise<ConfiguracionPublica> {
  const res = await apiClient.get<ConfiguracionPublica>('/configuracion/publica');
  return { ...DEFAULT_BRANDING, ...(res.data || {}) };
}

export async function getConfiguracionEmpresa(): Promise<ConfiguracionEmpresa> {
  const res = await apiClient.get<ConfiguracionEmpresa>('/configuracion/empresa');
  return res.data;
}

export async function updateConfiguracionEmpresa(
  payload: Partial<ConfiguracionEmpresa>,
): Promise<ConfiguracionEmpresa> {
  const res = await apiClient.put<ConfiguracionEmpresa>('/configuracion/empresa', payload);
  return res.data;
}
