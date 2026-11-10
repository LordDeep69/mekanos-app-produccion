/**
 * PÁGINA: BANCO UNIVERSAL DE ACTIVIDADES Y MEDICIONES (DICCIONARIO MAESTRO EAM - FASE 5.9)
 * Ruta: /configuracion/catalogos/actividades
 *
 * Pilar 2 + Salvaguarda 1 y 3:
 * - 100% dedicado al Diccionario / Banco Maestro Universal de Actividades y Puntos de Telemetría.
 * - Libre del campo obligatorio "Servicio Vinculado *": las plantillas nacen en el Banco con id_tipo_servicio = NULL.
 * - Permite crear plantillas maestras, vincularlas en lote a múltiples Tipos de Servicio y Editar con Propagación en Cascada.
 * - Los protocolos paso a paso de cada servicio viven exclusivamente en /configuracion/catalogos/tipos-servicio (Fast-Protocol Builder).
 */

'use client';

import {
    EamSelect,
    useArquetiposEam,
    useUnidadesEam,
    type EamSelectOption,
} from '@/features/catalogos-eam';
import type {
    CatalogoActividad,
    CreateCatalogoActividadDto,
    TipoActividad,
} from '@/features/catalogos/api/catalogo-actividades.service';
import type { CatalogoSistema } from '@/features/catalogos/api/catalogo-sistemas.service';
import type {
    CreateParametroMedicionDto,
    ParametroMedicion,
} from '@/features/catalogos/api/parametros-medicion.service';
import type { TipoServicio } from '@/features/catalogos/api/tipos-servicio.service';
import {
    useCatalogoActividades,
    useCreateCatalogoActividad,
    useDeleteCatalogoActividad,
    usePropagarActividadBanco,
    useVincularActividadesLote,
} from '@/features/catalogos/hooks/use-catalogo-actividades';
import { useCatalogoSistemas } from '@/features/catalogos/hooks/use-catalogo-sistemas';
import {
    useCreateParametroMedicion,
    useParametrosMedicion,
    useUpdateParametroMedicion,
} from '@/features/catalogos/hooks/use-parametros-medicion';
import { useTiposServicio } from '@/features/catalogos/hooks/use-tipos-servicio';
import {
    ModoRespuestaSelector,
    getModoRespuestaBadgeLabel,
    type ConfigInputDeclarativo,
} from '@/features/catalogos/components/ModoRespuestaSelector';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    BookOpen,
    Check,
    CheckCircle2,
    Cpu,
    Edit2,
    Filter,
    Gauge,
    Layers,
    Link2,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS NORMALIZADOS (SOPORTA SNAKE_CASE Y CAMELCASE DE CQRS)
// ═══════════════════════════════════════════════════════════════════════════════

function getActId(a: CatalogoActividad): number {
    return a.id_actividad_catalogo ?? a.idActividadCatalogo ?? 0;
}
function getActDesc(a: CatalogoActividad): string {
    return a.descripcion_actividad ?? a.descripcionActividad ?? '';
}
function getActCode(a: CatalogoActividad): string {
    return a.codigo_actividad ?? a.codigoActividad ?? '';
}
function getActTipo(a: CatalogoActividad): TipoActividad {
    return a.tipo_actividad ?? a.tipoActividad ?? 'INSPECCION';
}
function getActServicioId(a: CatalogoActividad): number | null {
    return a.id_tipo_servicio ?? a.idTipoServicio ?? null;
}
function getActSistemaId(a: CatalogoActividad): number | null {
    return a.id_sistema ?? a.idSistema ?? null;
}
function getActEquipoId(a: CatalogoActividad): number | null {
    return a.id_tipo_equipo ?? a.idTipoEquipo ?? null;
}
function getActParametroId(a: CatalogoActividad): number | null {
    return a.id_parametro_medicion ?? a.idParametroMedicion ?? null;
}
function getActObligatoria(a: CatalogoActividad): boolean {
    return a.es_obligatoria ?? a.esObligatoria ?? true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE NATURALEZA TÉCNICA
// ═══════════════════════════════════════════════════════════════════════════════

const TIPO_ACTIVIDAD_CONFIG: Record<
    TipoActividad,
    { label: string; color: string; bg: string; border: string }
> = {
    INSPECCION: {
        label: 'Inspección Visual / Funcional',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
    },
    MEDICION: {
        label: 'Medición / Telemetría (UoM)',
        color: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
    },
    LIMPIEZA: {
        label: 'Limpieza Técnica',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
    },
    LUBRICACION: {
        label: 'Lubricación y Engrase',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
    },
    AJUSTE: {
        label: 'Ajuste y Calibración',
        color: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
    },
    PRUEBA: {
        label: 'Prueba Operativa',
        color: 'text-cyan-700',
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
    },
    CAMBIO: {
        label: 'Cambio / Reemplazo de Componente',
        color: 'text-orange-700',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
    },
    VERIFICACION: {
        label: 'Verificación de Seguridad',
        color: 'text-teal-700',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
    },
};

const NATURALEZA_OPTIONS: EamSelectOption[] = [
    { value: 'INSPECCION', label: 'Inspección Visual / Funcional (B / R / M)', badge: 'CHECKLIST' },
    { value: 'VERIFICACION', label: 'Verificación de Seguridad (B / R / M)', badge: 'CHECKLIST' },
    { value: 'LIMPIEZA', label: 'Limpieza Técnica (B / R / M)', badge: 'CHECKLIST' },
    { value: 'LUBRICACION', label: 'Lubricación y Engrase (B / R / M)', badge: 'CHECKLIST' },
    { value: 'AJUSTE', label: 'Ajuste y Torque (B / R / M)', badge: 'CHECKLIST' },
    { value: 'PRUEBA', label: 'Prueba Operativa (B / R / M)', badge: 'CHECKLIST' },
    { value: 'CAMBIO', label: 'Cambio / Reemplazo Preventivo (B / R / M)', badge: 'CHECKLIST' },
    { value: 'MEDICION', label: 'Medición Cuantitativa con Unidad UoM y Rango [Mín — Máx]', badge: 'TELEMETRÍA' },
    { value: 'OTRA_PERSONALIZADA', label: '+ Otra naturaleza personalizada...', badge: 'CUSTOM' },
];

function generarCodigoActividad(prefijo: string, descripcion: string): string {
    const limpio = descripcion
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .map((w) => w.slice(0, 4))
        .join('_');
    const sufijo = Math.floor(100 + Math.random() * 900);
    return `${prefijo}_${limpio || 'ACT'}_${sufijo}`.slice(0, 48);
}

interface EntradaBancoUniversal {
    firmaCanonica: string;
    representante: CatalogoActividad;
    instancias: CatalogoActividad[];
    serviciosIds: number[];
    esPlantillaPura: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL 1: CREAR NUEVA PLANTILLA EN EL BANCO UNIVERSAL (O EDITAR Y PROPAGAR)
// ═══════════════════════════════════════════════════════════════════════════════

interface BancoActividadModalProps {
    isOpen: boolean;
    onClose: () => void;
    entradaEditar?: EntradaBancoUniversal | null;
    arquetipos: Array<{ id_tipo_equipo: number; codigo_tipo: string; nombre_tipo: string }>;
    sistemas: CatalogoSistema[];
    tiposServicio: TipoServicio[];
    parametros: ParametroMedicion[];
    unidadesOptions: EamSelectOption[];
}

function BancoActividadModal({
    isOpen,
    onClose,
    entradaEditar,
    arquetipos,
    sistemas,
    tiposServicio,
    parametros,
    unidadesOptions,
}: BancoActividadModalProps) {
    const createActividad = useCreateCatalogoActividad();
    const propagarBanco = usePropagarActividadBanco();
    const vincularLote = useVincularActividadesLote();
    const createParametro = useCreateParametroMedicion();
    const updateParametro = useUpdateParametroMedicion();

    const actBase = entradaEditar?.representante ?? null;

    const [descripcion, setDescripcion] = useState('');
    const [tipoActividad, setTipoActividad] = useState<string>('INSPECCION');
    const [naturalezaPersonalizada, setNaturalezaPersonalizada] = useState('');
    const [tipoControlInput, setTipoControlInput] = useState<string>('ESCALA_ESTADO');
    const [configInputJson, setConfigInputJson] = useState<ConfigInputDeclarativo | null>(null);
    const [rolSemantico, setRolSemantico] = useState<string>('');
    const [idTipoEquipo, setIdTipoEquipo] = useState<string>('');
    const [idSistema, setIdSistema] = useState<string>('');
    const [esObligatoria, setEsObligatoria] = useState(true);
    const [instrucciones, setInstrucciones] = useState('');
    const [precauciones, setPrecauciones] = useState('');

    // Campos de telemetría UoM cuando tipoActividad === 'MEDICION'
    const [unidadMedida, setUnidadMedida] = useState('V');
    const [valorMinimo, setValorMinimo] = useState<string>('0');
    const [valorMaximo, setValorMaximo] = useState<string>('100');
    const [valorCriticoMin, setValorCriticoMin] = useState<string>('');
    const [valorCriticoMax, setValorCriticoMax] = useState<string>('');

    // Opcional en creación: inyectar de inmediato en 1 o varios servicios
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState<number[]>([]);
    const [busquedaServicios, setBusquedaServicios] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (actBase) {
            setDescripcion(getActDesc(actBase));
            const customNat = actBase.naturalezaPersonalizada ?? actBase.naturaleza_personalizada ?? '';
            setNaturalezaPersonalizada(customNat || '');
            setTipoActividad(customNat ? 'OTRA_PERSONALIZADA' : getActTipo(actBase));
            setTipoControlInput(
                actBase.tipoControlInput ?? actBase.tipo_control_input ?? 'ESCALA_ESTADO',
            );
            setConfigInputJson(actBase.configInputJson ?? actBase.config_input_json ?? null);
            setRolSemantico(actBase.rolSemantico ?? actBase.rol_semantico ?? '');
            const eqId = getActEquipoId(actBase);
            const sisId = getActSistemaId(actBase);
            const paramId = getActParametroId(actBase);
            setIdTipoEquipo(eqId ? String(eqId) : '');
            setIdSistema(sisId ? String(sisId) : '');
            setEsObligatoria(getActObligatoria(actBase));
            setInstrucciones(actBase.instrucciones ?? '');
            setPrecauciones(actBase.precauciones ?? '');

            const paramLista = parametros.find((p) => p.id_parametro_medicion === paramId);
            const paramCqrs = actBase.parametroMedicion;
            const uMed =
                paramLista?.unidad_medida ??
                paramCqrs?.unidadMedida ??
                actBase.parametros_medicion?.unidad_medida ??
                'V';
            const minN = paramLista?.valor_minimo_normal ?? paramCqrs?.valorMinimoNormal ?? 0;
            const maxN = paramLista?.valor_maximo_normal ?? paramCqrs?.valorMaximoNormal ?? 100;
            const minC = paramLista?.valor_minimo_critico ?? paramCqrs?.valorMinimoCritico;
            const maxC = paramLista?.valor_maximo_critico ?? paramCqrs?.valorMaximoCritico;

            setUnidadMedida(uMed || 'V');
            setValorMinimo(String(minN));
            setValorMaximo(String(maxN));
            setValorCriticoMin(minC !== null && minC !== undefined ? String(minC) : '');
            setValorCriticoMax(maxC !== null && maxC !== undefined ? String(maxC) : '');
            setServiciosSeleccionados([]);
        } else {
            setDescripcion('');
            setTipoActividad('INSPECCION');
            setNaturalezaPersonalizada('');
            setTipoControlInput('ESCALA_ESTADO');
            setConfigInputJson(null);
            setRolSemantico('');
            setIdTipoEquipo('');
            setIdSistema('');
            setEsObligatoria(true);
            setInstrucciones('');
            setPrecauciones('');
            setUnidadMedida('V');
            setValorMinimo('0');
            setValorMaximo('100');
            setValorCriticoMin('');
            setValorCriticoMax('');
            setServiciosSeleccionados([]);
        }
        setBusquedaServicios('');
    }, [isOpen, actBase, parametros]);

    const arquetiposOptions = useMemo<EamSelectOption[]>(() => {
        return [
            { value: '', label: 'Universal (Aplica a todos los Tipos de Equipo)', badge: 'GLOBAL' },
            ...arquetipos.map((a) => ({
                value: String(a.id_tipo_equipo),
                label: a.nombre_tipo,
                badge: a.codigo_tipo,
            })),
        ];
    }, [arquetipos]);

    const sistemasOptions = useMemo<EamSelectOption[]>(() => {
        const arquetipoSel = arquetipos.find((a) => String(a.id_tipo_equipo) === idTipoEquipo);
        const targetCod = arquetipoSel?.codigo_tipo?.toUpperCase().trim() || '';
        const filtrados = sistemas.filter((s) => {
            if (!s.activo) return false;
            if (!arquetipoSel || !targetCod) return true;
            const aplica = (Array.isArray(s.aplica_a) ? s.aplica_a : []).map((a) =>
                String(a).toUpperCase().trim(),
            );
            if (aplica.length === 0 || aplica.includes('GENERAL') || aplica.includes('ALL')) return true;
            return aplica.some(
                (a) =>
                    a === targetCod ||
                    targetCod.startsWith(a) ||
                    a.startsWith(targetCod),
            );
        });
        return [
            { value: '', label: 'General / Sin subsistema específico', badge: 'GENERAL' },
            ...filtrados.map((s) => ({
                value: String(s.id_sistema),
                label: s.nombre_sistema,
                badge: s.codigo_sistema,
            })),
        ];
    }, [sistemas, arquetipos, idTipoEquipo]);

    const serviciosFiltrados = useMemo(() => {
        const q = busquedaServicios.trim().toLowerCase();
        return tiposServicio
            .filter((s) => s.activo !== false)
            .filter((s) => {
                if (!q) return true;
                return (
                    s.nombre_tipo.toLowerCase().includes(q) ||
                    s.codigo_tipo.toLowerCase().includes(q)
                );
            });
    }, [tiposServicio, busquedaServicios]);

    if (!isOpen) return null;

    const toggleServicio = (idServicio: number) => {
        setServiciosSeleccionados((prev) =>
            prev.includes(idServicio) ? prev.filter((id) => id !== idServicio) : [...prev, idServicio],
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descripcion.trim()) {
            toast.error('Ingresa la descripción técnica de la actividad o medición');
            return;
        }

        setIsSaving(true);
        try {
            let parametroId: number | null = actBase ? getActParametroId(actBase) : null;

            // Si es MEDICION, sincronizamos o creamos el parámetro en parametros_medicion
            if (tipoActividad === 'MEDICION') {
                const minNum = parseFloat(valorMinimo);
                const maxNum = parseFloat(valorMaximo);
                if (Number.isNaN(minNum) || Number.isNaN(maxNum)) {
                    toast.error('Ingresa valores numéricos válidos para el rango Mínimo y Máximo');
                    setIsSaving(false);
                    return;
                }
                if (minNum > maxNum) {
                    toast.error('El valor mínimo no puede ser mayor al valor máximo');
                    setIsSaving(false);
                    return;
                }

                const paramPayload: CreateParametroMedicionDto = {
                    codigoParametro: generarCodigoActividad('PAR', descripcion),
                    nombreParametro: descripcion.trim(),
                    unidadMedida: unidadMedida.trim() || 'u',
                    categoria: 'MECANICO',
                    valorMinimoNormal: minNum,
                    valorMaximoNormal: maxNum,
                    valorMinimoCritico:
                        valorCriticoMin.trim() !== '' ? parseFloat(valorCriticoMin) : undefined,
                    valorMaximoCritico:
                        valorCriticoMax.trim() !== '' ? parseFloat(valorCriticoMax) : undefined,
                    tipoEquipoId: idTipoEquipo ? Number(idTipoEquipo) : undefined,
                    esCriticoSeguridad: false,
                    esObligatorio: esObligatoria,
                    decimalesPrecision: 2,
                    activo: true,
                };

                if (parametroId) {
                    await updateParametro.mutateAsync({
                        id: parametroId,
                        data: {
                            nombreParametro: descripcion.trim(),
                            unidadMedida: unidadMedida.trim() || 'u',
                            valorMinimoNormal: minNum,
                            valorMaximoNormal: maxNum,
                            valorMinimoCritico:
                                valorCriticoMin.trim() !== '' ? parseFloat(valorCriticoMin) : undefined,
                            valorMaximoCritico:
                                valorCriticoMax.trim() !== '' ? parseFloat(valorCriticoMax) : undefined,
                        },
                    });
                } else {
                    const paramCreado = await createParametro.mutateAsync(paramPayload);
                    const idCreado =
                        (paramCreado as unknown as { data?: ParametroMedicion })?.data
                            ?.id_parametro_medicion ??
                        (paramCreado as unknown as ParametroMedicion)?.id_parametro_medicion;
                    if (idCreado) {
                        parametroId = idCreado;
                    }
                }
            } else {
                parametroId = null;
            }

            const isCustomNature = tipoActividad === 'OTRA_PERSONALIZADA';
            if (isCustomNature && !naturalezaPersonalizada.trim()) {
                toast.error('Escribe el nombre de la naturaleza técnica personalizada');
                setIsSaving(false);
                return;
            }
            const resolvedTipoActividad: TipoActividad = isCustomNature
                ? 'INSPECCION'
                : (tipoActividad as TipoActividad);
            const resolvedNaturalezaCustom = isCustomNature
                ? naturalezaPersonalizada.trim()
                : null;
            const resolvedConfig =
                tipoControlInput === 'PERSONALIZADO' ? configInputJson : null;
            const resolvedRol = rolSemantico.trim() || null;

            if (entradaEditar && actBase) {
                // MODO EDICIÓN CON PROPAGACIÓN EN CASCADA A TODOS LOS SERVICIOS VINCULADOS
                const res = await propagarBanco.mutateAsync({
                    idActividadOrigen: getActId(actBase),
                    descripcionActividad: descripcion.trim(),
                    tipoActividad: resolvedTipoActividad,
                    naturalezaPersonalizada: resolvedNaturalezaCustom,
                    tipoControlInput,
                    configInputJson: resolvedConfig,
                    rolSemantico: resolvedRol,
                    idSistema: idSistema ? Number(idSistema) : null,
                    idTipoEquipo: idTipoEquipo ? Number(idTipoEquipo) : null,
                    idParametroMedicion: parametroId,
                    esObligatoria,
                    instrucciones: instrucciones.trim() || null,
                    precauciones: precauciones.trim() || null,
                });
                toast.success(
                    `Plantilla actualizada y propagada a ${res.propagatedCount} registro(s) en protocolos`,
                );
            } else {
                // MODO CREACIÓN EN EL BANCO UNIVERSAL (idTipoServicio = null)
                const payload: CreateCatalogoActividadDto = {
                    codigoActividad: generarCodigoActividad('BNK', descripcion),
                    descripcionActividad: descripcion.trim(),
                    tipoActividad: resolvedTipoActividad,
                    naturalezaPersonalizada: resolvedNaturalezaCustom,
                    tipoControlInput,
                    configInputJson: resolvedConfig,
                    rolSemantico: resolvedRol,
                    idTipoServicio: null,
                    idTipoEquipo: idTipoEquipo ? Number(idTipoEquipo) : null,
                    idSistema: idSistema ? Number(idSistema) : null,
                    idParametroMedicion: parametroId,
                    esObligatoria,
                    instrucciones: instrucciones.trim() || undefined,
                    precauciones: precauciones.trim() || undefined,
                    activo: true,
                };
                const creada = await createActividad.mutateAsync(payload);
                const idCreada =
                    creada?.data ? getActId(creada.data) : getActId(creada);

                // Si el usuario marcó servicios opcionales, los vinculamos en lote de inmediato
                if (serviciosSeleccionados.length > 0 && idCreada > 0) {
                    await vincularLote.mutateAsync({
                        actividadIds: [idCreada],
                        tipoServicioIds: serviciosSeleccionados,
                        overrideSistemaId: idSistema ? Number(idSistema) : null,
                    });
                    toast.success(
                        `Plantilla creada en el Banco Universal y vinculada a ${serviciosSeleccionados.length} servicio(s)`,
                    );
                } else {
                    toast.success('Plantilla maestra creada en el Banco Universal');
                }
            }

            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al guardar en el Banco Universal';
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                            {entradaEditar ? (
                                <Edit2 className="h-5 w-5 text-amber-300" />
                            ) : (
                                <BookOpen className="h-5 w-5 text-blue-300" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-bold">
                                {entradaEditar
                                    ? 'Editar en Banco Universal y Propagar en Cascada'
                                    : 'Nueva Plantilla en el Banco Universal'}
                            </h3>
                            <p className="text-xs text-slate-300">
                                {entradaEditar
                                    ? `Se actualizará la plantilla maestra y sus ${entradaEditar.serviciosIds.length} protocolo(s) vinculado(s).`
                                    : 'Nace libre en el Diccionario Maestro (sin obligarte a elegir un Servicio Vinculado).'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {/* Descripción Canónica */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Descripción de la Actividad o Punto de Medición *
                        </label>
                        <input
                            type="text"
                            required
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej: Revisar tensión y estado de cables de tracción / Medir voltaje entre fases L1-L2..."
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
                        />
                    </div>

                    {/* Naturaleza de Tarea + Obligatoriedad */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-8">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Naturaleza Técnica *
                            </label>
                            <EamSelect
                                value={tipoActividad}
                                onChange={(val: string) =>
                                    setTipoActividad(val || 'INSPECCION')
                                }
                                options={NATURALEZA_OPTIONS}
                                placeholder="Seleccionar naturaleza..."
                            />
                            {tipoActividad === 'OTRA_PERSONALIZADA' && (
                                <input
                                    type="text"
                                    value={naturalezaPersonalizada}
                                    onChange={(e) => setNaturalezaPersonalizada(e.target.value)}
                                    placeholder="Nombre de la naturaleza personalizada (Ej: Calibración Láser)"
                                    className="mt-2 w-full px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-300 bg-indigo-50/40 focus:outline-none focus:border-indigo-500"
                                />
                            )}
                        </div>
                        <div className="md:col-span-4">
                            <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={esObligatoria}
                                    onChange={(e) => setEsObligatoria(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <span className="text-xs font-bold text-slate-700">
                                    Ejecución Obligatoria
                                </span>
                            </label>
                        </div>
                    </div>

                    {tipoActividad !== 'MEDICION' && (
                        <ModoRespuestaSelector
                            tipoControlInput={tipoControlInput}
                            configInputJson={configInputJson}
                            rolSemantico={rolSemantico}
                            onChange={(next) => {
                                setTipoControlInput(next.tipoControlInput);
                                setConfigInputJson(next.configInputJson);
                                setRolSemantico(next.rolSemantico);
                            }}
                        />
                    )}

                    {/* Tipo de Equipo y Subsistema sugeridos (Opcionales) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Tipo de Equipo Sugerido (Opcional)
                            </label>
                            <EamSelect
                                value={idTipoEquipo}
                                onChange={(val: string) => {
                                    setIdTipoEquipo(val);
                                    setIdSistema('');
                                }}
                                options={arquetiposOptions}
                                placeholder="Universal / Todos los equipos..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Subsistema / Parte Sugerida (Opcional)
                            </label>
                            <EamSelect
                                value={idSistema}
                                onChange={(val: string) => setIdSistema(val)}
                                options={sistemasOptions}
                                placeholder="General / Sin subsistema..."
                            />
                        </div>
                    </div>

                    {/* Bloque Especial si es MEDICION (Salvaguarda 3: Telemetría con Unidad UoM y Rangos) */}
                    {tipoActividad === 'MEDICION' && (
                        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                            <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-purple-700" />
                                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                                    Configuración de Telemetría Cuantitativa (Unidad UoM + Rangos de Alerta)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                                        Unidad de Medida (UoM) *
                                    </label>
                                    <EamSelect
                                        value={unidadMedida}
                                        onChange={(val: string) => setUnidadMedida(val || 'V')}
                                        options={unidadesOptions}
                                        placeholder="Buscar unidad (V, A, PSI, °C, mm/s)..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                                        Rango Normal Mínimo *
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={valorMinimo}
                                        onChange={(e) => setValorMinimo(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-purple-300 bg-white font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                                        Rango Normal Máximo *
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={valorMaximo}
                                        onChange={(e) => setValorMaximo(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-purple-300 bg-white font-semibold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-medium text-purple-800 mb-1">
                                        Umbral Crítico Mínimo (Opcional)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={valorCriticoMin}
                                        onChange={(e) => setValorCriticoMin(e.target.value)}
                                        placeholder="Opcional"
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-200 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-purple-800 mb-1">
                                        Umbral Crítico Máximo (Opcional)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={valorCriticoMax}
                                        onChange={(e) => setValorCriticoMax(e.target.value)}
                                        placeholder="Opcional"
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-200 bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instrucciones y Precauciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Instrucción / Criterio de Aceptación (Opcional)
                            </label>
                            <textarea
                                rows={2}
                                value={instrucciones}
                                onChange={(e) => setInstrucciones(e.target.value)}
                                placeholder="Guía breve para el técnico en campo..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Precaución de Seguridad / LOTO (Opcional)
                            </label>
                            <textarea
                                rows={2}
                                value={precauciones}
                                onChange={(e) => setPrecauciones(e.target.value)}
                                placeholder="Ej: Desenergizar equipo antes de intervenir..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-amber-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Opcional en Creación: Vincular de una vez a 1 o más servicios */}
                    {!entradaEditar && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <Link2 className="h-3.5 w-3.5 text-blue-600" />
                                        ¿Vincular de inmediato a algún Protocolo de Servicio? (100% Opcional)
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                        Si no marcas ninguno, la actividad quedará guardada como Plantilla Maestra libre en el Banco Universal.
                                    </p>
                                </div>
                                {serviciosSeleccionados.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                        {serviciosSeleccionados.length} seleccionado(s)
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={busquedaServicios}
                                    onChange={(e) => setBusquedaServicios(e.target.value)}
                                    placeholder="Filtrar tipos de servicio..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                                />
                            </div>
                            <div className="max-h-36 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                                {serviciosFiltrados.map((srv) => {
                                    const checked = serviciosSeleccionados.includes(srv.id_tipo_servicio);
                                    return (
                                        <label
                                            key={srv.id_tipo_servicio}
                                            className={cn(
                                                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all',
                                                checked
                                                    ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleServicio(srv.id_tipo_servicio)}
                                                className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                                            />
                                            <span className="truncate flex-1">{srv.nombre_tipo}</span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {srv.codigo_tipo}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            {entradaEditar
                                ? 'Guardar y Propagar a Servicios'
                                : 'Guardar en el Banco Universal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL 2: VINCULAR UNA ACTIVIDAD DEL BANCO A 1 O MÚLTIPLES SERVICIOS EN 1 CLIC
// ═══════════════════════════════════════════════════════════════════════════════

interface VincularServiciosModalProps {
    isOpen: boolean;
    onClose: () => void;
    entrada: EntradaBancoUniversal | null;
    tiposServicio: TipoServicio[];
    sistemas: CatalogoSistema[];
}

function VincularServiciosModal({
    isOpen,
    onClose,
    entrada,
    tiposServicio,
    sistemas,
}: VincularServiciosModalProps) {
    const vincularLote = useVincularActividadesLote();
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    const [idSistemaDestino, setIdSistemaDestino] = useState<string>('');
    const [busqueda, setBusqueda] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !entrada) return;
        setSeleccionados([]);
        const sisId = getActSistemaId(entrada.representante);
        setIdSistemaDestino(sisId ? String(sisId) : '');
        setBusqueda('');
    }, [isOpen, entrada]);

    const sistemasOptions = useMemo<EamSelectOption[]>(() => {
        return [
            { value: '', label: 'Conservar subsistema original de la plantilla', badge: 'AUTO' },
            ...sistemas
                .filter((s) => s.activo)
                .map((s) => ({
                    value: String(s.id_sistema),
                    label: s.nombre_sistema,
                    badge: s.codigo_sistema,
                })),
        ];
    }, [sistemas]);

    if (!isOpen || !entrada) return null;

    const yaVinculadosSet = new Set(entrada.serviciosIds);

    const serviciosFiltrados = tiposServicio
        .filter((s) => s.activo !== false)
        .filter((s) => {
            const q = busqueda.trim().toLowerCase();
            if (!q) return true;
            return (
                s.nombre_tipo.toLowerCase().includes(q) ||
                s.codigo_tipo.toLowerCase().includes(q)
            );
        });

    const toggleServicio = (id: number) => {
        if (yaVinculadosSet.has(id)) return;
        setSeleccionados((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const handleVincular = async () => {
        if (seleccionados.length === 0) {
            toast.error('Selecciona al menos un Tipo de Servicio para vincular');
            return;
        }
        setIsSaving(true);
        try {
            const res = await vincularLote.mutateAsync({
                actividadIds: [getActId(entrada.representante)],
                tipoServicioIds: seleccionados,
                overrideSistemaId: idSistemaDestino ? Number(idSistemaDestino) : undefined,
            });
            toast.success(
                `Actividad inyectada exitosamente en ${res.createdCount} protocolo(s) de servicio`,
            );
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al vincular a los servicios';
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/10">
                            <Link2 className="h-5 w-5 text-blue-200" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold">
                                Vincular Plantilla a Protocolos de Servicio
                            </h3>
                            <p className="text-xs text-blue-200 line-clamp-1">
                                {getActDesc(entrada.representante)}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Sección / Subsistema Destino (Opcional)
                        </label>
                        <EamSelect
                            value={idSistemaDestino}
                            onChange={(val: string) => setIdSistemaDestino(val)}
                            options={sistemasOptions}
                            placeholder="Conservar subsistema original..."
                        />
                    </div>

                    <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar protocolo de servicio por nombre o código..."
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {serviciosFiltrados.map((srv) => {
                            const yaExiste = yaVinculadosSet.has(srv.id_tipo_servicio);
                            const marcado = seleccionados.includes(srv.id_tipo_servicio);
                            return (
                                <div
                                    key={srv.id_tipo_servicio}
                                    onClick={() => toggleServicio(srv.id_tipo_servicio)}
                                    className={cn(
                                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all',
                                        yaExiste
                                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 cursor-default'
                                            : marcado
                                              ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold cursor-pointer shadow-2xs'
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer',
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <input
                                            type="checkbox"
                                            disabled={yaExiste}
                                            checked={yaExiste || marcado}
                                            onChange={() => {}}
                                            className="rounded border-slate-300 text-blue-600 h-4 w-4"
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold">
                                                {srv.nombre_tipo}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-400">
                                                {srv.codigo_tipo} • {srv.categoria}
                                            </div>
                                        </div>
                                    </div>
                                    {yaExiste ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Ya incluido
                                        </span>
                                    ) : marcado ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                                            Vincular
                                        </span>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                        {seleccionados.length} protocolo(s) nuevo(s) seleccionado(s)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isSaving || seleccionados.length === 0}
                            onClick={handleVincular}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Link2 className="h-3.5 w-3.5" />
                            )}
                            Inyectar en {seleccionados.length} Servicio(s)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENIDO PRINCIPAL: BANCO UNIVERSAL DE ACTIVIDADES Y MEDICIONES
// ═══════════════════════════════════════════════════════════════════════════════

function BancoUniversalActividadesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const servicioIdRedirect = searchParams.get('servicioId') || searchParams.get('protocolo');

    // Si alguien entra con ?servicioId=X (enlace antiguo), redirigimos automáticamente al nuevo Fast-Protocol Builder
    useEffect(() => {
        if (servicioIdRedirect) {
            router.replace(`/configuracion/catalogos/tipos-servicio?protocolo=${servicioIdRedirect}`);
        }
    }, [servicioIdRedirect, router]);

    const {
        data: actividadesResp,
        isLoading,
        isError,
        refetch,
    } = useCatalogoActividades({ activo: 'all', limit: 1000 });
    const { data: tiposServicioResp } = useTiposServicio();
    const { data: sistemasResp } = useCatalogoSistemas();
    const { data: parametrosResp } = useParametrosMedicion();
    const { data: arquetipos = [] } = useArquetiposEam();
    const { data: unidades = [] } = useUnidadesEam();
    const deleteActividad = useDeleteCatalogoActividad();

    const actividades = useMemo<CatalogoActividad[]>(() => {
        if (!actividadesResp) return [];
        return Array.isArray(actividadesResp) ? actividadesResp : actividadesResp.data ?? [];
    }, [actividadesResp]);

    const tiposServicio = useMemo<TipoServicio[]>(() => {
        if (!tiposServicioResp) return [];
        return Array.isArray(tiposServicioResp) ? tiposServicioResp : tiposServicioResp.data ?? [];
    }, [tiposServicioResp]);

    const sistemas = useMemo<CatalogoSistema[]>(() => {
        if (!sistemasResp) return [];
        return Array.isArray(sistemasResp) ? sistemasResp : sistemasResp.data ?? [];
    }, [sistemasResp]);

    const parametros = useMemo<ParametroMedicion[]>(() => {
        if (!parametrosResp) return [];
        return Array.isArray(parametrosResp) ? parametrosResp : parametrosResp.data ?? [];
    }, [parametrosResp]);

    // Filtros del Diccionario Maestro
    const [searchQuery, setSearchQuery] = useState('');
    const [filtroEquipo, setFiltroEquipo] = useState<string>('ALL');
    const [filtroSistema, setFiltroSistema] = useState<string>('ALL');
    const [filtroNaturaleza, setFiltroNaturaleza] = useState<string>('ALL');
    const [vistaRapida, setVistaRapida] = useState<'TODAS' | 'MEDICION' | 'INSPECCION' | 'SIN_SERVICIO'>('TODAS');

    // Modales
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [entradaEditar, setEntradaEditar] = useState<EntradaBancoUniversal | null>(null);
    const [entradaVincular, setEntradaVincular] = useState<EntradaBancoUniversal | null>(null);

    // Mapas rápidos
    const serviciosMap = useMemo(() => {
        const m = new Map<number, TipoServicio>();
        tiposServicio.forEach((s: TipoServicio) => m.set(s.id_tipo_servicio, s));
        return m;
    }, [tiposServicio]);

    const sistemasMap = useMemo(() => {
        const m = new Map<number, CatalogoSistema>();
        sistemas.forEach((s: CatalogoSistema) => m.set(s.id_sistema, s));
        return m;
    }, [sistemas]);

    const arquetiposMap = useMemo(() => {
        const m = new Map<number, { id_tipo_equipo: number; codigo_tipo: string; nombre_tipo: string }>();
        arquetipos.forEach((a) => m.set(a.id_tipo_equipo, a));
        return m;
    }, [arquetipos]);

    const parametrosMap = useMemo(() => {
        const m = new Map<number, ParametroMedicion>();
        parametros.forEach((p: ParametroMedicion) => m.set(p.id_parametro_medicion, p));
        return m;
    }, [parametros]);

    const unidadesOptions = useMemo<EamSelectOption[]>(() => {
        if (!unidades || unidades.length === 0) {
            return [
                { value: 'V', label: 'Voltios (V)', badge: 'TENSIÓN' },
                { value: 'A', label: 'Amperios (A)', badge: 'CORRIENTE' },
                { value: 'PSI', label: 'Libras por pulgada cuadrada (PSI)', badge: 'PRESIÓN' },
                { value: 'bar', label: 'Bar (bar)', badge: 'PRESIÓN' },
                { value: '°C', label: 'Grados Celsius (°C)', badge: 'TEMPERATURA' },
                { value: 'Hz', label: 'Hertz (Hz)', badge: 'FRECUENCIA' },
                { value: 'RPM', label: 'Revoluciones por minuto (RPM)', badge: 'VELOCIDAD' },
                { value: 'mm/s', label: 'Milímetros por segundo (mm/s)', badge: 'VIBRACIÓN' },
            ];
        }
        return unidades.map((u) => ({
            value: u.simbolo,
            label: `${u.nombre} (${u.simbolo})`,
            badge: u.magnitud?.nombre_magnitud ?? u.codigo,
        }));
    }, [unidades]);

    // Opciones de filtros EamSelect
    const filtroEquipoOptions = useMemo<EamSelectOption[]>(() => {
        return [
            { value: 'ALL', label: 'Todos los Tipos de Equipo (Universal + Específicos)', badge: 'TODOS' },
            { value: 'GLOBAL', label: 'Solo Universales / Multi-Equipo', badge: 'GLOBAL' },
            ...arquetipos.map((a) => ({
                value: String(a.id_tipo_equipo),
                label: a.nombre_tipo,
                badge: a.codigo_tipo,
            })),
        ];
    }, [arquetipos]);

    const filtroSistemaOptions = useMemo<EamSelectOption[]>(() => {
        return [
            { value: 'ALL', label: 'Todos los Subsistemas / Partes', badge: 'TODOS' },
            ...sistemas
                .filter((s: CatalogoSistema) => s.activo)
                .map((s: CatalogoSistema) => ({
                    value: String(s.id_sistema),
                    label: s.nombre_sistema,
                    badge: s.codigo_sistema,
                })),
        ];
    }, [sistemas]);

    const filtroNaturalezaOptions = useMemo<EamSelectOption[]>(() => {
        return [
            { value: 'ALL', label: 'Todas las Naturalezas Técnicas', badge: 'TODAS' },
            ...NATURALEZA_OPTIONS,
        ];
    }, []);

    // Construir Diccionario Canónico Deduplicado
    const entradasBanco = useMemo<EntradaBancoUniversal[]>(() => {
        const activas = actividades.filter((a: CatalogoActividad) => a.activo !== false);
        const grupos = new Map<string, CatalogoActividad[]>();

        for (const act of activas) {
            const desc = getActDesc(act).trim().toLowerCase();
            if (!desc) continue;
            const firma = `${desc}::${getActTipo(act)}`;
            const lista = grupos.get(firma) ?? [];
            lista.push(act);
            grupos.set(firma, lista);
        }

        const resultado: EntradaBancoUniversal[] = [];
        for (const [firmaCanonica, instancias] of grupos.entries()) {
            const plantillaPura =
                instancias.find((i) => getActServicioId(i) === null) ?? null;
            const representante = plantillaPura ?? instancias[0];
            const serviciosIds = Array.from(
                new Set(
                    instancias
                        .map((i) => getActServicioId(i))
                        .filter((id): id is number => typeof id === 'number'),
                ),
            );
            resultado.push({
                firmaCanonica,
                representante,
                instancias,
                serviciosIds,
                esPlantillaPura: Boolean(plantillaPura),
            });
        }

        return resultado.sort((a, b) =>
            getActDesc(a.representante).localeCompare(
                getActDesc(b.representante),
                'es',
            ),
        );
    }, [actividades]);

    // Filtrado del Banco Universal
    const entradasFiltradas = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return entradasBanco.filter((entrada) => {
            const rep = entrada.representante;
            const tipo = getActTipo(rep);

            if (vistaRapida === 'MEDICION' && tipo !== 'MEDICION') return false;
            if (vistaRapida === 'INSPECCION' && tipo === 'MEDICION') return false;
            if (vistaRapida === 'SIN_SERVICIO' && entrada.serviciosIds.length > 0) return false;

            if (filtroNaturaleza !== 'ALL' && tipo !== filtroNaturaleza) {
                return false;
            }

            if (filtroSistema !== 'ALL') {
                const coincideSistema = entrada.instancias.some(
                    (i) => String(getActSistemaId(i) ?? '') === filtroSistema,
                );
                if (!coincideSistema) return false;
            }

            if (filtroEquipo !== 'ALL') {
                if (filtroEquipo === 'GLOBAL') {
                    const esGlobal = entrada.instancias.some((i) => !getActEquipoId(i));
                    if (!esGlobal) return false;
                } else {
                    const idEqNum = Number(filtroEquipo);
                    const coincideDirecto = entrada.instancias.some(
                        (i) => getActEquipoId(i) === idEqNum,
                    );
                    const coincidePorServicio = entrada.serviciosIds.some((idSrv) => {
                        const srv = serviciosMap.get(idSrv);
                        return srv?.id_tipo_equipo === idEqNum;
                    });
                    if (!coincideDirecto && !coincidePorServicio) return false;
                }
            }

            if (q) {
                const matchDesc = getActDesc(rep).toLowerCase().includes(q);
                const matchCod = getActCode(rep).toLowerCase().includes(q);
                const sisId = getActSistemaId(rep);
                const sisNombre = sisId
                    ? sistemasMap.get(sisId)?.nombre_sistema.toLowerCase() ?? ''
                    : '';
                return matchDesc || matchCod || sisNombre.includes(q);
            }

            return true;
        });
    }, [
        entradasBanco,
        searchQuery,
        vistaRapida,
        filtroNaturaleza,
        filtroSistema,
        filtroEquipo,
        serviciosMap,
        sistemasMap,
    ]);

    // KPIs Ejecutivos
    const kpis = useMemo(() => {
        const totalConceptos = entradasBanco.length;
        const totalMediciones = entradasBanco.filter(
            (e) => getActTipo(e.representante) === 'MEDICION',
        ).length;
        const totalAsignaciones = actividades.filter(
            (a: CatalogoActividad) => a.activo !== false && getActServicioId(a) !== null,
        ).length;
        const sinServicio = entradasBanco.filter((e) => e.serviciosIds.length === 0).length;
        return { totalConceptos, totalMediciones, totalAsignaciones, sinServicio };
    }, [entradasBanco, actividades]);

    const handleEliminarEntrada = async (entrada: EntradaBancoUniversal) => {
        const confirmacion = window.confirm(
            `¿Deseas desactivar "${getActDesc(entrada.representante)}" del Banco Universal?`,
        );
        if (!confirmacion) return;
        try {
            await deleteActividad.mutateAsync(getActId(entrada.representante));
            toast.success('Actividad desactivada correctamente');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'No se pudo eliminar la actividad';
            toast.error(msg);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-600">
                    Cargando Diccionario Maestro del Banco Universal...
                </p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
                <h3 className="text-base font-bold text-rose-900">
                    Error al cargar el Banco Universal de Actividades
                </h3>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* 1. CABECERA EJECUTIVA DEL DICCIONARIO MAESTRO */}
            <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 shadow-xl border border-slate-800">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5" />
                            Diccionario Maestro EAM • Reutilización y Propagación en Cascada
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
                            <BookOpen className="h-7 w-7 text-blue-400" />
                            Banco Universal de Actividades y Telemetría
                        </h1>
                        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                            Repositorio canónico de inspecciones cualitativas y puntos de medición cuantitativa (UoM).
                            Crea tareas estándar una sola vez sin atarlas a un servicio, inyéctalas en múltiples protocolos y
                            propaga correcciones en cascada a todos los servicios vinculados.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Link
                            href="/configuracion/catalogos/tipos-servicio"
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <Wrench className="h-4 w-4 text-blue-300" />
                            Ir a Tipos de Servicio y Protocolos
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                setEntradaEditar(null);
                                setModalCrearAbierto(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva Plantilla en el Banco
                        </button>
                    </div>
                </div>

                {/* KPIs del Banco Universal */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="text-[11px] text-slate-300 font-medium">
                            Conceptos Únicos en el Banco
                        </div>
                        <div className="text-2xl font-black text-white mt-0.5">
                            {kpis.totalConceptos}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="text-[11px] text-purple-200 font-medium flex items-center gap-1">
                            <Gauge className="h-3.5 w-3.5 text-purple-300" />
                            Puntos de Telemetría (UoM)
                        </div>
                        <div className="text-2xl font-black text-purple-200 mt-0.5">
                            {kpis.totalMediciones}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="text-[11px] text-emerald-200 font-medium">
                            Asignaciones Activas en Protocolos
                        </div>
                        <div className="text-2xl font-black text-emerald-300 mt-0.5">
                            {kpis.totalAsignaciones}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="text-[11px] text-amber-200 font-medium">
                            Plantillas Libres (Sin Servicio Aún)
                        </div>
                        <div className="text-2xl font-black text-amber-300 mt-0.5">
                            {kpis.sinServicio}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. BARRA DE FILTROS DE GOBERNANZA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Filter className="h-3.5 w-3.5 text-blue-600" />
                        Filtros del Diccionario Maestro
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {(
                            [
                                { id: 'TODAS', label: `Todas (${entradasBanco.length})` },
                                {
                                    id: 'INSPECCION',
                                    label: `Inspección / Checklist (${entradasBanco.length - kpis.totalMediciones})`,
                                },
                                {
                                    id: 'MEDICION',
                                    label: `Telemetría UoM (${kpis.totalMediciones})`,
                                },
                                {
                                    id: 'SIN_SERVICIO',
                                    label: `Plantillas Libres (${kpis.sinServicio})`,
                                },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setVistaRapida(tab.id)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-bold transition-all',
                                    vistaRapida === tab.id
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4 relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por descripción, código o subsistema..."
                            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="md:col-span-3">
                        <EamSelect
                            value={filtroEquipo}
                            onChange={(val: string) => setFiltroEquipo(val || 'ALL')}
                            options={filtroEquipoOptions}
                            placeholder="Filtrar por Tipo de Equipo..."
                        />
                    </div>

                    <div className="md:col-span-3">
                        <EamSelect
                            value={filtroSistema}
                            onChange={(val: string) => setFiltroSistema(val || 'ALL')}
                            options={filtroSistemaOptions}
                            placeholder="Filtrar por Subsistema..."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <EamSelect
                            value={filtroNaturaleza}
                            onChange={(val: string) => setFiltroNaturaleza(val || 'ALL')}
                            options={filtroNaturalezaOptions}
                            placeholder="Naturaleza..."
                        />
                    </div>
                </div>
            </div>

            {/* 3. LISTADO CANÓNICO DEDUPLICADO DEL BANCO UNIVERSAL */}
            {entradasFiltradas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                    <Activity className="h-10 w-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">
                        No se encontraron plantillas con los filtros actuales
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Puedes limpiar los filtros o crear una nueva plantilla maestra directamente en el Banco Universal.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setEntradaEditar(null);
                            setModalCrearAbierto(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Crear Plantilla en el Banco Universal
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {entradasFiltradas.map((entrada) => {
                        const rep = entrada.representante;
                        const tipo = getActTipo(rep);
                        const cfg =
                            TIPO_ACTIVIDAD_CONFIG[tipo] ??
                            TIPO_ACTIVIDAD_CONFIG.INSPECCION;
                        const sisId = getActSistemaId(rep);
                        const eqId = getActEquipoId(rep);
                        const paramId = getActParametroId(rep);
                        const sistema = sisId ? sistemasMap.get(sisId) : null;
                        const arquetipo = eqId ? arquetiposMap.get(eqId) : null;
                        const paramLista = paramId ? parametrosMap.get(paramId) : undefined;
                        const paramCqrs = rep.parametroMedicion;
                        const uMed =
                            paramLista?.unidad_medida ??
                            paramCqrs?.unidadMedida ??
                            rep.parametros_medicion?.unidad_medida;
                        const minN = paramLista?.valor_minimo_normal ?? paramCqrs?.valorMinimoNormal;
                        const maxN = paramLista?.valor_maximo_normal ?? paramCqrs?.valorMaximoNormal;

                        return (
                            <div
                                key={entrada.firmaCanonica}
                                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 px-5 py-4 shadow-2xs transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                            >
                                <div className="space-y-2 min-w-0 flex-1">
                                    {/* Badges superiores */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={cn(
                                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                                                cfg.bg,
                                                cfg.color,
                                                cfg.border,
                                            )}
                                        >
                                            {rep.naturalezaPersonalizada || rep.naturaleza_personalizada || cfg.label}
                                        </span>

                                        {(rep.tipoControlInput || rep.tipo_control_input) &&
                                            (rep.tipoControlInput || rep.tipo_control_input) !== 'ESCALA_ESTADO' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {getModoRespuestaBadgeLabel(
                                                        rep.tipoControlInput || rep.tipo_control_input,
                                                        rep.configInputJson || rep.config_input_json,
                                                    )}
                                                </span>
                                            )}

                                        {sistema && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                                                <Layers className="h-3 w-3 text-slate-500" />
                                                {sistema.nombre_sistema}
                                            </span>
                                        )}

                                        {arquetipo && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                                                <Cpu className="h-3 w-3 text-indigo-500" />
                                                {arquetipo.nombre_tipo} ({arquetipo.codigo_tipo})
                                            </span>
                                        )}

                                        {tipo === 'MEDICION' && uMed && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1.5">
                                                <Gauge className="h-3.5 w-3.5 text-purple-700" />
                                                UoM: {uMed} • Rango Normal: [{minN ?? 0} — {maxN ?? 100}{' '}
                                                {uMed}]
                                            </span>
                                        )}

                                        {getActObligatoria(rep) && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                                <ShieldCheck className="h-3 w-3" />
                                                Obligatoria
                                            </span>
                                        )}
                                    </div>

                                    {/* Descripción principal */}
                                    <div className="text-sm font-bold text-slate-900">
                                        {getActDesc(rep)}
                                    </div>

                                    {/* Chips de Servicios donde se usa esta actividad */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            Presente en {entrada.serviciosIds.length} protocolo(s):
                                        </span>
                                        {entrada.serviciosIds.length === 0 ? (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                Plantilla libre en el Banco (sin vincular aún)
                                            </span>
                                        ) : (
                                            entrada.serviciosIds.map((idSrv) => {
                                                const srv = serviciosMap.get(idSrv);
                                                if (!srv) return null;
                                                return (
                                                    <Link
                                                        key={idSrv}
                                                        href={`/configuracion/catalogos/tipos-servicio?protocolo=${idSrv}`}
                                                        title="Abrir Fast-Protocol Builder de este servicio"
                                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        {srv.codigo_tipo}
                                                        <ArrowRight className="h-2.5 w-2.5" />
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Botones de Acción del Diccionario Maestro */}
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setEntradaVincular(entrada)}
                                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                        Vincular a Servicio(s)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntradaEditar(entrada);
                                            setModalCrearAbierto(true);
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Editar y Propagar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleEliminarEntrada(entrada)}
                                        title="Desactivar plantilla"
                                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODALES */}
            <BancoActividadModal
                isOpen={modalCrearAbierto}
                onClose={() => {
                    setModalCrearAbierto(false);
                    setEntradaEditar(null);
                }}
                entradaEditar={entradaEditar}
                arquetipos={arquetipos}
                sistemas={sistemas}
                tiposServicio={tiposServicio}
                parametros={parametros}
                unidadesOptions={unidadesOptions}
            />

            <VincularServiciosModal
                isOpen={Boolean(entradaVincular)}
                onClose={() => setEntradaVincular(null)}
                entrada={entradaVincular}
                tiposServicio={tiposServicio}
                sistemas={sistemas}
            />
        </div>
    );
}

export default function ActividadesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            }
        >
            <BancoUniversalActividadesContent />
        </Suspense>
    );
}
