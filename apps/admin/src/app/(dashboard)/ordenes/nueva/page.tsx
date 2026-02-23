/**
 * MEKANOS S.A.S - Portal Admin
 * Wizard de Creación de Orden de Servicio - MULTI-EQUIPOS
 * 
 * Ruta: /ordenes/nueva
 * 
 * Flujo de 3 pasos:
 * 1. CONTEXTO: Cliente → Sede → EQUIPOS (múltiples)
 * 2. ALCANCE: Tipo de Servicio, Prioridad, Fecha
 * 3. ASIGNACIÓN: Técnico Principal
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    getCategoriaServicioColor,
    getCategoriaServicioLabel,
    getClienteLabel,
    getEquipoLabel,
    getTecnicoLabel,
    useCascadaClienteEquipo,
    useCrearOrden,
    useTecnicosSelector,
    useWizardCatalogos,
    type ClienteSelector,
    type EquipoSelector,
    type TecnicoSelector,
    type TipoServicio,
} from '@/features/ordenes';
import { SelectorCard } from '@/features/ordenes/components/selector-card';
import { cn } from '@/lib/utils';
import {
    Building2,
    Check,
    ClipboardList,
    Loader2,
    MapPin,
    Plus,
    Search,
    Settings,
    User,
    Wrench,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface WizardData {
    clienteId?: number;
    clienteSeleccionado?: ClienteSelector;
    sedeId?: number;
    equiposSeleccionados: EquipoSelector[];
    tipoServicioId?: number;
    tipoServicioSeleccionado?: TipoServicio;
    prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
    fechaProgramada?: string;
    descripcion?: string;
    tecnicoId?: number;
    tecnicoSeleccionado?: TecnicoSelector;
}

type Paso = 1 | 2 | 3;

const PRIORIDADES = [
    { value: 'BAJA', label: 'Baja', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'URGENTE', label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function StepIndicator({ paso, pasoActual, label, icon: Icon }: { paso: Paso; pasoActual: Paso; label: string; icon: any }) {
    const completado = paso < pasoActual;
    const activo = paso === pasoActual;

    return (
        <div className="flex flex-col items-center group flex-1 relative">
            {/* Línea conectora */}
            {paso > 1 && (
                <div className={cn(
                    "absolute right-1/2 left-[-50%] top-5 h-0.5 -translate-y-1/2 z-0 transition-colors duration-500",
                    paso <= pasoActual ? "bg-blue-600" : "bg-slate-200"
                )} />
            )}

            <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl border-2 z-10 transition-all duration-500 shadow-sm',
                completado && 'bg-green-500 border-green-500 text-white scale-90 rotate-[360deg]',
                activo && 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 scale-110',
                !completado && !activo && 'bg-white border-slate-200 text-slate-400'
            )}>
                {completado ? (
                    <Check className="h-5 w-5 stroke-[3]" />
                ) : (
                    <Icon className={cn("h-5 w-5", activo ? "animate-pulse" : "")} />
                )}
            </div>

            <div className="mt-3 text-center">
                <span className={cn(
                    'text-[10px] font-bold uppercase tracking-widest transition-colors duration-300',
                    activo && 'text-blue-600',
                    completado && 'text-green-600',
                    !completado && !activo && 'text-slate-400'
                )}>
                    Paso {paso}
                </span>
                <p className={cn(
                    'text-xs font-bold transition-colors duration-300 hidden sm:block',
                    activo && 'text-slate-900',
                    completado && 'text-slate-500',
                    !completado && !activo && 'text-slate-400'
                )}>
                    {label}
                </p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASOS DEL WIZARD
// ═══════════════════════════════════════════════════════════════════════════════

function PasoContexto({
    data,
    onChange,
}: {
    data: WizardData;
    onChange: (updates: Partial<WizardData>) => void;
}) {
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaEquipo, setBusquedaEquipo] = useState('');

    const { clientes, sedes, equipos, isLoadingClientes, isFetchingClientes, isLoadingSedes, isLoadingEquipos } =
        useCascadaClienteEquipo(data.clienteId, data.sedeId, busquedaCliente);

    const equiposDisponibles = equipos
        .filter((e) => !data.equiposSeleccionados.some((sel) => sel.id_equipo === e.id_equipo))
        .filter((e) => {
            if (!busquedaEquipo.trim()) return true;
            const searchTerm = busquedaEquipo.toLowerCase();
            return (
                e.nombre_equipo?.toLowerCase().includes(searchTerm) ||
                e.codigo_equipo?.toLowerCase().includes(searchTerm) ||
                e.tipos_equipo?.nombre_tipo?.toLowerCase().includes(searchTerm) ||
                e.marca?.toLowerCase().includes(searchTerm) ||
                e.modelo?.toLowerCase().includes(searchTerm) ||
                e.serie?.toLowerCase().includes(searchTerm)
            );
        });

    const agregarEquipo = (equipo: EquipoSelector) => {
        onChange({
            equiposSeleccionados: [...data.equiposSeleccionados, equipo],
        });
    };

    const quitarEquipo = (idEquipo: number) => {
        onChange({
            equiposSeleccionados: data.equiposSeleccionados.filter((e) => e.id_equipo !== idEquipo),
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Contexto del Servicio</h3>
                        <p className="text-slate-600 text-sm">
                            Identifique al cliente y los activos que requieren intervención técnica.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            Cliente Titular *
                        </label>
                        <SelectorCard
                            items={clientes}
                            selectedId={data.clienteId}
                            onSelect={(cliente, id) => onChange({
                                clienteId: id,
                                clienteSeleccionado: cliente,
                                sedeId: undefined,
                                equiposSeleccionados: [],
                            })}
                            getLabel={getClienteLabel}
                            getSubtitle={(c) => (
                                <span className="text-xs text-slate-500">NIT: {c.persona?.numero_identificacion || 'N/A'}</span>
                            )}
                            renderIcon={() => <Building2 className="h-5 w-5" />}
                            getId={(c) => c.id_cliente}
                            isLoading={isLoadingClientes}
                            isFetching={isFetchingClientes}
                            emptyMessage={busquedaCliente ? 'No se encontraron clientes con ese criterio' : 'No hay clientes activos'}
                            searchPlaceholder="Buscar cliente..."
                            debounceMs={0}
                            onSearchChange={setBusquedaCliente}
                        />
                    </div>

                    {data.clienteId && sedes.length > 0 && (
                        <div className="animate-in fade-in duration-300">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                                <MapPin className="h-4 w-4 text-red-500" />
                                Ubicación / Sede
                            </label>
                            <SelectorCard
                                items={sedes}
                                selectedId={data.sedeId}
                                onSelect={(sede, id) => onChange({
                                    sedeId: id,
                                    equiposSeleccionados: [],
                                })}
                                getLabel={(s) => s.nombre_sede}
                                getSubtitle={(s) => <span className="text-xs text-slate-500">{s.direccion || s.ciudad}</span>}
                                renderIcon={() => <MapPin className="h-5 w-5" />}
                                getId={(s) => s.id_sede}
                                isLoading={isLoadingSedes}
                                emptyMessage="El cliente no tiene sedes"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                        <Wrench className="h-4 w-4 text-blue-500" />
                        Equipos a intervenir ({data.equiposSeleccionados.length})
                    </label>

                    {!data.clienteId ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-slate-50 text-slate-400 text-sm">
                            Seleccione un cliente para ver sus equipos.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Search input for equipment */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar equipos por nombre, código, tipo o marca..."
                                    value={busquedaEquipo}
                                    onChange={(e) => setBusquedaEquipo(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                                />
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {isLoadingEquipos ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                                ) : equiposDisponibles.length === 0 ? (
                                    <div className="text-xs text-center text-slate-400 p-4 border rounded-xl">No hay más equipos disponibles</div>
                                ) : (
                                    equiposDisponibles.map((e) => (
                                        <button key={e.id_equipo} onClick={() => agregarEquipo(e)} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-all text-left bg-white shadow-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-700 text-sm break-words">{getEquipoLabel(e)}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">{e.tipos_equipo?.nombre_tipo}</p>
                                            </div>
                                            <Plus className="h-4 w-4 text-blue-500" />
                                        </button>
                                    ))
                                )}
                            </div>

                            {data.equiposSeleccionados.length > 0 && (
                                <div className="space-y-2 pt-4 border-t">
                                    {data.equiposSeleccionados.map((e) => (
                                        <div key={e.id_equipo} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-blue-900 text-sm break-words">{getEquipoLabel(e)}</p>
                                                <p className="text-[10px] text-blue-600 uppercase font-bold">{e.tipos_equipo?.nombre_tipo}</p>
                                            </div>
                                            <button onClick={() => quitarEquipo(e.id_equipo)} className="p-1 text-blue-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PasoAlcance({
    data,
    onChange,
}: {
    data: WizardData;
    onChange: (updates: Partial<WizardData>) => void;
}) {
    const primerEquipo = data.equiposSeleccionados[0];
    const tipoEquipoId = primerEquipo?.tipos_equipo?.id_tipo_equipo || primerEquipo?.id_tipo_equipo;

    const { tiposServicio, isLoading } = useWizardCatalogos({
        tipoEquipoId: tipoEquipoId ? Number(tipoEquipoId) : undefined
    });

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>;

    const tiposPorCategoria = tiposServicio.reduce((acc, tipo) => {
        const cat = tipo.categoria || 'OTRO';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(tipo);
        return acc;
    }, {} as Record<string, TipoServicio[]>);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Configuración del Alcance</h3>
                        <p className="text-slate-600 text-sm">Define el tipo de intervención y su urgencia.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {Object.entries(tiposPorCategoria).map(([categoria, tipos]) => (
                    <div key={categoria} className="space-y-3">
                        <h4 className={cn("text-[10px] font-black px-2 py-0.5 rounded uppercase", getCategoriaServicioColor(categoria))}>
                            {getCategoriaServicioLabel(categoria)}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {tipos.map((tipo) => {
                                const isSelected = data.tipoServicioId === tipo.id_tipo_servicio;
                                return (
                                    <button
                                        key={tipo.id_tipo_servicio}
                                        onClick={() => onChange({ tipoServicioId: tipo.id_tipo_servicio, tipoServicioSeleccionado: tipo })}
                                        className={cn(
                                            'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                                            isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-blue-200'
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg", isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                                            <Wrench className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-700 text-sm truncate">{tipo.nombre_tipo}</p>
                                            {tipo.duracion_estimada_horas && <p className="text-[10px] text-slate-400 font-bold">{tipo.duracion_estimada_horas}h estimadas</p>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
                <div>
                    <label className="text-sm font-bold text-slate-700 uppercase mb-3 block">Prioridad</label>
                    <div className="flex gap-2">
                        {PRIORIDADES.map((p) => (
                            <button key={p.value} onClick={() => onChange({ prioridad: p.value })} className={cn('flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all', data.prioridad === p.value ? p.color + ' border-current' : 'border-slate-100 text-slate-400')}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 uppercase mb-3 block">
                        Fecha Programada <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={data.fechaProgramada || ''}
                        onChange={(e) => onChange({ fechaProgramada: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className={cn(
                            "w-full p-2 border-2 rounded-xl text-sm outline-none focus:border-blue-500",
                            !data.fechaProgramada && "border-red-200 bg-red-50"
                        )}
                        required
                    />
                    {!data.fechaProgramada && (
                        <p className="text-xs text-red-500 mt-1">La fecha es obligatoria</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function PasoAsignacion({
    data,
    onChange,
}: {
    data: WizardData;
    onChange: (updates: Partial<WizardData>) => void;
}) {
    const { data: tecnicos, isLoading } = useTecnicosSelector();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Asignación de Responsable</h3>
                        <p className="text-slate-600 text-sm">Asigne un técnico para ejecutar la intervención.</p>
                    </div>
                </div>
            </div>

            <SelectorCard
                items={tecnicos || []}
                selectedId={data.tecnicoId}
                onSelect={(tecnico, id) => onChange({ tecnicoId: id, tecnicoSeleccionado: tecnico })}
                getLabel={getTecnicoLabel}
                getSubtitle={(t) => <span className="text-xs text-slate-500">{t.cargo || 'Técnico'}</span>}
                renderIcon={() => <User className="h-5 w-5" />}
                getId={(t) => t.id_empleado}
                isLoading={isLoading}
                emptyMessage="No hay técnicos disponibles"
                searchPlaceholder="Buscar técnico..."
            />
        </div>
    );
}

function ResumenOrden({ data }: { data: WizardData }) {
    return (
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-6">
            <h4 className="font-bold text-blue-400 text-xs uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Resumen de Orden
            </h4>
            <div className="space-y-4 text-sm">
                <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Cliente</p>
                    <p className="font-bold truncate">{data.clienteSeleccionado ? getClienteLabel(data.clienteSeleccionado) : 'N/A'}</p>
                </div>
                <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Servicio</p>
                    <p className="font-bold truncate">{data.tipoServicioSeleccionado?.nombre_tipo || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Equipos ({data.equiposSeleccionados.length})</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {data.equiposSeleccionados.map(e => <Badge key={e.id_equipo} variant="secondary" className="bg-slate-800 text-slate-300 border-none text-[9px]">{e.codigo_equipo}</Badge>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NuevaOrdenPage() {
    const router = useRouter();
    const [paso, setPaso] = useState<Paso>(1);
    const [data, setData] = useState<WizardData>({
        prioridad: 'NORMAL',
        equiposSeleccionados: [],
    });

    const crearOrden = useCrearOrden();

    const handleChange = (updates: Partial<WizardData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const canContinue = () => {
        if (paso === 1) return !!data.clienteId && data.equiposSeleccionados.length > 0;
        // ✅ FIX: Fecha programada es REQUERIDA
        if (paso === 2) return !!data.tipoServicioId && !!data.fechaProgramada;
        return true;
    };

    const handleSubmit = async () => {
        if (!canContinue()) return;
        try {
            const result = await crearOrden.mutateAsync({
                clienteId: data.clienteId!,
                equipoId: data.equiposSeleccionados[0]?.id_equipo, // Equipo principal (requerido)
                equiposIds: data.equiposSeleccionados.map(e => e.id_equipo),
                tipoServicioId: data.tipoServicioId!,
                sedeClienteId: data.sedeId,
                prioridad: data.prioridad,
                // ✅ FIX TIMEZONE: Enviar fecha como string YYYY-MM-DD sin conversión a Date
                // El backend manejará la conversión correctamente
                fechaProgramada: data.fechaProgramada || undefined,
                descripcion: data.descripcion,
                tecnicoId: data.tecnicoId,
            });
            if (result.data?.id_orden_servicio) router.push(`/ordenes/${result.data.id_orden_servicio}`);
            else router.push('/ordenes');
        } catch (e) { console.error(e); }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            <div className="flex flex-col md:flex-row gap-8 mt-8">
                <div className="flex-1 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0 w-full max-w-md">
                            <StepIndicator paso={1} pasoActual={paso} label="Contexto" icon={Building2} />
                            <StepIndicator paso={2} pasoActual={paso} label="Alcance" icon={Settings} />
                            <StepIndicator paso={3} pasoActual={paso} label="Asignación" icon={User} />
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
                        {paso === 1 && <PasoContexto data={data} onChange={handleChange} />}
                        {paso === 2 && <PasoAlcance data={data} onChange={handleChange} />}
                        {paso === 3 && <PasoAsignacion data={data} onChange={handleChange} />}

                        <div className="flex justify-between mt-10 pt-6 border-t">
                            <Button variant="ghost" onClick={() => setPaso(p => (p - 1) as Paso)} disabled={paso === 1}>Anterior</Button>
                            {paso < 3 ? (
                                <Button onClick={() => setPaso(p => (p + 1) as Paso)} disabled={!canContinue()} className="bg-blue-600 px-8">Siguiente</Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={crearOrden.isPending} className="bg-green-600 px-8">
                                    {crearOrden.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crear Orden'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-80">
                    <div className="sticky top-24 space-y-6">
                        <ResumenOrden data={data} />
                    </div>
                </div>
            </div>
        </div>
    );
}
