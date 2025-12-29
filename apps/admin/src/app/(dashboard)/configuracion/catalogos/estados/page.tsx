'use client';

import {
    useActualizarEstadoOrden,
    useCrearEstadoOrden,
    useEliminarEstadoOrden,
    useEstadosOrden
} from '@/features/ordenes';
import { cn } from '@/lib/utils';
import { getEstadoColor } from '@/types/ordenes';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Edit,
    Flag,
    LayoutList,
    Loader2,
    Lock,
    Palette,
    Plus,
    Search,
    Trash2,
    Unlock,
    X
} from 'lucide-react';
import { useState } from 'react';

export default function EstadosOrdenPage() {
    const [busqueda, setBusqueda] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEstado, setEditingEstado] = useState<any>(null);

    const { data: estados, isLoading, isError, refetch } = useEstadosOrden();
    const crearEstado = useCrearEstadoOrden();
    const actualizarEstado = useActualizarEstadoOrden();
    const eliminarEstado = useEliminarEstadoOrden();

    const handleEdit = (estado: any) => {
        setEditingEstado(estado);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar este estado de orden?')) {
            await eliminarEstado.mutateAsync(id);
        }
    };

    const filteredEstados = estados?.filter(e => {
        const matchesBusqueda = e.nombre_estado.toLowerCase().includes(busqueda.toLowerCase()) ||
            e.codigo_estado.toLowerCase().includes(busqueda.toLowerCase());
        return matchesBusqueda;
    }).sort((a, b) => (a.orden_visualizacion || 0) - (b.orden_visualizacion || 0)) || [];

    return (
        <div className="space-y-6">
            {/* Header de la Sección */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="h-7 w-7 text-blue-600" />
                        Estados de Orden
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configura el flujo de trabajo (FSM) y los estados operativos
                    </p>
                </div>
                <button
                    onClick={() => { setEditingEstado(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Estado
                </button>
            </div>

            {/* Barra de Búsqueda */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500 animate-pulse">Cargando estados...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="font-bold text-lg">Error al cargar datos</p>
                        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reintentar conexión
                        </button>
                    </div>
                ) : filteredEstados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <CheckCircle2 className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron estados</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">Orden</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Propiedades</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredEstados.map((estado) => (
                                    <tr key={estado.id_estado} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-gray-400">#{estado.orden_visualizacion}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-bold shadow-sm border",
                                                        getEstadoColor(estado.codigo_estado)
                                                    )}
                                                >
                                                    {estado.nombre_estado}
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{estado.codigo_estado}</span>
                                            </div>
                                            {estado.descripcion && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">{estado.descripcion}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {estado.es_estado_final && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 text-[10px] font-bold">
                                                        <Flag className="h-3 w-3" /> FINAL
                                                    </span>
                                                )}
                                                {estado.permite_edicion ? (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100 text-[10px] font-bold">
                                                        <Unlock className="h-3 w-3" /> EDITABLE
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 text-[10px] font-bold">
                                                        <Lock className="h-3 w-3" /> BLOQUEADO
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(estado)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(estado.id_estado)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Desactivar"
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

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <EstadoOrdenModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    estado={editingEstado}
                    onSubmit={async (formData: any) => {
                        if (editingEstado) {
                            await actualizarEstado.mutateAsync({ id: editingEstado.id_estado, data: formData });
                        } else {
                            await crearEstado.mutateAsync(formData);
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearEstado.isPending || actualizarEstado.isPending}
                />
            )}
        </div>
    );
}

function EstadoOrdenModal({ isOpen, onClose, estado, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        nombre_estado: estado?.nombre_estado || '',
        codigo_estado: estado?.codigo_estado || '',
        descripcion: estado?.descripcion || '',
        orden_visualizacion: estado?.orden_visualizacion || 1,
        permite_edicion: estado?.permite_edicion ?? true,
        permite_eliminacion: estado?.permite_eliminacion ?? false,
        es_estado_final: estado?.es_estado_final ?? false,
        color_hex: estado?.color_hex || '#64748b',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            orden_visualizacion: Number(formData.orden_visualizacion)
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {estado ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {estado ? 'Editar Estado' : 'Nuevo Estado de Orden'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del Estado *</label>
                            <input
                                required
                                type="text"
                                value={formData.nombre_estado}
                                onChange={(e) => setFormData({ ...formData, nombre_estado: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Ej: En Proceso"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Técnico *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_estado}
                                onChange={(e) => setFormData({ ...formData, codigo_estado: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="EN_PROCESO"
                                disabled={!!estado}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <LayoutList className="h-4 w-4" />
                                Orden Visual
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.orden_visualizacion}
                                onChange={(e) => setFormData({ ...formData, orden_visualizacion: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <Palette className="h-4 w-4" />
                                Color UI
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.color_hex}
                                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                                    className="w-10 h-10 border-none bg-transparent cursor-pointer"
                                />
                                <span className="text-xs font-mono text-gray-500">{formData.color_hex}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción</label>
                        <textarea
                            rows={2}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            placeholder="Para qué se usa este estado..."
                        />
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Configuración de Flujo</label>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="permite_edicion"
                                checked={formData.permite_edicion}
                                onChange={(e) => setFormData({ ...formData, permite_edicion: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="permite_edicion" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                {formData.permite_edicion ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-amber-600" />}
                                Permite edición de la orden en este estado
                            </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="es_estado_final"
                                checked={formData.es_estado_final}
                                onChange={(e) => setFormData({ ...formData, es_estado_final: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="es_estado_final" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                <Flag className="h-4 w-4 text-purple-600" />
                                Marcar como estado de finalización (Cierre)
                            </label>
                        </div>
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
                        {estado ? 'Guardar Cambios' : 'Crear Estado'}
                    </button>
                </div>
            </div>
        </div>
    );
}
