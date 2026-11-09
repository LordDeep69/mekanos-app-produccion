'use client';

import {
    AlertCircle,
    Bookmark,
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
    Trash2,
    Wrench,
    X,
    Lock,
    Unlock,
    CheckCircle2,
    Layers,
    Globe,
    Power
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import {
    generarCodigoTipoServicio,
    verificarCodigoDuplicado,
    useArquetiposEam,
    EamSelect,
    ArquetiposMultiCombobox
} from '@/features/catalogos-eam';
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

/**
 * Normaliza `aplica_a` (y el respaldo `tipos_equipo` / `id_tipo_equipo`) hacia los códigos
 * canónicos únicos de `arquetipos` (evitando mostrar duplicados de sinónimos como GEN y GENERADOR).
 */
function resolverArquetiposAplicables(
    tipo: any,
    arquetipos: any[]
): Array<{ codigo: string; nombre: string; id_tipo_equipo?: number }> {
    const rawCodes = new Set<string>();
    if (Array.isArray(tipo?.aplica_a) && tipo.aplica_a.length > 0) {
        for (const c of tipo.aplica_a) {
            if (c && String(c).trim()) rawCodes.add(String(c).trim().toUpperCase());
        }
    }
    if (tipo?.tipos_equipo?.codigo_tipo) {
        rawCodes.add(String(tipo.tipos_equipo.codigo_tipo).trim().toUpperCase());
    }

    if (rawCodes.size === 0 && !tipo?.id_tipo_equipo) {
        return [];
    }

    const matchedMap = new Map<string, { codigo: string; nombre: string; id_tipo_equipo?: number }>();

    for (const code of Array.from(rawCodes)) {
        const arq = (arquetipos || []).find((a: any) => {
            const cCorto = String(a.codigo_corto || '').toUpperCase().trim();
            const cTipo = String(a.codigo_tipo || '').toUpperCase().trim();
            const syncs: string[] = Array.isArray(a.codigos_sincronizados)
                ? a.codigos_sincronizados.map((s: string) => String(s).toUpperCase().trim())
                : [];
            if (cCorto === code || cTipo === code || syncs.includes(code)) return true;
            if ((code === 'GEN' || code === 'GENERADOR') && (cTipo === 'GEN' || cTipo === 'GENERADOR')) return true;
            if ((code === 'BOM' || code === 'BOMBA') && (cTipo === 'BOM' || cTipo === 'BOMBA')) return true;
            if ((code === 'MOT' || code === 'MOTOR') && (cTipo === 'MOT' || cTipo === 'MOTOR')) return true;
            if ((code === 'COMP' || code === 'COMPRESOR') && (cTipo === 'COMP' || cTipo === 'COMPRESOR')) return true;
            return false;
        });

        if (arq) {
            const key = String(arq.codigo_corto || arq.codigo_tipo).toUpperCase().trim();
            if (!matchedMap.has(key)) {
                matchedMap.set(key, {
                    codigo: key,
                    nombre: arq.nombre_canonico || arq.nombre_tipo || key,
                    id_tipo_equipo: arq.id_tipo_equipo,
                });
            }
        } else {
            // Si aún no cargaron arquetipos o es un código independiente
            const canonKey =
                code === 'GENERADOR' ? 'GEN' :
                code === 'BOMBA' ? 'BOM' :
                code === 'MOTOR' ? 'MOT' :
                code === 'COMPRESOR' ? 'COMP' : code;
            if (!matchedMap.has(canonKey)) {
                matchedMap.set(canonKey, {
                    codigo: canonKey,
                    nombre:
                        tipo?.tipos_equipo?.codigo_tipo?.toUpperCase() === code
                            ? tipo.tipos_equipo.nombre_tipo
                            : canonKey,
                    id_tipo_equipo: tipo?.id_tipo_equipo ?? undefined,
                });
            }
        }
    }

    // Fallback si solo tenía id_tipo_equipo numérico
    if (matchedMap.size === 0 && tipo?.id_tipo_equipo) {
        const arqById = (arquetipos || []).find(
            (a: any) =>
                Number(a.id_tipo_equipo) === Number(tipo.id_tipo_equipo) ||
                (Array.isArray(a.ids_sincronizados) && a.ids_sincronizados.includes(Number(tipo.id_tipo_equipo)))
        );
        if (arqById) {
            const key = String(arqById.codigo_corto || arqById.codigo_tipo).toUpperCase().trim();
            matchedMap.set(key, {
                codigo: key,
                nombre: arqById.nombre_canonico || arqById.nombre_tipo || key,
                id_tipo_equipo: arqById.id_tipo_equipo,
            });
        } else if (tipo?.tipos_equipo) {
            const key = String(tipo.tipos_equipo.codigo_tipo || '').toUpperCase().trim();
            matchedMap.set(key, {
                codigo: key,
                nombre: tipo.tipos_equipo.nombre_tipo || key,
                id_tipo_equipo: tipo.id_tipo_equipo,
            });
        }
    }

    return Array.from(matchedMap.values());
}

export default function TiposServicioPage() {
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [tipoEquipoFiltro, setTipoEquipoFiltro] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTipo, setEditingTipo] = useState<any>(null);
    const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);

    const { data: response, isLoading, isError, refetch } = useTiposServicio({ activo: 'all' as any, limit: 100 });
    const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const { data: arquetipos = [] } = useArquetiposEam();
    const crearTipo = useCreateTipoServicio();
    const actualizarTipo = useUpdateTipoServicio();
    const eliminarTipo = useDeleteTipoServicio();

    const tipos = response?.data || [];
    const activosCount = useMemo(() => tipos.filter(t => t.activo !== false).length, [tipos]);
    const inactivosCount = useMemo(() => tipos.filter(t => t.activo === false).length, [tipos]);

    const handleToggleActivo = async (e: React.MouseEvent, tipo: any) => {
        e.stopPropagation();
        const nuevoEstado = tipo.activo === false;
        setTogglingId(tipo.id_tipo_servicio);
        try {
            await actualizarTipo.mutateAsync({
                id: tipo.id_tipo_servicio,
                data: { activo: nuevoEstado },
            });
            toast.success(
                nuevoEstado
                    ? `Servicio "${tipo.nombre_tipo}" activado correctamente`
                    : `Servicio "${tipo.nombre_tipo}" desactivado. No aparecerá en nuevas órdenes.`
            );
        } catch (err) {
            toast.error('Error al actualizar el estado del servicio');
        } finally {
            setTogglingId(null);
        }
    };

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
        if (estadoFiltro === 'ACTIVOS' && t.activo === false) return false;
        if (estadoFiltro === 'INACTIVOS' && t.activo !== false) return false;
        const nombre = t.nombre_tipo || '';
        const codigo = t.codigo_tipo || '';
        const term = busqueda.toLowerCase();
        const matchesBusqueda = nombre.toLowerCase().includes(term) || codigo.toLowerCase().includes(term);
        const matchesCategoria = !categoriaFiltro || t.categoria === categoriaFiltro;

        const arqsResueltos = resolverArquetiposAplicables(t, arquetipos);
        let matchesTipoEquipo = true;
        if (tipoEquipoFiltro === 'universal') {
            matchesTipoEquipo = arqsResueltos.length === 0;
        } else if (tipoEquipoFiltro) {
            const arqFiltro = (arquetipos || []).find((a: any) => String(a.id_tipo_equipo) === tipoEquipoFiltro);
            const codFiltro = String(arqFiltro?.codigo_corto || arqFiltro?.codigo_tipo || '').toUpperCase().trim();
            matchesTipoEquipo =
                String(t.id_tipo_equipo) === tipoEquipoFiltro ||
                (Boolean(codFiltro) && arqsResueltos.some((ar) => ar.codigo === codFiltro));
        }

        return matchesBusqueda && matchesCategoria && matchesTipoEquipo;
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
                        Define las categorías de mantenimiento y servicios técnicos (Universales, por Equipo o Multi-Equipo)
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

            {/* Barra de Filtros Prémium */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm items-center">
                <div className="relative md:col-span-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <div className="md:col-span-3">
                    <EamSelect
                        value={tipoEquipoFiltro}
                        onChange={setTipoEquipoFiltro}
                        options={[
                            { value: '', label: 'Todos los Tipos de Equipo' },
                            { value: 'universal', label: '🌐 Solo Universales (Cualquier Equipo)', badge: 'GLOBAL' },
                            ...arquetipos.map((a: any) => ({
                                value: String(a.id_tipo_equipo),
                                label: `${a.nombre_tipo} (${a.codigo_tipo})`,
                                badge: a.codigo_tipo,
                            }))
                        ]}
                        placeholder="Filtrar por arquetipo..."
                        searchable={arquetipos.length > 5}
                    />
                </div>
                <div className="md:col-span-3">
                    <EamSelect
                        value={categoriaFiltro}
                        onChange={setCategoriaFiltro}
                        options={[
                            { value: '', label: 'Todas las categorías' },
                            ...CATEGORIAS_SERVICIO.map(cat => ({
                                value: cat.value,
                                label: cat.label,
                                badge: cat.value,
                            }))
                        ]}
                        placeholder="Filtrar por categoría..."
                    />
                </div>
                <div className="md:col-span-2">
                    <EamSelect
                        value={estadoFiltro}
                        onChange={(val) => setEstadoFiltro(val as any)}
                        options={[
                            { value: 'TODOS', label: `Todos (${tipos.length})` },
                            { value: 'ACTIVOS', label: `Solo Activos (${activosCount})`, badge: 'ACTIVO' },
                            { value: 'INACTIVOS', label: `Solo Inactivos (${inactivosCount})`, badge: 'INACTIVO' },
                        ]}
                        placeholder="Estado..."
                    />
                </div>
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
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aplica a</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Checklist</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duración Est.</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTipos.map((tipo, idx) => {
                                    const arqsAplicables = resolverArquetiposAplicables(tipo, arquetipos);
                                    return (
                                        <tr
                                            key={tipo.id_tipo_servicio ?? `tipo-${idx}`}
                                            className={cn("transition-colors group cursor-pointer", tipo.activo === false ? "bg-slate-50/70 hover:bg-slate-100/80 text-gray-500 opacity-75" : "hover:bg-blue-50/30 text-gray-900")}
                                            onClick={() => setSelectedTipoId(tipo.id_tipo_servicio)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
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
                                                {arqsAplicables.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                        {arqsAplicables.map((arqItem) => (
                                                            <span
                                                                key={arqItem.codigo}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                                                            >
                                                                <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                                <span>{arqItem.nombre}</span>
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-200/60 text-blue-800 font-mono font-bold">
                                                                    {arqItem.codigo}
                                                                </span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200/80">
                                                        <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>Universal</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    getCategoriaColor(tipo.categoria)
                                                )}>
                                                    {getCategoriaLabel(tipo.categoria)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleActivo(e, tipo)}
                                                    disabled={togglingId === tipo.id_tipo_servicio}
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-2xs cursor-pointer",
                                                        tipo.activo !== false
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                                                            : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200 hover:text-gray-700"
                                                    )}
                                                    title={tipo.activo !== false ? "Clic para desactivar (ocultar de órdenes)" : "Clic para activar (disponible en órdenes)"}
                                                >
                                                    {togglingId === tipo.id_tipo_servicio ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            tipo.activo !== false ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                                                        )} />
                                                    )}
                                                    <span>{tipo.activo !== false ? 'Activo' : 'Inactivo'}</span>
                                                </button>
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
                                    );
                                })}
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
                    tipos={tipos}
                    arquetipos={arquetipos}
                    onSubmit={async (formData: any) => {
                        const payload = {
                            nombreTipo: formData.nombre_tipo,
                            codigoTipo: formData.codigo_tipo,
                            categoria: formData.categoria,
                            tipoEquipoId: formData.id_tipo_equipo ? Number(formData.id_tipo_equipo) : null,
                            aplicaA: Array.isArray(formData.aplica_a) ? formData.aplica_a : [],
                            aplica_a: Array.isArray(formData.aplica_a) ? formData.aplica_a : [],
                            descripcion: formData.descripcion || undefined,
                            tieneChecklist: Boolean(formData.tiene_checklist),
                            duracionEstimadaHoras: formData.duracion_estimada_horas,
                            colorHex: formData.color_hex,
                            plantillaObservacion: formData.plantilla_observacion || null,
                            plantilla_observacion: formData.plantilla_observacion || null,
                            activo: formData.activo !== undefined ? Boolean(formData.activo) : true,
                        };
                        if (editingTipo) {
                            await actualizarTipo.mutateAsync({
                                id: editingTipo.id_tipo_servicio,
                                data: payload,
                            });
                        } else {
                            await crearTipo.mutateAsync(payload);
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
        const isEmpty = editor.getText().trim() === '';
        if (isEmpty) {
            editor.chain().focus().selectAll().insertContent(snippetHtml).run();
        } else {
            editor
                .chain()
                .focus()
                .setTextSelection(editor.state.doc.content.size)
                .insertContent(`<p></p>${snippetHtml}`)
                .run();
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
                    <Bookmark className="h-3.5 w-3.5 text-blue-600" />
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
                {editor ? (
                    <>
                        <EditorToolbar editor={editor} />
                        <EditorContent editor={editor} />
                    </>
                ) : (
                    <div className="min-h-[220px] flex items-center justify-center text-gray-400 text-xs gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Cargando editor de plantilla...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function TipoServicioModal({ isOpen, onClose, tipo, tipos = [], arquetipos = [], onSubmit, isLoading }: any) {
    const [activeTab, setActiveTab] = useState<'general' | 'plantilla'>('general');

    const codigosExistentes = useMemo(() => {
        return new Set<string>(
            (tipos || [])
                .filter((t: any) => !tipo || t.id_tipo_servicio !== tipo.id_tipo_servicio)
                .map((t: any) => (t.codigo_tipo || '').toUpperCase().trim())
                .filter(Boolean)
        );
    }, [tipos, tipo]);

    // Opciones formateadas de arquetipos técnicos para el selector múltiple
    const opcionesTipos = useMemo(() => {
        if (arquetipos && arquetipos.length > 0) {
            return arquetipos.map((a: any) => {
                const cod = (a.codigo_corto || a.codigo_tipo || '').toUpperCase().trim();
                const nom = a.nombre_canonico || a.nombre_tipo || '';
                return {
                    codigo: cod,
                    nombre: nom,
                    label: `${nom} (${cod})`,
                    id_tipo_equipo: a.id_tipo_equipo,
                };
            });
        }
        return [
            { codigo: 'GEN', nombre: 'Generador Eléctrico', label: 'Generador Eléctrico (GEN)', id_tipo_equipo: 3 },
            { codigo: 'BOM', nombre: 'Bomba Hidráulica', label: 'Bomba Hidráulica (BOM)', id_tipo_equipo: 5 },
            { codigo: 'COMP', nombre: 'Compresor Industrial', label: 'Compresor Industrial (COMP)', id_tipo_equipo: 20 },
            { codigo: 'MOT', nombre: 'Motor Industrial', label: 'Motor Industrial (MOT)', id_tipo_equipo: 4 },
            { codigo: 'HVAC', nombre: 'Aire Acondicionado / Chiller', label: 'Aire Acondicionado / Chiller (HVAC)', id_tipo_equipo: 21 },
            { codigo: 'ELEV', nombre: 'Ascensor de Pasajeros', label: 'Ascensor de Pasajeros (ELEV)', id_tipo_equipo: 22 },
        ];
    }, [arquetipos]);

    const initialAplicaA = useMemo(() => {
        if (!tipo) return [];
        return resolverArquetiposAplicables(tipo, arquetipos).map((a) => a.codigo);
    }, [tipo, arquetipos]);

    const [isAutoCodigo, setIsAutoCodigo] = useState(!tipo);

    const [formData, setFormData] = useState({
        nombre_tipo: tipo?.nombre_tipo || '',
        codigo_tipo: tipo?.codigo_tipo || '',
        id_tipo_equipo: tipo?.id_tipo_equipo ? String(tipo.id_tipo_equipo) : '',
        aplica_a: initialAplicaA,
        categoria: tipo?.categoria || 'PREVENTIVO',
        descripcion: tipo?.descripcion || '',
        tiene_checklist: tipo?.tiene_checklist ?? true,
        duracion_estimada_horas: tipo?.duracion_estimada_horas ?? '',
        color_hex: tipo?.color_hex || '#3b82f6',
        plantilla_observacion: tipo?.plantilla_observacion || '',
        activo: tipo?.activo ?? true,
    });

    const selectedArquetiposInfo = useMemo(() => {
        return (formData.aplica_a || [])
            .map((cod: string) => opcionesTipos.find((o: any) => o.codigo === cod))
            .filter(Boolean);
    }, [formData.aplica_a, opcionesTipos]);

    const primaryArquetipo = selectedArquetiposInfo[0] || null;

    const isCodigoDuplicado = useMemo(() => {
        return verificarCodigoDuplicado(
            formData.codigo_tipo,
            codigosExistentes,
            tipo?.codigo_tipo,
        );
    }, [formData.codigo_tipo, codigosExistentes, tipo]);

    const handleAplicaAChange = (newCodes: string[]) => {
        const firstOpt = opcionesTipos.find((o: any) => o.codigo === newCodes[0]);
        const prefijoCodigo = newCodes.length === 1 ? firstOpt?.codigo : newCodes.length > 1 ? 'MULTI' : undefined;
        const auto = (isAutoCodigo && !tipo)
            ? generarCodigoTipoServicio(formData.nombre_tipo, formData.categoria, codigosExistentes, prefijoCodigo)
            : formData.codigo_tipo;
        setFormData(prev => ({
            ...prev,
            aplica_a: newCodes,
            id_tipo_equipo: firstOpt?.id_tipo_equipo ? String(firstOpt.id_tipo_equipo) : '',
            codigo_tipo: auto,
        }));
    };

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newNombre = e.target.value;
        const prefijoCodigo =
            formData.aplica_a.length === 1
                ? primaryArquetipo?.codigo
                : formData.aplica_a.length > 1
                ? 'MULTI'
                : undefined;
        const auto = (isAutoCodigo && !tipo)
            ? generarCodigoTipoServicio(newNombre, formData.categoria, codigosExistentes, prefijoCodigo)
            : formData.codigo_tipo;
        setFormData(prev => ({
            ...prev,
            nombre_tipo: newNombre,
            codigo_tipo: auto,
        }));
    };

    const handleCategoriaChange = (newCat: string) => {
        const prefijoCodigo =
            formData.aplica_a.length === 1
                ? primaryArquetipo?.codigo
                : formData.aplica_a.length > 1
                ? 'MULTI'
                : undefined;
        const auto = (isAutoCodigo && !tipo)
            ? generarCodigoTipoServicio(formData.nombre_tipo, newCat, codigosExistentes, prefijoCodigo)
            : formData.codigo_tipo;
        setFormData(prev => ({
            ...prev,
            categoria: newCat as any,
            codigo_tipo: auto,
        }));
    };

    const handleToggleAutoCodigo = () => {
        const nuevoModo = !isAutoCodigo;
        setIsAutoCodigo(nuevoModo);
        if (nuevoModo) {
            const prefijoCodigo =
                formData.aplica_a.length === 1
                    ? primaryArquetipo?.codigo
                    : formData.aplica_a.length > 1
                    ? 'MULTI'
                    : undefined;
            const auto = generarCodigoTipoServicio(
                formData.nombre_tipo,
                formData.categoria,
                codigosExistentes,
                prefijoCodigo
            );
            setFormData((prev) => ({ ...prev, codigo_tipo: auto }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isCodigoDuplicado) return;
        const rawDuracion = formData.duracion_estimada_horas;
        let parsedDuracion: number | undefined = undefined;
        if (rawDuracion !== '' && rawDuracion !== null && rawDuracion !== undefined) {
            const num = Number(String(rawDuracion).replace(',', '.'));
            if (!isNaN(num) && num > 0) {
                parsedDuracion = num;
            }
        }

        const prefijoCodigo =
            formData.aplica_a.length === 1
                ? primaryArquetipo?.codigo
                : formData.aplica_a.length > 1
                ? 'MULTI'
                : undefined;

        const finalCode = formData.codigo_tipo.trim() || generarCodigoTipoServicio(
            formData.nombre_tipo,
            formData.categoria,
            codigosExistentes,
            prefijoCodigo
        );

        onSubmit({
            ...formData,
            codigo_tipo: finalCode.toUpperCase().trim(),
            id_tipo_equipo: primaryArquetipo?.id_tipo_equipo ? Number(primaryArquetipo.id_tipo_equipo) : null,
            aplica_a: formData.aplica_a,
            duracion_estimada_horas: parsedDuracion,
            activo: Boolean(formData.activo)
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
                        {/* Selector Multi-Arquetipo de Equipo */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                    <Layers className="h-4 w-4 text-blue-600" />
                                    ¿A qué Tipo(s) de Activo / Equipo aplica este servicio?
                                </label>
                                {selectedArquetiposInfo.length > 0 ? (
                                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                                        {selectedArquetiposInfo.length === 1
                                            ? `Arquetipo: ${selectedArquetiposInfo[0].codigo}`
                                            : `${selectedArquetiposInfo.length} Arquetipos (${selectedArquetiposInfo.map((a: any) => a.codigo).join(', ')})`}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                        🌐 Universal (Todos)
                                    </span>
                                )}
                            </div>
                            <ArquetiposMultiCombobox
                                value={formData.aplica_a}
                                onChange={handleAplicaAChange}
                                options={opcionesTipos}
                                placeholder="Buscar y seleccionar uno o varios tipos de equipo..."
                            />
                            <p className="text-[11px] text-gray-500 mt-1.5">
                                {selectedArquetiposInfo.length === 1 ? (
                                    <span className="text-blue-600 font-medium">
                                        ⚡ Exclusivo para <strong>{selectedArquetiposInfo[0].nombre}</strong>. Solo aparecerá cuando se programe una orden para este tipo de activo.
                                    </span>
                                ) : selectedArquetiposInfo.length > 1 ? (
                                    <span className="text-indigo-600 font-medium">
                                        🔗 Servicio Multi-Equipo: habilitado para <strong>{selectedArquetiposInfo.map((a: any) => a.nombre).join(' + ')}</strong> y oculto para el resto de equipos.
                                    </span>
                                ) : (
                                    'Modo Universal activo: este servicio aparecerá disponible para cualquier tipo de equipo al crear una orden.'
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del Servicio *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.nombre_tipo}
                                    onChange={handleNombreChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                                    placeholder="Ej: Mantenimiento Preventivo Tipo A - Ascensor"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-bold text-gray-700">Código Único *</label>
                                    {!tipo && (
                                        <button
                                            type="button"
                                            onClick={handleToggleAutoCodigo}
                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            {isAutoCodigo ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                            <span>{isAutoCodigo ? 'Personalizar' : 'Auto'}</span>
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.codigo_tipo}
                                    onChange={(e) => setFormData({ ...formData, codigo_tipo: e.target.value.toUpperCase().trim() })}
                                    className={`w-full px-4 py-2 border rounded-xl outline-none text-sm font-mono uppercase transition-all disabled:bg-slate-100 disabled:text-slate-600 ${
                                        isCodigoDuplicado
                                            ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                                            : 'border-gray-300'
                                    }`}
                                    placeholder="ELEV_PREV_A"
                                    disabled={Boolean(tipo) || isAutoCodigo}
                                />
                                {isCodigoDuplicado ? (
                                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                                        ✕ Código en uso. Modifícalo.
                                    </p>
                                ) : formData.codigo_tipo && !tipo ? (
                                    <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Código único disponible</span>
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoría de Negocio *</label>
                            <EamSelect
                                value={formData.categoria}
                                onChange={handleCategoriaChange}
                                options={CATEGORIAS_SERVICIO.map(cat => ({
                                    value: cat.value,
                                    label: cat.label,
                                    badge: cat.value,
                                }))}
                                placeholder="Selecciona la categoría..."
                            />
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

                        {/* Switch de Activación para Órdenes */}
                        <div className={cn(
                            "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                            formData.activo
                                ? "bg-emerald-50/70 border-emerald-200"
                                : "bg-gray-50 border-gray-200"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                    formData.activo ? "bg-emerald-600 text-white" : "bg-gray-300 text-gray-600"
                                )}>
                                    <Power className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {formData.activo ? 'Servicio Habilitado para Órdenes' : 'Servicio Deshabilitado (Inactivo)'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formData.activo
                                            ? 'Disponible para selección al programar nuevas órdenes de trabajo.'
                                            : 'Oculto: no aparecerá en el selector de servicios al crear órdenes para ningún equipo.'}
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
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
                        disabled={isLoading || isCodigoDuplicado || !formData.nombre_tipo.trim() || !formData.codigo_tipo.trim()}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        {tipo ? 'Guardar Cambios' : 'Crear Tipo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
