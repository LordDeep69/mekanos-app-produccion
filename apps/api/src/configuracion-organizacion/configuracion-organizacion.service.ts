import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateConfiguracionOrganizacionDto } from './dto/update-configuracion-organizacion.dto';

export interface ConfiguracionOrganizacionContext {
  id_configuracion: number;
  nombre_comercial: string;
  razon_social: string;
  tipo_id_fiscal: string;
  numero_id_fiscal: string | null;
  eslogan: string | null;
  sitio_web: string | null;
  email_contacto: string | null;
  telefono_principal: string | null;
  telefono_soporte: string | null;
  direccion_linea1: string | null;
  ciudad_defecto: string;
  departamento_defecto: string | null;
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
  modulo_comercial_activo: boolean;
  modulo_inventario_activo: boolean;
  enable_cpq_governance: boolean;
  lock_catalog_unit_price: boolean;
  cot_mostrar_desglose_precios: boolean;
  umbral_aprobacion_supervisor: number;
  umbral_aprobacion_gerente: number;
  descuento_max_sin_aprobacion: number;
  margen_minimo_alerta: number;
  margen_minimo_aprobacion: number;
  terminos_cotizacion_defecto: string | null;
  fecha_modificacion: Date;
}

const DEFAULT_ORG_CONTEXT: ConfiguracionOrganizacionContext = {
  id_configuracion: 1,
  nombre_comercial: 'Mi Organización',
  razon_social: 'Mi Organización S.A.',
  tipo_id_fiscal: 'NIT',
  numero_id_fiscal: null,
  eslogan: null,
  sitio_web: null,
  email_contacto: null,
  telefono_principal: null,
  telefono_soporte: null,
  direccion_linea1: null,
  ciudad_defecto: 'Ciudad',
  departamento_defecto: null,
  pais_defecto: 'Colombia',
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
  codigo_moneda: 'COP',
  simbolo_moneda: '$',
  decimales_moneda: 0,
  etiqueta_impuesto: 'IVA',
  tasa_impuesto_defecto: 19,
  prefijo_orden: 'OS',
  prefijo_cotizacion: 'COT',
  prefijo_informe: 'INF',
  prefijo_remision: 'REM',
  prefijo_oc: 'OC',
  prefijo_contrato: 'CONT',
  prefijo_propuesta: 'PROP',
  texto_pie_pdf: null,
  texto_disclaimer_repuestos_cliente: null,
  garantia_meses_defecto: 3,
  validez_cotizacion_dias_defecto: 30,
  requiere_firma_cliente_defecto: true,
  storage_prefijo_raiz: 'eam-media',
  politica_retencion_mobile_dias: 30,
  modulo_comercial_activo: true,
  modulo_inventario_activo: true,
  enable_cpq_governance: false,
  lock_catalog_unit_price: false,
  cot_mostrar_desglose_precios: false,
  umbral_aprobacion_supervisor: 5000000,
  umbral_aprobacion_gerente: 15000000,
  descuento_max_sin_aprobacion: 15,
  margen_minimo_alerta: 25,
  margen_minimo_aprobacion: 18,
  terminos_cotizacion_defecto: null,
  fecha_modificacion: new Date(0),
};

@Injectable()
export class ConfiguracionOrganizacionService {
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private cachedContext: { data: ConfiguracionOrganizacionContext; expiresAt: number } | null =
    null;
  private cachedLogoUri: { sourceUrl: string; dataUri: string; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  clearCache() {
    this.cachedContext = null;
    this.cachedLogoUri = null;
  }

  private normalizeRow(row: any): ConfiguracionOrganizacionContext {
    if (!row) {
      return { ...DEFAULT_ORG_CONTEXT };
    }

    return {
      ...DEFAULT_ORG_CONTEXT,
      ...row,
      tasa_impuesto_defecto: Number(
        row.tasa_impuesto_defecto ?? DEFAULT_ORG_CONTEXT.tasa_impuesto_defecto,
      ),
      decimales_moneda: Number(row.decimales_moneda ?? DEFAULT_ORG_CONTEXT.decimales_moneda),
      garantia_meses_defecto: Number(
        row.garantia_meses_defecto ?? DEFAULT_ORG_CONTEXT.garantia_meses_defecto,
      ),
      validez_cotizacion_dias_defecto: Number(
        row.validez_cotizacion_dias_defecto ?? DEFAULT_ORG_CONTEXT.validez_cotizacion_dias_defecto,
      ),
      politica_retencion_mobile_dias: Number(
        row.politica_retencion_mobile_dias ?? DEFAULT_ORG_CONTEXT.politica_retencion_mobile_dias,
      ),
      enable_cpq_governance: Boolean(row.enable_cpq_governance ?? false),
      lock_catalog_unit_price: Boolean(row.lock_catalog_unit_price ?? false),
      cot_mostrar_desglose_precios: Boolean(row.cot_mostrar_desglose_precios ?? false),
      umbral_aprobacion_supervisor: Number(
        row.umbral_aprobacion_supervisor ?? DEFAULT_ORG_CONTEXT.umbral_aprobacion_supervisor,
      ),
      umbral_aprobacion_gerente: Number(
        row.umbral_aprobacion_gerente ?? DEFAULT_ORG_CONTEXT.umbral_aprobacion_gerente,
      ),
      descuento_max_sin_aprobacion: Number(
        row.descuento_max_sin_aprobacion ?? DEFAULT_ORG_CONTEXT.descuento_max_sin_aprobacion,
      ),
      margen_minimo_alerta: Number(
        row.margen_minimo_alerta ?? DEFAULT_ORG_CONTEXT.margen_minimo_alerta,
      ),
      margen_minimo_aprobacion: Number(
        row.margen_minimo_aprobacion ?? DEFAULT_ORG_CONTEXT.margen_minimo_aprobacion,
      ),
    };
  }

  /**
   * Obtiene el contexto completo cacheado para servicios internos (PDF, Email, Sync, Crons).
   * Pase `forceFresh = true` para garantizar lectura directa desde BD (ej. ensamblaje PDF).
   */
  async getContext(forceFresh = false): Promise<ConfiguracionOrganizacionContext> {
    if (!forceFresh && this.cachedContext && this.cachedContext.expiresAt > Date.now()) {
      return this.cachedContext.data;
    }

    let row = await this.prisma.configuracion_organizacion.findUnique({
      where: { id_configuracion: 1 },
    });

    if (!row) {
      row = await this.prisma.configuracion_organizacion.upsert({
        where: { id_configuracion: 1 },
        create: { id_configuracion: 1 },
        update: {},
      });
    }

    const normalized = this.normalizeRow(row);
    this.cachedContext = {
      data: normalized,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };
    return normalized;
  }

  /**
   * Proyección pública no sensible para bootstrap de Login, Web Admin y App Móvil.
   */
  async getPublica() {
    const ctx = await this.getContext();
    return {
      nombre_comercial: ctx.nombre_comercial,
      eslogan: ctx.eslogan,
      sitio_web: ctx.sitio_web,
      email_contacto: ctx.email_contacto,
      telefono_soporte: ctx.telefono_soporte,
      ciudad_defecto: ctx.ciudad_defecto,
      pais_defecto: ctx.pais_defecto,
      codigo_pais_iso: ctx.codigo_pais_iso,
      logo_principal_url: ctx.logo_principal_url,
      logo_claro_url: ctx.logo_claro_url,
      isotipo_url: ctx.isotipo_url,
      favicon_url: ctx.favicon_url,
      color_primario: ctx.color_primario,
      color_secundario: ctx.color_secundario,
      color_acento: ctx.color_acento,
      color_exito: ctx.color_exito,
      color_alerta: ctx.color_alerta,
      color_peligro: ctx.color_peligro,
      zona_horaria: ctx.zona_horaria,
      locale: ctx.locale,
      codigo_moneda: ctx.codigo_moneda,
      simbolo_moneda: ctx.simbolo_moneda,
      decimales_moneda: ctx.decimales_moneda,
      etiqueta_impuesto: ctx.etiqueta_impuesto,
      tasa_impuesto_defecto: ctx.tasa_impuesto_defecto,
      modulo_comercial_activo: ctx.modulo_comercial_activo,
      modulo_inventario_activo: ctx.modulo_inventario_activo,
    };
  }

  async getEmpresa(): Promise<ConfiguracionOrganizacionContext> {
    return this.getContext();
  }

  async updateEmpresa(
    dto: UpdateConfiguracionOrganizacionDto,
    userId?: number,
    isSuperAdmin = false,
  ): Promise<ConfiguracionOrganizacionContext> {
    const safeDto: UpdateConfiguracionOrganizacionDto = { ...dto };
    if (!isSuperAdmin) {
      delete safeDto.storage_prefijo_raiz;
    }

    const now = new Date();
    const updated = await this.prisma.configuracion_organizacion.upsert({
      where: { id_configuracion: 1 },
      create: {
        id_configuracion: 1,
        ...safeDto,
        modificado_por: userId ?? null,
        fecha_modificacion: now,
      },
      update: {
        ...safeDto,
        modificado_por: userId ?? null,
        fecha_modificacion: now,
      },
    });

    this.clearCache();
    const normalized = this.normalizeRow(updated);
    this.cachedContext = {
      data: normalized,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };
    return normalized;
  }

  /**
   * Resuelve y cachea en memoria el logo principal como data URI base64 cuando
   * la organización configura una URL HTTP/HTTPS, o lo retorna directamente si ya es data URI.
   * Evita dependencias de disco y bloqueos por latencia de red durante el renderizado PDF.
   */
  async resolveLogoDataUri(): Promise<string | null> {
    const ctx = await this.getContext();
    const rawUrl = ctx.logo_principal_url?.trim();
    if (!rawUrl) return null;
    if (rawUrl.startsWith('data:image/')) return rawUrl;

    if (
      this.cachedLogoUri &&
      this.cachedLogoUri.sourceUrl === rawUrl &&
      this.cachedLogoUri.expiresAt > Date.now()
    ) {
      return this.cachedLogoUri.dataUri;
    }

    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      return null;
    }

    try {
      const response = await fetch(rawUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return rawUrl;
      const contentType = response.headers.get('content-type') || 'image/png';
      const arrayBuf = await response.arrayBuffer();
      const dataUri = `data:${contentType};base64,${Buffer.from(arrayBuf).toString('base64')}`;
      this.cachedLogoUri = {
        sourceUrl: rawUrl,
        dataUri,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      };
      return dataUri;
    } catch {
      return rawUrl;
    }
  }

  async getCategoriasActivo() {
    return this.prisma.categorias_activo.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }
}
