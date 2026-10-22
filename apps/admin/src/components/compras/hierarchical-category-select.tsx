'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Selector Jerárquico de Categorías Taxonómicas Enterprise (HierarchicalCategorySelect)
 * 
 * Arquitectura de Navegación Progresiva (Miller Columns Dinámicas de N-Niveles):
 * - Soporta profundidad arbitraria N (Nivel 1 ➔ Nivel 2 ➔ Nivel 3 ➔ Nivel 4+).
 * - Selección inmediata en el primer clic: la selección queda registrada y validada al instante.
 * - Columnas puramente dinámicas: no renderiza columnas vacías ni selectores estáticos ficticios.
 * - Buscador global directo con sugerencias de ruta completa.
 * - Tarjeta ejecutiva de resumen colapsable con migas de pan interactivas.
 * - Alta in-context de familias y subfamilias con padre preseleccionado.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  FolderPlus,
  FolderTree,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
  Layers,
  Filter,
  Droplets,
  Zap,
  Thermometer,
  ShieldCheck,
  Cog,
  Hammer,
  HardHat,
  Boxes,
  Tag,
  ArrowRight,
  CornerDownRight,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { CategoriaNodo, CreateCategoriaPayload } from '@/types/compras.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface HierarchicalCategorySelectProps {
  value?: number | null;
  onChange: (value: number | null, categoria?: CategoriaNodo | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  showClearButton?: boolean;
  variant?: 'combobox' | 'cascading';
}

interface FlatCategoryItem extends CategoriaNodo {
  hasChildren: boolean;
  indent: number;
}

function getChildren(node: CategoriaNodo): CategoriaNodo[] {
  return node.subcategorias || (node as any).hijos || [];
}

function flattenTree(nodes: CategoriaNodo[], indent = 0): FlatCategoryItem[] {
  const result: FlatCategoryItem[] = [];
  for (const node of nodes) {
    const children = getChildren(node);
    const hasChildren = Array.isArray(children) && children.length > 0;
    result.push({
      ...node,
      indent,
      hasChildren,
      subcategorias: children,
    });
    if (hasChildren) {
      result.push(...flattenTree(children, indent + 1));
    }
  }
  return result;
}

// Iconografía contextual para familias principales
function getCategoryIcon(nombre: string, nivel: number) {
  const n = (nombre || '').toLowerCase();
  if (nivel === 1) {
    if (n.includes('filtro')) return Filter;
    if (n.includes('lubricante') || n.includes('fluido') || n.includes('aceite')) return Droplets;
    if (n.includes('eléctrico') || n.includes('batería')) return Zap;
    if (n.includes('refrigeración') || n.includes('correa')) return Thermometer;
    if (n.includes('sellado') || n.includes('estanqueidad')) return ShieldCheck;
    if (n.includes('mecánica') || n.includes('rodamiento')) return Cog;
    if (n.includes('herramienta')) return Hammer;
    if (n.includes('dotación') || n.includes('seguridad') || n.includes('epp')) return HardHat;
    if (n.includes('consumible')) return Boxes;
    return Layers;
  }
  return Tag;
}

export function HierarchicalCategorySelect({
  value,
  onChange,
  placeholder = 'Seleccionar clasificación taxonómica...',
  disabled = false,
  className,
  id,
  showClearButton = true,
  variant = 'cascading',
}: HierarchicalCategorySelectProps) {
  const [arbol, setArbol] = useState<CategoriaNodo[]>([]);
  const [selectedCat, setSelectedCat] = useState<CategoriaNodo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ruta activa de navegación: [idL1, idL2, idL3, idL4, ...]
  const [selectedPath, setSelectedPath] = useState<number[]>([]);

  // Estados de visualización
  const [isExploradorAbierto, setIsExploradorAbierto] = useState(true);
  const [searchGlobal, setSearchGlobal] = useState('');
  const [mostrarResultadosBusqueda, setMostrarResultadosBusqueda] = useState(false);

  // Estados de modo 'combobox' (para barras de filtros compactas)
  const [isOpenCombobox, setIsOpenCombobox] = useState(false);
  const [searchCombobox, setSearchCombobox] = useState('');

  // Modal in-context de creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPadreId, setModalPadreId] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<CreateCategoriaPayload>({
    nombre: '',
    codigo_categoria: '',
    id_padre: null,
    descripcion: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar árbol jerárquico desde el backend
  const cargarArbol = async () => {
    try {
      setIsLoading(true);
      const data = await comprasService.getCategoriasArbol();
      setArbol(data);
      return data;
    } catch (e) {
      console.error('Error cargando árbol de categorías:', e);
      toast.error('No se pudo cargar el árbol de categorías taxonómicas');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarArbol();
  }, []);

  // Lista aplanada para indexación rápida
  const flatList = useMemo(() => {
    return flattenTree(arbol);
  }, [arbol]);

  const mapPorId = useMemo(() => {
    const map = new Map<number, CategoriaNodo>();
    for (const item of flatList) {
      map.set(item.id_categoria, item);
    }
    return map;
  }, [flatList]);

  // 2. Sincronizar selección y reconstruir la ruta de ancestros [L1, L2, ..., Ln]
  useEffect(() => {
    if (value && mapPorId.has(value)) {
      const encontrada = mapPorId.get(value)!;
      setSelectedCat(encontrada);

      // Reconstruir la ruta ascendente recursivamente
      const path: number[] = [];
      let curr: CategoriaNodo | undefined = encontrada;
      while (curr) {
        path.unshift(curr.id_categoria);
        curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
      }
      setSelectedPath(path);
      // Si ya hay valor preseleccionado, colapsar el explorador para mantener la UI limpia
      setIsExploradorAbierto(false);
    } else if (!value) {
      setSelectedCat(null);
      setSelectedPath([]);
      setIsExploradorAbierto(true);
    }
  }, [value, mapPorId]);

  // Cierre por click fuera en modo combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpenCombobox(false);
        setMostrarResultadosBusqueda(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 3. Generación puramente dinámica de las columnas de N-Niveles (Miller Columns)
  // Cada columna depende estrictamente de que la anterior tenga hijos
  const columnasDinamicas = useMemo(() => {
    const cols: Array<{
      level: number;
      titulo: string;
      parentId: number | null;
      items: CategoriaNodo[];
      selectedId: number | null;
    }> = [];

    // Columna 1: Siempre las categorías Raíz (Nivel 1)
    cols.push({
      level: 1,
      titulo: 'Familia Principal',
      parentId: null,
      items: arbol,
      selectedId: selectedPath[0] || null,
    });

    // Columnas subsecuentes: generadas reactivamente por cada nodo con hijos en selectedPath
    for (let i = 0; i < selectedPath.length; i++) {
      const parentId = selectedPath[i];
      const parentNode = mapPorId.get(parentId);
      if (parentNode) {
        const hijos = getChildren(parentNode);
        if (hijos && hijos.length > 0) {
          const nextLevel = parentNode.nivel + 1;
          cols.push({
            level: nextLevel,
            titulo:
              nextLevel === 2
                ? 'Subcategoría / Sistema'
                : nextLevel === 3
                ? 'Sub-hija / Detalle'
                : `Nivel ${nextLevel}`,
            parentId: parentId,
            items: hijos,
            selectedId: selectedPath[i + 1] || null,
          });
        }
      }
    }

    return cols;
  }, [arbol, selectedPath, mapPorId]);

  // 4. Manejador de selección con DETECCIÓN INMEDIATA en el primer clic
  const handleItemClick = (cat: CategoriaNodo, columnIndex: number) => {
    // Truncar la ruta hasta este nivel y colocar la nueva categoría seleccionada
    const newPath = selectedPath.slice(0, columnIndex);
    newPath.push(cat.id_categoria);
    setSelectedPath(newPath);

    // LLAMADA INMEDIATA AL ONCHANGE: Detecta y valida a la primera
    setSelectedCat(cat);
    onChange(cat.id_categoria, cat);
  };

  // 5. Manejo del Buscador Global Directo
  const resultadosBusqueda = useMemo(() => {
    const q = searchGlobal.toLowerCase().trim();
    if (!q) return [];
    return flatList
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.ruta_jerarquica && c.ruta_jerarquica.toLowerCase().includes(q)) ||
          (c.codigo_categoria && c.codigo_categoria.toLowerCase().includes(q))
      )
      .slice(0, 8); // Top 8 resultados más relevantes
  }, [flatList, searchGlobal]);

  const handleSelectBusquedaDirecta = (cat: CategoriaNodo) => {
    // Reconstruir la ruta completa
    const path: number[] = [];
    let curr: CategoriaNodo | undefined = cat;
    while (curr) {
      path.unshift(curr.id_categoria);
      curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
    }
    setSelectedPath(path);
    setSelectedCat(cat);
    onChange(cat.id_categoria, cat);
    setSearchGlobal('');
    setMostrarResultadosBusqueda(false);
    setIsExploradorAbierto(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCat(null);
    setSelectedPath([]);
    onChange(null, null);
    setSearchGlobal('');
    setIsExploradorAbierto(true);
  };

  // 6. Modal de creación in-context
  const handleOpenCreateModal = (padreId: number | null = null) => {
    setModalPadreId(padreId);
    setModalForm({
      nombre: '',
      codigo_categoria: '',
      id_padre: padreId,
      descripcion: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    let codigo = modalForm.codigo_categoria?.trim();
    if (!codigo) {
      codigo = modalForm.nombre
        .trim()
        .slice(0, 10)
        .toUpperCase()
        .replace(/\s+/g, '_');
    }

    setIsCreating(true);
    try {
      const nueva = await comprasService.createCategoria({
        nombre: modalForm.nombre.trim().toUpperCase(),
        codigo_categoria: codigo,
        id_padre: modalPadreId || null,
        descripcion: modalForm.descripcion?.trim() || undefined,
      });

      toast.success(`Categoría "${nueva.nombre}" creada con éxito`, {
        description: `Ruta: ${nueva.ruta_jerarquica || nueva.nombre}`,
      });

      // Recargar árbol y auto-seleccionar
      const nuevoArbol = await comprasService.getCategoriasArbol();
      setArbol(nuevoArbol);

      // Reconstruir camino
      const path: number[] = [];
      let curr: CategoriaNodo | undefined = nueva;
      while (curr) {
        path.unshift(curr.id_categoria);
        curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
      }
      setSelectedPath(path);
      setSelectedCat(nueva);
      onChange(nueva.id_categoria, nueva);
      setIsModalOpen(false);
      setIsExploradorAbierto(false);
    } catch (error: any) {
      console.error('Error creando categoría:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al registrar categoría';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Reconstrucción de la ruta visual de migas de pan (Breadcrumbs)
  const rutaBreadcrumbs = useMemo(() => {
    return selectedPath
      .map((id) => mapPorId.get(id))
      .filter((c): c is CategoriaNodo => !!c);
  }, [selectedPath, mapPorId]);

  // ============================================================================
  // RENDER MODO 1: CASCADA MULTINIVEL ENTERPRISE (variant === 'cascading')
  // ============================================================================
  if (variant === 'cascading') {
    return (
      <div ref={containerRef} className={cn('space-y-3 w-full', className)}>
        {/* TARJETA DE RESUMEN EJECUTIVO (SIEMPRE VISIBLE CUANDO HAY SELECCIÓN) */}
        {selectedCat && (
          <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 p-3.5 shadow-xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Información y Migas de Pan */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                    {React.createElement(getCategoryIcon(selectedCat.nombre, selectedCat.nivel), {
                      className: 'h-3.5 w-3.5',
                    })}
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Taxonomía Asignada
                  </span>
                  <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 text-[10px] font-bold">
                    Nivel {selectedCat.nivel}
                  </Badge>
                  {selectedCat.codigo_categoria && (
                    <Badge variant="outline" className="bg-white text-gray-500 border-gray-200 text-[10px] font-mono">
                      {selectedCat.codigo_categoria}
                    </Badge>
                  )}
                </div>

                {/* Migas de pan visuales con flechas */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {rutaBreadcrumbs.map((node, idx) => {
                    const isLast = idx === rutaBreadcrumbs.length - 1;
                    return (
                      <React.Fragment key={node.id_categoria}>
                        <span
                          className={cn(
                            'font-semibold px-2 py-0.5 rounded-md transition-colors',
                            isLast
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                          )}
                        >
                          {node.nombre}
                        </span>
                        {!isLast && <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExploradorAbierto(!isExploradorAbierto)}
                  className="h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-100/60"
                >
                  {isExploradorAbierto ? 'Ocultar Navegador' : 'Explorar / Cambiar'}
                </Button>
                {showClearButton && !disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Quitar clasificación"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NAVEGADOR MULTINIVEL DE COLUMNAS (EXPANDIBLE / WORKBENCH) */}
        {isExploradorAbierto && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 shadow-xs space-y-3 animate-in fade-in-0 duration-200">
            {/* Cabecera con Buscador Global Directo y Botón Nueva Raíz */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Buscador predictivo global */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchGlobal}
                  onChange={(e) => {
                    setSearchGlobal(e.target.value);
                    setMostrarResultadosBusqueda(true);
                  }}
                  onFocus={() => {
                    if (searchGlobal.trim()) setMostrarResultadosBusqueda(true);
                  }}
                  placeholder="🔍 Buscar categoría por nombre o ruta (ej: Aceite, Batería, Filtro Aire)..."
                  className="pl-9 pr-8 h-9 text-xs bg-white border-gray-300 focus:border-blue-500 shadow-xs"
                />
                {searchGlobal && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchGlobal('');
                      setMostrarResultadosBusqueda(false);
                    }}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Dropdown de resultados de búsqueda rápida */}
                {mostrarResultadosBusqueda && resultadosBusqueda.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      Coincidencias encontradas ({resultadosBusqueda.length})
                    </div>
                    {resultadosBusqueda.map((res) => (
                      <button
                        key={res.id_categoria}
                        type="button"
                        onClick={() => handleSelectBusquedaDirecta(res)}
                        className="w-full text-left p-2 rounded-lg hover:bg-blue-50/80 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-semibold text-xs text-gray-900 group-hover:text-blue-900">
                            {res.nombre}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 truncate">
                            {res.ruta_jerarquica || res.nombre}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-mono bg-gray-50 border-gray-200 group-hover:bg-blue-100 group-hover:border-blue-300"
                        >
                          Nivel {res.nivel}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones de Cabecera */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCreateModal(null)}
                  className="h-9 text-xs font-semibold text-blue-700 bg-white border-gray-300 hover:bg-blue-50 shadow-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Nueva Familia Raíz
                </Button>
              </div>
            </div>

            {/* CONTENEDOR DE MILLER COLUMNS DE N-NIVELES DINÁMICOS */}
            <div className="relative">
              {isLoading ? (
                <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  <p className="mt-2 text-xs font-medium text-gray-600">
                    Cargando estructura taxonómica del catálogo...
                  </p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {columnasDinamicas.map((col, colIdx) => {
                    const parentNode = col.parentId ? mapPorId.get(col.parentId) : null;
                    return (
                      <div
                        key={col.level}
                        className="min-w-[250px] max-w-[280px] flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden shrink-0"
                      >
                        {/* Cabecera de la Columna */}
                        <div className="p-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
                          <div className="flex flex-col truncate">
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                              Nivel {col.level}
                            </span>
                            <span className="text-xs font-bold text-gray-800 truncate" title={parentNode ? parentNode.nombre : col.titulo}>
                              {parentNode ? parentNode.nombre : col.titulo}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-white border-gray-200 text-gray-500 shrink-0">
                            {col.items.length}
                          </Badge>
                        </div>

                        {/* Listado de Categorías de la Columna */}
                        <div className="p-1.5 space-y-1 max-h-64 overflow-y-auto text-xs">
                          {col.items.map((cat) => {
                            const isSelected = col.selectedId === cat.id_categoria;
                            const hijos = getChildren(cat);
                            const hasChildren = hijos && hijos.length > 0;
                            const IconComp = getCategoryIcon(cat.nombre, cat.nivel);

                            return (
                              <button
                                key={cat.id_categoria}
                                type="button"
                                onClick={() => handleItemClick(cat, colIdx)}
                                className={cn(
                                  'w-full flex items-center justify-between p-2 rounded-lg text-left transition-all group',
                                  isSelected
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-700'
                                    : 'hover:bg-gray-100 text-gray-700'
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <IconComp
                                    className={cn(
                                      'h-4 w-4 shrink-0',
                                      isSelected ? 'text-white' : 'text-blue-600'
                                    )}
                                  />
                                  <span className="truncate">{cat.nombre}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                  {isSelected && !hasChildren && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                                  )}
                                  {hasChildren && (
                                    <ChevronRight
                                      className={cn(
                                        'h-3.5 w-3.5 transition-transform',
                                        isSelected ? 'text-white translate-x-0.5' : 'text-gray-400 group-hover:text-gray-700'
                                      )}
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          {col.items.length === 0 && (
                            <div className="py-8 text-center text-gray-400 text-xs">
                              Sin subcategorías registradas
                            </div>
                          )}
                        </div>

                        {/* Pie de Columna con botón de creación directa en este nivel */}
                        <div className="p-1.5 border-t border-gray-100 bg-gray-50/50">
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal(col.parentId)}
                            className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-semibold text-blue-700 hover:bg-blue-100/70 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Añadir en este nivel</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Barra de Confirmación / Estado Inferior */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/80 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Estado:</span>
                {selectedCat ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Seleccionado: {selectedCat.nombre} (Nivel {selectedCat.nivel})
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                    Haz clic en una categoría para asignarla de inmediato
                  </span>
                )}
              </div>

              {selectedCat && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsExploradorAbierto(false)}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  ✓ Listo, aplicar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Modal Accesible de Creación In-Context */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
            <form onSubmit={handleSubmitCreate}>
              <DialogHeader className="border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                  <DialogTitle className="text-base font-bold text-gray-900">
                    Nueva Categoría Taxonómica
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-gray-500">
                  Crea una nueva clasificación en el catálogo maestro.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                {/* Categoría Padre */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal-cat-padre" className="font-semibold text-gray-800">
                    Categoría Padre (Nivel Superior)
                  </Label>
                  <select
                    id="modal-cat-padre"
                    value={modalPadreId || ''}
                    onChange={(e) =>
                      setModalPadreId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">[ Ninguna - Categoría Raíz Nivel 1 ]</option>
                    {flatList.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>
                        {'— '.repeat(cat.nivel - 1)} {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nombre de la Categoría */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal-cat-nombre" className="font-semibold text-gray-800">
                    Nombre de la Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-cat-nombre"
                    type="text"
                    required
                    value={modalForm.nombre}
                    onChange={(e) => setModalForm({ ...modalForm, nombre: e.target.value })}
                    placeholder="Ej: FILTROS DE ACEITE"
                    className="bg-white text-xs uppercase"
                  />
                </div>

                {/* Código de Categoría */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal-cat-codigo" className="font-semibold text-gray-800">
                    Código Mnemotécnico (Opcional)
                  </Label>
                  <Input
                    id="modal-cat-codigo"
                    type="text"
                    value={modalForm.codigo_categoria || ''}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, codigo_categoria: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: CAT-FIL-ACE"
                    className="bg-white text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <DialogFooter className="border-t border-gray-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Categoría'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============================================================================
  // RENDER MODO 2: COMBOBOX FLOTANTE COMPACTO (variant === 'combobox')
  // ============================================================================
  const filteredListCombobox = useMemo(() => {
    const q = searchCombobox.toLowerCase().trim();
    if (!q) return flatList;
    return flatList.filter(
      (cat) =>
        cat.nombre.toLowerCase().includes(q) ||
        (cat.ruta_jerarquica && cat.ruta_jerarquica.toLowerCase().includes(q)) ||
        (cat.codigo_categoria && cat.codigo_categoria.toLowerCase().includes(q))
    );
  }, [flatList, searchCombobox]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpenCombobox}
        onClick={() => {
          if (!disabled) {
            setIsOpenCombobox(!isOpenCombobox);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpenCombobox(true);
          }
        }}
        className={cn(
          'flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-xs ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'cursor-pointer hover:border-gray-400',
          isOpenCombobox && 'border-blue-500 ring-1 ring-blue-500'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <FolderTree className="h-4 w-4 shrink-0 text-blue-600" />
          {selectedCat ? (
            <div className="flex flex-col truncate text-left">
              <span className="font-semibold text-gray-900 text-xs truncate">
                {selectedCat.nombre}
              </span>
              {selectedCat.ruta_jerarquica && (
                <span className="text-[10px] text-gray-400 font-mono truncate">
                  {selectedCat.ruta_jerarquica}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedCat && showClearButton && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Quitar categoría seleccionada"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </div>
      </div>

      {isOpenCombobox && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                value={searchCombobox}
                onChange={(e) => setSearchCombobox(e.target.value)}
                placeholder="Buscar por nombre o ruta jerárquica..."
                className="pl-8 pr-3 h-8 text-xs bg-white border-gray-200"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 text-xs space-y-0.5">
            {isLoading ? (
              <div className="py-6 text-center text-gray-500">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                <p className="mt-2 text-xs">Cargando categorías...</p>
              </div>
            ) : filteredListCombobox.length > 0 ? (
              filteredListCombobox.map((cat) => {
                const isSelected = selectedCat?.id_categoria === cat.id_categoria;
                const indentPixels = (cat.nivel ? cat.nivel - 1 : cat.indent ?? 0) * 16;
                const IconComp = getCategoryIcon(cat.nombre, cat.nivel);

                return (
                  <button
                    key={cat.id_categoria}
                    type="button"
                    onClick={() => {
                      setSelectedCat(cat);
                      onChange(cat.id_categoria, cat);
                      setIsOpenCombobox(false);
                    }}
                    style={{ paddingLeft: `${Math.max(8, indentPixels)}px` }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg py-1.5 px-2.5 transition-colors text-left group',
                      isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {cat.nivel > 1 ? (
                        <CornerDownRight className="h-3.5 w-3.5 text-gray-300 shrink-0 select-none" />
                      ) : (
                        <IconComp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate">{cat.nombre}</span>
                      {cat.codigo_categoria && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-gray-400 border-gray-200 ml-1">
                          {cat.codigo_categoria}
                        </Badge>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-gray-500 text-xs">
                No se encontraron categorías para "{searchCombobox}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
