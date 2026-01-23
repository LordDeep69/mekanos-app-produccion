'use client';

import {
    AlertCircle,
    Check,
    CheckSquare,
    Clock,
    Edit,
    Loader2,
    Palette,
    Plus,
    Search,
    Trash2,
    Wrench,
    X
} from 'lucide-react';
import { useState } from 'react';
import {
    CATEGORIAS_SERVICIO,
    useCreateTipoServicio,
    useDeleteTipoServicio,
    useTiposServicio,
    useUpdateTipoServicio
} from '../../../../../features/catalogos';
import { TipoServicioDetailDrawer } from '../../../../../features/catalogos/components/tipo-servicio-detail-drawer';
import { cn } from '../../../../../lib/utils';

// Helpers para colores y labels
function getCategoriaColor(cat: string) {
    return CATEGORIAS_SERVICIO.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-800';
}
function getCategoriaLabel(cat: string) {
    return CATEGORIAS_SERVICIO.find(c => c.value === cat)?.label || cat;
}

export default function TiposServicioPage() {
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTipo, setEditingTipo] = useState<any>(null);
    const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);

    const { data: response, isLoading, isError, refetch } = useTiposServicio({ activo: true });
    const crearTipo = useCreateTipoServicio();
    const actualizarTipo = useUpdateTipoServicio();
    const eliminarTipo = useDeleteTipoServicio();

    const tipos = response?.data || [];

    const handleEdit = (tipo: any) => {
        setEditingTipo(tipo);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar este tipo de servicio?')) {
            await eliminarTipo.mutateAsync(id);
        }
    };

    const filteredTipos = tipos.filter(t => {
        const nombre = t.nombre_tipo || '';
        const codigo = t.codigo_tipo || '';
        const term = busqueda.toLowerCase();
        const matchesBusqueda = nombre.toLowerCase().includes(term) || codigo.toLowerCase().includes(term);
        const matchesCategoria = !categoriaFiltro || t.categoria === categoriaFiltro;
        return matchesBusqueda && matchesCategoria;
    });

    return (
        <div className="space-y-6">
            {/* Header de la Sección */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wrench className="h-7 w-7 text-blue-600" />
                        Tipos de Servicio
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define las categorías de mantenimiento y servicios técnicos
                    </p>
                </div>
                <button
                    onClick={() => { setEditingTipo(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Tipo
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                    <option value="">Todas las categorías</option>
                    {CATEGORIAS_SERVICIO.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500 animate-pulse">Cargando tipos de servicio...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="font-bold text-lg">Error al cargar datos</p>
                        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reintentar conexión
                        </button>
                    </div>
                ) : filteredTipos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Wrench className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron tipos de servicio</p>
                        <p className="text-sm">Ajusta los filtros o crea uno nuevo</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicio</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Checklist</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duración Est.</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTipos.map((tipo, idx) => (
                                    <tr
                                        key={tipo.id_tipo_servicio ?? `tipo-${idx}`}
                                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedTipoId(tipo.id_tipo_servicio)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                                                    style={{ backgroundColor: tipo.color_hex || '#3b82f6' }}
                                                >
                                                    <Wrench className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{tipo.nombre_tipo}</p>
                                                    <p className="text-xs font-mono text-gray-400">{tipo.codigo_tipo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                getCategoriaColor(tipo.categoria)
                                            )}>
                                                {getCategoriaLabel(tipo.categoria)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {tipo.tiene_checklist ? (
                                                    <div className="bg-green-100 p-1 rounded-full">
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-100 p-1 rounded-full">
                                                        <X className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                {tipo.duracion_estimada_horas ? `${tipo.duracion_estimada_horas}h` : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(tipo); }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(tipo.id_tipo_servicio); }}
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
                <TipoServicioModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    tipo={editingTipo}
                    onSubmit={async (formData: any) => {
                        if (editingTipo) {
                            await actualizarTipo.mutateAsync({
                                id: editingTipo.id_tipo_servicio, data: {
                                    nombreTipo: formData.nombre_tipo,
                                    codigoTipo: formData.codigo_tipo,
                                    categoria: formData.categoria,
                                    descripcion: formData.descripcion,
                                    tieneChecklist: formData.tiene_checklist,
                                    duracionEstimadaHoras: formData.duracion_estimada_horas,
                                    colorHex: formData.color_hex,
                                }
                            });
                        } else {
                            await crearTipo.mutateAsync({
                                nombreTipo: formData.nombre_tipo,
                                codigoTipo: formData.codigo_tipo,
                                categoria: formData.categoria,
                                descripcion: formData.descripcion,
                                tieneChecklist: formData.tiene_checklist,
                                duracionEstimadaHoras: formData.duracion_estimada_horas,
                                colorHex: formData.color_hex,
                            });
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearTipo.isPending || actualizarTipo.isPending}
                />
            )}

            {/* Drawer de Detalle Master-Detail */}
            {selectedTipoId && (
                <TipoServicioDetailDrawer
                    tipoServicioId={selectedTipoId}
                    onClose={() => setSelectedTipoId(null)}
                />
            )}
        </div>
    );
}

function TipoServicioModal({ isOpen, onClose, tipo, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        nombre_tipo: tipo?.nombre_tipo || '',
        codigo_tipo: tipo?.codigo_tipo || '',
        categoria: tipo?.categoria || 'PREVENTIVO',
        descripcion: tipo?.descripcion || '',
        tiene_checklist: tipo?.tiene_checklist ?? true,
        duracion_estimada_horas: tipo?.duracion_estimada_horas || '',
        color_hex: tipo?.color_hex || '#3b82f6',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            duracion_estimada_horas: formData.duracion_estimada_horas ? Number(formData.duracion_estimada_horas) : undefined
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {tipo ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {tipo ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del Servicio *</label>
                            <input
                                required
                                type="text"
                                value={formData.nombre_tipo}
                                onChange={(e) => setFormData({ ...formData, nombre_tipo: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                placeholder="Ej: Preventivo Tipo A"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Único *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_tipo}
                                onChange={(e) => setFormData({ ...formData, codigo_tipo: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all"
                                placeholder="PREV_A"
                                disabled={!!tipo}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoría de Negocio *</label>
                        <select
                            required
                            value={formData.categoria}
                            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        >
                            {CATEGORIAS_SERVICIO.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción</label>
                        <textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            placeholder="Detalles sobre este tipo de servicio..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                Duración Est. (h)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                value={formData.duracion_estimada_horas}
                                onChange={(e) => setFormData({ ...formData, duracion_estimada_horas: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="2.5"
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

                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            id="tiene_checklist"
                            checked={formData.tiene_checklist}
                            onChange={(e) => setFormData({ ...formData, tiene_checklist: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="tiene_checklist" className="text-sm font-semibold text-blue-900 cursor-pointer flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            ¿Requiere Checklist Técnico?
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
                        {tipo ? 'Guardar Cambios' : 'Crear Tipo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
