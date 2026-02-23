/**
 * PÁGINA DE EDICIÓN DE EQUIPO - MEKANOS S.A.S
 * Ruta: /equipos/[id]/editar
 * 
 * ✅ 23-FEB-2026: CRUD COMPLETO - Edición de TODOS los campos:
 *   - Datos Base (equipos)
 *   - Motor (equipos_motor)
 *   - Generador (equipos_generador) / Bomba (equipos_bomba)
 */

'use client';

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
    useEquipo
} from '@/features/equipos';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    ChevronDown,
    ChevronRight,
    Droplets,
    Loader2,
    Save,
    Settings,
    X,
    Zap
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════

const ESTADOS_EQUIPO: { value: EstadoEquipo; label: string }[] = [
    { value: 'OPERATIVO', label: 'Operativo' },
    { value: 'STANDBY', label: 'Standby' },
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
    { value: 'DIAS', label: 'Días' },
    { value: 'HORAS', label: 'Horas' },
    { value: 'LO_QUE_OCURRA_PRIMERO', label: 'Lo que ocurra primero' },
];

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
const selectCls = inputCls;
const disabledCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm";

function Field({ label, req, children, hint }: { label: string; req?: boolean; children: React.ReactNode; hint?: string }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
                {label}{req && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
    );
}

function Section({ title, icon, open, onToggle, children }: {
    title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <button type="button" onClick={onToggle} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl">
                <div className="flex items-center gap-2">
                    {icon}
                    <h2 className="font-semibold text-gray-900">{title}</h2>
                </div>
                {open ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
            </button>
            {open && <div className="p-5 border-t border-gray-100">{children}</div>}
        </div>
    );
}

function TipoIcon({ tipo }: { tipo: string }) {
    if (tipo === 'GENERADOR') return <Zap className="h-5 w-5 text-yellow-500" />;
    if (tipo === 'BOMBA') return <Droplets className="h-5 w-5 text-blue-500" />;
    return <Settings className="h-5 w-5 text-gray-500" />;
}

function dateToInput(d: string | null | undefined): string {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
}

// ═══════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════

export default function EditarEquipoPage() {
    const params = useParams();
    const router = useRouter();
    const id = parseInt(params.id as string);

    const { data, isLoading, isError, error } = useEquipo(id);
    const actualizarBase = useActualizarEquipo();
    const actualizarEspecificos = useActualizarDatosEspecificos();
    const equipo = data?.data;

    // Section open states
    const [openSections, setOpenSections] = useState({
        base: true, fechas: false, garantia: false, pintura: false, contrato: false,
        intervalos: false, observaciones: false, motor: false, especifico: false, parametros: false,
    });
    const toggle = (s: keyof typeof openSections) => setOpenSections(p => ({ ...p, [s]: !p[s] }));

    // ═══════════════════════════════════════════════════════
    // FORM STATE - BASE
    // ═══════════════════════════════════════════════════════
    const [base, setBase] = useState<Record<string, any>>({});
    const [hasBaseChanges, setHasBaseChanges] = useState(false);

    // ═══════════════════════════════════════════════════════
    // FORM STATE - DATOS ESPECÍFICOS (Motor/Generador/Bomba)
    // ═══════════════════════════════════════════════════════
    const [motor, setMotor] = useState<Record<string, any>>({});
    const [especifico, setEspecifico] = useState<Record<string, any>>({});
    const [hasEspecificosChanges, setHasEspecificosChanges] = useState(false);

    const [configParametros, setConfigParametros] = useState<ConfigParametros>({});

    // Load data into form
    useEffect(() => {
        if (!equipo) return;
        setBase({
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
        });
        if (equipo.config_parametros) setConfigParametros(equipo.config_parametros as ConfigParametros);
        // Load motor & specific data from datos_especificos
        const de = equipo.datos_especificos as Record<string, any> | null;
        if (de) {
            if (de.motor) setMotor({ ...de.motor });
            // Separate motor from specific data
            const { motor: _m, ...rest } = de;
            setEspecifico({ ...rest });
        }
    }, [equipo]);

    const setB = (field: string, value: any) => { setBase(p => ({ ...p, [field]: value })); setHasBaseChanges(true); };
    const setM = (field: string, value: any) => { setMotor(p => ({ ...p, [field]: value })); setHasEspecificosChanges(true); };
    const setE = (field: string, value: any) => { setEspecifico(p => ({ ...p, [field]: value })); setHasEspecificosChanges(true); };

    // ═══════════════════════════════════════════════════════
    // SAVE HANDLERS
    // ═══════════════════════════════════════════════════════

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
            intervalo_tipo_a_dias_override: base.intervalo_tipo_a_dias_override ? parseInt(base.intervalo_tipo_a_dias_override) : null,
            intervalo_tipo_a_horas_override: base.intervalo_tipo_a_horas_override ? parseFloat(base.intervalo_tipo_a_horas_override) : null,
            intervalo_tipo_b_dias_override: base.intervalo_tipo_b_dias_override ? parseInt(base.intervalo_tipo_b_dias_override) : null,
            intervalo_tipo_b_horas_override: base.intervalo_tipo_b_horas_override ? parseFloat(base.intervalo_tipo_b_horas_override) : null,
            criterio_intervalo_override: (base.criterio_intervalo_override as CriterioIntervalo) || null,
            observaciones_generales: base.observaciones_generales || undefined,
            configuracion_especial: base.configuracion_especial || undefined,
            config_parametros: Object.keys(configParametros).length > 0 ? configParametros : undefined,
        };
        try {
            await actualizarBase.mutateAsync({ id, payload });
            setHasBaseChanges(false);
        } catch (err) { console.error('Error al guardar base:', err); }
    };

    const handleSaveEspecificos = async () => {
        const payload: UpdateDatosEspecificosPayload = {};
        // Motor data - clean up non-null values
        if (Object.keys(motor).length > 0) {
            const m: Record<string, any> = {};
            for (const [k, v] of Object.entries(motor)) {
                if (k === 'id_equipo' || k === 'creado_por' || k === 'fecha_creacion') continue;
                if (v !== null && v !== undefined && v !== '') m[k] = v;
            }
            if (Object.keys(m).length > 0) payload.datosMotor = m;
        }
        // Generador/Bomba data
        if (Object.keys(especifico).length > 0) {
            const e: Record<string, any> = {};
            for (const [k, v] of Object.entries(especifico)) {
                if (k === 'id_equipo' || k === 'creado_por' || k === 'fecha_creacion' || k === 'tabla') continue;
                if (v !== null && v !== undefined && v !== '') e[k] = v;
            }
            if (Object.keys(e).length > 0) {
                if (equipo?.tipo === 'GENERADOR') payload.datosGenerador = e;
                else if (equipo?.tipo === 'BOMBA') payload.datosBomba = e;
            }
        }
        try {
            await actualizarEspecificos.mutateAsync({ id, payload });
            setHasEspecificosChanges(false);
        } catch (err) { console.error('Error al guardar datos específicos:', err); }
    };

    const handleCancel = () => {
        if (hasBaseChanges || hasEspecificosChanges) {
            if (confirm('¿Descartar los cambios realizados?')) router.push(`/equipos/${id}`);
        } else {
            router.push(`/equipos/${id}`);
        }
    };

    // Loading / Error
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-gray-500">Cargando información del equipo...</p>
            </div>
        </div>
    );

    if (isError || !equipo) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Error al cargar el equipo</h2>
            <p className="text-gray-500">{(error as Error)?.message || 'No se encontró el equipo'}</p>
            <button onClick={() => router.push('/equipos')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4" />Volver a Equipos
            </button>
        </div>
    );

    const tipoEquipo = equipo.tipo;

    return (
        <div className="max-w-5xl mx-auto space-y-4 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <TipoIcon tipo={tipoEquipo} />
                            <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{equipo.codigo_equipo}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{tipoEquipo}</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Editar Equipo Completo</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(hasBaseChanges || hasEspecificosChanges) && (
                        <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Cambios sin guardar</span>
                    )}
                </div>
            </div>

            {/* ═══════════════ SECCIÓN 1: DATOS BASE ═══════════════ */}
            <Section title="Datos Básicos" icon={<Settings className="h-5 w-5 text-gray-500" />} open={openSections.base} onToggle={() => toggle('base')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nombre del Equipo" req>
                        <input type="text" value={base.nombre_equipo || ''} onChange={e => setB('nombre_equipo', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Código Equipo">
                        <input type="text" value={base.codigo_equipo || ''} onChange={e => setB('codigo_equipo', e.target.value.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-]/g, ''))} className={inputCls + ' uppercase font-mono'} />
                    </Field>
                    <Field label="Número de Serie" hint="No editable">
                        <input type="text" value={base.numero_serie_equipo || ''} disabled className={disabledCls} />
                    </Field>
                    <Field label="Ubicación" req>
                        <input type="text" value={base.ubicacion_texto || ''} onChange={e => setB('ubicacion_texto', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Estado">
                        <select value={base.estado_equipo || ''} onChange={e => setB('estado_equipo', e.target.value)} className={selectCls}>
                            {ESTADOS_EQUIPO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Criticidad">
                        <select value={base.criticidad || ''} onChange={e => setB('criticidad', e.target.value)} className={selectCls}>
                            {CRITICIDADES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="Justificación Criticidad">
                            <textarea value={base.criticidad_justificacion || ''} onChange={e => setB('criticidad_justificacion', e.target.value)} className={inputCls} rows={2} />
                        </Field>
                    </div>
                </div>
            </Section>

            {/* FECHAS */}
            <Section title="Fechas" icon={<Settings className="h-5 w-5 text-indigo-500" />} open={openSections.fechas} onToggle={() => toggle('fechas')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Fecha Instalación">
                        <input type="date" value={base.fecha_instalacion || ''} onChange={e => setB('fecha_instalacion', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Fecha Inicio Servicio Mekanos">
                        <input type="date" value={base.fecha_inicio_servicio_mekanos || ''} onChange={e => setB('fecha_inicio_servicio_mekanos', e.target.value)} className={inputCls} />
                    </Field>
                </div>
            </Section>

            {/* GARANTÍA */}
            <Section title="Garantía" icon={<Settings className="h-5 w-5 text-green-500" />} open={openSections.garantia} onToggle={() => toggle('garantia')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="¿En Garantía?">
                        <select value={base.en_garantia ? 'true' : 'false'} onChange={e => setB('en_garantia', e.target.value === 'true')} className={selectCls}>
                            <option value="false">No</option>
                            <option value="true">Sí</option>
                        </select>
                    </Field>
                    <Field label="Proveedor Garantía">
                        <input type="text" value={base.proveedor_garantia || ''} onChange={e => setB('proveedor_garantia', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Fecha Inicio Garantía">
                        <input type="date" value={base.fecha_inicio_garantia || ''} onChange={e => setB('fecha_inicio_garantia', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Fecha Fin Garantía">
                        <input type="date" value={base.fecha_fin_garantia || ''} onChange={e => setB('fecha_fin_garantia', e.target.value)} className={inputCls} />
                    </Field>
                </div>
            </Section>

            {/* PINTURA & CONTRATO */}
            <Section title="Pintura y Contrato" icon={<Settings className="h-5 w-5 text-orange-500" />} open={openSections.pintura} onToggle={() => toggle('pintura')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Estado Pintura">
                        <select value={base.estado_pintura || ''} onChange={e => setB('estado_pintura', e.target.value)} className={selectCls}>
                            {ESTADOS_PINTURA.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                    </Field>
                    <Field label="¿Requiere Pintura?">
                        <select value={base.requiere_pintura ? 'true' : 'false'} onChange={e => setB('requiere_pintura', e.target.value === 'true')} className={selectCls}>
                            <option value="false">No</option>
                            <option value="true">Sí</option>
                        </select>
                    </Field>
                    <Field label="Tipo de Contrato">
                        <select value={base.tipo_contrato || ''} onChange={e => setB('tipo_contrato', e.target.value)} className={selectCls}>
                            {TIPOS_CONTRATO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </Field>
                </div>
            </Section>

            {/* INTERVALOS OVERRIDE */}
            <Section title="Intervalos Mantenimiento (Override)" icon={<Settings className="h-5 w-5 text-purple-500" />} open={openSections.intervalos} onToggle={() => toggle('intervalos')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Intervalo Tipo A - Días">
                        <input type="number" value={base.intervalo_tipo_a_dias_override ?? ''} onChange={e => setB('intervalo_tipo_a_dias_override', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Intervalo Tipo A - Horas">
                        <input type="number" step="0.1" value={base.intervalo_tipo_a_horas_override ?? ''} onChange={e => setB('intervalo_tipo_a_horas_override', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Intervalo Tipo B - Días">
                        <input type="number" value={base.intervalo_tipo_b_dias_override ?? ''} onChange={e => setB('intervalo_tipo_b_dias_override', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Intervalo Tipo B - Horas">
                        <input type="number" step="0.1" value={base.intervalo_tipo_b_horas_override ?? ''} onChange={e => setB('intervalo_tipo_b_horas_override', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Criterio Intervalo">
                        <select value={base.criterio_intervalo_override || ''} onChange={e => setB('criterio_intervalo_override', e.target.value)} className={selectCls}>
                            <option value="">— Sin override —</option>
                            {CRITERIOS_INTERVALO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </Field>
                </div>
            </Section>

            {/* OBSERVACIONES */}
            <Section title="Observaciones" icon={<Settings className="h-5 w-5 text-teal-500" />} open={openSections.observaciones} onToggle={() => toggle('observaciones')}>
                <div className="space-y-4">
                    <Field label="Observaciones Generales">
                        <textarea value={base.observaciones_generales || ''} onChange={e => setB('observaciones_generales', e.target.value)} className={inputCls} rows={3} />
                    </Field>
                    <Field label="Configuración Especial">
                        <textarea value={base.configuracion_especial || ''} onChange={e => setB('configuracion_especial', e.target.value)} className={inputCls} rows={3} />
                    </Field>
                </div>
            </Section>

            {/* SAVE BASE BUTTON */}
            <div className="flex items-center justify-end gap-3">
                {actualizarBase.isSuccess && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Base guardada</span>}
                {actualizarBase.isError && <span className="text-sm text-red-600">Error: {(actualizarBase.error as Error)?.message}</span>}
                <button type="button" onClick={handleSaveBase} disabled={actualizarBase.isPending || !hasBaseChanges}
                    className={cn('flex items-center gap-2 px-5 py-2 rounded-lg shadow-sm text-sm font-medium transition-colors',
                        actualizarBase.isPending || !hasBaseChanges ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                    {actualizarBase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Datos Base
                </button>
            </div>

            {/* ═══════════════ SECCIÓN 2: MOTOR ═══════════════ */}
            {Object.keys(motor).length > 0 && (
                <Section title={`Motor (${motor.tipo_motor || 'N/A'})`} icon={<Zap className="h-5 w-5 text-amber-500" />} open={openSections.motor} onToggle={() => toggle('motor')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Tipo Motor">
                            <select value={motor.tipo_motor || ''} onChange={e => setM('tipo_motor', e.target.value)} className={selectCls}>
                                <option value="COMBUSTION">Combustión</option>
                                <option value="ELECTRICO">Eléctrico</option>
                            </select>
                        </Field>
                        <Field label="Marca Motor" req>
                            <input type="text" value={motor.marca_motor || ''} onChange={e => setM('marca_motor', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Modelo Motor">
                            <input type="text" value={motor.modelo_motor || ''} onChange={e => setM('modelo_motor', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="N° Serie Motor">
                            <input type="text" value={motor.numero_serie_motor || ''} onChange={e => setM('numero_serie_motor', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Potencia HP">
                            <input type="number" step="0.01" value={motor.potencia_hp ?? ''} onChange={e => setM('potencia_hp', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
                        </Field>
                        <Field label="Potencia kW">
                            <input type="number" step="0.01" value={motor.potencia_kw ?? ''} onChange={e => setM('potencia_kw', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
                        </Field>
                        <Field label="RPM Nominal">
                            <input type="number" value={motor.velocidad_nominal_rpm ?? ''} onChange={e => setM('velocidad_nominal_rpm', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
                        </Field>

                        {motor.tipo_motor === 'COMBUSTION' && (<>
                            <Field label="Tipo Combustible">
                                <select value={motor.tipo_combustible || ''} onChange={e => setM('tipo_combustible', e.target.value)} className={selectCls}>
                                    {['DIESEL', 'GASOLINA', 'GAS_NATURAL', 'GLP', 'DUAL', 'BIODIESEL'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </Field>
                            <Field label="N° Cilindros">
                                <input type="number" min={1} max={24} value={motor.numero_cilindros ?? ''} onChange={e => setM('numero_cilindros', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Voltaje Arranque VDC">
                                <select value={motor.voltaje_arranque_vdc ?? ''} onChange={e => setM('voltaje_arranque_vdc', e.target.value ? parseInt(e.target.value) : null)} className={selectCls}>
                                    <option value="">—</option>
                                    <option value="12">12V</option>
                                    <option value="24">24V</option>
                                    <option value="48">48V</option>
                                </select>
                            </Field>
                            <Field label="Tipo Arranque">
                                <select value={motor.tipo_arranque || ''} onChange={e => setM('tipo_arranque', e.target.value)} className={selectCls}>
                                    {['ELECTRICO', 'MANUAL', 'NEUMATICO', 'HIDRAULICO'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </Field>
                            <Field label="Cap. Aceite (L)">
                                <input type="number" step="0.1" value={motor.capacidad_aceite_litros ?? ''} onChange={e => setM('capacidad_aceite_litros', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Tipo Aceite">
                                <input type="text" value={motor.tipo_aceite || ''} onChange={e => setM('tipo_aceite', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Cap. Refrigerante (L)">
                                <input type="number" step="0.1" value={motor.capacidad_refrigerante_litros ?? ''} onChange={e => setM('capacidad_refrigerante_litros', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Tipo Refrigerante">
                                <input type="text" value={motor.tipo_refrigerante || ''} onChange={e => setM('tipo_refrigerante', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="N° Baterías">
                                <input type="number" value={motor.numero_baterias ?? ''} onChange={e => setM('numero_baterias', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Ref. Batería">
                                <input type="text" value={motor.referencia_bateria || ''} onChange={e => setM('referencia_bateria', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Cap. Batería (Ah)">
                                <input type="number" value={motor.capacidad_bateria_ah ?? ''} onChange={e => setM('capacidad_bateria_ah', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
                            </Field>
                        </>)}

                        {motor.tipo_motor === 'ELECTRICO' && (<>
                            <Field label="Voltaje Operación VAC">
                                <input type="text" value={motor.voltaje_operacion_vac || ''} onChange={e => setM('voltaje_operacion_vac', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="N° Fases">
                                <select value={motor.numero_fases || ''} onChange={e => setM('numero_fases', e.target.value)} className={selectCls}>
                                    <option value="MONOFASICO">Monofásico</option>
                                    <option value="TRIFASICO">Trifásico</option>
                                </select>
                            </Field>
                            <Field label="Frecuencia Hz">
                                <input type="number" value={motor.frecuencia_hz ?? ''} onChange={e => setM('frecuencia_hz', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Amperaje Nominal">
                                <input type="number" step="0.01" value={motor.amperaje_nominal ?? ''} onChange={e => setM('amperaje_nominal', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Factor Potencia">
                                <input type="number" step="0.01" min={0} max={1} value={motor.factor_potencia ?? ''} onChange={e => setM('factor_potencia', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
                            </Field>
                            <Field label="Clase Aislamiento">
                                <select value={motor.clase_aislamiento || ''} onChange={e => setM('clase_aislamiento', e.target.value)} className={selectCls}>
                                    <option value="">—</option>
                                    {['A', 'B', 'F', 'H'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </Field>
                            <Field label="Grado Protección IP">
                                <input type="text" value={motor.grado_proteccion_ip || ''} onChange={e => setM('grado_proteccion_ip', e.target.value)} className={inputCls} />
                            </Field>
                        </>)}
                    </div>
                </Section>
            )}

            {/* ═══════════════ SECCIÓN 3: GENERADOR / BOMBA ═══════════════ */}
            {tipoEquipo === 'GENERADOR' && Object.keys(especifico).length > 0 && (
                <Section title="Datos Generador" icon={<Zap className="h-5 w-5 text-yellow-500" />} open={openSections.especifico} onToggle={() => toggle('especifico')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Marca Generador" req><input type="text" value={especifico.marca_generador || ''} onChange={e => setE('marca_generador', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo Generador"><input type="text" value={especifico.modelo_generador || ''} onChange={e => setE('modelo_generador', e.target.value)} className={inputCls} /></Field>
                        <Field label="N° Serie Generador"><input type="text" value={especifico.numero_serie_generador || ''} onChange={e => setE('numero_serie_generador', e.target.value)} className={inputCls} /></Field>
                        <Field label="Marca Alternador"><input type="text" value={especifico.marca_alternador || ''} onChange={e => setE('marca_alternador', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo Alternador"><input type="text" value={especifico.modelo_alternador || ''} onChange={e => setE('modelo_alternador', e.target.value)} className={inputCls} /></Field>
                        <Field label="N° Serie Alternador"><input type="text" value={especifico.numero_serie_alternador || ''} onChange={e => setE('numero_serie_alternador', e.target.value)} className={inputCls} /></Field>
                        <Field label="Potencia kW"><input type="number" step="0.01" value={especifico.potencia_kw ?? ''} onChange={e => setE('potencia_kw', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Potencia kVA"><input type="number" step="0.01" value={especifico.potencia_kva ?? ''} onChange={e => setE('potencia_kva', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Factor Potencia"><input type="number" step="0.01" min={0.5} max={1} value={especifico.factor_potencia ?? ''} onChange={e => setE('factor_potencia', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Voltaje Salida" req><input type="text" value={especifico.voltaje_salida || ''} onChange={e => setE('voltaje_salida', e.target.value)} className={inputCls} /></Field>
                        <Field label="N° Fases">
                            <select value={especifico.numero_fases ?? ''} onChange={e => setE('numero_fases', e.target.value ? parseInt(e.target.value) : null)} className={selectCls}>
                                <option value="3">Trifásico (3)</option><option value="1">Monofásico (1)</option>
                            </select>
                        </Field>
                        <Field label="Frecuencia Hz">
                            <select value={especifico.frecuencia_hz ?? ''} onChange={e => setE('frecuencia_hz', e.target.value ? parseInt(e.target.value) : null)} className={selectCls}>
                                <option value="60">60 Hz</option><option value="50">50 Hz</option>
                            </select>
                        </Field>
                        <Field label="Amperaje Nominal Salida"><input type="number" step="0.01" value={especifico.amperaje_nominal_salida ?? ''} onChange={e => setE('amperaje_nominal_salida', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Marca AVR"><input type="text" value={especifico.marca_avr || ''} onChange={e => setE('marca_avr', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo AVR"><input type="text" value={especifico.modelo_avr || ''} onChange={e => setE('modelo_avr', e.target.value)} className={inputCls} /></Field>
                        <Field label="Marca Módulo Control"><input type="text" value={especifico.marca_modulo_control || ''} onChange={e => setE('marca_modulo_control', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo Módulo Control"><input type="text" value={especifico.modelo_modulo_control || ''} onChange={e => setE('modelo_modulo_control', e.target.value)} className={inputCls} /></Field>
                        <Field label="Cap. Tanque Principal (L)"><input type="number" step="0.1" value={especifico.capacidad_tanque_principal_litros ?? ''} onChange={e => setE('capacidad_tanque_principal_litros', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Cap. Tanque Auxiliar (L)"><input type="number" step="0.1" value={especifico.capacidad_tanque_auxiliar_litros ?? ''} onChange={e => setE('capacidad_tanque_auxiliar_litros', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                    </div>
                </Section>
            )}

            {tipoEquipo === 'BOMBA' && Object.keys(especifico).length > 0 && (
                <Section title="Datos Bomba" icon={<Droplets className="h-5 w-5 text-blue-500" />} open={openSections.especifico} onToggle={() => toggle('especifico')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Marca Bomba" req><input type="text" value={especifico.marca_bomba || ''} onChange={e => setE('marca_bomba', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo Bomba"><input type="text" value={especifico.modelo_bomba || ''} onChange={e => setE('modelo_bomba', e.target.value)} className={inputCls} /></Field>
                        <Field label="N° Serie Bomba"><input type="text" value={especifico.numero_serie_bomba || ''} onChange={e => setE('numero_serie_bomba', e.target.value)} className={inputCls} /></Field>
                        <Field label="Tipo Bomba">
                            <select value={especifico.tipo_bomba || ''} onChange={e => setE('tipo_bomba', e.target.value)} className={selectCls}>
                                {['CENTRIFUGA', 'TURBINA_VERTICAL_POZO', 'SUMERGIBLE', 'PERIFERICA', 'TURBINA', 'DESPLAZAMIENTO_POSITIVO', 'TANQUE_A_TANQUE', 'HIDRO'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </Field>
                        <Field label="Aplicación">
                            <select value={especifico.aplicacion_bomba || ''} onChange={e => setE('aplicacion_bomba', e.target.value)} className={selectCls}>
                                <option value="">—</option>
                                {['AGUA_POTABLE', 'AGUAS_RESIDUALES', 'AGUAS_LLUVIAS', 'CONTRAINCENDIOS', 'INDUSTRIAL', 'PISCINA', 'RIEGO'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </Field>
                        <Field label="Diámetro Aspiración"><input type="text" value={especifico.diametro_aspiracion || ''} onChange={e => setE('diametro_aspiracion', e.target.value)} className={inputCls} /></Field>
                        <Field label="Diámetro Descarga"><input type="text" value={especifico.diametro_descarga || ''} onChange={e => setE('diametro_descarga', e.target.value)} className={inputCls} /></Field>
                        <Field label="Caudal Máx (m³/h)"><input type="number" step="0.01" value={especifico.caudal_maximo_m3h ?? ''} onChange={e => setE('caudal_maximo_m3h', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Altura Manométrica Máx (m)"><input type="number" step="0.01" value={especifico.altura_manometrica_maxima_m ?? ''} onChange={e => setE('altura_manometrica_maxima_m', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Altura Trabajo (m)"><input type="number" step="0.01" value={especifico.altura_presion_trabajo_m ?? ''} onChange={e => setE('altura_presion_trabajo_m', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Presión Encendido (PSI)"><input type="number" step="0.01" value={especifico.presion_encendido_psi ?? ''} onChange={e => setE('presion_encendido_psi', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Presión Apagado (PSI)"><input type="number" step="0.01" value={especifico.presion_apagado_psi ?? ''} onChange={e => setE('presion_apagado_psi', e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="N° Total Bombas Sistema"><input type="number" min={1} value={especifico.numero_total_bombas_sistema ?? ''} onChange={e => setE('numero_total_bombas_sistema', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Bomba N° en Sistema"><input type="number" min={1} value={especifico.numero_bomba_en_sistema ?? ''} onChange={e => setE('numero_bomba_en_sistema', e.target.value ? parseInt(e.target.value) : null)} className={inputCls} /></Field>
                        <Field label="Marca Panel Control"><input type="text" value={especifico.marca_panel_control || ''} onChange={e => setE('marca_panel_control', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo Panel Control"><input type="text" value={especifico.modelo_panel_control || ''} onChange={e => setE('modelo_panel_control', e.target.value)} className={inputCls} /></Field>
                        <Field label="Marca Variador"><input type="text" value={especifico.marca_variador || ''} onChange={e => setE('marca_variador', e.target.value)} className={inputCls} /></Field>
                        <Field label="Modelo Variador"><input type="text" value={especifico.modelo_variador || ''} onChange={e => setE('modelo_variador', e.target.value)} className={inputCls} /></Field>
                        <Field label="Ref. Sello Mecánico"><input type="text" value={especifico.referencia_sello_mecanico || ''} onChange={e => setE('referencia_sello_mecanico', e.target.value)} className={inputCls} /></Field>
                    </div>
                </Section>
            )}

            {/* SAVE SPECIFIC DATA BUTTON */}
            {(Object.keys(motor).length > 0 || Object.keys(especifico).length > 0) && (
                <div className="flex items-center justify-end gap-3">
                    {actualizarEspecificos.isSuccess && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Datos específicos guardados</span>}
                    {actualizarEspecificos.isError && <span className="text-sm text-red-600">Error: {(actualizarEspecificos.error as Error)?.message}</span>}
                    <button type="button" onClick={handleSaveEspecificos} disabled={actualizarEspecificos.isPending || !hasEspecificosChanges}
                        className={cn('flex items-center gap-2 px-5 py-2 rounded-lg shadow-sm text-sm font-medium transition-colors',
                            actualizarEspecificos.isPending || !hasEspecificosChanges ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700')}>
                        {actualizarEspecificos.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Motor / {tipoEquipo === 'GENERADOR' ? 'Generador' : 'Bomba'}
                    </button>
                </div>
            )}

            {/* PARÁMETROS PERSONALIZADOS */}
            {(tipoEquipo === 'GENERADOR' || tipoEquipo === 'BOMBA') && (
                <Section title="Parámetros de Medición Personalizados" icon={<Settings className="h-5 w-5 text-gray-500" />} open={openSections.parametros} onToggle={() => toggle('parametros')}>
                    <ConfigParametrosEditor tipoEquipo={tipoEquipo as TipoEquipo} value={configParametros} onChange={(c) => { setConfigParametros(c); setHasBaseChanges(true); }} />
                </Section>
            )}

            {/* BOTTOM ACTION BAR */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 rounded-b-xl flex items-center justify-between">
                <button type="button" onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                    <X className="h-4 w-4" />Cancelar
                </button>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={handleSaveBase} disabled={actualizarBase.isPending || !hasBaseChanges}
                        className={cn('flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                            !hasBaseChanges ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                        {actualizarBase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Base
                    </button>
                    {(Object.keys(motor).length > 0 || Object.keys(especifico).length > 0) && (
                        <button type="button" onClick={handleSaveEspecificos} disabled={actualizarEspecificos.isPending || !hasEspecificosChanges}
                            className={cn('flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                                !hasEspecificosChanges ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700')}>
                            {actualizarEspecificos.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar Específicos
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
