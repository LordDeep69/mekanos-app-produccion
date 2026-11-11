'use client';

import {
  useCatalogoSistemasConUso,
  useCreateCatalogoSistema,
  useDeleteCatalogoSistema,
  useReordenarCatalogoSistemas,
  useUpdateCatalogoSistema,
  type CatalogoSistemaConUso,
  type NivelUso,
} from '@/features/catalogos';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Edit,
  GripVertical,
  Info,
  Layers,
  ListOrdered,
  Loader2,
  Lock,
  Palette,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  generarCodigoSistema,
  verificarCodigoDuplicado,
  useArquetiposEam,
  EamSelect,
  ArquetiposMultiCombobox,
  type ArquetipoEquipo,
} from '@/features/catalogos-eam';

interface SistemaFormData {
  nombre_sistema: string;
  codigo_sistema: string;
  descripcion: string;
  orden_visualizacion: number;
  color_hex: string;
  aplica_a: string[];
  intercalar?: boolean;
}

// Helpers para indicadores de uso
const NIVEL_USO_CONFIG: Record<NivelUso, { label: string; color: string; bgColor: string }> = {
  alto: { label: 'Alto', color: 'text-green-700', bgColor: 'bg-green-100' },
  medio: { label: 'Medio', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  bajo: { label: 'Bajo', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  sin_uso: { label: 'Sin uso', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

export default function SistemasPage() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSistema, setEditingSistema] = useState<CatalogoSistemaConUso | null>(null);

  const { data: response, isLoading, isError, refetch } = useCatalogoSistemasConUso({ limit: 100 });
  const sistemas = useMemo(() => response?.data || [], [response?.data]);
  const { data: arquetipos = [] } = useArquetiposEam();
  const crearSistema = useCreateCatalogoSistema();
  const actualizarSistema = useUpdateCatalogoSistema();
  const eliminarSistema = useDeleteCatalogoSistema();
  const reordenarMutation = useReordenarCatalogoSistemas();

  // Estados para Drag & Drop interactivo
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const scopeKey = `${filtroTipo}::${busqueda}`;
  const [ordenLocalState, setOrdenLocalState] = useState<{
    scopeKey: string;
    items: CatalogoSistemaConUso[];
  } | null>(null);
  const ordenLocal = ordenLocalState?.scopeKey === scopeKey ? ordenLocalState.items : null;

  const isReorderable = filtroTipo !== 'TODOS' && filtroTipo !== 'UNIVERSAL' && !busqueda.trim();

  const handleEdit = (sistema: CatalogoSistemaConUso) => {
    setEditingSistema(sistema);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de desactivar este sistema?')) {
      await eliminarSistema.mutateAsync(id);
    }
  };

  // Pestañas / Filtros de ámbito de equipo
  const tabsArquetipos = useMemo(() => {
    const tabs: Array<{ codigo: string; label: string; count: number }> = [
      { codigo: 'TODOS', label: 'Todos los Sistemas', count: sistemas.length },
    ];

    if (arquetipos && arquetipos.length > 0) {
      arquetipos.forEach((a: ArquetipoEquipo) => {
        const cod = (a.codigo_corto || a.codigo_tipo || '').toUpperCase().trim();
        const nom = a.nombre_canonico || a.nombre_tipo || cod;
        const count = sistemas.filter((s: CatalogoSistemaConUso) => {
          const aplica = Array.isArray(s.aplica_a) ? s.aplica_a : s.aplica_a ? [s.aplica_a] : [];
          return aplica.includes(cod);
        }).length;
        tabs.push({ codigo: cod, label: nom, count });
      });
    }

    const universalCount = sistemas.filter(
      (s: CatalogoSistemaConUso) => !s.aplica_a || s.aplica_a.length === 0,
    ).length;
    if (universalCount > 0) {
      tabs.push({ codigo: 'UNIVERSAL', label: 'Universal (Sin Filtro)', count: universalCount });
    }

    return tabs;
  }, [sistemas, arquetipos]);

  // Opciones para el selector EamSelect de la barra de filtros
  const selectArquetiposOptions = useMemo(() => {
    return tabsArquetipos.map((tab) => ({
      value: tab.codigo,
      label: tab.label,
      badge: `${tab.count} subsistemas`,
    }));
  }, [tabsArquetipos]);

  // Filtrar sistemas por búsqueda y por pestaña de tipo de equipo
  const filteredSistemas = useMemo(() => {
    return sistemas
      .filter((s: CatalogoSistemaConUso) => {
        const nombre = s.nombre_sistema || '';
        const codigo = s.codigo_sistema || '';
        const term = busqueda.toLowerCase().trim();
        const matchesSearch =
          !term || nombre.toLowerCase().includes(term) || codigo.toLowerCase().includes(term);
        if (!matchesSearch) return false;

        if (filtroTipo === 'TODOS') return true;
        if (filtroTipo === 'UNIVERSAL') return !s.aplica_a || s.aplica_a.length === 0;

        const aplica = Array.isArray(s.aplica_a) ? s.aplica_a : s.aplica_a ? [s.aplica_a] : [];
        return aplica.includes(filtroTipo);
      })
      .sort(
        (a: CatalogoSistemaConUso, b: CatalogoSistemaConUso) =>
          (a.orden_visualizacion || 0) - (b.orden_visualizacion || 0),
      );
  }, [sistemas, busqueda, filtroTipo]);

  // Lista mostrada (apoya actualización optimista inmediata durante Drag & Drop)
  const displayedSistemas = useMemo(() => {
    if (ordenLocal && isReorderable) return ordenLocal;
    return filteredSistemas;
  }, [ordenLocal, isReorderable, filteredSistemas]);

  const tabActualLabel = useMemo(() => {
    const found = tabsArquetipos.find((t) => t.codigo === filtroTipo);
    return found ? found.label : 'Equipo Seleccionado';
  }, [tabsArquetipos, filtroTipo]);

  const handleDrop = async (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentItems = [...displayedSistemas];
    const sourceIdx = currentItems.findIndex(
      (s: CatalogoSistemaConUso) => s.id_sistema === draggedId,
    );
    const targetIdx = currentItems.findIndex(
      (s: CatalogoSistemaConUso) => s.id_sistema === targetId,
    );

    if (sourceIdx < 0 || targetIdx < 0) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Mover elemento en el array
    const [moved] = currentItems.splice(sourceIdx, 1);
    currentItems.splice(targetIdx, 0, moved);

    // Reasignar orden_visualizacion consecutivo (1, 2, 3...)
    const reorderedWithNumbers = currentItems.map((item: CatalogoSistemaConUso, idx: number) => ({
      ...item,
      orden_visualizacion: idx + 1,
    }));

    setOrdenLocalState({ scopeKey, items: reorderedWithNumbers });
    setDraggedId(null);
    setDragOverId(null);

    // Persistir en backend
    const payload = reorderedWithNumbers.map((item: CatalogoSistemaConUso, idx: number) => ({
      idSistema: item.id_sistema,
      ordenVisualizacion: idx + 1,
    }));

    try {
      await reordenarMutation.mutateAsync(payload);
    } catch {
      setOrdenLocalState(null);
    }
  };

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
            Define los subsistemas técnicos (Motor, Eléctrico, Cabina, etc.) para los checklists de
            cada activo industrial
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSistema(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo Sistema
        </button>
      </div>

      {/* Barra de Filtros y Control Prémium (Sin scroll horizontal infinito) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Fila 1: Buscador integrado + Selector de Arquetipo EamSelect */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="relative md:col-span-7">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar subsistema por nombre o código (ej: motor, cabina, bomba)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-slate-400 outline-none transition-all font-medium"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-5">
            <EamSelect
              value={filtroTipo}
              onChange={(val) => setFiltroTipo(val)}
              options={selectArquetiposOptions}
              placeholder="Filtrar por arquetipo de equipo..."
              searchable
            />
          </div>
        </div>

        {/* Fila 2: Chips Rápidos Responsivos con flex-wrap */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Acceso Rápido:
          </span>
          {tabsArquetipos.map((tab) => {
            const isSelected = filtroTipo === tab.codigo;
            const labelCorto = tab.label.includes('/') ? tab.label.split('/')[0].trim() : tab.label;
            return (
              <button
                key={tab.codigo}
                type="button"
                onClick={() => setFiltroTipo(tab.codigo)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs',
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300',
                )}
              >
                <span>{labelCorto}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold',
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-700',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner contextual de Drag & Drop */}
      <div className="space-y-3">
        {isReorderable ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-blue-900 flex items-center gap-1.5">
                  Modo Drag & Drop Activo: Secuencia de {tabActualLabel}
                </p>
                <p className="text-[11px] text-blue-700/90 mt-0.5">
                  Arrastra las filas desde el tirador <strong>(⋮⋮)</strong> para redefinir la ruta
                  de inspección en campo. La numeración se auto-actualiza y persiste al instante.
                </p>
              </div>
            </div>
            {reordenarMutation.isPending && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 font-bold shadow-xs shrink-0 self-start sm:self-auto">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span>Guardando orden...</span>
              </div>
            )}
          </div>
        ) : filtroTipo === 'TODOS' ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
            <Info className="h-4 w-4 text-gray-400 shrink-0" />
            <span>
              💡 Para activar el reordenamiento por arrastrar y soltar (Drag & Drop), selecciona la
              pestaña de un equipo específico (ej: <strong>Ascensor de Pasajeros</strong> o{' '}
              <strong>Compresor</strong>).
            </span>
          </div>
        ) : null}
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
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : displayedSistemas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No se encontraron sistemas para esta vista</p>
            <p className="text-xs text-gray-400 mt-1">
              Haz clic en &quot;Nuevo Sistema&quot; para crear el primer subsistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {isReorderable && (
                    <th
                      className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10 text-center"
                      title="Arrastrar y soltar"
                    >
                      <GripVertical className="h-4 w-4 mx-auto text-gray-400" />
                    </th>
                  )}
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">
                    Orden
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sistema
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Actividades
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aplica a
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedSistemas.map((sistema: CatalogoSistemaConUso, idx: number) => {
                  const isBeingDragged = draggedId === sistema.id_sistema;
                  const isDragOver = dragOverId === sistema.id_sistema && !isBeingDragged;

                  return (
                    <tr
                      key={sistema.id_sistema ?? `sistema-${idx}`}
                      draggable={isReorderable}
                      onDragStart={(e) => {
                        if (!isReorderable) return;
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedId(sistema.id_sistema);
                      }}
                      onDragOver={(e) => {
                        if (!isReorderable) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverId !== sistema.id_sistema) {
                          setDragOverId(sistema.id_sistema);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverId === sistema.id_sistema) {
                          setDragOverId(null);
                        }
                      }}
                      onDrop={(e) => {
                        if (!isReorderable) return;
                        e.preventDefault();
                        handleDrop(sistema.id_sistema);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      className={cn(
                        'transition-all group',
                        isReorderable ? 'cursor-grab active:cursor-grabbing select-none' : '',
                        isBeingDragged
                          ? 'opacity-25 bg-blue-100/60 scale-[0.99]'
                          : 'hover:bg-blue-50/30',
                        isDragOver ? 'border-t-2 border-blue-600 bg-blue-50/40' : '',
                      )}
                    >
                      {isReorderable && (
                        <td className="px-3 py-4 text-center">
                          <div className="p-1 rounded text-gray-300 group-hover:text-blue-600 transition-colors inline-flex items-center justify-center">
                            <GripVertical className="h-4 w-4" />
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'text-sm font-bold px-2 py-1 rounded-md font-mono transition-colors',
                            isDragOver
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-gray-600 bg-gray-100',
                          )}
                        >
                          #{sistema.orden_visualizacion}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                            style={{ backgroundColor: sistema.color_hex || '#3b82f6' }}
                          >
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                              {sistema.nombre_sistema}
                            </p>
                            <p className="text-xs font-mono text-gray-400">
                              {sistema.codigo_sistema}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span className="text-lg font-bold text-gray-800">
                              {sistema.total_actividades ?? 0}
                            </span>
                          </div>
                          {sistema.nivel_uso &&
                            (() => {
                              const nivel = sistema.nivel_uso as NivelUso;
                              const config = NIVEL_USO_CONFIG[nivel];
                              return (
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                                    config?.bgColor || 'bg-gray-100',
                                    config?.color || 'text-gray-500',
                                  )}
                                >
                                  {config?.label || 'N/A'}
                                </span>
                              );
                            })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 items-center">
                          {Array.isArray(sistema.aplica_a) && sistema.aplica_a.length > 0 ? (
                            sistema.aplica_a.map((codigo: string) => (
                              <span
                                key={codigo}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
                              >
                                {codigo}
                              </span>
                            ))
                          ) : sistema.aplica_a && typeof sistema.aplica_a === 'string' ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                              {sistema.aplica_a}
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
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sistema.id_sistema)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
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

      {/* Modal */}
      {isModalOpen && (
        <SistemaModal
          onClose={() => setIsModalOpen(false)}
          sistema={editingSistema}
          sistemas={sistemas}
          arquetipos={arquetipos}
          initialAplicaA={filtroTipo !== 'TODOS' && filtroTipo !== 'UNIVERSAL' ? [filtroTipo] : []}
          onSubmit={async (formData: SistemaFormData) => {
            const dto = {
              codigoSistema: formData.codigo_sistema,
              nombreSistema: formData.nombre_sistema,
              descripcion: formData.descripcion,
              aplicaA: formData.aplica_a,
              ordenVisualizacion: Number(formData.orden_visualizacion),
              colorHex: formData.color_hex,
              intercalar: Boolean(formData.intercalar),
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

const COLOR_PRESETS = [
  { label: 'Azul', hex: '#3b82f6' },
  { label: 'Cian', hex: '#06b6d4' },
  { label: 'Esmeralda', hex: '#10b981' },
  { label: 'Ámbar', hex: '#f59e0b' },
  { label: 'Rosa', hex: '#f43f5e' },
  { label: 'Púrpura', hex: '#8b5cf6' },
  { label: 'Índigo', hex: '#6366f1' },
  { label: 'Pizarra', hex: '#64748b' },
];

interface SistemaModalProps {
  onClose: () => void;
  sistema?: CatalogoSistemaConUso | null;
  sistemas: CatalogoSistemaConUso[];
  arquetipos: ArquetipoEquipo[];
  initialAplicaA?: string[];
  onSubmit: (formData: SistemaFormData) => Promise<void>;
  isLoading: boolean;
}

function SistemaModal({
  onClose,
  sistema,
  sistemas = [],
  arquetipos = [],
  initialAplicaA = [],
  onSubmit,
  isLoading,
}: SistemaModalProps) {
  const codigosExistentes = useMemo(() => {
    return new Set<string>(
      (sistemas || [])
        .filter((s: CatalogoSistemaConUso) => !sistema || s.id_sistema !== sistema.id_sistema)
        .map((s: CatalogoSistemaConUso) => (s.codigo_sistema || '').toUpperCase().trim())
        .filter(Boolean),
    );
  }, [sistemas, sistema]);

  // Opciones formateadas de arquetipos técnicos
  const opcionesTipos = useMemo(() => {
    if (arquetipos && arquetipos.length > 0) {
      return arquetipos.map((a: ArquetipoEquipo) => ({
        codigo: (a.codigo_corto || a.codigo_tipo || '').toUpperCase().trim(),
        nombre: a.nombre_canonico || a.nombre_tipo || '',
        label: `${a.nombre_canonico || a.nombre_tipo} (${(a.codigo_corto || a.codigo_tipo || '').toUpperCase().trim()})`,
      }));
    }
    return [
      { codigo: 'GENERADOR', nombre: 'Generador Eléctrico', label: '⚡ Generador / Planta (GEN)' },
      { codigo: 'BOMBA', nombre: 'Bomba Hidráulica', label: '💧 Bomba / Motobomba (BOM)' },
      { codigo: 'COMPRESOR', nombre: 'Compresor de Aire', label: '💨 Compresor de Aire (COMP)' },
      { codigo: 'MOTOR', nombre: 'Motor Industrial', label: '⚙️ Motor Independiente (MOT)' },
      { codigo: 'HVAC', nombre: 'Aire Acondicionado', label: '❄️ Climatización / HVAC' },
      { codigo: 'ELEV', nombre: 'Ascensor de Pasajeros', label: '🛗 Ascensor de Pasajeros (ELEV)' },
    ];
  }, [arquetipos]);

  const [isAutoCodigo, setIsAutoCodigo] = useState(!sistema);
  const [isManualOrden, setIsManualOrden] = useState(Boolean(sistema));
  const [desplazarSiguientes, setDesplazarSiguientes] = useState(false);

  const [formData, setFormData] = useState<{
    nombre_sistema: string;
    codigo_sistema: string;
    descripcion: string;
    orden_visualizacion: number | string;
    color_hex: string;
    aplica_a: string[];
  }>({
    nombre_sistema: sistema?.nombre_sistema || '',
    codigo_sistema: sistema?.codigo_sistema || '',
    descripcion: sistema?.descripcion || '',
    orden_visualizacion: sistema?.orden_visualizacion ? Number(sistema.orden_visualizacion) : 1,
    color_hex: sistema?.color_hex || '#3b82f6',
    aplica_a: sistema?.aplica_a
      ? Array.isArray(sistema.aplica_a)
        ? sistema.aplica_a
        : [sistema.aplica_a]
      : initialAplicaA && initialAplicaA.length > 0
        ? initialAplicaA
        : [],
  });

  const [isMultiEquipoMode, setIsMultiEquipoMode] = useState<boolean>(() => {
    const initial = sistema?.aplica_a
      ? Array.isArray(sistema.aplica_a)
        ? sistema.aplica_a
        : [sistema.aplica_a]
      : initialAplicaA && initialAplicaA.length > 0
        ? initialAplicaA
        : [];
    return initial.length > 1;
  });

  // Opciones para el selector individual EamSelect
  const arquetiposSelectOptions = useMemo(() => {
    return [
      {
        value: 'UNIVERSAL',
        label: '🌐 Universal (Aplica a Todos los Equipos)',
        badge: 'Global',
        description: 'Checklist disponible para cualquier tipo de activo industrial',
      },
      ...opcionesTipos.map((opt) => ({
        value: opt.codigo,
        label: opt.label || `${opt.nombre} (${opt.codigo})`,
        badge: opt.codigo,
        description: `Exclusivo para la familia técnica de ${opt.nombre}`,
      })),
    ];
  }, [opcionesTipos]);

  const currentSingleAplicaA = useMemo(() => {
    if (!formData.aplica_a || formData.aplica_a.length === 0) return 'UNIVERSAL';
    return formData.aplica_a[0] || 'UNIVERSAL';
  }, [formData.aplica_a]);

  const handleSingleArquetipoChange = (val: string) => {
    if (val === 'UNIVERSAL' || !val) {
      setFormData((prev) => ({ ...prev, aplica_a: [] }));
    } else {
      setFormData((prev) => ({ ...prev, aplica_a: [val] }));
    }
    setIsManualOrden(false);
    setDesplazarSiguientes(false);
  };

  // 1. Derivar de forma 100% reactiva los sistemas que aplican a este ámbito técnico
  const sistemasDelTipo = useMemo(() => {
    const codigosSeleccionados = Array.isArray(formData.aplica_a) ? formData.aplica_a : [];
    if (codigosSeleccionados.length === 0) {
      // Modo Universal: sistemas que no tienen restricción de tipo
      return (sistemas || [])
        .filter((s: CatalogoSistemaConUso) => !s.aplica_a || s.aplica_a.length === 0)
        .sort(
          (a: CatalogoSistemaConUso, b: CatalogoSistemaConUso) =>
            (a.orden_visualizacion || 0) - (b.orden_visualizacion || 0),
        );
    }

    return (sistemas || [])
      .filter((s: CatalogoSistemaConUso) => {
        const aplica = Array.isArray(s.aplica_a) ? s.aplica_a : s.aplica_a ? [s.aplica_a] : [];
        return aplica.some((cod: string) => codigosSeleccionados.includes(cod));
      })
      .sort(
        (a: CatalogoSistemaConUso, b: CatalogoSistemaConUso) =>
          (a.orden_visualizacion || 0) - (b.orden_visualizacion || 0),
      );
  }, [sistemas, formData.aplica_a]);

  // 2. Calcular el siguiente orden sugerido dentro del ámbito del equipo (no global)
  const siguienteOrdenSugerido = useMemo(() => {
    if (!sistemasDelTipo || sistemasDelTipo.length === 0) return 1;
    const maxOrden = Math.max(
      0,
      ...sistemasDelTipo.map((s: CatalogoSistemaConUso) => Number(s.orden_visualizacion) || 0),
    );
    return maxOrden + 1;
  }, [sistemasDelTipo]);

  // 3. Resolver orden_visualizacion reactivamente sin setState-in-effect
  const effectiveOrdenVisualizacion =
    isManualOrden || sistema ? formData.orden_visualizacion : siguienteOrdenSugerido;

  // 4. Nombre descriptivo del ámbito actual seleccionado
  const nombreAmbitoSeleccionado = useMemo(() => {
    if (!formData.aplica_a || formData.aplica_a.length === 0) {
      return 'Universal (Cualquier Equipo)';
    }
    return formData.aplica_a
      .map((cod: string) => {
        const found = opcionesTipos.find((opt) => opt.codigo === cod);
        return found ? found.nombre || found.label : cod;
      })
      .join(', ');
  }, [formData.aplica_a, opcionesTipos]);

  // 5. Detectar colisión de orden únicamente dentro de los subsistemas del mismo equipo
  const sistemaEnConflicto = useMemo(() => {
    const ordenNum = Number(effectiveOrdenVisualizacion);
    if (!ordenNum || ordenNum <= 0) return null;
    return sistemasDelTipo.find(
      (s: CatalogoSistemaConUso) =>
        Number(s.orden_visualizacion) === ordenNum &&
        (!sistema || s.id_sistema !== sistema.id_sistema),
    );
  }, [effectiveOrdenVisualizacion, sistemasDelTipo, sistema]);

  const isCodigoDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      formData.codigo_sistema,
      codigosExistentes,
      sistema?.codigo_sistema,
    );
  }, [formData.codigo_sistema, codigosExistentes, sistema]);

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNombre = e.target.value;
    const auto =
      isAutoCodigo && !sistema
        ? generarCodigoSistema(newNombre, codigosExistentes)
        : formData.codigo_sistema;
    setFormData({
      ...formData,
      nombre_sistema: newNombre,
      codigo_sistema: auto,
    });
  };

  const handleToggleAutoCodigo = () => {
    const nuevoModo = !isAutoCodigo;
    setIsAutoCodigo(nuevoModo);
    if (nuevoModo) {
      const auto = generarCodigoSistema(formData.nombre_sistema, codigosExistentes);
      setFormData((prev) => ({ ...prev, codigo_sistema: auto }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodigoDuplicado) return;
    const finalCode =
      formData.codigo_sistema.trim() ||
      generarCodigoSistema(formData.nombre_sistema, codigosExistentes);
    onSubmit({
      ...formData,
      codigo_sistema: finalCode.toUpperCase().trim(),
      orden_visualizacion: Number(effectiveOrdenVisualizacion),
      intercalar: Boolean(desplazarSiguientes && sistemaEnConflicto),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 px-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              {sistema ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {sistema ? 'Editar Subsistema del Equipo' : 'Nuevo Subsistema del Equipo'}
              </h2>
              <p className="text-xs text-gray-500">
                {sistema
                  ? 'Modifica los parámetros y orden de inspección'
                  : 'Define el tipo de equipo, alcance y posición en el checklist'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario con Scroll Cómodo */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]"
        >
          {/* PASO 1: Ámbito del Tipo de Equipo (Contexto Reyna) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                ¿A qué Tipo de Equipo aplica este subsistema? *
              </label>
              <button
                type="button"
                onClick={() => setIsMultiEquipoMode(!isMultiEquipoMode)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                {isMultiEquipoMode
                  ? '⚡ Modo Selección Directa'
                  : '🔀 Aplicar a múltiples tipos...'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {isMultiEquipoMode
                ? 'Selecciona los múltiples tipos de equipo a los que aplica este subsistema técnico.'
                : 'Busca y selecciona el tipo de equipo industrial (con autocompletado y buscador) o déjalo en Universal.'}
            </p>
            {isMultiEquipoMode ? (
              <ArquetiposMultiCombobox
                value={formData.aplica_a}
                onChange={(newAplicaA) => {
                  setFormData((prev) => ({ ...prev, aplica_a: newAplicaA }));
                  setIsManualOrden(false);
                  setDesplazarSiguientes(false);
                }}
                options={opcionesTipos}
                placeholder="Buscar o seleccionar tipo de activo industrial..."
              />
            ) : (
              <EamSelect
                value={currentSingleAplicaA}
                onChange={handleSingleArquetipoChange}
                options={arquetiposSelectOptions}
                placeholder="Seleccionar tipo de equipo o Universal..."
                searchable
              />
            )}
          </div>

          {/* VISUALIZADOR DE SECUENCIA ACTUAL DE INSPECCIÓN */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-800">
                  Secuencia de Inspección:{' '}
                  <span className="text-blue-700 font-extrabold">{nombreAmbitoSeleccionado}</span>
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                {sistemasDelTipo.length} subsistema(s) registrados
              </span>
            </div>

            {sistemasDelTipo.length === 0 ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50/90 border border-blue-200 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm">
                  #1
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    ¡Este será el primer subsistema para {nombreAmbitoSeleccionado}!
                  </p>
                  <p className="text-[11px] text-blue-800/80 mt-0.5">
                    Se sugiere automáticamente la posición <strong>Orden #1</strong> para liderar la
                    ficha técnica y checklists en campo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-500">
                  Haz clic en cualquier posición para seleccionarla o intercalar tu nuevo
                  subsistema:
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar">
                  {sistemasDelTipo.map((sis: CatalogoSistemaConUso) => {
                    const isSelectedSlot =
                      Number(effectiveOrdenVisualizacion) === Number(sis.orden_visualizacion);
                    return (
                      <button
                        key={sis.id_sistema}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            orden_visualizacion: sis.orden_visualizacion,
                          }));
                          setIsManualOrden(true);
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs shrink-0 transition-all text-left cursor-pointer',
                          isSelectedSlot
                            ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-300 font-bold shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 font-medium',
                        )}
                        title={`Orden ${sis.orden_visualizacion}: ${sis.nombre_sistema}`}
                      >
                        <span
                          className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold',
                            isSelectedSlot
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-gray-100 text-gray-600',
                          )}
                        >
                          #{sis.orden_visualizacion}
                        </span>
                        <span className="truncate max-w-[110px]">{sis.nombre_sistema}</span>
                      </button>
                    );
                  })}
                  <div className="text-gray-300 font-bold px-0.5">➔</div>
                  {/* Preview slot sugerido */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        orden_visualizacion: siguienteOrdenSugerido,
                      }));
                      setIsManualOrden(false);
                      setDesplazarSiguientes(false);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-dashed text-xs shrink-0 transition-all cursor-pointer',
                      Number(effectiveOrdenVisualizacion) === siguienteOrdenSugerido
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300 font-bold shadow-xs'
                        : 'border-emerald-300 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50 font-medium',
                    )}
                    title="Posicionar al final de la secuencia"
                  >
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono font-bold shadow-xs">
                      #{effectiveOrdenVisualizacion || siguienteOrdenSugerido}
                    </span>
                    <span className="truncate max-w-[120px] font-bold">
                      {formData.nombre_sistema.trim() || '+ Nuevo Subsistema'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: Identificación Técnica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                Nombre del Subsistema *
              </label>
              <input
                required
                type="text"
                value={formData.nombre_sistema}
                onChange={handleNombreChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                placeholder="Ej: Cabina, Puertas y Operador"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                  Código Único *
                </label>
                {!sistema && (
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
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.codigo_sistema}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      codigo_sistema: e.target.value.toUpperCase().trim(),
                    })
                  }
                  className={cn(
                    'w-full pl-3.5 pr-14 py-2.5 border rounded-xl outline-none text-xs font-mono font-bold tracking-tight uppercase transition-colors',
                    isAutoCodigo
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500',
                    isCodigoDuplicado
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                      : '',
                  )}
                  placeholder="SIS_CABINA_PUERTAS"
                  disabled={Boolean(sistema)}
                  readOnly={Boolean(sistema) || isAutoCodigo}
                />
                {isAutoCodigo && !sistema && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ Auto
                  </span>
                )}
              </div>
              {isCodigoDuplicado ? (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  ✕ Código en uso. Modifícalo.
                </p>
              ) : formData.codigo_sistema && !sistema ? (
                <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Código único disponible</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* PASO 3: Prioridad de Inspección y Color UI */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                    3
                  </span>
                  Orden Visual *
                </span>
                <span className="text-[11px] text-gray-400 font-normal lowercase">
                  Posición en checklist
                </span>
              </label>
              <input
                type="number"
                min="1"
                value={effectiveOrdenVisualizacion}
                onChange={(e) => {
                  setFormData({ ...formData, orden_visualizacion: e.target.value });
                  setIsManualOrden(true);
                }}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-bold"
                placeholder="Ej: 1"
              />

              {/* Feedback reactivo con opciones premium */}
              {!effectiveOrdenVisualizacion || Number(effectiveOrdenVisualizacion) <= 0 ? (
                <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                  ✕ El orden debe ser un número entero mayor a 0.
                </p>
              ) : sistemaEnConflicto ? (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <div className="flex items-start gap-1.5">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-tight">
                      La posición <strong>#{effectiveOrdenVisualizacion}</strong> ya está ocupada
                      por <strong>&quot;{sistemaEnConflicto.nombre_sistema}&quot;</strong>.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          orden_visualizacion: siguienteOrdenSugerido,
                        }));
                        setIsManualOrden(false);
                        setDesplazarSiguientes(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>⚡ Usar libre (#{siguienteOrdenSugerido})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesplazarSiguientes(!desplazarSiguientes)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 border',
                        desplazarSiguientes
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <span>
                        {desplazarSiguientes
                          ? '✓ Intercalando (desplazará los siguientes +1)'
                          : '🔀 Intercalar aquí (desplazar +1)'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Posición disponible ({effectiveOrdenVisualizacion}°) en{' '}
                    {nombreAmbitoSeleccionado}
                  </span>
                </p>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-1.5">
                <Palette className="h-4 w-4 text-blue-600" />
                Color UI
              </label>
              <div className="flex items-center gap-2 p-1.5 border border-gray-200 rounded-xl bg-gray-50/50">
                <input
                  type="color"
                  value={formData.color_hex}
                  onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                  className="w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-gray-700">
                  {formData.color_hex}
                </span>
                <div
                  className="w-6 h-6 rounded-md ml-auto border border-black/10 shadow-xs"
                  style={{ backgroundColor: formData.color_hex }}
                />
              </div>
              {/* Paleta rápida de colores */}
              <div className="flex items-center gap-1.5 mt-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color_hex: p.hex })}
                    className={cn(
                      'w-5 h-5 rounded-full border transition-transform cursor-pointer',
                      formData.color_hex === p.hex
                        ? 'scale-125 ring-2 ring-offset-1 ring-blue-500 border-white'
                        : 'border-black/10 hover:scale-110',
                    )}
                    style={{ backgroundColor: p.hex }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Descripción Opcional */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">
              Descripción (Opcional)
            </label>
            <textarea
              rows={2}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
              placeholder="Breve descripción de los componentes o rutinas que abarca..."
            />
          </div>
        </form>

        {/* Footer del Modal */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all text-sm cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              isCodigoDuplicado ||
              !formData.nombre_sistema.trim() ||
              !formData.codigo_sistema.trim()
            }
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {sistema ? 'Guardar Cambios' : 'Crear Sistema'}
          </button>
        </div>
      </div>
    </div>
  );
}
