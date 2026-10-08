'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Componente Unificado: ArticuloForm (Alta y Edición de Recurso Maestro)
 * 
 * Arquitectura Zero-Trust:
 * - Modo 'create': Habilita 'Stock Inicial' (genera apertura formal en Kardex).
 * - Modo 'edit': Bloquea 'Stock Actual' en solo lectura (protección inmutable de Kardex).
 * - Calibración Matemática Bidireccional: Markup sobre Costo vs. Margen Real sobre Venta.
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Boxes,
  Building2,
  Check,
  DollarSign,
  HardHat,
  Info,
  Layers,
  Lock,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Wrench,
} from 'lucide-react';

import { comprasService } from '@/lib/api/compras.service';
import { ArticuloMaestro, DestinoArticulo, ProveedorCompleto } from '@/types/compras.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ComboboxWithCreate } from '@/components/ui/combobox-with-create';
import { HierarchicalCategorySelect } from '@/components/compras/hierarchical-category-select';
import { UnidadesMedidaSelect } from '@/components/compras/unidades-medida-select';

// ============================================================================
// SCHEMA DE VALIDACIÓN CON ZOD
// ============================================================================
const escalaPrecioSchema = z.object({
  cantidad_min: z.coerce.number().min(1, 'La cantidad mínima debe ser al menos 1'),
  costo_unitario: z.coerce.number().min(0, 'El costo no puede ser negativo'),
  descuento_porcentaje: z.coerce.number().min(0).max(100).optional(),
});

const proveedorInicialSchema = z.object({
  id_proveedor: z.coerce.number().min(1, 'Selecciona un proveedor válido'),
  referencia_proveedor: z.string().min(1, 'El SKU o referencia del proveedor es obligatorio'),
  marca_ofrecida: z.string().optional(),
  id_marca_ofrecida: z.coerce.number().optional().nullable(),
  costo_actual: z.coerce.number().min(0, 'El costo debe ser mayor o igual a 0'),
  moneda: z.string().default('COP'),
  tiempo_entrega_dias: z.coerce.number().min(0).default(1),
  cantidad_minima_compra: z.coerce.number().min(1).default(1),
  es_proveedor_preferido: z.boolean().default(false),
  url_producto_proveedor: z.string().optional(),
  notas: z.string().optional(),
  escalas_precios: z.array(escalaPrecioSchema).optional(),
});

export const articuloFormSchema = z
  .object({
    id_categoria: z.coerce.number({ invalid_type_error: 'Selecciona una categoría taxonómica' }).min(1, 'Selecciona una categoría taxonómica'),
    codigo_interno: z.string().optional(),
    referencia_fabricante: z.string().min(2, 'La referencia neutral del fabricante es obligatoria'),
    marca: z.string().optional(),
    id_marca: z.coerce.number().optional().nullable(),
    descripcion_corta: z.string().min(3, 'Ingresa una descripción corta o título comercial'),
    descripcion_detallada: z.string().optional(),
    unidad_medida: z.string().default('UNIDAD'),
    codigo_unidad_medida: z.string().optional().nullable(),
    tipo_comercial: z.string().default('ORIGINAL'),
    destino_articulo: z.enum([
      'INSUMO_SERVICIO',
      'REPUESTO_CORRECTIVO',
      'HERRAMIENTA_ACTIVO',
      'DOTACION_EPP',
      'CONSUMIBLE_TALLER',
    ]),
    es_comprable: z.boolean().default(true),
    es_inventariable: z.boolean().default(true),
    es_facturable: z.boolean().default(true),
    requiere_serializacion: z.boolean().default(false),
    es_activo_fijo: z.boolean().default(false),
    numero_serie_activo: z.string().optional(),
    placa_inventario: z.string().optional(),
    frecuencia_mantenimiento_meses: z.coerce.number().min(1).optional().nullable(),
    stock_minimo: z.coerce.number().min(0).default(0),
    stock_actual: z.coerce.number().min(0).default(0),
    precio_compra: z.coerce.number().min(0).optional().nullable(),
    precio_venta: z.coerce.number().min(0).optional().nullable(),
    margen_utilidad_porcentaje: z.coerce.number().min(0).optional().nullable(),
    moneda: z.string().default('COP'),
    observaciones: z.string().optional(),
    notas_instalacion: z.string().optional(),
    proveedores_iniciales: z.array(proveedorInicialSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.destino_articulo === 'HERRAMIENTA_ACTIVO' && data.requiere_serializacion) {
        return !!data.numero_serie_activo && data.numero_serie_activo.trim().length > 0;
      }
      return true;
    },
    {
      message: 'El número de serie es obligatorio cuando la herramienta requiere serialización',
      path: ['numero_serie_activo'],
    }
  );

export type ArticuloFormValues = z.infer<typeof articuloFormSchema>;

// ============================================================================
// CONFIGURACIÓN DE ARQUETIPOS
// ============================================================================
const ARQUETIPOS_CONFIG = [
  {
    tipo: 'INSUMO_SERVICIO' as DestinoArticulo,
    titulo: 'Insumo de Servicio',
    subtitulo: 'Filtros, lubricantes, correas de mantenimiento programado',
    icono: Sparkles,
    color: 'border-blue-500 bg-blue-50/40 text-blue-800',
    iconBg: 'bg-blue-600 text-white',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: true,
      requiere_serializacion: false,
      es_activo_fijo: false,
      markup: 40,
    },
  },
  {
    tipo: 'REPUESTO_CORRECTIVO' as DestinoArticulo,
    titulo: 'Repuesto Correctivo',
    subtitulo: 'Bombas, inyectores, sensores, piezas de reemplazo mayor',
    icono: Wrench,
    color: 'border-amber-500 bg-amber-50/40 text-amber-800',
    iconBg: 'bg-amber-600 text-white',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: true,
      requiere_serializacion: false,
      es_activo_fijo: false,
      markup: 45,
    },
  },
  {
    tipo: 'HERRAMIENTA_ACTIVO' as DestinoArticulo,
    titulo: 'Herramienta / Activo',
    subtitulo: 'Osciloscopios, prensas, torquímetros, herramientas calibradas',
    icono: HardHat,
    color: 'border-purple-500 bg-purple-50/40 text-purple-800',
    iconBg: 'bg-purple-600 text-white',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: false,
      requiere_serializacion: true,
      es_activo_fijo: true,
      markup: 0,
    },
  },
  {
    tipo: 'DOTACION_EPP' as DestinoArticulo,
    titulo: 'Dotación / EPP',
    subtitulo: 'Botas, cascos, guantes dieléctricos, uniformes técnicos',
    icono: ShieldCheck,
    color: 'border-emerald-500 bg-emerald-50/40 text-emerald-800',
    iconBg: 'bg-emerald-600 text-white',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: false,
      requiere_serializacion: false,
      es_activo_fijo: false,
      markup: 0,
    },
  },
  {
    tipo: 'CONSUMIBLE_TALLER' as DestinoArticulo,
    titulo: 'Consumible de Taller',
    subtitulo: 'Tornillería, limpiafrenos, trapos industriales, teflón, lija',
    icono: Boxes,
    color: 'border-slate-500 bg-slate-50/40 text-slate-800',
    iconBg: 'bg-slate-700 text-white',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: false,
      requiere_serializacion: false,
      es_activo_fijo: false,
      markup: 30,
    },
  },
];

export interface ArticuloFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<ArticuloMaestro>;
  onSubmit: (values: ArticuloFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ArticuloForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ArticuloFormProps) {
  // Catálogos auxiliares
  const [proveedores, setProveedores] = useState<ProveedorCompleto[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estados de cálculo de precios y márgenes
  const [costoInput, setCostoInput] = useState<string>(
    initialData?.precio_compra !== undefined && initialData?.precio_compra !== null
      ? String(initialData.precio_compra)
      : ''
  );
  const [markupInput, setMarkupInput] = useState<string>(
    initialData?.margen_utilidad_porcentaje !== undefined && initialData?.margen_utilidad_porcentaje !== null
      ? String(initialData.margen_utilidad_porcentaje)
      : '40'
  );
  const [precioVentaInput, setPrecioVentaInput] = useState<string>(
    initialData?.precio_venta !== undefined && initialData?.precio_venta !== null
      ? String(initialData.precio_venta)
      : ''
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ArticuloFormValues>({
    resolver: zodResolver(articuloFormSchema),
    defaultValues: {
      destino_articulo: initialData?.destino_articulo || 'INSUMO_SERVICIO',
      id_categoria: initialData?.id_categoria || undefined,
      codigo_interno: initialData?.codigo_interno || '',
      referencia_fabricante: initialData?.referencia_fabricante || '',
      marca: initialData?.marca || '',
      id_marca: initialData?.id_marca || null,
      descripcion_corta: initialData?.descripcion_corta || '',
      descripcion_detallada: initialData?.descripcion_detallada || '',
      unidad_medida: initialData?.unidad_medida || 'UNIDAD',
      codigo_unidad_medida: initialData?.codigo_unidad_medida || 'UND',
      tipo_comercial: initialData?.tipo_comercial || 'ORIGINAL',
      es_comprable: initialData?.es_comprable ?? true,
      es_inventariable: initialData?.es_inventariable ?? true,
      es_facturable: initialData?.es_facturable ?? true,
      requiere_serializacion: initialData?.requiere_serializacion ?? false,
      es_activo_fijo: initialData?.es_activo_fijo ?? false,
      numero_serie_activo: initialData?.numero_serie_activo || '',
      placa_inventario: initialData?.placa_inventario || '',
      frecuencia_mantenimiento_meses: initialData?.frecuencia_mantenimiento_meses || null,
      stock_minimo: initialData?.stock_minimo ?? 0,
      stock_actual: initialData?.stock_actual ?? 0,
      precio_compra: initialData?.precio_compra ? Number(initialData.precio_compra) : null,
      precio_venta: initialData?.precio_venta ? Number(initialData.precio_venta) : null,
      margen_utilidad_porcentaje: initialData?.margen_utilidad_porcentaje
        ? Number(initialData.margen_utilidad_porcentaje)
        : 40,
      moneda: initialData?.moneda || 'COP',
      observaciones: initialData?.observaciones || '',
      notas_instalacion: initialData?.notas_instalacion || '',
      proveedores_iniciales: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'proveedores_iniciales',
  });

  const destinoActual = watch('destino_articulo');
  const esInventariable = watch('es_inventariable');
  const requiereSerializacion = watch('requiere_serializacion');
  const esActivoFijo = watch('es_activo_fijo');

  // Cargar lista de proveedores homologados para selector inicial (en modo create)
  useEffect(() => {
    async function loadAux() {
      try {
        if (mode === 'create') {
          const resProv = await comprasService.getProveedores({ limit: 100 });
          setProveedores(resProv.proveedores || []);
        }
      } catch (e) {
        console.error('Error cargando proveedores auxiliares:', e);
      } finally {
        setLoadingData(false);
      }
    }
    loadAux();
  }, [mode]);

  // Selección de Arquetipo
  const handleSelectArquetipo = (tipo: DestinoArticulo) => {
    const arquetipo = ARQUETIPOS_CONFIG.find((a) => a.tipo === tipo);
    if (!arquetipo) return;

    setValue('destino_articulo', tipo, { shouldValidate: true });
    setValue('es_comprable', arquetipo.defaults.es_comprable);
    setValue('es_inventariable', arquetipo.defaults.es_inventariable);
    setValue('es_facturable', arquetipo.defaults.es_facturable);
    setValue('requiere_serializacion', arquetipo.defaults.requiere_serializacion);
    setValue('es_activo_fijo', arquetipo.defaults.es_activo_fijo);

    if (arquetipo.defaults.markup > 0 && mode === 'create') {
      setMarkupInput(String(arquetipo.defaults.markup));
      setValue('margen_utilidad_porcentaje', arquetipo.defaults.markup);
      recalcularDesdeMarkup(costoInput, String(arquetipo.defaults.markup));
    }
  };

  // ============================================================================
  // MOTOR MATEMÁTICO BIDIRECCIONAL: MARKUP VS MARGEN REAL SOBRE VENTA
  // ============================================================================
  const recalcularDesdeMarkup = (costoStr: string, markupStr: string) => {
    const c = parseFloat(costoStr);
    const m = parseFloat(markupStr);
    if (!isNaN(c) && c > 0 && !isNaN(m)) {
      const pv = Math.round(c * (1 + m / 100));
      setPrecioVentaInput(String(pv));
      setValue('precio_venta', pv);
      setValue('precio_compra', c);
      setValue('margen_utilidad_porcentaje', m);
    } else if (!isNaN(c) && c > 0) {
      setValue('precio_compra', c);
    }
  };

  const handleCostoChange = (val: string) => {
    setCostoInput(val);
    recalcularDesdeMarkup(val, markupInput);
  };

  const handleMarkupChange = (val: string) => {
    setMarkupInput(val);
    recalcularDesdeMarkup(costoInput, val);
  };

  const handlePrecioVentaChange = (val: string) => {
    setPrecioVentaInput(val);
    const pv = parseFloat(val);
    const c = parseFloat(costoInput);
    if (!isNaN(pv) && !isNaN(c) && c > 0 && pv >= c) {
      const calculatedMarkup = Math.round(((pv - c) / c) * 1000) / 10;
      setMarkupInput(String(calculatedMarkup));
      setValue('margen_utilidad_porcentaje', calculatedMarkup);
      setValue('precio_venta', pv);
      setValue('precio_compra', c);
    } else if (!isNaN(pv)) {
      setValue('precio_venta', pv);
    }
  };

  // Margen Real sobre Venta calculado en tiempo real
  const margenRealCalculado = useMemo(() => {
    const c = parseFloat(costoInput);
    const pv = parseFloat(precioVentaInput);
    if (!isNaN(c) && !isNaN(pv) && pv > 0) {
      const margen = ((pv - c) / pv) * 100;
      return Math.round(margen * 10) / 10;
    }
    return null;
  }, [costoInput, precioVentaInput]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1: SELECCIÓN DE ARQUETIPO OPERATIVO */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-bold text-gray-900">
              {mode === 'create' ? '1. Destino Operativo / Arquetipo' : 'Arquetipo del Recurso'}
            </Label>
            <p className="text-xs text-gray-500">
              Configura el rol del artículo en almacén, facturación y mantenimiento.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {destinoActual}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {ARQUETIPOS_CONFIG.map((arq) => {
            const Icon = arq.icono;
            const isSelected = destinoActual === arq.tipo;
            return (
              <button
                key={arq.tipo}
                type="button"
                onClick={() => handleSelectArquetipo(arq.tipo)}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? `${arq.color} shadow-sm ring-2 ring-blue-500/20`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className={`p-2 rounded-lg mb-2.5 ${isSelected ? arq.iconBg : 'bg-gray-100 text-gray-600'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-gray-900 leading-tight">{arq.titulo}</span>
                <span className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                  {arq.subtitulo}
                </span>
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2: IDENTIDAD TÉCNICA Y TAXONOMÍA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Identidad Técnica y Taxonomía Jerárquica
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Define la clasificación oficial, códigos de referencia y títulos de búsqueda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Categoría Taxonómica */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="id_categoria" className="text-xs font-semibold text-gray-700">
                Categoría Taxonómica <span className="text-red-500">*</span>
              </Label>
              <HierarchicalCategorySelect
                id="id_categoria"
                value={watch('id_categoria')}
                onChange={(idCat) => {
                  setValue('id_categoria', idCat as any, { shouldValidate: true });
                }}
                placeholder="Seleccionar familia / subfamilia..."
              />
              {errors.id_categoria && (
                <p className="text-xs text-red-500">{errors.id_categoria.message}</p>
              )}
            </div>

            {/* Código Interno / SKU Maestro */}
            <div className="space-y-1.5">
              <Label htmlFor="codigo_interno" className="text-xs font-semibold text-gray-700">
                Código Interno / SKU Formal (Opcional)
              </Label>
              <Input
                id="codigo_interno"
                placeholder={mode === 'create' ? 'Auto-generado (ART-2026-XXXX)' : 'Ej: ART-2026-0001'}
                {...register('codigo_interno')}
                className="bg-white font-mono text-xs"
              />
              <p className="text-[11px] text-gray-400">
                {mode === 'create'
                  ? 'Si se omite, el sistema generará automáticamente un SKU formal correlativo.'
                  : 'Identificador único del recurso.'}
              </p>
            </div>

            {/* Referencia Neutral del Fabricante */}
            <div className="space-y-1.5">
              <Label htmlFor="referencia_fabricante" className="text-xs font-semibold text-gray-700">
                Referencia del Fabricante / Modelo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="referencia_fabricante"
                placeholder="Ej: W712/95, 6PK1195, LF16015"
                {...register('referencia_fabricante')}
                className="bg-white font-mono font-medium text-xs"
              />
              {errors.referencia_fabricante && (
                <p className="text-xs text-red-500">{errors.referencia_fabricante.message}</p>
              )}
            </div>

            {/* Marca Normalizada */}
            <div className="space-y-1.5">
              <Label htmlFor="id_marca" className="text-xs font-semibold text-gray-700">
                Marca Fabricante / OEM
              </Label>
              <ComboboxWithCreate
                value={watch('id_marca') || undefined}
                onChange={(idMarca, marcaObj) => {
                  setValue('id_marca', idMarca || null);
                  if (marcaObj?.nombre) {
                    setValue('marca', marcaObj.nombre);
                  }
                }}
                placeholder="Seleccionar o crear marca..."
              />
            </div>

            {/* Unidad de Medida */}
            <div className="space-y-1.5">
              <Label htmlFor="codigo_unidad_medida" className="text-xs font-semibold text-gray-700">
                Unidad de Medida
              </Label>
              <UnidadesMedidaSelect
                id="codigo_unidad_medida"
                value={watch('codigo_unidad_medida') || undefined}
                onChange={(codigo, unidadObj) => {
                  setValue('codigo_unidad_medida', codigo || null);
                  if (unidadObj?.nombre) {
                    setValue('unidad_medida', unidadObj.nombre);
                  }
                }}
              />
            </div>

            {/* Tipo Comercial */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo_comercial" className="text-xs font-semibold text-gray-700">
                Tipo Comercial
              </Label>
              <select
                id="tipo_comercial"
                {...register('tipo_comercial')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ORIGINAL">Original / OEM</option>
                <option value="HOMOLOGADO">Homologado / Certificado</option>
                <option value="GENERICO">Genérico / Aftermarket</option>
              </select>
            </div>
          </div>

          {/* Título Comercial y Descripción Corta */}
          <div className="space-y-1.5">
            <Label htmlFor="descripcion_corta" className="text-xs font-semibold text-gray-700">
              Descripción Corta / Título Comercial <span className="text-red-500">*</span>
            </Label>
            <Input
              id="descripcion_corta"
              placeholder="Ej: Filtro de Aceite Blindado para Motor Diésel Cummins ISX"
              {...register('descripcion_corta')}
              className="bg-white text-xs font-medium"
            />
            {errors.descripcion_corta && (
              <p className="text-xs text-red-500">{errors.descripcion_corta.message}</p>
            )}
          </div>

          {/* Descripción Técnica Detallada */}
          <div className="space-y-1.5">
            <Label htmlFor="descripcion_detallada" className="text-xs font-semibold text-gray-700">
              Descripción Técnica Detallada (Opcional)
            </Label>
            <Textarea
              id="descripcion_detallada"
              rows={3}
              placeholder="Detalla dimensiones, micronaje, roscas, compatibilidad con fluidos o normativas técnicas..."
              {...register('descripcion_detallada')}
              className="bg-white text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3: PRECIOS, COSTO Y MATEMÁTICA FINANCIERA (MARKUP VS MARGEN) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="border border-blue-200/80 shadow-sm bg-gradient-to-b from-blue-50/20 to-white">
        <CardHeader className="border-b border-blue-100 bg-blue-50/40 pb-4">
          <CardTitle className="text-base font-bold text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Estructura Financiera y Política de Precios
            </div>
            {margenRealCalculado !== null && (
              <Badge
                className={`text-xs font-bold px-2.5 py-1 ${
                  margenRealCalculado >= 25
                    ? 'bg-emerald-600 text-white'
                    : margenRealCalculado >= 10
                    ? 'bg-amber-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                Margen Real sobre Venta: {margenRealCalculado}%
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs text-blue-700/80">
            Cálculo bidireccional en tiempo real entre Costo de Adquisición, Markup de Taller y Margen Comercial.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Costo Base */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Costo Base de Adquisición ($ COP)
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="Ej: 85000"
                value={costoInput}
                onChange={(e) => handleCostoChange(e.target.value)}
                className="font-mono font-bold text-gray-900 text-xs bg-white"
              />
              <p className="text-[11px] text-gray-400">Costo de compra pactado o de referencia.</p>
            </div>

            {/* Markup sobre Costo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">
                  Markup sobre Costo (% Utilidad)
                </Label>
                <span className="text-[10px] text-blue-600 font-semibold uppercase">Cotización</span>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: 40"
                value={markupInput}
                onChange={(e) => handleMarkupChange(e.target.value)}
                className="font-mono font-bold text-blue-700 text-xs bg-white"
              />
              <p className="text-[11px] text-gray-400">Porcentaje que se le recarga al costo.</p>
            </div>

            {/* Precio Sugerido de Venta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">
                  Precio Sugerido de Venta ($ COP)
                </Label>
                <span className="text-[10px] text-emerald-600 font-semibold uppercase">PVP</span>
              </div>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="Ej: 119000"
                value={precioVentaInput}
                onChange={(e) => handlePrecioVentaChange(e.target.value)}
                className="font-mono font-extrabold text-emerald-700 text-xs bg-white"
              />
              <p className="text-[11px] text-gray-400">Precio final para órdenes y cotizaciones.</p>
            </div>
          </div>

          {/* Caja Explicativa de Transparencia Financiera */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              Claridad Financiera: Markup vs. Margen
            </div>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              <strong>Markup ({markupInput || 0}%):</strong> Es el recargo sobre el costo de adquisición (${Number(costoInput || 0).toLocaleString()} COP).<br />
              <strong>Margen Real ({margenRealCalculado ?? 0}%):</strong> Es la proporción neta de cada peso facturado que corresponde a utilidad bruta sobre la venta total (${Number(precioVentaInput || 0).toLocaleString()} COP).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 4: PARÁMETROS DE INVENTARIO Y POLÍTICAS OPERATIVAS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-gray-700" />
            Parámetros de Inventario y Operación
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Reglas de control de stock, reposición y serialización técnica.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Punto de Reorden / Stock Mínimo */}
            <div className="space-y-1.5">
              <Label htmlFor="stock_minimo" className="text-xs font-semibold text-gray-700">
                Punto de Reorden / Stock Mínimo
              </Label>
              <Input
                id="stock_minimo"
                type="number"
                min={0}
                {...register('stock_minimo')}
                className="bg-white font-mono text-xs"
              />
              <p className="text-[11px] text-gray-400">Cantidad mínima antes de detonar alertas de reposición.</p>
            </div>

            {/* Stock Actual / Stock Inicial (Zero-Trust Logic) */}
            <div className="space-y-1.5">
              {mode === 'create' ? (
                <>
                  <Label htmlFor="stock_actual" className="text-xs font-semibold text-gray-700">
                    Stock Inicial en Bodega
                  </Label>
                  <Input
                    id="stock_actual"
                    type="number"
                    min={0}
                    disabled={!esInventariable}
                    {...register('stock_actual')}
                    className="bg-white font-mono text-xs font-bold text-blue-700"
                  />
                  <p className="text-[11px] text-gray-400">
                    Si es &gt; 0, genera automáticamente un movimiento auditado en Kardex con origen INVENTARIO_INICIAL.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      Stock Físico en Bodega (Solo Lectura)
                    </Label>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                      Protegido por Kardex
                    </Badge>
                  </div>
                  <Input
                    value={`${initialData?.stock_actual ?? 0} ${initialData?.unidad_medida || 'UNIDADES'}`}
                    disabled
                    className="bg-gray-50 font-mono font-bold text-gray-800 text-xs cursor-not-allowed border-gray-200"
                  />
                  <p className="text-[11px] text-amber-700">
                    🔒 Las existencias físicas no son editables directamente. Para registrar entradas, salidas o ajustes auditados, utilice los movimientos de Kardex.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Switches de Comportamiento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="es_comprable" className="text-xs font-semibold text-gray-800">
                  Es Comprable
                </Label>
                <p className="text-[11px] text-gray-500">Acepta órdenes de compra</p>
              </div>
              <Switch
                id="es_comprable"
                checked={watch('es_comprable')}
                onCheckedChange={(c) => setValue('es_comprable', c)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="es_inventariable" className="text-xs font-semibold text-gray-800">
                  Es Inventariable
                </Label>
                <p className="text-[11px] text-gray-500">Mueve existencias en almacén</p>
              </div>
              <Switch
                id="es_inventariable"
                checked={watch('es_inventariable')}
                onCheckedChange={(c) => setValue('es_inventariable', c)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="es_facturable" className="text-xs font-semibold text-gray-800">
                  Es Facturable
                </Label>
                <p className="text-[11px] text-gray-500">Se cobra al cliente final</p>
              </div>
              <Switch
                id="es_facturable"
                checked={watch('es_facturable')}
                onCheckedChange={(c) => setValue('es_facturable', c)}
              />
            </div>
          </div>

          {/* Serialización y Activo Fijo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="requiere_serializacion" className="text-xs font-semibold text-gray-800">
                  Requiere Serialización
                </Label>
                <p className="text-[11px] text-gray-500">Cada unidad física tiene número de serie único</p>
              </div>
              <Switch
                id="requiere_serializacion"
                checked={requiereSerializacion}
                onCheckedChange={(c) => setValue('requiere_serializacion', c)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="es_activo_fijo" className="text-xs font-semibold text-gray-800">
                  Es Activo Fijo
                </Label>
                <p className="text-[11px] text-gray-500">Herramienta o equipo patrimonial de Mekanos</p>
              </div>
              <Switch
                id="es_activo_fijo"
                checked={esActivoFijo}
                onCheckedChange={(c) => setValue('es_activo_fijo', c)}
              />
            </div>
          </div>

          {/* Campos de Serialización / Placa si aplican */}
          {(requiereSerializacion || esActivoFijo) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-4 rounded-xl border border-purple-200 bg-purple-50/30">
              <div className="space-y-1.5">
                <Label htmlFor="numero_serie_activo" className="text-xs font-semibold text-purple-900">
                  Número de Serie del Fabricante {requiereSerializacion && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="numero_serie_activo"
                  placeholder="Ej: SN-49210-XC"
                  {...register('numero_serie_activo')}
                  className="bg-white font-mono text-xs"
                />
                {errors.numero_serie_activo && (
                  <p className="text-xs text-red-500">{errors.numero_serie_activo.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="placa_inventario" className="text-xs font-semibold text-purple-900">
                  Placa de Activo Fijo Interna
                </Label>
                <Input
                  id="placa_inventario"
                  placeholder="Ej: ACT-MK-0042"
                  {...register('placa_inventario')}
                  className="bg-white font-mono text-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 5: PROVEEDORES INICIALES (SOLO MODO CREATE) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'create' && (
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-indigo-600" />
                  Matriz Inicial de Abastecimiento (Proveedores Homologados)
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Asocia los proveedores que comercializan este repuesto y sus costos de adquisición.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id_proveedor: proveedores[0]?.id_proveedor || 1,
                    referencia_proveedor: '',
                    marca_ofrecida: '',
                    costo_actual: parseFloat(costoInput) || 0,
                    moneda: 'COP',
                    tiempo_entrega_dias: 1,
                    cantidad_minima_compra: 1,
                    es_proveedor_preferido: fields.length === 0,
                  })
                }
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Añadir Proveedor
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                <Truck className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                No se han añadido proveedores iniciales. Podrás vincularlos más adelante desde la Ficha 360°.
              </div>
            ) : (
              fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3 relative"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-800">
                      Fuente de Suministro #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-gray-700">Proveedor *</Label>
                      <select
                        {...register(`proveedores_iniciales.${idx}.id_proveedor` as const)}
                        className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                      >
                        {proveedores.map((p) => (
                          <option key={p.id_proveedor} value={p.id_proveedor}>
                            {p.persona?.nombre_comercial || p.persona?.razon_social || `Proveedor #${p.id_proveedor}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-700">Ref. / SKU Proveedor *</Label>
                      <Input
                        placeholder="Ej: FLT-8821"
                        {...register(`proveedores_iniciales.${idx}.referencia_proveedor` as const)}
                        className="bg-white text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-700">Costo ($ COP) *</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register(`proveedores_iniciales.${idx}.costo_actual` as const)}
                        className="bg-white text-xs font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`pref-${idx}`}
                      {...register(`proveedores_iniciales.${idx}.es_proveedor_preferido` as const)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <Label htmlFor={`pref-${idx}`} className="text-xs text-gray-700 cursor-pointer">
                      Marcar como Proveedor Preferido
                    </Label>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BOTONES DE ACCIÓN INFERIOR */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || loadingData}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[180px] shadow-sm font-semibold"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Guardando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 stroke-[2.5]" />
              {mode === 'create' ? 'Registrar Artículo Maestro' : 'Guardar Modificaciones'}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
