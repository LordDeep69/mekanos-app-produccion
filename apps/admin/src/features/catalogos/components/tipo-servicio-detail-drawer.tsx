'use client';

import { cn } from '@/lib/utils';
import {
    Activity,
    AlertCircle,
    CheckSquare,
    ChevronDown, ChevronRight,
    Clock,
    Gauge,
    Loader2,
    Settings,
    Wrench,
    X
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORIAS_SERVICIO, type SistemaConActividades } from '../api/tipos-servicio.service';
import { useTipoServicioDetalleCompleto } from '../hooks/use-tipos-servicio';

interface Props {
    tipoServicioId: number | null;
    onClose: () => void;
}

export function TipoServicioDetailDrawer({ tipoServicioId, onClose }: Props) {
    const { data, isLoading, error } = useTipoServicioDetalleCompleto(tipoServicioId);
    const [expandedSistemas, setExpandedSistemas] = useState<Set<number | null>>(new Set());

    if (!tipoServicioId) return null;

    const toggleSistema = (sistemaId: number | null) => {
        setExpandedSistemas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sistemaId)) {
                newSet.delete(sistemaId);
            } else {
                newSet.add(sistemaId);
            }
            return newSet;
        });
    };

    const expandAll = () => {
        if (data?.data?.sistemas_con_actividades) {
            setExpandedSistemas(new Set(data.data.sistemas_con_actividades.map((s: SistemaConActividades) => s.id_sistema)));
        }
    };

    const collapseAll = () => {
        setExpandedSistemas(new Set());
    };

    const getCategoriaInfo = (categoria: string) => {
        return CATEGORIAS_SERVICIO.find(c => c.value === categoria) ||
            { label: categoria, color: 'bg-gray-100 text-gray-800' };
    };

    const detalle = data?.data;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: detalle?.color_hex || '#fff', opacity: 0.9 }}
                        >
                            <Wrench className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">
                                {isLoading ? 'Cargando...' : detalle?.nombre_tipo || 'Detalle'}
                            </h2>
                            <p className="text-blue-100 text-sm font-mono">
                                {detalle?.codigo_tipo}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto h-[calc(100%-88px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-600">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                            <p>Error al cargar detalle</p>
                        </div>
                    ) : detalle ? (
                        <div className="p-6 space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <StatCard
                                    icon={<CheckSquare className="h-5 w-5" />}
                                    label="Actividades"
                                    value={detalle.estadisticas.total_actividades}
                                    color="blue"
                                />
                                <StatCard
                                    icon={<Settings className="h-5 w-5" />}
                                    label="Sistemas"
                                    value={detalle.estadisticas.total_sistemas}
                                    color="purple"
                                />
                                <StatCard
                                    icon={<Clock className="h-5 w-5" />}
                                    label="Duración Est."
                                    value={detalle.duracion_estimada_horas ? `${detalle.duracion_estimada_horas}h` : 'N/A'}
                                    color="green"
                                />
                            </div>

                            {/* Info Row */}
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                    getCategoriaInfo(detalle.categoria).color
                                )}>
                                    {getCategoriaInfo(detalle.categoria).label}
                                </span>
                                {detalle.tiene_checklist && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                        ✓ Checklist
                                    </span>
                                )}
                                {detalle.tipo_equipo && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                        {detalle.tipo_equipo.nombre}
                                    </span>
                                )}
                            </div>

                            {detalle.descripcion && (
                                <p className="text-gray-600 text-sm bg-gray-50 p-4 rounded-xl">
                                    {detalle.descripcion}
                                </p>
                            )}

                            {/* Actividades por Sistema */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-blue-600" />
                                        Actividades por Sistema
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={expandAll}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            Expandir todo
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            onClick={collapseAll}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            Colapsar
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {detalle.sistemas_con_actividades.map((sistema: SistemaConActividades) => (
                                        <SistemaAccordion
                                            key={sistema.id_sistema ?? 'null'}
                                            sistema={sistema}
                                            isExpanded={expandedSistemas.has(sistema.id_sistema)}
                                            onToggle={() => toggleSistema(sistema.id_sistema)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'blue' | 'purple' | 'green';
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        green: 'bg-green-50 text-green-600 border-green-200',
    };

    return (
        <div className={cn("p-4 rounded-xl border", colors[color])}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs font-medium opacity-80">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

function SistemaAccordion({ sistema, isExpanded, onToggle }: {
    sistema: SistemaConActividades;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-gray-900">{sistema.nombre_sistema}</p>
                        <p className="text-xs text-gray-500 font-mono">{sistema.codigo_sistema}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {sistema.total_actividades} act.
                    </span>
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="border-t bg-gray-50 p-4 space-y-2">
                    {sistema.actividades.map((act) => (
                        <div
                            key={act.id_actividad_catalogo}
                            className="flex items-start gap-3 p-3 bg-white rounded-lg border"
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                                act.tipo_actividad === 'MEDICION'
                                    ? 'bg-purple-100 text-purple-700'
                                    : act.tipo_actividad === 'CHECKLIST'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                            )}>
                                {act.tipo_actividad === 'MEDICION' ? (
                                    <Gauge className="h-3 w-3" />
                                ) : (
                                    <CheckSquare className="h-3 w-3" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                    {act.descripcion_actividad}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] font-mono text-gray-400">
                                        {act.codigo_actividad}
                                    </span>
                                    {act.es_obligatoria && (
                                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                            Obligatoria
                                        </span>
                                    )}
                                    {act.parametro_medicion && (
                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                            📏 {act.parametro_medicion.nombre}
                                            [{act.parametro_medicion.rango_min}-{act.parametro_medicion.rango_max}]
                                            {act.parametro_medicion.unidad}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
