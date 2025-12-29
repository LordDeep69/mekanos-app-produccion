'use client';

import {
    useActividadesCatalogo,
    useActualizarActividadCatalogo,
    useCrearActividadCatalogo,
    useEliminarActividadCatalogo,
    useParametrosMedicion,
    useSistemas,
    useTiposServicio
} from '@/features/ordenes';
import { getTipoActividadColor } from '@/features/ordenes/api/catalogos.service';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Check,
    ClipboardList,
    Clock,
    Database,
    Edit,
    Info,
    Layers,
    Loader2,
    Plus,
    Search,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';

const TIPOS_ACTIVIDAD = [
    'INSPECCION',
    'LIMPIEZA',
    'AJUSTE',
    'REEMPLAZO',
    'MEDICION',
    'PRUEBA'
];

export default function ActividadesCatalogoPage() {
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
    const [filtroSistema, setFiltroSistema] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActividad, setEditingActividad] = useState<any>(null);

    const { data: actividades, isLoading, isError, refetch } = useActividadesCatalogo({
        idTipoServicio: filtroTipoServicio ? Number(filtroTipoServicio) : undefined,
        idSistema: filtroSistema ? Number(filtroSistema) : undefined,
    });

    const { data: tiposServicio } = useTiposServicio({ activo: true });
    const { data: sistemas } = useSistemas({ activo: true });
    const { data: parametros } = useParametrosMedicion({ activo: true });

    const crearActividad = useCrearActividadCatalogo();
    const actualizarActividad = useActualizarActividadCatalogo();
    const eliminarActividad = useEliminarActividadCatalogo();

    const handleEdit = (actividad: any) => {
        setEditingActividad(actividad);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar esta actividad del catálogo?')) {
            await eliminarActividad.mutateAsync(id);
        }
    };

    const filteredActividades = actividades?.filter(a =>
        a.descripcion_actividad.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.codigo_actividad.toLowerCase().includes(busqueda.toLowerCase())
    ).sort((a, b) => (a.orden_ejecucion || 0) - (b.orden_ejecucion || 0)) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Database className="h-7 w-7 text-blue-600" />
                        Catálogo de Actividades
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define los checklists maestros por tipo de servicio y sistema
                    </p>
                </div>
                <button
                    onClick={() => { setEditingActividad(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Actividad
                </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar actividad..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <select
                    value={filtroTipoServicio}
                    onChange={(e) => setFiltroTipoServicio(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                    <option value="">Todos los servicios</option>
                    {tiposServicio?.map((t: any) => (
                        <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>{t.nombre_tipo}</option>
                    ))}
                </select>
                <select
                    value={filtroSistema}
                    onChange={(e) => setFiltroSistema(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                    <option value="">Todos los sistemas</option>
                    {sistemas?.map((s: any) => (
                        <option key={s.id_sistema} value={s.id_sistema}>{s.nombre_sistema}</option>
                    ))}
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500 font-medium">Cargando catálogo de actividades...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="font-bold text-lg">Error al sincronizar catálogo</p>
                        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reintentar
                        </button>
                    </div>
                ) : filteredActividades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Database className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No hay actividades en esta categoría</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">#</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actividad</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contexto</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredActividades.map((act) => (
                                    <tr key={act.id_actividad_catalogo} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-gray-400">{act.orden_ejecucion}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                    {act.descripcion_actividad}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-mono text-gray-400 uppercase">{act.codigo_actividad}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        getTipoActividadColor(act.tipo_actividad)
                                                    )}>
                                                        {act.tipo_actividad}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <ClipboardList className="h-3 w-3 text-blue-500" />
                                                    <span className="font-medium">{act.tipos_servicio?.nombre_tipo || 'Sin servicio'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <Layers className="h-3 w-3 text-purple-500" />
                                                    <span className="font-medium">{act.catalogo_sistemas?.nombre_sistema || 'General'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {act.es_obligatoria && (
                                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 text-[10px] font-bold">
                                                        OBLIGATORIA
                                                    </span>
                                                )}
                                                {act.tiempo_estimado_minutos && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 text-[10px] font-bold">
                                                        <Clock className="h-3 w-3" /> {act.tiempo_estimado_minutos}m
                                                    </span>
                                                )}
                                                {act.id_parametro_medicion && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded border border-cyan-100 text-[10px] font-bold">
                                                        <Activity className="h-3 w-3" /> MEDICIÓN
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(act)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(act.id_actividad_catalogo)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ActividadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    actividad={editingActividad}
                    tiposServicio={tiposServicio || []}
                    sistemas={sistemas || []}
                    parametros={parametros || []}
                    onSubmit={async (formData: any) => {
                        if (editingActividad) {
                            await actualizarActividad.mutateAsync({ id: editingActividad.id_actividad_catalogo, data: formData });
                        } else {
                            await crearActividad.mutateAsync(formData);
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearActividad.isPending || actualizarActividad.isPending}
                />
            )}
        </div>
    );
}

function ActividadModal({ isOpen, onClose, actividad, tiposServicio, sistemas, parametros, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        descripcion_actividad: actividad?.descripcion_actividad || '',
        codigo_actividad: actividad?.codigo_actividad || '',
        id_tipo_servicio: actividad?.id_tipo_servicio || '',
        id_sistema: actividad?.id_sistema || '',
        tipo_actividad: actividad?.tipo_actividad || 'INSPECCION',
        orden_ejecucion: actividad?.orden_ejecucion || 1,
        es_obligatoria: actividad?.es_obligatoria ?? true,
        tiempo_estimado_minutos: actividad?.tiempo_estimado_minutos || '',
        id_parametro_medicion: actividad?.id_parametro_medicion || '',
        instrucciones: actividad?.instrucciones || '',
        precauciones: actividad?.precauciones || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: any = {
            ...formData,
            id_tipo_servicio: Number(formData.id_tipo_servicio),
            id_sistema: formData.id_sistema ? Number(formData.id_sistema) : null,
            id_parametro_medicion: formData.id_parametro_medicion ? Number(formData.id_parametro_medicion) : null,
            orden_ejecucion: Number(formData.orden_ejecucion),
            tiempo_estimado_minutos: formData.tiempo_estimado_minutos ? Number(formData.tiempo_estimado_minutos) : null
        };
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {actividad ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {actividad ? 'Editar Actividad' : 'Nueva Actividad del Catálogo'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción de la Actividad *</label>
                        <textarea
                            required
                            rows={2}
                            value={formData.descripcion_actividad}
                            onChange={(e) => setFormData({ ...formData, descripcion_actividad: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            placeholder="Ej: Verificar nivel de aceite del motor y estado del filtro..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Único *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_actividad}
                                onChange={(e) => setFormData({ ...formData, codigo_actividad: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="ACT_001"
                                disabled={!!actividad}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo de Actividad *</label>
                            <select
                                required
                                value={formData.tipo_actividad}
                                onChange={(e) => setFormData({ ...formData, tipo_actividad: e.target.value as any })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                {TIPOS_ACTIVIDAD.map(tipo => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Servicio Vinculado *</label>
                            <select
                                required
                                value={formData.id_tipo_servicio}
                                onChange={(e) => setFormData({ ...formData, id_tipo_servicio: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">Seleccionar servicio...</option>
                                {tiposServicio?.map((t: any) => (
                                    <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>{t.nombre_tipo}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Sistema (Opcional)</label>
                            <select
                                value={formData.id_sistema}
                                onChange={(e) => setFormData({ ...formData, id_sistema: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">General / Ninguno</option>
                                {sistemas?.map((s: any) => (
                                    <option key={s.id_sistema} value={s.id_sistema}>{s.nombre_sistema}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Orden Ejecución</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.orden_ejecucion}
                                onChange={(e) => setFormData({ ...formData, orden_ejecucion: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tiempo Est. (min)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.tiempo_estimado_minutos}
                                onChange={(e) => setFormData({ ...formData, tiempo_estimado_minutos: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="15"
                            />
                        </div>
                    </div>

                    {formData.tipo_actividad === 'MEDICION' && (
                        <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 space-y-2">
                            <label className="block text-sm font-bold text-cyan-800 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Parámetro de Medición a Capturar
                            </label>
                            <select
                                required={formData.tipo_actividad === 'MEDICION'}
                                value={formData.id_parametro_medicion}
                                onChange={(e) => setFormData({ ...formData, id_parametro_medicion: e.target.value })}
                                className="w-full px-4 py-2 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-sm bg-white"
                            >
                                <option value="">Seleccionar parámetro...</option>
                                {parametros?.map((p: any) => (
                                    <option key={p.id_parametro_medicion} value={p.id_parametro_medicion}>
                                        {p.nombre_parametro} ({p.unidad_medida})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-cyan-600 italic">
                                Al seleccionar MEDICIÓN, la App móvil pedirá obligatoriamente el valor de este parámetro.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <Info className="h-4 w-4 text-blue-500" /> Instrucciones para Técnico
                            </label>
                            <textarea
                                rows={2}
                                value={formData.instrucciones}
                                onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                placeholder="Paso a paso detallado..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Precauciones / HSE
                            </label>
                            <textarea
                                rows={2}
                                value={formData.precauciones}
                                onChange={(e) => setFormData({ ...formData, precauciones: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                placeholder="Uso de EPP, bloqueo de energías..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            id="es_obligatoria"
                            checked={formData.es_obligatoria}
                            onChange={(e) => setFormData({ ...formData, es_obligatoria: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="es_obligatoria" className="text-sm font-bold text-blue-900 cursor-pointer">
                            ¿Es de ejecución obligatoria para cerrar la orden?
                        </label>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        {actividad ? 'Guardar Cambios' : 'Crear Actividad'}
                    </button>
                </div>
            </div>
        </div>
    );
}
