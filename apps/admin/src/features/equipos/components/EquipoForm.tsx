/**
 * WIZARD DINÁMICO DE REGISTRO DE EQUIPOS EAM UNIVERSAL (FASE 4) - MEKANOS S.A.S
 *
 * - Paso 1: Selección Dinámica del Tipo de Equipo (desde el Hub EAM) +
 *           Plantilla de Modelo de Fábrica (OEM) con herencia de Kit de Repuestos (BOM WMS)
 * - Paso 2: Identificación, Ubicación, Código inteligente por prefijo y
 *           Planes de Mantenimiento Preventivo Heredados del Tipo de Equipo
 * - Paso 3: Ficha Técnica Modular Dinámica con Conversión de Unidades SI en Vivo (y = ax + b)
 *           y Persistencia Dual (JSONB + Tablas Satélite + Índice B-Tree + Matriz BOM)
 */

'use client';

import {
  getCriterioIntervaloHumano,
  getRolBomHumano,
  useArquetipoEsquemaEam,
  useArquetiposEam,
  useModelosOemEam,
  type ArquetipoEquipo,
} from '@/features/catalogos-eam';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Droplets,
  Factory,
  Loader2,
  PackageCheck,
  Paintbrush,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch, type Path } from 'react-hook-form';
import { z } from 'zod';
import {
  useClientesSelector,
  useSedesSelector,
  useTiposEquipoSelector,
} from '../hooks/use-equipos-form-data';
import { useCrearEquipo } from '../lib/equipos.service';
import type { CreateEquipoPayload, TipoEquipo } from '../types';
import { ConfigParametros, ConfigParametrosEditor } from './ConfigParametrosEditor';
import { DynamicModularSpecsEditor } from './DynamicModularSpecsEditor';

// ═══════════════════════════════════════════════════════════════════════════════
// ESQUEMA DE VALIDACIÓN (ZOD) - PASO 2 (IDENTIFICACIÓN Y OPERACIÓN)
// ═══════════════════════════════════════════════════════════════════════════════

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}, z.number().optional());

const optionalDate = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  return val;
}, z.string().optional());

const requiredNumber = (msg: string) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number({ message: msg }).min(1, msg));

const datosEquipoBaseSchema = z.object({
  codigo_equipo: z.string().min(1, 'Código de inventario requerido').max(50),
  id_cliente: requiredNumber('Seleccione un cliente propietario'),
  id_tipo_equipo: requiredNumber('Seleccione un tipo de equipo en el Paso 1'),
  id_sede: optionalNumber,
  nombre_equipo: z.string().max(200).optional().or(z.literal('')),
  numero_serie_equipo: z.string().max(100).optional().or(z.literal('')),
  ubicacion_texto: z
    .string()
    .min(3, 'Ubicación física requerida (mín. 3 caracteres)')
    .max(1000),
  estado_equipo: z.enum([
    'OPERATIVO',
    'STANDBY',
    'INACTIVO',
    'EN_REPARACION',
    'FUERA_SERVICIO',
    'BAJA',
  ]),
  criticidad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  criticidad_justificacion: z.string().optional(),
  fecha_instalacion: optionalDate,
  fecha_inicio_servicio_mekanos: optionalDate,
  en_garantia: z.boolean(),
  fecha_inicio_garantia: optionalDate,
  fecha_fin_garantia: optionalDate,
  proveedor_garantia: z.string().optional(),
  horas_actuales: optionalNumber,
  fecha_ultima_lectura_horas: optionalDate,
  estado_pintura: z
    .enum(['EXCELENTE', 'BUENO', 'REGULAR', 'MALO', 'NO_APLICA'])
    .optional(),
  requiere_pintura: z.boolean(),
  tipo_contrato: z
    .enum(['SIN_CONTRATO', 'PREVENTIVO', 'INTEGRAL', 'POR_LLAMADA'])
    .optional(),
  intervalo_tipo_a_dias_override: optionalNumber,
  intervalo_tipo_a_horas_override: optionalNumber,
  intervalo_tipo_b_dias_override: optionalNumber,
  intervalo_tipo_b_horas_override: optionalNumber,
  criterio_intervalo_override: z
    .enum(['DIAS', 'HORAS', 'LO_QUE_OCURRA_PRIMERO'])
    .optional(),
  observaciones_generales: z.string().optional(),
  configuracion_especial: z.string().optional(),
});

const equipoFormSchema = z.object({
  tipo: z.string().min(1),
  datosEquipo: datosEquipoBaseSchema,
});

type EquipoFormData = z.infer<typeof equipoFormSchema>;

export interface PlanPreventivoHeredadoState {
  id_plan: number;
  id_tipo_servicio: number;
  nombre_plan: string;
  codigo_servicio?: string;
  activo: boolean;
  frecuencia_dias: number | '';
  frecuencia_uso: number | '';
  criterio_intervalo: 'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO';
}

// Icono y estilo visual según el código del tipo de equipo
function getTipoVisualConfig(codigoTipo: string) {
  const norm = (codigoTipo || '').toUpperCase();
  if (norm.includes('GEN')) {
    return {
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      ring: 'border-amber-500 bg-amber-50/30 ring-4 ring-amber-100/70',
      prefijo: 'GEN',
      ubicacionDefecto: 'CUARTO DE PLANTAS ELÉCTRICAS / SUBESTACIÓN',
    };
  }
  if (norm.includes('BOM')) {
    return {
      icon: Droplets,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      ring: 'border-blue-600 bg-blue-50/30 ring-4 ring-blue-100/70',
      prefijo: 'BOM',
      ubicacionDefecto: 'CUARTO DE BOMBAS HIDRÁULICAS',
    };
  }
  if (norm.includes('COMP')) {
    return {
      icon: Wind,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 border-cyan-200',
      ring: 'border-cyan-600 bg-cyan-50/30 ring-4 ring-cyan-100/70',
      prefijo: 'COMP',
      ubicacionDefecto: 'CUARTO DE COMPRESORES / ÁREA INDUSTRIAL',
    };
  }
  if (norm.includes('MOT')) {
    return {
      icon: Settings,
      color: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-200',
      ring: 'border-violet-600 bg-violet-50/30 ring-4 ring-violet-100/70',
      prefijo: 'MOT',
      ubicacionDefecto: 'ÁREA DE PRODUCCIÓN / MÁQUINAS',
    };
  }
  return {
    icon: Cpu,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    ring: 'border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-100/70',
    prefijo: norm.slice(0, 4) || 'EQP',
    ubicacionDefecto: 'INSTALACIONES DEL CLIENTE',
  };
}

export function EquipoForm({
  onSuccess,
  onCancel,
  clientePreseleccionado,
}: {
  onSuccess?: (data: unknown) => void;
  onCancel?: () => void;
  clientePreseleccionado?: number;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedArquetipoId, setSelectedArquetipoId] = useState<number | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('GENERADOR');

  // Estado de Plantilla OEM y Kit BOM (Paso 1)
  const [selectedModeloOemId, setSelectedModeloOemId] = useState<number | null>(null);
  const [vincularKitBom, setVincularKitBom] = useState<boolean>(true);

  // Estado de Especificaciones Modulares Dinámicas (Paso 3)
  const [modulosValues, setModulosValues] = useState<Record<string, Record<string, any>>>({});
  const [origenAtributos, setOrigenAtributos] = useState<Record<string, 'MODELO' | 'CUSTOM'>>({});
  const [unidadesPersonalizadas, setUnidadesPersonalizadas] = useState<Record<string, string>>({});

  // Estado de Planes Preventivos Heredados (Paso 2)
  const [planesHeredados, setPlanesHeredados] = useState<PlanPreventivoHeredadoState[]>([]);

  // Parámetros personalizados opcionales
  const [configParametros, setConfigParametros] = useState<ConfigParametros>({});
  const [showParametrosAvanzados, setShowParametrosAvanzados] = useState(false);

  // Selector buscable de cliente
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const clienteComboRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clienteComboRef.current && !clienteComboRef.current.contains(e.target as Node)) {
        setClienteDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const crearEquipoMutation = useCrearEquipo();

  // Consultas al Hub EAM y selectores base
  const { data: arquetiposHub, isLoading: loadingArquetipos } = useArquetiposEam();
  const { data: tiposEquipoLegacy } = useTiposEquipoSelector();
  const { data: clientesOptions } = useClientesSelector();

  // Lista de Tipos de Equipo del Hub (con respaldo si aún carga)
  const arquetiposDisponibles = useMemo<ArquetipoEquipo[]>(() => {
    if (arquetiposHub && arquetiposHub.length > 0) {
      return arquetiposHub.filter((a) => a.activo !== false);
    }
    return [
      {
        id_tipo_equipo: 1,
        codigo_tipo: 'GENERADOR',
        codigo_corto: 'GEN',
        nombre_tipo: 'Generador Eléctrico / Planta de Emergencia',
        nombre_canonico: 'Generador Eléctrico / Planta de Emergencia',
        descripcion: 'Grupos electrógenos con motor de combustión y alternador síncrono.',
        requiere_horometro: true,
        activo: true,
        tipo_equipo_modulos: [],
        tipo_equipo_planes: [],
        _count: { equipos: 0, modelos_equipo: 0 },
      },
      {
        id_tipo_equipo: 2,
        codigo_tipo: 'BOMBA',
        codigo_corto: 'BOM',
        nombre_tipo: 'Bomba Hidráulica / Sistema de Bombeo',
        nombre_canonico: 'Bomba Hidráulica / Sistema de Bombeo',
        descripcion: 'Sistemas hidroneumáticos, presión constante, achique y RCI.',
        requiere_horometro: false,
        activo: true,
        tipo_equipo_modulos: [],
        tipo_equipo_planes: [],
        _count: { equipos: 0, modelos_equipo: 0 },
      },
      {
        id_tipo_equipo: 3,
        codigo_tipo: 'MOTOR',
        codigo_corto: 'MOT',
        nombre_tipo: 'Motor Industrial (Combustión / Eléctrico)',
        nombre_canonico: 'Motor Industrial (Combustión / Eléctrico)',
        descripcion: 'Motores diésel o eléctricos de accionamiento independiente.',
        requiere_horometro: true,
        activo: true,
        tipo_equipo_modulos: [],
        tipo_equipo_planes: [],
        _count: { equipos: 0, modelos_equipo: 0 },
      },
      {
        id_tipo_equipo: 11,
        codigo_tipo: 'COMPRESOR',
        codigo_corto: 'COMP',
        nombre_tipo: 'Compresor de Aire Industrial',
        nombre_canonico: 'Compresor de Aire Industrial',
        descripcion: 'Compresores de pistón o tornillo con motor eléctrico y tanque.',
        requiere_horometro: true,
        activo: true,
        tipo_equipo_modulos: [],
        tipo_equipo_planes: [],
        _count: { equipos: 0, modelos_equipo: 0 },
      },
    ];
  }, [arquetiposHub]);

  // Seleccionar el primer arquetipo por defecto cuando carga el Hub
  useEffect(() => {
    if (!selectedArquetipoId && arquetiposDisponibles.length > 0) {
      const def =
        arquetiposDisponibles.find((a) => a.codigo_tipo.toUpperCase().includes('GEN')) ||
        arquetiposDisponibles[0];
      setSelectedArquetipoId(def.id_tipo_equipo);
      setTipoSeleccionado(def.codigo_tipo.toUpperCase());
    }
  }, [arquetiposDisponibles, selectedArquetipoId]);

  const selectedArquetipo = useMemo(
    () =>
      arquetiposDisponibles.find((a) => a.id_tipo_equipo === selectedArquetipoId) ||
      arquetiposDisponibles[0] ||
      null,
    [arquetiposDisponibles, selectedArquetipoId],
  );

  // Esquema modular y Modelos de Fábrica (OEM) del Tipo de Equipo seleccionado
  const { data: esquemaArquetipo } = useArquetipoEsquemaEam(selectedArquetipo?.id_tipo_equipo || null);
  const { data: modelosOem } = useModelosOemEam(selectedArquetipo?.id_tipo_equipo);

  const selectedModeloOem = useMemo(
    () => modelosOem?.find((m) => m.id_modelo_equipo === selectedModeloOemId) || null,
    [modelosOem, selectedModeloOemId],
  );

  const form = useForm<EquipoFormData>({
    // @ts-expect-error - Resolver complex preprocess types
    resolver: zodResolver(equipoFormSchema),
    defaultValues: {
      tipo: 'GENERADOR',
      datosEquipo: {
        codigo_equipo: '',
        id_cliente: clientePreseleccionado || 0,
        id_tipo_equipo: 1,
        id_sede: undefined,
        nombre_equipo: '',
        numero_serie_equipo: '',
        ubicacion_texto: 'CUARTO DE PLANTAS ELÉCTRICAS / SUBESTACIÓN',
        estado_equipo: 'OPERATIVO',
        criticidad: 'MEDIA',
        en_garantia: false,
        requiere_pintura: false,
        estado_pintura: 'BUENO',
        tipo_contrato: 'SIN_CONTRATO',
      },
    },
  });

  const {
    setValue,
    getValues,
    register,
    formState: { errors },
    control,
    trigger,
    handleSubmit,
  } = form;

  const idCliente = useWatch({ control, name: 'datosEquipo.id_cliente' });
  const enGarantia = useWatch({ control, name: 'datosEquipo.en_garantia' });
  const { data: sedesOptions, isLoading: loadingSedes } = useSedesSelector(idCliente || 0);

  // Sincronizar id_tipo_equipo, tipo y planes preventivos al cambiar el Tipo de Equipo
  useEffect(() => {
    if (!selectedArquetipo) return;

    const codeNorm = (selectedArquetipo.codigo_tipo || 'GENERADOR').toUpperCase();
    setValue('tipo', codeNorm);

    // Resolver id_tipo_equipo compatible con tabla tipos_equipo
    let resolvedId = selectedArquetipo.id_tipo_equipo;
    if (tiposEquipoLegacy && tiposEquipoLegacy.length > 0) {
      const matchLegacy = tiposEquipoLegacy.find(
        (t) =>
          Number(t.value) === selectedArquetipo.id_tipo_equipo ||
          t.label.toUpperCase().includes(codeNorm),
      );
      if (matchLegacy) {
        resolvedId = Number(matchLegacy.value);
      }
    }
    setValue('datosEquipo.id_tipo_equipo', resolvedId);

    // Ubicación sugerida por defecto si no se ha personalizado
    const ubiActual = getValues('datosEquipo.ubicacion_texto');
    const esUbicacionDefecto =
      !ubiActual ||
      ubiActual.startsWith('CUARTO DE') ||
      ubiActual.startsWith('ÁREA DE') ||
      ubiActual.startsWith('INSTALACIONES');
    if (esUbicacionDefecto) {
      const cfg = getTipoVisualConfig(codeNorm);
      setValue('datosEquipo.ubicacion_texto', cfg.ubicacionDefecto);
    }

    // Cargar Planes Preventivos Heredados desde el arquetipo
    const planesRaw =
      selectedArquetipo.tipo_equipo_planes && selectedArquetipo.tipo_equipo_planes.length > 0
        ? selectedArquetipo.tipo_equipo_planes
        : esquemaArquetipo?.planes_mantenimiento || [];

    const planesMapeados: PlanPreventivoHeredadoState[] = planesRaw.map((p: any) => ({
      id_plan: p.id_plan,
      id_tipo_servicio: p.id_tipo_servicio,
      nombre_plan:
        p.nombre_plan || p.tipo_servicio?.nombre_tipo || p.nombre_servicio || 'Plan Preventivo',
      codigo_servicio: p.tipo_servicio?.codigo_tipo || '',
      activo: p.activo !== false,
      frecuencia_dias: p.frecuencia_dias ? Number(p.frecuencia_dias) : '',
      frecuencia_uso: p.frecuencia_uso ? Number(p.frecuencia_uso) : '',
      criterio_intervalo:
        (p.criterio_intervalo as PlanPreventivoHeredadoState['criterio_intervalo']) ||
        'LO_QUE_OCURRA_PRIMERO',
    }));
    setPlanesHeredados(planesMapeados);
  }, [selectedArquetipo, esquemaArquetipo, tiposEquipoLegacy, setValue, getValues]);

  // Inicializar valores por defecto del esquema cuando cambia el Tipo de Equipo (si no hay modelo OEM)
  useEffect(() => {
    if (!esquemaArquetipo || selectedModeloOemId) return;

    setModulosValues((prev) => {
      const next = { ...prev };
      for (const mod of esquemaArquetipo.modulos) {
        if (!next[mod.codigo_modulo]) next[mod.codigo_modulo] = {};
        for (const grp of mod.grupos) {
          for (const attr of grp.atributos) {
            if (
              next[mod.codigo_modulo][attr.codigo_atributo] === undefined &&
              attr.valor_defecto !== null &&
              attr.valor_defecto !== undefined &&
              attr.valor_defecto !== ''
            ) {
              const isNum =
                attr.tipo_control.includes('NUMERICO') && !Number.isNaN(Number(attr.valor_defecto));
              next[mod.codigo_modulo][attr.codigo_atributo] = isNum
                ? Number(attr.valor_defecto)
                : attr.valor_defecto;
            }
          }
        }
      }
      return next;
    });
  }, [esquemaArquetipo, selectedModeloOemId]);

  // Pre-llenar Ficha Técnica cuando el usuario selecciona un Modelo de Fábrica (OEM) en el Paso 1
  const handleSelectModeloOem = useCallback(
    (idModeloStr: string) => {
      if (!idModeloStr) {
        setSelectedModeloOemId(null);
        setOrigenAtributos({});
        return;
      }

      const idMod = Number(idModeloStr);
      setSelectedModeloOemId(idMod);
      setVincularKitBom(true);

      const modelo = modelosOem?.find((m) => m.id_modelo_equipo === idMod);
      if (!modelo) return;

      const specsBase = (modelo.especificaciones_base || {}) as Record<string, any>;
      const rawModulos =
        specsBase.modulos && typeof specsBase.modulos === 'object'
          ? (specsBase.modulos as Record<string, Record<string, any>>)
          : null;

      const nuevosModulos: Record<string, Record<string, any>> = {};
      const nuevosOrigenes: Record<string, 'MODELO' | 'CUSTOM'> = {};

      if (rawModulos) {
        for (const [codMod, vals] of Object.entries(rawModulos)) {
          if (vals && typeof vals === 'object') {
            nuevosModulos[codMod] = { ...vals };
            for (const [k, v] of Object.entries(vals)) {
              if (v !== null && v !== undefined && v !== '') {
                nuevosOrigenes[k] = 'MODELO';
              }
            }
          }
        }
      } else if (esquemaArquetipo) {
        // Si especificaciones_base es un objeto plano, distribuir en los módulos del esquema
        for (const mod of esquemaArquetipo.modulos) {
          nuevosModulos[mod.codigo_modulo] = {};
          for (const grp of mod.grupos) {
            for (const attr of grp.atributos) {
              const val = specsBase[attr.codigo_atributo];
              if (val !== undefined && val !== null && val !== '') {
                nuevosModulos[mod.codigo_modulo][attr.codigo_atributo] = val;
                nuevosOrigenes[attr.codigo_atributo] = 'MODELO';
              }
            }
          }
        }
      }

      setModulosValues(nuevosModulos);
      setOrigenAtributos(nuevosOrigenes);

      // Sugerir nombre comercial del activo si está vacío
      if (!getValues('datosEquipo.nombre_equipo')) {
        const sugerido =
          modelo.nombre_comercial || `${modelo.marca} ${modelo.modelo}`;
        setValue('datosEquipo.nombre_equipo', sugerido);
      }

      toast({
        title: '⚡ Plantilla de fábrica cargada',
        description: `Se pre-llenaron ${Object.keys(nuevosOrigenes).length} campos técnicos del modelo ${modelo.marca} ${modelo.modelo}.`,
      });
    },
    [modelosOem, esquemaArquetipo, getValues, setValue, toast],
  );

  // Generador inteligente de Código de Inventario usando el prefijo del Tipo de Equipo
  const generarCodigoAutomatico = () => {
    const cfg = getTipoVisualConfig(selectedArquetipo?.codigo_tipo || tipoSeleccionado);
    const prefijo =
      selectedArquetipo?.codigo_corto?.toUpperCase() || cfg.prefijo || 'EQP';

    const clienteId = getValues('datosEquipo.id_cliente');
    let clientePrefijo = 'CLI';
    if (clienteId && clientesOptions) {
      const clienteSel = clientesOptions.find((c) => c.value === String(clienteId));
      if (clienteSel) {
        clientePrefijo =
          clienteSel.label
            .replace(/[^A-Za-z]/g, '')
            .substring(0, 4)
            .toUpperCase() || 'CLI';
      }
    }

    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    const codigoGenerado = `${prefijo}-${clientePrefijo}-${timestamp}${random}`;

    setValue('datosEquipo.codigo_equipo', codigoGenerado, { shouldValidate: true });
    toast({
      title: '✨ Código generado',
      description: `Código asignado: ${codigoGenerado}`,
    });
  };

  // Handlers de edición en Paso 3
  const handleChangeSpecValor = useCallback(
    (
      codigoModulo: string,
      codigoAtributo: string,
      nuevoValor: any,
      origen: 'MODELO' | 'CUSTOM' = 'CUSTOM',
    ) => {
      setModulosValues((prev) => ({
        ...prev,
        [codigoModulo]: {
          ...(prev[codigoModulo] || {}),
          [codigoAtributo]: nuevoValor,
        },
      }));
      setOrigenAtributos((prev) => ({
        ...prev,
        [codigoAtributo]: origen,
      }));
    },
    [],
  );

  const handleChangeSpecUnidad = useCallback(
    (
      codigoModulo: string,
      codigoAtributo: string,
      nuevaUnidad: string,
      valorConvertido?: number,
    ) => {
      setUnidadesPersonalizadas((prev) => ({
        ...prev,
        [codigoAtributo]: nuevaUnidad,
      }));
      if (valorConvertido !== undefined && Number.isFinite(valorConvertido)) {
        setModulosValues((prev) => ({
          ...prev,
          [codigoModulo]: {
            ...(prev[codigoModulo] || {}),
            [codigoAtributo]: valorConvertido,
          },
        }));
        setOrigenAtributos((prev) => ({
          ...prev,
          [codigoAtributo]: 'CUSTOM',
        }));
      }
    },
    [],
  );

  // Avance validado entre pasos
  const nextStep = async (step: number) => {
    if (step === 1) {
      if (!selectedArquetipo) {
        toast({
          title: 'Seleccione un Tipo de Equipo',
          description: 'Elija la clase de activo antes de continuar.',
          variant: 'destructive',
        });
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      const fieldsToValidate: Path<EquipoFormData>[] = [
        'datosEquipo.id_cliente',
        'datosEquipo.codigo_equipo',
        'datosEquipo.id_tipo_equipo',
        'datosEquipo.ubicacion_texto',
        'datosEquipo.estado_equipo',
        'datosEquipo.criticidad',
      ];
      const isValid = await trigger(fieldsToValidate);
      if (isValid) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Submit final del Wizard (Frente 4.2: JSONB + Satélites + B-Tree + Kit BOM OEM)
  const handleFormSubmit = async (formData: EquipoFormData) => {
    // Sincronizar overrides de planes preventivos Tipo A / Tipo B hacia datosEquipo
    const planA = planesHeredados.find(
      (p) =>
        p.activo &&
        (p.codigo_servicio?.includes('PREV_A') || p.nombre_plan.toUpperCase().includes('TIPO A')),
    ) || planesHeredados.find((p) => p.activo);

    const planB = planesHeredados.find(
      (p) =>
        p.activo &&
        (p.codigo_servicio?.includes('PREV_B') || p.nombre_plan.toUpperCase().includes('TIPO B')),
    );

    const datosEquipoFinal = {
      ...formData.datosEquipo,
      intervalo_tipo_a_dias_override:
        planA && planA.frecuencia_dias !== '' ? Number(planA.frecuencia_dias) : undefined,
      intervalo_tipo_a_horas_override:
        planA && planA.frecuencia_uso !== '' ? Number(planA.frecuencia_uso) : undefined,
      intervalo_tipo_b_dias_override:
        planB && planB.frecuencia_dias !== '' ? Number(planB.frecuencia_dias) : undefined,
      intervalo_tipo_b_horas_override:
        planB && planB.frecuencia_uso !== '' ? Number(planB.frecuencia_uso) : undefined,
      criterio_intervalo_override: planA?.criterio_intervalo || undefined,
    };

    const payload: CreateEquipoPayload = {
      tipo: (selectedArquetipo?.codigo_tipo || tipoSeleccionado || 'GENERADOR').toUpperCase(),
      datosEquipo: datosEquipoFinal as any,
      especificaciones: {
        _version: 1,
        modulos: modulosValues,
        origen_atributos: origenAtributos,
        unidades_personalizadas: unidadesPersonalizadas,
      },
      id_modelo_equipo: selectedModeloOemId || undefined,
      vincular_kit_bom: Boolean(selectedModeloOemId && vincularKitBom),
      planes_preventivos_override: planesHeredados
        .filter((p) => p.activo)
        .map((p) => ({
          id_tipo_servicio: p.id_tipo_servicio,
          nombre_plan: p.nombre_plan,
          frecuencia_dias: p.frecuencia_dias === '' ? null : Number(p.frecuencia_dias),
          frecuencia_uso: p.frecuencia_uso === '' ? null : Number(p.frecuencia_uso),
          criterio_intervalo: p.criterio_intervalo,
          activo: p.activo,
        })),
      config_parametros:
        Object.keys(configParametros).length > 0 ? configParametros : undefined,
    };

    try {
      const result = await crearEquipoMutation.mutateAsync(payload);
      if (result.success) {
        toast({
          title: '✅ Equipo registrado exitosamente',
          description: `El activo ${result.data?.codigo_equipo || datosEquipoFinal.codigo_equipo} ya está indexado en el directorio universal.`,
        });
        if (onSuccess) onSuccess(result.data);
      } else {
        toast({
          title: '❌ Error del servidor',
          description: result.error || 'No se pudo completar el registro del equipo',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const apiError = error?.response?.data?.message;
      const detailed = Array.isArray(apiError) ? apiError.join('\n') : apiError;
      let friendly = detailed || error?.message || 'Error inesperado al registrar equipo';
      if (friendly.includes('Ya existe un equipo con el código')) {
        friendly =
          'Este código de inventario ya está en uso. Haz clic en "✨ Generar" en el Paso 2 para asignar uno nuevo.';
      }
      toast({
        title: '❌ Error al registrar equipo',
        description: friendly,
        variant: 'destructive',
      });
    }
  };

  const kitBomItems = selectedModeloOem?.modelos_equipo_bom || [];

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit as never)}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Resumen de errores de validación si existen */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <p className="font-bold text-sm">
              Por favor revisa los campos obligatorios marcados en el Paso 2:
            </p>
          </div>
          <ul className="space-y-1 text-xs font-semibold list-disc list-inside">
            {errors.datosEquipo &&
              Object.entries(errors.datosEquipo).map(([k, v]: [string, any]) => (
                <li key={k}>{v?.message || `Campo requerido: ${k}`}</li>
              ))}
          </ul>
        </div>
      )}

      {/* Barra de Progreso de 3 Pasos */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
        {[
          {
            step: 1,
            title: '1. Tipo de Equipo y Plantilla OEM',
            sub: selectedArquetipo?.nombre_canonico || selectedArquetipo?.nombre_tipo || 'Seleccionar clase',
          },
          {
            step: 2,
            title: '2. Identificación, Ubicación y Planes',
            sub: 'Cliente, código y preventivos heredados',
          },
          {
            step: 3,
            title: '3. Ficha Técnica Modular',
            sub: 'Partes, subsistemas y unidades SI',
          },
        ].map((item) => {
          const isCurrent = currentStep === item.step;
          const isDone = currentStep > item.step;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                if (item.step < currentStep) setCurrentStep(item.step);
              }}
              className={cn(
                'text-left p-3 rounded-xl border transition-all flex items-center gap-3',
                isCurrent
                  ? 'bg-white border-blue-500 shadow-2xs ring-2 ring-blue-100'
                  : isDone
                    ? 'bg-blue-50/50 border-blue-200 cursor-pointer hover:bg-blue-50'
                    : 'bg-transparent border-transparent opacity-60 cursor-default',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0',
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600',
                )}
              >
                {isDone ? '✓' : item.step}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-xs font-extrabold truncate',
                    isCurrent ? 'text-blue-950' : 'text-slate-700',
                  )}
                >
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                  {item.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          PASO 1: SELECCIÓN DINÁMICA DE TIPO DE EQUIPO + PLANTILLA DE MODELO OEM
          ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                1. Selecciona el Tipo de Equipo Industrial
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Las tarjetas se cargan dinámicamente desde el Catálogo de Equipos y Fichas Técnicas. Al elegir una clase, el sistema preparará sus partes, subsistemas y planes preventivos.
              </p>
            </div>

            {loadingArquetipos ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Cargando Tipos de Equipo del Hub EAM...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {arquetiposDisponibles.map((arq) => {
                  const isSelected = arq.id_tipo_equipo === selectedArquetipo?.id_tipo_equipo;
                  const cfg = getTipoVisualConfig(arq.codigo_tipo);
                  const Icon = cfg.icon;
                  const numPartes = arq.tipo_equipo_modulos?.length || 0;
                  const numModelos = arq._count?.modelos_equipo || 0;

                  return (
                    <button
                      key={arq.id_tipo_equipo}
                      type="button"
                      onClick={() => {
                        setSelectedArquetipoId(arq.id_tipo_equipo);
                        setTipoSeleccionado(arq.codigo_tipo.toUpperCase());
                        setSelectedModeloOemId(null);
                        setModulosValues({});
                        setOrigenAtributos({});
                      }}
                      className={cn(
                        'text-left p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 cursor-pointer',
                        isSelected
                          ? cfg.ring
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                      )}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className={cn('p-2.5 rounded-xl border', cfg.bg)}>
                            <Icon className={cn('h-5 w-5', cfg.color)} />
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Prefijo: {arq.codigo_corto || cfg.prefijo}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                            {arq.nombre_canonico || arq.nombre_tipo}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {arq.descripcion || 'Clase de activo gobernada en el Hub EAM'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>{numPartes > 0 ? `${numPartes} partes` : 'Ficha modular'}</span>
                        {numModelos > 0 && (
                          <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
                            {numModelos} modelos OEM
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* BLOQUE 1.2: ⚡ Pre-llenar con Modelo de Fábrica (Opcional) + Herencia Kit BOM */}
          {selectedArquetipo && (
            <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-2xs">
                    <Factory className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                      ⚡ Pre-llenar con Modelo de Fábrica (Opcional)
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Ahorra 80% de digitación
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-800/80 mt-0.5">
                      Si el equipo corresponde a un modelo comercial conocido, selecciónalo para pre-cargar automáticamente sus especificaciones técnicas y su Kit de Repuestos (BOM).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-indigo-950 mb-1.5">
                    Plantilla de Modelo Comercial para {selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}
                  </label>
                  <select
                    value={selectedModeloOemId || ''}
                    onChange={(e) => handleSelectModeloOem(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">
                      — Registrar desde cero (sin plantilla de modelo de fábrica) —
                    </option>
                    {(modelosOem || []).map((m) => (
                      <option key={m.id_modelo_equipo} value={m.id_modelo_equipo}>
                        🏭 {m.marca} — {m.modelo}{' '}
                        {m.nombre_comercial ? `(${m.nombre_comercial})` : ''} • [
                        {m.modelos_equipo_bom?.length || m._count?.modelos_equipo_bom || 0} repuestos BOM]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Si eligió un modelo OEM, mostrar resumen + Checkbox de Herencia de Kit BOM */}
                {selectedModeloOem && (
                  <div className="md:col-span-6 bg-white p-4 rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {selectedModeloOem.marca} {selectedModeloOem.modelo}
                        </span>
                        {selectedModeloOem.nombre_comercial && (
                          <p className="text-[11px] text-slate-500">
                            {selectedModeloOem.nombre_comercial}
                          </p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Ficha pre-cargada
                      </span>
                    </div>

                    {/* Checkbox de Herencia Automática de Kit BOM */}
                    <label className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vincularKitBom}
                        onChange={(e) => setVincularKitBom(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-emerald-950 flex items-center gap-1">
                          <PackageCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          Vincular automáticamente el Kit de Repuestos sugerido de este modelo (
                          {kitBomItems.length} repuestos WMS) a la matriz BOM del equipo
                        </span>
                        {kitBomItems.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {kitBomItems.map((item) => (
                              <span
                                key={item.id_modelo_bom}
                                className="px-2 py-0.5 rounded bg-white text-emerald-900 border border-emerald-200 text-[10px] font-medium"
                              >
                                {getRolBomHumano(item.rol_bom)}:{' '}
                                <strong>
                                  {item.catalogo_componentes?.referencia_fabricante ||
                                    item.catalogo_componentes?.descripcion_corta}
                                </strong>{' '}
                                (x{Number(item.cantidad_sugerida)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de navegación Paso 1 */}
          <div className="flex items-center justify-between pt-2">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => nextStep(1)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 shadow-sm cursor-pointer transition-all"
            >
              <span>Continuar al Paso 2: Identificación y Planes</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          PASO 2: IDENTIFICACIÓN, UBICACIÓN Y PLANES PREVENTIVOS HEREDADOS
          ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Cinta superior con el Tipo de Equipo y Plantilla seleccionados en el Paso 1 */}
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-mono font-bold">
                {selectedArquetipo?.codigo_corto || selectedArquetipo?.codigo_tipo}
              </span>
              <div>
                <p className="text-xs font-extrabold">
                  Clase seleccionada: {selectedArquetipo?.nombre_canonico || selectedArquetipo?.nombre_tipo}
                </p>
                <p className="text-[11px] text-slate-300">
                  {selectedModeloOem
                    ? `Plantilla OEM activa: ${selectedModeloOem.marca} ${selectedModeloOem.modelo} (${kitBomItems.length} repuestos BOM)`
                    : 'Configuración personalizada (sin plantilla OEM)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-bold text-blue-300 hover:text-white underline cursor-pointer"
            >
              Cambiar Tipo o Modelo OEM
            </button>
          </div>

          {/* SECCIÓN 2.1: Identificación y Ubicación */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Identificación, Cliente y Ubicación Física
                </h3>
                <p className="text-xs text-slate-500">
                  Asigna el cliente propietario, el código único de inventario y la ubicación en sede.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cliente Propietario (Searchable Combobox) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Cliente Propietario <span className="text-rose-500">*</span>
                </label>
                <input
                  type="hidden"
                  {...register('datosEquipo.id_cliente', { valueAsNumber: true })}
                />
                <div ref={clienteComboRef} className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre comercial, razón social o NIT..."
                    value={
                      clienteDropdownOpen
                        ? clienteSearch
                        : clientesOptions?.find(
                            (c) => c.value === String(getValues('datosEquipo.id_cliente')),
                          )?.label || ''
                    }
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      if (!clienteDropdownOpen) setClienteDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setClienteDropdownOpen(true);
                      setClienteSearch('');
                    }}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all bg-white',
                      errors.datosEquipo?.id_cliente
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500',
                    )}
                  />
                  {clienteDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                      {(() => {
                        const q = clienteSearch.toLowerCase().trim();
                        const filtered =
                          clientesOptions?.filter((opt) => {
                            if (!q) return true;
                            return (
                              opt.label.toLowerCase().includes(q) ||
                              (opt.nit && opt.nit.toLowerCase().includes(q))
                            );
                          }) || [];
                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-3 text-xs text-slate-500 italic">
                              No se encontraron clientes con ese criterio
                            </div>
                          );
                        }
                        return filtered.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setValue('datosEquipo.id_cliente', Number(opt.value), {
                                shouldValidate: true,
                              });
                              setClienteSearch('');
                              setClienteDropdownOpen(false);
                            }}
                            className={cn(
                              'w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors text-xs border-b border-slate-100 last:border-b-0',
                              String(getValues('datosEquipo.id_cliente')) === opt.value &&
                                'bg-blue-50 font-bold text-blue-700',
                            )}
                          >
                            <div className="font-semibold">{opt.label}</div>
                            {opt.nit && <div className="text-[11px] text-slate-400">NIT: {opt.nit}</div>}
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                {errors.datosEquipo?.id_cliente && (
                  <p className="text-rose-600 text-[11px] font-bold">
                    {errors.datosEquipo.id_cliente.message}
                  </p>
                )}
              </div>

              {/* Sede / Sucursal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Sede / Sucursal <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  {...register('datosEquipo.id_sede', { valueAsNumber: true })}
                  disabled={!idCliente || loadingSedes}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {loadingSedes
                      ? 'Cargando sedes...'
                      : sedesOptions?.length === 0
                        ? 'Sede Principal (sin sub-sedes registradas)'
                        : 'Seleccionar sede (opcional)...'}
                  </option>
                  {sedesOptions?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Código de Inventario con Prefijo Inteligente del Arquetipo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Código Único de Inventario <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    {...register('datosEquipo.codigo_equipo', {
                      onChange: (e) => {
                        const normalized = e.target.value
                          .toUpperCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^A-Z0-9-]/g, '');
                        e.target.value = normalized;
                      },
                    })}
                    placeholder={`Ej: ${selectedArquetipo?.codigo_corto || 'GEN'}-CLI-001`}
                    className={cn(
                      'flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase bg-white',
                      errors.datosEquipo?.codigo_equipo
                        ? 'border-rose-500 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500',
                    )}
                  />
                  <button
                    type="button"
                    onClick={generarCodigoAutomatico}
                    className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 transition-colors"
                    title="Generar código único usando el prefijo del Tipo de Equipo y Cliente"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>✨ Generar</span>
                  </button>
                </div>
                {errors.datosEquipo?.codigo_equipo && (
                  <p className="text-rose-600 text-[11px] font-bold">
                    {errors.datosEquipo.codigo_equipo.message}
                  </p>
                )}
              </div>

              {/* Nombre Comercial / Alias del Equipo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nombre o Alias del Equipo{' '}
                  <span className="text-slate-400 font-normal">(se autogenera si se deja vacío)</span>
                </label>
                <input
                  {...register('datosEquipo.nombre_equipo')}
                  placeholder="Ej: Planta de Emergencia Respaldo Torre Norte"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Número de Serie General */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Número de Serie General / Chasis{' '}
                  <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  {...register('datosEquipo.numero_serie_equipo')}
                  placeholder="S/N de placa general del activo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contador / Horómetro adaptado al Arquetipo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-blue-600" />
                  {selectedArquetipo?.requiere_horometro !== false
                    ? 'Horas Actuales (Horómetro)'
                    : 'Lectura de Uso / Horas Acumuladas'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej: 1250"
                  {...register('datosEquipo.horas_actuales', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ubicación Física Detallada */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ubicación Física Detallada en la Sede <span className="text-rose-500">*</span>
                </label>
                <input
                  {...register('datosEquipo.ubicacion_texto')}
                  placeholder="Ej: Sótano 1, Cuarto de Máquinas Principal, junto al tablero de transferencia"
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium bg-white',
                    errors.datosEquipo?.ubicacion_texto
                      ? 'border-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500',
                  )}
                />
                {errors.datosEquipo?.ubicacion_texto && (
                  <p className="text-rose-600 text-[11px] font-bold">
                    {errors.datosEquipo.ubicacion_texto.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2.2: Estado Operativo, Criticidad, Garantía y Pintura */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Estado Operativo *</label>
                <select
                  {...register('datosEquipo.estado_equipo')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="OPERATIVO">Operativo</option>
                  <option value="STANDBY">Standby / Reserva</option>
                  <option value="EN_REPARACION">En Reparación</option>
                  <option value="FUERA_SERVICIO">Fuera de Servicio</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nivel de Criticidad *</label>
                <select
                  {...register('datosEquipo.criticidad')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica (Vital)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Modalidad de Contrato</label>
                <select
                  {...register('datosEquipo.tipo_contrato')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="SIN_CONTRATO">Sin Contrato Fijo</option>
                  <option value="PREVENTIVO">Contrato Preventivo</option>
                  <option value="INTEGRAL">Contrato Integral</option>
                  <option value="POR_LLAMADA">Atención por Llamada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Estado de Pintura</label>
                <select
                  {...register('datosEquipo.estado_pintura')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                  <option value="NO_APLICA">No Aplica</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('datosEquipo.en_garantia')}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>¿Equipo actualmente en Garantía?</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('datosEquipo.requiere_pintura')}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Requiere intervención de pintura / latonería</span>
              </label>
            </div>

            {enGarantia && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 bg-emerald-50/40 p-3.5 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Inicio Garantía
                  </label>
                  <input
                    type="date"
                    {...register('datosEquipo.fecha_inicio_garantia')}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fin Garantía
                  </label>
                  <input
                    type="date"
                    {...register('datosEquipo.fecha_fin_garantia')}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Proveedor de Garantía
                  </label>
                  <input
                    type="text"
                    placeholder="Fabricante o distribuidor"
                    {...register('datosEquipo.proveedor_garantia')}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2.3: 📅 Planes de Mantenimiento Preventivo Heredados del Tipo de Equipo */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    📅 Planes de Mantenimiento Preventivo Heredados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rutinas preventivas pre-cargadas automáticamente según el Tipo de Equipo. Puedes activar/desactivar o ajustar el intervalo para este activo en particular.
                  </p>
                </div>
              </div>
            </div>

            {planesHeredados.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                Este tipo de equipo no tiene planes preventivos base configurados. Se utilizarán los intervalos estándar del contrato.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {planesHeredados.map((plan, idx) => (
                  <div
                    key={plan.id_plan || idx}
                    className={cn(
                      'p-4 rounded-xl border transition-all space-y-3',
                      plan.activo
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plan.activo}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPlanesHeredados((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, activo: checked } : p)),
                            );
                          }}
                          className="h-4 w-4 rounded border-emerald-400 text-emerald-600"
                        />
                        <span className="text-xs font-extrabold text-slate-900">
                          {plan.nombre_plan}
                        </span>
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-emerald-800 border border-emerald-200">
                        {getCriterioIntervaloHumano(plan.criterio_intervalo)}
                      </span>
                    </div>

                    {plan.activo && (
                      <div className="grid grid-cols-3 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Cada (Días)
                          </label>
                          <input
                            type="number"
                            placeholder="Ej: 60"
                            value={plan.frecuencia_dias}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setPlanesHeredados((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, frecuencia_dias: val } : p,
                                ),
                              );
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Cada (Horas)
                          </label>
                          <input
                            type="number"
                            placeholder="Ej: 250"
                            value={plan.frecuencia_uso}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setPlanesHeredados((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, frecuencia_uso: val } : p,
                                ),
                              );
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Regla de Disparo
                          </label>
                          <select
                            value={plan.criterio_intervalo}
                            onChange={(e) => {
                              const crit = e.target
                                .value as PlanPreventivoHeredadoState['criterio_intervalo'];
                              setPlanesHeredados((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, criterio_intervalo: crit } : p,
                                ),
                              );
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-semibold"
                          >
                            <option value="LO_QUE_OCURRA_PRIMERO">Lo que ocurra 1°</option>
                            <option value="DIAS">Solo por Días</option>
                            <option value="HORAS">Solo por Horas</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de navegación Paso 2 */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al Paso 1
            </button>

            <button
              type="button"
              onClick={() => nextStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 shadow-sm cursor-pointer transition-all"
            >
              <span>Continuar al Paso 3: Ficha Técnica Modular</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          PASO 3: FICHA TÉCNICA MODULAR DINÁMICA (CON CONVERSIÓN DE UNIDADES EN VIVO)
          ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <DynamicModularSpecsEditor
            idTipoEquipo={selectedArquetipo?.id_tipo_equipo || null}
            codigoTipo={selectedArquetipo?.codigo_tipo || tipoSeleccionado}
            modulosValues={modulosValues}
            origenAtributos={origenAtributos}
            unidadesPersonalizadas={unidadesPersonalizadas}
            onChangeValor={handleChangeSpecValor}
            onChangeUnidad={handleChangeSpecUnidad}
            modeloOemActivo={
              selectedModeloOem
                ? {
                    marca: selectedModeloOem.marca,
                    modelo: selectedModeloOem.modelo,
                    nombre_comercial: selectedModeloOem.nombre_comercial,
                  }
                : null
            }
          />

          {/* Notas Técnicas y Rangos de Medición Opcionales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones Generales de Hoja de Vida
                </label>
                <textarea
                  rows={2}
                  {...register('datosEquipo.observaciones_generales')}
                  placeholder="Notas operativas, condiciones de acceso o particularidades del activo..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Configuración Especial / Accesorios
                </label>
                <textarea
                  rows={2}
                  {...register('datosEquipo.configuracion_especial')}
                  placeholder="Detalle de accesorios especiales, telemetría o adaptaciones..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowParametrosAvanzados((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 cursor-pointer"
              >
                {showParametrosAvanzados ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>
                  Configurar rangos personalizados de alerta para instrumentos de medición (Opcional)
                </span>
              </button>
              {showParametrosAvanzados && (
                <div className="mt-3">
                  <ConfigParametrosEditor
                    value={configParametros}
                    onChange={setConfigParametros}
                    tipoEquipo={
                      (selectedArquetipo?.codigo_tipo || tipoSeleccionado) as
                        | 'GENERADOR'
                        | 'BOMBA'
                        | 'MOTOR'
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botones Finales de Guardado */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al Paso 2
            </button>

            <button
              type="submit"
              disabled={crearEquipoMutation.isPending}
              className="inline-flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
            >
              {crearEquipoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando e Indexando Activo...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Registrar Equipo Completo
                    {selectedModeloOemId && vincularKitBom && kitBomItems.length > 0
                      ? ` (+ ${kitBomItems.length} Repuestos BOM)`
                      : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
