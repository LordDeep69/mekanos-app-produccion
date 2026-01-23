'use client';

import {
    APLICA_A_OPTIONS,
    useCreateCatalogoSistema,
    useDeleteCatalogoSistema,
    useUpdateCatalogoSistema,
    type NivelUso
} from '@/features/catalogos';
import {
    AlertCircle,
    Check,
    Edit,
    Layers,
    LayoutList,
    Loader2,
    Palette,
    Plus,
    Search,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';

// Helpers para indicadores de uso
const NIVEL_USO_CONFIG: Record<NivelUso, { label: string; color: string; bgColor: string }> = {
    alto: { label: 'Alto', color: 'text-green-700', bgColor: 'bg-green-100' },
    medio: { label: 'Medio', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    bajo: { label: 'Bajo', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    sin_uso: { label: 'Sin uso', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

export default function SistemasPage() {
    const [busqueda, setBusqueda] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSistema, setEditingSistema] = useState<any>(null);

    const { data: response, isLoading, isError, refetch } = useCatalogoSistemasConUso({ limit: 100 });
    const sistemas = response?.data || [];
    const crearSistema = useCreateCatalogoSistema();
    const actualizarSistema = useUpdateCatalogoSistema();
    const eliminarSistema = useDeleteCatalogoSistema();

    const handleEdit = (sistema: any) => {
        setEditingSistema(sistema);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar este sistema?')) {
            await eliminarSistema.mutateAsync(id);
        }
    };

    const filteredSistemas = sistemas.filter(s => {
        const nombre = s.nombre_sistema || '';
        const codigo = s.codigo_sistema || '';
        const term = busqueda.toLowerCase();
        return nombre.toLowerCase().includes(term) || codigo.toLowerCase().includes(term);
    }).sort((a, b) => (a.orden_visualizacion || 0) - (b.orden_visualizacion || 0));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="h-7 w-7 text-blue-600" />
                        Sistemas del Equipo
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define los subsistemas técnicos (Motor, Eléctrico, etc.) para los checklists
                    </p>
                </div>
                <button
                    onClick={() => { setEditingSistema(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Sistema
                </button>
            </div>

            {/* Búsqueda */}
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

            {/* Grid de Sistemas */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500">Cargando sistemas...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="font-bold text-lg">Error al cargar datos</p>
                        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reintentar
                        </button>
                    </div>
                ) : filteredSistemas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Layers className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron sistemas</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">Orden</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sistema</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actividades</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aplica a</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSistemas.map((sistema, idx) => (
                                    <tr key={sistema.id_sistema ?? `sistema-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-gray-400">#{sistema.orden_visualizacion}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                                                    style={{ backgroundColor: sistema.color_hex || '#3b82f6' }}
                                                >
                                                    <Layers className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                        {sistema.nombre_sistema}
                                                    </p>
                                                    <p className="text-xs font-mono text-gray-400">{sistema.codigo_sistema}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Activity className="h-4 w-4 text-gray-400" />
                                                    <span className="text-lg font-bold text-gray-800">
                                                        {(sistema as any).total_actividades ?? 0}
                                                    </span>
                                                </div>
                                                {(sistema as any).nivel_uso && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        NIVEL_USO_CONFIG[(sistema as any).nivel_uso]?.bgColor || 'bg-gray-100',
                                                        NIVEL_USO_CONFIG[(sistema as any).nivel_uso]?.color || 'text-gray-500'
                                                    )}>
                                                        {NIVEL_USO_CONFIG[(sistema as any).nivel_uso]?.label || 'N/A'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {sistema.aplica_a ? (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">
                                                        {APLICA_A_OPTIONS.find(o => o.value === sistema.aplica_a)?.label || sistema.aplica_a}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Todos los equipos</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(sistema)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(sistema.id_sistema)}
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
                <SistemaModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    sistema={editingSistema}
                    onSubmit={async (formData: any) => {
                        const dto = {
                            codigoSistema: formData.codigo_sistema,
                            nombreSistema: formData.nombre_sistema,
                            descripcion: formData.descripcion,
                            aplicaA: formData.aplica_a,
                            ordenVisualizacion: Number(formData.orden_visualizacion),
                            colorHex: formData.color_hex,
                        };
                        if (editingSistema) {
                            await actualizarSistema.mutateAsync({ id: editingSistema.id_sistema, data: dto });
                        } else {
                            await crearSistema.mutateAsync(dto);
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearSistema.isPending || actualizarSistema.isPending}
                />
            )}
        </div>
    );
}

function SistemaModal({ isOpen, onClose, sistema, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        nombre_sistema: sistema?.nombre_sistema || '',
        codigo_sistema: sistema?.codigo_sistema || '',
        descripcion: sistema?.descripcion || '',
        orden_visualizacion: sistema?.orden_visualizacion || 1,
        color_hex: sistema?.color_hex || '#3b82f6',
        aplica_a: sistema?.aplica_a || [],
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
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {sistema ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {sistema ? 'Editar Sistema' : 'Nuevo Sistema'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del Sistema *</label>
                            <input
                                required
                                type="text"
                                value={formData.nombre_sistema}
                                onChange={(e) => setFormData({ ...formData, nombre_sistema: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Ej: Sistema Eléctrico"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Único *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_sistema}
                                onChange={(e) => setFormData({ ...formData, codigo_sistema: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="SIS_ELEC"
                                disabled={!!sistema}
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
                            placeholder="Breve descripción de los componentes que abarca..."
                        />
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
                        {sistema ? 'Guardar Cambios' : 'Crear Sistema'}
                    </button>
                </div>
            </div>
        </div>
    );
}
