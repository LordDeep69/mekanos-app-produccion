'use client';

import {
    CATEGORIAS_PARAMETRO,
    useCreateParametroMedicion,
    useDeleteParametroMedicion,
    useParametrosMedicion,
    useUpdateParametroMedicion,
} from '@/features/catalogos';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Check,
    Edit,
    Hash,
    Loader2,
    Plus,
    Search,
    ShieldCheck,
    ToggleLeft,
    Trash2,
    Type,
    X
} from 'lucide-react';
import { useState } from 'react';

// Helper para obtener el label de la categoría
function getCategoriaLabel(cat: string) {
    return CATEGORIAS_PARAMETRO.find(c => c.value === cat)?.label || cat;
}

export default function ParametrosMedicionPage() {
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParametro, setEditingParametro] = useState<any>(null);

    const { data: response, isLoading, isError, refetch } = useParametrosMedicion({ activo: true, limit: 100 });
    const parametros = response?.data || [];
    const crearParametro = useCreateParametroMedicion();
    const actualizarParametro = useUpdateParametroMedicion();
    const eliminarParametro = useDeleteParametroMedicion();

    const handleEdit = (parametro: any) => {
        setEditingParametro(parametro);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar este parámetro de medición?')) {
            await eliminarParametro.mutateAsync(id);
        }
    };

    const filteredParametros = parametros.filter(p => {
        const nombre = p.nombre_parametro || '';
        const codigo = p.codigo_parametro || '';
        const term = busqueda.toLowerCase();
        const matchesBusqueda = nombre.toLowerCase().includes(term) || codigo.toLowerCase().includes(term);
        const matchesCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
        return matchesBusqueda && matchesCategoria;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="h-7 w-7 text-blue-600" />
                        Parámetros de Medición
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define variables técnicas (Presión, Temp, RPM) y sus rangos de alerta
                    </p>
                </div>
                <button
                    onClick={() => { setEditingParametro(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Parámetro
                </button>
            </div>

            {/* Filtros */}
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
                    {CATEGORIAS_PARAMETRO.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500">Cargando parámetros...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="font-bold text-lg">Error al cargar datos</p>
                        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reintentar
                        </button>
                    </div>
                ) : filteredParametros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Activity className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron parámetros</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Parámetro</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo/Unidad</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rangos Normales</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Alertas</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredParametros.map((param, idx) => (
                                    <tr key={param.id_parametro_medicion ?? `param-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                    {param.nombre_parametro}
                                                </p>
                                                <p className="text-xs font-mono text-gray-400">{param.codigo_parametro}</p>
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                                                    {param.categoria}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                                    {param.tipo_dato === 'NUMERICO' ? <Hash className="h-3.5 w-3.5 text-blue-500" /> :
                                                        param.tipo_dato === 'BOOLEANO' ? <ToggleLeft className="h-3.5 w-3.5 text-green-500" /> :
                                                            <Type className="h-3.5 w-3.5 text-amber-500" />}
                                                    {param.tipo_dato}
                                                </div>
                                                <span className="text-xs text-gray-500 font-bold">{param.unidad_medida}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {param.tipo_dato === 'NUMERICO' ? (
                                                <div className="text-xs space-y-0.5">
                                                    <p className="text-gray-600">Min: <span className="font-mono font-bold">{param.valor_minimo_normal ?? '-'}</span></p>
                                                    <p className="text-gray-600">Max: <span className="font-mono font-bold">{param.valor_maximo_normal ?? '-'}</span></p>
                                                    <p className="text-blue-600 font-bold">Ideal: {param.valor_ideal ?? '-'}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1.5">
                                                {param.es_critico_seguridad && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 text-[10px] font-bold">
                                                        <ShieldCheck className="h-3 w-3" /> SEGURIDAD
                                                    </span>
                                                )}
                                                {param.es_obligatorio && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 text-[10px] font-bold">
                                                        <AlertTriangle className="h-3 w-3" /> OBLIGATORIO
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(param)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(param.id_parametro_medicion)}
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
                <ParametroModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    parametro={editingParametro}
                    onSubmit={async (formData: any) => {
                        const dto = {
                            codigoParametro: formData.codigo_parametro,
                            nombreParametro: formData.nombre_parametro,
                            unidadMedida: formData.unidad_medida,
                            categoria: formData.categoria,
                            descripcion: formData.descripcion,
                            tipoDato: formData.tipo_dato,
                            valorMinimoNormal: formData.valor_minimo_normal,
                            valorMaximoNormal: formData.valor_maximo_normal,
                            valorMinimoCritico: formData.valor_minimo_critico,
                            valorMaximoCritico: formData.valor_maximo_critico,
                            valorIdeal: formData.valor_ideal,
                            esCriticoSeguridad: formData.es_critico_seguridad,
                            esObligatorio: formData.es_obligatorio,
                            decimalesPrecision: formData.decimales_precision,
                        };
                        if (editingParametro) {
                            await actualizarParametro.mutateAsync({ id: editingParametro.id_parametro_medicion, data: dto });
                        } else {
                            await crearParametro.mutateAsync(dto);
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearParametro.isPending || actualizarParametro.isPending}
                />
            )}
        </div>
    );
}

function ParametroModal({ isOpen, onClose, parametro, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        nombre_parametro: parametro?.nombre_parametro || '',
        codigo_parametro: parametro?.codigo_parametro || '',
        descripcion: parametro?.descripcion || '',
        unidad_medida: parametro?.unidad_medida || '',
        tipo_dato: parametro?.tipo_dato || 'NUMERICO',
        categoria: parametro?.categoria || 'GENERAL',
        valor_minimo_normal: parametro?.valor_minimo_normal ?? '',
        valor_maximo_normal: parametro?.valor_maximo_normal ?? '',
        valor_minimo_critico: parametro?.valor_minimo_critico ?? '',
        valor_maximo_critico: parametro?.valor_maximo_critico ?? '',
        valor_ideal: parametro?.valor_ideal ?? '',
        es_critico_seguridad: parametro?.es_critico_seguridad ?? false,
        es_obligatorio: parametro?.es_obligatorio ?? false,
        decimales_precision: parametro?.decimales_precision ?? 2,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: any = { ...formData };
        if (formData.tipo_dato === 'NUMERICO') {
            data.valor_minimo_normal = formData.valor_minimo_normal !== '' ? Number(formData.valor_minimo_normal) : null;
            data.valor_maximo_normal = formData.valor_maximo_normal !== '' ? Number(formData.valor_maximo_normal) : null;
            data.valor_minimo_critico = formData.valor_minimo_critico !== '' ? Number(formData.valor_minimo_critico) : null;
            data.valor_maximo_critico = formData.valor_maximo_critico !== '' ? Number(formData.valor_maximo_critico) : null;
            data.valor_ideal = formData.valor_ideal !== '' ? Number(formData.valor_ideal) : null;
            data.decimales_precision = Number(formData.decimales_precision);
        }
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {parametro ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {parametro ? 'Editar Parámetro' : 'Nuevo Parámetro de Medición'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del Parámetro *</label>
                            <input
                                required
                                type="text"
                                value={formData.nombre_parametro}
                                onChange={(e) => setFormData({ ...formData, nombre_parametro: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Ej: Presión de Aceite"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Único *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_parametro}
                                onChange={(e) => setFormData({ ...formData, codigo_parametro: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="PRES_ACEITE"
                                disabled={!!parametro}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Unidad *</label>
                            <input
                                required
                                type="text"
                                value={formData.unidad_medida}
                                onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="PSI, °C, RPM..."
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo Dato</label>
                            <select
                                value={formData.tipo_dato}
                                onChange={(e) => setFormData({ ...formData, tipo_dato: e.target.value as any })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="NUMERICO">Numérico</option>
                                <option value="TEXTO">Texto</option>
                                <option value="BOOLEANO">Booleano</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoría</label>
                            <select
                                value={formData.categoria}
                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                {CATEGORIAS_PARAMETRO.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.tipo_dato === 'NUMERICO' && (
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Configuración de Rangos Numéricos
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-700 mb-1 uppercase">Min. Normal</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_minimo_normal}
                                        onChange={(e) => setFormData({ ...formData, valor_minimo_normal: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-700 mb-1 uppercase">Max. Normal</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_maximo_normal}
                                        onChange={(e) => setFormData({ ...formData, valor_maximo_normal: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-700 mb-1 uppercase">Valor Ideal</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_ideal}
                                        onChange={(e) => setFormData({ ...formData, valor_ideal: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-red-700 mb-1 uppercase">Min. Crítico</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_minimo_critico}
                                        onChange={(e) => setFormData({ ...formData, valor_minimo_critico: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-red-50/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-red-700 mb-1 uppercase">Max. Crítico</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_maximo_critico}
                                        onChange={(e) => setFormData({ ...formData, valor_maximo_critico: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-red-50/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-700 mb-1 uppercase">Decimales</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="4"
                                        value={formData.decimales_precision}
                                        onChange={(e) => setFormData({ ...formData, decimales_precision: Number(e.target.value) })}
                                        className="w-full px-3 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="es_critico_seguridad"
                                checked={formData.es_critico_seguridad}
                                onChange={(e) => setFormData({ ...formData, es_critico_seguridad: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <label htmlFor="es_critico_seguridad" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-red-600" />
                                Crítico de Seguridad
                            </label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="es_obligatorio"
                                checked={formData.es_obligatorio}
                                onChange={(e) => setFormData({ ...formData, es_obligatorio: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="es_obligatorio" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                Obligatorio en App
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
                        {parametro ? 'Guardar Cambios' : 'Crear Parámetro'}
                    </button>
                </div>
            </div>
        </div>
    );
}
