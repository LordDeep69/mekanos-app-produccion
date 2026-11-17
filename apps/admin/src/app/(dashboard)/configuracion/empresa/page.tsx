'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Building2,
  CheckCircle2,
  Coins,
  FileText,
  Globe,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ZONAS_HORARIAS_COMUNES = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'UTC',
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
  const { refreshBranding } = useBranding();
  const [form, setForm] = useState<ConfiguracionEmpresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        storage_prefijo_raiz: form.storage_prefijo_raiz.trim(),
        politica_retencion_mobile_dias: Number(form.politica_retencion_mobile_dias) || 30,
        modulo_comercial_activo: Boolean(form.modulo_comercial_activo),
        modulo_inventario_activo: Boolean(form.modulo_inventario_activo),
      };

      const updated = await updateConfiguracionEmpresa(payload);
      setForm(updated);
      await refreshBranding();
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

      <Tabs defaultValue="identidad" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
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
            <FileText className="h-4 w-4" /> Documentos y Módulos
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
                        value={
                          /^#[0-9A-Fa-f]{6}$/.test(form[field]) ? form[field] : '#1E40AF'
                        }
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
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Zona Horaria (IANA)</Label>
                <select
                  value={form.zona_horaria}
                  onChange={(e) => updateField('zona_horaria', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ZONAS_HORARIAS_COMUNES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                  {!ZONAS_HORARIAS_COMUNES.includes(form.zona_horaria) && (
                    <option value={form.zona_horaria}>{form.zona_horaria}</option>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Locale (Formato Regional)</Label>
                <select
                  value={form.locale}
                  onChange={(e) => updateField('locale', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {LOCALES_COMUNES.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.label} ({loc.value})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Moneda Predefinida</Label>
                <select
                  value={form.codigo_moneda}
                  onChange={(e) => {
                    const found = MONEDAS_COMUNES.find((m) => m.code === e.target.value);
                    updateField('codigo_moneda', e.target.value);
                    if (found) {
                      updateField('simbolo_moneda', found.symbol);
                      updateField('decimales_moneda', found.decimals);
                    }
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {MONEDAS_COMUNES.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
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

        <TabsContent value="operacion">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prefijos de Numeración Documental</CardTitle>
                <CardDescription>
                  Prefijos utilizados por el motor correlativo transaccional para nuevas entidades.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parámetros Legales, Almacenamiento y Módulos Activos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="space-y-1.5">
                    <Label>Validez Cotización (días)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={form.validez_cotizacion_dias_defecto}
                      onChange={(e) =>
                        updateField('validez_cotizacion_dias_defecto', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prefijo Raíz Storage (R2/CDN)</Label>
                    <Input
                      value={form.storage_prefijo_raiz}
                      onChange={(e) => updateField('storage_prefijo_raiz', e.target.value)}
                    />
                  </div>
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Texto Pie de Página PDF Corporativo</Label>
                    <Textarea
                      rows={2}
                      value={form.texto_pie_pdf ?? ''}
                      onChange={(e) => updateField('texto_pie_pdf', e.target.value)}
                      placeholder="Nota legal o certificación ISO del pie de página..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Disclaimer Repuestos Suministrados por Cliente</Label>
                    <Textarea
                      rows={2}
                      value={form.texto_disclaimer_repuestos_cliente ?? ''}
                      onChange={(e) =>
                        updateField('texto_disclaimer_repuestos_cliente', e.target.value)
                      }
                      placeholder="Condición de garantía cuando el cliente aporta repuestos..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-slate-600" /> Firma Cliente Obligatoria
                      </div>
                      <p className="text-xs text-slate-500">
                        Exigir firma al finalizar órdenes por defecto
                      </p>
                    </div>
                    <Switch
                      checked={form.requiere_firma_cliente_defecto}
                      onCheckedChange={(v) => updateField('requiere_firma_cliente_defecto', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-slate-600" /> Módulo Comercial Activo
                      </div>
                      <p className="text-xs text-slate-500">
                        Cotizaciones y propuestas correctivas
                      </p>
                    </div>
                    <Switch
                      checked={form.modulo_comercial_activo}
                      onCheckedChange={(v) => updateField('modulo_comercial_activo', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-slate-600" /> Módulo Inventario Activo
                      </div>
                      <p className="text-xs text-slate-500">
                        WMS, bodegas, compras y remisiones
                      </p>
                    </div>
                    <Switch
                      checked={form.modulo_inventario_activo}
                      onCheckedChange={(v) => updateField('modulo_inventario_activo', v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
