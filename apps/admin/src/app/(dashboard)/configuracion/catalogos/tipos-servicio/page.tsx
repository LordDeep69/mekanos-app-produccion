'use client';

import {
    AlertCircle,
    Check,
    CheckSquare,
    Clock,
    Edit,
    FileText,
    Info,
    Loader2,
    Palette,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Wrench,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    CATEGORIAS_SERVICIO,
    useCreateTipoServicio,
    useDeleteTipoServicio,
    useTiposServicio,
    useUpdateTipoServicio
} from '../../../../../features/catalogos';
import { TipoServicioDetailDrawer } from '../../../../../features/catalogos/components/tipo-servicio-detail-drawer';
import {
    EditorContent,
    EditorToolbar,
    EDITOR_STYLES,
    plainTextToHtml,
    useRichEditor
} from '@/features/ordenes/components/rich-text-editor';
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
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{tipo.nombre_tipo}</p>
                                                        {tipo.plantilla_observacion && (
                                                            <span
                                                                title="Tiene plantilla de observación configurada"
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md"
                                                            >
                                                                <FileText className="h-3 w-3 text-emerald-600" />
                                                                Plantilla
                                                            </span>
                                                        )}
                                                    </div>
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
                                    plantillaObservacion: formData.plantilla_observacion,
                                    plantilla_observacion: formData.plantilla_observacion,
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
                                plantillaObservacion: formData.plantilla_observacion,
                                plantilla_observacion: formData.plantilla_observacion,
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

function PlantillaObservacionEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (val: string) => void;
}) {
    const editor = useRichEditor(plainTextToHtml(value || ''));

    useEffect(() => {
        if (!editor) return;
        const handleUpdate = () => {
            const html = editor.getHTML();
            onChange(html === '<p></p>' ? '' : html);
        };
        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, onChange]);

    // Opciones rápidas de plantillas predefinidas
    const handleInsertSnippet = (snippetHtml: string) => {
        if (!editor) return;
        const currentHtml = editor.getHTML();
        if (!currentHtml || currentHtml === '<p></p>') {
            editor.commands.setContent(snippetHtml);
        } else {
            editor.commands.setContent(currentHtml + snippetHtml);
        }
    };

    return (
        <div className="space-y-3">
            <style dangerouslySetInnerHTML={{ __html: EDITOR_STYLES }} />

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-900 leading-relaxed">
                    <p className="font-bold">Plantilla de Observación de Cierre para Órdenes de Servicio</p>
                    <p className="text-blue-700 mt-0.5">
                        Define el texto base que tendrá este tipo de servicio. Al gestionar una orden finalizada en el portal admin, podrás insertar esta plantilla en las Observaciones de Cierre con un solo clic, sin borrar el texto previo que el técnico haya ingresado.
                    </p>
                </div>
            </div>

            {/* Snippets rápidos sugeridos */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Estructuras sugeridas:
                </span>
                <button
                    type="button"
                    onClick={() => handleInsertSnippet('<h2>Mantenimiento Preventivo Estandarizado</h2><p>Se realizó el protocolo de mantenimiento preventivo al equipo, verificando su óptima operatividad y condiciones de seguridad.</p><h3>Actividades Principales Realizadas:</h3><ul><li>Inspección visual y limpieza general del equipo y subsistemas.</li><li>Revisión de conexiones eléctricas, cableado y terminales.</li><li>Verificación de parámetros de presión, temperatura, voltaje y corriente.</li><li>Pruebas de funcionamiento en régimen continuo y validación de protecciones.</li></ul><h3>Recomendaciones Técnicas:</h3><ul><li>Mantener el área despejada y libre de humedad.</li><li>Programar la siguiente rutina de mantenimiento preventivo de acuerdo al cronograma.</li></ul>')}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                >
                    + Preventivo Estándar
                </button>
                <button
                    type="button"
                    onClick={() => handleInsertSnippet('<h2>Diagnóstico y Corrección de Falla</h2><p>Se atendió solicitud correctiva en el equipo por reporte de anomalía operativa.</p><h3>Diagnóstico Técnico:</h3><p>Se evaluó el estado del equipo y se identificó la causa raíz de la falla.</p><h3>Correcciones y Acciones Realizadas:</h3><ul><li>Ajuste, calibración y corrección de subsistemas afectados.</li><li>Pruebas operativas confirmando solución de la anomalía.</li></ul><h3>Observaciones y Recomendaciones:</h3><p>El equipo queda operativo y entregado a satisfacción del cliente.</p>')}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                >
                    + Correctivo / Diagnóstico
                </button>
                <button
                    type="button"
                    onClick={() => handleInsertSnippet('<h3>Puntos de Control Verificados:</h3><ul><li><strong>Nivel y Estado de Fluidos:</strong> Conforme.</li><li><strong>Fugas / Filtraciones:</strong> No se evidencian fugas activas.</li><li><strong>Ruido y Vibración:</strong> Dentro de límites admisibles.</li><li><strong>Alineación y Fijación:</strong> Pernos y anclajes en orden.</li></ul>')}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                >
                    + Puntos de Control
                </button>
            </div>

            {/* Editor TipTap con estilo y toolbar idéntico a Observaciones de Cierre */}
            <div className="obs-editor border-2 border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

function TipoServicioModal({ isOpen, onClose, tipo, onSubmit, isLoading }: any) {
    const [activeTab, setActiveTab] = useState<'general' | 'plantilla'>('general');
    const [formData, setFormData] = useState({
        nombre_tipo: tipo?.nombre_tipo || '',
        codigo_tipo: tipo?.codigo_tipo || '',
        categoria: tipo?.categoria || 'PREVENTIVO',
        descripcion: tipo?.descripcion || '',
        tiene_checklist: tipo?.tiene_checklist ?? true,
        duracion_estimada_horas: tipo?.duracion_estimada_horas || '',
        color_hex: tipo?.color_hex || '#3b82f6',
        plantilla_observacion: tipo?.plantilla_observacion || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            duracion_estimada_horas: formData.duracion_estimada_horas ? Number(formData.duracion_estimada_horas) : undefined
        });
    };

    const tienePlantilla = Boolean(
        formData.plantilla_observacion &&
        formData.plantilla_observacion.trim() !== '' &&
        formData.plantilla_observacion !== '<p></p>'
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {tipo ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {tipo ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 pt-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all',
                            activeTab === 'general'
                                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        )}
                    >
                        <Wrench className="h-4 w-4" />
                        Datos Generales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('plantilla')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all',
                            activeTab === 'plantilla'
                                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        )}
                    >
                        <FileText className="h-4 w-4" />
                        Plantilla de Observación
                        {tienePlantilla && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                                Configurada
                            </span>
                        )}
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Tab 1: Datos Generales */}
                    <div className={cn('space-y-4', activeTab === 'general' ? 'block' : 'hidden')}>
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
                    </div>

                    {/* Tab 2: Plantilla de Observación */}
                    <div className={cn('space-y-4', activeTab === 'plantilla' ? 'block' : 'hidden')}>
                        <PlantillaObservacionEditor
                            value={formData.plantilla_observacion}
                            onChange={(val) => setFormData(prev => ({ ...prev, plantilla_observacion: val }))}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
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
