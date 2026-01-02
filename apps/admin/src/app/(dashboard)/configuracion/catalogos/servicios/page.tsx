'use client';

import {
    useActualizarServicioComercial,
    useCrearServicioComercial,
    useEliminarServicioComercial,
    useServiciosComerciales,
    useTiposServicio
} from '@/features/ordenes';
import { getCategoriaServicioColor, getCategoriaServicioLabel } from '@/features/ordenes/api/catalogos.service';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    Check,
    Clock,
    DollarSign,
    Edit,
    Loader2,
    Plus,
    Search,
    ShieldCheck,
    Tag,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';

export default function CatalogoServiciosComercialesPage() {
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingServicio, setEditingServicio] = useState<any>(null);

    const { data: servicios, isLoading, isError, refetch } = useServiciosComerciales({
        idTipoServicio: filtroTipoServicio ? Number(filtroTipoServicio) : undefined,
    });

    const { data: tiposServicio } = useTiposServicio({ activo: true });

    const crearServicio = useCrearServicioComercial();
    const actualizarServicio = useActualizarServicioComercial();
    const eliminarServicio = useEliminarServicioComercial();

    const handleEdit = (servicio: any) => {
        setEditingServicio(servicio);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar este servicio comercial?')) {
            await eliminarServicio.mutateAsync(id);
        }
    };

    const filteredServicios = servicios?.filter(s =>
        s.nombre_servicio.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.codigo_servicio.toLowerCase().includes(busqueda.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Tag className="h-7 w-7 text-blue-600" />
                        Catálogo Comercial de Servicios
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define los precios base y certificaciones de los servicios facturables
                    </p>
                </div>
                <button
                    onClick={() => { setEditingServicio(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Servicio
                </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
                    value={filtroTipoServicio}
                    onChange={(e) => setFiltroTipoServicio(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                    <option value="">Todos los tipos de servicio</option>
                    {tiposServicio?.map((t: any) => (
                        <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>{t.nombre_tipo}</option>
                    ))}
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500">Cargando catálogo comercial...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="font-bold text-lg">Error al cargar datos</p>
                        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reintentar
                        </button>
                    </div>
                ) : filteredServicios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Tag className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron servicios comerciales</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicio</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría / Tipo</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio Base</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Requisitos</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredServicios.map((servicio) => (
                                    <tr key={servicio.id_servicio} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                    {servicio.nombre_servicio}
                                                </p>
                                                <p className="text-xs font-mono text-gray-400">{servicio.codigo_servicio}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider self-start",
                                                    getCategoriaServicioColor(servicio.categoria)
                                                )}>
                                                    {getCategoriaServicioLabel(servicio.categoria)}
                                                </span>
                                                <span className="text-xs text-gray-500 font-medium">
                                                    {servicio.tipos_servicio?.nombre_tipo || 'Sin tipo vinculado'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                {servicio.precio_base ? servicio.precio_base.toLocaleString('es-CO') : 'Por definir'}
                                            </div>
                                            {servicio.incluye_repuestos && (
                                                <span className="text-[10px] text-blue-600 font-bold">+ REPUESTOS</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {servicio.requiere_certificacion && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 text-[10px] font-bold">
                                                        <ShieldCheck className="h-3 w-3" /> CERTIFICACIÓN
                                                    </span>
                                                )}
                                                {servicio.duracion_estimada_horas && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200 text-[10px] font-bold">
                                                        <Clock className="h-3 w-3" /> {servicio.duracion_estimada_horas}h
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(servicio)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(servicio.id_servicio)}
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
                <ServicioComercialModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    servicio={editingServicio}
                    tiposServicio={tiposServicio || []}
                    onSubmit={async (formData: any) => {
                        if (editingServicio) {
                            await actualizarServicio.mutateAsync({ id: editingServicio.id_servicio, data: formData });
                        } else {
                            await crearServicio.mutateAsync(formData);
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearServicio.isPending || actualizarServicio.isPending}
                />
            )}
        </div>
    );
}

function ServicioComercialModal({ isOpen, onClose, servicio, tiposServicio, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        nombre_servicio: servicio?.nombre_servicio || '',
        codigo_servicio: servicio?.codigo_servicio || '',
        categoria: servicio?.categoria || 'PREVENTIVO',
        id_tipo_servicio: servicio?.id_tipo_servicio || '',
        descripcion: servicio?.descripcion || '',
        precio_base: servicio?.precio_base || '',
        duracion_estimada_horas: servicio?.duracion_estimada_horas || '',
        requiere_certificacion: servicio?.requiere_certificacion ?? false,
        tipo_certificacion_requerida: servicio?.tipo_certificacion_requerida || '',
        incluye_repuestos: servicio?.incluye_repuestos ?? false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: any = {
            ...formData,
            id_tipo_servicio: formData.id_tipo_servicio ? Number(formData.id_tipo_servicio) : null,
            precio_base: formData.precio_base ? Number(formData.precio_base) : null,
            duracion_estimada_horas: formData.duracion_estimada_horas ? Number(formData.duracion_estimada_horas) : null,
        };
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {servicio ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {servicio ? 'Editar Servicio Comercial' : 'Nuevo Servicio Comercial'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del Servicio *</label>
                            <input
                                required
                                type="text"
                                value={formData.nombre_servicio}
                                onChange={(e) => setFormData({ ...formData, nombre_servicio: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Ej: Mantenimiento 250 Horas"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Comercial *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_servicio}
                                onChange={(e) => setFormData({ ...formData, codigo_servicio: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="SERV_M250"
                                disabled={!!servicio}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoría *</label>
                            <select
                                required
                                value={formData.categoria}
                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="PREVENTIVO">Preventivo</option>
                                <option value="CORRECTIVO">Correctivo</option>
                                <option value="EMERGENCIA">Emergencia</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Vincular a Tipo de Servicio</label>
                            <select
                                value={formData.id_tipo_servicio}
                                onChange={(e) => setFormData({ ...formData, id_tipo_servicio: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">No vincular</option>
                                {tiposServicio?.map((t: any) => (
                                    <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>{t.nombre_tipo}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> Precio Base ($)
                            </label>
                            <input
                                type="number"
                                value={formData.precio_base}
                                onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                placeholder="500000"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Duración Est. (h)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                value={formData.duracion_estimada_horas}
                                onChange={(e) => setFormData({ ...formData, duracion_estimada_horas: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="4.0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                                <input
                                    type="checkbox"
                                    id="incluye_repuestos"
                                    checked={formData.incluye_repuestos}
                                    onChange={(e) => setFormData({ ...formData, incluye_repuestos: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="incluye_repuestos" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Precio incluye repuestos
                                </label>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                                <input
                                    type="checkbox"
                                    id="requiere_certificacion"
                                    checked={formData.requiere_certificacion}
                                    onChange={(e) => setFormData({ ...formData, requiere_certificacion: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <label htmlFor="requiere_certificacion" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-red-600" />
                                    Requiere Certificación Especial
                                </label>
                            </div>
                        </div>

                        {formData.requiere_certificacion && (
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                <label className="block text-xs font-bold text-red-700 uppercase mb-1.5">Tipo de Certificación</label>
                                <input
                                    type="text"
                                    value={formData.tipo_certificacion_requerida}
                                    onChange={(e) => setFormData({ ...formData, tipo_certificacion_requerida: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                    placeholder="Ej: Trabajo en Alturas"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción / Alcance Comercial</label>
                        <textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            placeholder="Qué incluye este servicio para el cliente..."
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
                        {servicio ? 'Guardar Cambios' : 'Crear Servicio'}
                    </button>
                </div>
            </div>
        </div>
    );
}
