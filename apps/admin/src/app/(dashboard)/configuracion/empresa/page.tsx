'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  getConfiguracionEmpresa,
  updateConfiguracionEmpresa,
  type ConfiguracionEmpresa,
} from '@/features/configuracion/api/configuracion.service';
import { formatCurrencyWithConfig } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/utils';
import { useBranding } from '@/providers/branding-provider';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Coins,
  FileText,
  Globe,
  HardDrive,
  Loader2,
  Lock,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FormattedMoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  locale: string;
  symbol: string;
  decimals: number;
  disabled?: boolean;
}

function FormattedMoneyInput({
  value,
  onChange,
  locale,
  symbol,
  decimals,
  disabled,
}: FormattedMoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  const safeDecimals = Math.max(0, Math.min(4, Number(decimals) || 0));
  const formattedDisplay = new Intl.NumberFormat(locale || 'es-CO', {
    minimumFractionDigits: safeDecimals,
    maximumFractionDigits: safeDecimals,
  }).format(Number.isFinite(value) ? value : 0);

  const parseInput = (txt: string): number => {
    const cleaned = txt.replace(/[^\d.,]/g, '');
    if (!cleaned) return 0;
    if (safeDecimals === 0) {
      const digits = cleaned.replace(/[.,]/g, '');
      return Math.max(0, Number(digits) || 0);
    }
    const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
    if (lastSep === -1) {
      return Math.max(0, Number(cleaned) || 0);
    }
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
    const decPart = cleaned.slice(lastSep + 1).replace(/[.,]/g, '');
    const parsed = Number(`${intPart || '0'}.${decPart}`);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
        {symbol || '$'}
      </span>
      <Input
        type="text"
        inputMode={safeDecimals > 0 ? 'decimal' : 'numeric'}
        disabled={disabled}
        value={focused ? rawText : formattedDisplay}
        onFocus={() => {
          setFocused(true);
          setRawText(value ? String(value) : '');
        }}
        onChange={(e) => {
          const next = e.target.value;
          setRawText(next);
          onChange(parseInput(next));
        }}
        onBlur={() => {
          setFocused(false);
        }}
        placeholder="0"
        className="pl-7 font-mono text-right bg-white"
      />
    </div>
  );
}

const ZONAS_HORARIAS_COMUNES = [
  { value: 'America/Bogota', label: 'Colombia — Bogotá (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México — Ciudad de México (UTC-6)' },
  { value: 'America/Lima', label: 'Perú — Lima (UTC-5)' },
  { value: 'America/Santiago', label: 'Chile — Santiago (UTC-4/-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina — Buenos Aires (UTC-3)' },
  { value: 'America/New_York', label: 'EE. UU. Este — Nueva York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'EE. UU. Pacífico — Los Ángeles (UTC-8/-7)' },
  { value: 'Europe/Madrid', label: 'España — Madrid (UTC+1/+2)' },
  { value: 'UTC', label: 'Tiempo Universal Coordinado (UTC)' },
];

const LOCALES_COMUNES = [
  { value: 'es-CO', label: 'Español (Colombia)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-CL', label: 'Español (Chile)' },
  { value: 'es-AR', label: 'Español (Argentina)' },
  { value: 'es-PE', label: 'Español (Perú)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
];

const MONEDAS_COMUNES = [
  { code: 'USD', symbol: '$', decimals: 2, label: 'USD - Dólar estadounidense' },
  { code: 'COP', symbol: '$', decimals: 0, label: 'COP - Peso colombiano' },
  { code: 'EUR', symbol: '€', decimals: 2, label: 'EUR - Euro' },
  { code: 'MXN', symbol: '$', decimals: 2, label: 'MXN - Peso mexicano' },
  { code: 'CLP', symbol: '$', decimals: 0, label: 'CLP - Peso chileno' },
  { code: 'PEN', symbol: 'S/', decimals: 2, label: 'PEN - Sol peruano' },
  { code: 'ARS', symbol: '$', decimals: 2, label: 'ARS - Peso argentino' },
  { code: 'BRL', symbol: 'R$', decimals: 2, label: 'BRL - Real brasileño' },
];

export default function ConfiguracionEmpresaPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { refreshBranding } = useBranding();
  const [form, setForm] = useState<ConfiguracionEmpresa | null>(null);
  const [activeTab, setActiveTab] = useState('identidad');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userRoleCode = String(session?.user?.rol || '').toUpperCase();
  const isSuperAdmin = ['SUPERADMIN', 'SUPER_ADMIN', 'PLATAFORMA', 'PLATFORM_ADMIN'].includes(
    userRoleCode,
  );

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getConfiguracionEmpresa();
      setForm(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar la configuración de empresa'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const updateField = <K extends keyof ConfiguracionEmpresa>(
    key: K,
    value: ConfiguracionEmpresa[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const normalizeOptionalStr = (val?: string | null) => {
    if (val == null) return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const handleSave = async () => {
    if (!form) return;
    const hexFields: Array<[keyof ConfiguracionEmpresa, string]> = [
      ['color_primario', 'Color primario'],
      ['color_secundario', 'Color secundario'],
      ['color_acento', 'Color acento'],
      ['color_exito', 'Color éxito'],
      ['color_alerta', 'Color alerta'],
      ['color_peligro', 'Color peligro'],
    ];
    for (const [key, label] of hexFields) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(String(form[key] || ''))) {
        toast.error(`${label} debe tener formato hexadecimal #RRGGBB`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Partial<ConfiguracionEmpresa> = {
        nombre_comercial: form.nombre_comercial.trim(),
        razon_social: form.razon_social.trim(),
        tipo_id_fiscal: form.tipo_id_fiscal.trim(),
        numero_id_fiscal: normalizeOptionalStr(form.numero_id_fiscal),
        eslogan: normalizeOptionalStr(form.eslogan),
        sitio_web: normalizeOptionalStr(form.sitio_web),
        email_contacto: normalizeOptionalStr(form.email_contacto),
        telefono_principal: normalizeOptionalStr(form.telefono_principal),
        telefono_soporte: normalizeOptionalStr(form.telefono_soporte),
        direccion_linea1: normalizeOptionalStr(form.direccion_linea1),
        ciudad_defecto: form.ciudad_defecto.trim(),
        departamento_defecto: normalizeOptionalStr(form.departamento_defecto),
        pais_defecto: form.pais_defecto.trim(),
        codigo_pais_iso: form.codigo_pais_iso.trim().toUpperCase(),
        logo_principal_url: normalizeOptionalStr(form.logo_principal_url),
        logo_claro_url: normalizeOptionalStr(form.logo_claro_url),
        isotipo_url: normalizeOptionalStr(form.isotipo_url),
        favicon_url: normalizeOptionalStr(form.favicon_url),
        color_primario: form.color_primario,
        color_secundario: form.color_secundario,
        color_acento: form.color_acento,
        color_exito: form.color_exito,
        color_alerta: form.color_alerta,
        color_peligro: form.color_peligro,
        zona_horaria: form.zona_horaria.trim(),
        locale: form.locale.trim(),
        codigo_moneda: form.codigo_moneda.trim().toUpperCase(),
        simbolo_moneda: form.simbolo_moneda.trim(),
        decimales_moneda: Number(form.decimales_moneda) || 0,
        etiqueta_impuesto: form.etiqueta_impuesto.trim(),
        tasa_impuesto_defecto: Number(form.tasa_impuesto_defecto) || 0,
        prefijo_orden: form.prefijo_orden.trim(),
        prefijo_cotizacion: form.prefijo_cotizacion.trim(),
        prefijo_informe: form.prefijo_informe.trim(),
        prefijo_remision: form.prefijo_remision.trim(),
        prefijo_oc: form.prefijo_oc.trim(),
        prefijo_contrato: form.prefijo_contrato.trim(),
        prefijo_propuesta: form.prefijo_propuesta.trim(),
        texto_pie_pdf: normalizeOptionalStr(form.texto_pie_pdf),
        texto_disclaimer_repuestos_cliente: normalizeOptionalStr(
          form.texto_disclaimer_repuestos_cliente,
        ),
        garantia_meses_defecto: Number(form.garantia_meses_defecto) || 0,
        validez_cotizacion_dias_defecto: Number(form.validez_cotizacion_dias_defecto) || 30,
        requiere_firma_cliente_defecto: Boolean(form.requiere_firma_cliente_defecto),
        ...(isSuperAdmin ? { storage_prefijo_raiz: form.storage_prefijo_raiz.trim() } : {}),
        politica_retencion_mobile_dias: Number(form.politica_retencion_mobile_dias) || 30,
        modulo_comercial_activo: Boolean(form.modulo_comercial_activo),
        modulo_inventario_activo: Boolean(form.modulo_inventario_activo),
        enable_cpq_governance: Boolean(form.enable_cpq_governance),
        lock_catalog_unit_price: Boolean(form.lock_catalog_unit_price),
        cot_mostrar_desglose_precios: Boolean(form.cot_mostrar_desglose_precios),
        umbral_aprobacion_supervisor: Math.max(0, Number(form.umbral_aprobacion_supervisor ?? 0)),
        umbral_aprobacion_gerente: Math.max(0, Number(form.umbral_aprobacion_gerente ?? 0)),
        descuento_max_sin_aprobacion: Math.max(
          0,
          Math.min(100, Number(form.descuento_max_sin_aprobacion ?? 0)),
        ),
        margen_minimo_alerta: Math.max(0, Math.min(100, Number(form.margen_minimo_alerta ?? 0))),
        margen_minimo_aprobacion: Math.max(
          0,
          Math.min(100, Number(form.margen_minimo_aprobacion ?? 0)),
        ),
        terminos_cotizacion_defecto: normalizeOptionalStr(form.terminos_cotizacion_defecto),
      };

      const updated = await updateConfiguracionEmpresa(payload);
      setForm(updated);
      await refreshBranding(updated);
      queryClient.invalidateQueries({ queryKey: ['config-org-empresa-cpq'] });
      toast.success('Identidad White-Label y parámetros guardados y aplicados en vivo');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al guardar configuración corporativa'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Cargando configuración corporativa White-Label...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-md"
            style={{ backgroundColor: form.color_primario }}
          >
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Empresa, Marca Blanca y Parámetros Globales
            </h1>
            <p className="text-sm text-slate-500">
              Control centralizado de identidad visual, moneda, zona horaria, impuestos y prefijos
              para Portal Web, App Móvil, PDFs y Emails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadConfig} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: form.color_primario }}
            className="text-white hover:opacity-95"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Vista Previa en Vivo */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div
          className="px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{
            background: `linear-gradient(135deg, ${form.color_secundario} 0%, ${form.color_primario} 65%, ${form.color_acento} 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            {form.logo_claro_url || form.logo_principal_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo_claro_url || form.logo_principal_url!}
                alt={form.nombre_comercial}
                className="h-10 max-w-[150px] object-contain bg-white/10 rounded-lg p-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                {form.nombre_comercial.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-base font-bold leading-tight">{form.nombre_comercial}</div>
              <div className="text-xs text-white/80">
                {form.razon_social} · {form.tipo_id_fiscal} {form.numero_id_fiscal || 'Pendiente'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white/15 font-medium">
              Moneda:{' '}
              {formatCurrencyWithConfig(125000.5, {
                locale: form.locale,
                codigo_moneda: form.codigo_moneda,
                simbolo_moneda: form.simbolo_moneda,
                decimales_moneda: form.decimales_moneda,
              })}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 font-medium">
              {form.etiqueta_impuesto} {form.tasa_impuesto_defecto}%
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 font-medium">
              {form.ciudad_defecto} ({form.zona_horaria})
            </span>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto p-1 gap-1">
          <TabsTrigger value="identidad" className="py-2 gap-1.5">
            <Building2 className="h-4 w-4" /> Identidad y Contacto
          </TabsTrigger>
          <TabsTrigger value="marca" className="py-2 gap-1.5">
            <Palette className="h-4 w-4" /> Logos y Paleta
          </TabsTrigger>
          <TabsTrigger value="region" className="py-2 gap-1.5">
            <Coins className="h-4 w-4" /> Moneda y Región
          </TabsTrigger>
          <TabsTrigger value="operacion" className="py-2 gap-1.5">
            <FileText className="h-4 w-4" /> Documentos y Operación
          </TabsTrigger>
          <TabsTrigger value="comercial" className="py-2 gap-1.5">
            <Briefcase className="h-4 w-4" /> Comercial y CPQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identidad">
          <Card>
            <CardHeader>
              <CardTitle>Datos Corporativos y Fiscales</CardTitle>
              <CardDescription>
                Información legal que aparece en PDFs oficiales, correos y portal de clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre Comercial *</Label>
                <Input
                  value={form.nombre_comercial}
                  onChange={(e) => updateField('nombre_comercial', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Razón Social *</Label>
                <Input
                  value={form.razon_social}
                  onChange={(e) => updateField('razon_social', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>ID Fiscal</Label>
                  <Input
                    value={form.tipo_id_fiscal}
                    onChange={(e) => updateField('tipo_id_fiscal', e.target.value)}
                    placeholder="NIT/RUT/NIF"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Número Fiscal</Label>
                  <Input
                    value={form.numero_id_fiscal ?? ''}
                    onChange={(e) => updateField('numero_id_fiscal', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Eslogan / Subtítulo Corporativo</Label>
                <Input
                  value={form.eslogan ?? ''}
                  onChange={(e) => updateField('eslogan', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sitio Web</Label>
                <Input
                  value={form.sitio_web ?? ''}
                  onChange={(e) => updateField('sitio_web', e.target.value)}
                  placeholder="https://empresa.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email de Contacto</Label>
                <Input
                  type="email"
                  value={form.email_contacto ?? ''}
                  onChange={(e) => updateField('email_contacto', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono Principal</Label>
                <Input
                  value={form.telefono_principal ?? ''}
                  onChange={(e) => updateField('telefono_principal', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono Soporte Técnico</Label>
                <Input
                  value={form.telefono_soporte ?? ''}
                  onChange={(e) => updateField('telefono_soporte', e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Dirección Línea 1</Label>
                <Input
                  value={form.direccion_linea1 ?? ''}
                  onChange={(e) => updateField('direccion_linea1', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ciudad por Defecto *</Label>
                <Input
                  value={form.ciudad_defecto}
                  onChange={(e) => updateField('ciudad_defecto', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Estado / Departamento</Label>
                <Input
                  value={form.departamento_defecto ?? ''}
                  onChange={(e) => updateField('departamento_defecto', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>País por Defecto *</Label>
                <Input
                  value={form.pais_defecto}
                  onChange={(e) => updateField('pais_defecto', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Código País ISO (2 letras)</Label>
                <Input
                  maxLength={5}
                  value={form.codigo_pais_iso}
                  onChange={(e) => updateField('codigo_pais_iso', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marca">
          <Card>
            <CardHeader>
              <CardTitle>Logotipos y Paleta de Colores</CardTitle>
              <CardDescription>
                Los colores actualizan inmediatamente el tema del Portal Admin, PDFs y emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>URL Logo Principal (sobre fondo claro / PDF)</Label>
                  <Input
                    value={form.logo_principal_url ?? ''}
                    onChange={(e) => updateField('logo_principal_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL Logo Claro (sobre fondo oscuro / Sidebar)</Label>
                  <Input
                    value={form.logo_claro_url ?? ''}
                    onChange={(e) => updateField('logo_claro_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL Isotipo / Icono Cuadrado</Label>
                  <Input
                    value={form.isotipo_url ?? ''}
                    onChange={(e) => updateField('isotipo_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL Favicon Pestaña Navegador</Label>
                  <Input
                    value={form.favicon_url ?? ''}
                    onChange={(e) => updateField('favicon_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
                {(
                  [
                    ['color_primario', 'Color Primario (Botones y Cabeceras)'],
                    ['color_secundario', 'Color Secundario (Sidebar y Footers)'],
                    ['color_acento', 'Color Acento (Destacados y Badges)'],
                    ['color_exito', 'Color Éxito (Estados Completados)'],
                    ['color_alerta', 'Color Alerta (Advertencias)'],
                    ['color_peligro', 'Color Peligro (Crítico / Errores)'],
                  ] as const
                ).map(([field, title]) => (
                  <div key={field} className="space-y-1.5">
                    <Label>{title}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(form[field]) ? form[field] : '#1E40AF'}
                        onChange={(e) => updateField(field, e.target.value.toUpperCase())}
                        className="h-9 w-12 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                      />
                      <Input
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="region">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Configuración Regional, Moneda e Impuestos
              </CardTitle>
              <CardDescription>
                Gobierna el formato de moneda, fechas y zona horaria en reportes, PDFs y crons.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="whitespace-nowrap">Zona Horaria (IANA)</Label>
                <Select
                  value={form.zona_horaria}
                  onValueChange={(value) => updateField('zona_horaria', value)}
                >
                  <SelectTrigger className="w-full h-9 bg-white">
                    <SelectValue placeholder="Seleccionar zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONAS_HORARIAS_COMUNES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                    {!ZONAS_HORARIAS_COMUNES.some((tz) => tz.value === form.zona_horaria) && (
                      <SelectItem value={form.zona_horaria}>{form.zona_horaria}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="whitespace-nowrap">Formato Regional (Locale)</Label>
                <Select value={form.locale} onValueChange={(value) => updateField('locale', value)}>
                  <SelectTrigger className="w-full h-9 bg-white">
                    <SelectValue placeholder="Seleccionar formato regional" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES_COMUNES.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label} ({loc.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="whitespace-nowrap">Moneda Predefinida</Label>
                <Select
                  value={form.codigo_moneda}
                  onValueChange={(value) => {
                    const found = MONEDAS_COMUNES.find((m) => m.code === value);
                    updateField('codigo_moneda', value);
                    if (found) {
                      updateField('simbolo_moneda', found.symbol);
                      updateField('decimales_moneda', found.decimals);
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 bg-white">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS_COMUNES.map((m) => (
                      <SelectItem key={m.code} value={m.code}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Símbolo de Moneda</Label>
                <Input
                  value={form.simbolo_moneda}
                  onChange={(e) => updateField('simbolo_moneda', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Decimales Moneda (0 - 4)</Label>
                <Input
                  type="number"
                  min={0}
                  max={4}
                  value={form.decimales_moneda}
                  onChange={(e) => updateField('decimales_moneda', Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Etiqueta Impuesto</Label>
                  <Input
                    value={form.etiqueta_impuesto}
                    onChange={(e) => updateField('etiqueta_impuesto', e.target.value)}
                    placeholder="IVA / Tax / IGV"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tasa %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={form.tasa_impuesto_defecto}
                    onChange={(e) => updateField('tasa_impuesto_defecto', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 4: DOCUMENTOS Y OPERACIÓN */}
        <TabsContent value="operacion">
          <div className="space-y-4">
            {/* Tarjeta 1: Módulos Activos del Ecosistema (arriba del todo) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Módulos Activos del Ecosistema
                </CardTitle>
                <CardDescription>
                  Activa o desactiva módulos principales según el alcance operativo de la
                  organización.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-slate-50/70">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-slate-600" /> Módulo Comercial Activo
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cotizaciones comerciales (CPQ), plantillas y propuestas correctivas
                    </p>
                  </div>
                  <Switch
                    checked={form.modulo_comercial_activo}
                    onCheckedChange={(v) => updateField('modulo_comercial_activo', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-slate-50/70">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-slate-600" /> Módulo Inventario Activo
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      WMS, bodegas, catálogo maestro, compras y remisiones
                    </p>
                  </div>
                  <Switch
                    checked={form.modulo_inventario_activo}
                    onCheckedChange={(v) => updateField('modulo_inventario_activo', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 2: Numeración y Pie de Página Corporativo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Numeración y Pie de Página Corporativo
                </CardTitle>
                <CardDescription>
                  Prefijos del motor correlativo transaccional y leyenda legal fija en PDFs
                  corporativos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {(
                    [
                      ['prefijo_orden', 'Órdenes'],
                      ['prefijo_informe', 'Informes'],
                      ['prefijo_cotizacion', 'Cotizaciones'],
                      ['prefijo_propuesta', 'Propuestas'],
                      ['prefijo_contrato', 'Contratos'],
                      ['prefijo_remision', 'Remisiones'],
                      ['prefijo_oc', 'Orden Compra'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <Label>Texto Pie de Página PDF Corporativo</Label>
                  <Textarea
                    rows={2}
                    value={form.texto_pie_pdf ?? ''}
                    onChange={(e) => updateField('texto_pie_pdf', e.target.value)}
                    placeholder="Nota legal, certificación ISO o aviso de confidencialidad del pie de página..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 3: Parámetros Operativos de Campo (Órdenes de Servicio) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-primary" />
                  Parámetros Operativos de Campo (Órdenes de Servicio)
                </CardTitle>
                <CardDescription>
                  Reglas por defecto aplicadas en la ejecución técnica y cierre de órdenes de
                  servicio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="space-y-1.5">
                    <Label>Garantía por Defecto (meses)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={form.garantia_meses_defecto}
                      onChange={(e) =>
                        updateField('garantia_meses_defecto', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between p-3.5 rounded-lg border bg-slate-50/70 md:mt-5">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-slate-600" /> Firma Cliente Obligatoria
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Exigir firma del cliente al finalizar órdenes de servicio por defecto
                      </p>
                    </div>
                    <Switch
                      checked={form.requiere_firma_cliente_defecto}
                      onCheckedChange={(v) => updateField('requiere_firma_cliente_defecto', v)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Disclaimer Repuestos Suministrados por Cliente</Label>
                  <Textarea
                    rows={2}
                    value={form.texto_disclaimer_repuestos_cliente ?? ''}
                    onChange={(e) =>
                      updateField('texto_disclaimer_repuestos_cliente', e.target.value)
                    }
                    placeholder="Condición de garantía cuando el cliente aporta sus propios repuestos..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 4: Infraestructura y Sincronización Móvil (perfil técnico) */}
            <Card className="border-slate-200/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                  <HardDrive className="h-4 w-4 text-slate-500" />
                  Infraestructura y Sincronización Móvil
                </CardTitle>
                <CardDescription>
                  Parámetros técnicos de retención offline y almacenamiento en la nube.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Retención App Móvil (días)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.politica_retencion_mobile_dias}
                    onChange={(e) =>
                      updateField('politica_retencion_mobile_dias', Number(e.target.value))
                    }
                  />
                  <p className="text-[11px] text-slate-500">
                    Ventana de días que la app móvil conserva órdenes sincronizadas en caché local.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5">
                      Prefijo Raíz Storage (R2/CDN)
                      {!isSuperAdmin && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                    </Label>
                    {isSuperAdmin && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Superadmin
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    {!isSuperAdmin && (
                      <Lock className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                    <Input
                      value={form.storage_prefijo_raiz}
                      readOnly={!isSuperAdmin}
                      disabled={!isSuperAdmin}
                      onChange={(e) => updateField('storage_prefijo_raiz', e.target.value)}
                      className={
                        !isSuperAdmin
                          ? 'pl-9 font-mono bg-slate-100 text-slate-600 cursor-not-allowed'
                          : 'font-mono'
                      }
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Parámetro técnico de infraestructura
                    {!isSuperAdmin
                      ? ' — protegido contra edición accidental (requiere rol Superadmin de Plataforma).'
                      : ' — precaución: modificarlo cambia la ruta base de nuevos archivos en R2/CDN.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PESTAÑA 5: COMERCIAL Y CPQ */}
        <TabsContent value="comercial">
          <div className="space-y-4">
            {!form.modulo_comercial_activo && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-950">
                    <p className="font-semibold">
                      El Módulo Comercial está desactivado.
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Actívalo en la pestaña &ldquo;Documentos y Operación&rdquo; para configurar
                      cotizaciones.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
                  onClick={() => setActiveTab('operacion')}
                >
                  Ir a Documentos y Operación
                </Button>
              </div>
            )}

            <div
              className={
                !form.modulo_comercial_activo
                  ? 'space-y-4 opacity-55 pointer-events-none select-none'
                  : 'space-y-4'
              }
              aria-disabled={!form.modulo_comercial_activo}
            >
              {/* Tarjeta 1: Parámetros Base de Cotizaciones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    Parámetros Base de Cotizaciones
                  </CardTitle>
                  <CardDescription>
                    Configuración estándar aplicada automáticamente a toda nueva Cotización
                    Comercial ({form.prefijo_cotizacion || 'COT'}), sin importar el tamaño de la
                    empresa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="space-y-1.5">
                      <Label>Validez Cotización (días)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        disabled={!form.modulo_comercial_activo}
                        value={form.validez_cotizacion_dias_defecto}
                        onChange={(e) =>
                          updateField('validez_cotizacion_dias_defecto', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-4 p-3.5 rounded-lg border bg-slate-50/70">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="switch-cot-desglose-pdf"
                          className="text-sm font-semibold text-slate-800 cursor-pointer"
                        >
                          Desglosar precios unitarios y subtotales por rubro en PDF por defecto
                        </Label>
                        <p className="text-xs text-slate-500">
                          Desactivado (recomendado): genera ofertas ejecutivas en modo{' '}
                          <strong>Suma Alzada</strong> (1 página, sin precios unitarios). Activado:
                          muestra precios unitarios y subtotales por sección (modo licitación).
                        </p>
                      </div>
                      <Switch
                        id="switch-cot-desglose-pdf"
                        disabled={!form.modulo_comercial_activo}
                        checked={Boolean(form.cot_mostrar_desglose_precios)}
                        onCheckedChange={(v) => updateField('cot_mostrar_desglose_precios', v)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Términos y Condiciones por Defecto de Cotizaciones</Label>
                    <Textarea
                      rows={4}
                      disabled={!form.modulo_comercial_activo}
                      value={form.terminos_cotizacion_defecto ?? ''}
                      onChange={(e) => updateField('terminos_cotizacion_defecto', e.target.value)}
                      placeholder="Se precargarán automáticamente en toda nueva cotización comercial..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta 2: Gobernanza Comercial y Rentabilidad (CPQ) — Divulgación Progresiva */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Gobernanza Comercial y Rentabilidad (CPQ)
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        Reglas opcionales de aprobación interna, pisos de margen y protección de
                        precios exclusivos para Cotizaciones ({form.prefijo_cotizacion || 'COT'}).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-slate-50 shrink-0">
                      <Label
                        htmlFor="switch-cpq-governance"
                        className="text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        Activar Flujo de Aprobaciones y Control de Rentabilidad
                      </Label>
                      <Switch
                        id="switch-cpq-governance"
                        disabled={!form.modulo_comercial_activo}
                        checked={Boolean(form.enable_cpq_governance)}
                        onCheckedChange={(v) => updateField('enable_cpq_governance', v)}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {!form.enable_cpq_governance ? (
                    <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-600 flex items-center gap-2.5">
                      <Sparkles className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        <strong>Modo ágil activo:</strong> las cotizaciones no requieren aprobación
                        interna por monto, descuento ni margen.
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Presets rápidos (solo estado local, sin autoguardar) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <span className="text-xs font-medium text-slate-600">
                          Cargar perfil de referencia (sin guardar automáticamente):
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!form.modulo_comercial_activo}
                            className="h-8 text-xs bg-white"
                            onClick={() => {
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      umbral_aprobacion_supervisor: 2000000,
                                      umbral_aprobacion_gerente: 8000000,
                                      descuento_max_sin_aprobacion: 10,
                                      margen_minimo_alerta: 25,
                                      margen_minimo_aprobacion: 18,
                                      lock_catalog_unit_price: false,
                                    }
                                  : prev,
                              );
                              toast.info(
                                'Perfil PyME Ágil aplicado al formulario. Pulsa "Guardar Cambios" para confirmar.',
                              );
                            }}
                          >
                            Perfil PyME Ágil
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!form.modulo_comercial_activo}
                            className="h-8 text-xs bg-white"
                            onClick={() => {
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      umbral_aprobacion_supervisor: 1000000,
                                      umbral_aprobacion_gerente: 5000000,
                                      descuento_max_sin_aprobacion: 5,
                                      margen_minimo_alerta: 30,
                                      margen_minimo_aprobacion: 22,
                                      lock_catalog_unit_price: true,
                                    }
                                  : prev,
                              );
                              toast.info(
                                'Perfil Industrial Estricto aplicado al formulario. Pulsa "Guardar Cambios" para confirmar.',
                              );
                            }}
                          >
                            Perfil Industrial Estricto
                          </Button>
                        </div>
                      </div>

                      {/* 5 inputs de umbrales y márgenes */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="space-y-1.5">
                            <Label>Umbral Supervisor ({form.codigo_moneda})</Label>
                            <FormattedMoneyInput
                              value={Number(form.umbral_aprobacion_supervisor ?? 0)}
                              onChange={(val) => updateField('umbral_aprobacion_supervisor', val)}
                              locale={form.locale}
                              symbol={form.simbolo_moneda}
                              decimals={form.decimales_moneda}
                              disabled={!form.modulo_comercial_activo}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Umbral Gerente ({form.codigo_moneda})</Label>
                            <FormattedMoneyInput
                              value={Number(form.umbral_aprobacion_gerente ?? 0)}
                              onChange={(val) => updateField('umbral_aprobacion_gerente', val)}
                              locale={form.locale}
                              symbol={form.simbolo_moneda}
                              decimals={form.decimales_moneda}
                              disabled={!form.modulo_comercial_activo}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Desc. Máx. Sin Aprob. (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              disabled={!form.modulo_comercial_activo}
                              value={form.descuento_max_sin_aprobacion ?? 0}
                              onChange={(e) =>
                                updateField(
                                  'descuento_max_sin_aprobacion',
                                  Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                )
                              }
                              className="font-mono text-right bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Margen Mín. Alerta (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              disabled={!form.modulo_comercial_activo}
                              value={form.margen_minimo_alerta ?? 0}
                              onChange={(e) =>
                                updateField(
                                  'margen_minimo_alerta',
                                  Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                )
                              }
                              className="font-mono text-right bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Margen Mín. Gerente (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              disabled={!form.modulo_comercial_activo}
                              value={form.margen_minimo_aprobacion ?? 0}
                              onChange={(e) =>
                                updateField(
                                  'margen_minimo_aprobacion',
                                  Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                )
                              }
                              className="font-mono text-right bg-white"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Deja en <strong>0</strong> cualquier umbral o porcentaje que desees omitir
                          individualmente. Las cotizaciones sin costos internos registrados omiten el
                          bloqueo por margen mínimo.
                        </p>
                      </div>

                      {/* Switch antifuga lock_catalog_unit_price */}
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50/80 gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <Lock className="h-4 w-4 text-slate-600" />
                            Bloquear edición manual de precios de catálogo en{' '}
                            {form.prefijo_cotizacion || 'COT'}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Los ítems traídos de catálogo/kits mantienen su precio unitario base
                            bloqueado y las rebajas solo pueden aplicarse vía Descuento (%). Los
                            ítems libres/custom sin precio de catálogo siguen siendo editables.
                          </p>
                        </div>
                        <Switch
                          disabled={!form.modulo_comercial_activo}
                          checked={Boolean(form.lock_catalog_unit_price)}
                          onCheckedChange={(v) => updateField('lock_catalog_unit_price', v)}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
