/**
 * PÁGINA DE EDICIÓN DE EQUIPO COMPLETO (FASE 4 - MOTOR EAM UNIVERSAL) - MEKANOS S.A.S
 * Ruta: /equipos/[id]/editar
 *
 * - Edita Datos Base, Estado, Criticidad, Garantía, Pintura, Contrato e Intervalos
 * - Conecta la Ficha Técnica Modular Dinámica (<DynamicModularSpecsEditor />)
 *   con conversión de unidades SI en vivo (y = ax + b), soporte universal para
 *   Generadores, Bombas, Motores, Compresores (ej. ID 214) y cualquier nuevo arquetipo
 * - Permite aplicar o actualizar plantilla de Modelo de Fábrica (OEM) y vincular su Kit BOM WMS
 * - Persistencia Dual en tiempo real: especificaciones JSONB + tablas satélite + índice B-Tree
 */

'use client';

import { getRolBomHumano, useModelosOemEam } from '@/features/catalogos-eam';
import {
  ConfigParametros,
  ConfigParametrosEditor,
  CriterioIntervalo,
  Criticidad,
  EstadoEquipo,
  EstadoPintura,
  TipoContrato,
  TipoEquipo,
  UpdateDatosEspecificosPayload,
  UpdateEquipoPayload,
  useActualizarDatosEspecificos,
  useActualizarEquipo,
  useEquipo,
} from '@/features/equipos';
import { DynamicModularSpecsEditor } from '@/features/equipos/components/DynamicModularSpecsEditor';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Droplets,
  Factory,
  Loader2,
  PackageCheck,
  Save,
  Settings,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

const ESTADOS_EQUIPO: { value: EstadoEquipo; label: string }[] = [
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'STANDBY', label: 'Standby / Reserva' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'EN_REPARACION', label: 'En Reparación' },
  { value: 'FUERA_SERVICIO', label: 'Fuera de Servicio' },
  { value: 'BAJA', label: 'Baja' },
];

const CRITICIDADES: { value: Criticidad; label: string }[] = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

const ESTADOS_PINTURA: { value: EstadoPintura; label: string }[] = [
  { value: 'EXCELENTE', label: 'Excelente' },
  { value: 'BUENO', label: 'Bueno' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'MALO', label: 'Malo' },
  { value: 'NO_APLICA', label: 'No Aplica' },
];

const TIPOS_CONTRATO: { value: TipoContrato; label: string }[] = [
  { value: 'SIN_CONTRATO', label: 'Sin Contrato' },
  { value: 'PREVENTIVO', label: 'Preventivo' },
  { value: 'INTEGRAL', label: 'Integral' },
  { value: 'POR_LLAMADA', label: 'Por Llamada' },
];

const CRITERIOS_INTERVALO: { value: CriterioIntervalo; label: string }[] = [
  { value: 'DIAS', label: 'Solo por Calendario (Días)' },
  { value: 'HORAS', label: 'Solo por Uso (Horas)' },
  { value: 'LO_QUE_OCURRA_PRIMERO', label: 'Lo que ocurra primero (Días u Horas)' },
];

const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-medium bg-white';
const selectCls = inputCls;
const disabledCls =
  'w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed text-xs';

function Field({
  label,
  req,
  children,
  hint,
}: {
  label: string;
  req?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-slate-700">
        {label}
        {req && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-2xl cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="font-extrabold text-sm text-slate-900">{title}</h2>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="p-5 border-t border-slate-100">{children}</div>}
    </div>
  );
}

function TipoIcon({ tipo }: { tipo: string }) {
  if (tipo === 'GENERADOR') return <Zap className="h-5 w-5 text-amber-500" />;
  if (tipo === 'BOMBA') return <Droplets className="h-5 w-5 text-blue-500" />;
  if (tipo === 'COMPRESOR') return <Wind className="h-5 w-5 text-cyan-500" />;
  return <Settings className="h-5 w-5 text-violet-500" />;
}

function dateToInput(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function EditarEquipoPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const { data, isLoading, isError, error } = useEquipo(id);
  const equipo = data?.data;

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-500 text-xs font-semibold">Cargando información del equipo...</p>
        </div>
      </div>
    );

  if (isError || !equipo)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Error al cargar el equipo</h2>
        <p className="text-slate-500 text-xs">
          {(error as Error)?.message || 'No se encontró el equipo'}
        </p>
        <button
          onClick={() => router.push('/equipos')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Equipos
        </button>
      </div>
    );

  return <EditarEquipoForm key={equipo.id_equipo} id={id} equipo={equipo} />;
}

function EditarEquipoForm({
  id,
  equipo,
}: {
  id: number;
  equipo: NonNullable<ReturnType<typeof useEquipo>['data']>['data'];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const actualizarBase = useActualizarEquipo();
  const actualizarEspecificos = useActualizarDatosEspecificos();

  const [openSections, setOpenSections] = useState({
    base: true,
    fechas: false,
    garantia: false,
    pintura: false,
    intervalos: false,
    observaciones: false,
    fichaModular: true,
    parametros: false,
  });
  const toggle = (s: keyof typeof openSections) => setOpenSections((p) => ({ ...p, [s]: !p[s] }));

  // Estado Base inicializado directamente desde el equipo cargado
  const [base, setBase] = useState<{
    nombre_equipo: string;
    codigo_equipo: string;
    numero_serie_equipo: string;
    ubicacion_texto: string;
    estado_equipo: EstadoEquipo;
    criticidad: Criticidad;
    criticidad_justificacion: string;
    fecha_instalacion: string;
    fecha_inicio_servicio_mekanos: string;
    en_garantia: boolean;
    fecha_inicio_garantia: string;
    fecha_fin_garantia: string;
    proveedor_garantia: string;
    estado_pintura: string;
    requiere_pintura: boolean;
    tipo_contrato: string;
    intervalo_tipo_a_dias_override: string | number;
    intervalo_tipo_a_horas_override: string | number;
    intervalo_tipo_b_dias_override: string | number;
    intervalo_tipo_b_horas_override: string | number;
    criterio_intervalo_override: string;
    observaciones_generales: string;
    configuracion_especial: string;
  }>(() => ({
    nombre_equipo: equipo.nombre_equipo || '',
    codigo_equipo: equipo.codigo_equipo || '',
    numero_serie_equipo: equipo.numero_serie_equipo || '',
    ubicacion_texto: equipo.ubicacion_texto || '',
    estado_equipo: equipo.estado_equipo || 'OPERATIVO',
    criticidad: equipo.criticidad || 'MEDIA',
    criticidad_justificacion: equipo.criticidad_justificacion || '',
    fecha_instalacion: dateToInput(equipo.fecha_instalacion),
    fecha_inicio_servicio_mekanos: dateToInput(equipo.fecha_inicio_servicio_mekanos),
    en_garantia: equipo.en_garantia ?? false,
    fecha_inicio_garantia: dateToInput(equipo.fecha_inicio_garantia),
    fecha_fin_garantia: dateToInput(equipo.fecha_fin_garantia),
    proveedor_garantia: equipo.proveedor_garantia || '',
    estado_pintura: equipo.estado_pintura || 'BUENO',
    requiere_pintura: equipo.requiere_pintura ?? false,
    tipo_contrato: equipo.tipo_contrato || 'SIN_CONTRATO',
    intervalo_tipo_a_dias_override: equipo.intervalo_tipo_a_dias_override ?? '',
    intervalo_tipo_a_horas_override: equipo.intervalo_tipo_a_horas_override ?? '',
    intervalo_tipo_b_dias_override: equipo.intervalo_tipo_b_dias_override ?? '',
    intervalo_tipo_b_horas_override: equipo.intervalo_tipo_b_horas_override ?? '',
    criterio_intervalo_override: equipo.criterio_intervalo_override || '',
    observaciones_generales: equipo.observaciones_generales || '',
    configuracion_especial: equipo.configuracion_especial || '',
  }));
  const [hasBaseChanges, setHasBaseChanges] = useState(false);

  // Estado Ficha Técnica Modular EAM (JSONB + Satélites + B-Tree)
  const [modulosValues, setModulosValues] = useState<Record<string, Record<string, unknown>>>(
    () => equipo.especificaciones?.modulos || {},
  );
  const [origenAtributos, setOrigenAtributos] = useState<Record<string, 'MODELO' | 'CUSTOM'>>(
    () => equipo.especificaciones?.origen_atributos || {},
  );
  const [unidadesPersonalizadas, setUnidadesPersonalizadas] = useState<Record<string, string>>(
    () => equipo.especificaciones?.unidades_personalizadas || {},
  );
  const [selectedModeloOemId, setSelectedModeloOemId] = useState<number | null>(
    () => equipo.id_modelo_equipo || null,
  );
  const [vincularKitBom, setVincularKitBom] = useState<boolean>(false);
  const [hasEspecificosChanges, setHasEspecificosChanges] = useState(false);

  const [configParametros, setConfigParametros] = useState<ConfigParametros>(
    () => (equipo.config_parametros as ConfigParametros) || {},
  );

  const idTipoEquipo = equipo.id_tipo_equipo || equipo.tipo_equipo?.id_tipo_equipo || null;
  const { data: modelosOem } = useModelosOemEam(idTipoEquipo || undefined);

  const selectedModeloOem = useMemo(
    () => modelosOem?.find((m) => m.id_modelo_equipo === selectedModeloOemId) || null,
    [modelosOem, selectedModeloOemId],
  );

  const setB = (field: string, value: string | number | boolean) => {
    setBase((p) => ({ ...p, [field]: value }));
    setHasBaseChanges(true);
  };

  const handleChangeSpecValor = useCallback(
    (
      codigoModulo: string,
      codigoAtributo: string,
      nuevoValor: unknown,
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
      setHasEspecificosChanges(true);
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
      setHasEspecificosChanges(true);
    },
    [],
  );

  // Pre-llenar desde Modelo OEM en edición
  const handleSelectModeloOem = (idModeloStr: string) => {
    if (!idModeloStr) {
      setSelectedModeloOemId(null);
      setVincularKitBom(false);
      setHasEspecificosChanges(true);
      return;
    }
    const idMod = Number(idModeloStr);
    setSelectedModeloOemId(idMod);
    setVincularKitBom(true);
    setHasEspecificosChanges(true);

    const modelo = modelosOem?.find((m) => m.id_modelo_equipo === idMod);
    if (!modelo) return;

    const specsBase = (modelo.especificaciones_base || {}) as {
      modulos?: Record<string, Record<string, unknown>>;
    };
    if (specsBase.modulos && typeof specsBase.modulos === 'object') {
      const nuevosOrigenes: Record<string, 'MODELO' | 'CUSTOM'> = { ...origenAtributos };
      const nuevosModulos: Record<string, Record<string, unknown>> = { ...modulosValues };
      for (const [codMod, vals] of Object.entries(specsBase.modulos)) {
        if (vals && typeof vals === 'object') {
          nuevosModulos[codMod] = { ...(nuevosModulos[codMod] || {}), ...vals };
          for (const [k, v] of Object.entries(vals)) {
            if (v !== null && v !== undefined && v !== '') {
              nuevosOrigenes[k] = 'MODELO';
            }
          }
        }
      }
      setModulosValues(nuevosModulos);
      setOrigenAtributos(nuevosOrigenes);
    }

    toast({
      title: '⚡ Plantilla de fábrica aplicada',
      description: `Se cargaron las especificaciones de ${modelo.marca} ${modelo.modelo}. Haz clic en "Guardar Ficha Técnica" para confirmar.`,
    });
  };

  const handleSaveBase = async () => {
    const payload: UpdateEquipoPayload = {
      nombre_equipo: base.nombre_equipo,
      codigo_equipo: base.codigo_equipo,
      ubicacion_texto: base.ubicacion_texto,
      estado_equipo: base.estado_equipo,
      criticidad: base.criticidad,
      criticidad_justificacion: base.criticidad_justificacion || undefined,
      fecha_instalacion: base.fecha_instalacion || null,
      fecha_inicio_servicio_mekanos: base.fecha_inicio_servicio_mekanos || null,
      en_garantia: base.en_garantia,
      fecha_inicio_garantia: base.fecha_inicio_garantia || null,
      fecha_fin_garantia: base.fecha_fin_garantia || null,
      proveedor_garantia: base.proveedor_garantia || undefined,
      estado_pintura: base.estado_pintura as EstadoPintura,
      requiere_pintura: base.requiere_pintura,
      tipo_contrato: base.tipo_contrato as TipoContrato,
      intervalo_tipo_a_dias_override: base.intervalo_tipo_a_dias_override
        ? parseInt(String(base.intervalo_tipo_a_dias_override), 10)
        : null,
      intervalo_tipo_a_horas_override: base.intervalo_tipo_a_horas_override
        ? parseFloat(String(base.intervalo_tipo_a_horas_override))
        : null,
      intervalo_tipo_b_dias_override: base.intervalo_tipo_b_dias_override
        ? parseInt(String(base.intervalo_tipo_b_dias_override), 10)
        : null,
      intervalo_tipo_b_horas_override: base.intervalo_tipo_b_horas_override
        ? parseFloat(String(base.intervalo_tipo_b_horas_override))
        : null,
      criterio_intervalo_override: (base.criterio_intervalo_override as CriterioIntervalo) || null,
      observaciones_generales: base.observaciones_generales || undefined,
      configuracion_especial: base.configuracion_especial || undefined,
      config_parametros: Object.keys(configParametros).length > 0 ? configParametros : undefined,
    };
    try {
      await actualizarBase.mutateAsync({ id, payload });
      setHasBaseChanges(false);
      toast({
        title: '✅ Datos generales actualizados',
        description: 'La información base del equipo se guardó correctamente.',
      });
    } catch (err) {
      console.error('Error al guardar base:', err);
    }
  };

  const handleSaveEspecificos = async () => {
    const payload: UpdateDatosEspecificosPayload = {
      especificaciones: {
        _version: 1,
        modulos: modulosValues,
        origen_atributos: origenAtributos,
        unidades_personalizadas: unidadesPersonalizadas,
      },
      id_modelo_equipo: selectedModeloOemId,
      vincular_kit_bom: Boolean(selectedModeloOemId && vincularKitBom),
    };
    try {
      await actualizarEspecificos.mutateAsync({ id, payload });
      setHasEspecificosChanges(false);
      setVincularKitBom(false);
      toast({
        title: '✅ Ficha técnica e índices actualizados',
        description:
          'Se actualizaron las especificaciones JSONB, las tablas satélite y el árbol de búsqueda rápida.',
      });
    } catch (err) {
      console.error('Error al guardar datos específicos:', err);
    }
  };

  const handleCancel = () => {
    if (hasBaseChanges || hasEspecificosChanges) {
      if (confirm('¿Descartar los cambios realizados?')) router.push(`/equipos/${id}`);
    } else {
      router.push(`/equipos/${id}`);
    }
  };

  const tipoEquipo = equipo.tipo;
  const kitBomItems = selectedModeloOem?.modelos_equipo_bom || [];

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <TipoIcon tipo={tipoEquipo} />
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {equipo.codigo_equipo}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                {equipo.tipo_equipo?.nombre_tipo || tipoEquipo}
              </span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Editar Expediente y Ficha Técnica Modular (
              {equipo.nombre_equipo || equipo.codigo_equipo})
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(hasBaseChanges || hasEspecificosChanges) && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Cambios sin guardar
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════ SECCIÓN 1: DATOS BÁSICOS ═══════════════ */}
      <Section
        title="1. Datos Básicos, Ubicación y Criticidad"
        icon={<Settings className="h-4 w-4 text-blue-600" />}
        open={openSections.base}
        onToggle={() => toggle('base')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre del Equipo" req>
            <input
              type="text"
              value={base.nombre_equipo || ''}
              onChange={(e) => setB('nombre_equipo', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Código Único de Inventario">
            <input
              type="text"
              value={base.codigo_equipo || ''}
              onChange={(e) =>
                setB(
                  'codigo_equipo',
                  e.target.value
                    .toUpperCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^A-Z0-9-]/g, ''),
                )
              }
              className={inputCls + ' uppercase font-mono font-bold'}
            />
          </Field>
          <Field label="Número de Serie General" hint="Registrado en placa base">
            <input
              type="text"
              value={base.numero_serie_equipo || ''}
              disabled
              className={disabledCls}
            />
          </Field>
          <Field label="Ubicación Física en Sede" req>
            <input
              type="text"
              value={base.ubicacion_texto || ''}
              onChange={(e) => setB('ubicacion_texto', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Estado Operativo">
            <select
              value={base.estado_equipo || ''}
              onChange={(e) => setB('estado_equipo', e.target.value)}
              className={selectCls}
            >
              {ESTADOS_EQUIPO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nivel de Criticidad">
            <select
              value={base.criticidad || ''}
              onChange={(e) => setB('criticidad', e.target.value)}
              className={selectCls}
            >
              {CRITICIDADES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Justificación de Criticidad">
              <textarea
                value={base.criticidad_justificacion || ''}
                onChange={(e) => setB('criticidad_justificacion', e.target.value)}
                className={inputCls}
                rows={2}
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* INTERVALOS OVERRIDE */}
      <Section
        title="2. Intervalos de Mantenimiento Preventivo (Ajustes del Activo)"
        icon={<Settings className="h-4 w-4 text-emerald-600" />}
        open={openSections.intervalos}
        onToggle={() => toggle('intervalos')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Intervalo Preventivo Tipo A (Días)">
            <input
              type="number"
              value={base.intervalo_tipo_a_dias_override ?? ''}
              onChange={(e) => setB('intervalo_tipo_a_dias_override', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Intervalo Preventivo Tipo A (Horas)">
            <input
              type="number"
              step="0.1"
              value={base.intervalo_tipo_a_horas_override ?? ''}
              onChange={(e) => setB('intervalo_tipo_a_horas_override', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Regla de Disparo">
            <select
              value={base.criterio_intervalo_override || ''}
              onChange={(e) => setB('criterio_intervalo_override', e.target.value)}
              className={selectCls}
            >
              <option value="">— Heredar regla del Tipo de Equipo —</option>
              {CRITERIOS_INTERVALO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Intervalo Preventivo Tipo B (Días)">
            <input
              type="number"
              value={base.intervalo_tipo_b_dias_override ?? ''}
              onChange={(e) => setB('intervalo_tipo_b_dias_override', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Intervalo Preventivo Tipo B (Horas)">
            <input
              type="number"
              step="0.1"
              value={base.intervalo_tipo_b_horas_override ?? ''}
              onChange={(e) => setB('intervalo_tipo_b_horas_override', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Modalidad de Contrato">
            <select
              value={base.tipo_contrato || ''}
              onChange={(e) => setB('tipo_contrato', e.target.value)}
              className={selectCls}
            >
              {TIPOS_CONTRATO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* GARANTÍA, PINTURA Y OBSERVACIONES */}
      <Section
        title="3. Garantía, Pintura y Observaciones Generales"
        icon={<Settings className="h-4 w-4 text-purple-600" />}
        open={openSections.garantia}
        onToggle={() => toggle('garantia')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="¿En Garantía?">
            <select
              value={base.en_garantia ? 'true' : 'false'}
              onChange={(e) => setB('en_garantia', e.target.value === 'true')}
              className={selectCls}
            >
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </Field>
          <Field label="Proveedor Garantía">
            <input
              type="text"
              value={base.proveedor_garantia || ''}
              onChange={(e) => setB('proveedor_garantia', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Fecha Fin Garantía">
            <input
              type="date"
              value={base.fecha_fin_garantia || ''}
              onChange={(e) => setB('fecha_fin_garantia', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Estado Pintura">
            <select
              value={base.estado_pintura || ''}
              onChange={(e) => setB('estado_pintura', e.target.value)}
              className={selectCls}
            >
              {ESTADOS_PINTURA.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="¿Requiere Pintura?">
            <select
              value={base.requiere_pintura ? 'true' : 'false'}
              onChange={(e) => setB('requiere_pintura', e.target.value === 'true')}
              className={selectCls}
            >
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </Field>
          <Field label="Fecha Instalación">
            <input
              type="date"
              value={base.fecha_instalacion || ''}
              onChange={(e) => setB('fecha_instalacion', e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-3">
            <Field label="Observaciones Generales">
              <textarea
                value={base.observaciones_generales || ''}
                onChange={(e) => setB('observaciones_generales', e.target.value)}
                className={inputCls}
                rows={2}
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Botón rápido de guardado Base */}
      <div className="flex items-center justify-end gap-3">
        {actualizarBase.isSuccess && (
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <Check className="h-4 w-4" />
            Datos base guardados
          </span>
        )}
        <button
          type="button"
          onClick={handleSaveBase}
          disabled={actualizarBase.isPending || !hasBaseChanges}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl shadow-2xs text-xs font-extrabold transition-colors cursor-pointer',
            actualizarBase.isPending || !hasBaseChanges
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
        >
          {actualizarBase.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Datos Generales
        </button>
      </div>

      {/* ═══════════════ SECCIÓN 4: FICHA TÉCNICA MODULAR DINÁMICA + MODELO OEM ═══════════════ */}
      <Section
        title="4. Ficha Técnica Modular Dinámica (Partes, Subsistemas y Unidades SI)"
        icon={<Cpu className="h-4 w-4 text-indigo-600" />}
        open={openSections.fichaModular}
        onToggle={() => toggle('fichaModular')}
      >
        <div className="space-y-5">
          {/* Selector opcional de Modelo OEM + Herencia BOM */}
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-6">
                <label className="block text-xs font-extrabold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5 text-indigo-600" />⚡ Vincular o Pre-llenar con
                  Modelo de Fábrica (OEM)
                </label>
                <select
                  value={selectedModeloOemId || ''}
                  onChange={(e) => handleSelectModeloOem(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="">— Sin plantilla de Modelo de Fábrica vinculada —</option>
                  {(modelosOem || []).map((m) => (
                    <option key={m.id_modelo_equipo} value={m.id_modelo_equipo}>
                      🏭 {m.marca} — {m.modelo}{' '}
                      {m.nombre_comercial ? `(${m.nombre_comercial})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedModeloOem && (
                <div className="md:col-span-6">
                  <label className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vincularKitBom}
                      onChange={(e) => {
                        setVincularKitBom(e.target.checked);
                        setHasEspecificosChanges(true);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-emerald-950 flex items-center gap-1">
                        <PackageCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        Sincronizar Kit de Repuestos sugerido ({kitBomItems.length} repuestos WMS) a
                        la matriz BOM del equipo al guardar
                      </span>
                      {kitBomItems.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Incluye:{' '}
                          {kitBomItems
                            .map(
                              (i) =>
                                `${getRolBomHumano(i.rol_bom)} (${i.catalogo_componentes?.referencia_fabricante})`,
                            )
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Editor Modular Polimórfico */}
          <DynamicModularSpecsEditor
            idTipoEquipo={idTipoEquipo}
            codigoTipo={tipoEquipo}
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
                : equipo.modelo_oem || null
            }
          />
        </div>
      </Section>

      {/* PARÁMETROS PERSONALIZADOS */}
      <Section
        title="5. Parámetros de Medición Personalizados (Rangos de Instrumentos)"
        icon={<Settings className="h-4 w-4 text-slate-500" />}
        open={openSections.parametros}
        onToggle={() => toggle('parametros')}
      >
        <ConfigParametrosEditor
          tipoEquipo={tipoEquipo as TipoEquipo}
          value={configParametros}
          onChange={(c) => {
            setConfigParametros(c);
            setHasBaseChanges(true);
          }}
        />
      </Section>

      {/* BARRA INFERIOR DE GUARDADO */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 rounded-2xl shadow-lg flex items-center justify-between z-20">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-bold cursor-pointer"
        >
          <X className="h-4 w-4" />
          Volver al Expediente 360°
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveBase}
            disabled={actualizarBase.isPending || !hasBaseChanges}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer',
              !hasBaseChanges
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
          >
            {actualizarBase.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Datos Generales
          </button>

          <button
            type="button"
            onClick={handleSaveEspecificos}
            disabled={actualizarEspecificos.isPending || !hasEspecificosChanges}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer',
              !hasEspecificosChanges
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs',
            )}
          >
            {actualizarEspecificos.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Ficha Técnica Modular
          </button>
        </div>
      </div>
    </div>
  );
}
