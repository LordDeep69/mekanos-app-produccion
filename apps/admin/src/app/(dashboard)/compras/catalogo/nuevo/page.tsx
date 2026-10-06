'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Creación de Artículo Maestro / Recurso (Abastecimiento y Catálogo)
 * 
 * Implementa Divulgación Progresiva por Arquetipos (Archetype Cards)
 * con react-hook-form y validación estricta con Zod.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  DollarSign,
  HardHat,
  Layers,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Wrench,
  Boxes,
  Info,
} from 'lucide-react';
import Link from 'next/link';

import { comprasService } from '@/lib/api/compras.service';
import { DestinoArticulo, TipoComponente } from '@/types/compras.types';
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

const articuloFormSchema = z
  .object({
    id_tipo_componente: z.coerce.number().min(1, 'Selecciona una categoría técnica'),
    id_categoria: z.coerce.number().optional().nullable(),
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

type ArticuloFormValues = z.infer<typeof articuloFormSchema>;

// ============================================================================
// DEFINICIÓN DE ARQUETIPOS DE RECURSOS
// ============================================================================
interface ArquetipoConfig {
  id: DestinoArticulo;
  titulo: string;
  badge: string;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
  colorBorder: string;
  colorBg: string;
  defaults: {
    es_comprable: boolean;
    es_inventariable: boolean;
    es_facturable: boolean;
    requiere_serializacion: boolean;
    es_activo_fijo: boolean;
  };
}

const ARQUETIPOS: ArquetipoConfig[] = [
  {
    id: 'INSUMO_SERVICIO',
    titulo: 'Insumo / Repuesto de Servicio',
    badge: 'Servicios Clientes',
    descripcion: 'Artículos adquiridos para montar, reemplazar o facturar en órdenes de servicio a clientes.',
    icono: Wrench,
    colorBorder: 'border-blue-500 hover:border-blue-600',
    colorBg: 'bg-blue-50/50',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: true,
      requiere_serializacion: false,
      es_activo_fijo: false,
    },
  },
  {
    id: 'REPUESTO_CORRECTIVO',
    titulo: 'Repuesto Crítico / Correctivo',
    badge: 'Mantenimiento Pesado',
    descripcion: 'Componentes mayores y repuestos correctivos de alta especificación para maquinaria.',
    icono: Boxes,
    colorBorder: 'border-indigo-500 hover:border-indigo-600',
    colorBg: 'bg-indigo-50/50',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: true,
      requiere_serializacion: false,
      es_activo_fijo: false,
    },
  },
  {
    id: 'HERRAMIENTA_ACTIVO',
    titulo: 'Herramienta o Activo Propio',
    badge: 'Propiedad MEKANOS',
    descripcion: 'Equipos, herramientas de diagnóstico y activos propios. Control con serial y calibración.',
    icono: ShieldCheck,
    colorBorder: 'border-amber-500 hover:border-amber-600',
    colorBg: 'bg-amber-50/50',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: false,
      requiere_serializacion: true,
      es_activo_fijo: true,
    },
  },
  {
    id: 'DOTACION_EPP',
    titulo: 'Dotación y Seguridad (EPP)',
    badge: 'Personal Operativo',
    descripcion: 'Indumentaria técnica, cascos, botas y elementos de protección para el personal.',
    icono: HardHat,
    colorBorder: 'border-emerald-500 hover:border-emerald-600',
    colorBg: 'bg-emerald-50/50',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: false,
      requiere_serializacion: false,
      es_activo_fijo: false,
    },
  },
  {
    id: 'CONSUMIBLE_TALLER',
    titulo: 'Consumible de Taller / Oficina',
    badge: 'Gasto Operativo Interno',
    descripcion: 'Materiales auxiliares como grasas, solventes, trapos o químicos gastados internamente.',
    icono: Package,
    colorBorder: 'border-purple-500 hover:border-purple-600',
    colorBg: 'bg-purple-50/50',
    defaults: {
      es_comprable: true,
      es_inventariable: true,
      es_facturable: false,
      requiere_serializacion: false,
      es_activo_fijo: false,
    },
  },
];

export default function NuevoArticuloPage() {
  const router = useRouter();
  const [tiposComponente, setTiposComponente] = useState<TipoComponente[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup con valores por defecto
  const form = useForm<ArticuloFormValues>({
    resolver: zodResolver(articuloFormSchema) as any,
    defaultValues: {
      destino_articulo: 'INSUMO_SERVICIO',
      es_comprable: true,
      es_inventariable: true,
      es_facturable: true,
      requiere_serializacion: false,
      es_activo_fijo: false,
      id_categoria: null,
      id_marca: null,
      codigo_unidad_medida: 'UND',
      unidad_medida: 'UNIDAD',
      tipo_comercial: 'ORIGINAL',
      stock_minimo: 0,
      stock_actual: 0,
      moneda: 'COP',
      proveedores_iniciales: [],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const currentDestino = watch('destino_articulo');
  const requiereSerializacion = watch('requiere_serializacion');
  const esComprable = watch('es_comprable');

  // FieldArray para la matriz dinámica de proveedores iniciales
  const { fields: proveedorFields, append: appendProveedor, remove: removeProveedor } =
    useFieldArray({
      control,
      name: 'proveedores_iniciales',
    });

  // Cargar datos complementarios (Categorías y Proveedores)
  useEffect(() => {
    async function loadAuxData() {
      try {
        setLoadingData(true);
        const [tiposRes, provsRes] = await Promise.all([
          comprasService.getTiposComponente(),
          comprasService.getProveedores(),
        ]);
        setTiposComponente(tiposRes || []);
        setProveedores(provsRes || []);
        if (tiposRes && tiposRes.length > 0) {
          setValue('id_tipo_componente', tiposRes[0].id_tipo_componente);
        }
      } catch (e) {
        toast.error('Error al precargar listas auxiliares.');
      } finally {
        setLoadingData(false);
      }
    }
    loadAuxData();
  }, [setValue]);

  // Manejar cambio de arquetipo y aplicar defaults inteligentes
  const handleSelectArquetipo = (arquetipo: ArquetipoConfig) => {
    setValue('destino_articulo', arquetipo.id);
    setValue('es_comprable', arquetipo.defaults.es_comprable);
    setValue('es_inventariable', arquetipo.defaults.es_inventariable);
    setValue('es_facturable', arquetipo.defaults.es_facturable);
    setValue('requiere_serializacion', arquetipo.defaults.requiere_serializacion);
    setValue('es_activo_fijo', arquetipo.defaults.es_activo_fijo);

    toast.info(`Arquetipo seleccionado: ${arquetipo.titulo}`, {
      description: 'El formulario se ha adaptado a los requerimientos de este recurso.',
    });
  };

  // Enviar formulario al backend
  const onSubmit = async (values: ArticuloFormValues) => {
    try {
      setIsSubmitting(true);
      toast.loading('Registrando recurso en catálogo maestro...', { id: 'create-item' });

      // Sanitizar payloads
      const payload: any = {
        ...values,
        id_marca: values.id_marca ? Number(values.id_marca) : undefined,
        id_categoria: values.id_categoria ? Number(values.id_categoria) : undefined,
        codigo_unidad_medida: values.codigo_unidad_medida || undefined,
        frecuencia_mantenimiento_meses: values.frecuencia_mantenimiento_meses || undefined,
        precio_compra: values.precio_compra ? Number(values.precio_compra) : undefined,
        precio_venta: values.precio_venta ? Number(values.precio_venta) : undefined,
        margen_utilidad_porcentaje: values.margen_utilidad_porcentaje
          ? Number(values.margen_utilidad_porcentaje)
          : undefined,
        stock_minimo: Number(values.stock_minimo || 0),
        stock_actual: Number(values.stock_actual || 0),
        proveedores_iniciales: values.proveedores_iniciales?.map((p) => ({
          ...p,
          id_proveedor: Number(p.id_proveedor),
          costo_actual: Number(p.costo_actual),
          tiempo_entrega_dias: Number(p.tiempo_entrega_dias || 1),
          cantidad_minima_compra: Number(p.cantidad_minima_compra || 1),
          id_marca_ofrecida: p.id_marca_ofrecida ? Number(p.id_marca_ofrecida) : undefined,
        })),
      };

      const creado = await comprasService.createArticulo(payload);

      toast.success('¡Artículo registrado con éxito!', {
        id: 'create-item',
        description: `Código interno: ${creado.codigo_interno || creado.referencia_fabricante}`,
      });

      // Redireccionar inmediatamente a la Ficha 360° del artículo creado
      router.push(`/compras/catalogo/${creado.id_componente}`);
    } catch (error: any) {
      console.error('Error al registrar artículo:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al procesar el registro.';
      toast.error('No se pudo crear el artículo', {
        id: 'create-item',
        description: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/compras/catalogo"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Catálogo Maestro
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-gray-800">Nuevo Recurso</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Alta de Recurso en Catálogo Maestro
          </h1>
          <p className="text-sm text-gray-600">
            Define la identidad neutral del artículo, su rol operativo y su matriz inicial de
            abastecimiento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/compras/catalogo">Cancelar</Link>
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || loadingData}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Registrar Artículo Maestro
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* PASO 1: SELECTOR VISUAL DE ARQUETIPOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-bold text-gray-900">
              Paso 1: Selecciona el Arquetipo / Destino Operativo
            </Label>
            <p className="text-xs text-gray-500">
              Determina cómo se comportará este recurso en compras, almacén y servicios.
            </p>
          </div>
          <Badge variant="outline" className="bg-white border-gray-300">
            <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
            Divulgación Progresiva
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ARQUETIPOS.map((arq) => {
            const isSelected = currentDestino === arq.id;
            const Icon = arq.icono;
            return (
              <button
                key={arq.id}
                type="button"
                onClick={() => handleSelectArquetipo(arq)}
                className={`flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? `${arq.colorBorder} ${arq.colorBg} shadow-md ring-2 ring-blue-500/20`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-white shadow-sm text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">{arq.titulo}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{arq.descripcion}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200/60">
                  <span className="text-[11px] font-semibold text-gray-600">{arq.badge}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FORMULARIO PRINCIPAL */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* BLOQUE A: IDENTIDAD FÍSICA Y TÉCNICA (AGNOSTICA) */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Identidad Neutral del Artículo
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Datos de catálogo universales independientes del proveedor que lo suministre.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Categoría Taxonómica del Catálogo */}
              <div className="space-y-1.5">
                <Label htmlFor="id_categoria" className="text-xs font-semibold text-gray-700">
                  Categoría Taxonómica <span className="text-red-500">*</span>
                </Label>
                <HierarchicalCategorySelect
                  id="id_categoria"
                  value={watch('id_categoria')}
                  onChange={(idCat, catObj) => {
                    setValue('id_categoria', idCat);
                    if (idCat) {
                      setValue('id_tipo_componente', idCat);
                    }
                  }}
                  placeholder="Seleccionar familia / subfamilia..."
                />
                {errors.id_tipo_componente && (
                  <p className="text-xs text-red-500">{errors.id_tipo_componente.message}</p>
                )}
              </div>

              {/* Código Interno / SKU Maestro */}
              <div className="space-y-1.5">
                <Label htmlFor="codigo_interno" className="text-xs font-semibold text-gray-700">
                  Código Interno / SKU Maestro (Opcional)
                </Label>
                <Input
                  id="codigo_interno"
                  placeholder="Ej: INS-00452 o HER-00089"
                  {...register('codigo_interno')}
                  className="bg-white font-mono text-sm"
                />
                <p className="text-[11px] text-gray-400">Si se omite, se generará o usará la referencia.</p>
              </div>

              {/* Referencia Neutral del Fabricante */}
              <div className="space-y-1.5">
                <Label htmlFor="referencia_fabricante" className="text-xs font-semibold text-gray-700">
                  Referencia del Fabricante / Modelo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="referencia_fabricante"
                  placeholder="Ej: W712/95, 6PK1195, B-75"
                  {...register('referencia_fabricante')}
                  className="bg-white font-mono font-medium text-sm"
                />
                {errors.referencia_fabricante && (
                  <p className="text-xs text-red-500">{errors.referencia_fabricante.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Marca Neutral con Combobox y Creación In-Context */}
              <div className="space-y-1.5">
                <Label htmlFor="id_marca" className="text-xs font-semibold text-gray-700">
                  Marca del Fabricante
                </Label>
                <ComboboxWithCreate
                  id="id_marca"
                  value={watch('id_marca')}
                  onChange={(idMarca, marcaObj) => {
                    setValue('id_marca', idMarca);
                    setValue('marca', marcaObj ? marcaObj.nombre : '');
                  }}
                  placeholder="Buscar o crear marca (ej: BOSCH)..."
                />
              </div>

              {/* Unidad de Medida Normalizada y Agrupada */}
              <div className="space-y-1.5">
                <Label htmlFor="codigo_unidad_medida" className="text-xs font-semibold text-gray-700">
                  Unidad de Medida
                </Label>
                <UnidadesMedidaSelect
                  id="codigo_unidad_medida"
                  value={watch('codigo_unidad_medida') || 'UND'}
                  onChange={(cod, unidadObj) => {
                    setValue('codigo_unidad_medida', cod);
                    if (unidadObj) {
                      setValue('unidad_medida', unidadObj.nombre);
                    }
                  }}
                />
              </div>

              {/* Tipo Comercial */}
              <div className="space-y-1.5">
                <Label htmlFor="tipo_comercial" className="text-xs font-semibold text-gray-700">
                  Clase Comercial
                </Label>
                <select
                  id="tipo_comercial"
                  {...register('tipo_comercial')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ORIGINAL">Original (OEM)</option>
                  <option value="HOMOLOGADO">Homologado Certificado</option>
                  <option value="GENERICO">Genérico Compatible</option>
                </select>
              </div>
            </div>

            {/* Descripción comercial corta */}
            <div className="space-y-1.5">
              <Label htmlFor="descripcion_corta" className="text-xs font-semibold text-gray-700">
                Título Comercial / Descripción Corta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="descripcion_corta"
                placeholder="Ej: Filtro de Aceite Sintético de Cabina para Generador Diésel"
                {...register('descripcion_corta')}
                className="bg-white text-sm"
              />
              {errors.descripcion_corta && (
                <p className="text-xs text-red-500">{errors.descripcion_corta.message}</p>
              )}
            </div>

            {/* Descripción detallada y notas */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="descripcion_detallada" className="text-xs font-semibold text-gray-700">
                  Especificaciones Técnicas / Dimensiones
                </Label>
                <Textarea
                  id="descripcion_detallada"
                  rows={3}
                  placeholder="Detalles de rosca, micras de filtrado, voltaje, amperaje o tolerancias..."
                  {...register('descripcion_detallada')}
                  className="bg-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notas_instalacion" className="text-xs font-semibold text-gray-700">
                  Notas de Instalación / Precauciones Técnicas
                </Label>
                <Textarea
                  id="notas_instalacion"
                  rows={3}
                  placeholder="Par de apriete, lubricar junta tórica antes de montar, EPP obligatorio..."
                  {...register('notas_instalacion')}
                  className="bg-white text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BLOQUE B: DIVULGACIÓN PROGRESIVA PARA HERRAMIENTAS Y ACTIVOS FIJOS */}
        {currentDestino === 'HERRAMIENTA_ACTIVO' && (
          <Card className="border-2 border-amber-400 bg-amber-50/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <CardHeader className="border-b border-amber-200/60 bg-amber-100/40 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-700" />
                <div>
                  <CardTitle className="text-base font-bold text-amber-900">
                    Control de Herramientas y Activos Propios (MEKANOS)
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800">
                    Campos especializados para trazabilidad física individual, calibración y custodia.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Serial */}
                <div className="space-y-1.5">
                  <Label htmlFor="numero_serie_activo" className="text-xs font-semibold text-amber-900">
                    Número de Serie del Fabricante {requiereSerializacion && <span className="text-red-600">*</span>}
                  </Label>
                  <Input
                    id="numero_serie_activo"
                    placeholder="Ej: SN-FLUKE-87V-2026-09"
                    {...register('numero_serie_activo')}
                    className="bg-white font-mono text-sm border-amber-300 focus:border-amber-500"
                  />
                  {errors.numero_serie_activo && (
                    <p className="text-xs text-red-600">{errors.numero_serie_activo.message}</p>
                  )}
                </div>

                {/* Placa de Inventario */}
                <div className="space-y-1.5">
                  <Label htmlFor="placa_inventario" className="text-xs font-semibold text-amber-900">
                    Placa de Inventario Físico Interno
                  </Label>
                  <Input
                    id="placa_inventario"
                    placeholder="Ej: ACT-MEK-0421"
                    {...register('placa_inventario')}
                    className="bg-white font-mono text-sm border-amber-300 focus:border-amber-500"
                  />
                </div>

                {/* Frecuencia de Calibración */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="frecuencia_mantenimiento_meses"
                    className="text-xs font-semibold text-amber-900"
                  >
                    Frecuencia de Calibración / Mantenimiento
                  </Label>
                  <div className="relative">
                    <Input
                      id="frecuencia_mantenimiento_meses"
                      type="number"
                      min={1}
                      placeholder="Ej: 6 o 12"
                      {...register('frecuencia_mantenimiento_meses')}
                      className="bg-white text-sm pr-16 border-amber-300 focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-medium">meses</span>
                  </div>
                </div>
              </div>

              {/* Switches de Comportamiento */}
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="requiere_serializacion"
                    checked={requiereSerializacion}
                    onCheckedChange={(checked) => setValue('requiere_serializacion', checked)}
                  />
                  <Label htmlFor="requiere_serializacion" className="text-xs font-medium text-gray-800 cursor-pointer">
                    Requiere rastreo individual por serial único
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="es_activo_fijo"
                    checked={watch('es_activo_fijo')}
                    onCheckedChange={(checked) => setValue('es_activo_fijo', checked)}
                  />
                  <Label htmlFor="es_activo_fijo" className="text-xs font-medium text-gray-800 cursor-pointer">
                    Tratar como Activo Fijo contable (Depreciable)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BLOQUE C: ECONOMÍA Y PRECIOS DE VENTA (SI APLICA PARA CLIENTES) */}
        {currentDestino === 'INSUMO_SERVICIO' && (
          <Card className="border border-blue-200 bg-blue-50/20 shadow-sm">
            <CardHeader className="border-b border-blue-100 bg-blue-100/30 pb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-700" />
                <div>
                  <CardTitle className="text-base font-bold text-blue-900">
                    Precios y Márgenes para Servicios a Clientes
                  </CardTitle>
                  <CardDescription className="text-xs text-blue-800">
                    Define los valores comerciales sugeridos para facturación en órdenes de servicio.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="precio_compra" className="text-xs font-semibold text-gray-700">
                    Costo Base de Referencia ($ COP)
                  </Label>
                  <Input
                    id="precio_compra"
                    type="number"
                    min={0}
                    placeholder="Ej: 95000"
                    {...register('precio_compra')}
                    className="bg-white font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="margen_utilidad_porcentaje" className="text-xs font-semibold text-gray-700">
                    Margen Sugerido de Venta (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="margen_utilidad_porcentaje"
                      type="number"
                      step="0.1"
                      min={0}
                      placeholder="Ej: 35.0"
                      {...register('margen_utilidad_porcentaje')}
                      className="bg-white text-sm pr-10"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-medium">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="precio_venta" className="text-xs font-semibold text-gray-700">
                    Precio Sugerido de Venta al Cliente ($ COP)
                  </Label>
                  <Input
                    id="precio_venta"
                    type="number"
                    min={0}
                    placeholder="Ej: 145000"
                    {...register('precio_venta')}
                    className="bg-white font-mono font-bold text-sm text-blue-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BLOQUE D: STOCK Y GESTIÓN DE BODEGA */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-700" />
              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  Parámetros de Stock y Almacén
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Umbrales mínimos de reposición y stock físico inicial.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="stock_minimo" className="text-xs font-semibold text-gray-700">
                  Stock Mínimo para Alerta de Reabastecimiento
                </Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  min={0}
                  {...register('stock_minimo')}
                  className="bg-white text-sm"
                />
                <p className="text-[11px] text-gray-400">
                  Cuando el inventario caiga por debajo de esta cifra, el sistema alertará para compra.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock_actual" className="text-xs font-semibold text-gray-700">
                  Stock Inicial en Bodega
                </Label>
                <Input
                  id="stock_actual"
                  type="number"
                  min={0}
                  {...register('stock_actual')}
                  className="bg-white text-sm font-medium"
                />
                <p className="text-[11px] text-gray-400">Cantidad física ya existente en taller/bodega.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BLOQUE E: MATRIZ DINÁMICA DE FUENTES DE SUMINISTRO (CROSS-REFERENCING) */}
        {esComprable && (
          <Card className="border border-indigo-200 shadow-sm bg-white">
            <CardHeader className="border-b border-indigo-100 bg-indigo-50/40 pb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-indigo-600" />
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">
                      Matriz Inicial de Proveedores y Referencias Cruzadas
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Registra los proveedores que venden este artículo con sus códigos específicos y costos.
                    </CardDescription>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendProveedor({
                      id_proveedor: proveedores[0]?.id_proveedor || 1,
                      referencia_proveedor: '',
                      marca_ofrecida: '',
                      id_marca_ofrecida: null,
                      costo_actual: 0,
                      moneda: 'COP',
                      tiempo_entrega_dias: 1,
                      cantidad_minima_compra: 1,
                      es_proveedor_preferido: proveedorFields.length === 0,
                      escalas_precios: [],
                    })
                  }
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  + Añadir Proveedor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {proveedorFields.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center bg-gray-50/40">
                  <Truck className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No has agregado fuentes de suministro iniciales
                  </p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                    Puedes agregar uno o varios proveedores ahora para registrar el costo inicial, o
                    vincularlos más adelante desde la Ficha 360° del recurso.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendProveedor({
                        id_proveedor: proveedores[0]?.id_proveedor || 1,
                        referencia_proveedor: '',
                        marca_ofrecida: '',
                        id_marca_ofrecida: null,
                        costo_actual: 0,
                        moneda: 'COP',
                        tiempo_entrega_dias: 1,
                        cantidad_minima_compra: 1,
                        es_proveedor_preferido: true,
                        escalas_precios: [],
                      })
                    }
                    className="mt-4 text-xs font-semibold"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Vincular Primer Proveedor
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {proveedorFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-gray-200 p-4 bg-gray-50/30 space-y-4 transition-all"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            Fuente de Suministro #{index + 1}
                          </span>
                          {watch(`proveedores_iniciales.${index}.es_proveedor_preferido`) && (
                            <Badge className="bg-amber-500 text-white text-[10px]">
                              Proveedor Preferido
                            </Badge>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProveedor(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Quitar
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {/* Selector de proveedor */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-700">
                            Proveedor <span className="text-red-500">*</span>
                          </Label>
                          <select
                            {...register(`proveedores_iniciales.${index}.id_proveedor`)}
                            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none h-10"
                          >
                            {proveedores.map((p) => (
                              <option key={p.id_proveedor} value={p.id_proveedor}>
                                {p.persona?.nombre_comercial || p.persona?.razon_social || `Proveedor #${p.id_proveedor}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Marca ofrecida por el proveedor */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-700">
                            Marca Ofrecida
                          </Label>
                          <ComboboxWithCreate
                            value={watch(`proveedores_iniciales.${index}.id_marca_ofrecida`)}
                            onChange={(idM, mObj) => {
                              setValue(`proveedores_iniciales.${index}.id_marca_ofrecida`, idM);
                              setValue(`proveedores_iniciales.${index}.marca_ofrecida`, mObj ? mObj.nombre : '');
                            }}
                            placeholder="Marca provista..."
                          />
                        </div>

                        {/* SKU del proveedor */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-700">
                            SKU / Ref. del Proveedor <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Ej: FLT-MN-712"
                            {...register(`proveedores_iniciales.${index}.referencia_proveedor`)}
                            className="bg-white font-mono text-xs h-10"
                          />
                        </div>

                        {/* Costo negociado */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-700">
                            Costo Compra ($ COP) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Ej: 85000"
                            {...register(`proveedores_iniciales.${index}.costo_actual`)}
                            className="bg-white font-mono font-bold text-xs h-10 text-emerald-700"
                          />
                        </div>

                        {/* Tiempo entrega */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-700">
                            Tiempo Entrega (Días)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Ej: 1"
                            {...register(`proveedores_iniciales.${index}.tiempo_entrega_dias`)}
                            className="bg-white text-xs h-10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`pref-${index}`}
                            checked={watch(`proveedores_iniciales.${index}.es_proveedor_preferido`)}
                            onCheckedChange={(checked) => {
                              // Desmarcar los demás si se marca este
                              if (checked) {
                                proveedorFields.forEach((_, i) => {
                                  setValue(`proveedores_iniciales.${i}.es_proveedor_preferido`, i === index);
                                });
                              } else {
                                setValue(`proveedores_iniciales.${index}.es_proveedor_preferido`, false);
                              }
                            }}
                          />
                          <Label htmlFor={`pref-${index}`} className="text-xs text-gray-700 cursor-pointer">
                            Definir como fuente de suministro preferida
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* BOTÓN FINAL DE GUARDAR */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" asChild>
            <Link href="/compras/catalogo">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || loadingData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm"
          >
            {isSubmitting ? 'Guardando en Base de Datos...' : 'Crear Recurso en Catálogo Maestro'}
          </Button>
        </div>
      </form>
    </div>
  );
}
